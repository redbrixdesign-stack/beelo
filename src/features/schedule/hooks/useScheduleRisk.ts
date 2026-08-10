// Schedule risk computation hook
// Deterministic client-side computation based on blind count and visit gaps
// BusinessRules.md: estimated_duration = blind_count × full_job_minutes_per_blind (default 33 min)
// Risk if gap to next visit < estimated_duration + 15 min buffer

import { useState, useEffect, useCallback } from 'react'
import { useDexie } from '@hooks/useDexie'
import { useAuth } from '@hooks/useAuth'
import type { VisitDexie, ScheduleSuggestionDexie, AdvisorDexie } from '@lib/dexie'
import { ScheduleRiskLevel } from '@lib/constants'
import { logPilotEvent } from '@lib/supabase'

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

const BUFFER_MINUTES = 15 // BusinessRules.md: 15 min buffer
const DEFAULT_FULL_JOB_MINUTES_PER_BLIND = 33

export function useScheduleRisk(): ScheduleRiskResult & { recompute: () => Promise<void> } {
  const { db, isReady } = useDexie()
  const { advisor } = useAuth()
  const [gaps, setGaps] = useState<ScheduleGap[]>([])
  const [suggestions, setSuggestions] = useState<ScheduleSuggestionDexie[]>([])
  const [advisorSettings, setAdvisorSettings] = useState<{ fullJobMinutesPerBlind: number } | null>(null)

  const advisorId = advisor?.id ?? 0

  // Load advisor's full_job_minutes_per_blind
  useEffect(() => {
    if (!isReady || !advisorId) return
    db.advisors.get(advisorId).then(advisor => {
      if (advisor) {
        setAdvisorSettings({
          fullJobMinutesPerBlind: advisor.fullJobMinutesPerBlind || DEFAULT_FULL_JOB_MINUTES_PER_BLIND,
        })
      }
    })
  }, [isReady, advisorId])

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

      const minutesPerBlind = advisorSettings?.fullJobMinutesPerBlind || DEFAULT_FULL_JOB_MINUTES_PER_BLIND
      const computedGaps: ScheduleGap[] = []

      for (let i = 0; i < visits.length - 1; i++) {
        const current = visits[i]
        const next = visits[i + 1]

        const currentEnd = new Date(current.dateTime)
        const nextStart = new Date(next.dateTime)

        // Estimated duration = blindCount * fullJobMinutesPerBlind
        const blindCount = current.blindCount || 1
        const estimatedDuration = current.estimatedDurationMinutes || 
          blindCount * minutesPerBlind
        
        currentEnd.setMinutes(currentEnd.getMinutes() + estimatedDuration)

        const gapMinutes = Math.round((nextStart.getTime() - currentEnd.getTime()) / (1000 * 60))

        // Risk if gap < estimated_duration + buffer
        // But we show buffer as the actual gap minutes
        let riskLevel: ScheduleRiskLevel = 'low'
        const requiredGap = estimatedDuration + BUFFER_MINUTES
        
        if (gapMinutes < 0) riskLevel = 'high'      // Overlapping
        else if (gapMinutes < BUFFER_MINUTES) riskLevel = 'high'
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

      // Generate schedule suggestions for high/medium risk gaps
      const newSuggestions: ScheduleSuggestionDexie[] = computedGaps
        .filter(g => g.riskLevel === 'high' || g.riskLevel === 'medium')
        .map(gap => ({
          advisorId,
          date: new Date(),
          suggestionText: `Schedule risk: ${gap.currentVisit.jobCode} (${gap.estimatedDurationMinutes}min est.) → ${gap.nextVisit.jobCode} has only ${gap.gapMinutes}min buffer. Required: ${gap.estimatedDurationMinutes + BUFFER_MINUTES}min. Consider rescheduling or adding buffer.`,
          affectedVisitIds: [gap.currentVisit.id!, gap.nextVisit.id!],
          estimatedSavingMiles: 0,
          estimatedSavingMinutes: Math.max(0, BUFFER_MINUTES - gap.gapMinutes),
          scheduleRiskFlag: true,
          status: 'pending' as const,
          sourceEnv: (import.meta.env.VITE_SOURCE_ENV as 'demo' | 'qa' | 'live') || 'live',
          createdAt: new Date(),
          updatedAt: new Date(),
        }))

      setSuggestions(newSuggestions)
      
      // Log pilot event: schedule risk warning shown
      if (newSuggestions.length > 0) {
        logPilotEvent('schedule_risk_warning_shown', {
          high_risk_count: newSuggestions.filter(s => s.scheduleRiskFlag).length,
          medium_risk_count: newSuggestions.filter(s => !s.scheduleRiskFlag).length,
          total_suggestions: newSuggestions.length,
          affected_visit_ids: newSuggestions.flatMap(s => s.affectedVisitIds),
        }).catch(() => {}) // Fire and forget
      }
    } catch {
      console.error('Schedule risk computation failed:')
    }
  }, [isReady, advisorId, advisorSettings])

  useEffect(() => {
    computeScheduleRisk()
  }, [computeScheduleRisk])

  const overallRisk: ScheduleRiskLevel = gaps.some(g => g.riskLevel === 'high') ? 'high' :
    gaps.some(g => g.riskLevel === 'medium') ? 'medium' : 'low'

  return {
    gaps,
    overallRisk,
    suggestions,
    recompute: computeScheduleRisk,
  }
}