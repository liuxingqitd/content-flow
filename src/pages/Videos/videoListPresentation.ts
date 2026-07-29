import type { Video } from '@/types'

export const VIDEO_TABLE_COLUMNS = [
  { key: 'cover', width: 70, label: '' },
  { key: 'title', width: 220, label: '标题' },
  { key: 'tags', width: 112, label: '标签' },
  { key: 'commercialType', width: 96, label: '商单类型', commercial: true },
  { key: 'paymentMethod', width: 104, label: '付款方式', commercial: true },
  { key: 'commercialTotal', width: 104, label: '总金额', commercial: true },
  { key: 'settlement', width: 96, label: '结算状态', commercial: true },
  { key: 'diagnosis', width: 96, label: '平台诊断' },
  { key: 'cost', width: 92, label: '投放金额', promotion: true },
  { key: 'published', width: 108, label: '已发布' },
  { key: 'violated', width: 94, label: '已违规' },
] as const

export function getVisibleVideoTableColumns(options: {
  hideCommercialInfo: boolean
  hidePromotionCost: boolean
}) {
  return VIDEO_TABLE_COLUMNS.filter(column =>
    (!options.hideCommercialInfo || !('commercial' in column))
    && (!options.hidePromotionCost || !('promotion' in column)),
  )
}

export function matchesVideoListSearch(
  video: Pick<Video, 'title' | 'commercialBrandName'>,
  search: string,
  showCommercialInfo: boolean,
) {
  const query = search.trim().toLowerCase()
  if (!query) return true
  return video.title.toLowerCase().includes(query)
    || (showCommercialInfo && Boolean(video.commercialBrandName?.toLowerCase().includes(query)))
}
