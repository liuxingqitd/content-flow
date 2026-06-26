import { describe, expect, it } from 'vitest'
import { searchVaultScripts } from './vaultSearch'
import type { ScriptMarkdownDocument } from '@/services/fileSystem'
import type { Script } from '@/types'

const documents: ScriptMarkdownDocument[] = [
  {
    scriptId: 'script_indexed',
    content: '# 环境变量入门\n\n环境变量可以把配置与代码分离。',
    updatedAt: '2026-06-09T00:00:00.000Z',
  },
  {
    scriptId: 'script_orphan',
    content: '# 没有索引的环境变量稿件\n\n这是孤立 Markdown，也应被搜索发现。',
    updatedAt: '2026-06-10T00:00:00.000Z',
  },
  {
    scriptId: 'script_other',
    content: '# Git 入门\n\n版本控制基础。',
    updatedAt: '2026-06-08T00:00:00.000Z',
  },
]

const scripts = [{
  id: 'script_indexed',
  videoId: 'vid_indexed',
  title: '什么是环境变量',
}] as Script[]

describe('vault script search', () => {
  it('finds indexed and orphan markdown documents', () => {
    const results = searchVaultScripts(documents, scripts, '环境变量')
    expect(results.map(item => item.scriptId)).toEqual(['script_indexed', 'script_orphan'])
    expect(results[0].videoId).toBe('vid_indexed')
    expect(results[1].title).toBe('没有索引的环境变量稿件')
  })

  it('returns bounded snippets and limits results', () => {
    const results = searchVaultScripts(documents, scripts, '入门', 1)
    expect(results).toHaveLength(1)
    expect(results[0].snippet.length).toBeLessThanOrEqual(165)
  })

  it('returns no results for an empty query', () => {
    expect(searchVaultScripts(documents, scripts, '  ')).toEqual([])
  })
})
