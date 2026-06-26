import { useState, useMemo } from 'react'
import {
  DndContext, DragOverlay, PointerSensor, KeyboardSensor,
  useSensor, useSensors, type DragEndEvent, type DragStartEvent, type DragOverEvent,
} from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { useDroppable } from '@dnd-kit/core'
import { useAppStore } from '@/store/appStore'
import { VideoCard } from './VideoCard'
import { VideoSlideOver } from './VideoSlideOver'
import { PublishChecklistDialog } from './PublishChecklistDialog'
import { TransitionChecklistDialog } from './TransitionChecklistDialog'
import { Modal } from '@/components/ui/Modal'
import { Input, Textarea } from '@/components/ui/Input'
import type { Video, VideoStatus, Tag } from '@/types'
import { VIDEO_STATUS_LABELS, VIDEO_STATUS_ORDER } from '@/types'

const COLUMNS: VideoStatus[] = ['topic', 'scripting', 'review', 'filming', 'editing', 'published']

const STATUS_DOT: Record<VideoStatus, string> = {
  topic:      'var(--status-topic, var(--status-topic-text))',
  scripting:  'var(--status-scripting, var(--status-scripting-text))',
  review:     'var(--status-review, var(--status-review-text))',
  filming:    'var(--status-filming, var(--status-filming-text))',
  editing:    'var(--status-editing, var(--status-editing-text))',
  published:  'var(--status-published, var(--status-published-text))',
  archived:   'var(--status-archived, var(--status-archived-text))',
}

function KanbanColumn({
  status, videos, tags, onCardClick, onAddClick, isDragOver,
}: {
  status: VideoStatus
  videos: Video[]
  tags: Tag[]
  onCardClick: (v: Video) => void
  onAddClick: (s: VideoStatus) => void
  isDragOver: boolean
}) {
  const { setNodeRef } = useDroppable({ id: status })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: 264, flexShrink: 0 }}>
      {/* Column header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 4px', marginBottom: 8,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: STATUS_DOT[status], flexShrink: 0 }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {VIDEO_STATUS_LABELS[status]}
          </span>
          {videos.length > 0 && (
            <span style={{
              fontSize: 11, fontWeight: 600, padding: '1px 6px',
              borderRadius: 99,
              background: 'var(--bg-raised, var(--bg-elevated))',
              color: 'var(--text-tertiary)',
              border: '1px solid var(--border-subtle)',
            }}>
              {videos.length}
            </span>
          )}
        </div>
        <button
          onClick={() => onAddClick(status)}
          style={{
            width: 24, height: 24, borderRadius: 5,
            border: '1px solid var(--border-subtle)',
            background: 'transparent', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--text-tertiary)', transition: 'all .12s',
          }}
          onMouseEnter={e => {
            const el = e.currentTarget as HTMLElement
            el.style.background = 'var(--bg-hover)'
            el.style.color = 'var(--text-primary)'
            el.style.borderColor = 'var(--border-default)'
          }}
          onMouseLeave={e => {
            const el = e.currentTarget as HTMLElement
            el.style.background = 'transparent'
            el.style.color = 'var(--text-tertiary)'
            el.style.borderColor = 'var(--border-subtle)'
          }}
        >
          <svg width="10" height="10" fill="none" viewBox="0 0 10 10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <line x1="5" y1="1" x2="5" y2="9"/><line x1="1" y1="5" x2="9" y2="5"/>
          </svg>
        </button>
      </div>

      {/* Drop zone */}
      <div
        ref={setNodeRef}
        style={{
          flex: 1,
          minHeight: 120,
          borderRadius: 'var(--radius-lg)',
          padding: 6,
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          background: isDragOver ? 'var(--accent-subtle)' : 'var(--bg-base)',
          border: `1px solid ${isDragOver ? 'var(--accent)' : 'var(--border-subtle)'}`,
          transition: 'all .15s',
        }}
      >
        <SortableContext items={videos.map(v => v.id)} strategy={verticalListSortingStrategy}>
          {videos.map(v => (
            <VideoCard key={v.id} video={v} tags={tags} onClick={onCardClick} />
          ))}
        </SortableContext>

        {videos.length === 0 && (
          <button
            onClick={() => onAddClick(status)}
            style={{
              width: '100%', padding: '16px 0',
              borderRadius: 'var(--radius-md)', border: '1px dashed var(--border-default)',
              background: 'transparent', cursor: 'pointer',
              fontSize: 12, color: 'var(--text-tertiary)',
              transition: 'all .12s',
            }}
            onMouseEnter={e => {
              const el = e.currentTarget as HTMLElement
              el.style.borderColor = 'var(--border-default)'
              el.style.color = 'var(--text-secondary)'
            }}
            onMouseLeave={e => {
              const el = e.currentTarget as HTMLElement
              el.style.borderColor = 'var(--border-subtle)'
              el.style.color = 'var(--text-tertiary)'
            }}
          >
            + 添加视频
          </button>
        )}
      </div>
    </div>
  )
}

export function Kanban() {
  const videos = useAppStore(s => s.data?.videos ?? [])
  const tags = useAppStore(s => s.data?.tags ?? [])
  const moveVideo = useAppStore(s => s.moveVideo)
  const addVideo = useAppStore(s => s.addVideo)

  const [activeVideo, setActiveVideo] = useState<Video | null>(null)
  const [overColumnId, setOverColumnId] = useState<VideoStatus | null>(null)
  const [slideOver, setSlideOver] = useState<Video | null>(null)
  const [filterTagId, setFilterTagId] = useState<string | null>(null)
  const [showArchived, setShowArchived] = useState(false)
  const [addModal, setAddModal] = useState<{ open: boolean; status: VideoStatus }>({ open: false, status: 'topic' })
  const [pendingMove, setPendingMove] = useState<{
    videoId: string; targetStatus: VideoStatus; videoTitle: string
  } | null>(null)
  const [pendingTopicScripting, setPendingTopicScripting] = useState<{ videoId: string; videoTitle: string } | null>(null)
  const [pendingScriptingReview, setPendingScriptingReview] = useState<{ videoId: string; videoTitle: string } | null>(null)
  const [pendingPublish, setPendingPublish] = useState<{ videoId: string; videoTitle: string } | null>(null)
  const [pendingFilmingEditing, setPendingFilmingEditing] = useState<{ videoId: string; videoTitle: string } | null>(null)
  const [newForm, setNewForm] = useState({ title: '', description: '' })

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const filtered = useMemo(() =>
    filterTagId ? videos.filter(v => v.tagIds.includes(filterTagId)) : videos,
    [videos, filterTagId]
  )

  const columnVideos = useMemo(() => {
    const cols = {} as Record<VideoStatus, Video[]>
    for (const s of VIDEO_STATUS_ORDER) {
      cols[s] = filtered
        .filter(v => v.status === s)
        .sort((a, b) => s === 'published'
          ? b.createdAt.localeCompare(a.createdAt)
          : 0)
    }
    return cols
  }, [filtered])

  const onDragOver = ({ over }: DragOverEvent) => {
    if (!over) { setOverColumnId(null); return }
    if (VIDEO_STATUS_ORDER.includes(over.id as VideoStatus)) {
      setOverColumnId(over.id as VideoStatus)
    } else {
      const overVideo = videos.find(v => v.id === over.id)
      setOverColumnId(overVideo?.status ?? null)
    }
  }

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveVideo(null)
    setOverColumnId(null)
    if (!over) return

    let targetStatus: VideoStatus
    if (VIDEO_STATUS_ORDER.includes(over.id as VideoStatus)) {
      targetStatus = over.id as VideoStatus
    } else {
      const overVideo = videos.find(v => v.id === over.id)
      if (!overVideo) return
      targetStatus = overVideo.status
    }

    const videoId = active.id as string
    const video = videos.find(v => v.id === videoId)
    if (!video || video.status === targetStatus) return

    if (video.status === 'topic' && targetStatus === 'scripting') {
      setPendingTopicScripting({ videoId, videoTitle: video.title })
      return
    }
    if (video.status === 'scripting' && targetStatus === 'review') {
      setPendingScriptingReview({ videoId, videoTitle: video.title })
      return
    }
    if (video.status === 'review' && targetStatus === 'filming') {
      setPendingMove({ videoId, targetStatus, videoTitle: video.title })
      return
    }
    if (video.status === 'filming' && targetStatus === 'editing') {
      setPendingFilmingEditing({ videoId, videoTitle: video.title })
      return
    }
    if (targetStatus === 'published') {
      setPendingPublish({ videoId, videoTitle: video.title })
      return
    }
    moveVideo(videoId, targetStatus)
  }

  const handleAdd = () => {
    if (!newForm.title.trim()) return
    addVideo({ title: newForm.title.trim(), description: newForm.description.trim() || undefined, status: addModal.status, tagIds: [], platforms: [] })
    setAddModal({ open: false, status: 'topic' })
    setNewForm({ title: '', description: '' })
  }

  const displayCols = showArchived ? [...COLUMNS, 'archived' as VideoStatus] : COLUMNS

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg-base)' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        minHeight: 'var(--header-h, 52px)',
        padding: '10px 24px',
        borderBottom: '1px solid var(--border-subtle)',
        background: 'var(--bg-surface)',
        flexShrink: 0,
      }}>
        <div>
          <h1 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>看板</h1>
          <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>拖拽卡片切换阶段</p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <FilterChip active={!filterTagId} onClick={() => setFilterTagId(null)}>全部</FilterChip>
            {tags.map(tag => (
              <button
                key={tag.id}
                onClick={() => setFilterTagId(filterTagId === tag.id ? null : tag.id)}
                style={{
                  padding: '4px 10px', borderRadius: 99, fontSize: 12, fontWeight: 500,
                  border: 'none', cursor: 'pointer', transition: 'all .12s',
                  background: filterTagId === tag.id ? tag.color : 'var(--bg-raised, var(--bg-elevated))',
                  color: filterTagId === tag.id ? '#fff' : 'var(--text-secondary)',
                }}
              >
                {tag.name}
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowArchived(!showArchived)}
            style={{
              padding: '5px 10px', borderRadius: 'var(--radius-sm)', fontSize: 12,
              border: '1px solid var(--border-subtle)',
              background: showArchived ? 'var(--bg-active)' : 'transparent',
              color: 'var(--text-tertiary)', cursor: 'pointer',
              transition: 'all .12s',
            }}
            onMouseEnter={e => {
              const el = e.currentTarget as HTMLElement
              el.style.borderColor = 'var(--border-default)'
              el.style.color = 'var(--text-secondary)'
            }}
            onMouseLeave={e => {
              const el = e.currentTarget as HTMLElement
              el.style.borderColor = 'var(--border-subtle)'
              el.style.color = 'var(--text-tertiary)'
            }}
          >
            {showArchived ? '隐藏归档' : '显示归档'}
          </button>

          <button
            onClick={() => setAddModal({ open: true, status: 'topic' })}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 14px', borderRadius: 'var(--radius-md)', fontSize: 13, fontWeight: 600,
              background: 'var(--accent)', color: '#fff', border: 'none', cursor: 'pointer',
              transition: 'background .12s, box-shadow .12s',
              boxShadow: '0 1px 3px rgba(124,88,237,.35)',
            }}
            onMouseEnter={e => {
              const el = e.currentTarget as HTMLElement
              el.style.background = 'var(--accent-hover)'
              el.style.boxShadow = '0 2px 6px rgba(124,88,237,.45)'
            }}
            onMouseLeave={e => {
              const el = e.currentTarget as HTMLElement
              el.style.background = 'var(--accent)'
              el.style.boxShadow = '0 1px 3px rgba(124,88,237,.35)'
            }}
          >
            <svg width="12" height="12" fill="none" viewBox="0 0 12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="6" y1="1" x2="6" y2="11"/><line x1="1" y1="6" x2="11" y2="6"/>
            </svg>
            新建视频
          </button>
        </div>
      </div>

      {/* Board */}
      <DndContext
        sensors={sensors}
        onDragStart={({ active }: DragStartEvent) => setActiveVideo(videos.find(v => v.id === active.id) ?? null)}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
      >
        <div style={{
          flex: 1, overflowX: 'auto',
          display: 'flex', gap: 12,
          padding: '16px 24px',
          alignItems: 'flex-start',
        }}>
          {displayCols.map(status => (
            <KanbanColumn
              key={status}
              status={status}
              videos={columnVideos[status]}
              tags={tags}
              onCardClick={setSlideOver}
              onAddClick={s => setAddModal({ open: true, status: s })}
              isDragOver={overColumnId === status}
            />
          ))}
        </div>

        <DragOverlay>
          {activeVideo && (
            <VideoCard video={activeVideo} tags={tags} onClick={() => {}} isDragOverlay />
          )}
        </DragOverlay>
      </DndContext>

      <VideoSlideOver video={slideOver} onClose={() => setSlideOver(null)} />

      <TransitionChecklistDialog
        open={pendingTopicScripting !== null}
        videoTitle={pendingTopicScripting?.videoTitle ?? ''}
        transitionKey="topic→scripting"
        title="确认开始「写稿中」"
        description="正式进入写稿前，请确认选题已准备就绪。"
        confirmLabel="确认，开始写稿"
        accentColor="var(--accent-secondary)"
        iconSvg={
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--accent-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 20h9"/>
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
          </svg>
        }
        onConfirm={() => {
          if (pendingTopicScripting) moveVideo(pendingTopicScripting.videoId, 'scripting')
          setPendingTopicScripting(null)
        }}
        onCancel={() => setPendingTopicScripting(null)}
      />

      <TransitionChecklistDialog
        open={pendingScriptingReview !== null}
        videoTitle={pendingScriptingReview?.videoTitle ?? ''}
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
          if (pendingScriptingReview) moveVideo(pendingScriptingReview.videoId, 'review')
          setPendingScriptingReview(null)
        }}
        onCancel={() => setPendingScriptingReview(null)}
      />

      <TransitionChecklistDialog
        open={pendingMove !== null}
        videoTitle={pendingMove?.videoTitle ?? ''}
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
          if (pendingMove) moveVideo(pendingMove.videoId, pendingMove.targetStatus)
          setPendingMove(null)
        }}
        onCancel={() => setPendingMove(null)}
      />

      <PublishChecklistDialog
        open={pendingPublish !== null}
        videoTitle={pendingPublish?.videoTitle ?? ''}
        onConfirm={() => {
          if (pendingPublish) moveVideo(pendingPublish.videoId, 'published')
          setPendingPublish(null)
        }}
        onCancel={() => setPendingPublish(null)}
      />

      <TransitionChecklistDialog
        open={pendingFilmingEditing !== null}
        videoTitle={pendingFilmingEditing?.videoTitle ?? ''}
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
          if (pendingFilmingEditing) moveVideo(pendingFilmingEditing.videoId, 'editing')
          setPendingFilmingEditing(null)
        }}
        onCancel={() => setPendingFilmingEditing(null)}
      />

      <Modal
        open={addModal.open}
        onClose={() => setAddModal({ open: false, status: 'topic' })}
        title={`新建视频 · ${VIDEO_STATUS_LABELS[addModal.status]}`}
        size="md"
        footer={
          <>
            <FooterBtn onClick={() => setAddModal({ open: false, status: 'topic' })}>取消</FooterBtn>
            <PrimaryBtn onClick={handleAdd} disabled={!newForm.title.trim()}>创建</PrimaryBtn>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Input label="视频标题 *" placeholder="例：普通人如何在30岁前实现财务自由" value={newForm.title} onChange={e => setNewForm(f => ({ ...f, title: e.target.value }))} autoFocus />
          <Textarea label="简介（可选）" placeholder="视频的核心内容或角度" rows={3} value={newForm.description} onChange={e => setNewForm(f => ({ ...f, description: e.target.value }))} />
        </div>
      </Modal>
    </div>
  )
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '4px 10px', borderRadius: 99, fontSize: 12, fontWeight: 500,
        border: 'none', cursor: 'pointer', transition: 'all .12s',
        background: active ? 'var(--accent)' : 'var(--bg-raised, var(--bg-elevated))',
        color: active ? '#fff' : 'var(--text-secondary)',
      }}
    >
      {children}
    </button>
  )
}

function FooterBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{
      padding: '6px 14px', borderRadius: 'var(--radius-md)', fontSize: 13,
      background: 'transparent', border: '1px solid var(--border-default)',
      color: 'var(--text-secondary)', cursor: 'pointer',
      transition: 'all .12s', fontFamily: 'inherit',
    }}
    onMouseEnter={e => {
      const el = e.currentTarget as HTMLElement
      el.style.background = 'var(--bg-hover)'
      el.style.color = 'var(--text-primary)'
    }}
    onMouseLeave={e => {
      const el = e.currentTarget as HTMLElement
      el.style.background = 'transparent'
      el.style.color = 'var(--text-secondary)'
    }}
    >
      {children}
    </button>
  )
}

function PrimaryBtn({ onClick, disabled, children }: { onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '6px 14px', borderRadius: 'var(--radius-md)', fontSize: 13, fontWeight: 600,
        background: disabled ? 'var(--bg-raised, var(--bg-elevated))' : 'var(--accent)',
        color: disabled ? 'var(--text-tertiary)' : '#fff',
        border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all .12s', fontFamily: 'inherit',
        boxShadow: disabled ? 'none' : '0 1px 3px rgba(124,88,237,.35)',
      }}
      onMouseEnter={e => {
        if (disabled) return
        const el = e.currentTarget as HTMLElement
        el.style.background = 'var(--accent-hover)'
      }}
      onMouseLeave={e => {
        if (disabled) return
        const el = e.currentTarget as HTMLElement
        el.style.background = 'var(--accent)'
      }}
    >
      {children}
    </button>
  )
}
