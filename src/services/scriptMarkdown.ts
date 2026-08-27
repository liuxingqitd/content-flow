const FRONTMATTER_PATTERN = /^\uFEFF?---(?:\r?\n)([\s\S]*?)(?:\r?\n)---(?:\r?\n|$)/
const SCRIPT_ID_PATTERN = /^script_[A-Za-z0-9_-]+$/
const MAX_TITLE_CODEPOINTS = 80

export interface ParsedScriptMarkdown {
  body: string
  frontmatter: string | null
  scriptId?: string
}

const yamlString = (value: string) => JSON.stringify(value)

const readScalar = (frontmatter: string, key: string) => {
  const match = frontmatter.match(new RegExp(`^${key}:\\s*(.+?)\\s*$`, 'm'))
  if (!match) return undefined
  const raw = match[1].trim()
  if ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))) {
    try {
      return raw.startsWith('"') ? JSON.parse(raw) as string : raw.slice(1, -1).replace(/''/g, "'")
    } catch {
      return undefined
    }
  }
  return raw
}

export function parseScriptMarkdown(markdown: string): ParsedScriptMarkdown {
  const match = markdown.match(FRONTMATTER_PATTERN)
  if (!match) return { body: markdown, frontmatter: null }
  const scriptId = readScalar(match[1], 'contentflow_id')
  return {
    body: markdown.slice(match[0].length),
    frontmatter: match[1],
    scriptId: scriptId && SCRIPT_ID_PATTERN.test(scriptId) ? scriptId : undefined,
  }
}

function upsertScalar(frontmatter: string, key: string, value: string) {
  const line = `${key}: ${value}`
  const pattern = new RegExp(`^${key}:.*$`, 'm')
  return pattern.test(frontmatter)
    ? frontmatter.replace(pattern, line)
    : `${frontmatter}${frontmatter ? '\n' : ''}${line}`
}

function appendAlias(frontmatter: string, alias: string) {
  if (!alias) return frontmatter
  const quoted = yamlString(alias)
  const lines = frontmatter.split(/\r?\n/)
  const aliasesIndex = lines.findIndex(line => /^aliases:\s*$/.test(line))
  if (aliasesIndex < 0) {
    if (lines.some(line => /^aliases:\s*\S/.test(line))) return frontmatter
    return `${frontmatter}${frontmatter ? '\n' : ''}aliases:\n  - ${quoted}`
  }

  let end = aliasesIndex + 1
  while (end < lines.length && /^(?:\s+-\s+|\s*$)/.test(lines[end])) end += 1
  const existing = lines.slice(aliasesIndex + 1, end)
    .map(line => line.match(/^\s+-\s+(.+?)\s*$/)?.[1])
    .filter(Boolean)
  if (existing.some(value => value === alias || value === quoted)) return frontmatter
  lines.splice(end, 0, `  - ${quoted}`)
  return lines.join('\n')
}

export function ensureScriptMetadata(markdown: string, scriptId: string, previousName?: string): string {
  if (!SCRIPT_ID_PATTERN.test(scriptId)) throw new Error(`无效逐字稿 ID：${scriptId}`)
  const parsed = parseScriptMarkdown(markdown)
  let frontmatter = parsed.frontmatter ?? ''
  frontmatter = upsertScalar(frontmatter, 'contentflow_id', scriptId)
  frontmatter = upsertScalar(frontmatter, 'contentflow_schema', '1')
  if (previousName) frontmatter = appendAlias(frontmatter, previousName)
  const newline = markdown.includes('\r\n') ? '\r\n' : '\n'
  const normalizedFrontmatter = frontmatter.replace(/\r?\n/g, newline)
  return `---${newline}${normalizedFrontmatter}${newline}---${newline}${parsed.body}`
}

export function replaceScriptBody(existingMarkdown: string | null, scriptId: string, body: string): string {
  const envelope = existingMarkdown ? ensureScriptMetadata(existingMarkdown, scriptId) : ensureScriptMetadata('', scriptId)
  const parsed = parseScriptMarkdown(envelope)
  const newline = envelope.includes('\r\n') ? '\r\n' : '\n'
  return `---${newline}${parsed.frontmatter?.replace(/\r?\n/g, newline) ?? ''}${newline}---${newline}${body}`
}

export function sanitizeScriptTitle(title: string): string {
  const replacements: Record<string, string> = {
    '/': '／', '\\': '＼', ':': '：', '*': '＊', '?': '？', '"': '＂',
    '<': '＜', '>': '＞', '|': '｜', '#': '＃', '^': '＾', '[': '［', ']': '］',
  }
  const safeCharacters = Array.from(title.normalize('NFC'), character => {
    const code = character.codePointAt(0) ?? 0
    if (code < 32 || code === 127) return ' '
    return replacements[character] ?? character
  }).join('')
  const normalized = safeCharacters
    .replace(/\s+/g, ' ')
    .replace(/^[.\s／＼]+|[.\s]+$/g, '')
  const truncated = Array.from(normalized).slice(0, MAX_TITLE_CODEPOINTS).join('').replace(/[.\s]+$/g, '')
  return truncated && truncated !== '.' && truncated !== '..' ? truncated : '未命名逐字稿'
}

const comparableFileName = (value: string) => value.normalize('NFC').toLocaleLowerCase()

export function createReadableScriptFileName(
  title: string,
  scriptId: string,
  existingFileNames: Iterable<string> = [],
): string {
  if (!SCRIPT_ID_PATTERN.test(scriptId)) throw new Error(`无效逐字稿 ID：${scriptId}`)
  const token = scriptId.replace(/^script_/, '')
  const occupied = new Set(Array.from(existingFileNames, comparableFileName))
  for (let length = Math.min(6, token.length); length <= token.length; length += 1) {
    const candidate = `${sanitizeScriptTitle(title)}--${token.slice(0, length)}.md`
    if (!occupied.has(comparableFileName(candidate))) return candidate
  }
  throw new Error(`无法为逐字稿生成唯一文件名：${scriptId}`)
}

export function inferScriptIdFromLegacyFileName(fileName: string): string | undefined {
  if (!fileName.endsWith('.md')) return undefined
  const id = fileName.slice(0, -3)
  return SCRIPT_ID_PATTERN.test(id) ? id : undefined
}

export function inferReadableTitle(markdown: string): string {
  const body = parseScriptMarkdown(markdown).body
  const heading = body.match(/^#\s+(.+)$/m)?.[1]?.trim()
  if (heading) return heading
  const firstLine = body.split(/\r?\n/).map(line => line.trim()).find(Boolean)
  if (!firstLine) return '未命名逐字稿'
  return Array.from(firstLine).slice(0, 48).join('')
}
