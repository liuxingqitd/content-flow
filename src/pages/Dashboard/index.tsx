import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ResponsiveContainer, BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts'
import { useAppStore } from '@/store/appStore'
import { PageContainer } from '@/components/layout/PageContainer'
import { StatusBadge } from '@/components/StatusBadge'
import type { VideoStatus } from '@/types'
import { VIDEO_STATUS_LABELS, VIDEO_STATUS_ORDER } from '@/types'
import { fromNow, formatDate } from '@/utils/date'
import {
  buildMonthlyCommercialTrend,
  buildPublishTrend,
  type PublishTrendGranularity,
} from './dashboardTrends'

const currencyFormatter = new Intl.NumberFormat('zh-CN', {
  style: 'currency',
  currency: 'CNY',
  maximumFractionDigits: 0,
})

const compactCurrencyFormatter = new Intl.NumberFormat('zh-CN', {
  notation: 'compact',
  maximumFractionDigits: 1,
})

export function Dashboard() {
  const navigate = useNavigate()
  const [publishTrendGranularity, setPublishTrendGranularity] = useState<PublishTrendGranularity>('week')
  const videos = useAppStore(s => s.data?.videos ?? [])
  const topics = useAppStore(s => s.data?.topics ?? [])
  const scripts = useAppStore(s => s.data?.scripts ?? [])
  const tags = useAppStore(s => s.data?.tags ?? [])
  const hidePromotionCost = useAppStore(s => s.data?.settings.hidePromotionCost ?? false)
  const hideCommercialAmount = useAppStore(s => s.data?.settings.hideCommercialAmount ?? false)

  const tooltipStyle = {
    background: 'var(--bg-overlay)',
    border: '1px solid var(--border-default)',
    borderRadius: '8px',
    color: 'var(--text-primary)',
    fontSize: '12px',
  }

  const inProgress = useMemo(() =>
    videos.filter(v => v.status === 'filming' || v.status === 'editing'),
    [videos]
  )

  const statusCounts = useMemo(() => {
    const counts: Record<VideoStatus, number> = {} as Record<VideoStatus, number>
    for (const s of VIDEO_STATUS_ORDER) {
      counts[s] = videos.filter(v => v.status === s).length
    }
    return counts
  }, [videos])

  const now = new Date()
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()
  const thisMonth = videos.filter(v => {
    const d = new Date(v.createdAt)
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear
  })

  const monthlyPromotionCost = videos.reduce((total, video) => {
    return total + (video.promotionRecords ?? []).reduce((sum, record) => {
      const date = new Date(record.spentAt)
      if (date.getMonth() !== currentMonth || date.getFullYear() !== currentYear) {
        return sum
      }
      return sum + record.amount
    }, 0)
  }, 0)

  const monthlyCommercialTrend = buildMonthlyCommercialTrend(videos, now)
  const currentCommercialAmounts = monthlyCommercialTrend[monthlyCommercialTrend.length - 1]
  const monthlySettledCommercialAmount = currentCommercialAmounts?.settledAmount ?? 0
  const monthlyUnsettledCommercialAmount = currentCommercialAmounts?.unsettledAmount ?? 0

  const formattedMonthlyPromotionCost = currencyFormatter.format(monthlyPromotionCost)
  const formattedMonthlySettledCommercialAmount = currencyFormatter.format(monthlySettledCommercialAmount)
  const formattedMonthlyUnsettledCommercialAmount = currencyFormatter.format(monthlyUnsettledCommercialAmount)

  const pendingTopics = topics.filter(t => t.status === 'inspiration' || t.status === 'adopted')

  const tagDistribution = useMemo(() => {
    const countMap: Record<string, { name: string; color: string; count: number }> = {}
    videos.forEach(v => {
      v.tagIds.forEach(tid => {
        const tag = tags.find(t => t.id === tid)
        if (tag) {
          if (!countMap[tid]) countMap[tid] = { name: tag.name, color: tag.color, count: 0 }
          countMap[tid].count++
        }
      })
    })
    return Object.values(countMap).sort((a, b) => b.count - a.count)
  }, [videos, tags])

  const publishTrend = useMemo(
    () => buildPublishTrend(videos, publishTrendGranularity),
    [videos, publishTrendGranularity],
  )

  const pipelineColors: Record<string, string> = {
    topic: 'var(--status-topic, var(--status-topic-text))',
    scripting: 'var(--status-scripting, var(--status-scripting-text))',
    review: 'var(--status-review, var(--status-review-text))',
    filming: 'var(--status-filming, var(--status-filming-text))',
    editing: 'var(--status-editing, var(--status-editing-text))',
    published: 'var(--status-published, var(--status-published-text))',
  }

  return (
    <PageContainer title="概览" subtitle={`${formatDate(new Date().toISOString())} · ${videos.length} 条视频`}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* In-progress banner */}
        {inProgress.length > 0 && (
          <div style={{
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-focus, var(--accent-light))',
            background: 'var(--accent-subtle)',
            padding: 12,
          }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent)', marginBottom: 8, letterSpacing: '0.02em' }}>
              进行中 · {inProgress.length} 条
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {inProgress.map(v => (
                <div
                  key={v.id}
                  onClick={() => navigate(`/videos/${v.id}`)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    cursor: 'pointer', padding: '5px 8px', margin: '0 -8px',
                    borderRadius: 'var(--radius-sm)',
                    transition: 'background .1s',
                  }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                >
                  <StatusBadge status={v.status} />
                  <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.title}</p>
                  <span style={{ fontSize: 11, color: 'var(--text-tertiary)', flexShrink: 0 }}>{fromNow(v.updatedAt)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Stats grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(148px, 1fr))', gap: 8 }}>
          {[
            { label: '已发布', value: statusCounts.published, sub: '条视频', accent: true, path: '/videos' },
            { label: '本月新建', value: thisMonth.length, sub: '条视频', accent: false, path: '/kanban' },
            ...(hidePromotionCost ? [] : [{ label: '本月投放成本' as const, value: formattedMonthlyPromotionCost, sub: '平台投放', accent: false, path: '/videos' }]),
            ...(hideCommercialAmount ? [] : [
              { label: '本月已结算商单' as const, value: formattedMonthlySettledCommercialAmount, sub: '已结算收入', accent: false, path: '/videos' },
              { label: '本月未结算商单' as const, value: formattedMonthlyUnsettledCommercialAmount, sub: '待结算收入', accent: false, path: '/videos' },
            ]),
            { label: '待处理选题', value: pendingTopics.length, sub: '个想法', accent: false, path: '/topics' },
            { label: '逐字稿', value: scripts.length, sub: '篇稿件', accent: false, path: '/scripts' },
          ].map(stat => (
            <button
              key={stat.label}
              onClick={() => navigate(stat.path)}
              style={{
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border-subtle)',
                background: 'var(--bg-surface)',
                padding: '12px 14px',
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'border-color .12s, box-shadow .12s',
              }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLElement
                el.style.borderColor = 'var(--border-default)'
                el.style.boxShadow = 'var(--shadow-xs)'
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLElement
                el.style.borderColor = 'var(--border-subtle)'
                el.style.boxShadow = 'none'
              }}
            >
              <p style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 5 }}>{stat.label}</p>
              <p style={{ fontSize: 24, fontWeight: 650, color: stat.accent ? 'var(--accent)' : 'var(--text-primary)', lineHeight: 1.1, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>{stat.value}</p>
              <p style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 4 }}>{stat.sub}</p>
            </button>
          ))}
        </div>

        {/* Pipeline */}
        <div style={{ borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)', padding: 14 }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 10 }}>内容管道</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
            {VIDEO_STATUS_ORDER.filter(s => s !== 'archived').map((s, i, arr) => {
              const count = statusCounts[s]
              const barWidth = Math.max(count > 0 ? (count / Math.max(...Object.values(statusCounts).filter(Boolean), 1)) * 100 : 8, 8)
              return (
                <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <button
                    onClick={() => navigate('/kanban')}
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
                      padding: '7px 10px', borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-subtle)',
                      background: 'var(--bg-raised, var(--bg-elevated))',
                      cursor: 'pointer', minWidth: 64,
                      transition: 'border-color .12s',
                    }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-default)'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-subtle)'}
                  >
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500 }}>{VIDEO_STATUS_LABELS[s]}</span>
                    <span style={{ fontSize: 16, fontWeight: 650, color: pipelineColors[s], lineHeight: 1, marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>{count}</span>
                    <div style={{
                      height: 2, borderRadius: 99, marginTop: 4,
                      background: pipelineColors[s], opacity: 0.5,
                      width: `${barWidth}%`, minWidth: 16, maxWidth: '100%',
                      transition: 'width .3s ease',
                    }} />
                  </button>
                  {i < arr.length - 1 && (
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M3 3l3 3-3 3" stroke="var(--text-tertiary)" strokeWidth="1.2" strokeLinecap="round"/>
                    </svg>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 12 }}>
          {/* Tag distribution chart */}
          <div style={{ borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)', padding: 16 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 2 }}>内容标签构成</p>
            <p style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 12 }}>各标签覆盖的视频数量，帮助判断内容方向</p>
            {tagDistribution.length === 0 ? (
              <p style={{ fontSize: 12, color: 'var(--text-tertiary)', padding: '8px 0' }}>暂无标签数据</p>
            ) : (
              <ResponsiveContainer width="100%" height={Math.max(80, tagDistribution.length * 36)}>
                <BarChart data={tagDistribution} layout="vertical" margin={{ top: 0, right: 16, left: 4, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} width={72} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: unknown) => [`${v} 条`, '视频数']} />
                  <Bar dataKey="count" name="视频数" radius={[0, 4, 4, 0]}>
                    {tagDistribution.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Publishing trend */}
          <div style={{ borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)', padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
              <div>
                <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 2 }}>发布视频趋势</p>
                <p style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                  最近 12 {publishTrendGranularity === 'week' ? '周' : '个月'}首次发布的视频数量
                </p>
              </div>
              <div style={{ display: 'flex', padding: 2, borderRadius: 'var(--radius-md)', background: 'var(--bg-raised)', border: '1px solid var(--border-subtle)', flexShrink: 0 }}>
                {([
                  ['week', '按周'],
                  ['month', '按月'],
                ] as const).map(([granularity, label]) => {
                  const active = publishTrendGranularity === granularity
                  return (
                    <button
                      key={granularity}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setPublishTrendGranularity(granularity)}
                      style={{
                        border: 'none',
                        borderRadius: 'calc(var(--radius-md) - 2px)',
                        background: active ? 'var(--bg-surface)' : 'transparent',
                        color: active ? 'var(--text-primary)' : 'var(--text-tertiary)',
                        boxShadow: active ? 'var(--shadow-xs)' : 'none',
                        cursor: 'pointer',
                        fontSize: 11,
                        fontWeight: active ? 600 : 500,
                        padding: '4px 9px',
                      }}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={publishTrend} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="publishTrendFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="var(--accent)" stopOpacity={0.03} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }} allowDecimals={false} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  labelFormatter={(_, payload) => payload[0]?.payload ? `${payload[0].payload.rangeStart} 至 ${payload[0].payload.rangeEnd}` : ''}
                  formatter={(v: unknown) => [`${v} 条`, '发布视频']}
                />
                <Area type="monotone" dataKey="count" name="发布视频" stroke="var(--accent)" strokeWidth={2} fill="url(#publishTrendFill)" activeDot={{ r: 4 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {!hideCommercialAmount && (
          <div style={{ borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)', padding: 16 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 2 }}>月度商单金额趋势</p>
            <p style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 12 }}>最近 12 个月按视频首次发布时间归属，并按结算状态分别统计</p>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={monthlyCommercialTrend} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
                <defs>
                  <linearGradient id="commercialTrendFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--success)" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="var(--success)" stopOpacity={0.03} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }} tickLine={false} axisLine={false} />
                <YAxis
                  tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }}
                  tickFormatter={(value: number) => `¥${compactCurrencyFormatter.format(value)}`}
                  tickLine={false}
                  axisLine={false}
                  width={56}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  labelFormatter={(_, payload) => payload[0]?.payload ? payload[0].payload.key : ''}
                  formatter={(value: unknown, name: unknown) => [currencyFormatter.format(Number(value)), String(name)]}
                />
                <Area type="monotone" dataKey="settledAmount" name="已结算" stroke="var(--success)" strokeWidth={2} fill="url(#commercialTrendFill)" activeDot={{ r: 4 }} />
                <Area type="monotone" dataKey="unsettledAmount" name="未结算" stroke="var(--warning)" strokeWidth={2} fillOpacity={0} activeDot={{ r: 4 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </PageContainer>
  )
}
