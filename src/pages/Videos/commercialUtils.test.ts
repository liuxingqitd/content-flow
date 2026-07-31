import { describe, expect, it } from 'vitest'
import type { Video } from '@/types'
import {
  getCommercialAmountEntries,
  getCommercialDealType,
  getCommercialSettlementSummary,
  getCommercialTotalAmount,
  getPlatformCommercialSettlements,
  getPublishedCommercialPlatforms,
  getUnderwaterPaymentMethod,
} from './commercialUtils'

const baseVideo = (overrides: Partial<Video> = {}): Video => ({
  id: 'video-1',
  title: 'test',
  status: 'published',
  tagIds: [],
  statusHistory: [],
  platforms: [],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
})

describe('commercial utils', () => {
  it('only exposes platforms where the video has been published', () => {
    const video = baseVideo({
      platforms: [
        { platform: 'shipinhao', status: 'published' },
        { platform: 'douyin', status: 'violated' },
      ],
    })

    expect(getPublishedCommercialPlatforms(video)).toEqual(['douyin', 'shipinhao'])
  })

  it('keeps platform amounts and statuses independent', () => {
    const video = baseVideo({
      isCommercial: true,
      commercialDealType: 'platform',
      platformCommercialSettlements: [
        { platform: 'douyin', amount: 1000, settlementCycle: '发布后30天', settlementStatus: 'settled' },
        { platform: 'xiaohongshu', amount: 2000, settlementCycle: '次月15日', settlementStatus: 'unsettled' },
        { platform: 'shipinhao', amount: 0, settlementStatus: 'settled' },
      ],
    })

    expect(getCommercialAmountEntries(video)).toEqual([
      { amount: 1000, settlementStatus: 'settled' },
      { amount: 2000, settlementStatus: 'unsettled' },
    ])
    expect(getCommercialTotalAmount(video)).toBe(3000)
    expect(getCommercialSettlementSummary(video)).toBe('partial')
  })

  it('uses one underwater price and maps legacy payment recipients', () => {
    const video = baseVideo({
      isCommercial: true,
      commercialDealType: 'underwater',
      commercialAmount: 3600,
      commercialSettlementStatus: 'settled',
      commercialPaymentRecipient: 'company',
    })

    expect(getCommercialAmountEntries(video)).toEqual([{ amount: 3600, settlementStatus: 'settled' }])
    expect(getCommercialTotalAmount(video)).toBe(3600)
    expect(getUnderwaterPaymentMethod(video)).toBe('corporate_payment')
    expect(getCommercialSettlementSummary(video)).toBe('settled')
  })

  it('reads legacy platform deals without duplicating the amount', () => {
    const video = baseVideo({
      isCommercial: true,
      commercialAmount: 5000,
      commercialSettlementStatus: 'unsettled',
      commercialPaymentRecipient: 'platform',
      platforms: [
        { platform: 'xiaohongshu', status: 'published' },
        { platform: 'douyin', status: 'published' },
      ],
    })

    expect(getCommercialDealType(video)).toBe('platform')
    expect(getPlatformCommercialSettlements(video)).toEqual([
      { platform: 'xiaohongshu', amount: 5000, settlementStatus: 'unsettled' },
    ])
    expect(getCommercialAmountEntries(video)).toHaveLength(1)
  })

  it('ignores invalid prices and inactive branch data', () => {
    const video = baseVideo({
      isCommercial: true,
      commercialDealType: 'underwater',
      commercialAmount: Number.POSITIVE_INFINITY,
      platformCommercialSettlements: [
        { platform: 'douyin', amount: 9999, settlementStatus: 'settled' },
      ],
    })

    expect(getCommercialAmountEntries(video)).toEqual([])
    expect(getCommercialTotalAmount(video)).toBeUndefined()
    expect(getCommercialSettlementSummary(video)).toBe('unsettled')
  })

  it('keeps settlement status independent from whether an amount was entered', () => {
    expect(getCommercialSettlementSummary(baseVideo({
      isCommercial: true,
      commercialDealType: 'underwater',
      commercialSettlementStatus: 'settled',
    }))).toBe('settled')

    expect(getCommercialSettlementSummary(baseVideo({
      isCommercial: true,
      commercialDealType: 'platform',
      platformCommercialSettlements: [
        { platform: 'douyin', settlementStatus: 'settled' },
        { platform: 'xiaohongshu', amount: 0, settlementStatus: 'unsettled' },
      ],
    }))).toBe('partial')
  })
})
