import { forwardRef, type SelectHTMLAttributes } from 'react'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  options: { value: string; label: string }[]
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, options, style, ...props }, ref) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      {label && <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', letterSpacing: '-0.01em' }}>{label}</label>}
      <select
        ref={ref}
        style={{
          height: 32, padding: '0 10px', borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-default)',
          background: 'var(--bg-raised)', color: 'var(--text-primary)',
          fontSize: 13, fontFamily: 'inherit', letterSpacing: '-0.01em',
          cursor: 'pointer', outline: 'none',
          transition: 'border-color var(--duration-fast) var(--ease-out), box-shadow var(--duration-fast) var(--ease-out)',
          ...style,
        }}
        onFocus={e => {
          e.currentTarget.style.borderColor = 'var(--accent)'
          e.currentTarget.style.boxShadow = '0 0 0 3px var(--accent-glow)'
        }}
        onBlur={e => {
          e.currentTarget.style.borderColor = 'var(--border-default)'
          e.currentTarget.style.boxShadow = 'none'
        }}
        {...props}
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  )
)
Select.displayName = 'Select'
