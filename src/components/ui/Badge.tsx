interface BadgeProps {
  children: React.ReactNode
  color?: string
  className?: string
}

export function Badge({ children, color, className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${className}`}
      style={{
        border: '1px solid var(--border-subtle)',
        ...(color ? { background: `${color}18`, color, borderColor: `${color}35` } : {
          background: 'var(--bg-raised)',
          color: 'var(--text-secondary)',
        }),
      }}
    >
      {children}
    </span>
  )
}
