import { describe, expect, it } from 'vitest'
import type { Script } from '@/types'
import {
  getRecentScriptGroups,
  getScriptLastEditedAt,
  sortScriptsByLastEdited,
} from './scriptLibrary'

const script = (id: string, createdAt: string, updatedAt: string, extra: Partial<Script> = {}): Script => ({
  id,
  title: id,
  wordCount: 0,
  estimatedDuration: 0,
  tagIds: [],
  version: 1,
  createdAt,
  updatedAt,
  ...extra,
})

describe('script library', () => {
  const scripts = [
    script('first', '2026-01-01', '2026-07-20', { contentUpdatedAt: '2026-04-01' }),
    script('second', '2026-03-01', '2026-03-01'),
    script('third', '2026-02-01', '2026-05-01'),
  ]

  it('uses content edits instead of metadata edits for edit recency when available', () => {
    expect(getScriptLastEditedAt(scripts[0])).toBe('2026-04-01')
    expect(sortScriptsByLastEdited(scripts).map(item => item.id)).toEqual(['third', 'first', 'second'])
  })

  it('builds independent recent-edited and recent-created groups', () => {
    const groups = getRecentScriptGroups(scripts, 2)
    expect(groups.recentEdited.map(item => item.id)).toEqual(['third', 'first'])
    expect(groups.recentCreated.map(item => item.id)).toEqual(['second', 'third'])
  })
})
