// usePilotMetrics - Pilot metrics collection and display

import { useState, useEffect, useCallback } from 'react'
import { db } from '@lib/dexie'
import { useAuth } from '@hooks/useAuth'
import type { PilotMetricDexie } from '@lib/dexie'

interface PilotMetricsResult {
  metrics: PilotMetricDexie[]
  loading: boolean
  recordMetric: (name: string, value: number, metadata?: Record<string, unknown>) => Promise<void>
  getMetric: (name: string, days?: number) => Promise<Array<{ date: string; value: number }>>
  getSummary: () => Promise<Record<string, number>>
}

export function usePilotMetrics(): PilotMetricsResult {
  const { user } = useAuth()
  const [metrics, setMetrics] = useState<PilotMetricDexie[]>([])
  const [loading, setLoading] = useState(true)

  const advisorId = user?.id ? parseInt(user.id) : 0

  const loadMetrics = useCallback(async () => {
    if (!advisorId) return
    setLoading(true)
    try {
      const data = await db.pilotMetrics.where('advisorId').equals(advisorId).reverse().sortBy('date')
      setMetrics(data)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [advisorId])

  const recordMetric = useCallback(async (name: string, value: number, metadata?: Record<string, unknown>) => {
    if (!advisorId) return
    try {
      await db.pilotMetrics.add({
        advisorId,
        date: new Date(),
        metricName: name,
        metricValue: value,
        metadata,
        sourceEnv: (import.meta.env.VITE_SOURCE_ENV as any) || 'live',
        createdAt: new Date(),
      })
      await loadMetrics()
    } catch {
      // ignore
    }
  }, [advisorId, loadMetrics])

  const getMetric = useCallback(async (name: string, days = 30) => {
    if (!advisorId) return []
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - days)
    const data = await db.pilotMetrics
      .where('advisorId')
      .equals(advisorId)
      .and(m => m.metricName === name && m.date >= cutoff)
      .sortBy('date')
    return data.map(m => ({ date: m.date.toISOString().split('T')[0], value: m.metricValue }))
  }, [advisorId])

  const getSummary = useCallback(async () => {
    if (!advisorId) return {}
    const data = await db.pilotMetrics.where('advisorId').equals(advisorId).toArray()
    const summary: Record<string, number> = {}
    for (const m of data) {
      summary[m.metricName] = (summary[m.metricName] || 0) + m.metricValue
    }
    return summary
  }, [advisorId])

  useEffect(() => {
    loadMetrics()
  }, [loadMetrics])

  return {
    metrics,
    loading,
    recordMetric,
    getMetric,
    getSummary,
  }
}