import type { Video } from '@/types'

export function getVideoDetailCreatedAt(
  video: Pick<Video, 'createdAt' | 'statusHistory' | 'platforms'>,
): string {
  const firstPublishedEntry = (video.statusHistory ?? [])
    .filter(entry => entry.status === 'published' && !Number.isNaN(new Date(entry.changedAt).getTime()))
    .sort((a, b) => new Date(a.changedAt).getTime() - new Date(b.changedAt).getTime())[0]
  if (firstPublishedEntry) return firstPublishedEntry.changedAt

  const firstPlatformPublishedAt = (video.platforms ?? [])
    .map(platform => platform.publishedAt)
    .filter((publishedAt): publishedAt is string =>
      typeof publishedAt === 'string' && !Number.isNaN(new Date(publishedAt).getTime()),
    )
    .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())[0]

  return firstPlatformPublishedAt ?? video.createdAt
}
