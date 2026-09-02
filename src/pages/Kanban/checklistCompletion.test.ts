import { describe, expect, it } from 'vitest'
import type { ChecklistItem } from '@/types'
import { isChecklistComplete } from './checklistCompletion'

const items: ChecklistItem[] = [
  { id: 'check-1', text: '检查标题', createdAt: '2026-09-02T12:00:00.000Z' },
  { id: 'check-2', text: '检查封面', createdAt: '2026-09-02T12:00:00.000Z' },
]

describe('publish checklist completion', () => {
  it('allows publishing when no checklist items are configured', () => {
    expect(isChecklistComplete([], {})).toBe(true)
  })

  it('blocks publishing while any configured item is unchecked', () => {
    expect(isChecklistComplete(items, { 'check-1': true })).toBe(false)
  })

  it('allows publishing after every configured item is checked', () => {
    expect(isChecklistComplete(items, { 'check-1': true, 'check-2': true })).toBe(true)
  })
})
