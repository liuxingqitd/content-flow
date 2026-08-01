interface BadgeProps {
  children: React.ReactNode
  color?: string
  className?: string
}

export function Badge({ children, color, className = '' }: BadgeProps) {
  return (
    <span
      className={`ui-badge ${className}`.trim()}
      style={{
        ...(color ? { color, borderColor: `color-mix(in srgb, ${color} 34%, var(--border-default))` } : {}),
      }}
    >
      {children}
    </span>
  )
}
