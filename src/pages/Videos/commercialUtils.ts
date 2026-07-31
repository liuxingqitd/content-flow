import type {
  CommercialDealType,
  CommercialSettlementStatus,
  Platform,
  PlatformCommercialSettlement,
  UnderwaterPaymentMethod,
  Video,
} from '@/types'
import { ALL_PLATFORMS } from '@/types'

export interface CommercialAmountEntry {
  amount: number
  settlementStatus: CommercialSettlementStatus
}

export function getPublishedCommercialPlatforms(video: Video): Platform[] {
  const publishedPlatforms = new Set(video.platforms.map(entry => entry.platform))
  return ALL_PLATFORMS.filter(platform => publishedPlatforms.has(platform))
}

export function getCommercialDealType(video: Video): CommercialDealType {
  if (video.commercialDealType) return video.commercialDealType
  return video.commercialPaymentRecipient === 'platform' ? 'platform' : 'underwater'
}

export function getPlatformCommercialSettlements(video: Video): PlatformCommercialSettlement[] {
  if (video.platformCommercialSettlements) return video.platformCommercialSettlements
  if (video.commercialPaymentRecipient !== 'platform' || !video.commercialAmount) return []

  const platform: Platform = video.platforms.find(item => item.status === 'published')?.platform
    ?? video.platforms[0]?.platform
    ?? 'douyin'
  return [{
    platform,
    amount: video.commercialAmount,
    settlementStatus: video.commercialSettlementStatus ?? 'unsettled',
  }]
}

export function getUnderwaterPaymentMethod(video: Video): UnderwaterPaymentMethod {
  if (video.underwaterPaymentMethod) return video.underwaterPaymentMethod
  return video.commercialPaymentRecipient === 'company' ? 'corporate_payment' : 'personal_transfer'
}

export function getCommercialAmountEntries(video: Video): CommercialAmountEntry[] {
  if (!video.isCommercial) return []
  if (getCommercialDealType(video) === 'platform') {
    return getPlatformCommercialSettlements(video)
      .filter((entry): entry is PlatformCommercialSettlement & { amount: number } =>
        entry.amount !== undefined && Number.isFinite(entry.amount) && entry.amount > 0)
      .map(entry => ({ amount: entry.amount, settlementStatus: entry.settlementStatus }))
  }

  const amount = video.commercialAmount
  if (amount === undefined || !Number.isFinite(amount) || amount <= 0) return []
  return [{ amount, settlementStatus: video.commercialSettlementStatus ?? 'unsettled' }]
}

export function getCommercialTotalAmount(video: Video): number | undefined {
  const entries = getCommercialAmountEntries(video)
  if (entries.length === 0) return undefined
  return entries.reduce((total, entry) => total + entry.amount, 0)
}

export function getCommercialSettlementSummary(video: Video): CommercialSettlementStatus | 'partial' | undefined {
  if (!video.isCommercial) return undefined
  if (getCommercialDealType(video) === 'underwater') {
    return video.commercialSettlementStatus ?? 'unsettled'
  }

  const settlements = getPlatformCommercialSettlements(video)
  if (settlements.length === 0) return video.commercialSettlementStatus ?? 'unsettled'
  const settledCount = settlements.filter(entry => entry.settlementStatus === 'settled').length
  if (settledCount === 0) return 'unsettled'
  if (settledCount === settlements.length) return 'settled'
  return 'partial'
}
