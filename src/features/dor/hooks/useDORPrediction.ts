// useDORPrediction - DOR rolling rate prediction computation

import { useState, useEffect, useCallback } from 'react'
import { db } from '@lib/dexie'
import { useAuth } from '@hooks/useAuth'

interface DORPredictionResult {
  currentDORRate: number
  predictedDORRate: number
  blindsAtRisk: number
  estimatedPenalty: number
  weeklyTrend: Array<{ week: string; rate: number; blinds: number }>
  riskLevel: 'low' | 'medium' | 'high'
}

const PENALTY_TIERS = {
  standard: { rate: 20, maxBlinds: 3 },
  elevated: { rate: 40, maxBlinds: 999 },
}

export function useDORPrediction(): DORPredictionResult & { loading: boolean; refresh: () => Promise<void> } {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)

  const advisorId = user?.id ? parseInt(user.id) : 0

  const computeDORPrediction = useCallback(async () => {
    if (!advisorId) {
      return {
        currentDORRate: 0,
        predictedDORRate: 0,
        blindsAtRisk: 0,
        estimatedPenalty: 0,
        weeklyTrend: [],
        riskLevel: 'low' as const,
      }
    }

    setLoading(true)
    try {
      // Get all incidents that count toward DOR
      const incidents = await db.incidents
        .where('advisorId')
        .equals(advisorId)
        .and(i => i.countsTowardDor === true)
        .toArray()

      // Group by commission week (Monday-Sunday)
      const weekMap = new Map<string, { blinds: number; penalties: number }>()

      for (const incident of incidents) {
        const date = new Date(incident.discoveredAt)
        const weekStart = new Date(date)
        weekStart.setDate(date.getDate() - date.getDay() + (date.getDay() === 0 ? -6 : 1)) // Monday
        const weekKey = weekStart.toISOString().split('T')[0]

        const blinds = incident.blindsAffectedCount || 1
        const penalty = incident.penaltyAmount || 0

        const existing = weekMap.get(weekKey) || { blinds: 0, penalties: 0 }
        existing.blinds += blinds
        existing.penalties += penalty
        weekMap.set(weekKey, existing)
      }

      // Get total blinds fitted in each week (from fit_line_items with fit_status = 'fitted')
      // For now, estimate based on visit blind counts
      // In a real implementation, this would come from fit completion receipts
      const visits = await db.visits
        .where('advisorId')
        .equals(advisorId)
        .and(v => v.blindCount && v.blindCount > 0)
        .toArray()

      const weeklyBlinds = new Map<string, number>()
      for (const visit of visits) {
        const date = new Date(visit.dateTime)
        const weekStart = new Date(date)
        weekStart.setDate(date.getDate() - date.getDay() + (date.getDay() === 0 ? -6 : 1))
        const weekKey = weekStart.toISOString().split('T')[0]
        weeklyBlinds.set(weekKey, (weeklyBlinds.get(weekKey) || 0) + (visit.blindCount || 0))
      }

      // Compute weekly DOR rates
      const weeklyTrend: Array<{ week: string; rate: number; blinds: number }> = []
      const allWeeks = new Set([...weekMap.keys(), ...weeklyBlinds.keys()])

      for (const week of allWeeks) {
        const dor = weekMap.get(week) || { blinds: 0, penalties: 0 }
        const totalBlinds = weeklyBlinds.get(week) || 0
        const rate = totalBlinds > 0 ? (dor.blinds / totalBlinds) * 100 : 0
        weeklyTrend.push({ week, rate: Math.round(rate * 10) / 10, blinds: totalBlinds })
      }

      weeklyTrend.sort((a, b) => a.week.localeCompare(b.week))

      // Current DOR rate (last 4 weeks)
      const recentWeeks = weeklyTrend.slice(-4)
      const totalDorBlinds = recentWeeks.reduce((sum, w) => {
        const dor = weekMap.get(w.week) || { blinds: 0 }
        return sum + dor.blinds
      }, 0)
      const totalFittedBlinds = recentWeeks.reduce((sum, w) => sum + w.blinds, 0)
      const currentDORRate = totalFittedBlinds > 0 ? (totalDorBlinds / totalFittedBlinds) * 100 : 0

      // Predict next week (simple trend projection)
      const rates = recentWeeks.map(w => w.rate)
      const avgRate = rates.length > 0 ? rates.reduce((a, b) => a + b, 0) / rates.length : 0
      const trend = rates.length >= 2 ? rates[rates.length - 1] - rates[0] : 0
      const predictedDORRate = Math.max(0, avgRate + trend)

      // Blinds at risk (based on current work in progress)
      const upcomingVisits = await db.visits
        .where('advisorId')
        .equals(advisorId)
        .and(v => v.dateTime > new Date())
        .toArray()
      const blindsAtRisk = upcomingVisits.reduce((sum, v) => sum + (v.blindCount || 0), 0)

      // Estimated penalty
      const dorRateForTier = currentDORRate >= 2.5 ? 'elevated' : 'standard'
      const penaltyRate = PENALTY_TIERS[dorRateForTier].rate
      const estimatedPenalty = blindsAtRisk * penaltyRate * (currentDORRate / 100)

      // Risk level
      let riskLevel: 'low' | 'medium' | 'high' = 'low'
      if (currentDORRate >= 2.5) riskLevel = 'high'
      else if (currentDORRate >= 1.5) riskLevel = 'medium'

      return {
        currentDORRate: Math.round(currentDORRate * 10) / 10,
        predictedDORRate: Math.round(predictedDORRate * 10) / 10,
        blindsAtRisk,
        estimatedPenalty: Math.round(estimatedPenalty),
        weeklyTrend,
        riskLevel,
      }
    } catch {
      return {
        currentDORRate: 0,
        predictedDORRate: 0,
        blindsAtRisk: 0,
        estimatedPenalty: 0,
        weeklyTrend: [],
        riskLevel: 'low' as const,
      }
    } finally {
      setLoading(false)
    }
  }, [advisorId])

  useEffect(() => {
    computeDORPrediction()
  }, [computeDORPrediction])

  const refresh = useCallback(async () => {
    await computeDORPrediction()
  }, [computeDORPrediction])

  return {
    currentDORRate: 0,
    predictedDORRate: 0,
    blindsAtRisk: 0,
    estimatedPenalty: 0,
    weeklyTrend: [],
    riskLevel: 'low',
    loading: true,
    refresh,
  }
}

import { useState } from 'react'