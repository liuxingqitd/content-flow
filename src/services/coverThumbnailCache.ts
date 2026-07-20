const MAX_CACHED_THUMBNAILS = 64
const MAX_CONCURRENT_LOADS = 2

const thumbnailCache = new Map<string, string>()
const inFlightLoads = new Map<string, Promise<string | null>>()
const loadQueue: Array<() => void> = []
const keyGenerations = new Map<string, number>()
let activeLoads = 0
let cacheGeneration = 0

type Generation = { cache: number; key: number }

const currentGeneration = (key: string): Generation => ({
  cache: cacheGeneration,
  key: keyGenerations.get(key) ?? 0,
})

const isCurrentGeneration = (key: string, generation: Generation) =>
  generation.cache === cacheGeneration && generation.key === (keyGenerations.get(key) ?? 0)

const touchCachedUrl = (key: string): string | undefined => {
  const url = thumbnailCache.get(key)
  if (!url) return undefined
  thumbnailCache.delete(key)
  thumbnailCache.set(key, url)
  return url
}

const runNextLoad = () => {
  while (activeLoads < MAX_CONCURRENT_LOADS) {
    const start = loadQueue.shift()
    if (!start) return
    activeLoads += 1
    start()
  }
}

const cacheUrl = (key: string, url: string) => {
  const previous = thumbnailCache.get(key)
  if (previous && previous !== url) URL.revokeObjectURL(previous)
  thumbnailCache.delete(key)
  thumbnailCache.set(key, url)

  while (thumbnailCache.size > MAX_CACHED_THUMBNAILS) {
    const oldestKey = thumbnailCache.keys().next().value as string | undefined
    if (!oldestKey) break
    const oldestUrl = thumbnailCache.get(oldestKey)
    thumbnailCache.delete(oldestKey)
    if (oldestUrl) URL.revokeObjectURL(oldestUrl)
  }
}

export const coverThumbnailCacheKey = (videoId: string, ext: string) => `${videoId}:${ext}`

export const getCachedCoverThumbnail = (key: string) => touchCachedUrl(key)

export const loadCoverThumbnail = (
  key: string,
  loader: () => Promise<string | null>,
): Promise<string | null> => {
  const cached = touchCachedUrl(key)
  if (cached) return Promise.resolve(cached)

  const existing = inFlightLoads.get(key)
  if (existing) return existing

  const generation = currentGeneration(key)
  let startLoad: () => void
  const request = new Promise<string | null>((resolve, reject) => {
    startLoad = () => {
      if (!isCurrentGeneration(key, generation)) {
        resolve(null)
        activeLoads -= 1
        if (inFlightLoads.get(key) === request) inFlightLoads.delete(key)
        runNextLoad()
        return
      }

      Promise.resolve()
        .then(loader)
        .then(url => {
          if (!isCurrentGeneration(key, generation)) {
            if (url) URL.revokeObjectURL(url)
            resolve(null)
            return
          }
          if (url) cacheUrl(key, url)
          resolve(url)
        })
        .catch(reject)
        .finally(() => {
          activeLoads -= 1
          if (inFlightLoads.get(key) === request) inFlightLoads.delete(key)
          runNextLoad()
        })
    }
  })

  inFlightLoads.set(key, request)
  loadQueue.push(startLoad!)
  runNextLoad()
  return request
}

export const invalidateCoverThumbnailCache = (videoId: string) => {
  const prefix = `${videoId}:`
  for (const [key, url] of thumbnailCache) {
    if (!key.startsWith(prefix)) continue
    thumbnailCache.delete(key)
    URL.revokeObjectURL(url)
  }
  for (const key of inFlightLoads.keys()) {
    if (!key.startsWith(prefix)) continue
    keyGenerations.set(key, (keyGenerations.get(key) ?? 0) + 1)
    inFlightLoads.delete(key)
  }
}

export const resetCoverThumbnailCache = () => {
  cacheGeneration += 1
  keyGenerations.clear()
  inFlightLoads.clear()
  for (const url of thumbnailCache.values()) URL.revokeObjectURL(url)
  thumbnailCache.clear()
}
