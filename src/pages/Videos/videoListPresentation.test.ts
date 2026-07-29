import { describe, expect, it } from 'vitest'
import { getVisibleVideoTableColumns, matchesVideoListSearch } from './videoListPresentation'

describe('video list presentation privacy', () => {
  it('removes every commercial column when commercial info is hidden', () => {
    const columns = getVisibleVideoTableColumns({ hideCommercialInfo: true, hidePromotionCost: false })

    expect(columns.map(column => column.key)).toEqual([
      'cover', 'title', 'tags', 'diagnosis', 'cost', 'published', 'violated',
    ])
  })

  it('can hide promotion cost independently of commercial info', () => {
    const columns = getVisibleVideoTableColumns({ hideCommercialInfo: false, hidePromotionCost: true })

    expect(columns.map(column => column.key)).toEqual([
      'cover', 'title', 'tags', 'commercialType', 'paymentMethod', 'commercialTotal',
      'settlement', 'diagnosis', 'published', 'violated',
    ])
  })

  it('does not match a private brand name while commercial info is hidden', () => {
    const video = { title: '普通视频', commercialBrandName: '保密品牌' }

    expect(matchesVideoListSearch(video, '保密品牌', true)).toBe(true)
    expect(matchesVideoListSearch(video, '保密品牌', false)).toBe(false)
    expect(matchesVideoListSearch(video, '普通', false)).toBe(true)
  })
})
