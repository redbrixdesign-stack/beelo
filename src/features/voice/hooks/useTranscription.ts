// Transcription pipeline hook
// Handles triggering transcription Edge Function when VoiceNotes are synced

import { useEffect, useCallback, useState } from 'react'
import { supabase } from '@lib/supabase'
import { useSync } from '@hooks/useSync'
import { useDexie } from '@hooks/useDexie'
import { useAuth } from '@hooks/useAuth'
import type { VoiceNoteDexie } from '@lib/dexie'

interface TranscriptionResult {
  transcript: string
  extracted_blind_count: number | null
  extracted_parking_notes: string | null
  extracted_access_notes: string | null
  extracted_name_spoken: string | null
  confidence: number
}

interface VoiceNoteWithTranscription extends VoiceNoteDexie {
  transcriptionResult?: TranscriptionResult
}

export function useTranscription() {
  const { db, isReady } = useDexie()
  const { user, advisor } = useAuth()
  const { status: syncStatus, pendingCount } = useSync()
  const [processing, setProcessing] = useState(false)
  const [lastProcessed, setLastProcessed] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)

  const processPendingVoiceNotes = useCallback(async () => {
    if (!isReady || !advisor || processing) return
    
    setProcessing(true)
    setError(null)
    
    try {
      // Get voice notes that need transcription (status = 'recorded' or 'transcribed' but missing transcript)
      const pendingNotes = await db.voiceNotes
        .where('advisorId')
        .equals(advisor.id!)
        .and(n => n.status === 'recorded' && n.audioPath)
        .toArray()

      if (pendingNotes.length === 0) {
        setProcessing(false)
        return
      }

      console.log(`Processing ${pendingNotes.length} voice notes for transcription`)

      for (const note of pendingNotes) {
        try {
          // Upload audio to Storage first
          const audioPath = note.audioPath
          let storagePath = audioPath
          
          // If audioPath is a local blob URL, we need to upload to Supabase Storage
          if (audioPath.startsWith('blob:') || audioPath.startsWith('data:')) {
            // Fetch the blob and upload
            const response = await fetch(audioPath)
            const blob = await response.blob()
            
            const fileName = `voice-notes/${advisor.id}/${note.id}.m4a`
            const { error: uploadError } = await supabase.storage
              .from('voice-notes')
              .upload(fileName, blob, {
                contentType: 'audio/m4a',
                upsert: false
              })
            
            if (uploadError) {
              throw new Error(`Failed to upload audio: ${uploadError.message}`)
            }
            
            storagePath = fileName
            
            // Update local record with storage path
            await db.voiceNotes.update(note.id!, { audioPath: storagePath })
          }

          // Call transcription Edge Function
          const edgeFunctionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/transcribe-voice-note`
          const response = await fetch(edgeFunctionUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify({
              voice_note_id: String(note.id),
              audio_path: storagePath,
            }),
          })

          if (!response.ok) {
            const errorData = await response.json()
            throw new Error(`Transcription failed: ${errorData.error || 'Unknown error'}`)
          }

          const result = await response.json()
          
          // Update local record with transcription results
          await db.voiceNotes.update(note.id!, {
            transcript: result.transcript,
            extractedBlindCount: result.extracted_blind_count,
            extractedParkingNotes: result.extracted_parking_notes,
            extractedAccessNotes: result.extracted_access_notes,
            extractedNameSpoken: result.extracted_name_spoken,
            status: 'transcribed',
            updatedAt: new Date(),
          } as any)

          // Update sync queue status
          // The sync queue will pick up the updated record
          
          console.log(`Transcribed voice note ${note.id}`)
        } catch (err) {
          console.error(`Failed to transcribe voice note ${note.id}:`, err)
          // Update with error status
          await db.voiceNotes.update(note.id!, {
            status: 'error',
            updatedAt: new Date(),
          } as any)
        }
      }

      setLastProcessed(new Date())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Transcription failed')
    } finally {
      setProcessing(false)
    }
  }, [isReady, db])

  // Auto-process when sync is complete and there are pending notes
  useEffect(() => {
    if (syncStatus === 'synced' && pendingCount > 0 && !processing) {
      processPendingVoiceNotes()
    }
  }, [syncStatus, pendingCount, processing])

  // Also run on mount if there are pending items
  useEffect(() => {
    if (isReady && !processing) {
      processPendingVoiceNotes()
    }
  }, [isReady])

  return {
    processing,
    lastProcessed,
    error,
    processPendingVoiceNotes,
  }
}