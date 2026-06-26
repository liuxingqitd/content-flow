import { useState, useMemo, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '@/store/appStore'
import { readCoverImage } from '@/services/fileSystem'
import { PageContainer } from '@/components/layout/PageContainer'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { PlatformIcon } from '@/components/PlatformIcon'
import { EmptyState } from '@/components/ui/EmptyState'
import { Modal } from '@/components/ui/Modal'
import { Textarea } from '@/components/ui/Input'
import type { Platform, PlatformPublish, PlatformPublishStatus, VideoStatus } from '@/types'
import { VIDEO_STATUS_LABELS, SHOOTING_FORMAT_LABELS } from '@/types'

type PlatformFilter = 'violated' | 'skipped'
import { fromNow } from '@/utils/date'

const TABLE_COLUMNS = [
  { key: 'cover', width: 70 },
  { key: 'title', width: 220 },
  { key: 'tags', width: 112 },
  { key: 'shooting', width: 96 },
  { key: 'cost', width: 92 },
  { key: 'published', width: 108 },
  { key: 'violated', width: 94 },
  { key: 'skipped', width: 94 },
  { key: 'updated', width: 82 },
] as const

const PLATFORM_DISPLAY_ORDER: Platform[] = ['shipinhao', 'xiaohongshu', 'douyin']
const coverThumbCache = new Map<string, string>()

export function Videos() {
  const navigate = useNavigate()
  const videos = useAppStore(s => s.data?.videos ?? [])
  const tags = useAppStore(s => s.data?.tags ?? [])
  const hidePromotionCost = useAppStore(s => s.data?.settings.hidePromotionCost ?? false)
  const addVideo = useAppStore(s => s.addVideo)

  const displayVideos = useMemo(() => videos.filter(v => v.status === 'published' || v.status === 'archived'), [videos])

  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<VideoStatus | 'all'>('all')
  const [filterPlatform, setFilterPlatform] = useState<PlatformFilter | null>(null)
  const [newModal, setNewModal] = useState(false)
  const [newForm, setNewForm] = useState({ title: '', description: '' })

  const setVideoFilter = (s: VideoStatus | 'all') => { setFilterStatus(s); setFilterPlatform(null) }
  const setPlatformFilter = (f: PlatformFilter) => {
    setFilterPlatform(prev => prev === f ? null : f)
    setFilterStatus('all')
  }

  const violated = displayVideos.filter(v => v.platforms.some(p => (p.status ?? 'published') === 'violated'))
  const skipped = displayVideos.filter(v => v.platforms.some(p => (p.status ?? 'published') === 'skipped'))

  const filtered = useMemo(() => {
    let list = displayVideos
    if (filterPlatform) {
      list = list.filter(v => v.platforms.some(p => (p.status ?? 'published') === filterPlatform))
    } else if (filterStatus !== 'all') {
      list = list.filter(v => v.status === filterStatus)
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(v => v.title.toLowerCase().includes(q))
    }
    return [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }, [displayVideos, filterStatus, filterPlatform, search])

  const handleCreate = () => {
    if (!newForm.title.trim()) return
    addVideo({
      title: newForm.title.trim(),
      description: newForm.description.trim() || undefined,
      status: 'published',
      tagIds: [],
      platforms: [],
    })
    setNewModal(false)
    setNewForm({ title: '', description: '' })
  }

  return (
    <PageContainer
      title="视频库"
      subtitle={`${displayVideos.length} 条视频`}
      actions={
        <Button variant="primary" size="sm" onClick={() => setNewModal(true)}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          新建视频
        </Button>
      }
    >
      {/* Filters */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap',
        padding: 12, border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)',
        background: 'var(--bg-surface)',
      }}>
        <div style={{ width: 248, maxWidth: '100%' }}>
          <Input placeholder="搜索视频…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div style={{ width: 1, height: 24, background: 'var(--border-subtle)', flexShrink: 0 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap', flex: 1 }}>
          <FilterChip
            active={filterStatus === 'all' && !filterPlatform}
            onClick={() => setVideoFilter('all')}
            label={`全部 (${displayVideos.length})`}
          />
          {(['published', 'archived'] as const).map(s => {
            const count = displayVideos.filter(v => v.status === s).length
            if (count === 0) return null
            return (
              <FilterChip
                key={s}
                active={filterStatus === s && !filterPlatform}
                onClick={() => setVideoFilter(s === filterStatus && !filterPlatform ? 'all' : s)}
                label={`${VIDEO_STATUS_LABELS[s]} (${count})`}
              />
            )
          })}
          {violated.length > 0 && (
            <FilterChip
              active={filterPlatform === 'violated'}
              onClick={() => setPlatformFilter('violated')}
              label={`已违规 (${violated.length})`}
              color="var(--danger)"
              activeBg="rgba(248,113,113,0.14)"
            />
          )}
          {skipped.length > 0 && (
            <FilterChip
              active={filterPlatform === 'skipped'}
              onClick={() => setPlatformFilter('skipped')}
              label={`已跳过 (${skipped.length})`}
              color="var(--text-tertiary)"
              activeBg="rgba(148,150,161,0.14)"
            />
          )}
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <EmptyState
          title="暂无已发布的视频"
          description="看板中的视频发布后将显示在这里"
          action={<Button variant="primary" size="sm" onClick={() => setNewModal(true)}>新建视频</Button>}
        />
      ) : (
        <div style={{
          borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)',
          overflow: 'auto', maxWidth: '100%', background: 'var(--bg-surface)', boxShadow: 'var(--shadow-xs)',
        }}>
          <table style={{ width: '100%', minWidth: TABLE_COLUMNS.filter(c => !hidePromotionCost || c.key !== 'cost').reduce((sum, col) => sum + col.width, 0), tableLayout: 'fixed', borderCollapse: 'separate', borderSpacing: 0, fontSize: 13 }}>
            <colgroup>
              {TABLE_COLUMNS.map(col => (
                hidePromotionCost && col.key === 'cost' ? null : <col key={col.key} style={{ width: col.width }} />
              ))}
            </colgroup>
            <thead>
              <tr>
                <th style={{ width: 74, padding: '9px 8px 9px 16px', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)', position: 'sticky', top: 0, zIndex: 1 }} />
                {['标题', '标签', '拍摄形式', ...(hidePromotionCost ? [] : ['投放金额']), '已发布', '已违规', '已跳过', '更新'].map(h => (
                  <th key={h} style={{
                    textAlign: 'left', padding: '9px 16px', fontSize: 11, fontWeight: 600,
                    color: 'var(--text-tertiary)', letterSpacing: '0.04em',
                    borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)',
                    position: 'sticky', top: 0, zIndex: 1,
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((video, idx) => {
                const videoTags = tags.filter(t => video.tagIds.includes(t.id))
                return (
                  <tr
                    key={video.id}
                    onClick={() => navigate(`/videos/${video.id}`)}
                    style={{
                      borderBottom: idx < filtered.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                      cursor: 'pointer',
                      background: 'var(--bg-surface)',
                      transition: 'background .12s',
                    }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg-surface)'}
                  >
                    <td style={{ padding: '8px 8px 8px 16px', width: 74, borderBottom: idx < filtered.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
                      <CoverThumb key={`${video.id}:${video.coverPortrait ?? ''}:${video.updatedAt}`} videoId={video.id} ext={video.coverPortrait} updatedAt={video.updatedAt} />
                    </td>
                    <td style={{ padding: '10px 16px', minWidth: 0, borderBottom: idx < filtered.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
                      <p style={{ fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', letterSpacing: '-0.01em' }}>{video.title}</p>
                      {video.description && (
                        <p style={{ fontSize: 11, color: 'var(--text-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}>{video.description}</p>
                      )}
                    </td>
                    <td style={{ padding: '10px 16px', borderBottom: idx < filtered.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {videoTags.slice(0, 2).map(tag => (
                          <span
                            key={tag.id}
                            style={{ padding: '1px 7px', borderRadius: 99, fontSize: 10, fontWeight: 500, background: `${tag.color}22`, color: tag.color }}
                          >
                            {tag.name}
                          </span>
                        ))}
                        {videoTags.length > 2 && (
                          <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>+{videoTags.length - 2}</span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '10px 16px', fontSize: 12, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', borderBottom: idx < filtered.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
                      {video.shootingFormats && video.shootingFormats.length > 0
                        ? video.shootingFormats.map(f => SHOOTING_FORMAT_LABELS[f] ?? f).join('、')
                        : <span style={{ color: 'var(--text-tertiary)' }}>—</span>}
                    </td>
                    {!hidePromotionCost && (
                    <td style={{ padding: '10px 16px', fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums', borderBottom: idx < filtered.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
                      {(() => {
                        const total = video.platforms.reduce((sum, p) => sum + (p.promotionCost ?? 0), 0)
                        return total > 0 ? `¥${total.toLocaleString()}` : <span style={{ color: 'var(--text-tertiary)' }}>—</span>
                      })()}
                    </td>
                    )}
                    <td style={{ padding: '10px 16px', borderBottom: idx < filtered.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
                      <PlatformStatusIcons platforms={video.platforms} status="published" />
                    </td>
                    <td style={{ padding: '10px 16px', borderBottom: idx < filtered.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
                      <PlatformStatusIcons platforms={video.platforms} status="violated" />
                    </td>
                    <td style={{ padding: '10px 16px', borderBottom: idx < filtered.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
                      <PlatformStatusIcons platforms={video.platforms} status="skipped" />
                    </td>
                    <td style={{ padding: '10px 16px', fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums', borderBottom: idx < filtered.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
                      {fromNow(video.updatedAt)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={newModal}
        onClose={() => setNewModal(false)}
        title="新建视频"
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setNewModal(false)}>取消</Button>
            <Button variant="primary" onClick={handleCreate} disabled={!newForm.title.trim()}>创建</Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Input label="视频标题 *" placeholder="例：普通人如何在30岁前实现财务自由" value={newForm.title} onChange={e => setNewForm(f => ({ ...f, title: e.target.value }))} autoFocus />
          <Textarea label="简介（可选）" placeholder="视频的核心内容或角度" rows={3} value={newForm.description} onChange={e => setNewForm(f => ({ ...f, description: e.target.value }))} />
        </div>
      </Modal>
    </PageContainer>
  )
}

function PlatformStatusIcons({ platforms, status }: { platforms: PlatformPublish[]; status: PlatformPublishStatus }) {
  const orderedPlatforms = PLATFORM_DISPLAY_ORDER.filter(platform =>
    platforms.some(p => p.platform === platform && (p.status ?? 'published') === status)
  )

  if (orderedPlatforms.length === 0) {
    return <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>—</span>
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      {orderedPlatforms.map(platform => (
        <PlatformIcon key={platform} platform={platform} size={16} />
      ))}
    </div>
  )
}

function CoverThumb({ videoId, ext, updatedAt }: { videoId: string; ext?: string; updatedAt: string }) {
  const imageKey = ext ? `${videoId}:${ext}:${updatedAt}` : null
  const [image, setImage] = useState<{ key: string; url: string } | null>(() => {
    const cached = imageKey ? coverThumbCache.get(imageKey) : undefined
    return cached && imageKey ? { key: imageKey, url: cached } : null
  })
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ext || !imageKey || coverThumbCache.has(imageKey)) return
    let cancelled = false

    const loadImage = () => {
      readCoverImage(videoId, 'portrait', ext).then(u => {
        if (cancelled) {
          if (u) URL.revokeObjectURL(u)
          return
        }
        if (!u) return
        coverThumbCache.set(imageKey, u)
        setImage({ key: imageKey, url: u })
      })
    }

    const node = containerRef.current
    if (!node || typeof IntersectionObserver === 'undefined') {
      loadImage()
      return () => {
        cancelled = true
      }
    }

    const observer = new IntersectionObserver(
      entries => {
        if (entries.some(entry => entry.isIntersecting)) {
          loadImage()
          observer.disconnect()
        }
      },
      { rootMargin: '360px 0px' },
    )
    observer.observe(node)
    return () => {
      cancelled = true
      observer.disconnect()
    }
  }, [videoId, ext, imageKey])

  return (
    <div ref={containerRef} style={{
      width: 48, height: 64, borderRadius: 7, overflow: 'hidden',
      background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)',
      flexShrink: 0,
    }}>
      {imageKey && image?.key === imageKey ? (
        <img src={image.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
      ) : (
        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="var(--border-default)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="3" width="16" height="14" rx="2"/>
            <circle cx="7.5" cy="7.5" r="1.5"/>
            <path d="M2 13l4.5-4.5L10 12l3-3 5 5"/>
          </svg>
        </div>
      )}
    </div>
  )
}

function FilterChip({ active, onClick, label, color, activeBg }: { active: boolean; onClick: () => void; label: string; color?: string; activeBg?: string }) {
  const isCustom = !!color
  return (
    <button
      onClick={onClick}
      style={{
        padding: '5px 10px', borderRadius: 6, fontSize: 12, fontWeight: 500,
        cursor: 'pointer', border: `1px solid ${active ? (isCustom ? `${color}45` : 'var(--accent)') : 'transparent'}`,
        background: active ? (isCustom ? activeBg : 'var(--accent-subtle)') : 'transparent',
        color: active ? (isCustom ? color : 'var(--accent)') : 'var(--text-secondary)',
        transition: 'background .1s, color .1s',
      }}
      onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)' }}
      onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
    >
      {label}
    </button>
  )
}
