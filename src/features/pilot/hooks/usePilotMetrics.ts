// usePilotMetrics - Pilot metrics tracking

import { useState, useEffect, useCallback } from 'react'
import { db } from '@lib/dexie'
import { useAuth } from '@hooks/useAuth'
import { enqueueSync } from '@lib/sync'
import { getDefaultSourceEnv } from '@lib/dexie'
import type { PilotMetricDexie } from '@lib/dexie'

interface PilotMetricsAggregate {
  voiceNotesCaptured: number
  documentsCaptured: number
  documentsParsed: number
  dorIncidentsDetected: number
  scheduleWarnings: number
  visitsCompleted: number
  mileageLogged: number
  expensesLogged: number
  advisorCount: number
  weeksActive: number
}

export function usePilotMetrics() {
  const { user } = useAuth()
  const [metrics, setMetrics] = useState<PilotMetricsAggregate | null>(null)
  const [loading, setLoading] = useState(true)

  const advisorId = user?.id ? parseInt(user.id) : 0

  const computeMetrics = useCallback(async () => {
    if (!advisorId) return
    setLoading(true)
    try {
      // Get metrics from pilot_metrics table
      const records = await db.pilotMetrics.where('advisorId').equals(advisorId).toArray()
      
      const aggregated: PilotMetricsAggregate = {
        voiceNotesCaptured: 0,
        documentsCaptured: 0,
        documentsParsed: 0,
        dorIncidentsDetected: 0,
        scheduleWarnings: 0,
        visitsCompleted: 0,
        mileageLogged: 0,
        expensesLogged: 0,
        advisorCount: 1, // Single advisor for now
        weeksActive: 0,
      }

      for (const record of records) {
        const val = record.metricValue || 0
        switch (record.metricName) {
          case 'voice_notes_captured':
            aggregated.voiceNotesCaptured += val
            break
          case 'documents_captured':
            aggregated.documentsCaptured += val
            break
          case 'documents_parsed':
            aggregated.documentsParsed += val
            break
          case 'dor_incidents_detected':
            aggregated.dorIncidentsDetected += val
            break
          case 'schedule_warnings':
            aggregated.scheduleWarnings += val
            break
          case 'visits_completed':
            aggregated.visitsCompleted += val
            break
          case 'mileage_logged':
            aggregated.mileageLogged += val
            break
          case 'expenses_logged':
            aggregated.expensesLogged += val
            break
        }
      }

      // Calculate weeks active
      if (records.length > 0) {
        const dates = records.map(r => new Date(r.date)).sort((a, b) => a.getTime() - b.getTime())
        const firstDate = dates[0]
        const lastDate = dates[dates.length - 1]
        const diffWeeks = Math.max(1, Math.ceil((lastDate.getTime() - firstDate.getTime()) / (7 * 24 * 60 * 60 * 1000)))
        aggregated.weeksActive = diffWeeks
      }

      setMetrics(aggregated)
    } catch (err) {
      console.error('Failed to compute pilot metrics:', err)
    } finally {
      setLoading(false)
    }
  }, [advisorId])

  const recordMetric = useCallback(async (name: string, value: number) => {
    if (!advisorId) return
    try {
      const now = new Date()
      const sourceEnv = getDefaultSourceEnv()

      await db.pilotMetrics.add({
        advisorId,
        date: now,
        metricName: name,
        metricValue: value,
        metadata: {},
        sourceEnv,
        createdAt: now,
      } as PilotMetricDexie)

      await enqueueSync('pilotMetrics', `${advisorId}-${name}-${now.getTime()}`, 'create', {
        advisor_id: advisorId,
        date: now.toISOString(),
        metric_name: name,
        metric_value: value,
        source_env: sourceEnv,
      })

      // Optimistic update
      setMetrics(prev => {
        if (!prev) return prev
        const newMetrics = { ...prev }
        switch (name) {
          case 'voice_notes_captured':
            newMetrics.voiceNotesCaptured += value
            break
          case 'documents_captured':
            newMetrics.documentsCaptured += value
            break
          case 'documents_parsed':
            newMetrics.documentsParsed += value
            break
          case 'dor_incidents_detected':
            newMetrics.dorIncidentsDetected += value
            break
          case 'schedule_warnings':
            newMetrics.scheduleWarnings += value
            break
          case 'visits_completed':
            newMetrics.visitsCompleted += value
            break
          case 'mileage_logged':
            newMetrics.mileageLogged += value
            break
          case 'expenses_logged':
            newMetrics.expensesLogged += value
            break
        }
        return newMetrics
      })
    } catch (err) {
      console.error('Failed to record metric:', err)
    }
  }, [advisorId])

  const getMetricsForRange = useCallback((range: 'week' | 'month' | 'quarter') => {
    if (!metrics) return {}
    
    // For single advisor, just return aggregated
    // In multi-advisor pilot, would filter by date range
    return {
      voice_notes_captured: metrics.voiceNotesCaptured,
      documents_captured: metrics.documentsCaptured,
      ocr_parsed: metrics.documentsParsed,
      dor_incidents_detected: metrics.dorIncidentsDetected,
      schedule_warnings: metrics.scheduleWarnings,
      visits_completed: metrics.visitsCompleted,
      mileage_logged: metrics.mileageLogged,
      expenses_logged: metrics.expensesLogged,
    }
  }, [metrics])

  useEffect(() => {
    computeMetrics()
  }, [computeMetrics])

  return {
    metrics,
    loading,
    recordMetric,
    getMetricsForRange,
    refresh: computeMetrics,
  }
}