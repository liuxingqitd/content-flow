import { describe, expect, it } from 'vitest'
import type { CalendarEvent } from '@/types'
import {
  buildWeekSegments,
  fromDateKey,
  getMonthWeeks,
  isValidEventRange,
  toDateKey,
} from './calendarModel'

const event = (id: string, startDate: string, endDate: string): CalendarEvent => ({
  id,
  title: id,
  startDate,
  endDate,
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-01T00:00:00.000Z',
})

describe('calendarModel', () => {
  it('builds a fixed six-week month grid starting on Monday', () => {
    const weeks = getMonthWeeks(new Date(2026, 8, 1, 12))
    expect(weeks).toHaveLength(6)
    expect(weeks.every(week => week.length === 7)).toBe(true)
    expect(toDateKey(weeks[0][0])).toBe('2026-08-31')
    expect(toDateKey(weeks[5][6])).toBe('2026-10-11')
  })

  it('clips a long activity into consecutive weekly segments', () => {
    const weeks = getMonthWeeks(new Date(2026, 8, 1, 12))
    const activity = event('hackathon', '2026-08-31', '2026-09-24')
    const segments = weeks.flatMap(week => buildWeekSegments([activity], week))

    expect(segments.map(segment => [segment.startColumn, segment.span])).toEqual([
      [0, 7], [0, 7], [0, 7], [0, 4],
    ])
    expect(segments[0].continuesBefore).toBe(false)
    expect(segments[0].continuesAfter).toBe(true)
    expect(segments[3].continuesAfter).toBe(false)
  })

  it('clips an event that starts before and ends after the visible week', () => {
    const week = getMonthWeeks(new Date(2026, 8, 1, 12))[0]
    const [segment] = buildWeekSegments([event('cross-month', '2026-08-20', '2026-09-12')], week)

    expect(segment.startColumn).toBe(0)
    expect(segment.span).toBe(7)
    expect(segment.continuesBefore).toBe(true)
    expect(segment.continuesAfter).toBe(true)
  })

  it('assigns overlapping events to separate lanes and reuses free lanes', () => {
    const week = getMonthWeeks(new Date(2026, 8, 1, 12))[1]
    const segments = buildWeekSegments([
      event('long', '2026-09-07', '2026-09-11'),
      event('overlap', '2026-09-08', '2026-09-09'),
      event('later', '2026-09-12', '2026-09-13'),
    ], week)

    expect(segments.find(segment => segment.event.id === 'long')?.lane).toBe(0)
    expect(segments.find(segment => segment.event.id === 'overlap')?.lane).toBe(1)
    expect(segments.find(segment => segment.event.id === 'later')?.lane).toBe(0)
  })

  it('rejects impossible dates and reversed ranges', () => {
    expect(fromDateKey('2026-02-30')).toBeNull()
    expect(isValidEventRange('2026-09-24', '2026-08-31')).toBe(false)
    expect(isValidEventRange('2026-08-31', '2026-09-24')).toBe(true)
  })
})
