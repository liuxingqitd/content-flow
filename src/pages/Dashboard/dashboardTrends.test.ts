import { describe, expect, it } from 'vitest'
import type { Video } from '@/types'
import {
  buildDashboardCommercialTrend,
  buildDashboardPublishTrend,
} from './dashboardTrends'

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

describe('buildDashboardPublishTrend', () => {
  it('uses the first valid platform date and counts each video once', () => {
    const result = buildDashboardPublishTrend([
      video('multi-platform', ['2026-08-02T09:00:00', '2026-08-01T09:00:00']),
      video('invalid-first', ['not-a-date', '2026-08-02T10:00:00']),
      video('future', ['2026-08-03T09:00:00']),
    ], 'month', new Date(2026, 7, 2, 12), new Date(2026, 7, 2, 12))

    expect(result).toHaveLength(2)
    expect(result.map(point => [point.key, point.count])).toEqual([
      ['2026-08-01', 1],
      ['2026-08-02', 1],
    ])
  })

  it('builds daily publication points for the selected week', () => {
    const result = buildDashboardPublishTrend([
      video('saturday', ['2026-08-01T09:00:00']),
      video('sunday', ['2026-08-02T09:00:00']),
      video('previous-week', ['2026-07-26T09:00:00']),
    ], 'week', new Date(2026, 7, 2, 12), new Date(2026, 7, 2, 12))

    expect(result).toHaveLength(7)
    expect(result.filter(point => point.count > 0).map(point => [point.key, point.count])).toEqual([
      ['2026-08-01', 1],
      ['2026-08-02', 1],
    ])
  })

  it('builds month-to-date publication points for the selected year', () => {
    const result = buildDashboardPublishTrend([
      video('january', ['2026-01-15T09:00:00']),
      video('august', ['2026-08-01T09:00:00']),
      video('next-year', ['2027-01-01T09:00:00']),
    ], 'year', new Date(2026, 7, 2, 12), new Date(2026, 7, 2, 12))

    expect(result).toHaveLength(8)
    expect(result[0]).toMatchObject({ key: '2026-01', count: 1 })
    expect(result[7]).toMatchObject({ key: '2026-08', count: 1 })
    expect(result.reduce((sum, point) => sum + point.count, 0)).toBe(2)
  })
})

describe('buildDashboardCommercialTrend', () => {
  it('keeps totals within the selected period and separates settlement status', () => {
    const result = buildDashboardCommercialTrend([
      video('settled', ['2026-08-01T09:00:00'], {
        isCommercial: true,
        commercialAmount: 3000,
        commercialSettlementStatus: 'settled',
      }),
      video('unsettled', ['2026-08-02T09:00:00'], {
        isCommercial: true,
        commercialAmount: 1200,
      }),
      video('previous-month', ['2026-07-31T09:00:00'], {
        isCommercial: true,
        commercialAmount: 5000,
      }),
    ], 'month', new Date(2026, 7, 2, 12), new Date(2026, 7, 2, 12))

    expect(result.reduce((sum, point) => sum + point.settledAmount, 0)).toBe(3000)
    expect(result.reduce((sum, point) => sum + point.unsettledAmount, 0)).toBe(1200)
  })

  it('falls back to creation date and sums platform deals independently', () => {
    const result = buildDashboardCommercialTrend([
      video('created-only', [], {
        isCommercial: true,
        createdAt: '2026-08-01T09:00:00',
        commercialDealType: 'platform',
        platformCommercialSettlements: [
          { platform: 'douyin', amount: 1800, settlementStatus: 'settled' },
          { platform: 'xiaohongshu', amount: 2200, settlementStatus: 'unsettled' },
        ],
      }),
    ], 'month', new Date(2026, 7, 2, 12), new Date(2026, 7, 2, 12))

    expect(result[0]).toMatchObject({ settledAmount: 1800, unsettledAmount: 2200 })
  })

  it('fills a selected historical month and year completely', () => {
    const now = new Date(2026, 7, 2, 12)
    expect(buildDashboardPublishTrend([], 'month', new Date(2024, 1, 10), now)).toHaveLength(29)
    expect(buildDashboardPublishTrend([], 'year', new Date(2025, 5, 10), now)).toHaveLength(12)
  })
})
