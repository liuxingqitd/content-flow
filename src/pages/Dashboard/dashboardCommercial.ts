import type { Video } from '@/types'
import {
  getCommercialDealType,
  getCommercialSettlementSummary,
  getCommercialTotalAmount,
  getUnderwaterPaymentMethod,
} from '@/pages/Videos/commercialUtils'

export interface CommercialOverview {
  commercialCount: number
  totalAmount: number
  settlementCounts: {
    settled: number
    partial: number
    unsettled: number
  }
  settlementAmounts: {
    settled: number
    partial: number
    unsettled: number
  }
  paymentMethodCounts: {
    platform: number
    personal_transfer: number
    corporate_payment: number
  }
  paymentMethodAmounts: {
    platform: number
    personal_transfer: number
    corporate_payment: number
  }
}

export function buildCommercialOverview(videos: Video[]): CommercialOverview {
  const result: CommercialOverview = {
    commercialCount: 0,
    totalAmount: 0,
    settlementCounts: { settled: 0, partial: 0, unsettled: 0 },
    settlementAmounts: { settled: 0, partial: 0, unsettled: 0 },
    paymentMethodCounts: { platform: 0, personal_transfer: 0, corporate_payment: 0 },
    paymentMethodAmounts: { platform: 0, personal_transfer: 0, corporate_payment: 0 },
  }

  videos.forEach(video => {
    if (!video.isCommercial) return

    const amount = getCommercialTotalAmount(video) ?? 0
    result.commercialCount += 1
    result.totalAmount += amount

    const settlement = getCommercialSettlementSummary(video) ?? 'unsettled'
    result.settlementCounts[settlement] += 1
    result.settlementAmounts[settlement] += amount

    if (getCommercialDealType(video) === 'platform') {
      result.paymentMethodCounts.platform += 1
      result.paymentMethodAmounts.platform += amount
    } else {
      const paymentMethod = getUnderwaterPaymentMethod(video)
      result.paymentMethodCounts[paymentMethod] += 1
      result.paymentMethodAmounts[paymentMethod] += amount
    }
  })

  return result
}
