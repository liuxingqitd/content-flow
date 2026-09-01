import type { CalendarEvent } from '@/types'

export interface CalendarWeekSegment {
  event: CalendarEvent
  startColumn: number
  span: number
  lane: number
  continuesBefore: boolean
  continuesAfter: boolean
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

export function toDateKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function fromDateKey(value: string): Date | null {
  if (!DATE_PATTERN.test(value)) return null
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(year, month - 1, day, 12)
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) return null
  return date
}

export function addCalendarDays(date: Date, amount: number): Date {
  const next = new Date(date)
  next.setDate(next.getDate() + amount)
  return next
}

export function getMonthWeeks(month: Date): Date[][] {
  const first = new Date(month.getFullYear(), month.getMonth(), 1, 12)
  const mondayOffset = (first.getDay() + 6) % 7
  const gridStart = addCalendarDays(first, -mondayOffset)
  return Array.from({ length: 6 }, (_, weekIndex) =>
    Array.from({ length: 7 }, (_, dayIndex) => addCalendarDays(gridStart, weekIndex * 7 + dayIndex)),
  )
}

export function isValidEventRange(startDate: string, endDate: string): boolean {
  return Boolean(fromDateKey(startDate) && fromDateKey(endDate) && startDate <= endDate)
}

export function buildWeekSegments(events: CalendarEvent[], week: Date[]): CalendarWeekSegment[] {
  const weekStart = toDateKey(week[0])
  const weekEnd = toDateKey(week[6])
  const occupiedThrough: number[] = []

  return events
    .filter(event => isValidEventRange(event.startDate, event.endDate))
    .filter(event => event.endDate >= weekStart && event.startDate <= weekEnd)
    .map(event => ({
      event,
      clippedStart: event.startDate < weekStart ? weekStart : event.startDate,
      clippedEnd: event.endDate > weekEnd ? weekEnd : event.endDate,
    }))
    .sort((a, b) =>
      a.clippedStart.localeCompare(b.clippedStart) ||
      b.clippedEnd.localeCompare(a.clippedEnd) ||
      a.event.title.localeCompare(b.event.title, 'zh-CN'),
    )
    .map(({ event, clippedStart, clippedEnd }) => {
      const startColumn = week.findIndex(date => toDateKey(date) === clippedStart)
      const endColumn = week.findIndex(date => toDateKey(date) === clippedEnd)
      let lane = occupiedThrough.findIndex(lastColumn => lastColumn < startColumn)
      if (lane === -1) lane = occupiedThrough.length
      occupiedThrough[lane] = endColumn

      return {
        event,
        startColumn,
        span: endColumn - startColumn + 1,
        lane,
        continuesBefore: event.startDate < weekStart,
        continuesAfter: event.endDate > weekEnd,
      }
    })
}

export function formatEventDateRange(startDate: string, endDate: string): string {
  const start = fromDateKey(startDate)
  const end = fromDateKey(endDate)
  if (!start || !end) return `${startDate} — ${endDate}`

  if (startDate === endDate) {
    return `${start.getFullYear()}年${start.getMonth() + 1}月${start.getDate()}日`
  }
  if (start.getFullYear() === end.getFullYear()) {
    return `${start.getFullYear()}年${start.getMonth() + 1}月${start.getDate()}日 — ${end.getMonth() + 1}月${end.getDate()}日`
  }
  return `${start.getFullYear()}年${start.getMonth() + 1}月${start.getDate()}日 — ${end.getFullYear()}年${end.getMonth() + 1}月${end.getDate()}日`
}
