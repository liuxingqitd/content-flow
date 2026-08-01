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
    <div className="page-container">
      <header className="page-header responsive-page-header">
        <div>
          <div className="page-title-row">
            <h1 className="page-title">{title}</h1>
          </div>
          {subtitle && <p className="page-subtitle">{subtitle}</p>}
        </div>
        {actions && <div className="page-actions">{actions}</div>}
      </header>

      <div className={`page-body${noPadding ? ' no-padding' : ' responsive-page-body'}`}>
        {children}
      </div>
    </div>
  )
}
