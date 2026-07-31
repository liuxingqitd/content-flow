import { describe, expect, it } from 'vitest'
import type { Video } from '@/types'
import {
  canMoveVideoToStatus,
  compareVideoLibraryAddedAtDesc,
  getVideoLibraryAddedAt,
  isVideoInLibrary,
} from './videoWorkflow'

const video = (patch: Partial<Video> = {}): Video => ({
  id: 'video-1',
  title: '测试视频',
  status: 'editing',
  tagIds: [],
  statusHistory: [{ status: 'editing', changedAt: '2026-07-10T10:00:00.000Z' }],
  platforms: [],
  createdAt: '2026-07-01T08:00:00.000Z',
  updatedAt: '2026-07-10T10:00:00.000Z',
  ...patch,
})

describe('video library workflow', () => {
  it('only allows a new library record to enter pending publish from editing', () => {
    expect(canMoveVideoToStatus('editing', 'pending_publish')).toBe(true)
    expect(canMoveVideoToStatus('filming', 'pending_publish')).toBe(false)
    expect(canMoveVideoToStatus('topic', 'published')).toBe(false)
    expect(canMoveVideoToStatus('pending_publish', 'published')).toBe(true)
  })

  it('keeps an existing library record eligible when it moves back in the workflow', () => {
    const existing = video({
      status: 'editing',
      videoLibraryAddedAt: '2026-07-20T12:00:00.000Z',
    })
    expect(isVideoInLibrary(existing)).toBe(true)
    expect(canMoveVideoToStatus('filming', 'pending_publish')).toBe(false)
  })

  it('uses the explicit admission time before legacy fallbacks', () => {
    expect(getVideoLibraryAddedAt(video({
      status: 'published',
      videoLibraryAddedAt: '2026-07-18T09:00:00.000Z',
      statusHistory: [{ status: 'published', changedAt: '2026-07-20T12:00:00.000Z' }],
    }))).toBe('2026-07-18T09:00:00.000Z')
  })

  it('recognizes legacy published and archived records but excludes pre-library archives', () => {
    expect(isVideoInLibrary(video({
      status: 'published',
      statusHistory: [{ status: 'published', changedAt: '2026-07-20T12:00:00.000Z' }],
    }))).toBe(true)
    expect(isVideoInLibrary(video({
      status: 'archived',
      statusHistory: [
        { status: 'published', changedAt: '2026-07-20T12:00:00.000Z' },
        { status: 'archived', changedAt: '2026-07-25T12:00:00.000Z' },
      ],
    }))).toBe(true)
    expect(isVideoInLibrary(video({
      status: 'archived',
      statusHistory: [{ status: 'editing', changedAt: '2026-07-20T12:00:00.000Z' }],
    }))).toBe(false)
  })

  it('does not admit an in-progress record just because a platform date was entered', () => {
    expect(isVideoInLibrary(video({
      status: 'editing',
      platforms: [{ platform: 'douyin', status: 'published', publishedAt: '2026-07-20T12:00:00.000Z' }],
    }))).toBe(false)
  })

  it('does not admit a directly archived record just because a platform date was entered', () => {
    expect(isVideoInLibrary(video({
      status: 'archived',
      statusHistory: [{ status: 'editing', changedAt: '2026-07-19T12:00:00.000Z' }],
      platforms: [{ platform: 'douyin', status: 'published', publishedAt: '2026-07-20T12:00:00.000Z' }],
    }))).toBe(false)
  })

  it('sorts mixed date formats by time instead of lexicographically', () => {
    const january = video({ videoLibraryAddedAt: '2026/01/01' })
    const december = video({ videoLibraryAddedAt: '2026-12-31T00:00:00.000Z' })
    expect([january, december].sort(compareVideoLibraryAddedAtDesc)).toEqual([december, january])
  })
})
