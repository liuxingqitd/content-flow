import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/zh-cn'

dayjs.extend(relativeTime)
dayjs.locale('zh-cn')

export const now = () => new Date().toISOString()

export const formatDate = (iso: string) => dayjs(iso).format('YYYY-MM-DD')

export const formatDateTime = (iso: string) => dayjs(iso).format('MM-DD HH:mm')

export const toDateTimeLocalValue = (iso: string) => dayjs(iso).format('YYYY-MM-DDTHH:mm')

export const fromDateTimeLocalValue = (value: string) => new Date(value).toISOString()

export const fromNow = (iso: string) => dayjs(iso).fromNow()

export const formatDuration = (seconds: number): string => {
  if (seconds < 60) return `${seconds}秒`
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return s > 0 ? `${m}分${s}秒` : `${m}分钟`
}
