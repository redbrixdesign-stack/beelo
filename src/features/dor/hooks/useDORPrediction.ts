// useDORPrediction - Rolling DOR rate calculation and prediction

import { useState, useEffect, useCallback } from 'react'
import { db } from '@lib/dexie'
import { useAuth } from '@hooks/useAuth'
import type { IncidentDexie, DORPredictionDexie } from '@lib/dexie'

interface DORMetrics {
  currentDORRate: number
  predictedDORRate: number
  blindsAtRisk: number
  estimatedPenalty: number
  weeklyData: Array<{
    weekStart: Date
    dorRate: number
    blindsAffected: number
    penalty: number
  }>
  tier: 'standard' | 'elevated'
}

export function useDORPrediction(): { metrics: DORMetrics | null; loading: boolean; recompute: () => Promise<void> } {
  const { user } = useAuth()
  const [metrics, setMetrics] = useState<DORMetrics | null>(null)
  const [loading, setLoading] = useState(false)

  const advisorId = user?.id ? parseInt(user.id) : 0

  const computeDORPrediction = useCallback(async () => {
    if (!advisorId) return
    setLoading(true)
    try {
      // Get last 4 weeks of incidents
      const fourWeeksAgo = new Date()
      fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28)

      const incidents = await db.incidents
        .where('advisorId')
        .equals(advisorId)
        .and(i => i.discoveredAt >= fourWeeksAgo && i.countsTowardDor === true)
        .toArray()

      // Group by week
      const weeklyMap = new Map<string, { blinds: number; penalty: number }>()
      
      for (const inc of incidents) {
        const date = new Date(inc.discoveredAt)
        const weekStart = new Date(date)
        weekStart.setDate(date.getDate() - date.getDay()) // Monday start
        weekStart.setHours(0, 0, 0, 0)
        const key = weekStart.toISOString()

        const existing = weeklyMap.get(key) || { blinds: 0, penalty: 0 }
        existing.blinds += inc.blindsAffectedCount || 1
        existing.penalty += inc.penaltyAmount || 0
        weeklyMap.set(key, existing)
      }

      // Get last 4 weeks sorted
      const sortedWeeks = Array.from(weeklyMap.entries())
        .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
        .slice(-4)

      const weeklyData = sortedWeeks.map(([weekStart, data]) => ({
        weekStart: new Date(weekStart),
        dorRate: 0, // Will calculate below
        blindsAffected: data.blinds,
        penalty: data.penalty,
      }))

      // Calculate total blinds fitted in period (for DOR rate)
      // For now, use a proxy: assume 10 blinds per week fitted
      // In reality, would query visits with outcome 'Ordered' or similar
      const blindsFittedPerWeek = 10 // TODO: get from visits
      const totalBlindsFitted = blindsFittedPerWeek * 4
      const totalBlindsAffected = weeklyData.reduce((sum, w) => sum + w.blindsAffected, 0)
      const currentDORRate = totalBlindsFitted > 0 ? (totalBlindsAffected / totalBlindsFitted) * 100 : 0

      // Update weekly DOR rates
      weeklyData.forEach(w => {
        w.dorRate = blindsFittedPerWeek > 0 ? (w.blindsAffected / blindsFittedPerWeek) * 100 : 0
      })

      // Simple trend projection
      const trend = weeklyData.length >= 2 
        ? weeklyData[weeklyData.length - 1].dorRate - weeklyData[0].dorRate
        : 0
      const predictedDORRate = Math.max(0, weeklyData[weeklyData.length - 1]?.dorRate + trend || currentDORRate)

      // Determine tier
      const tier = predictedDORRate > 2.5 ? 'elevated' : 'standard'

      // Calculate blinds at risk and estimated penalty
      const nextWeekBlinds = 10 // TODO: from schedule
      const penaltyPerBlind = tier === 'standard' ? 20 : 40
      const blindsAtRisk = Math.round(nextWeekBlinds * (predictedDORRate / 100))
      const estimatedPenalty = blindsAtRisk * penaltyPerBlind

      setMetrics({
        currentDORRate,
        predictedDORRate,
        blindsAtRisk,
        estimatedPenalty,
        weeklyData,
        tier,
      })
    } catch (err) {
      console.error('DOR prediction failed:', err)
    } finally {
      setLoading(false)
    }
  }, [advisorId])

  useEffect(() => {
    computeDORPrediction()
  }, [computeDORPrediction])

  return {
    metrics,
    loading,
    recompute: computeDORPrediction,
  }
}