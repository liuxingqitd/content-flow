import { describe, expect, it } from 'vitest'
import type { Video } from '@/types'
import { buildCommercialOverview } from './dashboardCommercial'

const video = (id: string, patch: Partial<Video> = {}): Video => ({
  id,
  title: id,
  status: 'published',
  tagIds: [],
  platforms: [],
  statusHistory: [],
  createdAt: '2026-07-01T08:00:00.000Z',
  updatedAt: '2026-07-01T08:00:00.000Z',
  ...patch,
})

describe('buildCommercialOverview', () => {
  it('counts each commercial video once across settlement and payment dimensions', () => {
    const overview = buildCommercialOverview([
      video('platform-partial', {
        isCommercial: true,
        commercialDealType: 'platform',
        platformCommercialSettlements: [
          { platform: 'douyin', amount: 1000, settlementStatus: 'settled' },
          { platform: 'xiaohongshu', amount: 2000, settlementStatus: 'unsettled' },
        ],
      }),
      video('personal', {
        isCommercial: true,
        commercialDealType: 'underwater',
        underwaterPaymentMethod: 'personal_transfer',
        commercialAmount: 3600,
        commercialSettlementStatus: 'settled',
      }),
      video('corporate-no-amount', {
        isCommercial: true,
        commercialDealType: 'underwater',
        underwaterPaymentMethod: 'corporate_payment',
      }),
      video('regular', { commercialAmount: 9999 }),
    ])

    expect(overview).toEqual({
      commercialCount: 3,
      totalAmount: 6600,
      settlementCounts: { settled: 1, partial: 1, unsettled: 1 },
      settlementAmounts: { settled: 3600, partial: 3000, unsettled: 0 },
      paymentMethodCounts: { platform: 1, personal_transfer: 1, corporate_payment: 1 },
      paymentMethodAmounts: { platform: 3000, personal_transfer: 3600, corporate_payment: 0 },
    })
  })

  it('supports legacy payment-recipient fields', () => {
    const overview = buildCommercialOverview([
      video('legacy-platform', {
        isCommercial: true,
        commercialAmount: 5000,
        commercialSettlementStatus: 'unsettled',
        commercialPaymentRecipient: 'platform',
      }),
      video('legacy-company', {
        isCommercial: true,
        commercialAmount: 2000,
        commercialSettlementStatus: 'settled',
        commercialPaymentRecipient: 'company',
      }),
    ])

    expect(overview.paymentMethodCounts).toEqual({
      platform: 1,
      personal_transfer: 0,
      corporate_payment: 1,
    })
    expect(overview.paymentMethodAmounts).toEqual({
      platform: 5000,
      personal_transfer: 0,
      corporate_payment: 2000,
    })
    expect(overview.settlementAmounts).toEqual({
      settled: 2000,
      partial: 0,
      unsettled: 5000,
    })
    expect(overview.totalAmount).toBe(7000)
  })

  it('keeps both dimension totals aligned with the commercial total', () => {
    const overview = buildCommercialOverview([
      video('platform-partial', {
        isCommercial: true,
        commercialDealType: 'platform',
        platformCommercialSettlements: [
          { platform: 'douyin', amount: 800, settlementStatus: 'settled' },
          { platform: 'xiaohongshu', amount: 1200, settlementStatus: 'unsettled' },
        ],
      }),
      video('personal-unsettled', {
        isCommercial: true,
        commercialAmount: 3000,
        commercialSettlementStatus: 'unsettled',
        underwaterPaymentMethod: 'personal_transfer',
      }),
    ])

    expect(Object.values(overview.settlementAmounts).reduce((sum, amount) => sum + amount, 0)).toBe(overview.totalAmount)
    expect(Object.values(overview.paymentMethodAmounts).reduce((sum, amount) => sum + amount, 0)).toBe(overview.totalAmount)
    expect(overview.settlementAmounts.partial).toBe(2000)
    expect(overview.settlementCounts.partial).toBe(1)
  })
})
