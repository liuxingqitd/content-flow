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

export const parseDashboardDate = (value?: string) => {
  if (!value) return undefined
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? undefined : date
}

export function isDateInDashboardPeriod(
  value: string | Date | undefined,
  period: DashboardPeriod,
  referenceDate = new Date(),
): boolean {
  const date = typeof value === 'string' ? parseDashboardDate(value) : value
  if (!date || Number.isNaN(date.getTime())) return false

  const { start, endExclusive } = getDashboardPeriodRange(period, referenceDate)
  const tomorrow = startOfLocalDay(referenceDate)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const timestamp = date.getTime()
  return timestamp >= start.getTime()
    && timestamp < endExclusive.getTime()
    && timestamp < tomorrow.getTime()
}

export function getFirstPublishedAt(
  platforms: Pick<PlatformPublish, 'publishedAt'>[],
): Date | undefined {
  return platforms
    .map(platform => parseDashboardDate(platform.publishedAt))
    .filter((date): date is Date => Boolean(date))
    .sort((a, b) => a.getTime() - b.getTime())[0]
}
