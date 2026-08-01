import type { Script, Topic, Video } from '@/types'
import { Input } from '@/components/ui/Input'
import { EmptyState } from '@/components/ui/EmptyState'
import { fromNow, formatDuration } from '@/utils/date'
import { getRecentScriptGroups, getScriptLastEditedAt } from './scriptLibrary'

interface ScriptLibraryHomeProps {
  scripts: Script[]
  topics: Topic[]
  videos: Video[]
  query: string
  onQueryChange: (query: string) => void
  onSelect: (script: Script) => void
  onDelete: (id: string) => void
}

export function ScriptLibraryHome({
  scripts,
  topics,
  videos,
  query,
  onQueryChange,
  onSelect,
  onDelete,
}: ScriptLibraryHomeProps) {
  const { recentEdited, recentCreated } = getRecentScriptGroups(scripts)
  const recentEditedIds = new Set(recentEdited.map(script => script.id))
  const recentCreatedIds = new Set(recentCreated.map(script => script.id))
  const relationTitle = (script: Script) => {
    const topic = script.topicId ? topics.find(item => item.id === script.topicId) : undefined
    return topic?.title ?? videos.find(video => video.scriptId === script.id)?.title
  }

  return (
    <div style={{ flex: 1, minWidth: 0, width: '100%', height: '100%', overflowY: 'auto', padding: '20px 24px 36px', background: 'var(--bg-base)' }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ width: 300, maxWidth: '100%' }}>
          <Input placeholder="搜索逐字稿…" value={query} onChange={event => onQueryChange(event.target.value)} />
        </div>
      </div>

      {scripts.length === 0 ? (
        <EmptyState title="没有匹配的逐字稿" description={query ? '换个关键词试试' : '暂无稿件'} />
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 12, marginBottom: 24 }}>
            <RecentPanel title="最近编辑" description="优先继续正在修改的稿件" scripts={recentEdited} dateOf={getScriptLastEditedAt} onSelect={onSelect} />
            <RecentPanel title="最近创建" description="快速找到刚加入的稿件" scripts={recentCreated} dateOf={script => script.createdAt} onSelect={onSelect} />
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
            <div>
              <h2 style={{ fontSize: 14, fontWeight: 650, color: 'var(--text-primary)' }}>全部逐字稿</h2>
              <p style={{ marginTop: 2, fontSize: 11, color: 'var(--text-tertiary)' }}>按最近编辑排序 · {scripts.length} 篇</p>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
            {scripts.map(script => (
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
                <div style={{ display: 'flex', gap: 5, marginTop: 8 }}>
                  {recentEditedIds.has(script.id) && <SmallMarker label="最近编辑" color="var(--accent)" />}
                  {recentCreatedIds.has(script.id) && <SmallMarker label="最近创建" color="var(--info)" />}
                </div>
              </article>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function RecentPanel({
  title,
  description,
  scripts,
  dateOf,
  onSelect,
}: {
  title: string
  description: string
  scripts: Script[]
  dateOf: (script: Script) => string
  onSelect: (script: Script) => void
}) {
  return (
    <section style={{ border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', background: 'var(--bg-surface)', padding: 14 }}>
      <h2 style={{ fontSize: 13, fontWeight: 650, color: 'var(--text-primary)' }}>{title}</h2>
      <p style={{ marginTop: 2, marginBottom: 9, fontSize: 10, color: 'var(--text-tertiary)' }}>{description}</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {scripts.map(script => (
          <button
            key={script.id}
            type="button"
            onClick={() => onSelect(script)}
            style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', alignItems: 'center', gap: 8, padding: '7px 8px', border: 'none', borderRadius: 'var(--radius-md)', background: 'transparent', textAlign: 'left', cursor: 'pointer', color: 'inherit' }}
            onMouseEnter={event => { event.currentTarget.style.background = 'var(--bg-hover)' }}
            onMouseLeave={event => { event.currentTarget.style.background = 'transparent' }}
          >
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12, color: 'var(--text-primary)' }}>{script.title}</span>
            <span style={{ fontSize: 10, color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>{fromNow(dateOf(script))}</span>
          </button>
        ))}
      </div>
    </section>
  )
}

function SmallMarker({ label, color }: { label: string; color: string }) {
  return <span style={{ fontSize: 9, fontWeight: 600, color, padding: '2px 5px', border: '1px solid currentColor', borderRadius: 99 }}>{label}</span>
}
