import { forwardRef, type SelectHTMLAttributes } from 'react'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  options: { value: string; label: string }[]
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, options, className = '', ...props }, ref) => (
    <div className="ui-field">
      {label && <label className="ui-field-label">{label}</label>}
      <select ref={ref} className={`ui-select ${className}`.trim()} {...props}>
        {options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </div>
  )
)
Select.displayName = 'Select'
