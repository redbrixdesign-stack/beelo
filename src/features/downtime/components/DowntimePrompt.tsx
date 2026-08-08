// DowntimePrompt - UI component for downtime detection prompt

import { useDowntimeDetector } from './useDowntimeDetector'
import { Card } from '@components/ui/Card'
import { Button } from '@components/ui/Button'
import { Badge } from '@components/ui/Badge'
import { Clock, AlertTriangle } from 'lucide-react'

export function DowntimePrompt({ onNavigateToReview }: { onNavigateToReview?: () => void }) {
  const { show, gap, backlogCount, backlogItems, dismiss, navigateToReview } = useDowntimeDetector()

  if (!show || !gap) return null

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  }

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours}h ${mins}m`
  }

  const voiceNotesCount = backlogItems.filter(i => i.type === 'voice_note').length
  const leadsCount = backlogItems.filter(i => i.type === 'lead').length
  const callsCount = backlogItems.filter(i => i.type === 'call_attempt').length

  return (
    <div style={{ 
      position: 'fixed', 
      bottom: 'calc(var(--spacing-xl) + env(safe-area-inset-bottom, 0))', 
      left: 'var(--spacing-md)', 
      right: 'var(--spacing-md)', 
      zIndex: 1000,
      animation: 'slideUp 0.3s ease-out'
    }}>
      <style jsx>{`
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
      <Card padding="md" style={{ 
        background: 'var(--color-warning-muted)', 
        border: '1px solid var(--color-warning)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--spacing-md)' }}>
          <div style={{ 
            width: '40px', 
            height: '40px', 
            borderRadius: '50%', 
            background: 'var(--color-warning)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            color: 'white',
            flexShrink: 0
          }}>
            <AlertTriangle size={20} />
          </div>
          
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', marginBottom: 'var(--spacing-xs)' }}>
              <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Downtime detected</span>
              <Badge variant="warning" size="sm">{formatDuration(gap.durationMinutes)} gap</Badge>
            </div>
            
            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: 'var(--spacing-sm)' }}>
              <span style={{ fontWeight: 500 }}>{gap.previousVisit?.jobCode}</span> ends{' '}
              <Clock size={12} style={{ verticalAlign: 'middle' }} /> {formatTime(gap.startTime.toISOString())}{' '}
              → <span style={{ fontWeight: 500 }}>{gap.nextVisit?.jobCode}</span> starts{' '}
              <Clock size={12} style={{ verticalAlign: 'middle' }} /> {formatTime(gap.endTime.toISOString())}
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-xs)', marginTop: 'var(--spacing-sm)' }}>
              {voiceNotesCount > 0 && (
                <Badge variant="info" size="sm" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Mic size={10} /> {voiceNotesCount} voice note{voiceNotesCount > 1 ? 's' : ''}
                </Badge>
              )}
              {leadsCount > 0 && (
                <Badge variant="success" size="sm" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Users size={10} /> {leadsCount} lead{leadsCount > 1 ? 's' : ''}
                </Badge>
              )}
              {callsCount > 0 && (
                <Badge variant="default" size="sm" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <CheckCircle size={10} /> {callsCount} call{callsCount > 1 ? 's' : ''}
                </Badge>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)', alignItems: 'flex-end' }}>
            <Button variant="primary" size="sm" onClick={() => { navigateToReview(); onNavigateToReview?.() }} leftIcon={<CheckCircle size={14} />}>
              Review ({backlogCount})
            </Button>
            <Button variant="ghost" size="sm" onClick={dismiss} style={{ width: '100%' }}>
              Dismiss
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}