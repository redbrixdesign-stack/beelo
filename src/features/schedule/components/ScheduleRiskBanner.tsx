// ScheduleRiskBanner - Banner showing schedule risk for a visit or overall

import { AlertTriangle, Clock, ChevronRight, Info } from 'lucide-react'
import { Badge } from '@components/ui/Badge'
import { Button } from '@components/ui/Button'
import { ScheduleGap, ScheduleRiskLevel } from '../hooks/useScheduleRisk'

interface ScheduleRiskBannerProps {
  gaps: ScheduleGap[]
  overallRisk: ScheduleRiskLevel
  onViewSuggestions?: () => void
  compact?: boolean
}

const riskStyles: Record<ScheduleRiskLevel, { bg: string; border: string; text: string; icon: typeof AlertTriangle; label: string }> = {
  low: { bg: 'var(--color-success-muted)', border: 'var(--color-success)', text: 'var(--color-success)', icon: Info, label: 'Low Risk' },
  medium: { bg: 'var(--color-warning-muted)', border: 'var(--color-warning)', text: 'var(--color-warning)', icon: AlertTriangle, label: 'Medium Risk' },
  high: { bg: 'var(--color-error-muted)', border: 'var(--color-error)', text: 'var(--color-error)', icon: AlertTriangle, label: 'High Risk' },
}

export function ScheduleRiskBanner({ gaps, overallRisk, onViewSuggestions, compact }: ScheduleRiskBannerProps) {
  const highRiskGaps = gaps.filter(g => g.riskLevel === 'high')
  const mediumRiskGaps = gaps.filter(g => g.riskLevel === 'medium')
  const style = riskStyles[overallRisk]
  const Icon = style.icon

  if (overallRisk === 'low' && compact) return null

  return (
    <div style={{
      padding: compact ? 'var(--spacing-sm) var(--spacing-md)' : 'var(--spacing-md)',
      borderRadius: 'var(--radius-md)',
      background: style.bg,
      border: `1px solid ${style.border}`,
      color: style.text,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)', flexWrap: 'wrap' }}>
        <Icon size={compact ? 16 : 20} style={{ flexShrink: 0 }} />
        
        <div style={{ flex: 1, minWidth: 0 }}>
          {!compact && (
            <div style={{ fontWeight: 600, fontSize: compact ? '0.8rem' : '0.9rem' }}>
              Schedule Risk: {style.label}
            </div>
          )}
          <div style={{ fontSize: compact ? '0.75rem' : '0.85rem', opacity: 0.9 }}>
            {overallRisk === 'high' && (
              <>
                <strong>{highRiskGaps.length} critical gap{highRiskGaps.length !== 1 ? 's' : ''}</strong>
                {mediumRiskGaps.length > 0 && <span>, {mediumRiskGaps.length} medium</span>}
                — visits may overlap or have insufficient buffer.
              </>
            )}
            {overallRisk === 'medium' && (
              <>
                <strong>{mediumRiskGaps.length} gap{mediumRiskGaps.length !== 1 ? 's' : ''}</strong>
                with <strong>15min buffer</strong> &mdash; tight scheduling.
              </>
            )}
            {overallRisk === 'low' && (
              <>
                All visits have adequate buffer ({gaps.length} gap{gaps.length !== 1 ? 's' : ''} checked).
              </>
            )}
          </div>
        </div>

        {!compact && highRiskGaps.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)', minWidth: 200 }}>
            {highRiskGaps.slice(0, 2).map(gap => (
              <div key={gap.id} style={{ fontSize: '0.75rem', padding: 'var(--spacing-xs) var(--spacing-sm)', background: 'rgba(0,0,0,0.05)', borderRadius: 'var(--radius-sm)' }}>
                <Clock size={10} style={{ display: 'inline-block', marginRight: '4px', verticalAlign: 'middle' }} />
                {gap.currentVisit.jobCode} → {gap.nextVisit.jobCode}: <strong>{gap.gapMinutes}min</strong> buffer (need {gap.estimatedDurationMinutes + 15}min)
              </div>
            ))}
            {highRiskGaps.length > 2 && (
              <div style={{ fontSize: '0.7rem', opacity: 0.7 }}>
                +{highRiskGaps.length - 2} more critical gap{highRiskGaps.length - 2 !== 1 ? 's' : ''}
              </div>
            )}
          </div>
        )}

        {onViewSuggestions && (
          <Button variant="secondary" size="sm" onClick={onViewSuggestions} leftIcon={<ChevronRight size={14} />}>
            View Suggestions
          </Button>
        )}
      </div>
    </div>
  )
}