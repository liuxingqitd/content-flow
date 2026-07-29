import { useState, useMemo, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '@/store/appStore'
import { PageContainer } from '@/components/layout/PageContainer'
import type { DouyinRawRecord, ShipinhaoRawRecord, XiaohongshuRawRecord } from '@/types'
import { parseXiaohongshuExcel, mergeXiaohongshuRecords } from '@/services/importXiaohongshu'
import { parseDouyinJson, mergeDouyinRecords, type DouyinJsonRow } from '@/services/importDouyin'
import { parseShipinhaoJson, mergeShipinhaoRecords, type ShipinhaoJsonRow } from '@/services/importShipinhao'
import { now } from '@/utils/date'
import { genId } from '@/utils/id'

type Platform = 'douyin' | 'shipinhao' | 'xiaohongshu'

// ===== 排序工具 =====
type SortDir = 'asc' | 'desc'

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  return (
    <span style={{ marginLeft: 6, opacity: active ? 0.9 : 0.28, fontSize: 10 }}>
      {active ? (dir === 'asc' ? '↑' : '↓') : '↕'}
    </span>
  )
}

function useSortable<T>(data: T[], defaultKey: keyof T) {
  const [sortKey, setSortKey] = useState<keyof T>(defaultKey)
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  const toggle = (key: keyof T) => {
    if (sortKey === key) {
      setSortDir(d => d === 'desc' ? 'asc' : 'desc')
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  const sorted = useMemo(() => [...data].sort((a, b) => {
    const av = a[sortKey]
    const bv = b[sortKey]
    if (av === bv) return 0
    const cmp = typeof av === 'number' && typeof bv === 'number'
      ? av - bv
      : String(av).localeCompare(String(bv), 'zh')
    return sortDir === 'asc' ? cmp : -cmp
  }), [data, sortKey, sortDir])

  return { sorted, sortKey, sortDir, toggle }
}

// ===== 表头单元格 =====
function Th({
  label, sortKey, currentKey, dir, onSort, numeric = false,
}: {
  label: string
  sortKey: string
  currentKey: string
  dir: SortDir
  onSort: (k: string) => void
  numeric?: boolean
}) {
  const active = currentKey === sortKey
  return (
    <th
      onClick={() => onSort(sortKey)}
      style={{
        padding: '10px 16px',
        fontSize: 11, fontWeight: 600, letterSpacing: '0.04em',
        color: active ? 'var(--text-primary)' : 'var(--text-tertiary)',
        textAlign: numeric ? 'right' : 'left',
        cursor: 'pointer',
        userSelect: 'none',
        whiteSpace: 'nowrap',
        borderBottom: '1px solid var(--border-subtle)',
        background: 'var(--bg-surface)',
        position: 'sticky', top: 0, zIndex: 1,
        transition: 'color var(--duration-fast)',
      }}
    >
      {label}
      <SortIcon active={active} dir={dir} />
    </th>
  )
}

// ===== 数值单元格 =====
function NumCell({ value, format }: { value: number; format?: (v: number) => string }) {
  const display = format ? format(value) : value.toLocaleString()
  return (
    <td style={{
      padding: '10px 16px', borderBottom: '1px solid var(--border-faint)',
      fontSize: 12, fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums',
      color: 'var(--text-primary)', textAlign: 'right', whiteSpace: 'nowrap',
    }}>
      {display}
    </td>
  )
}

function TextCell({ value, maxWidth = 240, videoId }: { value: string; maxWidth?: number; videoId?: string }) {
  const navigate = useNavigate()
  return (
    <td style={{
      padding: '10px 16px', borderBottom: '1px solid var(--border-faint)',
      fontSize: 12, color: videoId ? 'var(--accent)' : 'var(--text-primary)',
      maxWidth, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
    }} title={value}>
      {videoId ? (
        <span
          onClick={() => navigate(`/videos/${videoId}`)}
          style={{
            cursor: 'pointer', color: 'var(--accent)',
            textDecoration: 'none',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.textDecoration = 'underline' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.textDecoration = 'none' }}
        >
          {value}
        </span>
      ) : value}
    </td>
  )
}

// ===== 抖音数据表格 =====
function DouyinTable({ records }: { records: DouyinRawRecord[] }) {
  const { sorted, sortKey, sortDir, toggle } = useSortable(records, 'plays')
  const deleteDouyinRecord = useAppStore(s => s.deleteDouyinRecord)

  const thProps = (key: string, label: string, numeric = false) => ({
    label, sortKey: key, currentKey: sortKey as string, dir: sortDir,
    onSort: toggle as (k: string) => void, numeric,
  })

  const pct = (v: number) => `${(v * 100).toFixed(1)}%`
  const sec = (v: number) => `${v.toFixed(1)}s`

  return (
    <div style={{ overflowX: 'auto', background: 'var(--bg-surface)' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'auto' }}>
        <thead>
          <tr>
            <Th {...thProps('title', '作品名称')} />
            <Th {...thProps('publishedAt', '发布时间')} />
            <Th {...thProps('genre', '体裁')} />
            <Th {...thProps('plays', '播放量', true)} />
            <Th {...thProps('completionRate', '完播率', true)} />
            <Th {...thProps('fiveSecRate', '5s完播率', true)} />
            <Th {...thProps('twoSecBounceRate', '2s跳出率', true)} />
            <Th {...thProps('avgPlayDuration', '均播时长', true)} />
            <Th {...thProps('likes', '点赞', true)} />
            <Th {...thProps('shares', '分享', true)} />
            <Th {...thProps('comments', '评论', true)} />
            <Th {...thProps('saves', '收藏', true)} />
            <Th {...thProps('profileVisits', '主页访问', true)} />
            <Th {...thProps('followerGain', '粉丝增量', true)} />
            <th style={{ padding: '10px 16px', width: 40, borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-surface)', position: 'sticky', top: 0, zIndex: 1 }} />
          </tr>
        </thead>
        <tbody>
          {sorted.map(row => (
            <tr
              key={row.id}
              style={{ background: 'var(--bg-surface)', transition: 'background var(--duration-fast)' }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg-surface)'}
            >
              <TextCell value={row.title} videoId={row.videoId} />
              <TextCell value={row.publishedAt.slice(0, 10)} maxWidth={100} />
              <TextCell value={row.genre} maxWidth={90} />
              <NumCell value={row.plays} />
              <NumCell value={row.completionRate} format={pct} />
              <NumCell value={row.fiveSecRate} format={pct} />
              <NumCell value={row.twoSecBounceRate} format={pct} />
              <NumCell value={row.avgPlayDuration} format={sec} />
              <NumCell value={row.likes} />
              <NumCell value={row.shares} />
              <NumCell value={row.comments} />
              <NumCell value={row.saves} />
              <NumCell value={row.profileVisits} />
              <NumCell value={row.followerGain} />
              <td style={{ padding: '4px 8px', borderBottom: '1px solid var(--border-faint)', textAlign: 'center' }}>
                <DeleteBtn onClick={() => deleteDouyinRecord(row.id)} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ===== 视频号数据表格 =====
function ShipinhaoTable({ records }: { records: ShipinhaoRawRecord[] }) {
  const { sorted, sortKey, sortDir, toggle } = useSortable(records, 'plays')
  const deleteShipinhaoRecord = useAppStore(s => s.deleteShipinhaoRecord)

  const thProps = (key: string, label: string, numeric = false) => ({
    label, sortKey: key, currentKey: sortKey as string, dir: sortDir,
    onSort: toggle as (k: string) => void, numeric,
  })

  const pct = (v: number) => `${(v * 100).toFixed(1)}%`

  return (
    <div style={{ overflowX: 'auto', background: 'var(--bg-surface)' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'auto' }}>
        <thead>
          <tr>
            <Th {...thProps('description', '视频描述')} />
            <Th {...thProps('publishedAt', '发布时间')} />
            <Th {...thProps('plays', '播放量', true)} />
            <Th {...thProps('completionRate', '完播率', true)} />
            <Th {...thProps('avgPlayDuration', '均播时长')} />
            <Th {...thProps('recommendations', '推荐', true)} />
            <Th {...thProps('likes', '喜欢', true)} />
            <Th {...thProps('comments', '评论', true)} />
            <Th {...thProps('shares', '分享', true)} />
            <Th {...thProps('follows', '关注', true)} />
            <Th {...thProps('forwardChat', '转发', true)} />
            <Th {...thProps('setRingtone', '设为铃声', true)} />
            <Th {...thProps('setStatus', '设为状态', true)} />
            <Th {...thProps('setMomentCover', '朋友圈封面', true)} />
            <th style={{ padding: '10px 16px', width: 40, borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-surface)', position: 'sticky', top: 0, zIndex: 1 }} />
          </tr>
        </thead>
        <tbody>
          {sorted.map(row => (
            <tr
              key={row.id}
              style={{ background: 'var(--bg-surface)', transition: 'background var(--duration-fast)' }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg-surface)'}
            >
              <TextCell value={row.description} videoId={row.videoId} />
              <TextCell value={row.publishedAt} maxWidth={100} />
              <NumCell value={row.plays} />
              <NumCell value={row.completionRate} format={pct} />
              <td style={{ padding: '10px 16px', borderBottom: '1px solid var(--border-faint)', fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{row.avgPlayDuration}</td>
              <NumCell value={row.recommendations} />
              <NumCell value={row.likes} />
              <NumCell value={row.comments} />
              <NumCell value={row.shares} />
              <NumCell value={row.follows} />
              <NumCell value={row.forwardChat} />
              <NumCell value={row.setRingtone} />
              <NumCell value={row.setStatus} />
              <NumCell value={row.setMomentCover} />
              <td style={{ padding: '4px 8px', borderBottom: '1px solid var(--border-faint)', textAlign: 'center' }}>
                <DeleteBtn onClick={() => deleteShipinhaoRecord(row.id)} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ===== 小红书数据表格 =====
function XiaohongshuTable({ records }: { records: XiaohongshuRawRecord[] }) {
  const { sorted, sortKey, sortDir, toggle } = useSortable(records, 'impressions')
  const deleteXiaohongshuRecord = useAppStore(s => s.deleteXiaohongshuRecord)

  const thProps = (key: string, label: string, numeric = false) => ({
    label, sortKey: key, currentKey: sortKey as string, dir: sortDir,
    onSort: toggle as (k: string) => void, numeric,
  })

  const pct = (v: number) => `${(v * 100).toFixed(1)}%`
  const sec = (v: number) => `${v.toFixed(0)}s`

  return (
    <div style={{ overflowX: 'auto', background: 'var(--bg-surface)' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'auto' }}>
        <thead>
          <tr>
            <Th {...thProps('title', '笔记标题')} />
            <Th {...thProps('publishedAt', '发布时间')} />
            <Th {...thProps('genre', '体裁')} />
            <Th {...thProps('impressions', '曝光', true)} />
            <Th {...thProps('views', '观看量', true)} />
            <Th {...thProps('coverCtr', '封面点击率', true)} />
            <Th {...thProps('avgWatchDuration', '人均观看时长', true)} />
            <Th {...thProps('likes', '点赞', true)} />
            <Th {...thProps('comments', '评论', true)} />
            <Th {...thProps('saves', '收藏', true)} />
            <Th {...thProps('shares', '分享', true)} />
            <Th {...thProps('follows', '涨粉', true)} />
            <Th {...thProps('danmaku', '弹幕', true)} />
            <th style={{ padding: '10px 16px', width: 40, borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-surface)', position: 'sticky', top: 0, zIndex: 1 }} />
          </tr>
        </thead>
        <tbody>
          {sorted.map(row => (
            <tr
              key={row.id}
              style={{ background: 'var(--bg-surface)', transition: 'background var(--duration-fast)' }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg-surface)'}
            >
              <TextCell value={row.title} videoId={row.videoId} />
              <TextCell value={row.publishedAt.slice(0, 10)} maxWidth={100} />
              <TextCell value={row.genre} maxWidth={60} />
              <NumCell value={row.impressions} />
              <NumCell value={row.views} />
              <NumCell value={row.coverCtr} format={pct} />
              <NumCell value={row.avgWatchDuration} format={sec} />
              <NumCell value={row.likes} />
              <NumCell value={row.comments} />
              <NumCell value={row.saves} />
              <NumCell value={row.shares} />
              <NumCell value={row.follows} />
              <NumCell value={row.danmaku} />
              <td style={{ padding: '4px 8px', borderBottom: '1px solid var(--border-faint)', textAlign: 'center' }}>
                <DeleteBtn onClick={() => deleteXiaohongshuRecord(row.id)} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ===== 进度提示 =====
function ImportToast({ msg, onClose }: { msg: string; onClose: () => void }) {
  return (
    <div style={{
      padding: '10px 16px', marginBottom: 16,
      borderRadius: 'var(--radius-md)',
      background: 'var(--success-subtle)',
      color: 'var(--success)',
      fontSize: 13,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    }}>
      <span>{msg}</span>
      <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--success)', cursor: 'pointer', fontSize: 11, padding: '2px 8px' }}>✕</button>
    </div>
  )
}

// ===== 主页面 =====
export function Analytics() {
  const douyinRecords = useAppStore(s => s.data?.douyinRecords ?? [])
  const shipinhaoRecords = useAppStore(s => s.data?.shipinhaoRecords ?? [])
  const xiaohongshuRecords = useAppStore(s => s.data?.xiaohongshuRecords ?? [])
  const videos = useAppStore(s => s.data?.videos ?? [])
  const setDouyinRecords = useAppStore(s => s.setDouyinRecords)
  const setShipinhaoRecords = useAppStore(s => s.setShipinhaoRecords)
  const setXiaohongshuRecords = useAppStore(s => s.setXiaohongshuRecords)
  const [platform, setPlatform] = useState<Platform>('douyin')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dyInputRef = useRef<HTMLInputElement>(null)
  const sphInputRef = useRef<HTMLInputElement>(null)
  const [importing, setImporting] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const [toastMsg, setToastMsg] = useState<string | null>(null)

  const handleImportXiaohongshu = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    setImportError(null)
    try {
      const incoming = await parseXiaohongshuExcel(file)
      const { merged, newCount, updatedCount } = mergeXiaohongshuRecords(xiaohongshuRecords, incoming, videos)
      setXiaohongshuRecords(merged)
      setToastMsg(`小红书: 新增 ${newCount}，更新 ${updatedCount}`)
      setPlatform('xiaohongshu')
    } catch (err) {
      setImportError(err instanceof Error ? err.message : '导入失败')
    } finally {
      setImporting(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleImportDouyin = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    setImportError(null)
    try {
      const text = await file.text()
      let rows: DouyinJsonRow[]
      if (file.name.endsWith('.json')) {
        rows = JSON.parse(text) as DouyinJsonRow[]
      } else if (file.name.endsWith('.csv')) {
        rows = parseCSV(text) as unknown as DouyinJsonRow[]
      } else {
        throw new Error('抖音导入支持 .json 或 .csv 格式，请先用 skill 中的 Python 脚本将 xlsx 转为 JSON')
      }
      const incoming = parseDouyinJson(rows)
      const { merged, newCount, updatedCount, autoMatched } = mergeDouyinRecords(douyinRecords, incoming, videos)
      setDouyinRecords(merged)
      setToastMsg(`抖音: 新增 ${newCount}，更新 ${updatedCount}，自动关联 ${autoMatched} 个视频`)
      setPlatform('douyin')
    } catch (err) {
      setImportError(err instanceof Error ? err.message : '导入失败')
    } finally {
      setImporting(false)
      if (dyInputRef.current) dyInputRef.current.value = ''
    }
  }

  const handleImportShipinhao = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    setImportError(null)
    try {
      const text = await file.text()
      let rows: ShipinhaoJsonRow[]
      if (file.name.endsWith('.json')) {
        rows = JSON.parse(text) as ShipinhaoJsonRow[]
      } else if (file.name.endsWith('.csv')) {
        rows = parseCSV(text) as unknown as ShipinhaoJsonRow[]
      } else {
        throw new Error('视频号导入支持 .json 或 .csv 格式')
      }
      const incoming = parseShipinhaoJson(rows)
      const { merged, newCount, updatedCount, autoMatched } = mergeShipinhaoRecords(shipinhaoRecords, incoming, videos)
      setShipinhaoRecords(merged)
      setToastMsg(`视频号: 新增 ${newCount}，更新 ${updatedCount}，自动关联 ${autoMatched} 个视频`)
      setPlatform('shipinhao')
    } catch (err) {
      setImportError(err instanceof Error ? err.message : '导入失败')
    } finally {
      setImporting(false)
      if (sphInputRef.current) sphInputRef.current.value = ''
    }
  }

  // 一键从 public/data/ 加载 JSON 文件导入
  const quickImportAll = useCallback(async () => {
    setImporting(true)
    setImportError(null)
    setToastMsg(null)
    try {
      const [dyRows, sphRows, xhsRows]: [DouyinJsonRow[], ShipinhaoJsonRow[], Record<string, string>[]] =
        await Promise.all([
          fetch('/data/douyin_import.json').then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() }),
          fetch('/data/shipinhao_import.json').then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() }),
          fetch('/data/xiaohongshu_import.json').then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() }),
        ])

      const msgs: string[] = []

      // 抖音
      const dyIncoming = parseDouyinJson(dyRows)
      const dyResult = mergeDouyinRecords(douyinRecords, dyIncoming, videos)
      setDouyinRecords(dyResult.merged)
      msgs.push(`抖音: +${dyResult.newCount} 更新${dyResult.updatedCount} 关联${dyResult.autoMatched}`)

      // 视频号
      const sphIncoming = parseShipinhaoJson(sphRows)
      const sphResult = mergeShipinhaoRecords(shipinhaoRecords, sphIncoming, videos)
      setShipinhaoRecords(sphResult.merged)
      msgs.push(`视频号: +${sphResult.newCount} 更新${sphResult.updatedCount} 关联${sphResult.autoMatched}`)

      // 小红书
      const createdAt = now()
      const xhsIncoming = xhsRows.map(r => ({
        id: genId('xhs'),
        title: r.title || '',
        publishedAt: parseXhsPublishedAt(r.publishedAt || '') || createdAt,
        genre: r.genre || '',
        impressions: parseFloatSafe(r.impressions),
        views: parseFloatSafe(r.views),
        coverCtr: parseFloatSafe(r.coverCtr),
        likes: parseFloatSafe(r.likes),
        comments: parseFloatSafe(r.comments),
        saves: parseFloatSafe(r.saves),
        follows: parseFloatSafe(r.follows),
        shares: parseFloatSafe(r.shares),
        avgWatchDuration: parseFloatSafe(r.avgWatchDuration),
        danmaku: parseFloatSafe(r.danmaku),
        createdAt,
      }))
      const xhsResult = mergeXiaohongshuRecords(xiaohongshuRecords, xhsIncoming, videos)
      setXiaohongshuRecords(xhsResult.merged)
      msgs.push(`小红书: +${xhsResult.newCount} 更新${xhsResult.updatedCount} 关联${xhsResult.autoMatched}`)

      setToastMsg(`导入完成！${msgs.join(' | ')}`)
    } catch (err) {
      setImportError(err instanceof Error ? err.message : '导入失败')
    } finally {
      setImporting(false)
    }
  }, [douyinRecords, shipinhaoRecords, xiaohongshuRecords, videos, setDouyinRecords, setShipinhaoRecords, setXiaohongshuRecords])

  const tabs: { id: Platform; label: string; count: number }[] = [
    { id: 'douyin', label: '抖音', count: douyinRecords.length },
    { id: 'shipinhao', label: '视频号', count: shipinhaoRecords.length },
    { id: 'xiaohongshu', label: '小红书', count: xiaohongshuRecords.length },
  ]

  const totalRecords = douyinRecords.length + shipinhaoRecords.length + xiaohongshuRecords.length

  return (
    <PageContainer title="数据分析" subtitle={`${totalRecords} 条记录`}>
      {/* Platform Tabs */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 4,
        margin: '-24px -24px 24px', padding: '0 24px',
        borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-surface)',
      }}>
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setPlatform(t.id)}
            style={{
              padding: '11px 14px 10px', fontSize: 13, fontWeight: platform === t.id ? 550 : 450, cursor: 'pointer',
              border: 'none', background: 'transparent',
              borderBottom: `2px solid ${platform === t.id ? 'var(--accent)' : 'transparent'}`,
              color: platform === t.id ? 'var(--text-primary)' : 'var(--text-secondary)',
              marginBottom: -1, transition: 'color var(--duration-fast)', display: 'flex', alignItems: 'center', gap: 7,
            }}
          >
            {t.label}
            <span style={{
              fontSize: 11, fontWeight: 600,
              minWidth: 20, padding: '1px 6px', borderRadius: 99,
              background: platform === t.id ? 'var(--accent-subtle)' : 'var(--bg-raised)',
              color: platform === t.id ? 'var(--accent)' : 'var(--text-tertiary)',
            }}>
              {t.count}
            </span>
          </button>
        ))}
        {/* Import buttons */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* 一键导入 */}
          <button
            onClick={quickImportAll}
            disabled={importing}
            style={{
              padding: '6px 14px', fontSize: 12, fontWeight: 600,
              border: '1px solid var(--accent)',
              borderRadius: 'var(--radius-md)',
              background: 'var(--accent-subtle)',
              color: 'var(--accent)',
              cursor: importing ? 'not-allowed' : 'pointer',
              opacity: importing ? 0.6 : 1,
              display: 'flex', alignItems: 'center', gap: 6,
              transition: 'all var(--duration-fast)',
            }}
          >
            {importing ? '导入中…' : '一键导入'}
          </button>
          {/* 抖音导入 */}
          {platform === 'douyin' && (
            <>
              <input ref={dyInputRef} type="file" accept=".json,.csv" onChange={handleImportDouyin} style={{ display: 'none' }} />
              <ImportBtn importing={importing} onClick={() => dyInputRef.current?.click()} label="导入JSON/CSV" />
            </>
          )}
          {/* 视频号导入 */}
          {platform === 'shipinhao' && (
            <>
              <input ref={sphInputRef} type="file" accept=".json,.csv" onChange={handleImportShipinhao} style={{ display: 'none' }} />
              <ImportBtn importing={importing} onClick={() => sphInputRef.current?.click()} label="导入JSON/CSV" />
            </>
          )}
          {/* 小红书导入 */}
          {platform === 'xiaohongshu' && (
            <>
              <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleImportXiaohongshu} style={{ display: 'none' }} />
              <ImportBtn importing={importing} onClick={() => fileInputRef.current?.click()} label="导入Excel" />
            </>
          )}
        </div>
      </div>

      {/* Toast message */}
      {toastMsg && <ImportToast msg={toastMsg} onClose={() => setToastMsg(null)} />}

      {/* Import error */}
      {importError && (
        <div style={{
          padding: '10px 16px', marginTop: -12, marginBottom: 16,
          borderRadius: 'var(--radius-md)',
          background: 'var(--danger-subtle)',
          color: 'var(--danger)',
          fontSize: 13,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span>{importError}</span>
          <button
            onClick={() => setImportError(null)}
            style={{
              background: 'transparent', border: 'none',
              color: 'var(--danger)', cursor: 'pointer',
              fontSize: 11, padding: '2px 8px',
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Table */}
      <div style={{
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-subtle)',
        background: 'var(--bg-surface)',
        overflow: 'hidden',
      }}>
        {platform === 'douyin' && (
          douyinRecords.length === 0
            ? <EmptyHint platform="抖音" />
            : <DouyinTable records={douyinRecords} />
        )}
        {platform === 'shipinhao' && (
          shipinhaoRecords.length === 0
            ? <EmptyHint platform="视频号" />
            : <ShipinhaoTable records={shipinhaoRecords} />
        )}
        {platform === 'xiaohongshu' && (
          xiaohongshuRecords.length === 0
            ? <EmptyHint platform="小红书" />
            : <XiaohongshuTable records={xiaohongshuRecords} />
        )}
      </div>
    </PageContainer>
  )
}

function ImportBtn({ importing, onClick, label }: { importing: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      disabled={importing}
      style={{
        padding: '6px 14px', fontSize: 12, fontWeight: 500,
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-md)',
        background: 'var(--bg-raised)',
        color: 'var(--text-primary)',
        cursor: importing ? 'not-allowed' : 'pointer',
        opacity: importing ? 0.6 : 1,
        display: 'flex', alignItems: 'center', gap: 6,
        transition: 'all var(--duration-fast)',
      }}
    >
      {importing ? (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 0.8s linear infinite' }}>
          <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
          <path d="M12 2a10 10 0 0 1 10 10" />
        </svg>
      ) : (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
      )}
      {importing ? '导入中…' : label}
    </button>
  )
}

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split(/\r?\n/)
  if (lines.length < 2) return []
  const headers = lines[0].split(',').map(h => h.trim())
  const result: Record<string, string>[] = []
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim())
    const row: Record<string, string> = {}
    headers.forEach((h, j) => { row[h] = values[j] || '' })
    if (Object.values(row).some(v => v)) result.push(row)
  }
  return result
}

function parseFloatSafe(v: string | undefined): number {
  if (!v) return 0
  const n = parseFloat(v)
  return Number.isNaN(n) ? 0 : n
}

function parseXhsPublishedAt(raw: string): string {
  const m = raw.match(/(\d{4})年(\d{2})月(\d{2})日(\d{2})时(\d{2})分(\d{2})秒/)
  if (!m) return ''
  return `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}.000Z`
}

function DeleteBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title="删除此条记录"
      style={{
        width: 26, height: 26, borderRadius: 'var(--radius-sm)',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        border: 'none', background: 'transparent',
        color: 'var(--text-tertiary)', cursor: 'pointer',
        transition: 'all var(--duration-fast)',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.background = 'var(--danger-subtle)'
        ;(e.currentTarget as HTMLElement).style.color = 'var(--danger)'
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.background = 'transparent'
        ;(e.currentTarget as HTMLElement).style.color = 'var(--text-tertiary)'
      }}
    >
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 4h12"/>
        <path d="M5.333 4V2.667a1.333 1.333 0 0 1 1.334-1.334h2.666a1.333 1.333 0 0 1 1.334 1.334V4"/>
        <path d="M3.333 4v9.333A1.333 1.333 0 0 0 4.667 14.667h6.666a1.333 1.333 0 0 0 1.334-1.334V4"/>
      </svg>
    </button>
  )
}

function EmptyHint({ platform }: { platform: string }) {
  return (
    <div style={{ padding: '64px 24px', textAlign: 'center', background: 'var(--bg-surface)' }}>
      <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>暂无{platform}数据</p>
      <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 6 }}>从平台后台导出数据后录入</p>
    </div>
  )
}
