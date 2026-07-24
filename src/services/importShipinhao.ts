import type { ShipinhaoRawRecord, Video } from '@/types'
import { genId } from '@/utils/id'
import { now } from '@/utils/date'

function parseNumber(raw: string): number {
  const n = parseFloat(raw.trim())
  return Number.isNaN(n) ? 0 : n
}

function parseCompletionRate(raw: string): number {
  // "7.14%" → 0.0714
  const cleaned = raw.replace('%', '').trim()
  const n = parseFloat(cleaned)
  return Number.isNaN(n) ? 0 : n / 100
}

function parsePublishedAt(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) return now()
  // "2026/07/24" → ISO 8601
  const m = trimmed.match(/^(\d{4})\/(\d{2})\/(\d{2})$/)
  if (m) return `${m[1]}-${m[2]}-${m[3]}T00:00:00.000Z`
  return now()
}

interface ShipinhaoJsonRow {
  description: string
  videoId: string
  publishedAt: string
  completionRate: string
  avgPlayDuration: string
  plays: string
  recommendations: string
  likes: string
  comments: string
  shares: string
  follows: string
  forwardChat: string
  setRingtone: string
  setStatus: string
  setMomentCover: string
}

export function parseShipinhaoJson(rows: ShipinhaoJsonRow[]): ShipinhaoRawRecord[] {
  const createdAt = now()
  return rows.map((row) => ({
    id: genId('sph'),
    description: row.description,
    videoId: row.videoId, // 平台原生视频ID
    publishedAt: parsePublishedAt(row.publishedAt),
    completionRate: parseCompletionRate(row.completionRate),
    avgPlayDuration: row.avgPlayDuration.trim(),
    plays: parseNumber(row.plays),
    recommendations: parseNumber(row.recommendations),
    likes: parseNumber(row.likes),
    comments: parseNumber(row.comments),
    shares: parseNumber(row.shares),
    follows: parseNumber(row.follows),
    forwardChat: parseNumber(row.forwardChat),
    setRingtone: parseNumber(row.setRingtone),
    setStatus: parseNumber(row.setStatus),
    setMomentCover: parseNumber(row.setMomentCover),
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

export function mergeShipinhaoRecords(
  existing: ShipinhaoRawRecord[],
  incoming: ShipinhaoRawRecord[],
  videos: Video[],
): { merged: ShipinhaoRawRecord[]; autoMatched: number; newCount: number; updatedCount: number } {
  const result = [...existing]
  const existingByDesc = new Map<string, ShipinhaoRawRecord>()
  const existingByPlatformId = new Map<string, ShipinhaoRawRecord>()
  for (const r of existing) {
    existingByDesc.set(normalizeTitle(r.description), r)
    if (r.videoId) existingByPlatformId.set(r.videoId, r)
  }

  let newCount = 0
  let updatedCount = 0

  for (const rec of incoming) {
    // 视频号优先按平台原生 videoId 匹配
    const platformIdMatch = rec.videoId ? existingByPlatformId.get(rec.videoId) : undefined
    const descMatch = existingByDesc.get(normalizeTitle(rec.description))

    const match = platformIdMatch || descMatch
    if (match) {
      const savedId = match.id
      const savedCreatedAt = match.createdAt
      // 保留用户手动关联的视频库 videoId（平台原生 videoId 字段是另一回事）
      // 系统 videoId 关联字段也是同名 videoId，导入后用户可手动修改
      Object.assign(match, rec, { id: savedId, createdAt: savedCreatedAt, videoId: match.videoId || rec.videoId })
      updatedCount++
    } else {
      result.push(rec)
      newCount++
    }
  }

  // 尝试匹配视频库（对 videoId 为平台原生ID 的记录，不覆盖）
  let autoMatched = 0
  for (const r of result) {
    // 视频号的 videoId 是平台原生 ID，不应被覆盖为系统 videoId
    // 除非已有系统 videoId（格式如 'vid_xxx'）
    const hasSystemVideoId = r.videoId && r.videoId.startsWith('vid_')
    if (!hasSystemVideoId) {
      const systemId = matchToVideo(r.description, videos)
      if (systemId) {
        r.videoId = systemId
        autoMatched++
      }
    }
  }

  return { merged: result, autoMatched, newCount, updatedCount }
}

function matchToVideo(description: string, videos: Video[]): string | undefined {
  const nt = normalizeTitle(description)
  if (!nt) return undefined
  for (const v of videos) {
    if (normalizeTitle(v.title) === nt) return v.id
  }
  if (nt.length >= 6) {
    for (const v of videos) {
      const vt = normalizeTitle(v.title)
      if (vt.length >= 6 && (vt.includes(nt) || nt.includes(vt))) return v.id
    }
  }
  return undefined
}
