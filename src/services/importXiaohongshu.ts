import * as XLSX from 'xlsx'
import type { XiaohongshuRawRecord, Video } from '@/types'
import { genId } from '@/utils/id'
import { now } from '@/utils/date'

function normalizeTitle(t: string): string {
  return t
    .replace(/[\p{Emoji_Presentation}\p{Emoji}‍]+/gu, '')
    .replace(/[^\w一-鿿]+/g, '')
    .toLowerCase()
    .trim()
}

/**
 * 解析 "2026年06月25日19时09分07秒" → ISO 8601 字符串
 */
function parsePublishedAt(raw: string): string {
  const m = raw.match(/(\d{4})年(\d{2})月(\d{2})日(\d{2})时(\d{2})分(\d{2})秒/)
  if (!m) return now()
  const [, y, mo, d, h, mi, s] = m
  return `${y}-${mo}-${d}T${h}:${mi}:${s}.000Z`
}

function parseNumber(raw: unknown): number {
  if (typeof raw === 'number') return raw
  if (typeof raw === 'string') {
    const n = parseFloat(raw.trim())
    return Number.isNaN(n) ? 0 : n
  }
  return 0
}

/**
 * 从小红书后台导出的 Excel 文件中解析笔记数据
 */
export function parseXiaohongshuExcel(file: File): Promise<XiaohongshuRawRecord[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })
        const sheetName = workbook.SheetNames[0]
        const sheet = workbook.Sheets[sheetName]
        const rows = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1 })

        // 找到表头行（包含"笔记标题"的行）
        const headerIndex = rows.findIndex(
          (row) => row.some((cell) => String(cell).includes('笔记标题')),
        )
        if (headerIndex === -1) {
          reject(new Error('未找到表头行，请确认文件格式为小红书后台导出格式'))
          return
        }

        const headers = rows[headerIndex].map((h) => String(h ?? '').trim())
        const titleIdx = headers.findIndex((h) => h === '笔记标题')
        const publishedAtIdx = headers.findIndex((h) => h === '首次发布时间')
        const genreIdx = headers.findIndex((h) => h === '体裁')
        const impressionsIdx = headers.findIndex((h) => h === '曝光')
        const viewsIdx = headers.findIndex((h) => h === '观看量')
        const coverCtrIdx = headers.findIndex((h) => h === '封面点击率')
        const likesIdx = headers.findIndex((h) => h === '点赞')
        const commentsIdx = headers.findIndex((h) => h === '评论')
        const savesIdx = headers.findIndex((h) => h === '收藏')
        const followsIdx = headers.findIndex((h) => h === '涨粉')
        const sharesIdx = headers.findIndex((h) => h === '分享')
        const avgWatchDurationIdx = headers.findIndex((h) => h === '人均观看时长')
        const danmakuIdx = headers.findIndex((h) => h === '弹幕')

        if (titleIdx === -1) {
          reject(new Error('缺少"笔记标题"列，请确认文件格式'))
          return
        }

        const records: XiaohongshuRawRecord[] = []
        const createdAt = now()

        for (let i = headerIndex + 1; i < rows.length; i++) {
          const row = rows[i]
          const title = String(row[titleIdx] ?? '').trim()
          // 跳过空行或标题为空的行
          if (!title || title === 'None') continue

          records.push({
            id: genId('xhs'),
            title,
            publishedAt:
              publishedAtIdx !== -1
                ? parsePublishedAt(String(row[publishedAtIdx] ?? '').trim())
                : createdAt,
            genre: genreIdx !== -1 ? String(row[genreIdx] ?? '').trim() : '',
            impressions: impressionsIdx !== -1 ? parseNumber(row[impressionsIdx]) : 0,
            views: viewsIdx !== -1 ? parseNumber(row[viewsIdx]) : 0,
            coverCtr: coverCtrIdx !== -1 ? parseNumber(row[coverCtrIdx]) : 0,
            likes: likesIdx !== -1 ? parseNumber(row[likesIdx]) : 0,
            comments: commentsIdx !== -1 ? parseNumber(row[commentsIdx]) : 0,
            saves: savesIdx !== -1 ? parseNumber(row[savesIdx]) : 0,
            follows: followsIdx !== -1 ? parseNumber(row[followsIdx]) : 0,
            shares: sharesIdx !== -1 ? parseNumber(row[sharesIdx]) : 0,
            avgWatchDuration:
              avgWatchDurationIdx !== -1 ? parseNumber(row[avgWatchDurationIdx]) : 0,
            danmaku: danmakuIdx !== -1 ? parseNumber(row[danmakuIdx]) : 0,
            createdAt,
          })
        }

        if (records.length === 0) {
          reject(new Error('未找到有效的数据行'))
          return
        }

        resolve(records)
      } catch (err) {
        reject(err instanceof Error ? err : new Error('解析文件失败'))
      }
    }
    reader.onerror = () => reject(new Error('读取文件失败'))
    reader.readAsArrayBuffer(file)
  })
}

export function mergeXiaohongshuRecords(
  existing: readonly XiaohongshuRawRecord[],
  incoming: XiaohongshuRawRecord[],
  videos: Video[],
): { merged: XiaohongshuRawRecord[]; autoMatched: number; newCount: number; updatedCount: number } {
  const base = existing.map(r => ({ ...r }))
  const existingByKey = new Map<string, number>()
  for (let i = 0; i < base.length; i++) {
    existingByKey.set(normalizeTitle(base[i].title), i)
  }

  const processedKeys = new Set<string>()
  let newCount = 0
  let updatedCount = 0
  const additions: XiaohongshuRawRecord[] = []

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
