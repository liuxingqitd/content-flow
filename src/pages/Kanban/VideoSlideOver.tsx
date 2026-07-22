import { useEffect, useState } from 'react'
import { PublishChecklistDialog } from './PublishChecklistDialog'
import { TransitionChecklistDialog } from './TransitionChecklistDialog'
import { useNavigate } from 'react-router-dom'
import type { Video } from '@/types'
import { VIDEO_STATUS_LABELS, VIDEO_STATUS_ORDER, PLATFORM_STATUS_LABELS, PLATFORM_STATUS_COLORS, SHOOTING_FORMAT_LABELS } from '@/types'
import { useAppStore } from '@/store/appStore'
import { StatusBadge } from '@/components/StatusBadge'
import { PlatformIcon } from '@/components/PlatformIcon'
import { fromNow } from '@/utils/date'

interface Props { video: Video | null; onClose: () => void }

const Divider = () => <div style={{ height: 1, background: 'var(--border-subtle)', margin: '0 0 16px' }} />
const Label = ({ children }: { children: React.ReactNode }) => (
  <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>{children}</p>
)

export function VideoSlideOver({ video, onClose }: Props) {
  const navigate = useNavigate()
  const moveVideo = useAppStore(s => s.moveVideo)
  const tags = useAppStore(s => s.data?.tags ?? [])
  const scripts = useAppStore(s => s.data?.scripts ?? [])
  const allVideos = useAppStore(s => s.data?.videos ?? [])
  const videoRelations = useAppStore(s => s.data?.videoRelations ?? [])

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [onClose])

  const [showReviewConfirm, setShowReviewConfirm] = useState(false)
  const [showScriptingReviewChecklist, setShowScriptingReviewChecklist] = useState(false)
  const [showPublishChecklist, setShowPublishChecklist] = useState(false)
  const [showFilmingEditingChecklist, setShowFilmingEditingChecklist] = useState(false)

  if (!video) return null

  const videoTags = tags.filter(t => video.tagIds.includes(t.id))
  const script = scripts.find(s => s.id === video.scriptId)
  const idx = VIDEO_STATUS_ORDER.indexOf(video.status)
  const nextStatus = idx < VIDEO_STATUS_ORDER.length - 2 ? VIDEO_STATUS_ORDER[idx + 1] : null
  const relatedVideos = videoRelations
    .filter(r => r.fromVideoId === video.id || r.toVideoId === video.id)
    .map(relation => {
      const relatedVideoId = relation.fromVideoId === video.id ? relation.toVideoId : relation.fromVideoId
      const relatedVideo = allVideos.find(v => v.id === relatedVideoId)
      return relatedVideo ? { relation, video: relatedVideo } : null
    })
    .filter(item => item !== null)
    .slice(0, 2)

  return (
    <>
      <div
        style={{ position: 'fixed', inset: 0, zIndex: 30, background: 'rgba(0,0,0,0.18)' }}
        onClick={onClose}
      />
      <div
        style={{
          position: 'fixed', top: 0, right: 0, height: '100%', width: 340,
          zIndex: 40,
          background: 'var(--bg-surface)',
          borderLeft: '1px solid var(--border-default)',
          boxShadow: 'var(--shadow-xl)',
          display: 'flex', flexDirection: 'column',
          animation: 'slideRight .22s ease-out',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 18px',
          borderBottom: '1px solid var(--border-subtle)',
          flexShrink: 0,
        }}>
          <StatusBadge status={video.status} />
          <button
            onClick={onClose}
            style={{
              width: 26, height: 26, borderRadius: 6, border: 'none',
              background: 'transparent', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--text-tertiary)',
            }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg-elevated)'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
          >
            <svg width="12" height="12" fill="none" viewBox="0 0 12 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <line x1="1" y1="1" x2="11" y2="11"/><line x1="11" y1="1" x2="1" y2="11"/>
            </svg>
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '18px' }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.4, marginBottom: 14 }}>
            {video.title}
          </h2>

          {videoTags.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 8 }}>
              {videoTags.map(tag => (
                <span key={tag.id} style={{
                  padding: '2px 9px', borderRadius: 99,
                  fontSize: 11, fontWeight: 500,
                  background: tag.color + '25', color: tag.color,
                }}>{tag.name}</span>
              ))}
            </div>
          )}

          {(video.shootingFormats ?? []).length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 16 }}>
              {(video.shootingFormats ?? []).map(fmt => (
                <span key={fmt} style={{
                  padding: '2px 9px', borderRadius: 99,
                  fontSize: 11, fontWeight: 500,
                  background: 'var(--accent-alpha)', color: 'var(--accent)',
                  border: '1px solid var(--accent)',
                }}>{SHOOTING_FORMAT_LABELS[fmt]}</span>
              ))}
            </div>
          )}

          <Divider />

          {video.platforms.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <Label>发布平台</Label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {video.platforms.map(p => {
                  const status = p.status ?? 'published'
                  const color = PLATFORM_STATUS_COLORS[status]
                  return (
                    <div key={p.platform}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <PlatformIcon platform={p.platform} size={16} showLabel />
                        <span style={{
                          marginLeft: 'auto', padding: '1px 6px', borderRadius: 99,
                          fontSize: 10, fontWeight: 600,
                          background: color + '22', color,
                        }}>
                          {PLATFORM_STATUS_LABELS[status]}
                        </span>
                      </div>
                      {status === 'violated' && p.violation?.reason && (
                        <div style={{ marginTop: 3, marginLeft: 24, fontSize: 11, color: 'var(--text-tertiary)' }}>
                          {p.violation.reason.slice(0, 28)}{p.violation.reason.length > 28 ? '…' : ''}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {video.description && (
            <div style={{ marginBottom: 16 }}>
              <Label>简介</Label>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{video.description}</p>
            </div>
          )}

          {script && (
            <div style={{ marginBottom: 16 }}>
              <Label>关联逐字稿</Label>
              <button
                onClick={() => navigate(`/scripts/${script.id}`)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 12px', borderRadius: 8,
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--bg-elevated)',
                  cursor: 'pointer', textAlign: 'left',
                  transition: 'border-color .12s',
                }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-default)'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-subtle)'}
              >
                <svg width="14" height="14" fill="none" viewBox="0 0 14 14" stroke="var(--text-tertiary)" strokeWidth="1.5" strokeLinecap="round">
                  <rect x="1.5" y="1" width="11" height="12" rx="1.5"/>
                  <line x1="4" y1="4.5" x2="10" y2="4.5"/><line x1="4" y1="7" x2="10" y2="7"/><line x1="4" y1="9.5" x2="7" y2="9.5"/>
                </svg>
                <div>
                  <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{script.title}</p>
                  <p style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{script.wordCount} 字 · {Math.round(script.estimatedDuration / 60)} 分钟</p>
                </div>
              </button>
            </div>
          )}

          {relatedVideos.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <Label>相关视频</Label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {relatedVideos.map(({ relation, video: relatedVideo }) => (
                  <button
                    key={relation.id}
                    onClick={() => navigate(`/videos/${relatedVideo.id}`)}
                    style={{
                      width: '100%', padding: '9px 10px', borderRadius: 8,
                      border: '1px solid var(--border-subtle)',
                      background: 'var(--bg-elevated)',
                      cursor: 'pointer', textAlign: 'left',
                      transition: 'border-color .12s',
                    }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-default)'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-subtle)'}
                  >
                    <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.4 }}>
                      {relatedVideo.title}
                    </p>
                    {relation.note && (
                      <p style={{ marginTop: 3, fontSize: 11, color: 'var(--text-tertiary)', lineHeight: 1.5 }}>
                        {relation.note.slice(0, 42)}{relation.note.length > 42 ? '…' : ''}
                      </p>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <Label>进度记录</Label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[...video.statusHistory].reverse().map((h, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{VIDEO_STATUS_LABELS[h.status]}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-tertiary)', marginLeft: 'auto' }}>{fromNow(h.changedAt)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 18px', borderTop: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {nextStatus && (
            <button
              onClick={() => {
                if (video.status === 'scripting' && nextStatus === 'review') {
                  setShowScriptingReviewChecklist(true)
                  return
                }
                if (video.status === 'review' && nextStatus === 'filming') {
                  setShowReviewConfirm(true)
                  return
                }
                if (video.status === 'filming' && nextStatus === 'editing') {
                  setShowFilmingEditingChecklist(true)
                  return
                }
                if (nextStatus === 'published') {
                  setShowPublishChecklist(true)
                  return
                }
                moveVideo(video.id, nextStatus)
                onClose()
              }}
              style={{
                width: '100%', padding: '9px', borderRadius: 8,
                background: 'var(--accent)', color: '#fff',
                border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                transition: 'background .12s',
              }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--accent-hover)'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'var(--accent)'}
            >
              推进到「{VIDEO_STATUS_LABELS[nextStatus]}」→
            </button>
          )}
          <button
            onClick={() => navigate(`/videos/${video.id}`)}
            style={{
              width: '100%', padding: '9px', borderRadius: 8,
              background: 'var(--bg-elevated)', color: 'var(--text-primary)',
              border: '1px solid var(--border-default)', cursor: 'pointer', fontSize: 13,
              transition: 'background .12s',
            }}
          >
            查看完整详情
          </button>
        </div>
      </div>
      <TransitionChecklistDialog
        open={showScriptingReviewChecklist}
        videoTitle={video.title}
        transitionKey="scripting→review"
        title="确认提交到「待审核」"
        description="提交审核前，请确认以下检查项均已完成。"
        confirmLabel="确认，提交审核"
        accentColor="var(--accent)"
        iconSvg={
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
            <polyline points="10 9 9 9 8 9"/>
          </svg>
        }
        onConfirm={() => {
          moveVideo(video.id, 'review')
          setShowScriptingReviewChecklist(false)
          onClose()
        }}
        onCancel={() => setShowScriptingReviewChecklist(false)}
      />

      <TransitionChecklistDialog
        open={showReviewConfirm}
        videoTitle={video.title}
        transitionKey="review→filming"
        title="确认推进到「拍摄中」"
        description="请确认以下内容均已通过审核，方可推进至拍摄阶段。"
        confirmLabel="已确认，推进拍摄"
        accentColor="var(--status-filming-text)"
        iconSvg={
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--status-filming-text)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            <polyline points="9 12 11 14 15 10"/>
          </svg>
        }
        onConfirm={() => {
          moveVideo(video.id, nextStatus!)
          setShowReviewConfirm(false)
          onClose()
        }}
        onCancel={() => setShowReviewConfirm(false)}
      />

      <PublishChecklistDialog
        open={showPublishChecklist}
        videoTitle={video.title}
        onConfirm={() => {
          moveVideo(video.id, 'published')
          setShowPublishChecklist(false)
          onClose()
        }}
        onCancel={() => setShowPublishChecklist(false)}
      />

      <TransitionChecklistDialog
        open={showFilmingEditingChecklist}
        videoTitle={video.title}
        transitionKey="filming→editing"
        title="确认推进到「剪辑中」"
        description="进入剪辑前，请确认以下检查项均已完成。"
        confirmLabel="确认，进入剪辑"
        accentColor="var(--status-editing-text)"
        iconSvg={
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--status-editing-text)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="6" cy="6" r="3"/>
            <circle cx="6" cy="18" r="3"/>
            <line x1="20" y1="4" x2="8.12" y2="15.88"/>
            <line x1="14.47" y1="14.48" x2="20" y2="20"/>
            <line x1="8.12" y1="8.12" x2="12" y2="12"/>
          </svg>
        }
        onConfirm={() => {
          moveVideo(video.id, 'editing')
          setShowFilmingEditingChecklist(false)
          onClose()
        }}
        onCancel={() => setShowFilmingEditingChecklist(false)}
      />
    </>
  )
}
