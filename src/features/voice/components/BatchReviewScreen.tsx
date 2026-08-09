// BatchReviewScreen - Main batch review UI with three matching strategies
// Triggered by downtime detection or manual navigation

import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDexie } from '@hooks/useDexie'
import { useAuth } from '@hooks/useAuth'
import { useToast } from '@components/ui/Toast'
import { enqueueSync } from '@lib/sync'
import { Card } from '@components/ui/Card'
import { Badge } from '@components/ui/Badge'
import { Button } from '@components/ui/Button'
import { ChevronLeft, CheckCircle, SkipForward } from 'lucide-react'
import { ScreenshotMatcher } from './ScreenshotMatcher'
import { ManualMatcher } from './ManualMatcher'
import { NameHintMatcher } from './NameHintMatcher'
import type { VoiceNoteDexie } from '@lib/dexie'

type MatchStep = 'screenshot' | 'manual' | 'name_hint' | 'complete'

interface BatchReviewScreenProps {
  initialVoiceNoteId?: number
  onComplete?: () => void
  onClose?: () => void
}

export function BatchReviewScreen({ initialVoiceNoteId, onComplete, onClose }: BatchReviewScreenProps) {
  const navigate = useNavigate()
  const { db, isReady } = useDexie()
  const { advisor } = useAuth()
  const { showToast } = useToast()
  
  const [voiceNotes, setVoiceNotes] = useState<any[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [matchStep, setMatchStep] = useState<MatchStep>('screenshot')
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    if (!isReady || !advisor) return
    loadVoiceNotes()
  }, [isReady, advisor])

  const loadVoiceNotes = async () => {
    if (!advisor) return
    setLoading(true)
    try {
      const notes = await db.voiceNotes
        .where('advisorId')
        .equals(advisor.id!)
        .and(n => ['recorded', 'transcribed', 'unmatched'].includes(n.status))
        .sortBy('recordedAt')
      
      setVoiceNotes(notes.reverse())
      
      if (initialVoiceNoteId) {
        const idx = notes.findIndex(n => n.id === initialVoiceNoteId)
        if (idx !== -1) setCurrentIndex(idx)
      }
    } catch (err) {
      console.error('Failed to load voice notes for review:', err)
    } finally {
      setLoading(false)
    }
  }

  const currentVoiceNote = voiceNotes[currentIndex]
  const isLastNote = currentIndex === voiceNotes.length - 1
  const progress = voiceNotes.length > 0 ? ((currentIndex + 1) / voiceNotes.length) * 100 : 0

  const handleMatch = async (matchedId: number, matchMethod: 'screenshot_proximity' | 'manual_review' | 'name_hint') => {
    if (!currentVoiceNote) return
    
    setProcessing(true)
    try {
      await db.voiceNotes.update(currentVoiceNote.id!, {
        matchedVisitId: matchedId,
        matchMethod,
        status: 'matched',
        updatedAt: new Date(),
      } as any)

      await enqueueSync('voiceNotes', currentVoiceNote.id!, 'update', {
        id: currentVoiceNote.id,
        matched_visit_id: matchedId,
        match_method: matchMethod,
        status: 'matched',
        updated_at: new Date().toISOString(),
      })

      showToast('Matched successfully', 'success')
      await goToNext()
    } catch (err) {
      console.error('Match failed:', err)
      showToast('Failed to match', 'error')
    } finally {
      setProcessing(false)
    }
  }

  const goToNext = async () => {
    if (isLastNote) {
      setMatchStep('complete')
      onComplete?.()
      showToast('All voice notes reviewed!', 'success')
      setTimeout(() => onClose?.(), 1000)
    } else {
      setCurrentIndex(prev => prev + 1)
      setMatchStep('screenshot')
    }
  }

  const handleSkip = () => {
    if (matchStep === 'screenshot') {
      setMatchStep('manual')
    } else if (matchStep === 'manual') {
      setMatchStep('name_hint')
    } else {
      goToNext()
    }
  }

  const handleBack = () => {
    if (matchStep === 'manual') {
      setMatchStep('screenshot')
    } else if (matchStep === 'name_hint') {
      setMatchStep('manual')
    } else if (matchStep === 'screenshot' && currentIndex > 0) {
      setCurrentIndex(prev => prev - 1)
      setMatchStep('name_hint')
    } else {
      onClose?.()
    }
  }

  if (!isReady || !advisor) {
    return <div style={{ padding: 'var(--spacing-xl)', textAlign: 'center' }}>Loading...</div>
  }

  if (!loading && voiceNotes.length === 0) {
    return (
      <div style={{ padding: 'var(--spacing-xl)', textAlign: 'center' }}>
        <div style={{ color: 'var(--color-success)', marginBottom: 'var(--spacing-md)' }}>
          <CheckCircle size={48} />
        </div>
        <h2 style={{ margin: '0 0 var(--spacing-sm)', fontSize: '1.25rem' }}>All caught up!</h2>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--spacing-lg)' }}>
          No voice notes need review right now
        </p>
        <Button variant="secondary" onClick={onClose}>Close</Button>
      </div>
    )
  }

  if (matchStep === 'complete') {
    return (
      <div style={{ padding: 'var(--spacing-xl)', textAlign: 'center' }}>
        <div style={{ color: 'var(--color-success)', marginBottom: 'var(--spacing-md)' }}>
          <CheckCircle size={64} />
        </div>
        <h2 style={{ margin: '0 0 var(--spacing-sm)', fontSize: '1.5rem' }}>All done!</h2>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--spacing-lg)' }}>
          Reviewed {voiceNotes.length} voice note{voiceNotes.length !== 1 ? 's' : ''}
        </p>
        <Button onClick={onClose}>Done</Button>
      </div>
    )
  }

  const currentNote = voiceNotes[currentIndex]

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)', padding: 'var(--spacing-md)', paddingBottom: 'calc(var(--spacing-xl) + env(safe-area-inset-bottom, 0))' }}>
      {/* Header */}
      <header style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 'var(--spacing-lg)',
        paddingBottom: 'var(--spacing-md)',
        borderBottom: '1px solid var(--color-border)'
      }}>
        <button
          onClick={onClose}
          style={{
            width: '44px',
            height: '44px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 'var(--radius-md)',
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text)'
          }}
          aria-label="Close"
        >
          <ChevronLeft size={24} />
        </button>
        
        <div style={{ flex: 1, textAlign: 'center' }}>
          <h1 style={{ margin: '0 0 4px', fontSize: '1.125rem', fontWeight: 600 }}>Batch Review</h1>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--spacing-sm)', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
            <span>{currentIndex + 1} of {voiceNotes.length}</span>
            <div style={{ 
              width: '100px', 
              height: '4px', 
              background: 'var(--color-border)', 
              borderRadius: '2px',
              overflow: 'hidden'
            }}>
              <div style={{
                width: `${progress}%`,
                height: '100%',
                background: 'var(--color-primary)',
                transition: 'width var(--transition-normal)'
              }} />
            </div>
          </div>
        </div>
        
        <div style={{ width: '44px' }} />
      </header>

      {/* Current voice note preview */}
      <Card padding="md" style={{ marginBottom: 'var(--spacing-lg)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-sm)' }}>
          <Badge variant="info" size="sm">Step: {matchStep === 'screenshot' ? '1/3' : matchStep === 'manual' ? '2/3' : '3/3'}</Badge>
          <Badge variant={matchStep === 'screenshot' ? 'info' : matchStep === 'manual' ? 'warning' : 'success'} size="sm">
            {matchStep === 'screenshot' ? 'Screenshot' : matchStep === 'manual' ? 'Manual' : 'Name Hint'}
          </Badge>
          <Badge variant={currentVoiceNote?.status === 'recorded' ? 'warning' : currentVoiceNote?.status === 'transcribed' ? 'info' : 'default'} size="sm">
            {currentVoiceNote?.status}
          </Badge>
        </div>
        
        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
          <div>Recorded: {new Date(currentVoiceNote.recordedAt).toLocaleString()}</div>
          {currentVoiceNote.transcript && (
            <div style={{ marginTop: '4px', fontStyle: 'italic', fontSize: '0.8rem', maxHeight: '60px', overflow: 'hidden' }}>
              "{currentVoiceNote.transcript.slice(0, 150)}{currentVoiceNote.transcript.length > 150 ? '...' : ''}"
            </div>
          )}
          {currentVoiceNote.extracted_blind_count && (
            <div style={{ marginTop: '4px', color: 'var(--color-primary)' }}>
              🎯 {currentVoiceNote.extracted_blind_count} blind{currentVoiceNote.extracted_blind_count > 1 ? 's' : ''} detected
            </div>
          )}
          {currentVoiceNote.extracted_name_spoken && (
            <div style={{ marginTop: '4px', color: 'var(--color-success)' }}>
              👤 Name: {currentVoiceNote.extracted_name_spoken}
            </div>
          )}
          {currentVoiceNote.extracted_parking_notes && (
            <div style={{ marginTop: '4px', color: 'var(--color-warning)' }}>
              🅿️ Parking: {currentVoiceNote.extracted_parking_notes}
            </div>
          )}
          {currentVoiceNote.extracted_access_notes && (
            <div style={{ marginTop: '4px', color: 'var(--color-primary)' }}>
              ♿ Access: {currentVoiceNote.extracted_access_notes}
            </div>
          )}
        </div>
      </Card>

      {/* Matching steps */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
        {matchStep === 'screenshot' && (
          <ScreenshotMatcher
            voiceNote={currentVoiceNote}
            onMatch={(visitId) => handleMatch(visitId, 'screenshot_proximity')}
            onSkip={() => setMatchStep('manual')}
            voiceNoteId={currentVoiceNote.id}
          />
        )}
        
        {matchStep === 'manual' && (
          <ManualMatcher
            voiceNote={currentVoiceNote}
            onMatch={(visitId) => handleMatch(visitId, 'manual_review')}
            onSkip={() => setMatchStep('name_hint')}
          />
        )}
        
        {matchStep === 'name_hint' && (
          <NameHintMatcher
            voiceNote={currentVoiceNote}
            onMatch={(customerId) => handleMatch(customerId, 'name_hint')}
            onSkip={() => goToNext()}
          />
        )}

        {/* Navigation controls */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          marginTop: 'var(--spacing-lg)',
          paddingTop: 'var(--spacing-md)',
          borderTop: '1px solid var(--color-border)'
        }}>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={matchStep === 'screenshot' ? () => {} : matchStep === 'manual' ? () => setMatchStep('screenshot') : () => setMatchStep('manual')}
            disabled={matchStep === 'screenshot' || processing}
            leftIcon={<ChevronLeft size={16} />}
          >
            Back
          </Button>
          
          <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
            <Button 
              variant="secondary" 
              size="sm" 
              onClick={() => matchStep === 'screenshot' ? setMatchStep('manual') : matchStep === 'manual' ? setMatchStep('name_hint') : goToNext()}
              disabled={processing}
              rightIcon={matchStep === 'name_hint' ? <CheckCircle size={16} /> : <SkipForward size={16} />}
            >
              {matchStep === 'name_hint' ? 'Finish' : 'Skip'}
            </Button>
            <Button 
              variant="primary" 
              size="sm" 
              onClick={() => {}}
              disabled={true}
              style={{ opacity: 0.5 }}
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}