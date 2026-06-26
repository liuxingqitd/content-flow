import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from 'react'

const baseInput: React.CSSProperties = {
  width: '100%', borderRadius: 'var(--radius-md)',
  border: '1px solid var(--border-default)',
  background: 'var(--bg-raised)', color: 'var(--text-primary)',
  fontSize: 13, fontFamily: 'inherit', letterSpacing: '-0.01em',
  outline: 'none', transition: 'border-color var(--duration-fast) var(--ease-out), box-shadow var(--duration-fast) var(--ease-out)',
}

const focusStyle: React.CSSProperties = {
  borderColor: 'var(--accent)',
  boxShadow: '0 0 0 3px var(--accent-glow)',
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, style, onFocus, onBlur, ...props }, ref) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      {label && <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', letterSpacing: '-0.01em' }}>{label}</label>}
      <input
        ref={ref}
        style={{ ...baseInput, height: 32, padding: '0 10px', ...style }}
        onFocus={e => {
          Object.assign(e.currentTarget.style, focusStyle)
          onFocus?.(e)
        }}
        onBlur={e => {
          e.currentTarget.style.borderColor = 'var(--border-default)'
          e.currentTarget.style.boxShadow = 'none'
          onBlur?.(e)
        }}
        {...props}
      />
      {error && <span style={{ fontSize: 11, color: 'var(--danger)' }}>{error}</span>}
    </div>
  )
)
Input.displayName = 'Input'

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, style, onFocus, onBlur, ...props }, ref) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      {label && <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', letterSpacing: '-0.01em' }}>{label}</label>}
      <textarea
        ref={ref}
        style={{ ...baseInput, padding: '8px 10px', resize: 'vertical', lineHeight: 1.6, ...style }}
        onFocus={e => {
          Object.assign(e.currentTarget.style, focusStyle)
          onFocus?.(e)
        }}
        onBlur={e => {
          e.currentTarget.style.borderColor = 'var(--border-default)'
          e.currentTarget.style.boxShadow = 'none'
          onBlur?.(e)
        }}
        {...props}
      />
      {error && <span style={{ fontSize: 11, color: 'var(--danger)' }}>{error}</span>}
    </div>
  )
)
Textarea.displayName = 'Textarea'
