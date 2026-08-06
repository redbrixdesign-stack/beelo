import { forwardRef, SelectHTMLAttributes } from 'react'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  helperText?: string
  fullWidth?: boolean
  options: Array<{ value: string; label: string }>
  placeholder?: string
  leftIcon?: React.ReactNode
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, helperText, fullWidth = true, options, placeholder, leftIcon, className: _className, style, id, ...props }, ref) => {
    const selectId = id || label?.toLowerCase().replace(/\s+/g, '-')
    const borderColor = error ? 'var(--color-error)' : 'var(--color-border)'
    const focusBorderColor = error ? 'var(--color-error)' : 'var(--color-primary)'
    const focusBoxShadow = error
      ? '0 0 0 3px var(--color-error-muted)'
      : '0 0 0 3px var(--color-primary-muted)'

    return (
      <div style={{ width: fullWidth ? '100%' : 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {label && (
          <label htmlFor={selectId} style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-text)' }}>
            {label}
          </label>
        )}
        <div style={{ position: 'relative' }}>
          {leftIcon && (
            <div style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-text-muted)',
              pointerEvents: 'none',
              zIndex: 1
            }}>
              {leftIcon}
            </div>
          )}
          <select
            ref={ref}
            id={selectId}
            style={{
              width: '100%',
              height: 'var(--input-height)',
              padding: leftIcon ? 'var(--input-padding) var(--input-padding) var(--input-padding) 48px' : 'var(--input-padding)',
              background: 'var(--color-surface)',
              border: `1px solid ${borderColor}`,
              borderRadius: 'var(--radius-md)',
              color: 'var(--color-text)',
              fontSize: '1rem',
              appearance: 'none',
              backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%238b8b9e' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E\")",
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 12px center',
              paddingRight: '40px',
              transition: 'border-color var(--transition-fast), box-shadow var(--transition-fast)',
              outline: 'none',
              ...style
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = focusBorderColor
              e.currentTarget.style.boxShadow = focusBoxShadow
              props.onFocus?.(e)
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = borderColor
              e.currentTarget.style.boxShadow = 'none'
              props.onBlur?.(e)
            }}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={error ? `${selectId}-error` : helperText ? `${selectId}-helper` : undefined}
            {...props}
          >
            {placeholder && <option value="" disabled>{placeholder}</option>}
            {options.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        {error && (
          <p id={`${selectId}-error`} style={{ fontSize: '0.75rem', color: 'var(--color-error)', margin: 0 }}>
            {error}
          </p>
        )}
        {helperText && !error && (
          <p id={`${selectId}-helper`} style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', margin: 0 }}>
            {helperText}
          </p>
        )}
      </div>
    )
  }
)

Select.displayName = 'Select'