import { describe, expect, it } from 'vitest'
import { getVideoDetailCreatedAt } from './videoDetailUtils'

describe('getVideoDetailCreatedAt', () => {
  it('uses the first time the kanban record entered published', () => {
    expect(getVideoDetailCreatedAt({
      createdAt: '2026-07-01T08:00:00.000Z',
      platforms: [],
      statusHistory: [
        { status: 'published', changedAt: '2026-07-20T12:00:00.000Z' },
        { status: 'editing', changedAt: '2026-07-10T10:00:00.000Z' },
        { status: 'published', changedAt: '2026-07-15T11:00:00.000Z' },
      ],
    })).toBe('2026-07-15T11:00:00.000Z')
  })

  it('falls back to the earliest platform publish time for legacy records', () => {
    expect(getVideoDetailCreatedAt({
      createdAt: '2026-07-01T08:00:00.000Z',
      statusHistory: [],
      platforms: [
        { platform: 'douyin', status: 'published', publishedAt: '2026-07-18T12:00:00.000Z' },
        { platform: 'xiaohongshu', status: 'published', publishedAt: '2026-07-16T10:00:00.000Z' },
      ],
    })).toBe('2026-07-16T10:00:00.000Z')
  })

  it('falls back to the original creation time when no publish time exists', () => {
    expect(getVideoDetailCreatedAt({
      createdAt: '2026-07-01T08:00:00.000Z',
      statusHistory: [{ status: 'editing', changedAt: '2026-07-10T10:00:00.000Z' }],
      platforms: [],
    })).toBe('2026-07-01T08:00:00.000Z')
  })
})
