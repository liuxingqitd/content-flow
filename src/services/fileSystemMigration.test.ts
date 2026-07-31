import { describe, expect, it } from 'vitest'
import type { AppData } from '@/types'
import { defaultAppData } from './defaultData'
import { migratePlatformPublishingData, migrateVideoLibraryRecords } from './fileSystem'

describe('migratePlatformPublishingData', () => {
  it('removes skipped entries and preserves legacy costs as dated records once', () => {
    const data = defaultAppData()
    data.videos = [{
      id: 'legacy',
      title: 'legacy',
      status: 'published',
      tagIds: [],
      statusHistory: [],
      platforms: [
        { platform: 'douyin', status: 'published', publishedAt: '2026-06-01T12:00:00.000Z', promotionCost: 300 },
        { platform: 'xiaohongshu', status: 'skipped', skipReason: 'legacy', promotionCost: 100 },
      ],
      createdAt: '2026-05-01T12:00:00.000Z',
      updatedAt: '2026-06-01T12:00:00.000Z',
    }] as unknown as AppData['videos']

    expect(migratePlatformPublishingData(data)).toBe(true)
    expect(data.videos[0].platforms).toEqual([{
      platform: 'douyin',
      status: 'published',
      publishedAt: '2026-06-01T12:00:00.000Z',
    }])
    expect(data.videos[0].promotionRecords).toMatchObject([
      {
        platform: 'douyin',
        amount: 300,
        spentAt: '2026-06-01T12:00:00.000Z',
        createdAt: '2026-06-01T12:00:00.000Z',
      },
      {
        platform: 'xiaohongshu',
        amount: 100,
        spentAt: '2026-05-01T12:00:00.000Z',
        createdAt: '2026-05-01T12:00:00.000Z',
      },
    ])

    expect(migratePlatformPublishingData(data)).toBe(false)
    expect(data.videos[0].promotionRecords).toHaveLength(2)
  })
})

describe('migrateVideoLibraryRecords', () => {
  it('preserves legacy published and archived records exactly once', () => {
    const data = defaultAppData()
    data.version = '1.0'
    data.videos = [
      {
        id: 'published', title: 'published', status: 'published', tagIds: [], platforms: [],
        statusHistory: [{ status: 'published', changedAt: '2026-06-01T12:00:00.000Z' }],
        createdAt: '2026-05-01T12:00:00.000Z', updatedAt: '2026-06-01T12:00:00.000Z',
      },
      {
        id: 'archived', title: 'archived', status: 'archived', tagIds: [],
        platforms: [{ platform: 'douyin', status: 'published', publishedAt: '2026-04-10T12:00:00.000Z' }],
        statusHistory: [],
        createdAt: '2026-04-01T12:00:00.000Z', updatedAt: '2026-04-01T12:00:00.000Z',
      },
      {
        id: 'editing', title: 'editing', status: 'editing', tagIds: [], platforms: [], statusHistory: [],
        createdAt: '2026-03-01T12:00:00.000Z', updatedAt: '2026-03-01T12:00:00.000Z',
      },
    ]

    expect(migrateVideoLibraryRecords(data)).toBe(true)
    expect(data.version).toBe('1.1')
    expect(data.videos[0].videoLibraryAddedAt).toBe('2026-06-01T12:00:00.000Z')
    expect(data.videos[1].videoLibraryAddedAt).toBe('2026-04-10T12:00:00.000Z')
    expect(data.videos[2].videoLibraryAddedAt).toBeUndefined()
    expect(migrateVideoLibraryRecords(data)).toBe(false)
  })
})
