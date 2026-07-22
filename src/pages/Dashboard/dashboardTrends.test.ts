import { describe, expect, it } from 'vitest'
import type { Video } from '@/types'
import { buildMonthlyCommercialTrend, buildPublishTrend } from './dashboardTrends'

const video = (
  id: string,
  publishedAt: string[],
  overrides: Partial<Video> = {},
): Video => ({
  id,
  title: id,
  status: 'published',
  tagIds: [],
  statusHistory: [],
  platforms: publishedAt.map((date, index) => ({
    platform: (['douyin', 'xiaohongshu', 'shipinhao'] as const)[index],
    status: index === 0 ? 'violated' : 'published',
    publishedAt: date,
  })),
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
})

describe('buildPublishTrend', () => {
  it('counts each video once in its first published week and fills empty weeks', () => {
    const result = buildPublishTrend([
      video('same-week', ['2026-07-13T09:00:00', '2026-07-19T20:00:00']),
      video('cross-week', ['2026-07-06T09:00:00', '2026-07-20T09:00:00']),
      video('invalid', ['not-a-date']),
    ], 'week', new Date(2026, 6, 22), 3)

    expect(result.map(point => [point.rangeStart, point.count])).toEqual([
      ['2026-07-06', 1],
      ['2026-07-13', 1],
      ['2026-07-20', 0],
    ])
  })

  it('uses Monday as the start of the local week', () => {
    const result = buildPublishTrend([
      video('sunday', ['2026-07-19T23:59:00']),
      video('monday', ['2026-07-20T00:00:00']),
    ], 'week', new Date(2026, 6, 22), 2)

    expect(result.map(point => point.count)).toEqual([1, 1])
  })

  it('builds consecutive calendar months across years and uses the first valid platform date', () => {
    const result = buildPublishTrend([
      video('cross-month', ['not-a-date', '2025-12-31T12:00:00', '2026-01-02T09:00:00']),
      video('january', ['2026-01-15T09:00:00']),
      video('created-only', [], { createdAt: '2026-01-20T09:00:00' }),
    ], 'month', new Date(2026, 1, 10), 3)

    expect(result.map(point => [point.key, point.label, point.count])).toEqual([
      ['2025-12', '25/12', 1],
      ['2026-01', '26/01', 1],
      ['2026-02', '26/02', 0],
    ])
    expect(result[2].rangeEnd).toBe('2026-02-28')
  })

  it('keeps February when the reference date is at the end of a leap-year month', () => {
    const result = buildPublishTrend([], 'month', new Date(2024, 2, 31), 2)

    expect(result.map(point => [point.key, point.rangeEnd])).toEqual([
      ['2024-02', '2024-02-29'],
      ['2024-03', '2024-03-31'],
    ])
  })

  it('returns no buckets for a non-positive bucket count', () => {
    expect(buildPublishTrend([], 'month', new Date(2026, 0, 1), 0)).toEqual([])
  })

  it('does not count a future publication inside the current month', () => {
    const result = buildPublishTrend([
      video('published', ['2026-07-20T09:00:00']),
      video('future', ['2026-07-25T09:00:00']),
    ], 'month', new Date(2026, 6, 22, 12), 1)

    expect(result[0].count).toBe(1)
  })
})

describe('buildMonthlyCommercialTrend', () => {
  it('sums eligible commercial videos once by publication month', () => {
    const result = buildMonthlyCommercialTrend([
      video('commercial', ['2026-01-31T09:00:00', '2026-02-02T09:00:00'], {
        isCommercial: true,
        commercialAmount: 5000,
      }),
      video('another', ['2026-01-15T09:00:00'], {
        isCommercial: true,
        commercialAmount: 1200,
      }),
      video('not-commercial', ['2026-01-10T09:00:00'], { commercialAmount: 9999 }),
      video('zero', ['2026-01-10T09:00:00'], { isCommercial: true, commercialAmount: 0 }),
      video('infinite', ['2026-01-10T09:00:00'], { isCommercial: true, commercialAmount: Infinity }),
    ], new Date(2026, 1, 10), 2)

    expect(result.map(point => [point.key, point.amount])).toEqual([
      ['2026-01', 6200],
      ['2026-02', 0],
    ])
  })

  it('falls back to a valid creation month when no platform publish date exists', () => {
    const result = buildMonthlyCommercialTrend([
      video('created-only', [], {
        isCommercial: true,
        commercialAmount: 3000,
        createdAt: '2026-02-03T09:00:00',
      }),
      video('invalid', ['not-a-date'], {
        isCommercial: true,
        commercialAmount: 500,
        createdAt: 'invalid',
      }),
    ], new Date(2026, 1, 10), 2)

    expect(result.map(point => point.amount)).toEqual([0, 3000])
  })

  it('fills empty months and returns no buckets for a non-positive count', () => {
    const result = buildMonthlyCommercialTrend([], new Date(2026, 2, 10), 3)
    expect(result.map(point => point.amount)).toEqual([0, 0, 0])
    expect(buildMonthlyCommercialTrend([], new Date(2026, 2, 10), -1)).toEqual([])
  })

  it('does not include future commercial videos in the current month', () => {
    const result = buildMonthlyCommercialTrend([
      video('future', ['2026-07-25T09:00:00'], {
        isCommercial: true,
        commercialAmount: 5000,
      }),
    ], new Date(2026, 6, 22, 12), 1)

    expect(result[0].amount).toBe(0)
  })
})
