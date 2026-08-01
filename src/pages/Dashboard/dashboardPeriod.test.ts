import { describe, expect, it } from 'vitest'
import {
  canSelectNextDashboardPeriod,
  formatDashboardPeriodLabel,
  getDashboardEffectiveRange,
  getDashboardPeriodRange,
  getFirstPublishedAt,
  isDateInDashboardPeriod,
  shiftDashboardPeriod,
} from './dashboardPeriod'

describe('dashboard periods', () => {
  it('uses Monday as the start of the current week', () => {
    const range = getDashboardPeriodRange('week', new Date(2026, 7, 2, 15))

    expect(range.start).toEqual(new Date(2026, 6, 27))
    expect(range.endExclusive).toEqual(new Date(2026, 7, 3))
  })

  it('builds calendar month and year ranges', () => {
    expect(getDashboardPeriodRange('month', new Date(2026, 7, 2))).toEqual({
      start: new Date(2026, 7, 1),
      endExclusive: new Date(2026, 8, 1),
    })
    expect(getDashboardPeriodRange('year', new Date(2026, 7, 2))).toEqual({
      start: new Date(2026, 0, 1),
      endExclusive: new Date(2027, 0, 1),
    })
  })

  it('excludes invalid dates and dates after the current calendar day', () => {
    const now = new Date(2026, 7, 2, 12)

    expect(isDateInDashboardPeriod('2026-08-01T09:00:00', 'month', now, now)).toBe(true)
    expect(isDateInDashboardPeriod('2026-08-02T13:00:00', 'month', now, now)).toBe(true)
    expect(isDateInDashboardPeriod('2026-08-03T09:00:00', 'month', now, now)).toBe(false)
    expect(isDateInDashboardPeriod('2026-07-31T23:59:59', 'month', now, now)).toBe(false)
    expect(isDateInDashboardPeriod('not-a-date', 'month', now, now)).toBe(false)
  })

  it('keeps a selected historical month and year complete', () => {
    const actualNow = new Date(2026, 7, 2, 12)
    expect(getDashboardEffectiveRange('month', new Date(2026, 1, 10), actualNow)).toEqual({
      start: new Date(2026, 1, 1),
      endExclusive: new Date(2026, 2, 1),
    })
    expect(getDashboardEffectiveRange('year', new Date(2025, 5, 1), actualNow)).toEqual({
      start: new Date(2025, 0, 1),
      endExclusive: new Date(2026, 0, 1),
    })
  })

  it('shifts periods, formats labels, and prevents future navigation', () => {
    const now = new Date(2026, 7, 2, 12)
    expect(shiftDashboardPeriod('month', now, -1)).toEqual(new Date(2026, 6, 1, 12))
    expect(shiftDashboardPeriod('year', now, -1)).toEqual(new Date(2025, 0, 1, 12))
    expect(formatDashboardPeriodLabel('month', now)).toBe('2026年8月')
    expect(formatDashboardPeriodLabel('year', now)).toBe('2026年')
    expect(formatDashboardPeriodLabel('week', now)).toBe('2026年7月27日–8月2日')
    expect(canSelectNextDashboardPeriod('month', new Date(2026, 6, 1), now)).toBe(true)
    expect(canSelectNextDashboardPeriod('month', now, now)).toBe(false)
  })

  it('returns the earliest valid platform publication date', () => {
    expect(getFirstPublishedAt([
      { publishedAt: 'not-a-date' },
      { publishedAt: '2026-08-02T10:00:00' },
      { publishedAt: '2026-08-01T10:00:00' },
    ])).toEqual(new Date('2026-08-01T10:00:00'))
  })
})
