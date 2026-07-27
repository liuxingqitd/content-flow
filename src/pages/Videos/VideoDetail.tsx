import { useState, useEffect, useRef, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAppStore } from '@/store/appStore'
import { writeCoverImage, readCoverImage, readCoverFile, deleteCoverImage } from '@/services/fileSystem'
import { invalidateCoverThumbnailCache } from '@/services/coverThumbnailCache'
import { PageContainer } from '@/components/layout/PageContainer'
import { Button } from '@/components/ui/Button'
import { StatusBadge } from '@/components/StatusBadge'
import { PlatformIcon } from '@/components/PlatformIcon'
import { Modal } from '@/components/ui/Modal'
import { Input, Textarea } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import type { CommercialDealType, CommercialSettlementStatus, Platform, PlatformCommercialSettlement, UnderwaterPaymentMethod, DouyinRawRecord, ShipinhaoRawRecord, XiaohongshuRawRecord } from '@/types'
import {
  ALL_PLATFORMS, PLATFORM_LABELS,
  PLATFORM_STATUS_LABELS, PLATFORM_STATUS_COLORS,
  ALL_SHOOTING_FORMATS, SHOOTING_FORMAT_LABELS,
} from '@/types'
import { formatDate, formatDateTime, formatFullDateTime, fromDateTimeLocalValue, fromNow, toDateTimeLocalValue } from '@/utils/date'
import { calcEngagement, formatNumber } from '@/utils/format'
import { getVideoDetailCreatedAt } from './videoDetailUtils'
import {
  getCommercialDealType,
  getPlatformCommercialSettlements,
  getPublishedCommercialPlatforms,
  getUnderwaterPaymentMethod,
} from './commercialUtils'

export function VideoDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const videos = useAppStore(s => s.data?.videos ?? [])
  const tags = useAppStore(s => s.data?.tags ?? [])
  const scripts = useAppStore(s => s.data?.scripts ?? [])
  const metrics = useAppStore(s => s.data?.metrics ?? [])
  const violationReasons = useAppStore(s => s.data?.settings.violationReasons ?? ['违反社区公约', '涉嫌第三方导流'])
  const hidePromotionCost = useAppStore(s => s.data?.settings.hidePromotionCost ?? false)
  const hideCommercialAmount = useAppStore(s => s.data?.settings.hideCommercialAmount ?? false)
  const updateVideo = useAppStore(s => s.updateVideo)
  const deleteVideo = useAppStore(s => s.deleteVideo)
  const addMetric = useAppStore(s => s.addMetric)
  const deleteMetric = useAppStore(s => s.deleteMetric)
  const setPlatformEntry = useAppStore(s => s.setPlatformEntry)
  const updatePlatformPublishedAt = useAppStore(s => s.updatePlatformPublishedAt)
  const updatePlatformDiagnosis = useAppStore(s => s.updatePlatformDiagnosis)
  const addPromotionRecord = useAppStore(s => s.addPromotionRecord)
  const updatePromotionRecord = useAppStore(s => s.updatePromotionRecord)
  const deletePromotionRecord = useAppStore(s => s.deletePromotionRecord)
  const updateVideoCover = useAppStore(s => s.updateVideoCover)
  const douyinRecords = useAppStore(s => s.data?.douyinRecords ?? [])
  const shipinhaoRecords = useAppStore(s => s.data?.shipinhaoRecords ?? [])
  const xiaohongshuRecords = useAppStore(s => s.data?.xiaohongshuRecords ?? [])

  const video = videos.find(v => v.id === id)
  const script = scripts.find(s => s.id === video?.scriptId)
  const videoMetrics = metrics.filter(m => m.videoId === id)
  const detailCreatedAt = video ? getVideoDetailCreatedAt(video) : undefined
  const linkedDouyin = useMemo(() => douyinRecords.filter(r => r.videoId === id), [douyinRecords, id])
  const linkedShipinhao = useMemo(() => shipinhaoRecords.filter(r => r.videoId === id), [shipinhaoRecords, id])
  const linkedXiaohongshu = useMemo(() => xiaohongshuRecords.filter(r => r.videoId === id), [xiaohongshuRecords, id])
  const hasLinkedRecords = linkedDouyin.length > 0 || linkedShipinhao.length > 0 || linkedXiaohongshu.length > 0
  const handleBack = () => {
    const historyIndex = Number(window.history.state?.idx ?? 0)
    if (historyIndex > 0) navigate(-1)
    else navigate('/videos')
  }

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
    if (orientation === 'portrait') invalidateCoverThumbnailCache(video.id)
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
    if (orientation === 'portrait') invalidateCoverThumbnailCache(video.id)
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

  const [commercialAmountDraft, setCommercialAmountDraft] = useState<string | undefined>(undefined)
  const [platformDiagnosisDrafts, setPlatformDiagnosisDrafts] = useState<Partial<Record<Platform, string>>>({})
  const [promotionModal, setPromotionModal] = useState(false)
  const [promotionEditingId, setPromotionEditingId] = useState<string | null>(null)
  const [promotionForm, setPromotionForm] = useState({
    platform: 'douyin' as Platform,
    amount: '',
    spentAt: toDateTimeLocalValue(new Date().toISOString()),
  })

  // Platform modals
  const [violationModal, setViolationModal] = useState<Platform | null>(null)
  const [violationReason, setViolationReason] = useState('')

  if (!video) {
    return (
      <PageContainer title="视频不存在">
        <Button onClick={() => navigate('/videos')}>返回列表</Button>
      </PageContainer>
    )
  }

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

  const handleCommercialAmountBlur = () => {
    if (commercialAmountDraft === undefined) return
    const parsed = parseFloat(commercialAmountDraft)
    updateVideo(video.id, { commercialAmount: isNaN(parsed) || parsed <= 0 ? undefined : parsed })
    setCommercialAmountDraft(undefined)
  }

  const updatePlatformCommercialSettlement = (
    platform: Platform,
    patch: Partial<Omit<PlatformCommercialSettlement, 'platform'>>,
  ) => {
    const settlements = getPlatformCommercialSettlements(video)
    const current = settlements.find(entry => entry.platform === platform)
    const next: PlatformCommercialSettlement = {
      platform,
      settlementStatus: current?.settlementStatus ?? 'unsettled',
      ...current,
      ...patch,
    }
    updateVideo(video.id, {
      platformCommercialSettlements: [
        ...settlements.filter(entry => entry.platform !== platform),
        next,
      ],
    })
  }

  const openNewPromotion = () => {
    const firstPublishedPlatform = video.platforms.find(platform => platform.status === 'published')?.platform
    setPromotionEditingId(null)
    setPromotionForm({
      platform: firstPublishedPlatform ?? 'douyin',
      amount: '',
      spentAt: toDateTimeLocalValue(new Date().toISOString()),
    })
    setPromotionModal(true)
  }

  const openEditPromotion = (recordId: string) => {
    const record = video.promotionRecords?.find(item => item.id === recordId)
    if (!record) return
    setPromotionEditingId(record.id)
    setPromotionForm({
      platform: record.platform,
      amount: String(record.amount),
      spentAt: toDateTimeLocalValue(record.spentAt),
    })
    setPromotionModal(true)
  }

  const handleSavePromotion = () => {
    const amount = Number(promotionForm.amount)
    if (!Number.isFinite(amount) || amount <= 0 || !promotionForm.spentAt) return
    const spentAt = fromDateTimeLocalValue(promotionForm.spentAt)
    if (promotionEditingId) {
      updatePromotionRecord(video.id, promotionEditingId, promotionForm.platform, amount, spentAt)
    } else {
      addPromotionRecord(video.id, promotionForm.platform, amount, spentAt)
    }
    setPromotionModal(false)
  }

  return (
    <PageContainer
      title={video.title}
      actions={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Button variant="ghost" size="sm" onClick={handleBack}>← 返回上一级</Button>
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

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 360px) minmax(0, 1fr)', gap: 20, alignItems: 'start' }}>
          {/* Details sidebar */}
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
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <div>
                  <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>商单</p>
                  <p style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>标记合作视频并记录商单金额</p>
                </div>
                <button
                  onClick={() => {
                    updateVideo(video.id, video.isCommercial
                      ? {
                          isCommercial: false,
                          commercialBrandName: undefined,
                          commercialDealType: undefined,
                          platformCommercialSettlements: undefined,
                          underwaterPaymentMethod: undefined,
                          commercialAmount: undefined,
                          commercialSettlementStatus: undefined,
                          commercialPaymentRecipient: undefined,
                        }
                      : {
                          isCommercial: true,
                          commercialDealType: 'platform',
                          platformCommercialSettlements: [],
                        })
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
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
                  <Input
                    label="品牌方名称"
                    placeholder="例如：品牌或客户名称"
                    value={video.commercialBrandName ?? ''}
                    onChange={e => updateVideo(video.id, { commercialBrandName: e.target.value || undefined })}
                    onBlur={e => {
                      const commercialBrandName = e.target.value.trim()
                      updateVideo(video.id, { commercialBrandName: commercialBrandName || undefined })
                    }}
                  />
                  <Select
                    label="商单类型"
                    options={[
                      { value: 'platform', label: '平台商单' },
                      { value: 'underwater', label: '水下商单' },
                    ]}
                    value={getCommercialDealType(video)}
                    onChange={e => {
                      const commercialDealType = e.target.value as CommercialDealType
                      updateVideo(video.id, {
                        commercialDealType,
                        ...(commercialDealType === 'underwater' && !video.underwaterPaymentMethod
                          ? { underwaterPaymentMethod: getUnderwaterPaymentMethod(video) }
                          : {}),
                      })
                      setCommercialAmountDraft(undefined)
                    }}
                  />

                  {getCommercialDealType(video) === 'platform' ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <p style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>款项均结算给对应平台；金额、周期和状态按平台独立记录。</p>
                      {getPublishedCommercialPlatforms(video).map(platform => {
                        const settlement = getPlatformCommercialSettlements(video).find(entry => entry.platform === platform)
                        return (
                          <div key={platform} style={{ padding: 10, border: '1px solid var(--border-subtle)', borderRadius: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
                              <PlatformIcon platform={platform} size={14} />
                              {PLATFORM_LABELS[platform]}
                              <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 400, color: 'var(--text-tertiary)' }}>结算给平台</span>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                              {hideCommercialAmount ? (
                                <div style={{ fontSize: 12, color: 'var(--text-tertiary)', alignSelf: 'end', paddingBottom: 8 }}>金额已隐藏</div>
                              ) : (
                                <Input
                                  label="金额（元）"
                                  type="number"
                                  min="0"
                                  step="1"
                                  placeholder="未设置"
                                  value={settlement?.amount ?? ''}
                                  onChange={e => {
                                    const amount = Number(e.target.value)
                                    updatePlatformCommercialSettlement(platform, { amount: e.target.value && Number.isFinite(amount) && amount > 0 ? amount : undefined })
                                  }}
                                />
                              )}
                              <Input
                                label="结算周期"
                                placeholder="如：发布后30天"
                                value={settlement?.settlementCycle ?? ''}
                                onChange={e => updatePlatformCommercialSettlement(platform, { settlementCycle: e.target.value || undefined })}
                              />
                            </div>
                            <Select
                              label="结算状态"
                              options={[
                                { value: 'unsettled', label: '未结算' },
                                { value: 'settled', label: '已结算' },
                              ]}
                              value={settlement?.settlementStatus ?? 'unsettled'}
                              onChange={e => updatePlatformCommercialSettlement(platform, { settlementStatus: e.target.value as CommercialSettlementStatus })}
                            />
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <>
                      {hideCommercialAmount ? (
                        <p style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>商单金额已在隐私设置中隐藏</p>
                      ) : (
                        <Input
                          label="一口价（元）"
                          type="number"
                          min="0"
                          step="1"
                          placeholder="商单金额"
                          value={commercialAmountDraft ?? (video.commercialAmount != null ? String(video.commercialAmount) : '')}
                          onChange={e => setCommercialAmountDraft(e.target.value)}
                          onBlur={handleCommercialAmountBlur}
                        />
                      )}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        <Select
                          label="结算状态"
                          options={[
                            { value: 'unsettled', label: '未结算' },
                            { value: 'settled', label: '已结算' },
                          ]}
                          value={video.commercialSettlementStatus ?? 'unsettled'}
                          onChange={e => updateVideo(video.id, { commercialSettlementStatus: e.target.value as CommercialSettlementStatus })}
                        />
                        <Select
                          label="付款方式"
                          options={[
                            { value: 'personal_transfer', label: '个人转账' },
                            { value: 'corporate_payment', label: '对公付款' },
                          ]}
                          value={getUnderwaterPaymentMethod(video)}
                          onChange={e => updateVideo(video.id, { underwaterPaymentMethod: e.target.value as UnderwaterPaymentMethod })}
                        />
                      </div>
                    </>
                  )}
                </div>
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

                        {/* Platform actions */}
                        <div style={{ display: 'flex', gap: 4 }}>
                          {(!pub || status !== 'published') && (
                            <ActionBtn
                              label="已发布"
                              color="var(--success)"
                              onClick={() => setPlatformEntry(video.id, platform, {
                                status: 'published',
                                publishedAt: new Date().toISOString(),
                                diagnosis: pub?.diagnosis,
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
                          {pub && (
                            <ActionBtn
                              label="清除"
                              color="var(--text-tertiary)"
                              onClick={() => setPlatformEntry(video.id, platform, null)}
                            />
                          )}
                        </div>
                      </div>

                      {/* Detail row */}
                      {pub && status === 'published' && (
                        <div style={{ marginTop: 4 }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-tertiary)' }}>
                            <span style={{ flexShrink: 0 }}>发布时间</span>
                            <input
                              type="datetime-local"
                              value={pub.publishedAt ? toDateTimeLocalValue(pub.publishedAt) : ''}
                              onChange={e => {
                                if (!e.target.value) return
                                updatePlatformPublishedAt(video.id, platform, fromDateTimeLocalValue(e.target.value))
                              }}
                              style={{
                                width: 154, height: 24, padding: '0 6px', borderRadius: 6, fontSize: 11,
                                border: '1px solid var(--border-subtle)', background: 'var(--bg-base)',
                                color: 'var(--text-primary)', outline: 'none', fontFamily: 'inherit',
                              }}
                              onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent)' }}
                              onBlur={e => { e.currentTarget.style.borderColor = 'var(--border-subtle)' }}
                            />
                          </label>
                        </div>
                      )}
                      {pub && status === 'violated' && pub.violation && (
                        <p style={{ fontSize: 11, color: 'var(--danger)', marginTop: 4, lineHeight: 1.5 }}>
                          {pub.violation.reason}
                        </p>
                      )}
                      {pub && (
                        <div style={{ marginTop: 10 }}>
                          <Textarea
                            label="平台诊断信息"
                            rows={7}
                            maxLength={2000}
                            placeholder="填写平台发布后给出的视频诊断信息，通常为 500–1000 字"
                            value={platformDiagnosisDrafts[platform] ?? pub.diagnosis ?? ''}
                            onChange={e => setPlatformDiagnosisDrafts(drafts => ({ ...drafts, [platform]: e.target.value }))}
                            onBlur={e => {
                              updatePlatformDiagnosis(video.id, platform, e.target.value)
                              setPlatformDiagnosisDrafts(drafts => {
                                const next = { ...drafts }
                                delete next[platform]
                                return next
                              })
                            }}
                          />
                          <p style={{ marginTop: 4, textAlign: 'right', fontSize: 11, color: 'var(--text-tertiary)' }}>
                            {(platformDiagnosisDrafts[platform] ?? pub.diagnosis ?? '').length}/2000 字 · 建议 500–1000 字
                          </p>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {!hidePromotionCost && (
              <div style={{ padding: 20, borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
                  <div>
                    <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>投放记录</p>
                    <p style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                      共 {(video.promotionRecords ?? []).length} 笔 · ¥{(video.promotionRecords ?? []).reduce((sum, record) => sum + record.amount, 0).toLocaleString()}
                    </p>
                  </div>
                  <Button variant="secondary" size="sm" onClick={openNewPromotion}>+ 新增投放</Button>
                </div>
                {(video.promotionRecords ?? []).length > 0 ? (
                  <div style={{ overflow: 'hidden', borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
                    {[...(video.promotionRecords ?? [])]
                      .sort((a, b) => b.spentAt.localeCompare(a.spentAt))
                      .map((record, index, records) => (
                        <div
                          key={record.id}
                          style={{
                            display: 'grid', gridTemplateColumns: 'minmax(110px, 1fr) 120px 100px',
                            alignItems: 'center', gap: 12, padding: '10px 12px',
                            borderBottom: index < records.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                            background: 'var(--bg-elevated)',
                          }}
                        >
                          <PlatformIcon platform={record.platform} size={15} showLabel />
                          <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>{formatDateTime(record.spentAt)}</span>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
                            <span style={{ fontSize: 13, fontWeight: 650, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>¥{record.amount.toLocaleString()}</span>
                            <button onClick={() => openEditPromotion(record.id)} style={{ border: 'none', background: 'transparent', color: 'var(--accent)', fontSize: 11, cursor: 'pointer', padding: 0 }}>编辑</button>
                            <button onClick={() => deletePromotionRecord(video.id, record.id)} style={{ border: 'none', background: 'transparent', color: 'var(--danger)', fontSize: 11, cursor: 'pointer', padding: 0 }}>删除</button>
                          </div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <p style={{ fontSize: 12, color: 'var(--text-tertiary)', padding: '8px 0' }}>暂无投放记录</p>
                )}
              </div>
            )}

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
              <p>记录生成：{formatFullDateTime(detailCreatedAt ?? video.createdAt)}</p>
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

        {/* Linked Analytics Data */}
        {hasLinkedRecords && <AnalyticsSection
          douyin={linkedDouyin}
          shipinhao={linkedShipinhao}
          xiaohongshu={linkedXiaohongshu}
        />}
      </div>

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

      {/* Promotion record modal */}
      <Modal
        open={promotionModal}
        onClose={() => setPromotionModal(false)}
        title={promotionEditingId ? '编辑投放记录' : '新增投放记录'}
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setPromotionModal(false)}>取消</Button>
            <Button
              variant="primary"
              disabled={!promotionForm.amount || Number(promotionForm.amount) <= 0 || !promotionForm.spentAt}
              onClick={handleSavePromotion}
            >
              保存
            </Button>
          </>
        }
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Select
            label="投放平台"
            options={ALL_PLATFORMS.map(platform => ({ value: platform, label: PLATFORM_LABELS[platform] }))}
            value={promotionForm.platform}
            onChange={e => setPromotionForm(form => ({ ...form, platform: e.target.value as Platform }))}
          />
          <Input
            label="投放金额（元）"
            type="number"
            min="0"
            step="1"
            placeholder="0"
            value={promotionForm.amount}
            onChange={e => setPromotionForm(form => ({ ...form, amount: e.target.value }))}
            autoFocus
          />
          <div style={{ gridColumn: '1 / -1' }}>
            <Input
              label="投放时间"
              type="datetime-local"
              value={promotionForm.spentAt}
              onChange={e => setPromotionForm(form => ({ ...form, spentAt: e.target.value }))}
            />
          </div>
        </div>
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
                  diagnosis: existing?.diagnosis,
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

// ===== Analytics section: linked platform data =====

type AnalyticsPlatform = 'douyin' | 'shipinhao' | 'xiaohongshu'

function AnalyticsSection({
  douyin,
  shipinhao,
  xiaohongshu,
}: {
  douyin: DouyinRawRecord[]
  shipinhao: ShipinhaoRawRecord[]
  xiaohongshu: XiaohongshuRawRecord[]
}) {
  const navigate = useNavigate()
  const [tab, setTab] = useState<AnalyticsPlatform>(() => {
    if (douyin.length > 0) return 'douyin'
    if (shipinhao.length > 0) return 'shipinhao'
    return 'xiaohongshu'
  })

  type Tab = { id: AnalyticsPlatform; label: string; count: number }
  const tabs: Tab[] = ([
    { id: 'douyin', label: '抖音', count: douyin.length },
    { id: 'shipinhao', label: '视频号', count: shipinhao.length },
    { id: 'xiaohongshu', label: '小红书', count: xiaohongshu.length },
  ] satisfies Tab[]).filter(t => t.count > 0)

  return (
    <div style={{ padding: 20, borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)' }}>
      <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>平台数据（自动关联）</p>

      <div style={{ display: 'flex', gap: 4, marginBottom: 12, borderBottom: '1px solid var(--border-subtle)' }}>
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: '8px 12px', fontSize: 12, fontWeight: tab === t.id ? 550 : 450,
              cursor: 'pointer', border: 'none', background: 'transparent',
              borderBottom: `2px solid ${tab === t.id ? 'var(--accent)' : 'transparent'}`,
              color: tab === t.id ? 'var(--text-primary)' : 'var(--text-secondary)',
              marginBottom: -1, display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            {t.label}
            <span style={{
              fontSize: 11, fontWeight: 600, minWidth: 18, padding: '1px 6px', borderRadius: 99,
              background: tab === t.id ? 'var(--accent-subtle)' : 'var(--bg-raised)',
              color: tab === t.id ? 'var(--accent)' : 'var(--text-tertiary)',
            }}>
              {t.count}
            </span>
          </button>
        ))}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center' }}>
          <span
            onClick={() => navigate('/analytics')}
            style={{
              fontSize: 11, color: 'var(--accent)', cursor: 'pointer',
              padding: '4px 8px',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.textDecoration = 'underline' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.textDecoration = 'none' }}
          >
            查看全部 →
          </span>
        </div>
      </div>

      {tab === 'douyin' && <DouyinAnalyticsTable records={douyin} />}
      {tab === 'shipinhao' && <ShipinhaoAnalyticsTable records={shipinhao} />}
      {tab === 'xiaohongshu' && <XiaohongshuAnalyticsTable records={xiaohongshu} />}
    </div>
  )
}

function DouyinAnalyticsTable({ records }: { records: DouyinRawRecord[] }) {
  const sorted = useMemo(() => [...records].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)), [records])
  const pct = (v: number) => `${(v * 100).toFixed(1)}%`
  const sec = (v: number) => `${v.toFixed(1)}s`

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
            {['发布时间', '播放', '完播率', '5s完播率', '2s跳出率', '均播时长', '点赞', '分享', '评论', '收藏', '主页访问', '涨粉'].map(h => (
              <th key={h} style={{ textAlign: h === '发布时间' ? 'left' : 'right', padding: '6px 10px', color: 'var(--text-tertiary)', fontWeight: 600, fontSize: 11, whiteSpace: 'nowrap' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map(r => (
            <tr key={r.id} style={{ borderBottom: '1px solid var(--border-faint)' }}>
              <td style={{ padding: '6px 10px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{r.publishedAt.slice(0, 10)}</td>
              <td style={{ padding: '6px 10px', color: 'var(--text-primary)', fontWeight: 500, textAlign: 'right' }}>{formatNumber(r.plays)}</td>
              <td style={{ padding: '6px 10px', color: 'var(--text-secondary)', textAlign: 'right' }}>{pct(r.completionRate)}</td>
              <td style={{ padding: '6px 10px', color: 'var(--text-secondary)', textAlign: 'right' }}>{pct(r.fiveSecRate)}</td>
              <td style={{ padding: '6px 10px', color: 'var(--text-secondary)', textAlign: 'right' }}>{pct(r.twoSecBounceRate)}</td>
              <td style={{ padding: '6px 10px', color: 'var(--text-secondary)', textAlign: 'right' }}>{sec(r.avgPlayDuration)}</td>
              <td style={{ padding: '6px 10px', color: 'var(--text-secondary)', textAlign: 'right' }}>{formatNumber(r.likes)}</td>
              <td style={{ padding: '6px 10px', color: 'var(--text-secondary)', textAlign: 'right' }}>{formatNumber(r.shares)}</td>
              <td style={{ padding: '6px 10px', color: 'var(--text-secondary)', textAlign: 'right' }}>{formatNumber(r.comments)}</td>
              <td style={{ padding: '6px 10px', color: 'var(--text-secondary)', textAlign: 'right' }}>{formatNumber(r.saves)}</td>
              <td style={{ padding: '6px 10px', color: 'var(--text-secondary)', textAlign: 'right' }}>{formatNumber(r.profileVisits)}</td>
              <td style={{ padding: '6px 10px', color: 'var(--text-secondary)', textAlign: 'right' }}>{formatNumber(r.followerGain)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ShipinhaoAnalyticsTable({ records }: { records: ShipinhaoRawRecord[] }) {
  const sorted = useMemo(() => [...records].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)), [records])
  const pct = (v: number) => `${(v * 100).toFixed(1)}%`

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
            {['发布时间', '播放', '完播率', '均播时长', '推荐', '喜欢', '评论', '分享', '关注', '转发'].map(h => (
              <th key={h} style={{ textAlign: h === '发布时间' ? 'left' : 'right', padding: '6px 10px', color: 'var(--text-tertiary)', fontWeight: 600, fontSize: 11, whiteSpace: 'nowrap' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map(r => (
            <tr key={r.id} style={{ borderBottom: '1px solid var(--border-faint)' }}>
              <td style={{ padding: '6px 10px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{r.publishedAt.slice(0, 10)}</td>
              <td style={{ padding: '6px 10px', color: 'var(--text-primary)', fontWeight: 500, textAlign: 'right' }}>{formatNumber(r.plays)}</td>
              <td style={{ padding: '6px 10px', color: 'var(--text-secondary)', textAlign: 'right' }}>{pct(r.completionRate)}</td>
              <td style={{ padding: '6px 10px', color: 'var(--text-secondary)', textAlign: 'right' }}>{r.avgPlayDuration}</td>
              <td style={{ padding: '6px 10px', color: 'var(--text-secondary)', textAlign: 'right' }}>{formatNumber(r.recommendations)}</td>
              <td style={{ padding: '6px 10px', color: 'var(--text-secondary)', textAlign: 'right' }}>{formatNumber(r.likes)}</td>
              <td style={{ padding: '6px 10px', color: 'var(--text-secondary)', textAlign: 'right' }}>{formatNumber(r.comments)}</td>
              <td style={{ padding: '6px 10px', color: 'var(--text-secondary)', textAlign: 'right' }}>{formatNumber(r.shares)}</td>
              <td style={{ padding: '6px 10px', color: 'var(--text-secondary)', textAlign: 'right' }}>{formatNumber(r.follows)}</td>
              <td style={{ padding: '6px 10px', color: 'var(--text-secondary)', textAlign: 'right' }}>{formatNumber(r.forwardChat)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function XiaohongshuAnalyticsTable({ records }: { records: XiaohongshuRawRecord[] }) {
  const sorted = useMemo(() => [...records].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)), [records])
  const pct = (v: number) => `${(v * 100).toFixed(1)}%`
  const sec = (v: number) => `${v.toFixed(0)}s`

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
            {['发布时间', '曝光', '观看量', '封面点击率', '人均观看时长', '点赞', '评论', '收藏', '分享', '涨粉', '弹幕'].map(h => (
              <th key={h} style={{ textAlign: h === '发布时间' ? 'left' : 'right', padding: '6px 10px', color: 'var(--text-tertiary)', fontWeight: 600, fontSize: 11, whiteSpace: 'nowrap' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map(r => (
            <tr key={r.id} style={{ borderBottom: '1px solid var(--border-faint)' }}>
              <td style={{ padding: '6px 10px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{r.publishedAt.slice(0, 10)}</td>
              <td style={{ padding: '6px 10px', color: 'var(--text-primary)', fontWeight: 500, textAlign: 'right' }}>{formatNumber(r.impressions)}</td>
              <td style={{ padding: '6px 10px', color: 'var(--text-secondary)', textAlign: 'right' }}>{formatNumber(r.views)}</td>
              <td style={{ padding: '6px 10px', color: 'var(--text-secondary)', textAlign: 'right' }}>{pct(r.coverCtr)}</td>
              <td style={{ padding: '6px 10px', color: 'var(--text-secondary)', textAlign: 'right' }}>{sec(r.avgWatchDuration)}</td>
              <td style={{ padding: '6px 10px', color: 'var(--text-secondary)', textAlign: 'right' }}>{formatNumber(r.likes)}</td>
              <td style={{ padding: '6px 10px', color: 'var(--text-secondary)', textAlign: 'right' }}>{formatNumber(r.comments)}</td>
              <td style={{ padding: '6px 10px', color: 'var(--text-secondary)', textAlign: 'right' }}>{formatNumber(r.saves)}</td>
              <td style={{ padding: '6px 10px', color: 'var(--text-secondary)', textAlign: 'right' }}>{formatNumber(r.shares)}</td>
              <td style={{ padding: '6px 10px', color: 'var(--text-secondary)', textAlign: 'right' }}>{formatNumber(r.follows)}</td>
              <td style={{ padding: '6px 10px', color: 'var(--text-secondary)', textAlign: 'right' }}>{formatNumber(r.danmaku)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
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
