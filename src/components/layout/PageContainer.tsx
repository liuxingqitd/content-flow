import type { ReactNode } from 'react'

interface PageContainerProps {
  title: string
  subtitle?: string
  actions?: ReactNode
  children: ReactNode
  noPadding?: boolean
}

export function PageContainer({ title, subtitle, actions, children, noPadding }: PageContainerProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: 'var(--bg-base)' }}>
      {/* Header */}
      <div className="responsive-page-header" style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 24px',
        borderBottom: '1px solid var(--border-subtle)',
        background: 'var(--bg-surface)',
        flexShrink: 0, minHeight: 52,
      }}>
        <div>
          <h1 style={{ fontSize: 16, lineHeight: 1.2, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>{title}</h1>
          {subtitle && <p style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>{subtitle}</p>}
        </div>
        {actions && <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>{actions}</div>}
      </div>

      {/* Content */}
      <div className={noPadding ? undefined : 'responsive-page-body'} style={{
        flex: 1,
        overflowY: noPadding ? 'hidden' : 'auto',
        overflowX: 'hidden',
        ...(noPadding ? {} : { padding: '24px' }),
      }}>
        {children}
      </div>
    </div>
  )
}
