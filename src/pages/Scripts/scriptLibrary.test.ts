import { describe, expect, it } from 'vitest'
import type { Script, Video } from '@/types'
import {
  filterScriptsByPublicationStatus,
  getScriptLastEditedAt,
  isScriptPublished,
  sortScriptsByLastEdited,
} from './scriptLibrary'

const script = (id: string, createdAt: string, updatedAt: string, extra: Partial<Script> = {}): Script => ({
  id,
  title: id,
  wordCount: 0,
  estimatedDuration: 0,
  tagIds: [],
  version: 1,
  createdAt,
  updatedAt,
  ...extra,
})

const video = (id: string, extra: Partial<Video> = {}): Video => ({
  id,
  title: id,
  status: 'editing',
  tagIds: [],
  statusHistory: [{ status: 'editing', changedAt: '2026-01-01' }],
  platforms: [],
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
  ...extra,
})

describe('script library', () => {
  const scripts = [
    script('first', '2026-01-01', '2026-07-20', { contentUpdatedAt: '2026-04-01' }),
    script('second', '2026-03-01', '2026-03-01'),
    script('third', '2026-02-01', '2026-05-01'),
  ]

  it('uses content edits instead of metadata edits for edit recency when available', () => {
    expect(getScriptLastEditedAt(scripts[0])).toBe('2026-04-01')
    expect(sortScriptsByLastEdited(scripts).map(item => item.id)).toEqual(['third', 'first', 'second'])
  })

  it('recognizes current publication through either relation direction', () => {
    const current = script('current', '2026-01-01', '2026-01-01', { videoId: 'video-current' })
    const reverseLinked = script('reverse-linked', '2026-01-01', '2026-01-01')
    const videos = [
      video('video-current', { status: 'published' }),
      video('video-reverse-linked', { scriptId: 'reverse-linked', status: 'published' }),
    ]

    expect(isScriptPublished(current, videos)).toBe(true)
    expect(isScriptPublished(reverseLinked, videos)).toBe(true)
    expect(isScriptPublished(script('unlinked', '2026-01-01', '2026-01-01'), videos)).toBe(false)
  })

  it('prefers an explicit video relation over a conflicting reverse relation', () => {
    const linked = script('linked', '2026-01-01', '2026-01-01', { videoId: 'draft-video' })
    const videos = [
      video('published-video', { scriptId: 'linked', status: 'published' }),
      video('draft-video'),
    ]

    expect(isScriptPublished(linked, videos)).toBe(false)
  })

  it('filters unpublished scripts by default status semantics', () => {
    const draft = script('draft', '2026-01-01', '2026-01-01', { videoId: 'video-draft' })
    const published = script('published', '2026-01-01', '2026-01-01', { videoId: 'video-published' })
    const videos = [
      video('video-draft'),
      video('video-published', { status: 'published' }),
    ]

    expect(filterScriptsByPublicationStatus([draft, published], videos, 'unpublished')).toEqual([draft])
    expect(filterScriptsByPublicationStatus([draft, published], videos, 'published')).toEqual([published])
  })

  it('treats pending and archived videos as unpublished current states', () => {
    const pending = script('pending', '2026-01-01', '2026-01-01', { videoId: 'pending-video' })
    const archived = script('archived', '2026-01-01', '2026-01-01', { videoId: 'archived-video' })
    const videos = [
      video('pending-video', { status: 'pending_publish' }),
      video('archived-video', {
        status: 'archived',
        statusHistory: [{ status: 'published', changedAt: '2026-01-01' }],
      }),
    ]

    expect(filterScriptsByPublicationStatus([pending, archived], videos, 'unpublished')).toEqual([pending, archived])
  })

  it('falls back to the reverse relation when the explicit video no longer exists', () => {
    const linked = script('linked', '2026-01-01', '2026-01-01', { videoId: 'missing-video' })
    const videos = [video('published-video', { scriptId: 'linked', status: 'published' })]

    expect(isScriptPublished(linked, videos)).toBe(true)
  })
})
