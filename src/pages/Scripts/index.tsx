import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Fuse from 'fuse.js'
import { useAppStore } from '@/store/appStore'
import { PageContainer } from '@/components/layout/PageContainer'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { EmptyState } from '@/components/ui/EmptyState'
import { Modal } from '@/components/ui/Modal'
import { ScriptEditor } from './ScriptEditor'
import type { Script } from '@/types'
import { fromNow, formatDate } from '@/utils/date'
import { formatDuration } from '@/utils/date'
import { readScriptContent, writeScriptContent, deleteScriptFile } from '@/services/fileSystem'
import { ScriptLibraryHome } from './ScriptLibraryHome'
import { getScriptLastEditedAt, sortScriptsByLastEdited, type ScriptPublicationStatus } from './scriptLibrary'
type SaveState = 'idle' | 'pending' | 'saving' | 'saved' | 'error'

let scriptSaveQueue: Promise<void> = Promise.resolve()

const persistScriptContent = (id: string, content: string) => {
  const save = scriptSaveQueue.then(async () => {
    await writeScriptContent(id, content)
    const wordCount = content.replace(/\s+/g, '').length
    useAppStore.getState().updateScript(id, {
      wordCount,
      estimatedDuration: Math.round(wordCount / 3.5),
      contentUpdatedAt: new Date().toISOString(),
    })
  })
  scriptSaveQueue = save.catch(() => undefined)
  return save
}

export function Scripts() {
  const { id: urlId } = useParams<{ id?: string }>()
  const navigate = useNavigate()

  const scripts = useAppStore(s => s.data?.scripts ?? [])
  const videos = useAppStore(s => s.data?.videos ?? [])
  const topics = useAppStore(s => s.data?.topics ?? [])
  const addScript = useAppStore(s => s.addScript)
  const updateScript = useAppStore(s => s.updateScript)
  const deleteScript = useAppStore(s => s.deleteScript)

  const [searchQuery, setSearchQuery] = useState('')
  const [publicationStatus, setPublicationStatus] = useState<ScriptPublicationStatus>('unpublished')
  const [selectedId, setSelectedId] = useState<string | null>(urlId ?? null)
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleValue, setTitleValue] = useState('')
  const [editorContent, setEditorContent] = useState('')
  const [loadingContent, setLoadingContent] = useState(false)
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [newModal, setNewModal] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [copyState, setCopyState] = useState<'idle' | 'copied'>('idle')

  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // track latest content + id for use inside async save without stale closure
  const pendingRef = useRef<{ id: string; content: string } | null>(null)

  const sortedScripts = useMemo(() => sortScriptsByLastEdited(scripts), [scripts])

  const fuse = useMemo(() => new Fuse(sortedScripts, {
    keys: ['title'],
    threshold: 0.35,
    includeMatches: true,
  }), [sortedScripts])

  const filteredScripts = useMemo(() => {
    return searchQuery.trim() ? fuse.search(searchQuery).map(r => r.item) : sortedScripts
  }, [searchQuery, fuse, sortedScripts])

  const selectedScript = scripts.find(s => s.id === selectedId)

  useEffect(() => {
    setSelectedId(urlId ?? null)
  }, [urlId])

  useEffect(() => {
    let cancelled = false
    const loadContent = async () => {
      if (!selectedId) {
        setEditorContent('')
        setSaveState('idle')
        return
      }
      setLoadingContent(true)
      setSaveState('idle')
      await scriptSaveQueue
      const content = await readScriptContent(selectedId)
      if (cancelled) return
      setEditorContent(content)
      setLoadingContent(false)
    }

    void loadContent()
    return () => { cancelled = true }
  }, [selectedId])

  const doSave = useCallback(async (id: string, content: string) => {
    if (pendingRef.current?.id === id && pendingRef.current.content === content) {
      pendingRef.current = null
    }
    setSaveState('saving')
    try {
      await persistScriptContent(id, content)
      setSaveState('saved')
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
      savedTimerRef.current = setTimeout(() => setSaveState('idle'), 2000)
    } catch (e) {
      if (!pendingRef.current) pendingRef.current = { id, content }
      setSaveState('error')
      console.error('[save] failed:', e)
      throw e
    }
  }, [])

  const handleContentChange = useCallback((content: string) => {
    setEditorContent(content)
    if (!selectedId) return

    pendingRef.current = { id: selectedId, content }
    setSaveState('pending')

    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
    autoSaveTimer.current = setTimeout(() => {
      const p = pendingRef.current
      if (p) void doSave(p.id, p.content).catch(() => undefined)
    }, 1000)
  }, [selectedId, doSave])

  const handleCopy = useCallback(async () => {
    if (!editorContent) return
    await navigator.clipboard.writeText(editorContent)
    setCopyState('copied')
    setTimeout(() => setCopyState('idle'), 1500)
  }, [editorContent])

  // Cmd+S 立即保存，不等防抖
  const handleForceSave = useCallback(() => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
    const p = pendingRef.current
    if (p) {
      void doSave(p.id, p.content).catch(() => undefined)
    } else if (selectedId && editorContent) {
      void doSave(selectedId, editorContent).catch(() => undefined)
    }
  }, [selectedId, editorContent, doSave])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        handleForceSave()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [handleForceSave])

  // 卸载时把最后一笔防抖内容落盘，避免从编辑页返回稿件库时丢字。
  useEffect(() => () => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
    const pending = pendingRef.current
    if (pending) {
      pendingRef.current = null
      void persistScriptContent(pending.id, pending.content)
        .catch(error => console.error('[save on exit] failed:', error))
    }
  }, [])

  const handleCreate = () => {
    if (!newTitle.trim()) return
    addScript({
      title: newTitle.trim(),
      wordCount: 0,
      estimatedDuration: 0,
      tagIds: [],
    })
    setNewModal(false)
    setNewTitle('')
    setTimeout(() => {
      const newest = useAppStore.getState().data?.scripts.slice(-1)[0]
      if (newest) {
        setSelectedId(newest.id)
        navigate(`/scripts/${newest.id}`, { replace: true })
      }
    }, 50)
  }

  const handleDelete = async (id: string) => {
    if (pendingRef.current?.id === id) {
      pendingRef.current = null
      if (autoSaveTimer.current) {
        clearTimeout(autoSaveTimer.current)
        autoSaveTimer.current = null
      }
    }
    await scriptSaveQueue
    await deleteScriptFile(id)
    deleteScript(id)
    if (selectedId === id) {
      setSelectedId(null)
      navigate('/scripts', { replace: true })
    }
    setDeleteConfirm(null)
  }

  const handleSelect = async (script: Script) => {
    if (script.id === selectedId) return
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
    const pending = pendingRef.current
    try {
      if (pending) await doSave(pending.id, pending.content)
      else await scriptSaveQueue
    } catch {
      return
    }
    setSelectedId(script.id)
    navigate(`/scripts/${script.id}`, { replace: true })
  }

  const handleBackToLibrary = async () => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
    const pending = pendingRef.current
    try {
      if (pending) await doSave(pending.id, pending.content)
      else await scriptSaveQueue
    } catch {
      return
    }
    setSelectedId(null)
    navigate('/scripts', { replace: true })
  }

  const handleTitleSave = () => {
    if (selectedScript && titleValue.trim() && titleValue.trim() !== selectedScript.title) {
      updateScript(selectedScript.id, { title: titleValue.trim() })
    }
    setEditingTitle(false)
  }

  const saveLabel =
    saveState === 'pending' ? null :
    saveState === 'saving'  ? '保存中…' :
    saveState === 'saved'   ? '已保存' :
    saveState === 'error'   ? '保存失败' :
    null

  const saveLabelColor =
    saveState === 'saving' ? 'var(--text-tertiary)' :
    saveState === 'saved'  ? 'var(--success)' :
    saveState === 'error'  ? 'var(--danger)' :
    'var(--text-tertiary)'

  return (
    <PageContainer
      title="逐字稿"
      subtitle={`${scripts.length} 篇稿件`}
      noPadding
      actions={
        <div style={{ display: 'flex', gap: 6 }}>
          {selectedScript && <Button variant="ghost" size="sm" onClick={handleBackToLibrary}>返回稿件库</Button>}
          <Button variant="primary" size="sm" onClick={() => setNewModal(true)}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            新建逐字稿
          </Button>
        </div>
      }
    >
      <div style={{ display: 'flex', height: '100%', overflow: 'hidden', background: 'var(--bg-base)' }}>
        {!selectedScript ? (
          <ScriptLibraryHome
            scripts={filteredScripts}
            topics={topics}
            videos={videos}
            query={searchQuery}
            publicationStatus={publicationStatus}
            onQueryChange={setSearchQuery}
            onPublicationStatusChange={setPublicationStatus}
            onSelect={handleSelect}
            onDelete={setDeleteConfirm}
          />
        ) : (
          <>
        {/* Left: list */}
        <div style={{
          width: 280, flexShrink: 0, display: 'flex', flexDirection: 'column',
          borderRight: '1px solid var(--border-subtle)',
          background: 'var(--bg-surface)',
        }}>
          <div style={{ padding: 12, borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-surface)' }}>
            <Input
              placeholder="搜索稿件…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ background: 'var(--bg-raised)' }}
            />
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>
            {filteredScripts.length === 0 ? (
              <EmptyState
                title="暂无稿件"
                description={searchQuery ? '没有匹配的结果' : '点击「新建逐字稿」开始创作'}
              />
            ) : (
              filteredScripts.map(script => {
                const topic = script.topicId ? topics.find(t => t.id === script.topicId) : null
                const video = !topic ? videos.find(v => v.scriptId === script.id) : null
                const isSelected = selectedId === script.id
                return (
                  <div
                    key={script.id}
                    onClick={() => handleSelect(script)}
                    style={{
                      position: 'relative',
                      padding: '11px 14px 10px',
                      cursor: 'pointer',
                      borderBottom: '1px solid var(--border-faint)',
                      borderLeft: isSelected ? '2px solid var(--accent)' : '2px solid transparent',
                      background: isSelected ? 'var(--accent-subtle)' : 'transparent',
                      transition: 'background var(--duration-fast) var(--ease-out)',
                    }}
                    onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)' }}
                    onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                    className="group"
                  >
                    <p style={{ fontSize: 13, fontWeight: 550, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 4, letterSpacing: '-0.01em' }}>
                      {script.title}
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-tertiary)' }}>
                      <span>{script.wordCount} 字</span>
                      <span>·</span>
                      <span>{formatDuration(script.estimatedDuration)}</span>
                      {topic && (
                        <>
                          <span>·</span>
                          <span style={{ color: 'var(--accent)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 80 }}>{topic.title}</span>
                        </>
                      )}
                      {!topic && video && (
                        <>
                          <span>·</span>
                          <span style={{ color: 'var(--accent)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 80 }}>{video.title}</span>
                        </>
                      )}
                    </div>
                    <p style={{ marginTop: 5, fontSize: 10, color: 'var(--text-tertiary)' }}>编辑于 {fromNow(getScriptLastEditedAt(script))}</p>

                    <button
                      onClick={e => { e.stopPropagation(); setDeleteConfirm(script.id) }}
                      style={{
                        position: 'absolute', right: 8, top: 8,
                        opacity: 0, padding: 5, borderRadius: 'var(--radius-sm)', border: 'none',
                        background: 'transparent', cursor: 'pointer',
                        color: 'var(--text-tertiary)', transition: 'opacity .1s, background .1s',
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(248,113,113,0.12)'; (e.currentTarget as HTMLElement).style.color = 'var(--danger)' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--text-tertiary)' }}
                      className="delete-btn"
                    >
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path d="M1 3h10M4 3V2a1 1 0 011-1h2a1 1 0 011 1v1M5 5.5v3M7 5.5v3M2 3l.6 7a1 1 0 001 .9h4.8a1 1 0 001-.9L10 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                      </svg>
                    </button>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Right: editor */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {selectedScript ? (
            <>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                minHeight: 58, padding: '8px 16px 8px 20px', borderBottom: '1px solid var(--border-subtle)', flexShrink: 0,
                background: 'var(--bg-surface)',
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  {editingTitle ? (
                    <input
                      autoFocus
                      value={titleValue}
                      onChange={e => setTitleValue(e.target.value)}
                      onBlur={handleTitleSave}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleTitleSave()
                        if (e.key === 'Escape') { setTitleValue(selectedScript.title); setEditingTitle(false) }
                      }}
                      style={{
                        width: '100%', fontSize: 15, fontWeight: 600,
                        background: 'var(--bg-raised)', border: '1px solid var(--accent)',
                        borderRadius: 'var(--radius-sm)',
                        color: 'var(--text-primary)', outline: 'none',
                        fontFamily: 'inherit', padding: '3px 7px',
                        boxShadow: '0 0 0 3px var(--accent-subtle)',
                      }}
                    />
                  ) : (
                    <h2
                      onClick={() => { setTitleValue(selectedScript.title); setEditingTitle(true) }}
                      title="点击编辑标题"
                      style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', cursor: 'text', transition: 'color .1s', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', letterSpacing: '-0.02em' }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'var(--accent)'}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)'}
                    >
                      {selectedScript.title}
                    </h2>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>
                    <span>{editorContent.replace(/\s+/g, '').length} 字</span>
                    <span>·</span>
                    <span>预估 {formatDuration(Math.round(editorContent.replace(/\s+/g, '').length / 3.5))}</span>
                    <span>·</span>
                    <span>正文更新于 {formatDate(getScriptLastEditedAt(selectedScript))}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                  {saveLabel && (
                    <span style={{ fontSize: 12, color: saveLabelColor, transition: 'color .2s' }}>
                      {saveLabel}
                    </span>
                  )}

                  <button
                    onClick={handleCopy}
                    disabled={!editorContent}
                    title="复制全文"
                    style={{
                      display: 'flex', alignItems: 'center', gap: 4,
                      padding: '5px 8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)',
                      background: copyState === 'copied' ? 'rgba(52,211,153,0.12)' : 'transparent',
                      color: copyState === 'copied' ? 'var(--success)' : 'var(--text-tertiary)',
                      cursor: editorContent ? 'pointer' : 'not-allowed',
                      opacity: editorContent ? 1 : 0.4,
                      fontSize: 12, transition: 'background .15s, color .15s',
                    }}
                    onMouseEnter={e => { if (editorContent && copyState === 'idle') (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)' }}
                    onMouseLeave={e => { if (copyState === 'idle') (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                  >
                    {copyState === 'copied' ? (
                      <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                        <path d="M2 7l3.5 3.5L11 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    ) : (
                      <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                        <rect x="4" y="4" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
                        <path d="M4 3V2.5A1.5 1.5 0 012.5 1H2A1.5 1.5 0 00.5 2.5v6A1.5 1.5 0 002 10h.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                      </svg>
                    )}
                    {copyState === 'copied' ? '已复制' : '复制'}
                  </button>
                </div>
              </div>

              {loadingContent ? (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid var(--accent)', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
                </div>
              ) : (
                <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
                  <ScriptEditor
                    key={selectedId}
                    content={editorContent}
                    onChange={handleContentChange}
                  />
                </div>
              )}
            </>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <EmptyState
                icon={
                  <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                    <rect x="6" y="4" width="36" height="40" rx="4" stroke="currentColor" strokeWidth="2"/>
                    <path d="M14 16h20M14 24h20M14 32h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                }
                title="选择一篇稿件开始编辑"
                description="从左侧列表选择，或新建一篇逐字稿"
              />
            </div>
          )}
        </div>
          </>
        )}
      </div>

      <Modal
        open={newModal}
        onClose={() => setNewModal(false)}
        title="新建逐字稿"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setNewModal(false)}>取消</Button>
            <Button variant="primary" onClick={handleCreate} disabled={!newTitle.trim()}>创建</Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Input
            label="稿件标题"
            placeholder="例：我用这个方法1个月读了12本书"
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            autoFocus
            onKeyDown={e => { if (e.key === 'Enter') handleCreate() }}
          />
        </div>
      </Modal>

      <Modal
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="删除逐字稿"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteConfirm(null)}>取消</Button>
            <Button variant="danger" onClick={() => deleteConfirm && handleDelete(deleteConfirm)}>
              确认删除
            </Button>
          </>
        }
      >
        <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
          删除后将同时删除本地的 .md 文件，此操作不可撤销。
        </p>
      </Modal>
    </PageContainer>
  )
}
