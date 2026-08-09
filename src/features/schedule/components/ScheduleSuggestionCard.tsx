// ScheduleSuggestionCard - Card for displaying a schedule suggestion

import { AlertTriangle, Clock, MapPin, CheckCircle, X, ChevronRight } from 'lucide-react'
import { Badge } from '@components/ui/Badge'
import { Button } from '@components/ui/Button'
import { Card } from '@components/ui/Card'
import type { ScheduleSuggestionDexie } from '@lib/dexie'

interface ScheduleSuggestionCardProps {
  suggestion: ScheduleSuggestionDexie
  onAccept: (id: number) => void
  onDismiss: (id: number) => void
  onViewDetails?: (ids: number[]) => void
}

export function ScheduleSuggestionCard({ suggestion, onAccept, onDismiss, onViewDetails }: ScheduleSuggestionCardProps) {
  const isRisk = suggestion.scheduleRiskFlag
  const isPending = suggestion.status === 'pending'
  const isAccepted = suggestion.status === 'accepted'
  const isDismissed = suggestion.status === 'dismissed'

  return (
    <Card padding="md" style={{ 
      borderLeft: isRisk ? '4px solid var(--color-error)' : '4px solid var(--color-info)',
      opacity: isAccepted ? 0.6 : isDismissed ? 0.4 : 1,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 'var(--spacing-md)', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--spacing-sm)', flex: 1, minWidth: 200 }}>
          <div style={{ 
            width: '32px', height: '32px', borderRadius: '50%', 
            background: isRisk ? 'var(--color-error-muted)' : 'var(--color-info-muted)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px'
          }}>
            {isRisk ? <AlertTriangle size={16} style={{ color: 'var(--color-error)' }} /> : <MapPin size={16} style={{ color: 'var(--color-info)' }} />}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 500, fontSize: '0.9rem', color: 'var(--color-text)' }}>
              {suggestion.suggestionText}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-sm)', marginTop: 'var(--spacing-xs)', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
              {isRisk && <Badge variant="error" size="xs"><AlertTriangle size={8} /> Schedule Risk</Badge>}
              {suggestion.estimatedSavingMinutes > 0 && (
                <Badge variant="default" size="xs"><Clock size={8} /> ~{suggestion.estimatedSavingMinutes}min saved</Badge>
              )}
              {suggestion.estimatedSavingMiles > 0 && (
                <Badge variant="default" size="xs"><MapPin size={8} /> ~{suggestion.estimatedSavingMiles.toFixed(1)}mi saved</Badge>
              )}
              <Badge variant={isAccepted ? 'success' : isDismissed ? 'default' : isPending ? 'warning' : 'default'} size="xs">
                {suggestion.status}
              </Badge>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 'var(--spacing-sm)', flexWrap: 'wrap' }}>
          {isPending && (
            <>
              <Button variant="primary" size="sm" onClick={() => onAccept(suggestion.id!)} leftIcon={<CheckCircle size={14} />}>
                Accept
              </Button>
              <Button variant="ghost" size="sm" onClick={() => onDismiss(suggestion.id!)} leftIcon={<X size={14} />} style={{ color: 'var(--color-text-muted)' }}>
                Dismiss
              </Button>
            </>
          )}
          {onViewDetails && suggestion.affectedVisitIds.length > 0 && (
            <Button variant="ghost" size="sm" onClick={() => onViewDetails(suggestion.affectedVisitIds)} leftIcon={<ChevronRight size={14} />}>
              View Visits
            </Button>
          )}
        </div>
      </div>
    </Card>
  )
}