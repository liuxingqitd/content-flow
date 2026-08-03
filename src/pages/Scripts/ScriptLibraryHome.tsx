import type { Script, Topic, Video } from '@/types'
import { Input } from '@/components/ui/Input'
import { EmptyState } from '@/components/ui/EmptyState'
import { fromNow, formatDuration } from '@/utils/date'
import {
  filterScriptsByPublicationStatus,
  getScriptLastEditedAt,
  type ScriptPublicationStatus,
} from './scriptLibrary'

interface ScriptLibraryHomeProps {
  scripts: Script[]
  topics: Topic[]
  videos: Video[]
  query: string
  publicationStatus: ScriptPublicationStatus
  onQueryChange: (query: string) => void
  onPublicationStatusChange: (status: ScriptPublicationStatus) => void
  onSelect: (script: Script) => void
  onDelete: (id: string) => void
}

export function ScriptLibraryHome({
  scripts,
  topics,
  videos,
  query,
  publicationStatus,
  onQueryChange,
  onPublicationStatusChange,
  onSelect,
  onDelete,
}: ScriptLibraryHomeProps) {
  const unpublishedScripts = filterScriptsByPublicationStatus(scripts, videos, 'unpublished')
  const publishedScripts = filterScriptsByPublicationStatus(scripts, videos, 'published')
  const visibleScripts = publicationStatus === 'unpublished' ? unpublishedScripts : publishedScripts
  const statusLabel = publicationStatus === 'unpublished' ? '未发布' : '已发布'
  const relationTitle = (script: Script) => {
    const topic = script.topicId ? topics.find(item => item.id === script.topicId) : undefined
    return topic?.title ?? videos.find(video => video.scriptId === script.id)?.title
  }

  return (
    <div style={{ flex: 1, minWidth: 0, width: '100%', height: '100%', overflowY: 'auto', padding: '20px 24px 36px', background: 'var(--bg-base)' }}>
      <div style={{ marginBottom: 18 }}>
        <div style={{ width: 300, maxWidth: '100%' }}>
          <Input placeholder="搜索逐字稿…" value={query} onChange={event => onQueryChange(event.target.value)} />
        </div>
      </div>

      <div role="group" aria-label="逐字稿发布状态筛选" style={{ display: 'flex', gap: 24, borderBottom: '1px solid var(--border-subtle)', marginBottom: 10 }}>
        {([
          ['unpublished', '未发布', unpublishedScripts.length],
          ['published', '已发布', publishedScripts.length],
        ] as const).map(([status, label, count]) => {
          const active = publicationStatus === status
          return (
            <button
              key={status}
              type="button"
              aria-pressed={active}
              onClick={() => onPublicationStatusChange(status)}
              style={{
                marginBottom: -1,
                padding: '0 1px 9px',
                border: 'none',
                borderBottom: active ? '2px solid var(--accent)' : '2px solid transparent',
                background: 'transparent',
                color: active ? 'var(--text-primary)' : 'var(--text-tertiary)',
                fontSize: 14,
                fontWeight: active ? 650 : 500,
                cursor: 'pointer',
              }}
            >
              {label} <span style={{ marginLeft: 4, fontSize: 11, fontWeight: 500, color: 'var(--text-tertiary)' }}>{count}</span>
            </button>
          )
        })}
      </div>

      {visibleScripts.length === 0 ? (
        <EmptyState
          title={query ? `没有匹配的${statusLabel}逐字稿` : `暂无${statusLabel}逐字稿`}
          description={query ? '换个关键词或状态试试' : publicationStatus === 'unpublished' ? '新建的逐字稿会显示在这里' : '关联视频发布后会显示在这里'}
        />
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
            <p style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>按最近编辑排序 · {visibleScripts.length} 篇</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
            {visibleScripts.map(script => (
              <article
                key={script.id}
                onClick={() => onSelect(script)}
                style={{
                  position: 'relative', minHeight: 158, padding: 15, borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)', cursor: 'pointer',
                  display: 'flex', flexDirection: 'column', transition: 'border-color .12s, box-shadow .12s',
                }}
                onMouseEnter={event => { event.currentTarget.style.borderColor = 'var(--border-default)'; event.currentTarget.style.boxShadow = 'var(--shadow-xs)' }}
                onMouseLeave={event => { event.currentTarget.style.borderColor = 'var(--border-subtle)'; event.currentTarget.style.boxShadow = 'none' }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end', gap: 10 }}>
                  <button
                    type="button"
                    aria-label={`删除${script.title}`}
                    onClick={event => { event.stopPropagation(); onDelete(script.id) }}
                    style={{ border: 'none', background: 'transparent', color: 'var(--text-tertiary)', padding: 3, cursor: 'pointer', fontSize: 15 }}
                  >×</button>
                </div>
                <h3 style={{ marginTop: 12, fontSize: 15, lineHeight: 1.45, fontWeight: 620, color: 'var(--text-primary)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {script.title}
                </h3>
                {relationTitle(script) && <p style={{ marginTop: 5, fontSize: 11, color: 'var(--accent)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{relationTitle(script)}</p>}
                <div style={{ marginTop: 'auto', paddingTop: 15, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, fontSize: 10, color: 'var(--text-tertiary)' }}>
                  <span>{script.wordCount} 字 · {formatDuration(script.estimatedDuration)}</span>
                  <span>编辑于 {fromNow(getScriptLastEditedAt(script))}</span>
                </div>
              </article>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
