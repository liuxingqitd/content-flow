import { describe, expect, it } from 'vitest'
import {
  COMMERCIAL_TAG_FILTER_VALUE,
  readVideoListFilters,
  updateVideoListFilter,
  updateVideoListTagFilter,
} from './videoListFilters'

describe('video list filters', () => {
  it('restores all supported filters from the URL', () => {
    expect(readVideoListFilters(new URLSearchParams('q=品牌&status=archived&platform=violated&tag=tag-1&commercial=1'))).toEqual({
      search: '品牌',
      status: 'archived',
      platform: 'violated',
      tagId: 'tag-1',
      commercialOnly: true,
    })
  })

  it('ignores unsupported values and removes default values', () => {
    expect(readVideoListFilters(new URLSearchParams('status=topic&platform=published'))).toEqual({
      search: '',
      status: 'all',
      platform: null,
      tagId: 'all',
      commercialOnly: false,
    })
    expect(updateVideoListFilter(new URLSearchParams('q=test&tag=tag-1'), 'tag', 'all').toString()).toBe('q=test')
    expect(updateVideoListFilter(new URLSearchParams('q=test'), 'commercial', '1').toString()).toBe('q=test&commercial=1')
  })

  it('switches atomically between commercial and regular tag filters', () => {
    const shared = 'q=test&status=archived&platform=violated'

    expect(updateVideoListTagFilter(
      new URLSearchParams(`${shared}&tag=tag-1`),
      COMMERCIAL_TAG_FILTER_VALUE,
    ).toString()).toBe(`${shared}&commercial=1`)

    expect(updateVideoListTagFilter(
      new URLSearchParams(`${shared}&commercial=1`),
      'tag-2',
    ).toString()).toBe(`${shared}&tag=tag-2`)

    expect(updateVideoListTagFilter(
      new URLSearchParams(`${shared}&commercial=1`),
      'all',
    ).toString()).toBe(shared)
  })
})
