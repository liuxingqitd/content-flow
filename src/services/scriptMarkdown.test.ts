import { describe, expect, it } from 'vitest'
import {
  createReadableScriptFileName,
  ensureScriptMetadata,
  inferScriptIdFromLegacyFileName,
  parseScriptMarkdown,
  replaceScriptBody,
  sanitizeScriptTitle,
} from './scriptMarkdown'

describe('script markdown envelope', () => {
  it('adds stable metadata without exposing it as body', () => {
    const result = ensureScriptMetadata('正文第一行\n正文第二行', 'script_abc1234567')
    expect(result).toContain('contentflow_id: script_abc1234567')
    expect(result).toContain('contentflow_schema: 1')
    expect(parseScriptMarkdown(result)).toMatchObject({
      scriptId: 'script_abc1234567',
      body: '正文第一行\n正文第二行',
    })
  })

  it('preserves user properties and is idempotent', () => {
    const source = '---\ntags:\n  - AI\ncontentflow_id: script_old\n---\n正文'
    const once = ensureScriptMetadata(source, 'script_new123')
    const twice = ensureScriptMetadata(once, 'script_new123')
    expect(twice).toBe(once)
    expect(twice).toContain('tags:\n  - AI')
    expect(twice.match(/contentflow_id:/g)).toHaveLength(1)
  })

  it('replaces only the body and keeps metadata', () => {
    const existing = '---\ntags:\n  - test\ncontentflow_id: script_abc123\n---\n旧正文'
    const result = replaceScriptBody(existing, 'script_abc123', '新正文')
    expect(parseScriptMarkdown(result).body).toBe('新正文')
    expect(result).toContain('tags:\n  - test')
  })

  it('adds a previous filename alias once', () => {
    const once = ensureScriptMetadata('正文', 'script_abc123', '旧标题')
    const twice = ensureScriptMetadata(once, 'script_abc123', '旧标题')
    expect(twice.match(/"旧标题"/g)).toHaveLength(1)
  })
})

describe('readable script filenames', () => {
  it('keeps Chinese and emoji while replacing unsafe characters', () => {
    expect(sanitizeScriptTitle('  AI/CLI: 教程？ 🚀.  ')).toBe('AI／CLI： 教程？ 🚀')
  })

  it('uses a stable short suffix and expands it on collision', () => {
    const first = createReadableScriptFileName('同名标题', 'script_abcdef1234')
    const second = createReadableScriptFileName('同名标题', 'script_abcdef9999', [first])
    expect(first).toBe('同名标题--abcdef.md')
    expect(second).toBe('同名标题--abcdef9.md')
  })

  it('prevents traversal and supports legacy IDs', () => {
    expect(createReadableScriptFileName('../危险/标题', 'script_safe123')).toBe('危险／标题--safe12.md')
    expect(inferScriptIdFromLegacyFileName('script_safe123.md')).toBe('script_safe123')
    expect(inferScriptIdFromLegacyFileName('可读标题--safe12.md')).toBeUndefined()
  })
})

