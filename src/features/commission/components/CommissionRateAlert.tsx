// CommissionRateAlert - Banner for commission rate mismatches

import { AlertTriangle, CheckCircle, Info, Shield } from 'lucide-react'
import { Badge } from '@components/ui/Badge'
import { CommissionCrossCheckResult } from '../hooks/useCommissionCrossCheck'

interface CommissionRateAlertProps {
  result: CommissionCrossCheckResult
  onDismiss?: () => void
  compact?: boolean
}

export function CommissionRateAlert({ result, onDismiss, compact }: CommissionRateAlertProps) {
  if (result.severity === 'info' && compact) return null

  const icons = {
    info: CheckCircle,
    warning: Info,
    error: AlertTriangle,
  }
  const Icon = icons[result.severity]

  const bgColors = {
    info: 'var(--color-success-muted)',
    warning: 'var(--color-warning-muted)',
    error: 'var(--color-error-muted)',
  }
  const borderColors = {
    info: 'var(--color-success)',
    warning: 'var(--color-warning)',
    error: 'var(--color-error)',
  }
  const textColors = {
    info: 'var(--color-success)',
    warning: 'var(--color-warning)',
    error: 'var(--color-error)',
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--spacing-md)',
      padding: compact ? 'var(--spacing-sm) var(--spacing-md)' : 'var(--spacing-md)',
      borderRadius: 'var(--radius-md)',
      background: bgColors[result.severity],
      border: `1px solid ${borderColors[result.severity]}`,
      color: textColors[result.severity],
    }}>
      <Icon size={compact ? 16 : 20} style={{ flexShrink: 0 }} />
      
      <div style={{ flex: 1, minWidth: 0 }}>
        {!compact && (
          <div style={{ fontWeight: 600, fontSize: compact ? '0.8rem' : '0.9rem' }}>
            {result.jobSource === 'company_assigned' 
              ? 'Company-Assigned Job Rate Check' 
              : 'Commission Rate Cross-Check'}
          </div>
        )}
        <div style={{ 
          fontSize: compact ? '0.75rem' : '0.85rem',
          opacity: 0.9,
        }}>
          {result.message}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', flexWrap: 'wrap' }}>
        <Badge 
          variant={result.severity === 'error' ? 'error' : result.severity === 'warning' ? 'warning' : 'success'} 
          size="sm"
        >
          {result.severity.toUpperCase()}
        </Badge>
        
        {result.jobSource === 'company_assigned' && (
          <Badge variant="info" size="sm">
            Company-Assigned (−2pp)
          </Badge>
        )}

        {onDismiss && (
          <button
            onClick={onDismiss}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'inherit',
              cursor: 'pointer',
              padding: 'var(--spacing-xs)',
              opacity: 0.6,
            }}
            aria-label="Dismiss"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}