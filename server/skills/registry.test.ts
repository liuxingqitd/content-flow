import { mkdtemp, mkdir, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { createSkillRegistry } from './registry'

async function makeTempRoot() {
  return mkdtemp(join(tmpdir(), 'contentflow-skills-'))
}

async function writeSkill(root: string, relativeDir: string, content: string) {
  const dir = join(root, relativeDir)
  await mkdir(dir, { recursive: true })
  await writeFile(join(dir, 'SKILL.md'), content)
  return dir
}

describe('local prompt skill registry', () => {
  it('recursively discovers skills and parses frontmatter metadata', async () => {
    const root = await makeTempRoot()
    await writeSkill(root, 'nested/opening', `---
name: opening-helper
description: >
  优化短视频
  开头
---
# Instructions
`)

    const skills = await createSkillRegistry({ roots: [root] }).list()

    expect(skills).toHaveLength(1)
    expect(skills[0]).toMatchObject({
      id: '0:nested/opening',
      name: 'opening-helper',
      description: '优化短视频 开头',
      relativePath: 'nested/opening',
    })
  })

  it('continues discovering nested skills when the root is also a skill', async () => {
    const root = await makeTempRoot()
    await writeFile(join(root, 'SKILL.md'), '---\nname: root-skill\n---\n# Root')
    await writeSkill(root, 'nested', '---\nname: nested-skill\n---\n# Nested')

    const skills = await createSkillRegistry({ roots: [root] }).list()
    const loadedRoot = await createSkillRegistry({ roots: [root] }).load('0:.')

    expect(skills.map(skill => skill.name)).toEqual(['root-skill', 'nested-skill'])
    expect(loadedRoot.documents.map(document => document.path)).toEqual(['SKILL.md'])
    expect(loadedRoot.content).not.toContain('# Nested')
  })

  it('keeps the first skill when roots contain duplicate names', async () => {
    const first = await makeTempRoot()
    const second = await makeTempRoot()
    await writeSkill(first, 'preferred', '---\nname: duplicate\n---\nfirst')
    await writeSkill(second, 'fallback', '---\nname: duplicate\n---\nsecond')

    const skills = await createSkillRegistry({ roots: [first, second] }).list()

    expect(skills).toHaveLength(1)
    expect(skills[0].id).toBe('0:preferred')
  })

  it('loads only markdown files inside the selected skill directory', async () => {
    const root = await makeTempRoot()
    const dir = await writeSkill(root, 'writer', '---\nname: writer\n---\n# Main prompt')
    await mkdir(join(dir, 'references'))
    await writeFile(join(dir, 'references', 'style.md'), '# Style guide')
    await writeFile(join(dir, 'secret.env'), 'API_KEY=secret')
    await writeFile(join(dir, 'script.sh'), 'echo unsafe')

    const loaded = await createSkillRegistry({ roots: [root] }).load('0:writer')

    expect(loaded.name).toBe('writer')
    expect(loaded.documents.map(document => document.path)).toEqual(['SKILL.md', 'references/style.md'])
    expect(loaded.content).toContain('# Main prompt')
    expect(loaded.content).toContain('# Style guide')
    expect(loaded.content).not.toContain('API_KEY')
    expect(loaded.content).not.toContain('echo unsafe')
  })

  it('does not follow symlinks outside the skill directory', async () => {
    const root = await makeTempRoot()
    const outside = await makeTempRoot()
    const dir = await writeSkill(root, 'safe', '---\nname: safe\n---\n# Safe')
    await mkdir(join(dir, 'references'))
    await writeFile(join(outside, 'outside.md'), '# Must not load')
    await symlink(join(outside, 'outside.md'), join(dir, 'references', 'outside.md'))

    const loaded = await createSkillRegistry({ roots: [root] }).load('0:safe')

    expect(loaded.documents.map(document => document.path)).toEqual(['SKILL.md'])
    expect(loaded.content).not.toContain('Must not load')
  })

  it('reports truncation when markdown content exceeds the configured limit', async () => {
    const root = await makeTempRoot()
    await writeSkill(root, 'large', `---\nname: large\n---\n${'x'.repeat(200)}`)

    const loaded = await createSkillRegistry({ roots: [root], maxTotalChars: 80 }).load('0:large')

    expect(loaded.truncated).toBe(true)
    expect(loaded.content.length).toBeLessThanOrEqual(80)
  })

  it('rejects unknown skill ids instead of treating them as file paths', async () => {
    const root = await makeTempRoot()
    await writeSkill(root, 'safe', '---\nname: safe\n---\n# Safe')

    const registry = createSkillRegistry({ roots: [root] })

    await expect(registry.load('../../outside')).rejects.toThrow('Skill 不存在')
  })
})
