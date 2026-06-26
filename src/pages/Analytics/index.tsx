import { useState, useMemo } from 'react'
import { useAppStore } from '@/store/appStore'
import { PageContainer } from '@/components/layout/PageContainer'
import type { DouyinRawRecord, ShipinhaoRawRecord, XiaohongshuRawRecord } from '@/types'

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

function TextCell({ value, maxWidth = 240 }: { value: string; maxWidth?: number }) {
  return (
    <td style={{
      padding: '10px 16px', borderBottom: '1px solid var(--border-faint)',
      fontSize: 12, color: 'var(--text-primary)',
      maxWidth, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
    }} title={value}>
      {value}
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
              <TextCell value={row.title} />
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
              <TextCell value={row.description} />
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
              <TextCell value={row.title} />
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

// ===== 主页面 =====
export function Analytics() {
  const douyinRecords = useAppStore(s => s.data?.douyinRecords ?? [])
  const shipinhaoRecords = useAppStore(s => s.data?.shipinhaoRecords ?? [])
  const xiaohongshuRecords = useAppStore(s => s.data?.xiaohongshuRecords ?? [])
  const [platform, setPlatform] = useState<Platform>('douyin')

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
      </div>

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
