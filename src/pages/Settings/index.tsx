import { useEffect, useState } from 'react'

const PRESET_COLORS = ['#7C3AED','#2563EB','#0EA5E9','#059669','#84CC16','#D97706','#DC2626','#DB2777','#64748B','#374151']
import { useAppStore } from '@/store/appStore'
import { PageContainer } from '@/components/layout/PageContainer'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { clearStoredHandle, pickDirectory, isSecureContext, isFileSystemSupported, getDataDirectoryInfo, type DataDirectoryInfo } from '@/services/fileSystem'
import type { Tag, ChecklistItem, TransitionKey, AppSettings } from '@/types'
import { AIProviderSettings } from '@/copilot/AIProviderSettings'

export function Settings() {
  const data = useAppStore(s => s.data)
  const tags = data?.tags ?? []
  const updateSettings = useAppStore(s => s.updateSettings)
  const addTag = useAppStore(s => s.addTag)
  const updateTag = useAppStore(s => s.updateTag)
  const deleteTag = useAppStore(s => s.deleteTag)
  const loadData = useAppStore(s => s.loadData)

  const checklistItems = data?.checklistItems ?? []
  const addChecklistItem = useAppStore(s => s.addChecklistItem)
  const updateChecklistItem = useAppStore(s => s.updateChecklistItem)
  const deleteChecklistItem = useAppStore(s => s.deleteChecklistItem)

  const transitionChecklists = data?.transitionChecklists
  const addTransitionChecklistItem = useAppStore(s => s.addTransitionChecklistItem)
  const updateTransitionChecklistItem = useAppStore(s => s.updateTransitionChecklistItem)
  const deleteTransitionChecklistItem = useAppStore(s => s.deleteTransitionChecklistItem)

  const [tagModal, setTagModal] = useState<{ mode: 'new' | 'edit'; tag?: Tag } | null>(null)
  const [tagForm, setTagForm] = useState({ name: '', color: '#7C3AED' })
  const [checklistModal, setChecklistModal] = useState<{ mode: 'new' | 'edit'; item?: ChecklistItem } | null>(null)
  const [checklistText, setChecklistText] = useState('')
  const [transitionModal, setTransitionModal] = useState<{ key: TransitionKey; mode: 'new' | 'edit'; item?: ChecklistItem } | null>(null)
  const [transitionText, setTransitionText] = useState('')
  const [reconnecting, setReconnecting] = useState(false)
  const [dataDirectoryInfo, setDataDirectoryInfo] = useState<DataDirectoryInfo | null>(null)

  type ReasonField = 'violationReasons'
  const [reasonModal, setReasonModal] = useState<{ field: ReasonField; mode: 'new' | 'edit'; index?: number } | null>(null)
  const [reasonText, setReasonText] = useState('')

  const violationReasons = data?.settings.violationReasons ?? []

  useEffect(() => {
    let cancelled = false
    getDataDirectoryInfo()
      .then(info => {
        if (!cancelled) setDataDirectoryInfo(info)
      })
      .catch(() => {
        if (!cancelled) setDataDirectoryInfo(null)
      })
    return () => { cancelled = true }
  }, [data])

  const openNewReason = (field: ReasonField) => { setReasonText(''); setReasonModal({ field, mode: 'new' }) }
  const openEditReason = (field: ReasonField, index: number, text: string) => { setReasonText(text); setReasonModal({ field, mode: 'edit', index }) }

  const handleSaveReason = () => {
    if (!reasonText.trim() || !reasonModal) return
    const field = reasonModal.field
    const current: string[] = (data?.settings[field] ?? []) as string[]
    let next: string[]
    if (reasonModal.mode === 'new') {
      next = [...current, reasonText.trim()]
    } else {
      next = current.map((r, i) => i === reasonModal.index ? reasonText.trim() : r)
    }
    updateSettings({ [field]: next } as Partial<AppSettings>)
    setReasonModal(null)
  }

  const handleDeleteReason = (field: ReasonField, index: number) => {
    const current: string[] = (data?.settings[field] ?? []) as string[]
    updateSettings({ [field]: current.filter((_, i) => i !== index) } as Partial<AppSettings>)
  }

  const openNewTag = () => { setTagForm({ name: '', color: '#7C3AED' }); setTagModal({ mode: 'new' }) }
  const openEditTag = (tag: Tag) => { setTagForm({ name: tag.name, color: tag.color }); setTagModal({ mode: 'edit', tag }) }

  const openNewChecklist = () => { setChecklistText(''); setChecklistModal({ mode: 'new' }) }
  const openEditChecklist = (item: ChecklistItem) => { setChecklistText(item.text); setChecklistModal({ mode: 'edit', item }) }

  const openNewTransitionChecklist = (key: TransitionKey) => { setTransitionText(''); setTransitionModal({ key, mode: 'new' }) }
  const openEditTransitionChecklist = (key: TransitionKey, item: ChecklistItem) => { setTransitionText(item.text); setTransitionModal({ key, mode: 'edit', item }) }

  const handleSaveTransitionChecklist = () => {
    if (!transitionText.trim() || !transitionModal) return
    if (transitionModal.mode === 'new') {
      addTransitionChecklistItem(transitionModal.key, transitionText.trim())
    } else if (transitionModal.item) {
      updateTransitionChecklistItem(transitionModal.key, transitionModal.item.id, transitionText.trim())
    }
    setTransitionModal(null)
  }

  const handleSaveChecklist = () => {
    if (!checklistText.trim()) return
    if (checklistModal?.mode === 'new') {
      addChecklistItem(checklistText.trim())
    } else if (checklistModal?.item) {
      updateChecklistItem(checklistModal.item.id, checklistText.trim())
    }
    setChecklistModal(null)
  }

  const handleSaveTag = () => {
    if (!tagForm.name.trim()) return
    if (tagModal?.mode === 'new') {
      addTag({ name: tagForm.name.trim(), color: tagForm.color })
    } else if (tagModal?.tag) {
      updateTag(tagModal.tag.id, { name: tagForm.name.trim(), color: tagForm.color })
    }
    setTagModal(null)
  }

  const handleExport = () => {
    if (!data) return
    const json = JSON.stringify(data, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ip_content_backup_${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleReconnect = async () => {
    if (!isSecureContext()) {
      alert('当前不在安全上下文中。Docker 部署时请通过 http://localhost:5174 访问，而非 IP 地址。')
      return
    }
    if (!isFileSystemSupported()) {
      alert('您的浏览器不支持 File System Access API，请使用 Chrome 或 Edge。')
      return
    }
    setReconnecting(true)
    try {
      await clearStoredHandle()
      await pickDirectory()
      await loadData()
      setDataDirectoryInfo(await getDataDirectoryInfo())
    } finally {
      setReconnecting(false)
    }
  }

  const sectionTitle = (text: string) => (
    <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.015em' }}>{text}</h2>
  )

  const groupLabel = (text: string) => (
    <div style={{
      fontSize: 11, fontWeight: 650, color: 'var(--text-tertiary)',
      letterSpacing: '0.06em',
      paddingBottom: 12,
      borderBottom: '1px solid var(--border-subtle)',
    }}>
      {text}
    </div>
  )

  const itemListStyle: React.CSSProperties = {
    borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)',
    background: 'var(--bg-surface)', overflow: 'hidden',
  }

  const renderItemRow = (
    key: string,
    label: React.ReactNode,
    onEdit: () => void,
    onDelete: () => void,
    isLast: boolean,
  ) => (
    <div
      key={key}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        minHeight: 52, padding: '10px 16px',
        borderBottom: isLast ? 'none' : '1px solid var(--border-subtle)',
        background: 'var(--bg-surface)',
        transition: 'background var(--duration-fast)',
      }}
      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)'}
      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg-surface)'}
    >
      {label}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <button
          onClick={onEdit}
          style={{ fontSize: 11, color: 'var(--text-secondary)', padding: '4px 8px', background: 'transparent', border: 'none', cursor: 'pointer', borderRadius: 'var(--radius-sm)', transition: 'all var(--duration-fast)' }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)'}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'var(--text-tertiary)'}
        >
          编辑
        </button>
        <button
          onClick={onDelete}
          style={{ fontSize: 11, color: 'var(--text-tertiary)', padding: '4px 8px', background: 'transparent', border: 'none', cursor: 'pointer', borderRadius: 'var(--radius-sm)', transition: 'all var(--duration-fast)' }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'var(--danger)'}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'var(--text-tertiary)'}
        >
          删除
        </button>
      </div>
    </div>
  )

  const renderTransitionSection = (key: TransitionKey, label: string) => {
    const items = transitionChecklists?.[key] ?? []
    return (
      <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 12, fontWeight: 550, color: 'var(--text-secondary)' }}>{label}</span>
          <Button variant="secondary" size="sm" onClick={() => openNewTransitionChecklist(key)}>+ 新建检查项</Button>
        </div>
        <div style={itemListStyle}>
          {items.length === 0 ? (
            <div style={{ padding: '14px 16px', fontSize: 12, color: 'var(--text-tertiary)' }}>
              暂无检查项，状态变更时将直接放行
            </div>
          ) : (
            items.map((item, i) => renderItemRow(
              item.id,
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                  background: 'var(--bg-elevated)', border: '1px solid var(--border-default)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, fontWeight: 700, color: 'var(--text-tertiary)',
                }}>
                  {i + 1}
                </div>
                <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>{item.text}</span>
              </div>,
              () => openEditTransitionChecklist(key, item),
              () => deleteTransitionChecklistItem(key, item.id),
              i === items.length - 1,
            ))
          )}
        </div>
      </div>
    )
  }

  return (
    <PageContainer title="设置">
      <div style={{ width: '100%', maxWidth: 720, display: 'flex', flexDirection: 'column', gap: 48 }}>

        {/* ── 系统 ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          {groupLabel('系统')}

          <section>
            <div style={{ marginBottom: 14 }}>
              {sectionTitle('外观')}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {(['dark', 'light'] as const).map(t => {
                const active = data?.settings.theme === t
                return (
                  <button
                    key={t}
                    onClick={() => updateSettings({ theme: t })}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '7px 14px', borderRadius: 'var(--radius-md)', fontSize: 12, fontWeight: 550, cursor: 'pointer',
                      border: `1px solid ${active ? 'var(--border-focus)' : 'var(--border-default)'}`,
                      background: active ? 'var(--accent-subtle)' : 'transparent',
                      color: active ? 'var(--accent)' : 'var(--text-secondary)',
                      transition: 'all var(--duration-fast)',
                    }}
                  >
                    {t === 'dark' ? (
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M12 7.5A5 5 0 016.5 2 5 5 0 1012 7.5z" stroke="currentColor" strokeWidth="1.5"/>
                      </svg>
                    ) : (
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <circle cx="7" cy="7" r="2.5" stroke="currentColor" strokeWidth="1.5"/>
                        <path d="M7 1v1.5M7 11.5V13M1 7h1.5M11.5 7H13M2.8 2.8l1.1 1.1M10.1 10.1l1.1 1.1M2.8 11.2l1.1-1.1M10.1 3.9l1.1-1.1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                    )}
                    {t === 'dark' ? '深色模式' : '浅色模式'}
                  </button>
                )
              })}
            </div>
          </section>

          <section>
            <div style={{ marginBottom: 14 }}>
              {sectionTitle('隐私')}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {([
                {
                  title: '投放金额',
                  value: data?.settings.hidePromotionCost ?? false,
                  onChange: (value: boolean) => updateSettings({ hidePromotionCost: value }),
                  options: [
                    { value: false, label: '显示投放金额' },
                    { value: true, label: '隐藏投放金额' },
                  ],
                },
                {
                  title: '商单信息',
                  value: data?.settings.hideCommercialAmount ?? false,
                  onChange: (value: boolean) => updateSettings({ hideCommercialAmount: value }),
                  options: [
                    { value: false, label: '显示商单信息' },
                    { value: true, label: '隐藏商单信息' },
                  ],
                },
              ] as const).map(group => (
                <div key={group.title} style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <span style={{ width: 64, fontSize: 12, color: 'var(--text-secondary)', fontWeight: 550 }}>{group.title}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {group.options.map(({ value, label }) => {
                      const active = group.value === value
                      return (
                        <button
                          key={label}
                          onClick={() => group.onChange(value)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 8,
                            padding: '7px 14px', borderRadius: 'var(--radius-md)', fontSize: 12, fontWeight: 550, cursor: 'pointer',
                            border: `1px solid ${active ? 'var(--border-focus)' : 'var(--border-default)'}`,
                            background: active ? 'var(--accent-subtle)' : 'transparent',
                            color: active ? 'var(--accent)' : 'var(--text-secondary)',
                            transition: 'all var(--duration-fast)',
                          }}
                        >
                          {label}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
            <p style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 8 }}>
              演示或分享时可分别隐藏投放成本和商单相关数据
            </p>
          </section>

          <AIProviderSettings />

          <section>
            <div style={{ marginBottom: 14 }}>
              {sectionTitle('数据管理')}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{
                display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16,
                minHeight: 68, padding: '12px 16px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)',
              }}>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>数据目录</p>
                  <p
                    title={dataDirectoryInfo?.label ?? undefined}
                    style={{
                      fontSize: 12,
                      color: dataDirectoryInfo ? 'var(--text-secondary)' : 'var(--text-tertiary)',
                      marginTop: 4,
                      fontFamily: 'ui-monospace, SF Mono, Menlo, Monaco, Consolas, monospace',
                      overflowWrap: 'anywhere',
                      lineHeight: 1.6,
                    }}
                  >
                    {dataDirectoryInfo?.label ?? '未选择数据目录'}
                  </p>
                  {dataDirectoryInfo?.kind === 'name' && (
                    <p style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 4 }}>
                      当前浏览器只允许应用读取目录名称，完整路径不会暴露给网页
                    </p>
                  )}
                </div>
              </div>
              {[
                {
                  title: '导出备份',
                  desc: '将所有数据导出为 JSON 文件',
                  action: <Button variant="secondary" size="sm" onClick={handleExport}>导出</Button>,
                },
                {
                  title: '重新选择数据目录',
                  desc: '更改或重新授权本地数据存储目录',
                  action: <Button variant="secondary" size="sm" loading={reconnecting} onClick={handleReconnect}>重新选择</Button>,
                },
              ].map(item => (
                <div key={item.title} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  minHeight: 68, padding: '12px 16px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)',
                }}>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{item.title}</p>
                    <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>{item.desc}</p>
                  </div>
                  {item.action}
                </div>
              ))}
            </div>
          </section>

          <section>
            <div style={{ marginBottom: 14 }}>
              {sectionTitle('快捷键')}
            </div>
            <div style={itemListStyle}>
              {[
                ['⌘ + S', '保存逐字稿'],
                ['Esc', '关闭弹窗 / 侧边栏'],
              ].map(([key, desc], i, arr) => (
                <div key={key} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 16px',
                  borderBottom: i < arr.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                }}>
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{desc}</span>
                  <kbd style={{
                    padding: '2px 8px', borderRadius: 4,
                    border: '1px solid var(--border-default)',
                    fontSize: 11, fontFamily: 'ui-monospace, SF Mono, monospace', color: 'var(--text-tertiary)',
                  }}>{key}</kbd>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* ── 内容创作 ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          {groupLabel('内容创作')}

          <section>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14, gap: 16 }}>
              <div>
                {sectionTitle('标签管理')}
              </div>
              <Button variant="secondary" size="sm" onClick={openNewTag}>+ 新建标签</Button>
            </div>
            <div style={itemListStyle}>
              {tags.length === 0 ? (
                <div style={{ padding: 24, textAlign: 'center', fontSize: 12, color: 'var(--text-tertiary)' }}>暂无标签</div>
              ) : (
                tags.map((tag, i) => renderItemRow(
                  tag.id,
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 12, height: 12, borderRadius: '50%', background: tag.color, flexShrink: 0 }} />
                    <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>{tag.name}</span>
                  </div>,
                  () => openEditTag(tag),
                  () => deleteTag(tag.id),
                  i === tags.length - 1,
                ))
              )}
            </div>
          </section>
        </div>

        {/* ── 看板流程 ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          {groupLabel('看板流程')}

          <section>
            <div style={{ marginBottom: 14 }}>
              {sectionTitle('状态转换检查项')}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {renderTransitionSection('topic→scripting', '待启动 → 写稿中')}
              {renderTransitionSection('scripting→review', '写稿中 → 待审核')}
              {renderTransitionSection('review→filming', '待审核 → 拍摄中')}
              {renderTransitionSection('filming→editing', '拍摄中 → 剪辑中')}
            </div>
          </section>

          <section>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14, gap: 16 }}>
              <div>
                {sectionTitle('剪辑中 → 已发布（发布前检查项）')}
              </div>
              <Button variant="secondary" size="sm" onClick={openNewChecklist}>+ 新建检查项</Button>
            </div>
            <div style={itemListStyle}>
              {checklistItems.length === 0 ? (
                <div style={{ padding: 24, textAlign: 'center', fontSize: 12, color: 'var(--text-tertiary)' }}>暂无检查项</div>
              ) : (
                checklistItems.map((item, i) => renderItemRow(
                  item.id,
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                      background: 'var(--bg-elevated)', border: '1px solid var(--border-default)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 10, fontWeight: 700, color: 'var(--text-tertiary)',
                    }}>
                      {i + 1}
                    </div>
                    <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>{item.text}</span>
                  </div>,
                  () => openEditChecklist(item),
                  () => deleteChecklistItem(item.id),
                  i === checklistItems.length - 1,
                ))
              )}
            </div>
          </section>
        </div>

        {/* ── 平台发布 ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          {groupLabel('平台发布')}

          <section>
            <div style={{ marginBottom: 14 }}>
              {sectionTitle('平台标注选项')}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {([
                { field: 'violationReasons' as ReasonField, label: '违规原因', items: violationReasons },
              ]).map(({ field, label, items }) => (
                <div key={field}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 550, color: 'var(--text-secondary)' }}>{label}</span>
                    <Button variant="secondary" size="sm" onClick={() => openNewReason(field)}>+ 新建</Button>
                  </div>
                  <div style={itemListStyle}>
                    {items.length === 0 ? (
                      <div style={{ padding: '14px 16px', fontSize: 12, color: 'var(--text-tertiary)' }}>暂无选项</div>
                    ) : (
                      items.map((item, i) => renderItemRow(
                        `${field}-${i}`,
                        <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>{item}</span>,
                        () => openEditReason(field, i, item),
                        () => handleDeleteReason(field, i),
                        i === items.length - 1,
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

      </div>

      {/* Tag Modal */}
      <Modal
        open={!!tagModal}
        onClose={() => setTagModal(null)}
        title={tagModal?.mode === 'new' ? '新建标签' : '编辑标签'}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setTagModal(null)}>取消</Button>
            <Button variant="primary" onClick={handleSaveTag} disabled={!tagForm.name.trim()}>保存</Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Input label="标签名称" value={tagForm.name} onChange={e => setTagForm(f => ({ ...f, name: e.target.value }))} autoFocus />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)' }}>颜色</label>
              <span style={{
                padding: '3px 10px', borderRadius: 99, fontSize: 12, fontWeight: 500,
                background: `${tagForm.color}20`, color: tagForm.color,
              }}>
                {tagForm.name || '预览'}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {PRESET_COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setTagForm(f => ({ ...f, color: c }))}
                  style={{
                    width: 28, height: 28, borderRadius: '50%', background: c,
                    border: tagForm.color === c ? '2px solid var(--text-primary)' : '2px solid transparent',
                    outline: tagForm.color === c ? '2px solid var(--bg-surface)' : 'none',
                    outlineOffset: '-4px',
                    cursor: 'pointer', padding: 0, flexShrink: 0,
                    transition: 'border .12s, outline .12s',
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </Modal>

      {/* Checklist Modal */}
      <Modal
        open={!!checklistModal}
        onClose={() => setChecklistModal(null)}
        title={checklistModal?.mode === 'new' ? '新建检查项' : '编辑检查项'}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setChecklistModal(null)}>取消</Button>
            <Button variant="primary" onClick={handleSaveChecklist} disabled={!checklistText.trim()}>保存</Button>
          </>
        }
      >
        <Input label="检查项内容" value={checklistText} onChange={e => setChecklistText(e.target.value)} autoFocus onKeyDown={(e: React.KeyboardEvent) => { if (e.key === 'Enter') handleSaveChecklist() }} />
      </Modal>

      {/* Transition Checklist Modal */}
      <Modal
        open={!!transitionModal}
        onClose={() => setTransitionModal(null)}
        title={transitionModal?.mode === 'new' ? '新建检查项' : '编辑检查项'}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setTransitionModal(null)}>取消</Button>
            <Button variant="primary" onClick={handleSaveTransitionChecklist} disabled={!transitionText.trim()}>保存</Button>
          </>
        }
      >
        <Input label="检查项内容" value={transitionText} onChange={e => setTransitionText(e.target.value)} autoFocus onKeyDown={(e: React.KeyboardEvent) => { if (e.key === 'Enter') handleSaveTransitionChecklist() }} />
      </Modal>

      {/* Reason Modal */}
      <Modal
        open={!!reasonModal}
        onClose={() => setReasonModal(null)}
        title={reasonModal?.mode === 'new' ? '新建选项' : '编辑选项'}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setReasonModal(null)}>取消</Button>
            <Button variant="primary" onClick={handleSaveReason} disabled={!reasonText.trim()}>保存</Button>
          </>
        }
      >
        <Input label="选项内容" value={reasonText} onChange={e => setReasonText(e.target.value)} autoFocus onKeyDown={(e: React.KeyboardEvent) => { if (e.key === 'Enter') handleSaveReason() }} />
      </Modal>
    </PageContainer>
  )
}
