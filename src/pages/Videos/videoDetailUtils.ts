import type { Video } from '@/types'
import { getVideoLibraryAddedAt } from './videoWorkflow'

export function getVideoDetailCreatedAt(
  video: Pick<Video, 'videoLibraryAddedAt' | 'createdAt' | 'statusHistory'>,
): string {
  return getVideoLibraryAddedAt(video) ?? video.createdAt
}
