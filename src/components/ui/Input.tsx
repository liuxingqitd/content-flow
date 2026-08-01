import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', ...props }, ref) => (
    <div className="ui-field">
      {label && <label className="ui-field-label">{label}</label>}
      <input ref={ref} className={`ui-input ${className}`.trim()} {...props} />
      {error && <span className="ui-field-error">{error}</span>}
    </div>
  )
)
Input.displayName = 'Input'

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, className = '', ...props }, ref) => (
    <div className="ui-field">
      {label && <label className="ui-field-label">{label}</label>}
      <textarea ref={ref} className={`ui-textarea ${className}`.trim()} {...props} />
      {error && <span className="ui-field-error">{error}</span>}
    </div>
  )
)
Textarea.displayName = 'Textarea'
