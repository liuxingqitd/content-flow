import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ResponsiveContainer, BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts'
import { useAppStore } from '@/store/appStore'
import { PageContainer } from '@/components/layout/PageContainer'
import { StatusBadge } from '@/components/StatusBadge'
import { Select } from '@/components/ui/Select'
import type { VideoStatus } from '@/types'
import { VIDEO_STATUS_LABELS, VIDEO_STATUS_ORDER } from '@/types'
import { fromNow, formatDate } from '@/utils/date'
import {
  buildDashboardCommercialTrend,
  buildDashboardPublishTrend,
} from './dashboardTrends'
import { buildCommercialOverview } from './dashboardCommercial'
import { isVideoInLibrary } from '@/pages/Videos/videoWorkflow'
import {
  canSelectNextDashboardPeriod,
  formatDashboardPeriodLabel,
  getFirstPublishedAt,
  isDateInDashboardPeriod,
  parseDashboardDate,
  shiftDashboardPeriod,
  type DashboardPeriod,
} from './dashboardPeriod'

const currencyFormatter = new Intl.NumberFormat('zh-CN', {
  style: 'currency',
  currency: 'CNY',
  maximumFractionDigits: 0,
})

const compactCurrencyFormatter = new Intl.NumberFormat('zh-CN', {
  notation: 'compact',
  maximumFractionDigits: 1,
})

const formatTrendRange = (rangeStart: string, rangeEnd: string) =>
  rangeStart === rangeEnd ? rangeStart : `${rangeStart} 至 ${rangeEnd}`

export function Dashboard() {
  const navigate = useNavigate()
  const [dashboardPeriod, setDashboardPeriod] = useState<DashboardPeriod>('month')
  const videos = useAppStore(s => s.data?.videos ?? [])
  const topics = useAppStore(s => s.data?.topics ?? [])
  const scripts = useAppStore(s => s.data?.scripts ?? [])
  const tags = useAppStore(s => s.data?.tags ?? [])
  const hidePromotionCost = useAppStore(s => s.data?.settings.hidePromotionCost ?? false)
  const hideCommercialAmount = useAppStore(s => s.data?.settings.hideCommercialAmount ?? false)
  const [now, setNow] = useState(() => new Date())
  const [selectedDate, setSelectedDate] = useState(() => new Date())

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 60_000)
    return () => window.clearInterval(interval)
  }, [])

  const tooltipStyle = {
    background: 'var(--bg-overlay)',
    border: '1px solid var(--border-default)',
    borderRadius: '8px',
    color: 'var(--text-primary)',
    fontSize: '12px',
  }

  const periodLabel = formatDashboardPeriodLabel(dashboardPeriod, selectedDate)

  const availableYears = useMemo(() => {
    const years = [now.getFullYear()]
    const collect = (value?: string) => {
      const date = parseDashboardDate(value)
      if (date) years.push(date.getFullYear())
    }
    videos.forEach(video => {
      collect(video.createdAt)
      video.platforms.forEach(platform => collect(platform.publishedAt))
      video.promotionRecords?.forEach(record => collect(record.spentAt))
    })
    topics.forEach(topic => collect(topic.createdAt))
    scripts.forEach(script => collect(script.createdAt))
    const firstYear = Math.min(...years)
    return Array.from({ length: now.getFullYear() - firstYear + 1 }, (_, index) => now.getFullYear() - index)
  }, [now, scripts, topics, videos])

  const periodVideos = useMemo(
    () => videos.filter(video => isDateInDashboardPeriod(video.createdAt, dashboardPeriod, selectedDate, now)),
    [videos, dashboardPeriod, selectedDate, now],
  )

  const inProgress = useMemo(() =>
    periodVideos.filter(v => v.status === 'filming' || v.status === 'editing'),
    [periodVideos]
  )

  const statusCounts = useMemo(() => {
    const counts: Record<VideoStatus, number> = {} as Record<VideoStatus, number>
    for (const s of VIDEO_STATUS_ORDER) {
      counts[s] = periodVideos.filter(v => v.status === s).length
    }
    return counts
  }, [periodVideos])

  const periodPublishedVideos = useMemo(() => videos.filter(video => {
    const firstPublishedAt = getFirstPublishedAt(video.platforms)
    return firstPublishedAt
      ? isDateInDashboardPeriod(firstPublishedAt, dashboardPeriod, selectedDate, now)
      : false
  }), [videos, dashboardPeriod, selectedDate, now])

  const periodPromotionCost = videos.reduce((total, video) => {
    return total + (video.promotionRecords ?? []).reduce((sum, record) => {
      return isDateInDashboardPeriod(record.spentAt, dashboardPeriod, selectedDate, now)
        ? sum + record.amount
        : sum
    }, 0)
  }, 0)

  const libraryVideos = useMemo(() => videos.filter(isVideoInLibrary), [videos])
  const periodCommercialVideos = useMemo(() => libraryVideos.filter(video => {
    const commercialDate = getFirstPublishedAt(video.platforms) ?? parseDashboardDate(video.createdAt)
    return isDateInDashboardPeriod(commercialDate, dashboardPeriod, selectedDate, now)
  }), [libraryVideos, dashboardPeriod, selectedDate, now])
  const commercialTrend = useMemo(
    () => buildDashboardCommercialTrend(libraryVideos, dashboardPeriod, selectedDate, now),
    [libraryVideos, dashboardPeriod, selectedDate, now],
  )
  const commercialOverview = useMemo(
    () => buildCommercialOverview(periodCommercialVideos),
    [periodCommercialVideos],
  )

  const formattedPromotionCost = currencyFormatter.format(periodPromotionCost)

  const pendingTopics = topics.filter(topic =>
    (topic.status === 'inspiration' || topic.status === 'adopted')
    && isDateInDashboardPeriod(topic.createdAt, dashboardPeriod, selectedDate, now)
  )
  const periodScripts = scripts.filter(script =>
    isDateInDashboardPeriod(script.createdAt, dashboardPeriod, selectedDate, now)
  )

  const tagDistribution = useMemo(() => {
    const countMap: Record<string, { name: string; color: string; count: number }> = {}
    periodVideos.forEach(v => {
      v.tagIds.forEach(tid => {
        const tag = tags.find(t => t.id === tid)
        if (tag) {
          if (!countMap[tid]) countMap[tid] = { name: tag.name, color: tag.color, count: 0 }
          countMap[tid].count++
        }
      })
    })
    return Object.values(countMap).sort((a, b) => b.count - a.count)
  }, [periodVideos, tags])

  const publishTrend = useMemo(
    () => buildDashboardPublishTrend(videos, dashboardPeriod, selectedDate, now),
    [videos, dashboardPeriod, selectedDate, now],
  )

  const pipelineColors: Record<string, string> = {
    topic: 'var(--status-topic, var(--status-topic-text))',
    scripting: 'var(--status-scripting, var(--status-scripting-text))',
    review: 'var(--status-review, var(--status-review-text))',
    filming: 'var(--status-filming, var(--status-filming-text))',
    editing: 'var(--status-editing, var(--status-editing-text))',
    pending_publish: 'var(--status-pending-publish, var(--status-pending-publish-text))',
    published: 'var(--status-published, var(--status-published-text))',
  }

  return (
    <PageContainer
      title="概览"
      subtitle={`${periodLabel} · 新建 ${periodVideos.length} 条视频 · 数据更新于 ${formatDate(now.toISOString())}`}
      actions={(
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <DashboardPeriodNavigator
            period={dashboardPeriod}
            selectedDate={selectedDate}
            actualNow={now}
            availableYears={availableYears}
            onChange={setSelectedDate}
          />
          <PeriodSelector value={dashboardPeriod} onChange={setDashboardPeriod} />
        </div>
      )}
    >
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
              {periodLabel}新建且进行中 · {inProgress.length} 条
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
        <div className="dashboard-summary">
          {[
            { label: '发布视频', value: periodPublishedVideos.length, sub: periodLabel, accent: true, path: '/videos' },
            { label: '新建视频', value: periodVideos.length, sub: periodLabel, accent: false, path: '/kanban' },
            ...(hidePromotionCost ? [] : [{ label: '投放成本', value: formattedPromotionCost, sub: periodLabel, accent: false, path: '/videos' }]),
            { label: '待处理选题', value: pendingTopics.length, sub: periodLabel, accent: false, path: '/topics' },
            { label: '逐字稿', value: periodScripts.length, sub: periodLabel, accent: false, path: '/scripts' },
          ].map(stat => (
            <button
              className="dashboard-summary-item"
              key={stat.label}
              onClick={() => navigate(stat.path)}
              style={{
                padding: '12px 14px',
                textAlign: 'left',
                cursor: 'pointer',
              }}
            >
              <p style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 5 }}>{stat.label}</p>
              <p style={{ fontSize: 24, fontWeight: 630, color: stat.accent ? 'var(--accent)' : 'var(--text-primary)', lineHeight: 1.1, letterSpacing: '-0.015em', fontVariantNumeric: 'tabular-nums' }}>{stat.value}</p>
              <p style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 4 }}>{stat.sub}</p>
            </button>
          ))}
        </div>

        {/* Pipeline */}
        <div style={{ borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)', padding: 14 }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 10 }}>{periodLabel}新建内容的当前管道</p>
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
            <p style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 12 }}>{periodLabel}新建视频的标签覆盖数量</p>
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
            <div style={{ marginBottom: 12 }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 2 }}>发布视频趋势</p>
              <p style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                {dashboardPeriod === 'year' ? '按月' : '按日'}展示{periodLabel}首次发布的视频数量
              </p>
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
                  labelFormatter={(_, payload) => payload[0]?.payload
                    ? formatTrendRange(payload[0].payload.rangeStart, payload[0].payload.rangeEnd)
                    : ''}
                  formatter={(v: unknown) => [`${v} 条`, '发布视频']}
                />
                <Area type="monotone" dataKey="count" name="发布视频" stroke="var(--accent)" strokeWidth={2} fill="url(#publishTrendFill)" activeDot={{ r: 4 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {!hideCommercialAmount && (
          <div style={{ borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)', padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 14 }}>
              <div>
                <p style={{ fontSize: 13, fontWeight: 650, color: 'var(--text-primary)', marginBottom: 2 }}>商单信息</p>
                <p style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{periodLabel}商单，按结算状态与结算方式分别统计</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'flex-end', gap: 8, flexShrink: 0 }}>
                <span style={{ fontSize: 20, fontWeight: 650, color: 'var(--text-primary)', lineHeight: 1.15 }}>{currencyFormatter.format(commercialOverview.totalAmount)}</span>
                <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{commercialOverview.commercialCount} 条</span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12, marginBottom: 18 }}>
              <CommercialBreakdownGroup
                title="结算状态"
                items={[
                  { label: '已结算', amount: commercialOverview.settlementAmounts.settled, count: commercialOverview.settlementCounts.settled, color: 'var(--success)' },
                  { label: '部分结算', amount: commercialOverview.settlementAmounts.partial, count: commercialOverview.settlementCounts.partial, color: 'var(--warning)' },
                  { label: '未结算', amount: commercialOverview.settlementAmounts.unsettled, count: commercialOverview.settlementCounts.unsettled, color: 'var(--text-tertiary)' },
                ]}
              />
              <CommercialBreakdownGroup
                title="结算方式"
                items={[
                  { label: '平台结算', amount: commercialOverview.paymentMethodAmounts.platform, count: commercialOverview.paymentMethodCounts.platform, color: 'var(--accent)' },
                  { label: '个人转账', amount: commercialOverview.paymentMethodAmounts.personal_transfer, count: commercialOverview.paymentMethodCounts.personal_transfer, color: 'var(--info)' },
                  { label: '对公付款', amount: commercialOverview.paymentMethodAmounts.corporate_payment, count: commercialOverview.paymentMethodCounts.corporate_payment, color: 'var(--success)' },
                ]}
              />
            </div>

            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 14 }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 2 }}>商单金额趋势</p>
              <p style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 12 }}>
                {dashboardPeriod === 'year' ? '按月' : '按日'}展示{periodLabel}商单，按视频首次发布时间归属
              </p>
            </div>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={commercialTrend} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
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
                  labelFormatter={(_, payload) => payload[0]?.payload
                    ? formatTrendRange(payload[0].payload.rangeStart, payload[0].payload.rangeEnd)
                    : ''}
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

function DashboardPeriodNavigator({
  period,
  selectedDate,
  actualNow,
  availableYears,
  onChange,
}: {
  period: DashboardPeriod
  selectedDate: Date
  actualNow: Date
  availableYears: number[]
  onChange: (date: Date) => void
}) {
  const selectedYear = selectedDate.getFullYear()
  const selectedMonth = selectedDate.getMonth()
  const earliestYear = Math.min(...availableYears)
  const previousDate = shiftDashboardPeriod(period, selectedDate, -1)
  const canSelectPrevious = previousDate.getFullYear() >= earliestYear
  const months = Array.from(
    { length: selectedYear === actualNow.getFullYear() ? actualNow.getMonth() + 1 : 12 },
    (_, index) => ({ value: String(index), label: `${index + 1}月` }),
  )
  const move = (amount: number) => onChange(shiftDashboardPeriod(period, selectedDate, amount))
  const changeYear = (year: number) => {
    const month = year === actualNow.getFullYear()
      ? Math.min(selectedMonth, actualNow.getMonth())
      : selectedMonth
    onChange(new Date(year, period === 'year' ? 0 : month, 1, 12))
  }

  const arrowStyle = {
    width: 28,
    height: 28,
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--border-subtle)',
    background: 'var(--bg-surface)',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    fontSize: 15,
  } as const

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }} aria-label="选择统计时间">
      <button
        type="button"
        aria-label="上一个周期"
        onClick={() => move(-1)}
        disabled={!canSelectPrevious}
        style={{ ...arrowStyle, opacity: canSelectPrevious ? 1 : 0.35, cursor: canSelectPrevious ? 'pointer' : 'not-allowed' }}
      >‹</button>
      {period === 'week' ? (
        <span style={{ minWidth: 150, textAlign: 'center', fontSize: 12, color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
          {formatDashboardPeriodLabel(period, selectedDate)}
        </span>
      ) : (
        <>
          <Select
            aria-label="年份"
            value={String(selectedYear)}
            onChange={event => changeYear(Number(event.target.value))}
            options={availableYears.map(year => ({ value: String(year), label: `${year}年` }))}
            style={{ width: 88, height: 28, fontSize: 12, padding: '0 8px' }}
          />
          {period === 'month' && (
            <Select
              aria-label="月份"
              value={String(Math.min(selectedMonth, months.length - 1))}
              onChange={event => onChange(new Date(selectedYear, Number(event.target.value), 1, 12))}
              options={months}
              style={{ width: 68, height: 28, fontSize: 12, padding: '0 8px' }}
            />
          )}
        </>
      )}
      <button
        type="button"
        aria-label="下一个周期"
        onClick={() => move(1)}
        disabled={!canSelectNextDashboardPeriod(period, selectedDate, actualNow)}
        style={{
          ...arrowStyle,
          opacity: canSelectNextDashboardPeriod(period, selectedDate, actualNow) ? 1 : 0.35,
          cursor: canSelectNextDashboardPeriod(period, selectedDate, actualNow) ? 'pointer' : 'not-allowed',
        }}
      >›</button>
    </div>
  )
}

function PeriodSelector({
  value,
  onChange,
}: {
  value: DashboardPeriod
  onChange: (period: DashboardPeriod) => void
}) {
  return (
    <div
      role="group"
      aria-label="概览统计周期"
      style={{
        display: 'flex',
        padding: 2,
        borderRadius: 'var(--radius-md)',
        background: 'var(--bg-raised)',
        border: '1px solid var(--border-subtle)',
      }}
    >
      {([
        ['week', '周'],
        ['month', '月'],
        ['year', '年'],
      ] as const).map(([period, label]) => {
        const active = value === period
        return (
          <button
            key={period}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(period)}
            style={{
              border: 'none',
              borderRadius: 'calc(var(--radius-md) - 2px)',
              background: active ? 'var(--bg-surface)' : 'transparent',
              color: active ? 'var(--text-primary)' : 'var(--text-tertiary)',
              boxShadow: active ? 'var(--shadow-xs)' : 'none',
              cursor: 'pointer',
              fontSize: 11,
              fontWeight: active ? 600 : 500,
              padding: '4px 12px',
            }}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}

function CommercialBreakdownGroup({
  title,
  items,
}: {
  title: string
  items: Array<{ label: string; amount: number; count: number; color: string }>
}) {
  return (
    <div style={{ borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', background: 'var(--bg-raised)', padding: 12 }}>
      <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 9 }}>{title}</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
        {items.map(item => (
          <div key={item.label} style={{ minWidth: 0 }}>
            <p style={{ fontSize: 10, color: 'var(--text-tertiary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.label}</p>
            <p style={{ display: 'flex', alignItems: 'baseline', gap: 5, marginTop: 3, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
              <span style={{ fontSize: 17, fontWeight: 650, color: item.color, lineHeight: 1.2 }}>{currencyFormatter.format(item.amount)}</span>
              <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>{item.count} 条</span>
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
