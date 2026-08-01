import type { PlatformPublish } from '@/types'

export type DashboardPeriod = 'week' | 'month' | 'year'

export const DASHBOARD_PERIOD_LABELS: Record<DashboardPeriod, string> = {
  week: '本周',
  month: '本月',
  year: '本年',
}

export interface DashboardPeriodRange {
  start: Date
  endExclusive: Date
}

const startOfLocalDay = (value: Date) =>
  new Date(value.getFullYear(), value.getMonth(), value.getDate())

const startOfLocalWeek = (value: Date) => {
  const result = startOfLocalDay(value)
  result.setDate(result.getDate() - ((result.getDay() + 6) % 7))
  return result
}

const addDays = (value: Date, amount: number) => {
  const result = new Date(value)
  result.setDate(result.getDate() + amount)
  return result
}

const endOfPreviousDay = (value: Date) => {
  const result = new Date(value)
  result.setDate(result.getDate() - 1)
  return result
}

export function getDashboardPeriodRange(
  period: DashboardPeriod,
  referenceDate = new Date(),
): DashboardPeriodRange {
  if (period === 'week') {
    const start = startOfLocalWeek(referenceDate)
    return { start, endExclusive: addDays(start, 7) }
  }

  if (period === 'month') {
    return {
      start: new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1),
      endExclusive: new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 1),
    }
  }

  return {
    start: new Date(referenceDate.getFullYear(), 0, 1),
    endExclusive: new Date(referenceDate.getFullYear() + 1, 0, 1),
  }
}

export function getDashboardEffectiveRange(
  period: DashboardPeriod,
  selectedDate: Date,
  actualNow = new Date(),
): DashboardPeriodRange {
  const range = getDashboardPeriodRange(period, selectedDate)
  const tomorrow = startOfLocalDay(actualNow)
  tomorrow.setDate(tomorrow.getDate() + 1)
  return {
    start: range.start,
    endExclusive: new Date(Math.min(range.endExclusive.getTime(), tomorrow.getTime())),
  }
}

export function shiftDashboardPeriod(
  period: DashboardPeriod,
  selectedDate: Date,
  amount: number,
): Date {
  if (period === 'week') return addDays(selectedDate, amount * 7)
  if (period === 'month') {
    return new Date(selectedDate.getFullYear(), selectedDate.getMonth() + amount, 1, 12)
  }
  return new Date(selectedDate.getFullYear() + amount, 0, 1, 12)
}

export function canSelectNextDashboardPeriod(
  period: DashboardPeriod,
  selectedDate: Date,
  actualNow = new Date(),
): boolean {
  const nextStart = getDashboardPeriodRange(
    period,
    shiftDashboardPeriod(period, selectedDate, 1),
  ).start
  const currentStart = getDashboardPeriodRange(period, actualNow).start
  return nextStart.getTime() <= currentStart.getTime()
}

export function formatDashboardPeriodLabel(
  period: DashboardPeriod,
  selectedDate: Date,
): string {
  if (period === 'month') {
    return `${selectedDate.getFullYear()}年${selectedDate.getMonth() + 1}月`
  }
  if (period === 'year') return `${selectedDate.getFullYear()}年`

  const { start, endExclusive } = getDashboardPeriodRange(period, selectedDate)
  const end = endOfPreviousDay(endExclusive)
  if (start.getFullYear() === end.getFullYear()) {
    return `${start.getFullYear()}年${start.getMonth() + 1}月${start.getDate()}日–${end.getMonth() + 1}月${end.getDate()}日`
  }
  return `${start.getFullYear()}年${start.getMonth() + 1}月${start.getDate()}日–${end.getFullYear()}年${end.getMonth() + 1}月${end.getDate()}日`
}

export const parseDashboardDate = (value?: string) => {
  if (!value) return undefined
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? undefined : date
}

export function isDateInDashboardPeriod(
  value: string | Date | undefined,
  period: DashboardPeriod,
  selectedDate: Date,
  actualNow = new Date(),
): boolean {
  const date = typeof value === 'string' ? parseDashboardDate(value) : value
  if (!date || Number.isNaN(date.getTime())) return false

  const { start, endExclusive } = getDashboardEffectiveRange(period, selectedDate, actualNow)
  const timestamp = date.getTime()
  return timestamp >= start.getTime()
    && timestamp < endExclusive.getTime()
}

export function getFirstPublishedAt(
  platforms: Pick<PlatformPublish, 'publishedAt'>[],
): Date | undefined {
  return platforms
    .map(platform => parseDashboardDate(platform.publishedAt))
    .filter((date): date is Date => Boolean(date))
    .sort((a, b) => a.getTime() - b.getTime())[0]
}
