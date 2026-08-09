// useBookingConfirmation - Generate booking confirmation drafts

import { useState, useCallback } from 'react'
import { useAuth } from '@hooks/useAuth'
import { useDexie } from '@hooks/useDexie'
import { useToast } from '@components/ui/Toast'
import { enqueueSync } from '@lib/sync'

interface BookingConfirmationData {
  visitId: number
  customerName: string
  customerPhone: string
  date: string
  time: string
  address: string
  jobCode: string
  blindCount?: number
  appointmentType: string
  notes?: string
}

export function useBookingConfirmation() {
  const { db, isReady } = useDexie()
  const { advisor } = useAuth()
  const { showToast } = useToast()
  const [generating, setGenerating] = useState(false)

  const advisorId = advisor?.id ?? 0

  const generateConfirmation = useCallback(async (data: BookingConfirmationData) => {
    if (!advisorId || !isReady) return null

    setGenerating(true)
    try {
      const draftText = buildConfirmationMessage(data)

      const now = new Date()
      const localId = await db.messageDrafts.add({
        advisorId,
        relatedType: 'visit',
        relatedId: data.visitId,
        draftText,
        status: 'draft',
        sourceEnv: (import.meta.env.VITE_SOURCE_ENV as 'demo' | 'qa' | 'live') || 'live',
        createdAt: now,
        updatedAt: now,
      })

      await enqueueSync('messageDrafts', localId, 'create', {
        advisor_id: advisorId,
        related_type: 'visit',
        related_id: data.visitId,
        draft_text: draftText,
        status: 'draft',
        source_env: (import.meta.env.VITE_SOURCE_ENV as 'demo' | 'qa' | 'live') || 'live',
      })

      showToast('Booking confirmation drafted', 'success')
      return { id: localId, text: draftText }
    } catch (err) {
      console.error('Failed to generate confirmation:', err)
      showToast('Failed to generate confirmation', 'error')
      return null
    } finally {
      setGenerating(false)
    }
  }, [advisorId, isReady])

  const buildConfirmationMessage = (data: BookingConfirmationData): string => {
    const lines = [
      `Hi ${data.customerName},`,
      '',
      `This confirms your ${data.appointmentType} appointment:`,
      '',
      `📅 Date: ${data.date}`,
      `🕐 Time: ${data.time}`,
      `📍 Address: ${data.address}`,
      `🔧 Job: ${data.jobCode}`,
    ]

    if (data.blindCount) {
      lines.push(`🪟 Blinds: ${data.blindCount}`)
    }

    if (data.notes) {
      lines.push('', `Notes: ${data.notes}`)
    }

    lines.push(
      '',
      'Please reply CONFIRM or let us know if anything needs to change.',
      '',
      'Thanks,',
      'Your Blinds Advisor'
    )

    return lines.join('\n')
  }

  return {
    generating,
    generateConfirmation,
  }
}