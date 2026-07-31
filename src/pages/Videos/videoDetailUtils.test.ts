import { describe, expect, it } from 'vitest'
import { getVideoDetailCreatedAt } from './videoDetailUtils'

describe('getVideoDetailCreatedAt', () => {
  it('uses the first time the kanban record entered pending publish', () => {
    expect(getVideoDetailCreatedAt({
      createdAt: '2026-07-01T08:00:00.000Z',
      statusHistory: [
        { status: 'published', changedAt: '2026-07-20T12:00:00.000Z' },
        { status: 'editing', changedAt: '2026-07-10T10:00:00.000Z' },
        { status: 'pending_publish', changedAt: '2026-07-15T11:00:00.000Z' },
      ],
    })).toBe('2026-07-15T11:00:00.000Z')
  })

  it('falls back to the original creation time when no library marker exists', () => {
    expect(getVideoDetailCreatedAt({
      createdAt: '2026-07-01T08:00:00.000Z',
      statusHistory: [],
    })).toBe('2026-07-01T08:00:00.000Z')
  })

  it('keeps the original creation time for an early-stage record', () => {
    expect(getVideoDetailCreatedAt({
      createdAt: '2026-07-01T08:00:00.000Z',
      statusHistory: [{ status: 'editing', changedAt: '2026-07-10T10:00:00.000Z' }],
    })).toBe('2026-07-01T08:00:00.000Z')
  })
})
