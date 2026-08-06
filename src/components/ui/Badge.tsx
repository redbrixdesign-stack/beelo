import { CSSProperties } from 'react'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info'
  size?: 'sm' | 'md' | 'lg'
  className?: string
  style?: CSSProperties
}

const variantStyles: Record<string, CSSProperties> = {
  default: { background: 'var(--color-border)', color: 'var(--color-text)' },
  primary: { background: 'var(--color-primary-muted)', color: 'var(--color-primary)' },
  success: { background: 'var(--color-success-muted)', color: 'var(--color-success)' },
  warning: { background: 'var(--color-warning-muted)', color: '#1a1a2e' },
  error: { background: 'var(--color-error-muted)', color: 'var(--color-error)' },
  info: { background: 'var(--color-primary-muted)', color: 'var(--color-primary)' }
}

const sizeStyles: Record<string, CSSProperties> = {
  sm: { padding: '2px 8px', fontSize: '0.7rem', borderRadius: 'var(--radius-full)' },
  md: { padding: '4px 10px', fontSize: '0.75rem', borderRadius: 'var(--radius-full)' },
  lg: { padding: '6px 12px', fontSize: '0.875rem', borderRadius: 'var(--radius-full)' }
}

export function Badge({ 
  children, 
  variant = 'default', 
  size = 'md', 
  className = '', 
  style 
}: BadgeProps) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        fontWeight: 600,
        whiteSpace: 'nowrap',
        ...variantStyles[variant],
        ...sizeStyles[size],
        ...style
      }}
      className={className}
    >
      {children}
    </span>
  )
}