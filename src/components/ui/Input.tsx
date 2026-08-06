import { forwardRef, InputHTMLAttributes, TextareaHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
  fullWidth?: boolean
  leftIcon?: React.ReactNode
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, fullWidth = true, leftIcon, className: _className, style, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')
    const borderColor = error ? 'var(--color-error)' : 'var(--color-border)'
    const focusBorderColor = error ? 'var(--color-error)' : 'var(--color-primary)'
    const focusBoxShadow = error
      ? '0 0 0 3px var(--color-error-muted)'
      : '0 0 0 3px var(--color-primary-muted)'

    const paddingLeft = leftIcon ? '44px' : 'var(--input-padding)'

    return (
      <div style={{ width: fullWidth ? '100%' : 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {label && (
          <label htmlFor={inputId} style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-text)' }}>
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
          <input
            ref={ref}
            id={inputId}
            style={{
              width: '100%',
              height: 'var(--input-height)',
              padding: `0 ${paddingLeft} 0 var(--spacing-md)`,
              background: 'var(--color-surface)',
              border: `1px solid ${borderColor}`,
              borderRadius: 'var(--radius-md)',
              color: 'var(--color-text)',
              fontSize: '1rem',
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
            aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined}
            {...props}
          />
        </div>
        {error && (
          <p id={`${inputId}-error`} style={{ fontSize: '0.75rem', color: 'var(--color-error)', margin: 0 }}>
            {error}
          </p>
        )}
        {helperText && !error && (
          <p id={`${inputId}-helper`} style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', margin: 0 }}>
            {helperText}
          </p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  helperText?: string
  fullWidth?: boolean
  leftIcon?: React.ReactNode
  rows?: number
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, helperText, fullWidth = true, leftIcon, rows = 3, className: _className, style, id, ...props }, ref) => {
    const textareaId = id || label?.toLowerCase().replace(/\s+/g, '-')
    const borderColor = error ? 'var(--color-error)' : 'var(--color-border)'
    const focusBorderColor = error ? 'var(--color-error)' : 'var(--color-primary)'
    const focusBoxShadow = error
      ? '0 0 0 3px var(--color-error-muted)'
      : '0 0 0 3px var(--color-primary-muted)'

    return (
      <div style={{ width: fullWidth ? '100%' : 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {label && (
          <label htmlFor={textareaId} style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-text)' }}>
            {label}
          </label>
        )}
        <div style={{ position: 'relative' }}>
          {leftIcon && (
            <div style={{
              position: 'absolute',
              left: '12px',
              top: '12px',
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
          <textarea
            ref={ref}
            id={textareaId}
            rows={rows}
            style={{
              width: '100%',
              minHeight: '100px',
              padding: leftIcon ? 'var(--spacing-md) var(--spacing-md) var(--spacing-md) 44px' : 'var(--spacing-md)',
              background: 'var(--color-surface)',
              border: `1px solid ${borderColor}`,
              borderRadius: 'var(--radius-md)',
              color: 'var(--color-text)',
              fontSize: '1rem',
              fontFamily: 'inherit',
              resize: 'vertical',
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
            aria-describedby={error ? `${textareaId}-error` : helperText ? `${textareaId}-helper` : undefined}
            {...props}
          />
          {leftIcon && (
            <div style={{
              position: 'absolute',
              left: '12px',
              top: '12px',
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
        </div>
        {error && (
          <p id={`${textareaId}-error`} style={{ fontSize: '0.75rem', color: 'var(--color-error)', margin: 0 }}>
            {error}
          </p>
        )}
        {helperText && !error && (
          <p id={`${textareaId}-helper`} style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', margin: 0 }}>
            {helperText}
          </p>
        )}
      </div>
    )
  }
)

Textarea.displayName = 'Textarea'