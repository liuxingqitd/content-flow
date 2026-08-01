import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  icon?: ReactNode
  children?: ReactNode
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'secondary', size = 'md', loading, icon, children, className = '', disabled, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={`ui-button ui-button-${variant} ui-button-${size} ${className}`.trim()}
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
