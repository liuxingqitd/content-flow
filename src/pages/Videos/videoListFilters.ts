import type { VideoStatus } from '@/types'

export type VideoPlatformFilter = 'violated'

export interface VideoListFilters {
  search: string
  status: VideoStatus | 'all'
  platform: VideoPlatformFilter | null
  tagId: string
  commercialOnly: boolean
}

const FILTERABLE_STATUSES: ReadonlySet<string> = new Set(['published', 'archived'])

export function readVideoListFilters(searchParams: URLSearchParams): VideoListFilters {
  const statusParam = searchParams.get('status')
  return {
    search: searchParams.get('q') ?? '',
    status: statusParam && FILTERABLE_STATUSES.has(statusParam)
      ? statusParam as VideoStatus
      : 'all',
    platform: searchParams.get('platform') === 'violated' ? 'violated' : null,
    tagId: searchParams.get('tag') || 'all',
    commercialOnly: searchParams.get('commercial') === '1',
  }
}

export function updateVideoListFilter(
  current: URLSearchParams,
  key: 'q' | 'status' | 'platform' | 'tag' | 'commercial',
  value?: string,
): URLSearchParams {
  const next = new URLSearchParams(current)
  if (!value || value === 'all') next.delete(key)
  else next.set(key, value)
  return next
}
