import type { JobSource, EmploymentModel, PenaltyTier } from './constants'

export interface CommissionInput {
  orderValueIncVat: number
  commissionRatePercent: number
  vatAdjustmentPercent: number
  jobSource: JobSource
  appointmentType: 'sales' | 'survey' | 'fit' | 'service_call'
}

export interface CommissionResult {
  commissionAmount: number
  orderValueExcVat: number
  effectiveCommissionRate: number
}

export function calculateCommission(input: CommissionInput): CommissionResult {
  const orderValueExcVat = round2(input.orderValueIncVat * (1 - input.vatAdjustmentPercent / 100))

  let effectiveCommissionRate = input.commissionRatePercent
  if (input.jobSource === 'company_assigned' && input.appointmentType !== 'service_call') {
    effectiveCommissionRate = input.commissionRatePercent - 2
  }

  if (input.appointmentType === 'survey') {
    return {
      commissionAmount: 0,
      orderValueExcVat,
      effectiveCommissionRate,
    }
  }

  if (input.appointmentType === 'service_call') {
    return {
      commissionAmount: 20,
      orderValueExcVat,
      effectiveCommissionRate,
    }
  }

  const commissionAmount = round2(orderValueExcVat * (effectiveCommissionRate / 100))
  return {
    commissionAmount,
    orderValueExcVat,
    effectiveCommissionRate,
  }
}

export function getDorPenaltyTier(dorRatePercent: number): PenaltyTier {
  return dorRatePercent > 2.5 ? 'elevated' : 'standard'
}

export function getDorPenaltyPerBlind(tier: PenaltyTier): number {
  return tier === 'standard' ? 20 : 40
}

export function calculateDorPenalty(
  blindsAffectedCount: number,
  dorRatePercent: number,
  employmentModel: EmploymentModel,
  saleValuePerBlind?: number
): { penaltyAmount: number; saleValueLost: number } {
  const tier = getDorPenaltyTier(dorRatePercent)
  const penaltyPerBlind = getDorPenaltyPerBlind(tier)

  if (employmentModel === 'company_advisor') {
    return {
      penaltyAmount: blindsAffectedCount * penaltyPerBlind,
      saleValueLost: 0,
    }
  }

  const saleValueLost = saleValuePerBlind ? blindsAffectedCount * saleValuePerBlind : 0
  return {
    penaltyAmount: 0,
    saleValueLost,
  }
}

export const JOB_CODE_REGEX = /^[A-Z]\d{3}[A-Z]?$/

export function isValidJobCode(jobCode: string): boolean {
  return JOB_CODE_REGEX.test(jobCode)
}

export function normalizeJobCode(jobCode: string): string {
  return jobCode.toUpperCase().trim()
}

export function getJobCodeBase(jobCode: string): string {
  const normalized = normalizeJobCode(jobCode)
  return normalized.slice(0, 4)
}

export function areJobCodesSameJob(jobCode1: string, jobCode2: string): boolean {
  return getJobCodeBase(jobCode1) === getJobCodeBase(jobCode2)
}

export const DEFAULT_TOLERANCE_CM = 1

export function computeWorkingWidth(top: number, middle: number, bottom: number): number {
  return Math.min(top, middle, bottom)
}

export function computeWorkingDrop(left: number, middle: number, right: number): number {
  return Math.min(left, middle, right)
}

export function computeDiagonalDiff(tlbr: number, trbl: number): number {
  return Math.abs(tlbr - trbl)
}

export function isWithinTolerance(diff: number, toleranceCm: number = DEFAULT_TOLERANCE_CM): boolean {
  return diff <= toleranceCm
}

export function checkMeasurementTolerance(
  widthTop: number,
  widthMiddle: number,
  widthBottom: number,
  dropLeft: number,
  dropMiddle: number,
  dropRight: number,
  diagonalTlBr: number,
  diagonalTrBl: number,
  toleranceCm: number = DEFAULT_TOLERANCE_CM
): {
  workingWidth: number
  workingDrop: number
  diagonalDiff: number
  widthPasses: boolean
  dropPasses: boolean
  squarePasses: boolean
  allPass: boolean
} {
  const workingWidth = computeWorkingWidth(widthTop, widthMiddle, widthBottom)
  const workingDrop = computeWorkingDrop(dropLeft, dropMiddle, dropRight)
  const diagonalDiff = computeDiagonalDiff(diagonalTlBr, diagonalTrBl)

  const widthSpread = Math.max(widthTop, widthMiddle, widthBottom) - Math.min(widthTop, widthMiddle, widthBottom)
  const dropSpread = Math.max(dropLeft, dropMiddle, dropRight) - Math.min(dropLeft, dropMiddle, dropRight)

  const widthPasses = isWithinTolerance(widthSpread, toleranceCm)
  const dropPasses = isWithinTolerance(dropSpread, toleranceCm)
  const squarePasses = isWithinTolerance(diagonalDiff, toleranceCm)

  return {
    workingWidth,
    workingDrop,
    diagonalDiff,
    widthPasses,
    dropPasses,
    squarePasses,
    allPass: widthPasses && dropPasses && squarePasses,
  }
}

export interface ScheduleRiskInput {
  blindCount: number
  fullJobMinutesPerBlind: number
  currentVisitEnd: Date
  nextVisitStart: Date
}

export interface ScheduleRiskResult {
  estimatedDurationMinutes: number
  gapMinutes: number
  requiredGapMinutes: number
  riskLevel: 'low' | 'medium' | 'high'
  bufferMinutes: number
}

export function computeScheduleRisk(input: ScheduleRiskInput): ScheduleRiskResult {
  const BUFFER_MINUTES = 15
  const estimatedDurationMinutes = input.blindCount * input.fullJobMinutesPerBlind
  const currentEnd = new Date(input.currentVisitEnd)
  currentEnd.setMinutes(currentEnd.getMinutes() + estimatedDurationMinutes)
  const gapMinutes = Math.round((input.nextVisitStart.getTime() - currentEnd.getTime()) / (1000 * 60))
  const requiredGapMinutes = estimatedDurationMinutes + BUFFER_MINUTES

  let riskLevel: 'low' | 'medium' | 'high' = 'low'
  if (gapMinutes < 0) riskLevel = 'high'
  else if (gapMinutes < BUFFER_MINUTES) riskLevel = 'high'
  else if (gapMinutes < 30) riskLevel = 'medium'

  return {
    estimatedDurationMinutes,
    gapMinutes,
    requiredGapMinutes,
    riskLevel,
    bufferMinutes: gapMinutes,
  }
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}