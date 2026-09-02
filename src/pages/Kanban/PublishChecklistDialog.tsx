import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { useAppStore } from '@/store/appStore'
import { isChecklistComplete } from './checklistCompletion'

interface PublishChecklistDialogProps {
  open: boolean
  videoTitle: string
  onConfirm: () => void
  onCancel: () => void
}

export function PublishChecklistDialog({ open, videoTitle, onConfirm, onCancel }: PublishChecklistDialogProps) {
  const checklistItems = useAppStore(s => s.data?.checklistItems ?? [])
  const [checked, setChecked] = useState<Record<string, boolean>>({})

  const allChecked = isChecklistComplete(checklistItems, checked)

  const toggle = (id: string) => setChecked(prev => ({ ...prev, [id]: !prev[id] }))

  const handleCancel = () => {
    setChecked({})
    onCancel()
  }

  const handleConfirm = () => {
    if (!allChecked) return
    setChecked({})
    onConfirm()
  }

  return (
    <Modal
      open={open}
      onClose={handleCancel}
      size="sm"
      footer={
        <>
          <button
            onClick={handleCancel}
            style={{
              padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 500,
              background: 'var(--bg-elevated)', color: 'var(--text-primary)',
              border: '1px solid var(--border-default)', cursor: 'pointer',
              transition: 'background .12s',
            }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg-surface)'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'var(--bg-elevated)'}
          >
            取消
          </button>
          <button
            onClick={handleConfirm}
            disabled={!allChecked}
            style={{
              padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
              background: allChecked ? 'var(--success)' : 'var(--bg-elevated)',
              color: allChecked ? '#fff' : 'var(--text-tertiary)',
              border: allChecked ? 'none' : '1px solid var(--border-default)',
              cursor: allChecked ? 'pointer' : 'not-allowed',
              transition: 'background .15s, color .15s',
            }}
            onMouseEnter={e => { if (allChecked) (e.currentTarget as HTMLElement).style.background = 'var(--success-hover)' }}
            onMouseLeave={e => { if (allChecked) (e.currentTarget as HTMLElement).style.background = 'var(--success)' }}
          >
            确认发布
          </button>
        </>
      }
    >
      <div style={{ paddingBottom: 4 }}>
        {/* 图标 + 标题 */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 20 }}>
          <div style={{
            width: 48, height: 48, borderRadius: '50%',
            background: 'rgba(16,185,129,0.12)',
            border: '1px solid rgba(16,185,129,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 14,
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="9 12 11 14 15 10"/>
            </svg>
          </div>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 6px', textAlign: 'center' }}>
            发布前检查清单
          </h3>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, textAlign: 'center', lineHeight: 1.5 }}>
            {checklistItems.length === 0
              ? '暂无发布前检查要求，可直接标记为「已发布」'
              : '请逐项确认后方可标记为「已发布」'}
          </p>
        </div>

        {/* 视频标题 */}
        <div style={{
          padding: '9px 14px', borderRadius: 8,
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-subtle)',
          marginBottom: 16,
        }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 3px' }}>视频</p>
          <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', lineHeight: 1.4, margin: 0 }}>
            {videoTitle}
          </p>
        </div>

        {/* 检查项 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {checklistItems.length === 0 ? (
            <div style={{ padding: '16px 0', textAlign: 'center', fontSize: 12, color: 'var(--text-tertiary)' }}>
              暂无检查项，可直接发布；可在设置页面添加
            </div>
          ) : checklistItems.map((item, i) => {
            const isChecked = !!checked[item.id]
            return (
              <button
                key={item.id}
                onClick={() => toggle(item.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '11px 14px', borderRadius: 8, textAlign: 'left',
                  background: isChecked ? 'rgba(16,185,129,0.08)' : 'var(--bg-elevated)',
                  border: `1px solid ${isChecked ? 'rgba(16,185,129,0.35)' : 'var(--border-subtle)'}`,
                  cursor: 'pointer', width: '100%',
                  transition: 'background .12s, border-color .12s',
                }}
              >
                {/* 自定义复选框 */}
                <div style={{
                  width: 18, height: 18, borderRadius: 5, flexShrink: 0,
                  border: `2px solid ${isChecked ? 'var(--success)' : 'var(--border-default)'}`,
                  background: isChecked ? 'var(--success)' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'background .12s, border-color .12s',
                }}>
                  {isChecked && (
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="1.5 5 3.5 7.5 8.5 2.5"/>
                    </svg>
                  )}
                </div>
                {/* 序号 + 文字 */}
                <span style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                  <span style={{
                    fontSize: 11, fontWeight: 700, color: isChecked ? 'var(--success)' : 'var(--text-tertiary)',
                    minWidth: 16, transition: 'color .12s',
                  }}>
                    {i + 1}
                  </span>
                  <span style={{
                    fontSize: 13, color: isChecked ? 'var(--text-primary)' : 'var(--text-secondary)',
                    fontWeight: isChecked ? 500 : 400,
                    transition: 'color .12s',
                  }}>
                    {item.text}
                  </span>
                </span>
              </button>
            )
          })}
        </div>

        {/* 全部勾选后的提示 */}
        {checklistItems.length > 0 && allChecked && (
          <div style={{
            marginTop: 14, padding: '9px 14px', borderRadius: 8,
            background: 'rgba(16,185,129,0.08)',
            border: '1px solid rgba(16,185,129,0.25)',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            <p style={{ fontSize: 12, color: 'var(--success)', margin: 0, lineHeight: 1.4 }}>
              所有检查项已完成，可以发布。
            </p>
          </div>
        )}
      </div>
    </Modal>
  )
}
