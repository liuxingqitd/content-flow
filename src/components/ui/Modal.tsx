import { useEffect, type ReactNode } from 'react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  size?: 'sm' | 'md' | 'lg'
  footer?: ReactNode
}

const WIDTHS = { sm: 400, md: 540, lg: 720 }

export function Modal({ open, onClose, title, children, size = 'md', footer }: ModalProps) {
  useEffect(() => {
    if (!open) return
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      {/* Backdrop */}
      <div className="ui-modal-backdrop" onClick={onClose} />

      {/* Panel */}
      <div
        className="ui-modal-panel"
        style={{ maxWidth: WIDTHS[size] }}
      >
        {title && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: '1px solid var(--border-subtle)',
          }}>
            <h2 style={{ fontSize: 15, fontWeight: 620, color: 'var(--text-primary)' }}>{title}</h2>
            <button
              onClick={onClose}
              style={{
                width: 26, height: 26, borderRadius: 6, border: 'none',
                background: 'transparent', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--text-tertiary)', transition: 'background .1s, color .1s',
              }}
              onMouseEnter={e => {
                const el = e.currentTarget
                el.style.background = 'var(--bg-hover)'
                el.style.color = 'var(--text-primary)'
              }}
              onMouseLeave={e => {
                const el = e.currentTarget
                el.style.background = 'transparent'
                el.style.color = 'var(--text-tertiary)'
              }}
            >
              <svg width="13" height="13" fill="none" viewBox="0 0 13 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <line x1="1" y1="1" x2="12" y2="12"/><line x1="12" y1="1" x2="1" y2="12"/>
              </svg>
            </button>
          </div>
        )}
        <div style={{ padding: '20px' }}>{children}</div>
        {footer && (
          <div style={{
            padding: '14px 20px',
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex', justifyContent: 'flex-end', gap: 8,
          }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
