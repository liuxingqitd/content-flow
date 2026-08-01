import { describe, expect, it } from 'vitest'
import {
  getDashboardPeriodRange,
  getFirstPublishedAt,
  isDateInDashboardPeriod,
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

    expect(isDateInDashboardPeriod('2026-08-01T09:00:00', 'month', now)).toBe(true)
    expect(isDateInDashboardPeriod('2026-08-02T13:00:00', 'month', now)).toBe(true)
    expect(isDateInDashboardPeriod('2026-08-03T09:00:00', 'month', now)).toBe(false)
    expect(isDateInDashboardPeriod('2026-07-31T23:59:59', 'month', now)).toBe(false)
    expect(isDateInDashboardPeriod('not-a-date', 'month', now)).toBe(false)
  })

  it('returns the earliest valid platform publication date', () => {
    expect(getFirstPublishedAt([
      { publishedAt: 'not-a-date' },
      { publishedAt: '2026-08-02T10:00:00' },
      { publishedAt: '2026-08-01T10:00:00' },
    ])).toEqual(new Date('2026-08-01T10:00:00'))
  })
})
