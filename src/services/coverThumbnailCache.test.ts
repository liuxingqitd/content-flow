import { describe, expect, it, vi } from 'vitest'
import {
  coverThumbnailCacheKey,
  invalidateCoverThumbnailCache,
  loadCoverThumbnail,
  resetCoverThumbnailCache,
} from './coverThumbnailCache'

describe('cover thumbnail cache', () => {
  it('deduplicates concurrent thumbnail loads', async () => {
    const key = coverThumbnailCacheKey('video-dedupe', 'jpg')
    const loader = vi.fn(async () => 'blob:thumbnail-dedupe')

    const [first, second] = await Promise.all([
      loadCoverThumbnail(key, loader),
      loadCoverThumbnail(key, loader),
    ])

    expect(first).toBe('blob:thumbnail-dedupe')
    expect(second).toBe(first)
    expect(loader).toHaveBeenCalledTimes(1)
    invalidateCoverThumbnailCache('video-dedupe')
  })

  it('discards an old in-flight result after invalidation', async () => {
    const key = coverThumbnailCacheKey('video-replaced', 'jpg')
    let finishOldLoad: (url: string) => void = () => undefined
    const oldLoad = loadCoverThumbnail(key, () => new Promise(resolve => { finishOldLoad = resolve }))
    await Promise.resolve()

    invalidateCoverThumbnailCache('video-replaced')
    const newLoad = loadCoverThumbnail(key, async () => 'blob:thumbnail-new')
    finishOldLoad('blob:thumbnail-old')

    expect(await oldLoad).toBeNull()
    expect(await newLoad).toBe('blob:thumbnail-new')
    resetCoverThumbnailCache()
  })
})
