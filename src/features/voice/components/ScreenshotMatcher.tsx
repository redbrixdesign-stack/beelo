// Screenshot proximity matcher component
// Matches VoiceNotes to appointment card screenshots based on time proximity

import { useState, useEffect, useCallback } from 'react'
import { useDexie } from '@hooks/useDexie'
import { useAuth } from '@hooks/useAuth'
import { enqueueSync } from '@lib/sync'
import { Card } from '@components/ui/Card'
import { Badge } from '@components/ui/Badge'
import { Button } from '@components/ui/Button'
import { Image, CheckCircle } from 'lucide-react'
import type { VoiceNoteDexie, DocumentDexie, VisitDexie } from '@lib/dexie'

interface ScreenshotMatcherProps {
  voiceNote: any // VoiceNote with transcript and extracted fields
  onMatch: (visitId: number, matchMethod: 'screenshot_proximity') => Promise<void>
  onSkip: () => void
  voiceNoteId: number
}

export function ScreenshotMatcher({ voiceNote, onMatch, onSkip, voiceNoteId }: ScreenshotMatcherProps) {
  const { db, isReady } = useDexie()
  const { advisor } = useAuth()
  const [screenshots, setScreenshots] = useState<DocumentDexie[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedScreenshot, setSelectedScreenshot] = useState<DocumentDexie | null>(null)

  useEffect(() => {
    if (!isReady || !advisor) return
    loadScreenshots()
  }, [isReady, advisor])

  const loadScreenshots = async () => {
    if (!advisor) return
    setLoading(true)
    try {
      // Find appointment card screenshots within ±5 minutes of voice note recording
      const voiceNoteTime = voiceNote.recordedAt
      const windowStart = new Date(voiceNoteTime.getTime() - 5 * 60 * 1000)
      const windowEnd = new Date(voiceNoteTime.getTime() + 5 * 60 * 1000)

      const screenshots = await db.documents
        .where('advisorId')
        .equals(advisor.id!)
        .and(doc => 
          doc.type === 'appointment_card' &&
          doc.createdAt >= windowStart &&
          doc.createdAt <= windowEnd
        )
        .sortBy('createdAt')
      
      setScreenshots(screenshots.reverse())
    } catch (err) {
      console.error('Failed to load screenshots:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleMatch = async (screenshot: DocumentDexie) => {
    setSelectedScreenshot(screenshot)
    // Small delay to show selection
    setTimeout(() => {
      onMatch(parseInt(screenshot.id!), 'screenshot_proximity')
    }, 200)
  }

  if (loading) {
    return (
      <Card padding="md" style={{ textAlign: 'center' }}>
        <div style={{ color: 'var(--color-text-muted)' }}>Loading screenshots...</div>
      </Card>
    )
  }

  if (screenshots.length === 0) {
    return (
      <Card padding="md">
        <div style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>
          <p style={{ margin: '0 0 var(--spacing-sm)' }}>No appointment card screenshots found near this recording time</p>
          <Button variant="ghost" size="sm" onClick={onSkip}>Try manual matching</Button>
        </div>
      </Card>
    )
  }

  return (
    <Card padding="md">
      <h3 style={{ margin: '0 0 var(--spacing-md)', fontSize: '0.9rem', fontWeight: 600 }}>
        Screenshot Proximity Match
      </h3>
      <p style={{ margin: '0 0 var(--spacing-md)', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
        Found {screenshots.length} appointment card screenshot{screenshots.length !== 1 ? 's' : ''} 
        within 5 minutes of this recording. Tap to match.
      </p>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
        {screenshots.map(screenshot => (
          <ScreenshotCard
            key={screenshot.id}
            screenshot={screenshot}
            selected={selectedScreenshot?.id === screenshot.id}
            onSelect={() => handleMatch(screenshot)}
          />
        ))}
      </div>

      <Button variant="ghost" size="sm" onClick={onSkip} style={{ marginTop: 'var(--spacing-md)', width: '100%' }}>
        Skip to manual matching
      </Button>
    </Card>
  )
}

function ScreenshotCard({ screenshot, selected, onSelect }: { 
  screenshot: any; 
  selected: boolean; 
  onSelect: () => void 
}) {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div
      onClick={onSelect}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--spacing-md)',
        padding: 'var(--spacing-sm)',
        background: screenshot.id === selected ? 'var(--color-primary-muted)' : 'var(--color-bg)',
        border: `2px solid ${screenshot.id === selected ? 'var(--color-primary)' : 'var(--color-border)'}`,
        borderRadius: 'var(--radius-md)',
        cursor: 'pointer',
        transition: 'all var(--transition-fast)'
      }}
    >
      <div style={{ 
        width: '60px', 
        height: '45px', 
        borderRadius: 'var(--radius-sm)',
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        flexShrink: 0
      }}>
        {screenshot.imagePath && (
          <img 
            src={screenshot.imagePath} 
            alt="Appointment card" 
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        )}
      </div>
      
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ 
          fontSize: '0.75rem', 
          color: 'var(--color-text-muted)',
          marginBottom: '2px'
        }}>
          Appointment card • {formatDate(screenshot.createdAt)}
        </div>
        <div style={{ 
          fontSize: '0.8rem', 
          fontWeight: 500, 
          color: 'var(--color-text)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }}>
          {screenshot.parsedJson?.customer_name || screenshot.parsedJson?.customerNumber || 'Unknown customer'}
        </div>
        {screenshot.parsedJson?.job_code && (
          <div style={{ 
            fontSize: '0.7rem', 
            color: 'var(--color-primary)',
            fontFamily: 'var(--font-mono)'
          }}>
            Job: {screenshot.parsedJson.job_code}
          </div>
        )}
      </div>
      
      {selected && (
        <div style={{ color: 'var(--color-primary)' }}>
          <CheckCircle size={20} />
        </div>
      )}
    </div>
  )
}