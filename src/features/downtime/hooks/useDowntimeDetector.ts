import { useEffect, useState, useRef, useCallback } from 'react'
import { useDexie } from '@hooks/useDexie'
import { useAuth } from '@hooks/useAuth'
import { useSync } from '@hooks/useSync'

const DOWNTIME_THRESHOLD_MINUTES = 30
const CHECK_INTERVAL_MS = 60000

interface DowntimeGap {
  id: string
  startTime: Date
  endTime: Date
  durationMinutes: number
  previousVisitId?: string
  nextVisitId?: string
  previousVisit?: {
    id: string
    customerNumber: string
    dateTime: string
    jobCode: string
  }
  nextVisit?: {
    id: string
    customerNumber: string
    dateTime: string
    jobCode: string
  }
}

interface BacklogItem {
  id: number
  type: 'voice_note' | 'lead' | 'call_attempt'
  status: string
  recordedAt: Date
  preview: string
}

interface DowntimePrompt {
  show: boolean
  gap: DowntimeGap | null
  backlogCount: number
  backlogItems: Array<{ id: number; type: string; status: string; recordedAt: Date; preview: string }>
  dismiss: () => void
  navigateToReview: () => void
}

export function useDowntimeDetector(): DowntimePrompt {
  const { db, isReady } = useDexie()
  const { advisor } = useAuth()
  const { status: syncStatus } = useSync()
  const [prompt, setPrompt] = useState<DowntimePrompt>({
    show: false,
    gap: null,
    backlogCount: 0,
    backlogItems: [],
    dismiss: () => {},
    navigateToReview: () => {}
  })
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const dismissedGapsRef = useRef<Set<string>>(new Set())

  const checkForDowntime = useCallback(async () => {
    if (!isReady || !advisor || syncStatus !== 'synced') return

    try {
      const visits = await db.visits
        .where('advisorId')
        .equals(advisor.id!)
        .and(v => v.dateTime > new Date())
        .sortBy('dateTime')

      if (visits.length < 2) return

      const now = new Date()
      const gaps: DowntimeGap[] = []

      for (let i = 0; i < visits.length - 1; i++) {
        const current = visits[i]
        const next = visits[i + 1]
        
        const currentEnd = new Date(current.dateTime)
        const nextStart = new Date(next.dateTime)
        
        const estimatedDuration = current.estimatedDurationMinutes || 
          (current.blindCount ? current.blindCount * 33 : 60)
        currentEnd.setMinutes(currentEnd.getMinutes() + estimatedDuration)

        const gapMinutes = (nextStart.getTime() - currentEnd.getTime()) / (1000 * 60)

        if (gapMinutes >= DOWNTIME_THRESHOLD_MINUTES) {
          const gapId = `${current.id}-${next.id}`
          
          if (!dismissedGapsRef.current.has(gapId)) {
            gaps.push({
              id: gapId,
              startTime: currentEnd,
              endTime: nextStart,
              durationMinutes: Math.round(gapMinutes),
              previousVisitId: String(current.id),
              nextVisitId: String(next.id),
              previousVisit: {
                id: String(current.id),
                customerNumber: current.customerNumber,
                dateTime: current.dateTime.toISOString(),
                jobCode: current.jobCode
              },
              nextVisit: {
                id: String(next.id),
                customerNumber: next.customerNumber,
                dateTime: next.dateTime.toISOString(),
                jobCode: next.jobCode
              }
            })
          }
        }
      }

      if (gaps.length === 0) return

      const backlogItems: Array<{ id: number; type: string; status: string; recordedAt: Date; preview: string }> = []

      const unmatchedVoiceNotes = await db.voiceNotes
        .where('advisorId')
        .equals(advisor.id!)
        .and(n => ['recorded', 'transcribed', 'unmatched'].includes(n.status))
        .toArray()

      unmatchedVoiceNotes.forEach(note => {
        backlogItems.push({
          id: note.id!,
          type: 'voice_note',
          status: note.status,
          recordedAt: note.recordedAt,
          preview: `Voice note (${note.durationSeconds}s) - ${note.transcript?.slice(0, 50) || 'No transcript'}`
        })
      })

      const unmatchedLeads = await db.leads
        .where('advisorId')
        .equals(advisor.id!)
        .and(l => ['new', 'call_attempted', 'follow_up_due'].includes(l.status))
        .toArray()

      unmatchedLeads.forEach(lead => {
        backlogItems.push({
          id: lead.id!,
          type: 'lead',
          status: lead.status,
          recordedAt: lead.landedAt,
          preview: `Lead: ${lead.name || 'Unnamed'} - ${lead.status}`
        })
      })

      if (backlogItems.length === 0) return

      const gap = gaps[0]
      
      setPrompt({
        show: true,
        gap,
        backlogCount: backlogItems.length,
        backlogItems,
        dismiss: () => {
          dismissedGapsRef.current.add(gap.id)
          setPrompt(prev => ({ ...prev, show: false }))
        },
        navigateToReview: () => {
          window.dispatchEvent(new CustomEvent('navigate-to-batch-review', { 
            detail: { gapId: gap.id } 
          }))
        }
      })
    } catch (err) {
      console.error('Downtime detection failed:', err)
    }
  }, [db, advisor, isReady, syncStatus])

  useEffect(() => {
    if (!isReady || !advisor) return

    checkForDowntime()

    intervalRef.current = setInterval(checkForDowntime, CHECK_INTERVAL_MS)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isReady, advisor, checkForDowntime])

  useEffect(() => {
    const handleNavigate = () => {
      setPrompt(prev => ({ ...prev, show: false }))
    }
    
    window.addEventListener('navigate-to-batch-review', handleNavigate)
    return () => window.removeEventListener('navigate-to-batch-review', handleNavigate)
  }, [])

  return {
    show: prompt.show,
    gap: prompt.gap,
    backlogCount: prompt.backlogCount,
    backlogItems: prompt.backlogItems,
    dismiss: prompt.dismiss,
    navigateToReview: prompt.navigateToReview
  }
}