import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  icon?: ReactNode
  children?: ReactNode
}

const BASE: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  borderRadius: 'var(--radius-md)', fontWeight: 550, cursor: 'pointer',
  transition: 'all var(--duration-fast) var(--ease-out)', userSelect: 'none', border: 'none',
  fontFamily: 'inherit', letterSpacing: '-0.01em',
}

const VARIANTS: Record<string, React.CSSProperties> = {
  primary:   { background: 'var(--accent)', color: '#fff', boxShadow: '0 1px 3px rgba(124,92,252,.35)' },
  secondary: { background: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border-default)' },
  ghost:     { background: 'transparent', color: 'var(--text-secondary)', border: 'none' },
  danger:    { background: 'transparent', color: 'var(--danger)', border: 'none' },
}

const SIZES: Record<string, React.CSSProperties> = {
  sm: { height: 28, padding: '0 10px', fontSize: 12, gap: 5 },
  md: { height: 32, padding: '0 12px', fontSize: 13, gap: 6 },
  lg: { height: 36, padding: '0 16px', fontSize: 14, gap: 7 },
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'secondary', size = 'md', loading, icon, children, style, disabled, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      style={{
        ...BASE,
        ...VARIANTS[variant],
        ...SIZES[size],
        opacity: (disabled || loading) ? 0.45 : 1,
        cursor: (disabled || loading) ? 'not-allowed' : 'pointer',
        ...style,
      }}
      onMouseEnter={e => {
        if (disabled || loading) return
        const el = e.currentTarget
        if (variant === 'primary') {
          el.style.background = 'var(--accent-hover)'
        } else if (variant === 'secondary') {
          el.style.background = 'var(--bg-hover)'
        } else if (variant === 'ghost') {
          el.style.background = 'var(--bg-hover)'
        } else if (variant === 'danger') {
          el.style.background = 'rgba(248,113,113,0.12)'
        }
      }}
      onMouseLeave={e => {
        const el = e.currentTarget
        if (variant === 'primary') {
          el.style.background = 'var(--accent)'
        } else if (variant === 'secondary') {
          el.style.background = 'transparent'
        } else if (variant === 'ghost' || variant === 'danger') {
          el.style.background = 'transparent'
        }
      }}
      {...props}
    >
      {loading
        ? <span style={{ width: 13, height: 13, border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite', display: 'block' }} />
        : icon
      }
      {children}
    </button>
  )
)
Button.displayName = 'Button'
