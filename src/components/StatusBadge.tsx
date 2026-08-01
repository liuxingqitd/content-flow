import type { VideoStatus } from '@/types'
import { VIDEO_STATUS_LABELS } from '@/types'

const STATUS_STYLE: Record<VideoStatus, { bg: string; color: string; border: string }> = {
  topic:     { bg: 'var(--status-topic-bg)',     color: 'var(--status-topic-text)',     border: 'var(--status-topic-border)' },
  scripting: { bg: 'var(--status-scripting-bg)', color: 'var(--status-scripting-text)', border: 'var(--status-scripting-border)' },
  review:    { bg: 'var(--status-review-bg)',    color: 'var(--status-review-text)',    border: 'var(--status-review-border)' },
  filming:   { bg: 'var(--status-filming-bg)',   color: 'var(--status-filming-text)',   border: 'var(--status-filming-border)' },
  editing:   { bg: 'var(--status-editing-bg)',   color: 'var(--status-editing-text)',   border: 'var(--status-editing-border)' },
  pending_publish: { bg: 'var(--status-pending-publish-bg)', color: 'var(--status-pending-publish-text)', border: 'var(--status-pending-publish-border)' },
  published: { bg: 'var(--status-published-bg)', color: 'var(--status-published-text)', border: 'var(--status-published-border)' },
  archived:  { bg: 'var(--status-archived-bg)',  color: 'var(--status-archived-text)',  border: 'var(--status-archived-border)' },
}

export function StatusBadge({ status, className }: { status: VideoStatus; className?: string }) {
  const s = STATUS_STYLE[status]
  return (
    <span
      className={`status-badge ${className ?? ''}`.trim()}
      style={{
        background: s.bg, color: s.color,
        border: `1px solid ${s.border}`,
      }}
    >
      <span className="status-badge-dot" style={{ background: s.color }} />
      {VIDEO_STATUS_LABELS[status]}
    </span>
  )
}
