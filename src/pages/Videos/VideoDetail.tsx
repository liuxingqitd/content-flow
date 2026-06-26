import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAppStore } from '@/store/appStore'
import { writeCoverImage, readCoverImage, readCoverFile, deleteCoverImage } from '@/services/fileSystem'
import { PageContainer } from '@/components/layout/PageContainer'
import { Button } from '@/components/ui/Button'
import { StatusBadge } from '@/components/StatusBadge'
import { PlatformIcon } from '@/components/PlatformIcon'
import { Modal } from '@/components/ui/Modal'
import { Input, Textarea } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import type { Platform } from '@/types'
import {
  VIDEO_STATUS_LABELS, VIDEO_STATUS_ORDER, ALL_PLATFORMS, PLATFORM_LABELS,
  PLATFORM_STATUS_LABELS, PLATFORM_STATUS_COLORS,
  ALL_SHOOTING_FORMATS, SHOOTING_FORMAT_LABELS,
} from '@/types'
import { formatDate, fromNow } from '@/utils/date'
import { calcEngagement, formatNumber } from '@/utils/format'

export function VideoDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const videos = useAppStore(s => s.data?.videos ?? [])
  const tags = useAppStore(s => s.data?.tags ?? [])
  const scripts = useAppStore(s => s.data?.scripts ?? [])
  const metrics = useAppStore(s => s.data?.metrics ?? [])
  const videoRelations = useAppStore(s => s.data?.videoRelations ?? [])
  const violationReasons = useAppStore(s => s.data?.settings.violationReasons ?? ['违反社区公约', '涉嫌第三方导流'])
  const skipReasons = useAppStore(s => s.data?.settings.skipReasons ?? ['该平台不适合此类内容', '本期跳过发布'])
  const hidePromotionCost = useAppStore(s => s.data?.settings.hidePromotionCost ?? false)
  const hideCommercialAmount = useAppStore(s => s.data?.settings.hideCommercialAmount ?? false)
  const updateVideo = useAppStore(s => s.updateVideo)
  const moveVideo = useAppStore(s => s.moveVideo)
  const deleteVideo = useAppStore(s => s.deleteVideo)
  const addMetric = useAppStore(s => s.addMetric)
  const deleteMetric = useAppStore(s => s.deleteMetric)
  const setPlatformEntry = useAppStore(s => s.setPlatformEntry)
  const updatePromotionCost = useAppStore(s => s.updatePromotionCost)
  const updateVideoCover = useAppStore(s => s.updateVideoCover)
  const addVideoRelation = useAppStore(s => s.addVideoRelation)
  const updateVideoRelation = useAppStore(s => s.updateVideoRelation)
  const deleteVideoRelation = useAppStore(s => s.deleteVideoRelation)

  const video = videos.find(v => v.id === id)
  const script = scripts.find(s => s.id === video?.scriptId)
  const videoMetrics = metrics.filter(m => m.videoId === id)

  const [coverPortraitUrl, setCoverPortraitUrl] = useState<string | null>(null)
  const [coverLandscapeUrl, setCoverLandscapeUrl] = useState<string | null>(null)
  const portraitInputRef = useRef<HTMLInputElement>(null)
  const landscapeInputRef = useRef<HTMLInputElement>(null)

  const videoId = video?.id
  const coverPortraitExt = video?.coverPortrait
  const coverLandscapeExt = video?.coverLandscape

  useEffect(() => {
    let cancelled = false
    Promise.all([
      coverPortraitExt && videoId ? readCoverImage(videoId, 'portrait', coverPortraitExt) : Promise.resolve(null),
      coverLandscapeExt && videoId ? readCoverImage(videoId, 'landscape', coverLandscapeExt) : Promise.resolve(null),
    ]).then(([p, l]) => {
      if (cancelled) { if (p) URL.revokeObjectURL(p); if (l) URL.revokeObjectURL(l); return }
      setCoverPortraitUrl(prev => { if (prev) URL.revokeObjectURL(prev); return p })
      setCoverLandscapeUrl(prev => { if (prev) URL.revokeObjectURL(prev); return l })
    })
    return () => {
      cancelled = true
      setCoverPortraitUrl(prev => { if (prev) URL.revokeObjectURL(prev); return null })
      setCoverLandscapeUrl(prev => { if (prev) URL.revokeObjectURL(prev); return null })
    }
  }, [videoId, coverPortraitExt, coverLandscapeExt])

  const handleCoverUpload = async (orientation: 'portrait' | 'landscape', file: File) => {
    if (!video) return
    const ext = await writeCoverImage(video.id, orientation, file)
    updateVideoCover(video.id, orientation, ext)
    const url = URL.createObjectURL(file)
    if (orientation === 'portrait') {
      setCoverPortraitUrl(prev => { if (prev) URL.revokeObjectURL(prev); return url })
    } else {
      setCoverLandscapeUrl(prev => { if (prev) URL.revokeObjectURL(prev); return url })
    }
  }

  const handleCoverDelete = async (orientation: 'portrait' | 'landscape') => {
    if (!video) return
    const ext = orientation === 'portrait' ? video.coverPortrait : video.coverLandscape
    if (ext) await deleteCoverImage(video.id, orientation, ext)
    updateVideoCover(video.id, orientation, undefined)
    if (orientation === 'portrait') {
      setCoverPortraitUrl(prev => { if (prev) URL.revokeObjectURL(prev); return null })
    } else {
      setCoverLandscapeUrl(prev => { if (prev) URL.revokeObjectURL(prev); return null })
    }
  }

  const handleCoverDownload = async (orientation: 'portrait' | 'landscape') => {
    if (!video) return
    const ext = orientation === 'portrait' ? video.coverPortrait : video.coverLandscape
    if (!ext) return
    const file = await readCoverFile(video.id, orientation, ext)
    if (!file) return

    const safeTitle = video.title
      .trim()
      .replace(/[\\/:*?"<>|]/g, '-')
      .replace(/\s+/g, ' ')
      .slice(0, 80) || video.id
    const filename = `${safeTitle}-${orientation === 'portrait' ? '竖屏封面' : '横屏封面'}.${ext}`
    const url = URL.createObjectURL(file)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    link.remove()
    setTimeout(() => URL.revokeObjectURL(url), 0)
  }

  const [editingTitle, setEditingTitle] = useState(false)
  const [titleValue, setTitleValue] = useState(video?.title ?? '')
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [metricModal, setMetricModal] = useState(false)
  const [relationModal, setRelationModal] = useState(false)
  const [relationSearch, setRelationSearch] = useState('')
  const [relationTargetId, setRelationTargetId] = useState('')
  const [relationNote, setRelationNote] = useState('')
  const [metricForm, setMetricForm] = useState({
    platform: 'douyin' as Platform,
    plays: '', likes: '', comments: '', shares: '', saves: '', follows: '', completionRate: '',
    dataDate: new Date().toISOString().split('T')[0],
  })

  const fillFromLastMetric = (platform: Platform) => {
    const last = [...videoMetrics]
      .filter(m => m.platform === platform)
      .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt))[0]
    return {
      platform,
      plays: last ? String(last.plays) : '',
      likes: last ? String(last.likes) : '',
      comments: last ? String(last.comments) : '',
      shares: last ? String(last.shares) : '',
      saves: last?.saves != null ? String(last.saves) : '',
      follows: last?.follows != null ? String(last.follows) : '',
      completionRate: last?.completionRate != null ? String(last.completionRate) : '',
      dataDate: new Date().toISOString().split('T')[0],
    }
  }

  const openMetricModal = () => {
    setMetricForm(fillFromLastMetric('douyin'))
    setMetricModal(true)
  }

  const [costDraft, setCostDraft] = useState<Partial<Record<Platform, string>>>({})
  const [commercialAmountDraft, setCommercialAmountDraft] = useState<string | undefined>(undefined)

  // Platform modals
  const [skipModal, setSkipModal] = useState<Platform | null>(null)
  const [skipReason, setSkipReason] = useState('')
  const [violationModal, setViolationModal] = useState<Platform | null>(null)
  const [violationReason, setViolationReason] = useState('')

  if (!video) {
    return (
      <PageContainer title="视频不存在">
        <Button onClick={() => navigate('/videos')}>返回列表</Button>
      </PageContainer>
    )
  }

  const currentIdx = VIDEO_STATUS_ORDER.indexOf(video.status)
  const nextStatus = currentIdx < VIDEO_STATUS_ORDER.length - 2 ? VIDEO_STATUS_ORDER[currentIdx + 1] : null
  const prevStatus = currentIdx > 0 ? VIDEO_STATUS_ORDER[currentIdx - 1] : null
  const relatedRelations = videoRelations.filter(
    r => r.fromVideoId === video.id || r.toVideoId === video.id,
  )
  const relatedVideoIds = new Set(
    relatedRelations.map(r => r.fromVideoId === video.id ? r.toVideoId : r.fromVideoId),
  )
  const relationCandidates = videos.filter(candidate => {
    if (candidate.id === video.id || relatedVideoIds.has(candidate.id)) return false
    return candidate.title.toLowerCase().includes(relationSearch.trim().toLowerCase())
  })

  const handleTitleSave = () => {
    if (titleValue.trim() && titleValue !== video.title) {
      updateVideo(video.id, { title: titleValue.trim() })
    }
    setEditingTitle(false)
  }

  const handleAddMetric = () => {
    addMetric({
      videoId: video.id,
      platform: metricForm.platform,
      dataDate: metricForm.dataDate,
      plays: Number(metricForm.plays),
      likes: Number(metricForm.likes),
      comments: Number(metricForm.comments),
      shares: Number(metricForm.shares),
      saves: metricForm.saves ? Number(metricForm.saves) : undefined,
      follows: metricForm.follows ? Number(metricForm.follows) : undefined,
      completionRate: metricForm.completionRate ? Number(metricForm.completionRate) : undefined,
    })
    setMetricModal(false)
  }

  const closeRelationModal = () => {
    setRelationModal(false)
    setRelationSearch('')
    setRelationTargetId('')
    setRelationNote('')
  }

  const handleAddRelation = () => {
    if (!relationTargetId) return
    addVideoRelation(video.id, relationTargetId, relationNote)
    closeRelationModal()
  }

  const handleCommercialAmountBlur = () => {
    if (commercialAmountDraft === undefined) return
    const parsed = parseFloat(commercialAmountDraft)
    updateVideo(video.id, { commercialAmount: isNaN(parsed) || parsed <= 0 ? undefined : parsed })
    setCommercialAmountDraft(undefined)
  }

  const statusOrderFiltered = VIDEO_STATUS_ORDER.filter(s => s !== 'archived')

  return (
    <PageContainer
      title={video.title}
      actions={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <StatusBadge status={video.status} />
          <Button variant="danger" size="sm" onClick={() => setDeleteConfirm(true)}>删除</Button>
        </div>
      }
    >
      <div style={{ maxWidth: 1180, display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Title inline edit */}
        <div style={{
          padding: '18px 20px', borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)',
          boxShadow: 'var(--shadow-xs)',
        }}>
          {editingTitle ? (
            <input
              autoFocus
              value={titleValue}
              onChange={e => setTitleValue(e.target.value)}
              onBlur={handleTitleSave}
              onKeyDown={e => {
                if (e.key === 'Enter') handleTitleSave()
                if (e.key === 'Escape') { setTitleValue(video.title); setEditingTitle(false) }
              }}
              style={{
                width: '100%', fontSize: 20, fontWeight: 650,
                background: 'transparent', borderBottom: '2px solid var(--accent)',
                color: 'var(--text-primary)', outline: 'none', paddingBottom: 4,
                fontFamily: 'inherit',
              }}
            />
          ) : (
            <h1
              onClick={() => { setTitleValue(video.title); setEditingTitle(true) }}
              style={{ fontSize: 20, fontWeight: 650, color: 'var(--text-primary)', cursor: 'text', transition: 'color .1s', letterSpacing: '-0.025em', lineHeight: 1.4 }}
              title="点击编辑标题"
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'var(--accent)'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)'}
            >
              {video.title}
            </h1>
          )}
        </div>

        {/* Status workflow */}
        <div style={{
          padding: '16px 20px', borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)',
        }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>工作流进度</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
            {statusOrderFiltered.map((s, i) => {
              const currentI = VIDEO_STATUS_ORDER.indexOf(video.status)
              const thisI = VIDEO_STATUS_ORDER.indexOf(s)
              const done = thisI < currentI
              const active = s === video.status
              return (
                <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <button
                    onClick={() => moveVideo(video.id, s)}
                    style={{
                      padding: '4px 10px', borderRadius: 99, fontSize: 12, fontWeight: 500,
                      cursor: 'pointer', transition: 'all .12s',
                      background: active ? 'var(--accent)' : 'var(--bg-elevated)',
                      color: active ? '#fff' : 'var(--text-secondary)',
                      border: `1px solid ${active ? 'var(--accent)' : 'var(--border-subtle)'}`,
                      textDecoration: done ? 'line-through' : 'none',
                    }}
                    onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)' }}
                    onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.color = done ? 'var(--text-tertiary)' : 'var(--text-tertiary)' }}
                  >
                    {VIDEO_STATUS_LABELS[s]}
                  </button>
                  {i < statusOrderFiltered.length - 1 && (
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path d="M3 2l4 3-4 3" stroke="var(--text-tertiary)" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  )}
                </div>
              )
            })}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
            {prevStatus && (
              <Button variant="secondary" size="sm" onClick={() => moveVideo(video.id, prevStatus)}>
                ← 退回「{VIDEO_STATUS_LABELS[prevStatus]}」
              </Button>
            )}
            {nextStatus && (
              <Button variant="primary" size="sm" onClick={() => moveVideo(video.id, nextStatus)}>
                推进到「{VIDEO_STATUS_LABELS[nextStatus]}」→
              </Button>
            )}
            {video.status !== 'archived' && (
              <Button variant="ghost" size="sm" onClick={() => moveVideo(video.id, 'archived')}>
                归档
              </Button>
            )}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(320px, 360px)', gap: 20, alignItems: 'start' }}>
          {/* Left col */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
            {/* Cover images */}
            <div style={{ padding: 20, borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)' }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>封面图</p>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                {/* Portrait cover 3:4 */}
                <CoverSlot
                  label="竖屏 3:4"
                  orientation="portrait"
                  url={coverPortraitUrl}
                  inputRef={portraitInputRef}
                  onUpload={file => handleCoverUpload('portrait', file)}
                  onDelete={() => handleCoverDelete('portrait')}
                  onDownload={() => handleCoverDownload('portrait')}
                  width={120}
                />
                {/* Landscape cover 4:3 */}
                <CoverSlot
                  label="横屏 4:3"
                  orientation="landscape"
                  url={coverLandscapeUrl}
                  inputRef={landscapeInputRef}
                  onUpload={file => handleCoverUpload('landscape', file)}
                  onDelete={() => handleCoverDelete('landscape')}
                  onDownload={() => handleCoverDownload('landscape')}
                  width={160}
                />
              </div>
            </div>

            <div style={{ padding: 20, borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)' }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>视频简介</p>
              <Textarea
                value={video.description ?? ''}
                onChange={e => updateVideo(video.id, { description: e.target.value })}
                placeholder="视频核心内容或亮点…"
                rows={4}
              />
            </div>

            <div style={{ padding: 20, borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <div>
                  <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>商单</p>
                  <p style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>标记合作视频并记录商单金额</p>
                </div>
                <button
                  onClick={() => {
                    updateVideo(video.id, video.isCommercial
                      ? { isCommercial: false, commercialAmount: undefined }
                      : { isCommercial: true })
                    setCommercialAmountDraft(undefined)
                  }}
                  style={{
                    padding: '5px 12px', borderRadius: 99, fontSize: 12, fontWeight: 600,
                    border: `1px solid ${video.isCommercial ? 'var(--accent)' : 'var(--border-subtle)'}`,
                    background: video.isCommercial ? 'var(--accent-alpha)' : 'transparent',
                    color: video.isCommercial ? 'var(--accent)' : 'var(--text-tertiary)',
                    cursor: 'pointer', transition: 'all .1s', flexShrink: 0,
                  }}
                >
                  {video.isCommercial ? '已标记' : '标记商单'}
                </button>
              </div>
              {video.isCommercial && (
                hideCommercialAmount ? (
                  <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 12 }}>商单金额已在隐私设置中隐藏</p>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, maxWidth: 220 }}>
                    <span style={{ fontSize: 12, color: 'var(--text-tertiary)', flexShrink: 0 }}>¥</span>
                    <Input
                      type="number"
                      min="0"
                      step="1"
                      placeholder="商单金额"
                      value={commercialAmountDraft ?? (video.commercialAmount != null ? String(video.commercialAmount) : '')}
                      onChange={e => setCommercialAmountDraft(e.target.value)}
                      onBlur={handleCommercialAmountBlur}
                    />
                  </div>
                )
              )}
            </div>

            <div style={{ padding: 20, borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)' }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>关联逐字稿</p>
              {script ? (
                <button
                  onClick={() => navigate(`/scripts/${script.id}`)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 12px', borderRadius: 8,
                    border: '1px solid var(--border-subtle)',
                    background: 'var(--bg-elevated)',
                    cursor: 'pointer', textAlign: 'left',
                    transition: 'border-color .12s',
                  }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-default)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-subtle)'}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="var(--text-tertiary)" strokeWidth="1.5" strokeLinecap="round">
                    <rect x="2" y="1.5" width="12" height="13" rx="1.5"/>
                    <path d="M5 5.5h6M5 8h6M5 10.5h4"/>
                  </svg>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{script.title}</p>
                    <p style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{script.wordCount} 字 · v{script.version}</p>
                  </div>
                </button>
              ) : (
                <Select
                  options={[
                    { value: '', label: '不关联' },
                    ...scripts.map(s => ({ value: s.id, label: s.title })),
                  ]}
                  value={video.scriptId ?? ''}
                  onChange={e => updateVideo(video.id, { scriptId: e.target.value || undefined })}
                />
              )}
            </div>

            <div style={{ padding: 20, borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>相关视频</p>
                <Button variant="secondary" size="sm" onClick={() => setRelationModal(true)}>关联视频</Button>
              </div>
              {relatedRelations.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {relatedRelations.map(relation => {
                    const relatedVideoId = relation.fromVideoId === video.id ? relation.toVideoId : relation.fromVideoId
                    const relatedVideo = videos.find(v => v.id === relatedVideoId)
                    if (!relatedVideo) return null
                    return (
                      <div
                        key={relation.id}
                        style={{
                          padding: '10px 12px', borderRadius: 8,
                          border: '1px solid var(--border-subtle)',
                          background: 'var(--bg-elevated)',
                          display: 'flex', flexDirection: 'column', gap: 8,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.4 }}>
                              {relatedVideo.title}
                            </p>
                            <div style={{ marginTop: 4 }}>
                              <StatusBadge status={relatedVideo.status} />
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                            <Button variant="ghost" size="sm" onClick={() => navigate(`/videos/${relatedVideo.id}`)}>查看</Button>
                            <Button variant="danger" size="sm" onClick={() => deleteVideoRelation(relation.id)}>移除</Button>
                          </div>
                        </div>
                        <Textarea
                          defaultValue={relation.note ?? ''}
                          rows={2}
                          placeholder="记录复拍、变体或跟进原因…"
                          onBlur={e => updateVideoRelation(relation.id, e.target.value)}
                          style={{ fontSize: 12, minHeight: 56 }}
                        />
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p style={{ fontSize: 12, color: 'var(--text-tertiary)', padding: '8px 0' }}>暂无相关视频</p>
              )}
            </div>

            <div style={{ padding: 20, borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)' }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>标签</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {tags.map(tag => {
                  const selected = video.tagIds.includes(tag.id)
                  return (
                    <button
                      key={tag.id}
                      onClick={() => {
                        const newTagIds = selected
                          ? video.tagIds.filter(t => t !== tag.id)
                          : [...video.tagIds, tag.id]
                        updateVideo(video.id, { tagIds: newTagIds })
                      }}
                      style={{
                        padding: '4px 10px', borderRadius: 99, fontSize: 12, fontWeight: 500,
                        border: `1px solid ${selected ? tag.color : 'var(--border-subtle)'}`,
                        background: selected ? `${tag.color}20` : 'transparent',
                        color: selected ? tag.color : 'var(--text-tertiary)',
                        cursor: 'pointer', transition: 'all .1s',
                      }}
                    >
                      {tag.name}
                    </button>
                  )
                })}
              </div>
            </div>

            <div style={{ padding: 20, borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)' }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>拍摄形式</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {ALL_SHOOTING_FORMATS.map(fmt => {
                  const selected = (video.shootingFormats ?? []).includes(fmt)
                  return (
                    <button
                      key={fmt}
                      onClick={() => {
                        const prev = video.shootingFormats ?? []
                        const next = selected
                          ? prev.filter(f => f !== fmt)
                          : [...prev, fmt]
                        updateVideo(video.id, { shootingFormats: next })
                      }}
                      style={{
                        padding: '4px 10px', borderRadius: 99, fontSize: 12, fontWeight: 500,
                        border: `1px solid ${selected ? 'var(--accent)' : 'var(--border-subtle)'}`,
                        background: selected ? 'var(--accent-alpha)' : 'transparent',
                        color: selected ? 'var(--accent)' : 'var(--text-tertiary)',
                        cursor: 'pointer', transition: 'all .1s',
                      }}
                    >
                      {SHOOTING_FORMAT_LABELS[fmt]}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Right col */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
            {/* Platform status */}
            <div style={{ padding: 20, borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)' }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>发布平台</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {ALL_PLATFORMS.map(platform => {
                  const pub = video.platforms.find(p => p.platform === platform)
                  const status = pub?.status ?? 'published'
                  const color = pub ? PLATFORM_STATUS_COLORS[status] : 'var(--border-subtle)'

                  return (
                    <div
                      key={platform}
                      style={{
                        borderRadius: 8,
                        border: `1px solid ${pub ? color + '40' : 'var(--border-subtle)'}`,
                        background: pub ? color + '08' : 'transparent',
                        padding: 12,
                      }}
                    >
                      {/* Row header */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <PlatformIcon platform={platform} size={16} />
                        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', flex: 1 }}>
                          {PLATFORM_LABELS[platform]}
                        </span>

                        {/* Status badge */}
                        {pub && (
                          <span style={{
                            padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 600,
                            background: color + '20', color,
                          }}>
                            {PLATFORM_STATUS_LABELS[status]}
                          </span>
                        )}

                        {/* Actions — 三个状态平级，任意切换 */}
                        <div style={{ display: 'flex', gap: 4 }}>
                          {(!pub || status !== 'published') && (
                            <ActionBtn
                              label="已发布"
                              color="var(--success)"
                              onClick={() => setPlatformEntry(video.id, platform, {
                                status: 'published',
                                publishedAt: new Date().toISOString(),
                              })}
                            />
                          )}
                          {(!pub || status !== 'violated') && (
                            <ActionBtn
                              label="已违规"
                              color="var(--danger)"
                              onClick={() => { setViolationReason(violationReasons[0] ?? ''); setViolationModal(platform) }}
                            />
                          )}
                          {(!pub || status !== 'skipped') && (
                            <ActionBtn
                              label="已跳过"
                              color="var(--text-tertiary)"
                              onClick={() => { setSkipReason(skipReasons[0] ?? ''); setSkipModal(platform) }}
                            />
                          )}
                        </div>
                      </div>

                      {/* Detail row */}
                      {pub && status === 'published' && pub.publishedAt && (
                        <div style={{ marginTop: 4 }}>
                          <p style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                            {formatDate(pub.publishedAt)}
                          </p>
                          {!hidePromotionCost && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6 }}>
                            <span style={{ fontSize: 11, color: 'var(--text-tertiary)', flexShrink: 0 }}>¥</span>
                            <input
                              type="number"
                              min="0"
                              step="1"
                              placeholder="投放费用（选填）"
                              value={costDraft[platform] ?? (pub.promotionCost != null ? String(pub.promotionCost) : '')}
                              onChange={e => setCostDraft(d => ({ ...d, [platform]: e.target.value }))}
                              onBlur={() => {
                                const raw = costDraft[platform]
                                if (raw === undefined) return
                                const parsed = parseFloat(raw)
                                updatePromotionCost(video.id, platform, isNaN(parsed) || parsed <= 0 ? undefined : parsed)
                                setCostDraft(d => { const n = { ...d }; delete n[platform]; return n })
                              }}
                              style={{
                                width: 130, height: 24, padding: '0 8px', borderRadius: 6, fontSize: 11,
                                border: '1px solid var(--border-subtle)', background: 'var(--bg-base)',
                                color: 'var(--text-primary)', outline: 'none', fontFamily: 'inherit',
                              }}
                              onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent)' }}
                              onBlurCapture={e => { e.currentTarget.style.borderColor = 'var(--border-subtle)' }}
                            />
                            {pub.promotionCost != null && pub.promotionCost > 0 && costDraft[platform] === undefined && (
                              <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>已记录</span>
                            )}
                          </div>
                          )}
                        </div>
                      )}
                      {pub && status === 'violated' && pub.violation && (
                        <p style={{ fontSize: 11, color: 'var(--danger)', marginTop: 4, lineHeight: 1.5 }}>
                          {pub.violation.reason}
                        </p>
                      )}
                      {pub && status === 'skipped' && pub.skipReason && (
                        <p style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 4, lineHeight: 1.5 }}>
                          {pub.skipReason}
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            <div style={{ padding: 20, borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)' }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>备注</p>
              <Textarea
                value={video.notes ?? ''}
                onChange={e => updateVideo(video.id, { notes: e.target.value })}
                placeholder="自由记录想法…"
                rows={4}
              />
            </div>

            <div style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: 6, padding: '14px 16px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)', fontVariantNumeric: 'tabular-nums' }}>
              <p>创建：{formatDate(video.createdAt)}</p>
              <p>最后更新：{fromNow(video.updatedAt)}</p>
            </div>
          </div>
        </div>

        {/* Metrics */}
        <div style={{ padding: 20, borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>平台数据</p>
            <Button variant="secondary" size="sm" onClick={openMetricModal}>
              + 录入数据
            </Button>
          </div>
          {videoMetrics.length > 0 ? (
            <div style={{ overflow: 'auto', borderRadius: 12, border: '1px solid var(--border-subtle)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-surface)' }}>
                    {['平台', '日期', '播放', '点赞', '评论', '分享', '收藏', '完播率', '互动率'].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '8px 12px', color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', fontSize: 11 }}>{h}</th>
                    ))}
                    <th style={{ width: 40, padding: '8px 12px' }} />
                  </tr>
                </thead>
                <tbody>
                  {videoMetrics.map((m, i) => (
                    <tr key={m.id} style={{ borderBottom: i < videoMetrics.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
                      <td style={{ padding: '8px 12px' }}><PlatformIcon platform={m.platform} size={14} showLabel /></td>
                      <td style={{ padding: '8px 12px', color: 'var(--text-secondary)' }}>{formatDate(m.dataDate)}</td>
                      <td style={{ padding: '8px 12px', fontWeight: 500, color: 'var(--text-primary)' }}>{formatNumber(m.plays)}</td>
                      <td style={{ padding: '8px 12px', color: 'var(--text-secondary)' }}>{formatNumber(m.likes)}</td>
                      <td style={{ padding: '8px 12px', color: 'var(--text-secondary)' }}>{formatNumber(m.comments)}</td>
                      <td style={{ padding: '8px 12px', color: 'var(--text-secondary)' }}>{formatNumber(m.shares)}</td>
                      <td style={{ padding: '8px 12px', color: 'var(--text-secondary)' }}>{m.saves ? formatNumber(m.saves) : '—'}</td>
                      <td style={{ padding: '8px 12px', color: 'var(--text-secondary)' }}>{m.completionRate != null ? `${m.completionRate}%` : '—'}</td>
                      <td style={{ padding: '8px 12px', color: 'var(--success)', fontWeight: 500 }}>
                        {calcEngagement(m.likes, m.comments, m.shares, m.plays)}%
                      </td>
                      <td style={{ padding: '4px 8px', textAlign: 'center' }}>
                        <button
                          onClick={() => deleteMetric(m.id)}
                          title="删除此条数据"
                          style={{
                            width: 26, height: 26, borderRadius: 6,
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            border: 'none', background: 'transparent',
                            color: 'var(--text-tertiary)', cursor: 'pointer',
                            transition: 'all .12s',
                          }}
                          onMouseEnter={e => {
                            (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.1)'
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
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p style={{ fontSize: 12, color: 'var(--text-tertiary)', padding: '16px 0' }}>暂无数据记录，点击「录入数据」开始追踪</p>
          )}
        </div>
      </div>

      {/* Relation modal */}
      <Modal
        open={relationModal}
        onClose={closeRelationModal}
        title="关联视频"
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={closeRelationModal}>取消</Button>
            <Button variant="primary" onClick={handleAddRelation} disabled={!relationTargetId}>保存</Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Input
            label="搜索视频"
            value={relationSearch}
            placeholder="输入标题关键词"
            onChange={e => setRelationSearch(e.target.value)}
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 240, overflowY: 'auto' }}>
            {relationCandidates.length > 0 ? relationCandidates.map(candidate => {
              const selected = candidate.id === relationTargetId
              return (
                <button
                  key={candidate.id}
                  onClick={() => setRelationTargetId(candidate.id)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                    padding: '9px 10px', borderRadius: 8,
                    border: `1px solid ${selected ? 'var(--accent)' : 'var(--border-subtle)'}`,
                    background: selected ? 'var(--accent-alpha)' : 'var(--bg-elevated)',
                    color: 'var(--text-primary)',
                    cursor: 'pointer', textAlign: 'left',
                    transition: 'border-color .12s, background .12s',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {candidate.title}
                    </p>
                    <div style={{ marginTop: 4 }}>
                      <StatusBadge status={candidate.status} />
                    </div>
                  </div>
                </button>
              )
            }) : (
              <p style={{ fontSize: 12, color: 'var(--text-tertiary)', padding: '8px 0' }}>没有可关联的视频</p>
            )}
          </div>
          <Textarea
            label="备注"
            value={relationNote}
            placeholder="例如：违规后重发、同主题复拍、爆款跟进…"
            rows={3}
            onChange={e => setRelationNote(e.target.value)}
          />
        </div>
      </Modal>

      {/* Metric modal */}
      <Modal
        open={metricModal}
        onClose={() => setMetricModal(false)}
        title="录入平台数据"
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setMetricModal(false)}>取消</Button>
            <Button variant="primary" onClick={handleAddMetric} disabled={!metricForm.plays}>保存</Button>
          </>
        }
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Select
            label="平台"
            options={ALL_PLATFORMS.map(p => ({ value: p, label: PLATFORM_LABELS[p] }))}
            value={metricForm.platform}
            onChange={e => setMetricForm(fillFromLastMetric(e.target.value as Platform))}
          />
          <Input
            label="数据日期"
            type="date"
            value={metricForm.dataDate}
            onChange={e => setMetricForm(f => ({ ...f, dataDate: e.target.value }))}
          />
          <Input label="播放量 *" type="number" placeholder="0" value={metricForm.plays} onChange={e => setMetricForm(f => ({ ...f, plays: e.target.value }))} />
          <Input label="点赞数" type="number" placeholder="0" value={metricForm.likes} onChange={e => setMetricForm(f => ({ ...f, likes: e.target.value }))} />
          <Input label="评论数" type="number" placeholder="0" value={metricForm.comments} onChange={e => setMetricForm(f => ({ ...f, comments: e.target.value }))} />
          <Input label="分享数" type="number" placeholder="0" value={metricForm.shares} onChange={e => setMetricForm(f => ({ ...f, shares: e.target.value }))} />
          <Input label="收藏数" type="number" placeholder="0" value={metricForm.saves} onChange={e => setMetricForm(f => ({ ...f, saves: e.target.value }))} />
          <Input label="新增关注" type="number" placeholder="0" value={metricForm.follows} onChange={e => setMetricForm(f => ({ ...f, follows: e.target.value }))} />
          <Input label="完播率 (%)" type="number" placeholder="0" value={metricForm.completionRate} onChange={e => setMetricForm(f => ({ ...f, completionRate: e.target.value }))} />
        </div>
      </Modal>

      {/* Skip modal */}
      <Modal
        open={skipModal !== null}
        onClose={() => setSkipModal(null)}
        title={`跳过 · ${skipModal ? PLATFORM_LABELS[skipModal] : ''}`}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setSkipModal(null)}>取消</Button>
            <Button
              variant="primary"
              disabled={!skipReason}
              onClick={() => {
                if (!skipModal) return
                setPlatformEntry(video.id, skipModal, {
                  status: 'skipped',
                  skipReason: skipReason || undefined,
                })
                setSkipModal(null)
              }}
            >
              确认跳过
            </Button>
          </>
        }
      >
        <Select
          label="跳过原因"
          options={skipReasons.map(r => ({ value: r, label: r }))}
          value={skipReason}
          onChange={e => setSkipReason(e.target.value)}
        />
      </Modal>

      {/* Violation modal */}
      <Modal
        open={violationModal !== null}
        onClose={() => setViolationModal(null)}
        title={`标记违规 · ${violationModal ? PLATFORM_LABELS[violationModal] : ''}`}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setViolationModal(null)}>取消</Button>
            <Button
              variant="danger"
              disabled={!violationReason}
              onClick={() => {
                if (!violationModal || !violationReason) return
                const existing = video.platforms.find(p => p.platform === violationModal)
                setPlatformEntry(video.id, violationModal, {
                  status: 'violated',
                  publishedAt: existing?.publishedAt,
                  violation: {
                    reason: violationReason,
                    reportedAt: new Date().toISOString(),
                  },
                })
                setViolationModal(null)
              }}
            >
              确认违规
            </Button>
          </>
        }
      >
        <Select
          label="违规原因"
          options={violationReasons.map(r => ({ value: r, label: r }))}
          value={violationReason}
          onChange={e => setViolationReason(e.target.value)}
        />
      </Modal>

      {/* Delete confirm */}
      <Modal
        open={deleteConfirm}
        onClose={() => setDeleteConfirm(false)}
        title="删除视频"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteConfirm(false)}>取消</Button>
            <Button variant="danger" onClick={() => { deleteVideo(video.id); navigate('/videos') }}>确认删除</Button>
          </>
        }
      >
        <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>删除后此视频及相关记录将被移除，此操作不可撤销。</p>
      </Modal>
    </PageContainer>
  )
}

function CoverSlot({
  label, orientation, url, inputRef, onUpload, onDelete, onDownload, width,
}: {
  label: string
  orientation: 'portrait' | 'landscape'
  url: string | null
  inputRef: React.RefObject<HTMLInputElement | null>
  onUpload: (file: File) => void
  onDelete: () => void
  onDownload: () => void
  width: number
}) {
  const height = orientation === 'portrait' ? Math.round(width * 4 / 3) : Math.round(width * 3 / 4)
  const [hover, setHover] = useState(false)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center' }}>
      <div
        style={{
          width, height, borderRadius: 8, overflow: 'hidden', position: 'relative',
          border: `1px solid ${hover ? 'var(--accent)' : 'var(--border-subtle)'}`,
          background: hover && !url ? 'var(--accent-subtle)' : 'var(--bg-elevated)',
          cursor: 'pointer',
          transition: 'border-color .12s, background .12s',
          flexShrink: 0,
        }}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        onClick={() => !url && inputRef.current?.click()}
      >
        {url ? (
          <>
            <img
              src={url}
              alt={label}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
            {hover && (
              <div style={{
                position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                flexWrap: 'wrap', padding: 6,
              }}>
                <button
                  onClick={e => { e.stopPropagation(); inputRef.current?.click() }}
                  style={{
                    padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 500,
                    background: 'rgba(255,255,255,0.15)', color: '#fff',
                    border: '1px solid rgba(255,255,255,0.3)', cursor: 'pointer',
                  }}
                >
                  更换
                </button>
                <button
                  onClick={e => { e.stopPropagation(); onDownload() }}
                  style={{
                    padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 500,
                    background: 'rgba(255,255,255,0.15)', color: '#fff',
                    border: '1px solid rgba(255,255,255,0.3)', cursor: 'pointer',
                  }}
                >
                  下载
                </button>
                <button
                  onClick={e => { e.stopPropagation(); onDelete() }}
                  style={{
                    padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 500,
                    background: 'rgba(239,68,68,0.2)', color: 'var(--danger)',
                    border: '1px solid rgba(239,68,68,0.4)', cursor: 'pointer',
                  }}
                >
                  删除
                </button>
              </div>
            )}
          </>
        ) : (
          <div style={{
            width: '100%', height: '100%',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: 6,
          }}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="var(--text-tertiary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="3" width="16" height="14" rx="2"/>
              <circle cx="7.5" cy="7.5" r="1.5"/>
              <path d="M2 13l4.5-4.5L10 12l3-3 5 5"/>
            </svg>
            <span style={{ fontSize: 10, color: hover ? 'var(--accent)' : 'var(--text-tertiary)' }}>上传</span>
          </div>
        )}
      </div>
      <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>{label}</span>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={e => {
          const file = e.target.files?.[0]
          if (file) onUpload(file)
          e.target.value = ''
        }}
      />
    </div>
  )
}

function ActionBtn({ label, color, onClick }: { label: string; color: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '2px 8px', borderRadius: 5, fontSize: 11,
        border: `1px solid ${color}50`,
        background: 'transparent',
        color,
        cursor: 'pointer',
        transition: 'background .1s',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = color + '15' }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
    >
      {label}
    </button>
  )
}
