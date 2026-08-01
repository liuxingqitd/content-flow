import type { Video } from '@/types'
import { getCommercialAmountEntries } from '@/pages/Videos/commercialUtils'
import {
  getDashboardEffectiveRange,
  getFirstPublishedAt,
  isDateInDashboardPeriod,
  parseDashboardDate,
  type DashboardPeriod,
} from './dashboardPeriod'

export interface PublishTrendPoint {
  key: string
  label: string
  rangeStart: string
  rangeEnd: string
  count: number
}

export interface CommercialTrendPoint {
  key: string
  label: string
  rangeStart: string
  rangeEnd: string
  settledAmount: number
  unsettledAmount: number
}

const addDays = (value: Date, amount: number) => {
  const result = new Date(value)
  result.setDate(result.getDate() + amount)
  return result
}

const endOfLocalMonth = (value: Date) =>
  new Date(value.getFullYear(), value.getMonth() + 1, 0)

const localDateKey = (value: Date) => [
  value.getFullYear(),
  String(value.getMonth() + 1).padStart(2, '0'),
  String(value.getDate()).padStart(2, '0'),
].join('-')

const localMonthKey = (value: Date) =>
  `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}`

const dayLabel = (value: Date) =>
  `${String(value.getMonth() + 1).padStart(2, '0')}/${String(value.getDate()).padStart(2, '0')}`

const monthLabel = (value: Date) =>
  `${String(value.getFullYear()).slice(-2)}/${String(value.getMonth() + 1).padStart(2, '0')}`

const buildDashboardPeriodBuckets = (
  period: DashboardPeriod,
  selectedDate: Date,
  actualNow: Date,
): PublishTrendPoint[] => {
  const { start, endExclusive } = getDashboardEffectiveRange(period, selectedDate, actualNow)
  if (endExclusive.getTime() <= start.getTime()) return []

  if (period === 'year') {
    const lastIncludedDate = new Date(endExclusive.getTime() - 1)
    const monthCount = lastIncludedDate.getFullYear() > start.getFullYear()
      ? 12
      : lastIncludedDate.getMonth() + 1
    return Array.from({ length: monthCount }, (_, index) => {
      const monthStart = new Date(start.getFullYear(), index, 1)
      return {
        key: localMonthKey(monthStart),
        label: monthLabel(monthStart),
        rangeStart: localDateKey(monthStart),
        rangeEnd: localDateKey(endOfLocalMonth(monthStart)),
        count: 0,
      }
    })
  }

  const points: PublishTrendPoint[] = []
  for (
    let day = new Date(start);
    day.getTime() < endExclusive.getTime();
    day = addDays(day, 1)
  ) {
    const key = localDateKey(day)
    points.push({
      key,
      label: dayLabel(day),
      rangeStart: key,
      rangeEnd: key,
      count: 0,
    })
  }
  return points
}

const dashboardPeriodKey = (date: Date, period: DashboardPeriod) =>
  period === 'year' ? localMonthKey(date) : localDateKey(date)

export function buildDashboardPublishTrend(
  videos: Video[],
  period: DashboardPeriod,
  selectedDate: Date,
  actualNow = new Date(),
): PublishTrendPoint[] {
  const points = buildDashboardPeriodBuckets(period, selectedDate, actualNow)
  const counts = new Map(points.map(point => [point.key, point]))

  videos.forEach(video => {
    const firstPublishedAt = getFirstPublishedAt(video.platforms)
    if (!firstPublishedAt || !isDateInDashboardPeriod(firstPublishedAt, period, selectedDate, actualNow)) return
    const point = counts.get(dashboardPeriodKey(firstPublishedAt, period))
    if (point) point.count += 1
  })

  return points
}

export function buildDashboardCommercialTrend(
  videos: Video[],
  period: DashboardPeriod,
  selectedDate: Date,
  actualNow = new Date(),
): CommercialTrendPoint[] {
  const points = buildDashboardPeriodBuckets(period, selectedDate, actualNow).map(point => ({
    key: point.key,
    label: point.label,
    rangeStart: point.rangeStart,
    rangeEnd: point.rangeEnd,
    settledAmount: 0,
    unsettledAmount: 0,
  }))
  const amounts = new Map(points.map(point => [point.key, point]))

  videos.forEach(video => {
    const entries = getCommercialAmountEntries(video)
    if (entries.length === 0) return

    const date = getFirstPublishedAt(video.platforms) ?? parseDashboardDate(video.createdAt)
    if (!date || !isDateInDashboardPeriod(date, period, selectedDate, actualNow)) return

    const point = amounts.get(dashboardPeriodKey(date, period))
    if (!point) return
    entries.forEach(entry => {
      if (entry.settlementStatus === 'settled') point.settledAmount += entry.amount
      else point.unsettledAmount += entry.amount
    })
  })

  return points
}
