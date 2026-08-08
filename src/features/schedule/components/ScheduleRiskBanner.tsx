// ScheduleRiskBanner - Banner component showing schedule risk warnings

import { useScheduleRisk } from '../hooks/useScheduleRisk'
import { AlertTriangle, ChevronRight } from 'lucide-react'
import { Badge } from '@components/ui/Badge'
import { Button } from '@components/ui/Button'
import { ScheduleRiskLevel } from '@lib/constants'

interface ScheduleRiskBannerProps {
  onViewDetails?: () => void
  compact?: boolean
}

export function ScheduleRiskBanner({ onViewDetails, compact = false }: ScheduleRiskBannerProps) {
  const { gaps, overallRisk } = useScheduleRisk()

  if (overallRisk === 'low' || gaps.length === 0) {
    return null
  }

  const highRiskGaps = gaps.filter(g => g.riskLevel === 'high')
  const mediumRiskGaps = gaps.filter(g => g.riskLevel === 'medium')

  const getRiskLabel = (risk: ScheduleRiskLevel) => {
    switch (risk) {
      case 'high': return 'High Risk'
      case 'medium': return 'Medium Risk'
      default: return 'Low Risk'
    }
  }

  const formatMinutes = (minutes: number) => {
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60)
      const mins = minutes % 60
      return `${hours}h ${mins}m`
    }
    return `${minutes}min`
  }

  if (compact) {
    return (
      <div style={{
        background: 'var(--color-warning-muted)',
        border: '1px solid var(--color-warning)',
        borderRadius: 'var(--radius-md)',
        padding: 'var(--spacing-sm) var(--spacing-md)',
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--spacing-sm)',
        fontSize: '0.8rem',
      }}>
        <AlertTriangle size={16} style={{ color: 'var(--color-warning)' }} />
        <span style={{ color: '#1a1a2e', fontWeight: 500 }}>
          {highRiskGaps.length > 0 ? `${highRiskGaps.length} high-risk gap(s)` : `${mediumRiskGaps.length} medium-risk gap(s)`}
        </span>
        {onViewDetails && (
          <Button variant="ghost" size="sm" onClick={onViewDetails} leftIcon={<ChevronRight size={14} />}>
            View
          </Button>
        )}
      </div>
    )
  }

  return (
    <div style={{
      background: 'var(--color-warning-muted)',
      border: '1px solid var(--color-warning)',
      borderRadius: 'var(--radius-lg)',
      padding: 'var(--spacing-md)',
      marginBottom: 'var(--spacing-lg)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--spacing-md)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
          <AlertTriangle size={24} style={{ color: 'var(--color-warning)' }} />
          <div>
            <div style={{ fontWeight: 600, fontSize: '1rem' }}>Schedule Risk Detected</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
              {highRiskGaps.length > 0 ? `${highRiskGaps.length} high-risk gap(s)` : ''}
              {highRiskGaps.length > 0 && mediumRiskGaps.length > 0 && ' • '}
              {mediumRiskGaps.length > 0 ? `${mediumRiskGaps.length} medium-risk gap(s)` : ''}
            </div>
          </div>
        </div>
        <Badge variant={overallRisk === 'high' ? 'error' : 'warning'} size="md">
          {getRiskLabel(overallRisk)}
        </Badge>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
        {highRiskGaps.map(gap => (
          <div key={gap.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--spacing-sm)', background: 'var(--color-bg)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-error)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
              <Badge variant="error" size="sm">High Risk</Badge>
              <div>
                <div style={{ fontWeight: 500, fontSize: '0.85rem' }}>
                  {gap.currentVisit.jobCode} → {gap.nextVisit.jobCode}
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                  Buffer: {formatMinutes(gap.gapMinutes)} | Est. duration: {formatMinutes(gap.estimatedDurationMinutes)}
                </div>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => onViewDetails?.()}>
              Details
            </Button>
          </div>
        ))}
        {mediumRiskGaps.map(gap => (
          <div key={gap.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--spacing-sm)', background: 'var(--color-bg)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-warning)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
              <Badge variant="warning" size="sm">Medium Risk</Badge>
              <div>
                <div style={{ fontWeight: 500, fontSize: '0.85rem' }}>
                  {gap.currentVisit.jobCode} → {gap.nextVisit.jobCode}
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                  Buffer: {formatMinutes(gap.gapMinutes)} | Est. duration: {formatMinutes(gap.estimatedDurationMinutes)}
                </div>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => onViewDetails?.()}>
              Details
            </Button>
          </div>
        ))}
      </div>

      {onViewDetails && (
        <Button variant="primary" size="sm" onClick={onViewDetails} leftIcon={<ChevronRight size={14} />} fullWidth style={{ marginTop: 'var(--spacing-md)' }}>
          View All Gaps & Suggestions
        </Button>
      )}
    </div>
  )
}