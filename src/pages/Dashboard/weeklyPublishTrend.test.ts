import { describe, expect, it } from 'vitest'
import type { Video } from '@/types'
import { buildWeeklyPublishTrend } from './weeklyPublishTrend'

const video = (id: string, publishedAt: string[]): Video => ({
  id,
  title: id,
  status: 'published',
  tagIds: [],
  statusHistory: [],
  platforms: publishedAt.map((date, index) => ({
    platform: (['douyin', 'xiaohongshu', 'shipinhao'] as const)[index],
    status: 'published',
    publishedAt: date,
  })),
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
})

describe('buildWeeklyPublishTrend', () => {
  it('counts each video once in its first published week and fills empty weeks', () => {
    const result = buildWeeklyPublishTrend([
      video('same-week', ['2026-07-13T09:00:00', '2026-07-19T20:00:00']),
      video('cross-week', ['2026-07-06T09:00:00', '2026-07-20T09:00:00']),
      video('invalid', ['not-a-date']),
    ], new Date(2026, 6, 22), 3)

    expect(result.map(point => [point.weekStart, point.count])).toEqual([
      ['2026-07-06', 1],
      ['2026-07-13', 1],
      ['2026-07-20', 0],
    ])
  })

  it('uses Monday as the start of the local week', () => {
    const result = buildWeeklyPublishTrend([
      video('sunday', ['2026-07-19T23:59:00']),
      video('monday', ['2026-07-20T00:00:00']),
    ], new Date(2026, 6, 22), 2)

    expect(result.map(point => point.count)).toEqual([1, 1])
  })
})
