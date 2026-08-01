import { memo } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Video, Tag } from '@/types'
import { PLATFORM_STATUS_COLORS } from '@/types'
import { PlatformIcon } from '@/components/PlatformIcon'
import { fromNow } from '@/utils/date'

interface VideoCardProps {
  video: Video
  tags: Tag[]
  onClick: (video: Video) => void
  isDragOverlay?: boolean
}

export const VideoCard = memo(function VideoCard({ video, tags, onClick, isDragOverlay }: VideoCardProps) {
  const {
    attributes, listeners, setNodeRef,
    transform, transition, isDragging,
  } = useSortable({ id: video.id })

  const cardTags = tags.filter(t => video.tagIds.includes(t.id))
  const settledPlatforms = video.platforms.filter(p => p.status === 'published')

  const style: React.CSSProperties = {
    transform: isDragOverlay
      ? `${CSS.Transform.toString(transform)} scale(1.01)`
      : CSS.Transform.toString(transform) ?? undefined,
    transition: isDragOverlay ? undefined : transition,
    background: 'var(--bg-surface)',
    border: `1px ${isDragging ? 'dashed' : 'solid'} ${isDragging ? 'var(--accent)' : 'var(--border-subtle)'}`,
    borderRadius: 'var(--radius-lg)',
    padding: '11px 12px',
    cursor: isDragOverlay ? 'grabbing' : 'grab',
    opacity: isDragging ? 0.45 : 1,
    boxShadow: isDragOverlay
      ? 'var(--shadow-md)'
      : 'none',
    userSelect: 'none',
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => !isDragging && onClick(video)}
      onMouseEnter={e => {
        if (!isDragging && !isDragOverlay) {
          const el = e.currentTarget as HTMLElement
          el.style.borderColor = 'var(--border-default)'
          el.style.boxShadow = 'none'
        }
      }}
      onMouseLeave={e => {
        if (!isDragOverlay) {
          const el = e.currentTarget as HTMLElement
          el.style.borderColor = 'var(--border-subtle)'
          el.style.boxShadow = 'none'
        }
      }}
    >
      {/* Tags */}
      {cardTags.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
          {cardTags.slice(0, 3).map(tag => (
            <span
              key={tag.id}
              style={{
                display: 'inline-flex', alignItems: 'center',
                gap: 5, padding: '0 5px', borderRadius: 4,
                fontSize: 11, fontWeight: 500,
                background: 'var(--bg-raised)',
                color: 'var(--text-secondary)',
              }}
            >
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: tag.color }} />
              {tag.name}
            </span>
          ))}
        </div>
      )}

      {/* Title */}
      <p style={{
        fontSize: 13.5, fontWeight: 530, lineHeight: 1.5,
        color: 'var(--text-primary)',
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
        marginBottom: 10,
      }}>
        {video.title}
      </p>

      {/* Footer */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          {video.platforms.length === 0 && (
            <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>未发布</span>
          )}
          {settledPlatforms.map(p => {
            const status = p.status ?? 'published'
            const color = PLATFORM_STATUS_COLORS[status]
            return (
              <div key={p.platform} style={{ position: 'relative', display: 'inline-flex' }}>
                <PlatformIcon platform={p.platform} size={15} />
                <span style={{
                  position: 'absolute', top: -2, right: -2,
                  width: 5, height: 5, borderRadius: '50%',
                  background: color,
                  border: '1px solid var(--bg-elevated)',
                }} />
              </div>
            )
          })}
        </div>
        <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
          {fromNow(video.updatedAt)}
        </span>
      </div>
    </div>
  )
})
