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

interface DouyinJsonRow {
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
  existing: DouyinRawRecord[],
  incoming: DouyinRawRecord[],
  videos: Video[],
): { merged: DouyinRawRecord[]; autoMatched: number; newCount: number; updatedCount: number } {
  const result = [...existing]
  const existingMap = new Map<string, DouyinRawRecord>()
  for (const r of existing) {
    existingMap.set(normalizeTitle(r.title), r)
  }

  let newCount = 0
  let updatedCount = 0

  for (const rec of incoming) {
    const key = normalizeTitle(rec.title)
    const match = existingMap.get(key)
    if (match) {
      // 更新数据指标，保留 id、createdAt、videoId
      const savedId = match.id
      const savedCreatedAt = match.createdAt
      const savedVideoId = match.videoId
      Object.assign(match, rec, { id: savedId, createdAt: savedCreatedAt, videoId: savedVideoId })
      updatedCount++
    } else {
      // 尝试匹配视频库
      const videoId = matchToVideo(rec.title, videos)
      if (videoId) rec.videoId = videoId
      result.push(rec)
      newCount++
    }
  }

  let autoMatched = 0
  for (const r of result) {
    if (!r.videoId) {
      const vid = matchToVideo(r.title, videos)
      if (vid) {
        r.videoId = vid
        autoMatched++
      }
    }
  }

  return { merged: result, autoMatched, newCount, updatedCount }
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
