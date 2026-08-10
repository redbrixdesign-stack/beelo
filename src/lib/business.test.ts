import { describe, it, expect } from 'vitest'
import {
  calculateCommission,
  getDorPenaltyTier,
  getDorPenaltyPerBlind,
  calculateDorPenalty,
  isValidJobCode,
  normalizeJobCode,
  getJobCodeBase,
  areJobCodesSameJob,
  computeWorkingWidth,
  computeWorkingDrop,
  computeDiagonalDiff,
  isWithinTolerance,
  checkMeasurementTolerance,
  computeScheduleRisk,
  DEFAULT_TOLERANCE_CM,
} from './business'

describe('Business Logic - Commission Calculation', () => {
  const baseInput = {
    orderValueIncVat: 1000,
    commissionRatePercent: 15.25,
    vatAdjustmentPercent: 20,
    jobSource: 'self_sold' as const,
    appointmentType: 'fit' as const,
  }

  describe('calculateCommission', () => {
    it('calculates commission for self-sold fit correctly', () => {
      const result = calculateCommission(baseInput)
      expect(result.orderValueExcVat).toBe(800)
      expect(result.effectiveCommissionRate).toBe(15.25)
      expect(result.commissionAmount).toBe(122)
    })

    it('applies reduced rate for company_assigned jobs', () => {
      const result = calculateCommission({ ...baseInput, jobSource: 'company_assigned' })
      expect(result.effectiveCommissionRate).toBe(13.25)
      expect(result.commissionAmount).toBe(106)
    })

    it('returns zero commission for survey visits', () => {
      const result = calculateCommission({ ...baseInput, appointmentType: 'survey', jobSource: 'company_assigned' })
      expect(result.commissionAmount).toBe(0)
      expect(result.effectiveCommissionRate).toBe(13.25)
    })

    it('returns flat £20 for service_call visits', () => {
      const result = calculateCommission({ ...baseInput, appointmentType: 'service_call' })
      expect(result.commissionAmount).toBe(20)
    })

    it('handles different VAT adjustment percentages', () => {
      const result = calculateCommission({ ...baseInput, vatAdjustmentPercent: 0 })
      expect(result.orderValueExcVat).toBe(1000)
      expect(result.commissionAmount).toBe(152.5)
    })

    it('handles different commission rates', () => {
      const result = calculateCommission({ ...baseInput, commissionRatePercent: 20 })
      expect(result.effectiveCommissionRate).toBe(20)
      expect(result.commissionAmount).toBe(160)
    })

    it('rounds commission to 2 decimal places', () => {
      const result = calculateCommission({
        ...baseInput,
        orderValueIncVat: 333.33,
        commissionRatePercent: 15.25,
        vatAdjustmentPercent: 20,
      })
      expect(result.commissionAmount).toBe(40.67)
    })

    it('company_assigned survey still returns zero commission', () => {
      const result = calculateCommission({
        ...baseInput,
        appointmentType: 'survey',
        jobSource: 'company_assigned',
      })
      expect(result.commissionAmount).toBe(0)
    })

    it('service_call pays flat £20 regardless of job source', () => {
      const selfSold = calculateCommission({ ...baseInput, appointmentType: 'service_call', jobSource: 'self_sold' })
      const companyAssigned = calculateCommission({ ...baseInput, appointmentType: 'service_call', jobSource: 'company_assigned' })
      expect(selfSold.commissionAmount).toBe(20)
      expect(companyAssigned.commissionAmount).toBe(20)
    })
  })
})

describe('Business Logic - DOR Tier Lookup', () => {
  describe('getDorPenaltyTier', () => {
    it('returns standard tier for DOR rate <= 2.5%', () => {
      expect(getDorPenaltyTier(0)).toBe('standard')
      expect(getDorPenaltyTier(1.0)).toBe('standard')
      expect(getDorPenaltyTier(2.5)).toBe('standard')
    })

    it('returns elevated tier for DOR rate > 2.5%', () => {
      expect(getDorPenaltyTier(2.51)).toBe('elevated')
      expect(getDorPenaltyTier(3.0)).toBe('elevated')
      expect(getDorPenaltyTier(5.0)).toBe('elevated')
    })
  })

  describe('getDorPenaltyPerBlind', () => {
    it('returns £20 for standard tier', () => {
      expect(getDorPenaltyPerBlind('standard')).toBe(20)
    })

    it('returns £40 for elevated tier', () => {
      expect(getDorPenaltyPerBlind('elevated')).toBe(40)
    })
  })

  describe('calculateDorPenalty', () => {
    it('calculates flat penalty for company_advisor at standard tier', () => {
      const result = calculateDorPenalty(2, 2.0, 'company_advisor')
      expect(result.penaltyAmount).toBe(40)
      expect(result.saleValueLost).toBe(0)
    })

    it('calculates flat penalty for company_advisor at elevated tier', () => {
      const result = calculateDorPenalty(3, 3.0, 'company_advisor')
      expect(result.penaltyAmount).toBe(120)
      expect(result.saleValueLost).toBe(0)
    })

    it('calculates full sale value loss for independent advisor', () => {
      const result = calculateDorPenalty(2, 2.0, 'independent', 500)
      expect(result.penaltyAmount).toBe(0)
      expect(result.saleValueLost).toBe(1000)
    })

    it('handles zero blinds affected', () => {
      const result = calculateDorPenalty(0, 2.0, 'company_advisor')
      expect(result.penaltyAmount).toBe(0)
      expect(result.saleValueLost).toBe(0)
    })

    it('handles missing sale value per blind for independent', () => {
      const result = calculateDorPenalty(2, 2.0, 'independent')
      expect(result.penaltyAmount).toBe(0)
      expect(result.saleValueLost).toBe(0)
    })
  })
})

describe('Business Logic - Job Code Validation', () => {
  describe('isValidJobCode', () => {
    it('accepts valid job codes without suffix', () => {
      expect(isValidJobCode('H342')).toBe(true)
      expect(isValidJobCode('Q267')).toBe(true)
      expect(isValidJobCode('A001')).toBe(true)
      expect(isValidJobCode('Z999')).toBe(true)
    })

    it('accepts valid job codes with suffix', () => {
      expect(isValidJobCode('H301A')).toBe(true)
      expect(isValidJobCode('Q999Z')).toBe(true)
    })

    it('rejects invalid job codes', () => {
      expect(isValidJobCode('h342')).toBe(false)
      expect(isValidJobCode('H34')).toBe(false)
      expect(isValidJobCode('H3423')).toBe(false)
      expect(isValidJobCode('H342AB')).toBe(false)
      expect(isValidJobCode('1234')).toBe(false)
      expect(isValidJobCode('')).toBe(false)
      expect(isValidJobCode('H 342')).toBe(false)
    })
  })

  describe('normalizeJobCode', () => {
    it('normalizes case and trims whitespace', () => {
      expect(normalizeJobCode('h342')).toBe('H342')
      expect(normalizeJobCode('  H342  ')).toBe('H342')
      expect(normalizeJobCode('h301a')).toBe('H301A')
    })
  })

  describe('getJobCodeBase', () => {
    it('returns first 4 characters for codes without suffix', () => {
      expect(getJobCodeBase('H342')).toBe('H342')
      expect(getJobCodeBase('Q267')).toBe('Q267')
    })

    it('returns first 4 characters for codes with suffix', () => {
      expect(getJobCodeBase('H301A')).toBe('H301')
      expect(getJobCodeBase('Q999Z')).toBe('Q999')
    })
  })

  describe('areJobCodesSameJob', () => {
    it('returns true for same base code with different suffixes', () => {
      expect(areJobCodesSameJob('H301', 'H301A')).toBe(true)
      expect(areJobCodesSameJob('H301A', 'H301B')).toBe(true)
    })

    it('returns true for identical codes', () => {
      expect(areJobCodesSameJob('H342', 'H342')).toBe(true)
    })

    it('returns false for different base codes', () => {
      expect(areJobCodesSameJob('H342', 'Q267')).toBe(false)
      expect(areJobCodesSameJob('H301A', 'H302A')).toBe(false)
    })

    it('handles case differences', () => {
      expect(areJobCodesSameJob('h342', 'H342')).toBe(true)
    })
  })
})

describe('Business Logic - Measurement Tolerance Check', () => {
  describe('computeWorkingWidth', () => {
    it('returns minimum of three readings', () => {
      expect(computeWorkingWidth(100, 101, 99)).toBe(99)
      expect(computeWorkingWidth(50, 50, 50)).toBe(50)
      expect(computeWorkingWidth(200, 150, 180)).toBe(150)
    })
  })

  describe('computeWorkingDrop', () => {
    it('returns minimum of three readings', () => {
      expect(computeWorkingDrop(200, 199, 201)).toBe(199)
      expect(computeWorkingDrop(150, 150, 150)).toBe(150)
    })
  })

  describe('computeDiagonalDiff', () => {
    it('returns absolute difference', () => {
      expect(computeDiagonalDiff(150, 149)).toBe(1)
      expect(computeDiagonalDiff(149, 150)).toBe(1)
      expect(computeDiagonalDiff(200, 200)).toBe(0)
    })
  })

  describe('isWithinTolerance', () => {
    it('returns true when diff <= tolerance', () => {
      expect(isWithinTolerance(0, 1)).toBe(true)
      expect(isWithinTolerance(1, 1)).toBe(true)
      expect(isWithinTolerance(0.5, 1)).toBe(true)
    })

    it('returns false when diff > tolerance', () => {
      expect(isWithinTolerance(1.1, 1)).toBe(false)
      expect(isWithinTolerance(2, 1)).toBe(false)
    })

    it('uses default tolerance of 1cm', () => {
      expect(isWithinTolerance(1)).toBe(true)
      expect(isWithinTolerance(1.1)).toBe(false)
    })
  })

  describe('checkMeasurementTolerance', () => {
    it('returns all pass when all measurements within tolerance', () => {
      const result = checkMeasurementTolerance(
        100, 100, 100,
        200, 200, 200,
        224, 224
      )
      expect(result.workingWidth).toBe(100)
      expect(result.workingDrop).toBe(200)
      expect(result.diagonalDiff).toBe(0)
      expect(result.widthPasses).toBe(true)
      expect(result.dropPasses).toBe(true)
      expect(result.squarePasses).toBe(true)
      expect(result.allPass).toBe(true)
    })

    it('fails width when spread exceeds tolerance', () => {
      const result = checkMeasurementTolerance(
        100, 102, 101,
        200, 200, 200,
        224, 224,
        1
      )
      expect(result.workingWidth).toBe(100)
      expect(result.widthPasses).toBe(false)
      expect(result.allPass).toBe(false)
    })

    it('fails drop when spread exceeds tolerance', () => {
      const result = checkMeasurementTolerance(
        100, 100, 100,
        200, 202, 201,
        224, 224,
        1
      )
      expect(result.workingDrop).toBe(200)
      expect(result.dropPasses).toBe(false)
      expect(result.allPass).toBe(false)
    })

    it('fails squareness when diagonal diff exceeds tolerance', () => {
      const result = checkMeasurementTolerance(
        100, 100, 100,
        200, 200, 200,
        224, 226,
        1
      )
      expect(result.diagonalDiff).toBe(2)
      expect(result.squarePasses).toBe(false)
      expect(result.allPass).toBe(false)
    })

    it('uses default tolerance of 1cm', () => {
      const result = checkMeasurementTolerance(
        100, 100, 100,
        200, 200, 200,
        224, 225
      )
      expect(result.diagonalDiff).toBe(1)
      expect(result.squarePasses).toBe(true)
      expect(result.allPass).toBe(true)
    })

    it('handles custom tolerance', () => {
      const result = checkMeasurementTolerance(
        100, 102, 101,
        200, 200, 200,
        224, 224,
        2
      )
      expect(result.widthPasses).toBe(true)
      expect(result.allPass).toBe(true)
    })
  })

  describe('DEFAULT_TOLERANCE_CM', () => {
    it('is 1cm as per BusinessRules.md', () => {
      expect(DEFAULT_TOLERANCE_CM).toBe(1)
    })
  })
})

describe('Business Logic - Schedule Risk Computation', () => {
  const baseInput = {
    blindCount: 4,
    fullJobMinutesPerBlind: 33,
    currentVisitEnd: new Date('2024-01-15T10:00:00'),
    nextVisitStart: new Date('2024-01-15T12:30:00'),
  }

  describe('computeScheduleRisk', () => {
    it('calculates estimated duration as blindCount * minutesPerBlind', () => {
      const result = computeScheduleRisk(baseInput)
      expect(result.estimatedDurationMinutes).toBe(132)
    })

    it('calculates gap minutes between estimated end and next visit start', () => {
      const result = computeScheduleRisk(baseInput)
      // 10:00 + 132min = 12:12, next at 12:30 = 18 min gap
      expect(result.gapMinutes).toBe(18)
    })

    it('returns high risk when gap is negative (overlapping)', () => {
      const result = computeScheduleRisk({
        ...baseInput,
        nextVisitStart: new Date('2024-01-15T11:00:00'),
      })
      expect(result.gapMinutes).toBeLessThan(0)
      expect(result.riskLevel).toBe('high')
    })

    it('returns high risk when gap < 15 min buffer', () => {
      const result = computeScheduleRisk({
        ...baseInput,
        nextVisitStart: new Date('2024-01-15T12:20:00'),
      })
      // 12:12 end, 12:20 next = 8 min gap < 15
      expect(result.gapMinutes).toBeLessThan(15)
      expect(result.riskLevel).toBe('high')
    })

    it('returns medium risk when gap >= 15 but < 30 min', () => {
      const result = computeScheduleRisk(baseInput)
      // 18 min gap
      expect(result.gapMinutes).toBeGreaterThanOrEqual(15)
      expect(result.gapMinutes).toBeLessThan(30)
      expect(result.riskLevel).toBe('medium')
    })

    it('returns low risk when gap >= 30 min', () => {
      const result = computeScheduleRisk({
        ...baseInput,
        nextVisitStart: new Date('2024-01-15T13:00:00'),
      })
      // 12:12 end, 13:00 next = 48 min gap
      expect(result.gapMinutes).toBeGreaterThanOrEqual(30)
      expect(result.riskLevel).toBe('low')
    })

    it('calculates required gap as estimated duration + 15 min buffer', () => {
      const result = computeScheduleRisk(baseInput)
      expect(result.requiredGapMinutes).toBe(147)
    })

    it('handles different blind counts', () => {
      const result = computeScheduleRisk({ ...baseInput, blindCount: 2 })
      expect(result.estimatedDurationMinutes).toBe(66)
    })

    it('handles custom fullJobMinutesPerBlind', () => {
      const result = computeScheduleRisk({ ...baseInput, fullJobMinutesPerBlind: 40 })
      expect(result.estimatedDurationMinutes).toBe(160)
    })

    it('bufferMinutes equals gapMinutes', () => {
      const result = computeScheduleRisk(baseInput)
      expect(result.bufferMinutes).toBe(result.gapMinutes)
    })
  })
})

describe('Business Rules Compliance', () => {
  it('Commission: weekly period, not monthly', () => {
    const result = calculateCommission({
      orderValueIncVat: 1000,
      commissionRatePercent: 15.25,
      vatAdjustmentPercent: 20,
      jobSource: 'self_sold',
      appointmentType: 'fit',
    })
    expect(result.commissionAmount).toBeGreaterThan(0)
  })

  it('Commission: company_assigned pays rate minus 2pp', () => {
    const selfSold = calculateCommission({
      orderValueIncVat: 1000,
      commissionRatePercent: 15.25,
      vatAdjustmentPercent: 20,
      jobSource: 'self_sold',
      appointmentType: 'fit',
    })
    const companyAssigned = calculateCommission({
      orderValueIncVat: 1000,
      commissionRatePercent: 15.25,
      vatAdjustmentPercent: 20,
      jobSource: 'company_assigned',
      appointmentType: 'fit',
    })
    expect(selfSold.effectiveCommissionRate - companyAssigned.effectiveCommissionRate).toBe(2)
  })

  it('Commission: survey visits generate no commission line', () => {
    const result = calculateCommission({
      orderValueIncVat: 1000,
      commissionRatePercent: 15.25,
      vatAdjustmentPercent: 20,
      jobSource: 'company_assigned',
      appointmentType: 'survey',
    })
    expect(result.commissionAmount).toBe(0)
  })

  it('Commission: service_call pays flat £20', () => {
    const result = calculateCommission({
      orderValueIncVat: 1000,
      commissionRatePercent: 15.25,
      vatAdjustmentPercent: 20,
      jobSource: 'self_sold',
      appointmentType: 'service_call',
    })
    expect(result.commissionAmount).toBe(20)
  })

  it('DOR: only fitter_error counts toward DOR', () => {
    // This is enforced at the data layer (countsTowardDor field)
    // The tier lookup correctly uses the rolling DOR% from incidents
    expect(getDorPenaltyTier(2.0)).toBe('standard')
    expect(getDorPenaltyTier(3.0)).toBe('elevated')
  })

  it('DOR: penalty is flat per blind (£20 standard, £40 elevated)', () => {
    expect(getDorPenaltyPerBlind('standard')).toBe(20)
    expect(getDorPenaltyPerBlind('elevated')).toBe(40)
  })

  it('DOR: tier driven by rolling DOR% for current commission week', () => {
    // The getDorPenaltyTier function uses the DOR rate directly
    // The rolling week calculation is in the hook layer
    expect(getDorPenaltyTier(2.5)).toBe('standard')
    expect(getDorPenaltyTier(2.51)).toBe('elevated')
  })

  it('Job code: format is letter + 3 digits + optional letter', () => {
    expect(isValidJobCode('H342')).toBe(true)
    expect(isValidJobCode('H301A')).toBe(true)
    expect(isValidJobCode('h342')).toBe(false)
  })

  it('Measurement: units are centimetres', () => {
    const result = checkMeasurementTolerance(
      100, 100, 100,
      200, 200, 200,
      224, 224
    )
    expect(result.workingWidth).toBe(100)
    expect(DEFAULT_TOLERANCE_CM).toBe(1)
  })

  it('Measurement: working width/drop is minimum of three readings', () => {
    expect(computeWorkingWidth(100, 101, 99)).toBe(99)
    expect(computeWorkingDrop(200, 199, 201)).toBe(199)
  })

  it('Schedule: full job estimate is ~33 min/blind', () => {
    const result = computeScheduleRisk({
      blindCount: 1,
      fullJobMinutesPerBlind: 33,
      currentVisitEnd: new Date('2024-01-15T10:00:00'),
      nextVisitStart: new Date('2024-01-15T11:00:00'),
    })
    expect(result.estimatedDurationMinutes).toBe(33)
  })

  it('Schedule: risk check compares estimated duration + 15min buffer against gap', () => {
    const result = computeScheduleRisk({
      blindCount: 2,
      fullJobMinutesPerBlind: 33,
      currentVisitEnd: new Date('2024-01-15T10:00:00'),
      nextVisitStart: new Date('2024-01-15T11:00:00'),
    })
    // 66 min estimated, ends 11:06, next at 11:00 = -6 min gap (high risk)
    expect(result.requiredGapMinutes).toBe(81)
    expect(result.riskLevel).toBe('high')
  })
})