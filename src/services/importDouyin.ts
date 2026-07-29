import type { DouyinRawRecord, Video } from '@/types'
import { genId } from '@/utils/id'
import { now } from '@/utils/date'

function parseNumber(raw: string): number {
  const n = parseFloat(raw.trim())
  return Number.isNaN(n) ? 0 : n
}

function parsePublishedAt(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) return now()
  // "2026-07-24 19:45:29" → ISO 8601
  const m = trimmed.match(/^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2})$/)
  if (m) return `${m[1]}T${m[2]}.000Z`
  return now()
}

export interface DouyinJsonRow {
  title: string
  publishedAt: string
  genre: string
  status: string
  plays: string
  completionRate: string
  fiveSecRate: string
  coverCtr: string
  twoSecBounceRate: string
  avgPlayDuration: string
  likes: string
  shares: string
  comments: string
  saves: string
  profileVisits: string
  followerGain: string
}

export function parseDouyinJson(rows: DouyinJsonRow[]): DouyinRawRecord[] {
  const createdAt = now()
  return rows.map((row) => ({
    id: genId('dy'),
    title: row.title,
    publishedAt: parsePublishedAt(row.publishedAt),
    genre: row.genre,
    status: row.status,
    plays: parseNumber(row.plays),
    completionRate: parseNumber(row.completionRate),
    fiveSecRate: parseNumber(row.fiveSecRate),
    coverCtr: row.coverCtr === '-' ? '-' : row.coverCtr,
    twoSecBounceRate: parseNumber(row.twoSecBounceRate),
    avgPlayDuration: parseNumber(row.avgPlayDuration),
    likes: parseNumber(row.likes),
    shares: parseNumber(row.shares),
    comments: parseNumber(row.comments),
    saves: parseNumber(row.saves),
    profileVisits: parseNumber(row.profileVisits),
    followerGain: parseNumber(row.followerGain),
    createdAt,
  }))
}

function normalizeTitle(t: string): string {
  return t
    .replace(/[\p{Emoji_Presentation}\p{Emoji}‍]+/gu, '')
    .replace(/[^\w一-鿿]+/g, '')
    .toLowerCase()
    .trim()
}

export function mergeDouyinRecords(
  existing: readonly DouyinRawRecord[],
  incoming: DouyinRawRecord[],
  videos: Video[],
): { merged: DouyinRawRecord[]; autoMatched: number; newCount: number; updatedCount: number } {
  const base = existing.map(r => ({ ...r }))
  const existingByKey = new Map<string, number>()
  for (let i = 0; i < base.length; i++) {
    existingByKey.set(normalizeTitle(base[i].title), i)
  }

  const processedKeys = new Set<string>()
  let newCount = 0
  let updatedCount = 0
  const additions: DouyinRawRecord[] = []

  for (const rec of incoming) {
    const key = normalizeTitle(rec.title)
    if (!key) continue
    processedKeys.add(key)
    const existingIdx = existingByKey.get(key)
    if (existingIdx !== undefined) {
      const old = base[existingIdx]
      base[existingIdx] = {
        ...rec,
        id: old.id,
        createdAt: old.createdAt,
        videoId: old.videoId || matchToVideo(rec.title, videos) || undefined,
      }
      updatedCount++
    } else {
      additions.push({
        ...rec,
        videoId: matchToVideo(rec.title, videos) || undefined,
      })
      newCount++
    }
  }

  // 自动匹配已有但未关联的记录
  let autoMatched = 0
  const merged = [
    ...base.map(r => {
      const key = normalizeTitle(r.title)
      if (!r.videoId && !processedKeys.has(key)) {
        const vid = matchToVideo(r.title, videos)
        if (vid) {
          autoMatched++
          return { ...r, videoId: vid }
        }
      }
      return r
    }),
    ...additions,
  ]

  return { merged, autoMatched, newCount, updatedCount }
}

function matchToVideo(title: string, videos: Video[]): string | undefined {
  const nt = normalizeTitle(title)
  if (!nt) return undefined
  // 精确匹配
  for (const v of videos) {
    if (normalizeTitle(v.title) === nt) return v.id
  }
  // 包含匹配（至少6个字符的共同子串）
  if (nt.length >= 6) {
    for (const v of videos) {
      const vt = normalizeTitle(v.title)
      if (vt.length >= 6 && (vt.includes(nt) || nt.includes(vt))) return v.id
    }
  }
  return undefined
}
