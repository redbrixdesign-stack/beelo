import { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
  style?: React.CSSProperties
  onClick?: () => void
  hoverable?: boolean
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

export function Card({ 
  children, 
  className = '', 
  style, 
  onClick, 
  hoverable = false, 
  padding = 'md' 
}: CardProps) {
  const paddingStyles = {
    none: '0',
    sm: 'var(--spacing-sm)',
    md: 'var(--spacing-md)',
    lg: 'var(--spacing-lg)'
  }

  return (
    <div
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        padding: paddingStyles[padding],
        transition: 'all var(--transition-fast)',
        cursor: onClick ? 'pointer' : 'default',
        ...(hoverable && {
          boxShadow: 'var(--shadow-sm)'
        }),
        ...style
      }}
      onClick={onClick}
      onMouseEnter={hoverable ? () => {} : undefined}
      onMouseLeave={hoverable ? () => {} : undefined}
      className={className}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick() } : undefined}
    >
      {children}
    </div>
  )
}

interface CardHeaderProps {
  children: ReactNode
  className?: string
  style?: React.CSSProperties
}

export function CardHeader({ children, className = '', style }: CardHeaderProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-sm)', ...style }} className={className}>
      {children}
    </div>
  )
}

interface CardContentProps {
  children: ReactNode
  className?: string
  style?: React.CSSProperties
}

export function CardContent({ children, className = '', style }: CardContentProps) {
  return <div style={{ ...style }} className={className}>{children}</div>
}

interface CardFooterProps {
  children: ReactNode
  className?: string
  style?: React.CSSProperties
}

export function CardFooter({ children, className = '', style }: CardFooterProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 'var(--spacing-sm)', marginTop: 'var(--spacing-md)', paddingTop: 'var(--spacing-sm)', borderTop: '1px solid var(--color-border)', ...style }} className={className}>
      {children}
    </div>
  )
}