import { readdir, readFile, realpath } from 'node:fs/promises'
import { homedir } from 'node:os'
import { basename, isAbsolute, join, relative, resolve, sep } from 'node:path'

const DEFAULT_MAX_FILES = 40
const DEFAULT_MAX_TOTAL_CHARS = 256_000

export interface LocalSkillSummary {
  id: string
  name: string
  description: string
  relativePath: string
  root: string
}

export interface LoadedLocalSkill extends LocalSkillSummary {
  documents: Array<{ path: string; content: string }>
  content: string
  truncated: boolean
  promptOnly: true
}

export interface SkillRegistryOptions {
  roots?: string[]
  maxFiles?: number
  maxTotalChars?: number
}

interface DiscoveredSkill extends LocalSkillSummary {
  directory: string
  realDirectory: string
  rootIndex: number
}

function expandHome(path: string): string {
  if (path === '~') return homedir()
  if (path.startsWith(`~${sep}`)) return join(homedir(), path.slice(2))
  return path
}

export function configuredSkillRoots(envValue = process.env.SKILLS_ROOTS): string[] {
  const configured = envValue
    ?.split(',')
    .map(value => value.trim())
    .filter(Boolean)

  return (configured?.length ? configured : [
    join(homedir(), '.claude', 'skills'),
    join(homedir(), '.agents', 'skills'),
    '/skills',
  ]).map(path => resolve(expandHome(path)))
}

function unquote(value: string): string {
  const trimmed = value.trim()
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"'))
    || (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1)
  }
  return trimmed
}

function parseFrontmatter(markdown: string): { name?: string; description?: string } {
  if (!markdown.startsWith('---\n')) return {}
  const end = markdown.indexOf('\n---', 4)
  if (end === -1) return {}

  const lines = markdown.slice(4, end).split('\n')
  const result: { name?: string; description?: string } = {}

  for (let index = 0; index < lines.length; index += 1) {
    const match = lines[index].match(/^([A-Za-z0-9_-]+):\s*(.*)$/)
    if (!match || (match[1] !== 'name' && match[1] !== 'description')) continue

    let value = match[2]
    if (value === '>' || value === '|') {
      const block: string[] = []
      while (index + 1 < lines.length && /^\s+/.test(lines[index + 1])) {
        block.push(lines[index + 1].trim())
        index += 1
      }
      value = value === '>' ? block.join(' ') : block.join('\n')
    }

    result[match[1]] = unquote(value)
  }

  return result
}

function isInside(parent: string, candidate: string): boolean {
  const path = relative(parent, candidate)
  return path === '' || (!path.startsWith(`..${sep}`) && path !== '..' && !isAbsolute(path))
}

async function discoverSkillFiles(root: string, rootIndex: number): Promise<DiscoveredSkill[]> {
  let realRoot: string
  try {
    realRoot = await realpath(root)
  } catch {
    return []
  }

  const discovered: DiscoveredSkill[] = []

  async function visit(directory: string): Promise<void> {
    let entries
    try {
      entries = await readdir(directory, { withFileTypes: true })
    } catch {
      return
    }
    const skillFile = entries.find(entry => entry.isFile() && entry.name === 'SKILL.md')

    if (skillFile) {
      const realDirectory = await realpath(directory)
      if (!isInside(realRoot, realDirectory)) return
      const markdown = await readFile(join(directory, 'SKILL.md'), 'utf8')
      const metadata = parseFrontmatter(markdown)
      const relativePath = relative(realRoot, realDirectory).split(sep).join('/') || '.'
      discovered.push({
        id: `${rootIndex}:${relativePath}`,
        name: metadata.name?.trim() || basename(realDirectory),
        description: metadata.description?.trim() || '本地提示词型 Skill',
        relativePath,
        root: realRoot,
        directory,
        realDirectory,
        rootIndex,
      })
    }

    await Promise.all(
      entries
        .filter(entry => entry.isDirectory())
        .map(entry => visit(join(directory, entry.name))),
    )
  }

  await visit(realRoot)
  return discovered
}

async function discoverSkills(roots: string[]): Promise<DiscoveredSkill[]> {
  const all = (await Promise.all(roots.map(discoverSkillFiles))).flat()
  const names = new Set<string>()
  return all
    .sort((a, b) => a.rootIndex - b.rootIndex || a.relativePath.localeCompare(b.relativePath))
    .filter(skill => {
      const key = skill.name.toLocaleLowerCase()
      if (names.has(key)) return false
      names.add(key)
      return true
    })
}

async function listMarkdownFiles(directory: string, realDirectory: string): Promise<string[]> {
  const skillFile = await realpath(join(directory, 'SKILL.md'))
  const files: string[] = isInside(realDirectory, skillFile) ? [skillFile] : []

  async function visit(current: string): Promise<void> {
    let entries
    try {
      entries = await readdir(current, { withFileTypes: true })
    } catch {
      return
    }
    for (const entry of entries) {
      const path = join(current, entry.name)
      if (entry.isDirectory()) {
        await visit(path)
      } else if (entry.isFile() && entry.name.toLocaleLowerCase().endsWith('.md')) {
        const realFile = await realpath(path)
        if (isInside(realDirectory, realFile)) files.push(realFile)
      }
    }
  }

  await visit(join(directory, 'references'))
  return files.sort((a, b) => {
    if (basename(a) === 'SKILL.md') return -1
    if (basename(b) === 'SKILL.md') return 1
    return a.localeCompare(b)
  })
}

function toSummary(skill: DiscoveredSkill): LocalSkillSummary {
  return {
    id: skill.id,
    name: skill.name,
    description: skill.description,
    relativePath: skill.relativePath,
    root: skill.root,
  }
}

export function createSkillRegistry(options: SkillRegistryOptions = {}) {
  const roots = options.roots?.map(path => resolve(expandHome(path))) ?? configuredSkillRoots()
  const maxFiles = options.maxFiles ?? DEFAULT_MAX_FILES
  const maxTotalChars = options.maxTotalChars ?? DEFAULT_MAX_TOTAL_CHARS

  return {
    async list(): Promise<LocalSkillSummary[]> {
      const skills = await discoverSkills(roots)
      return skills.map(toSummary)
    },

    async load(id: string): Promise<LoadedLocalSkill> {
      const skills = await discoverSkills(roots)
      const skill = skills.find(candidate => candidate.id === id)
      if (!skill) throw new Error(`Skill 不存在: ${id}`)

      const markdownFiles = await listMarkdownFiles(skill.directory, skill.realDirectory)
      const selectedFiles = markdownFiles.slice(0, maxFiles)
      const documents: LoadedLocalSkill['documents'] = []
      let content = ''
      let truncated = markdownFiles.length > selectedFiles.length

      for (const file of selectedFiles) {
        const relativePath = relative(skill.realDirectory, file).split(sep).join('/')
        const markdown = await readFile(file, 'utf8')
        const prefix = `## Document: ${relativePath}\n\n`
        const remaining = Math.max(0, maxTotalChars - content.length)
        const documentContent = `${prefix}${markdown}`.slice(0, remaining)
        if (documentContent.length < prefix.length + markdown.length) truncated = true
        if (documentContent) {
          content += documentContent
          documents.push({ path: relativePath, content: documentContent.slice(prefix.length) })
        }
        if (content.length >= maxTotalChars) break
        content += '\n\n---\n\n'.slice(0, maxTotalChars - content.length)
      }

      return { ...toSummary(skill), documents, content, truncated, promptOnly: true }
    },
  }
}
