import type {
  CommercialDealType,
  CommercialSettlementStatus,
  Platform,
  PlatformCommercialSettlement,
  UnderwaterPaymentMethod,
  Video,
} from '@/types'

export interface CommercialAmountEntry {
  amount: number
  settlementStatus: CommercialSettlementStatus
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

export function getCommercialSettlementSummary(video: Video): CommercialSettlementStatus | 'partial' | undefined {
  const entries = getCommercialAmountEntries(video)
  if (entries.length === 0) return video.isCommercial ? 'unsettled' : undefined
  const settledCount = entries.filter(entry => entry.settlementStatus === 'settled').length
  if (settledCount === 0) return 'unsettled'
  if (settledCount === entries.length) return 'settled'
  return 'partial'
}
