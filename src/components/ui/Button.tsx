import { forwardRef, ButtonHTMLAttributes, CSSProperties } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  fullWidth?: boolean
  loading?: boolean
}

const baseStyles: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  fontWeight: 600,
  borderRadius: 'var(--btn-radius)',
  transition: 'all var(--transition-fast)',
  minHeight: 'var(--btn-height)',
  minWidth: 'var(--btn-height)',
  padding: '0 var(--btn-padding)'
}

const variantStyles: Record<string, CSSProperties> = {
  primary: {
    background: 'var(--color-primary)',
    color: 'var(--color-text-inverse)',
    border: 'none'
  },
  secondary: {
    background: 'var(--color-surface)',
    color: 'var(--color-text)',
    border: '1px solid var(--color-border)'
  },
  ghost: {
    background: 'transparent',
    color: 'var(--color-text)',
    border: 'none'
  },
  danger: {
    background: 'var(--color-error)',
    color: 'var(--color-text-inverse)',
    border: 'none'
  }
}

const sizeStyles: Record<string, CSSProperties> = {
  sm: { fontSize: '0.875rem', padding: '0 12px', minHeight: '40px' },
  md: { fontSize: '1rem', padding: '0 var(--spacing-lg)', minHeight: '48px' },
  lg: { fontSize: '1.125rem', padding: '0 24px', minHeight: '56px' }
}

const disabledStyles: CSSProperties = {
  opacity: 0.5,
  cursor: 'not-allowed'
}

const hoverStyles: Record<string, CSSProperties> = {
  primary: { background: 'var(--color-primary-hover)' },
  secondary: { background: 'var(--color-surface-hover)' },
  ghost: { background: 'var(--color-primary-muted)' },
  danger: { filter: 'brightness(1.1)' }
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ 
    variant = 'primary', 
    size = 'md', 
    fullWidth = false, 
    loading = false, 
    disabled, 
    children, 
    className = '',
    style,
    ...props 
  }, ref) => {
    const mergedStyle: CSSProperties = {
      ...baseStyles,
      ...variantStyles[variant],
      ...sizeStyles[size],
      ...(fullWidth ? { width: '100%' } : {}),
      ...(disabled || loading ? disabledStyles : {}),
      ...(!(disabled || loading) ? hoverStyles[variant] : {}),
      ...style
    }

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        style={mergedStyle}
        className={className}
        {...props}
      >
        {loading && (
          <svg 
            className="animate-spin" 
            width="20" 
            height="20" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
            <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
          </svg>
        )}
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'