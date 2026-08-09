// useCommissionCrossCheck - Commission rate validation logic
// BusinessRules.md: company_assigned jobs pay at rate - 2pp; service calls flat £20

import { useCallback } from 'react'
import { useAuth } from '@hooks/useAuth'
import { COMMISSION_LINE_TYPES, CommissionLineType } from '@lib/constants'

export interface CommissionCrossCheckResult {
  isValid: boolean
  expectedRate: number
  actualRate: number | null
  rateDiff: number | null
  jobSource: 'self_sold' | 'company_assigned' | null
  message: string
  severity: 'info' | 'warning' | 'error'
}

export function useCommissionCrossCheck() {
  const { advisor } = useAuth()

  const checkCommissionRate = useCallback((
    lineType: CommissionLineType,
    actualRate: number | null,
    jobSource: 'self_sold' | 'company_assigned' | null
  ): CommissionCrossCheckResult => {
    // Service calls have flat £20, no rate check
    if (lineType === 'service') {
      return {
        isValid: true,
        expectedRate: 0,
        actualRate: null,
        rateDiff: null,
        jobSource,
        message: 'Service call — flat £20 commission',
        severity: 'info',
      }
    }

    if (!advisor) {
      return {
        isValid: false,
        expectedRate: 0,
        actualRate: null,
        rateDiff: null,
        jobSource,
        message: 'No advisor data',
        severity: 'error',
      }
    }

    const advisorRate = advisor.commissionRatePercent || 15.25
    const expectedRate = jobSource === 'company_assigned' 
      ? Math.max(0, advisorRate - 2) // BusinessRules.md: company_assigned = rate - 2pp
      : advisorRate

    if (actualRate === null || actualRate === undefined) {
      return {
        isValid: false,
        expectedRate,
        actualRate: null,
        rateDiff: null,
        jobSource,
        message: 'Commission rate not extracted from statement',
        severity: 'warning',
      }
    }

    const rateDiff = Math.abs(actualRate - expectedRate)
    const tolerance = 0.5 // 0.5% tolerance

    if (rateDiff > tolerance) {
      return {
        isValid: false,
        expectedRate,
        actualRate,
        rateDiff,
        jobSource,
        message: `Rate mismatch: expected ${expectedRate}%, got ${actualRate}% (diff: ${rateDiff.toFixed(1)}%)`,
        severity: 'error',
      }
    }

    return {
      isValid: true,
      expectedRate,
      actualRate,
      rateDiff,
      jobSource,
      message: `Rate OK: ${actualRate}% (expected ${expectedRate}%)`,
      severity: 'info',
    }
  }, [advisor])

  const calculateDORPenalty = useCallback((
    blindsAffected: number,
    dorRate: number,
    tier: 'standard' | 'elevated' = 'standard'
  ): number => {
    // BusinessRules.md: flat per blind, independent of blind value
    const penaltyPerBlind = tier === 'standard' ? 20 : 40
    return blindsAffected * penaltyPerBlind
  }, [])

  const getDORTier = useCallback((dorRate: number): 'standard' | 'elevated' => {
    // BusinessRules.md: tier driven by rolling DOR% for current commission week
    // Standard: DOR% ≤ 2.5%, Elevated: DOR% > 2.5%
    return dorRate > 2.5 ? 'elevated' : 'standard'
  }, [])

  return {
    checkCommissionRate,
    calculateDORPenalty,
    getDORTier,
  }
}