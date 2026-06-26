import { describe, expect, it } from 'vitest'
import { buildPageAgentContext, resolveCurrentScript } from './context'
import type { AppData } from '@/types'

const data = {
  version: '1',
  tags: [],
  checklistItems: [],
  transitionChecklists: {
    'topic→scripting': [],
    'scripting→review': [],
    'review→filming': [],
    'filming→editing': [],
  },
  videos: [],
  videoRelations: [],
  topics: [],
  metrics: [],
  scripts: [],
  settings: { theme: 'dark', defaultPlatforms: [], violationReasons: [], skipReasons: [] },
  douyinRecords: [{ id: 'raw', title: 'secret raw record' }],
  shipinhaoRecords: [],
  xiaohongshuRecords: [],
} as unknown as AppData

describe('page agent context', () => {
  it('summarizes analytics without exposing raw records', () => {
    const context = buildPageAgentContext('/analytics', data)
    expect(context.summary.douyinRecords).toBe(1)
    expect(JSON.stringify(context)).not.toContain('secret raw record')
  })

  it('does not invent a focused entity for list pages', () => {
    expect(buildPageAgentContext('/videos', data).focusedEntity).toBeUndefined()
  })

  it('resolves the current script directly from a script route', () => {
    const withScript = {
      ...data,
      scripts: [{ id: 'script_a', videoId: 'vid_a', title: '稿件 A', updatedAt: '2026-06-10' }],
    } as AppData

    expect(resolveCurrentScript('/scripts/script_a', withScript)?.id).toBe('script_a')
    expect(buildPageAgentContext('/scripts/script_a', withScript).currentScript?.id).toBe('script_a')
  })

  it('resolves a video script from the video forward link', () => {
    const withLinks = {
      ...data,
      videos: [{ id: 'vid_a', scriptId: 'script_a', title: '视频 A', updatedAt: '2026-06-10', platforms: [], tagIds: [] }],
      scripts: [{ id: 'script_a', title: '稿件 A', updatedAt: '2026-06-10' }],
    } as unknown as AppData

    expect(resolveCurrentScript('/videos/vid_a', withLinks)?.id).toBe('script_a')
  })

  it('falls back to the script reverse link for old data', () => {
    const withReverseLink = {
      ...data,
      videos: [{ id: 'vid_a', title: '视频 A', updatedAt: '2026-06-10', platforms: [], tagIds: [] }],
      scripts: [{ id: 'script_a', videoId: 'vid_a', title: '稿件 A', updatedAt: '2026-06-10' }],
    } as unknown as AppData

    expect(resolveCurrentScript('/videos/vid_a', withReverseLink)?.id).toBe('script_a')
  })

  it('keeps a video script id visible when its script index is missing', () => {
    const missingIndex = {
      ...data,
      videos: [{ id: 'vid_a', scriptId: 'script_missing', title: '视频 A', updatedAt: '2026-06-10', platforms: [], tagIds: [] }],
    } as unknown as AppData

    expect(buildPageAgentContext('/videos/vid_a', missingIndex).currentScript?.id).toBe('script_missing')
  })
})
