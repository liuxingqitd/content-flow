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
      {icon && <div style={{ color: 'var(--text-tertiary)', marginBottom: 16, opacity: 0.65 }}>{icon}</div>}
      <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>{title}</p>
      {description && <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 16, maxWidth: 280 }}>{description}</p>}
      {action}
    </div>
  )
}
