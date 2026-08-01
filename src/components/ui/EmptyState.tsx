import type { ReactNode } from 'react'

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: '56px 32px', textAlign: 'center',
    }}>
      {icon && <div style={{ display: 'grid', width: 36, height: 36, placeItems: 'center', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', background: 'var(--bg-raised)', color: 'var(--text-tertiary)', marginBottom: 14 }}>{icon}</div>}
      <p style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 5 }}>{title}</p>
      {description && <p style={{ fontSize: 12, lineHeight: 1.6, color: 'var(--text-tertiary)', marginBottom: 16, maxWidth: 300 }}>{description}</p>}
      {action}
    </div>
  )
}
