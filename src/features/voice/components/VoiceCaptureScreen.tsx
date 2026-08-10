// VoiceCaptureScreen - Full-screen voice recording UI
// Launched via deep-link (beelo://voice-capture) or manual button

import { useEffect, useState, useCallback, useMemo } from 'react'
import { Mic, StopCircle, PauseCircle, Play, X, Clock, AlertCircle } from 'lucide-react'
import { useAudioRecorder } from '../utils/audioRecorder'
import { parseVoiceCaptureDeepLink, buildVoiceCaptureDeepLink } from '../utils/deepLinkHandler'
import { useAuth } from '@hooks/useAuth'
import { useDexie } from '@hooks/useDexie'
import { useSync } from '@hooks/useSync'
import { enqueueSync } from '@lib/sync'
import { logPilotEvent } from '@lib/supabase'
import { AudioRecorder } from '../utils/audioRecorder'

const fmtDuration = (ms: number) => {
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

export function VoiceCaptureScreen() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user } = useAuth()
  const { db, isReady } = useDexie()
  const { status: syncStatus } = useSync()
  const { showToast } = useToast()
  
  const [recordingState, setRecordingState] = useState<'idle' | 'recording' | 'paused' | 'saving' | 'done'>('idle')
  const [triggerMethod, setTriggerMethod] = useState<'manual_button' | 'siri_shortcut' | 'assistant_action'>('manual_button')
  const [leadId, setLeadId] = useState<string | null>(null)
  const [appointmentId, setAppointmentId] = useState<string | null>(null)
  const [sourceEnv] = useState<'demo' | 'qa' | 'live'>(() => (import.meta.env.VITE_SOURCE_ENV as any) || 'live')
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [durationMs, setDurationMs] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const { 
    state, 
    durationMs: recorderDurationMs, 
    start, 
    stop, 
    pause, 
    resume, 
    isRecording, 
    isPaused, 
    error: recorderError 
  } = useAudioRecorder({
    maxDurationMs: 300000,
    onStop: handleRecordingStop,
    onError: (err) => setError(err.message)
  })

  useEffect(() => {
    const url = window.location.href
    if (url.includes('beelo://voice-capture')) {
      const params = new URLSearchParams(new URL(url).search)
      const trigger = params.get('trigger')
      const leadIdParam = params.get('lead_id')
      const appointmentIdParam = params.get('appointment_id')
      
      if (trigger && ['siri_shortcut', 'google_assistant', 'assistant_action'].includes(trigger)) {
        setTriggerMethod(trigger === 'google_assistant' ? 'assistant_action' : trigger as any)
      }
      if (leadIdParam) setLeadId(leadIdParam)
      if (appointmentIdParam) setAppointmentId(appointmentIdParam)
    }
  }, [])

  const handleRecordingStop = useCallback(async (blob: Blob, durationMs: number) => {
    setAudioBlob(blob)
    setDurationMs(durationMs)
    setRecordingState('saving')
    
    try {
      const sourceEnv = (import.meta.env.VITE_SOURCE_ENV as any) || 'live'
      
      const audioPath = await AudioRecorder.saveAudioBlob(blob, `voice-${Date.now()}.m4a`)
      
      if (isReady) {
        const localId = await db.voiceNotes.add({
          advisorId: 0,
          audioPath,
          recordedAt: new Date(),
          durationSeconds: Math.round(durationMs / 1000),
          triggerMethod: triggerMethod,
          status: 'recorded',
          sourceEnv: sourceEnv as any,
          leadId: leadId ? parseInt(leadId) : undefined,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as any)
        
        await enqueueSync('voiceNotes', localId, 'create', {
          audio_path: audioPath,
          recorded_at: new Date().toISOString(),
          duration_seconds: Math.round(durationMs / 1000),
          trigger_method: triggerMethod,
          status: 'recorded',
          source_env: sourceEnv,
          lead_id: leadId ? parseInt(leadId) : null,
        })
      }
      
      setRecordingState('done')
      showToast('Voice note saved', 'success')
      
      // Log pilot event: voice note recorded
      logPilotEvent('voice_note_recorded', {
        duration_ms: durationMs,
        trigger_method: triggerMethod,
      }).catch(() => {}) // Fire and forget
      
      setTimeout(() => navigate(-1), 1500)
    } catch (err) {
      console.error('Failed to save voice note:', err)
      showToast(err instanceof Error ? err.message : 'Failed to save recording', 'error')
      setRecordingState('idle')
    }
  }, [triggerMethod, leadId, sourceEnv, isReady, db, enqueueSync, navigate])

  const handleStartRecording = useCallback(async () => {
    if (!isReady) {
      showToast('Database not ready', 'error')
      return
    }
    
    setError(null)
    setRecordingState('recording')
    try {
      await start()
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to start recording', 'error')
    }
  }, [isReady])

  const handlePauseResume = useCallback(() => {
    if (isPaused) {
      try {
        resume()
        setRecordingState('recording')
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'Failed to resume', 'error')
      }
    } else if (isRecording) {
      try {
        pause()
        setRecordingState('paused')
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'Failed to pause', 'error')
      }
    }
  }, [isRecording, isPaused, pause, resume])

  const handleCancel = useCallback(() => {
    if (isRecording || isPaused) {
      try {
        stop()
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'Failed to stop recording', 'error')
      }
    }
    setRecordingState('idle')
    setAudioBlob(null)
    setDurationMs(0)
    setError(null)
    navigate(-1)
  }, [isRecording, isPaused, stop, navigate])

  useEffect(() => {
    if (recorderDurationMs > 0) {
      setDurationMs(recorderDurationMs)
    }
  }, [recorderDurationMs])

  useEffect(() => {
    if (recorderError) {
      setError(recorderError.message)
    }
  }, [recorderError])

  const isOnline = navigator.onLine

  if (!isReady) {
    return <div style={{ padding: 'var(--spacing-xl)', textAlign: 'center' }}>Loading...</div>
  }

  // Compute styles outside JSX to avoid parsing issues
  const containerStyle = {
    minHeight: '100vh',
    background: 'var(--color-bg)',
    display: 'flex',
    flexDirection: 'column',
    padding: 'var(--spacing-lg)',
    paddingBottom: 'calc(var(--spacing-xl) + env(safe-area-inset-bottom, 0))'
  }

  const headerStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 'var(--spacing-xl)'
  }

  const cancelButtonStyle = {
    width: '44px',
    height: '44px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 'var(--radius-md)',
    background: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    color: 'var(--color-text)'
  }

  const headerTitleStyle = {
    margin: 0,
    fontSize: '1.25rem',
    fontWeight: 600
  }

  const errorStyle = {
    marginBottom: 'var(--spacing-lg)',
    padding: 'var(--spacing-md)',
    background: 'var(--color-error-muted)',
    border: '1px solid var(--color-error)',
    borderRadius: 'var(--radius-md)',
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--spacing-sm)',
    color: 'var(--color-error)'
  }

  const mainStyle = {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center'
  }

  const recordingCircleStyle = {
    width: '200px',
    height: '200px',
    borderRadius: '50%',
    background: isRecording || isPaused ? 'var(--color-primary-muted)' : 'var(--color-surface)',
    border: `2px solid ${isRecording ? 'var(--color-primary)' : isPaused ? 'var(--color-warning)' : 'var(--color-border)'}`,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all var(--transition-normal)',
    animation: isRecording ? 'pulse 1.5s ease-in-out infinite' : 'none',
    marginBottom: 'var(--spacing-xl)'
  }

  const durationStyle = {
    fontSize: '3rem', 
    fontWeight: 700, 
    fontFamily: 'var(--font-mono)',
    color: isRecording ? 'var(--color-primary)' : isPaused ? 'var(--color-warning)' : 'var(--color-text-muted)',
    fontVariantNumeric: 'tabular-nums'
  }

  const statusStyle = {
    marginTop: 'var(--spacing-xs)',
    fontSize: '0.75rem',
    color: 'var(--color-text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.1em'
  }

  const triggerStyle = {
    marginBottom: 'var(--spacing-lg)',
    fontSize: '0.75rem',
    color: 'var(--color-text-muted)'
  }

  const offlineStyle = {
    marginBottom: 'var(--spacing-lg)',
    padding: 'var(--spacing-sm) var(--spacing-md)',
    background: 'var(--color-warning-muted)',
    borderRadius: 'var(--radius-full)',
    fontSize: '0.75rem',
    color: '#1a1a2e',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 'var(--spacing-xs)'
  }

  const controlsStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 'var(--spacing-lg)',
    width: '100%',
    maxWidth: '320px'
  }

  const controlCancelButtonStyle = {
    width: '64px',
    height: '64px',
    borderRadius: '50%',
    background: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    color: 'var(--color-text-muted)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: recordingState === 'idle' ? 0.5 : 1
  }

  const pauseButtonStyle = {
    width: '64px',
    height: '64px',
    borderRadius: '50%',
    background: isPaused ? 'var(--color-warning-muted)' : 'var(--color-primary-muted)',
    border: `2px solid ${isPaused ? 'var(--color-warning)' : 'var(--color-primary)'}`,
    color: isPaused ? 'var(--color-warning)' : 'var(--color-primary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  }

  const recordButtonStyle = {
    width: '88px',
    height: '88px',
    borderRadius: '50%',
    background: isRecording || isPaused ? 'var(--color-error)' : 'var(--color-primary)',
    border: 'none',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: isRecording ? '0 0 0 4px var(--color-error-muted)' : 
               isPaused ? '0 0 0 4px var(--color-warning-muted)' : 
               '0 4px 12px var(--color-primary-muted)',
    animation: isRecording ? 'pulse-record 1.5s ease-in-out infinite' : 'none',
    transform: isRecording || isPaused ? 'scale(1.05)' : 'scale(1)',
    transition: 'all var(--transition-fast)'
  }

  const tipsStyle = {
    marginTop: 'var(--spacing-xl)',
    padding: 'var(--spacing-md)',
    background: 'var(--color-surface)',
    borderRadius: 'var(--radius-lg)',
    border: '1px solid var(--color-border)',
    width: '100%',
    maxWidth: '400px'
  }

  if (!isReady) {
    return <div style={{ padding: 'var(--spacing-xl)', textAlign: 'center' }}>Loading...</div>
  }

  return (
    <div style={containerStyle}>
      <header style={headerStyle}>
        <button
          onClick={handleCancel}
          disabled={recordingState === 'saving'}
          style={cancelButtonStyle}
          aria-label="Cancel"
        >
          <X size={24} />
        </button>
        
        <h1 style={headerTitleStyle}>
          {triggerMethod === 'siri_shortcut' ? 'Siri Voice Note' : 
           triggerMethod === 'assistant_action' ? 'Google Voice Note' : 
           'Record Voice Note'}
        </h1>
        
        <div style={{ width: '44px' }} />
      </header>

      {error && (
        <div style={errorStyle}>
          <AlertCircle size={20} />
          <span style={{ flex: 1 }}>{error}</span>
        </div>
      )}

      <main style={mainStyle}>
        <div style={recordingCircleStyle}>
          <div style={durationStyle}>
            {fmtDuration(durationMs)}
          </div>
          <div style={statusStyle}>
            {isRecording ? 'Recording' : isPaused ? 'Paused' : 'Ready'}
          </div>
        </div>

        <div style={triggerStyle}>
          Trigger: {triggerMethod === 'siri_shortcut' ? 'Siri Shortcut' : 
                    triggerMethod === 'assistant_action' ? 'Google Assistant' : 
                    'Manual Button'}
        </div>

        {!isOnline && (
          <div style={offlineStyle}>
            <span>📴</span> Offline — recording saved locally
          </div>
        )}

        <div style={controlsStyle}>
          <button
            onClick={handleCancel}
            disabled={recordingState === 'saving'}
            style={controlCancelButtonStyle}
            aria-label="Cancel"
          >
            <X size={28} />
          </button>

          {(isRecording || isPaused) && (
            <button
              onClick={handlePauseResume}
              disabled={recordingState === 'saving'}
              style={pauseButtonStyle}
              aria-label={isPaused ? 'Resume recording' : 'Pause recording'}
            >
              {isPaused ? <Play size={28} /> : <PauseCircle size={28} />}
            </button>
          )}

          <button
            onClick={recordingState === 'idle' ? handleStartRecording : stop}
            disabled={recordingState === 'saving'}
            style={recordButtonStyle}
            aria-label={isRecording || isPaused ? 'Stop recording' : 'Start recording'}
          >
            {isRecording || isPaused ? (
              <StopCircle size={36} />
            ) : (
              <Mic size={36} />
            )}
          </button>

          <div style={{ width: '64px' }} />
        </div>

        <div style={tipsStyle}>
          <h3 style={{ margin: '0 0 var(--spacing-sm)', fontSize: '0.875rem', fontWeight: 600 }}>
            Tips for best results
          </h3>
          <ul style={{ margin: 0, paddingLeft: 'var(--spacing-lg)', fontSize: '0.8rem', color: 'var(--color-text-muted)', lineHeight: 1.8 }}>
            <li>Speak clearly at normal volume</li>
            <li>Mention: customer name, blind count, parking/access notes</li>
            <li>Max 5 minutes per recording</li>
            <li>Works offline — syncs when back online</li>
          </ul>
        </div>
      </main>
    </div>
  )
}