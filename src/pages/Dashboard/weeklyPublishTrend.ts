import type { Video } from '@/types'

export interface WeeklyPublishPoint {
  weekStart: string
  weekEnd: string
  label: string
  count: number
}

const startOfLocalWeek = (value: Date) => {
  const result = new Date(value.getFullYear(), value.getMonth(), value.getDate())
  const daysFromMonday = (result.getDay() + 6) % 7
  result.setDate(result.getDate() - daysFromMonday)
  return result
}

const addDays = (value: Date, amount: number) => {
  const result = new Date(value)
  result.setDate(result.getDate() + amount)
  return result
}

const localDateKey = (value: Date) => [
  value.getFullYear(),
  String(value.getMonth() + 1).padStart(2, '0'),
  String(value.getDate()).padStart(2, '0'),
].join('-')

const shortDate = (value: Date) =>
  `${String(value.getMonth() + 1).padStart(2, '0')}/${String(value.getDate()).padStart(2, '0')}`

export function buildWeeklyPublishTrend(
  videos: Video[],
  referenceDate = new Date(),
  weekCount = 12,
): WeeklyPublishPoint[] {
  if (weekCount <= 0) return []

  const currentWeek = startOfLocalWeek(referenceDate)
  const firstWeek = addDays(currentWeek, -(weekCount - 1) * 7)
  const points = Array.from({ length: weekCount }, (_, index) => {
    const start = addDays(firstWeek, index * 7)
    const end = addDays(start, 6)
    return {
      weekStart: localDateKey(start),
      weekEnd: localDateKey(end),
      label: shortDate(start),
      count: 0,
    }
  })
  const counts = new Map(points.map(point => [point.weekStart, point]))

  videos.forEach(video => {
    const firstPublishedAt = video.platforms
      .map(platform => platform.publishedAt)
      .filter((publishedAt): publishedAt is string => Boolean(publishedAt))
      .map(publishedAt => new Date(publishedAt))
      .filter(date => !Number.isNaN(date.getTime()))
      .sort((a, b) => a.getTime() - b.getTime())[0]
    if (!firstPublishedAt) return

    const key = localDateKey(startOfLocalWeek(firstPublishedAt))
    const point = counts.get(key)
    if (point) point.count += 1
  })

  return points
}
