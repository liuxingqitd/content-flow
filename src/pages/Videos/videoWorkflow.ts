import type { Video, VideoStatus } from '@/types'

const validTimestamp = (value?: string) => {
  if (!value) return undefined
  return Number.isNaN(new Date(value).getTime()) ? undefined : value
}

const earliestTimestamp = (values: Array<string | undefined>) => values
  .map(validTimestamp)
  .filter((value): value is string => Boolean(value))
  .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())[0]

export function getVideoLibraryAddedAt(
  video: Pick<Video, 'videoLibraryAddedAt' | 'statusHistory'>,
): string | undefined {
  const explicitAddedAt = validTimestamp(video.videoLibraryAddedAt)
  if (explicitAddedAt) return explicitAddedAt

  const firstLibraryStatusAt = earliestTimestamp(
    (video.statusHistory ?? [])
      .filter(entry => entry.status === 'pending_publish' || entry.status === 'published')
      .map(entry => entry.changedAt),
  )
  if (firstLibraryStatusAt) return firstLibraryStatusAt

  return undefined
}

export function isVideoInLibrary(
  video: Pick<Video, 'videoLibraryAddedAt' | 'statusHistory'>,
): boolean {
  return getVideoLibraryAddedAt(video) !== undefined
}

export function canMoveVideoToStatus(
  currentStatus: VideoStatus,
  targetStatus: VideoStatus,
): boolean {
  if (currentStatus === targetStatus) return false
  if (targetStatus === 'pending_publish') {
    return currentStatus === 'editing'
  }
  if (targetStatus === 'published') {
    return currentStatus === 'pending_publish'
  }
  return true
}

export function compareVideoLibraryAddedAtDesc(
  a: Pick<Video, 'videoLibraryAddedAt' | 'statusHistory' | 'createdAt'>,
  b: Pick<Video, 'videoLibraryAddedAt' | 'statusHistory' | 'createdAt'>,
): number {
  const aTime = new Date(getVideoLibraryAddedAt(a) ?? a.createdAt).getTime()
  const bTime = new Date(getVideoLibraryAddedAt(b) ?? b.createdAt).getTime()
  return bTime - aTime
}
