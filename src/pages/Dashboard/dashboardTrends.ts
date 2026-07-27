import type { Video } from '@/types'

export type PublishTrendGranularity = 'week' | 'month'

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

const startOfLocalDay = (value: Date) =>
  new Date(value.getFullYear(), value.getMonth(), value.getDate())

const startOfLocalWeek = (value: Date) => {
  const result = startOfLocalDay(value)
  const daysFromMonday = (result.getDay() + 6) % 7
  result.setDate(result.getDate() - daysFromMonday)
  return result
}

const startOfLocalMonth = (value: Date) =>
  new Date(value.getFullYear(), value.getMonth(), 1)

const addDays = (value: Date, amount: number) => {
  const result = new Date(value)
  result.setDate(result.getDate() + amount)
  return result
}

const addMonths = (value: Date, amount: number) =>
  new Date(value.getFullYear(), value.getMonth() + amount, 1)

const endOfLocalMonth = (value: Date) =>
  new Date(value.getFullYear(), value.getMonth() + 1, 0)

const localDateKey = (value: Date) => [
  value.getFullYear(),
  String(value.getMonth() + 1).padStart(2, '0'),
  String(value.getDate()).padStart(2, '0'),
].join('-')

const localMonthKey = (value: Date) =>
  `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}`

const weekLabel = (value: Date) =>
  `${String(value.getMonth() + 1).padStart(2, '0')}/${String(value.getDate()).padStart(2, '0')}`

const monthLabel = (value: Date) =>
  `${String(value.getFullYear()).slice(-2)}/${String(value.getMonth() + 1).padStart(2, '0')}`

const parseValidDate = (value?: string) => {
  if (!value) return undefined
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? undefined : date
}

const getFirstPublishedAt = (video: Video) => video.platforms
  .map(platform => parseValidDate(platform.publishedAt))
  .filter((date): date is Date => Boolean(date))
  .sort((a, b) => a.getTime() - b.getTime())[0]

const buildPublishBuckets = (
  granularity: PublishTrendGranularity,
  referenceDate: Date,
  bucketCount: number,
): PublishTrendPoint[] => {
  if (bucketCount <= 0) return []

  if (granularity === 'week') {
    const currentWeek = startOfLocalWeek(referenceDate)
    const firstWeek = addDays(currentWeek, -(bucketCount - 1) * 7)
    return Array.from({ length: bucketCount }, (_, index) => {
      const start = addDays(firstWeek, index * 7)
      const end = addDays(start, 6)
      return {
        key: localDateKey(start),
        label: weekLabel(start),
        rangeStart: localDateKey(start),
        rangeEnd: localDateKey(end),
        count: 0,
      }
    })
  }

  const currentMonth = startOfLocalMonth(referenceDate)
  const firstMonth = addMonths(currentMonth, -(bucketCount - 1))
  return Array.from({ length: bucketCount }, (_, index) => {
    const start = addMonths(firstMonth, index)
    return {
      key: localMonthKey(start),
      label: monthLabel(start),
      rangeStart: localDateKey(start),
      rangeEnd: localDateKey(endOfLocalMonth(start)),
      count: 0,
    }
  })
}

export function buildPublishTrend(
  videos: Video[],
  granularity: PublishTrendGranularity,
  referenceDate = new Date(),
  bucketCount = 12,
): PublishTrendPoint[] {
  const points = buildPublishBuckets(granularity, referenceDate, bucketCount)
  const counts = new Map(points.map(point => [point.key, point]))

  videos.forEach(video => {
    const firstPublishedAt = getFirstPublishedAt(video)
    if (!firstPublishedAt || firstPublishedAt.getTime() > referenceDate.getTime()) return

    const key = granularity === 'week'
      ? localDateKey(startOfLocalWeek(firstPublishedAt))
      : localMonthKey(firstPublishedAt)
    const point = counts.get(key)
    if (point) point.count += 1
  })

  return points
}

export function buildMonthlyCommercialTrend(
  videos: Video[],
  referenceDate = new Date(),
  monthCount = 12,
): CommercialTrendPoint[] {
  const points = buildPublishBuckets('month', referenceDate, monthCount)
    .map(point => ({
      key: point.key,
      label: point.label,
      rangeStart: point.rangeStart,
      rangeEnd: point.rangeEnd,
      settledAmount: 0,
      unsettledAmount: 0,
    }))
  const amounts = new Map(points.map(point => [point.key, point]))

  videos.forEach(video => {
    const amount = video.isCommercial ? video.commercialAmount : undefined
    if (amount === undefined || !Number.isFinite(amount) || amount <= 0) return

    const date = getFirstPublishedAt(video) ?? parseValidDate(video.createdAt)
    if (!date || date.getTime() > referenceDate.getTime()) return

    const point = amounts.get(localMonthKey(date))
    if (!point) return

    if (video.commercialSettlementStatus === 'settled') {
      point.settledAmount += amount
    } else {
      point.unsettledAmount += amount
    }
  })

  return points
}
