// Schedule risk computation hook
// Deterministic client-side computation based on blind count and visit gaps

import { useState, useEffect, useCallback } from 'react'
import { useDexie } from '@hooks/useDexie'
import { useAuth } from '@hooks/useAuth'
import type { VisitDexie, ScheduleSuggestionDexie } from '@lib/dexie'
import { ScheduleRiskLevel } from '@lib/constants'

interface ScheduleGap {
  id: string
  currentVisit: VisitDexie
  nextVisit: VisitDexie
  gapMinutes: number
  estimatedDurationMinutes: number
  riskLevel: ScheduleRiskLevel
  bufferMinutes: number
}

interface ScheduleRiskResult {
  gaps: ScheduleGap[]
  overallRisk: ScheduleRiskLevel
  suggestions: ScheduleSuggestionDexie[]
}

export function useScheduleRisk(): ScheduleRiskResult {
  const { db, isReady } = useDexie()
  const { user } = useAuth()
  const [gaps, setGaps] = useState<ScheduleGap[]>([])
  const [suggestions, setSuggestions] = useState<ScheduleSuggestionDexie[]>([])

  const advisorId = user?.id ? parseInt(user.id) : 0

  const computeScheduleRisk = useCallback(async () => {
    if (!isReady || !advisorId) return

    try {
      // Get future visits sorted by dateTime
      const visits = await db.visits
        .where('advisorId')
        .equals(advisorId)
        .and(v => v.dateTime > new Date())
        .sortBy('dateTime')

      if (visits.length < 2) {
        setGaps([])
        setSuggestions([])
        return
      }

      const computedGaps: ScheduleGap[] = []

      for (let i = 0; i < visits.length - 1; i++) {
        const current = visits[i]
        const next = visits[i + 1]

        const currentEnd = new Date(current.dateTime)
        const nextStart = new Date(next.dateTime)

        // Estimated duration = blindCount * fullJobMinutesPerBlind
        // We need to get the advisor's fullJobMinutesPerBlind from advisor record
        // For now use a default of 33 min/blind
        const estimatedDuration = current.estimatedDurationMinutes || 
          (current.blindCount ? current.blindCount * 33 : 60)
        
        currentEnd.setMinutes(currentEnd.getMinutes() + estimatedDuration)

        const gapMinutes = Math.round((nextStart.getTime() - currentEnd.getTime()) / (1000 * 60))

        let riskLevel: ScheduleRiskLevel = 'low'
        if (gapMinutes < 15) riskLevel = 'high'
        else if (gapMinutes < 30) riskLevel = 'medium'

        computedGaps.push({
          id: `${current.id}-${next.id}`,
          currentVisit: current,
          nextVisit: next,
          gapMinutes,
          estimatedDurationMinutes: estimatedDuration,
          riskLevel,
          bufferMinutes: gapMinutes,
        })
      }

      setGaps(computedGaps)

      // Generate schedule suggestions for high-risk gaps
      const newSuggestions: ScheduleSuggestionDexie[] = computedGaps
        .filter(g => g.riskLevel === 'high' || g.riskLevel === 'medium')
        .map(gap => ({
          advisorId,
          date: new Date(),
          suggestionText: `Schedule risk: ${gap.currentVisit.jobCode} (${gap.estimatedDurationMinutes}min) → ${gap.nextVisit.jobCode} has only ${gap.gapMinutes}min buffer. Consider rescheduling or adding buffer.`,
          affectedVisitIds: [gap.currentVisit.id!, gap.nextVisit.id!],
          estimatedSavingMiles: 0,
          estimatedSavingMinutes: Math.max(0, 30 - gap.gapMinutes),
          scheduleRiskFlag: true,
          status: 'pending' as const,
          sourceEnv: (import.meta.env.VITE_SOURCE_ENV as 'demo' | 'qa' | 'live') || 'live',
          createdAt: new Date(),
          updatedAt: new Date(),
        }))

      setSuggestions(newSuggestions)
    } catch {
      console.error('Schedule risk computation failed:')
    }
  }, [isReady, advisorId])

  useEffect(() => {
    computeScheduleRisk()
  }, [computeScheduleRisk])

  const overallRisk: ScheduleRiskLevel = gaps.some(g => g.riskLevel === 'high') ? 'high' :
    gaps.some(g => g.riskLevel === 'medium') ? 'medium' : 'low'

  return {
    gaps,
    overallRisk,
    suggestions,
  }
}