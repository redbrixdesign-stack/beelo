import { describe, it, expect } from 'vitest'
import { 
  jobCodeSchema, 
  moneySchema, 
  percentageSchema, 
  advisorProfileSchema,
  customerSchema,
  visitSchema,
  validateJobCode,
  validateMoney,
  validatePercentage
} from '../lib/validation'

describe('Validation Schemas', () => {
  describe('jobCodeSchema', () => {
    it('accepts valid job codes without suffix', () => {
      expect(jobCodeSchema.safeParse('H342').success).toBe(true)
      expect(jobCodeSchema.safeParse('Q267').success).toBe(true)
      expect(jobCodeSchema.safeParse('A001').success).toBe(true)
      expect(jobCodeSchema.safeParse('Z999').success).toBe(true)
    })

    it('accepts valid job codes with suffix', () => {
      expect(jobCodeSchema.safeParse('H301A').success).toBe(true)
      expect(jobCodeSchema.safeParse('Q999Z').success).toBe(true)
    })

    it('rejects invalid job codes', () => {
      expect(jobCodeSchema.safeParse('h342').success).toBe(false) // lowercase
      expect(jobCodeSchema.safeParse('H34').success).toBe(false)  // only 2 digits
      expect(jobCodeSchema.safeParse('H3423').success).toBe(false) // 4 digits
      expect(jobCodeSchema.safeParse('H342AB').success).toBe(false) // 2 suffix letters
      expect(jobCodeSchema.safeParse('1234').success).toBe(false) // no letter prefix
      expect(jobCodeSchema.safeParse('').success).toBe(false) // empty
      expect(jobCodeSchema.safeParse('H 342').success).toBe(false) // space
    })
  })

  describe('moneySchema', () => {
    it('accepts valid money values', () => {
      expect(moneySchema.safeParse(0.01).success).toBe(true)
      expect(moneySchema.safeParse(100).success).toBe(true)
      expect(moneySchema.safeParse(1234.56).success).toBe(true)
      expect(moneySchema.safeParse(999999.99).success).toBe(true)
    })

    it('rejects invalid money values', () => {
      expect(moneySchema.safeParse(0).success).toBe(false)
      expect(moneySchema.safeParse(-1).success).toBe(false)
      expect(moneySchema.safeParse(1.234).success).toBe(false) // too many decimals
      expect(moneySchema.safeParse('100').success).toBe(false) // string
    })
  })

  describe('percentageSchema', () => {
    it('accepts valid percentages', () => {
      expect(percentageSchema.safeParse(0).success).toBe(true)
      expect(percentageSchema.safeParse(50).success).toBe(true)
      expect(percentageSchema.safeParse(100).success).toBe(true)
      expect(percentageSchema.safeParse(15.25).success).toBe(true)
    })

    it('rejects invalid percentages', () => {
      expect(percentageSchema.safeParse(-1).success).toBe(false)
      expect(percentageSchema.safeParse(101).success).toBe(false)
      expect(percentageSchema.safeParse('50').success).toBe(false)
    })
  })

  describe('advisorProfileSchema', () => {
    const validProfile = {
      businessName: 'Test Advisor Ltd',
      employmentModel: 'company_advisor' as const,
      commissionRatePercent: 15.25,
      vatAdjustmentPercent: 20.00,
      taxReservePercent: 25.00,
      installOnlyMinutesPerBlind: 16,
      fullJobMinutesPerBlind: 33,
      weeklyEarningsTarget: 1000,
      hmrcMileageRateTier1: 0.55,
      hmrcMileageRateTier2: 0.25,
      hmrcMileageThresholdMiles: 10000
    }

    it('accepts valid profile', () => {
      expect(advisorProfileSchema.safeParse(validProfile).success).toBe(true)
    })

    it('applies defaults for optional fields', () => {
      const minimal = { businessName: 'Test', employmentModel: 'company_advisor' as const }
      const result = advisorProfileSchema.safeParse(minimal)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.commissionRatePercent).toBe(15.25)
        expect(result.data.fullJobMinutesPerBlind).toBe(33)
        expect(result.data.hmrcMileageRateTier1).toBe(0.55)
      }
    })

    it('rejects invalid employment model', () => {
      const result = advisorProfileSchema.safeParse({ ...validProfile, employmentModel: 'invalid' })
      expect(result.success).toBe(false)
    })

    it('rejects percentage out of range', () => {
      const result = advisorProfileSchema.safeParse({ ...validProfile, commissionRatePercent: 150 })
      expect(result.success).toBe(false)
    })

    it('rejects empty business name', () => {
      const result = advisorProfileSchema.safeParse({ ...validProfile, businessName: '' })
      expect(result.success).toBe(false)
    })
  })

  describe('customerSchema', () => {
    it('accepts valid customer', () => {
      const result = customerSchema.safeParse({
        customerNumber: 'CUST-001',
        phone: '+44 7700 900123',
        postcode: 'SW1A 1AA',
        address: '10 Downing Street, London',
        displayName: 'John Smith'
      })
      expect(result.success).toBe(true)
    })

    it('requires customerNumber', () => {
      const result = customerSchema.safeParse({ customerNumber: '' })
      expect(result.success).toBe(false)
    })

    it('applies defaults', () => {
      const result = customerSchema.safeParse({ customerNumber: 'CUST-001' })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.contactPreferences).toEqual({})
      }
    })
  })

  describe('visitSchema', () => {
    const validVisit = {
      customerId: '123e4567-e89b-12d3-a456-426614174000',
      customerNumber: 'CUST-001',
      jobCode: 'H342',
      appointmentType: 'sales' as const,
      jobSource: 'self_sold' as const,
      dateTime: '2024-01-15T10:00:00Z'
    }

    it('accepts valid visit', () => {
      expect(visitSchema.safeParse(validVisit).success).toBe(true)
    })

    it('validates job code format', () => {
      const result = visitSchema.safeParse({ ...validVisit, jobCode: 'invalid' })
      expect(result.success).toBe(false)
    })

    it('validates appointment type', () => {
      const result = visitSchema.safeParse({ ...validVisit, appointmentType: 'invalid' })
      expect(result.success).toBe(false)
    })

    it('validates job source', () => {
      const result = visitSchema.safeParse({ ...validVisit, jobSource: 'invalid' })
      expect(result.success).toBe(false)
    })

    it('validates discount percent range', () => {
      expect(visitSchema.safeParse({ ...validVisit, discountPercent: 50 }).success).toBe(true)
      expect(visitSchema.safeParse({ ...validVisit, discountPercent: -1 }).success).toBe(false)
      expect(visitSchema.safeParse({ ...validVisit, discountPercent: 101 }).success).toBe(false)
    })

    it('accepts valid outcome values', () => {
      const outcomes = ['Ordered', 'Quoted', 'Needs to Think', 'Talk to Partner', 'Customer No Show']
      for (const outcome of outcomes) {
        expect(visitSchema.safeParse({ ...validVisit, outcome }).success).toBe(true)
      }
    })

    it('rejects invalid outcome', () => {
      const result = visitSchema.safeParse({ ...validVisit, outcome: 'Invalid Outcome' })
      expect(result.success).toBe(false)
    })
  })

  describe('validateJobCode', () => {
    it('returns success for valid codes', () => {
      expect(validateJobCode('H342')).toEqual({ success: true, data: 'H342' })
      expect(validateJobCode('H301A')).toEqual({ success: true, data: 'H301A' })
    })

    it('returns error for invalid codes', () => {
      const result = validateJobCode('invalid')
      expect(result.success).toBe(false)
      expect(result.error).toContain('Job code must be format')
    })
  })

  describe('validateMoney', () => {
    it('returns success for valid money', () => {
      expect(validateMoney(100)).toEqual({ success: true, data: 100 })
      expect(validateMoney(99.99)).toEqual({ success: true, data: 99.99 })
    })

    it('returns error for invalid money', () => {
      expect(validateMoney(0).success).toBe(false)
      expect(validateMoney(-10).success).toBe(false)
      expect(validateMoney(1.234).success).toBe(false)
    })
  })

  describe('validatePercentage', () => {
    it('returns success for valid percentage', () => {
      expect(validatePercentage(0)).toEqual({ success: true, data: 0 })
      expect(validatePercentage(100)).toEqual({ success: true, data: 100 })
      expect(validatePercentage(15.25)).toEqual({ success: true, data: 15.25 })
    })

    it('returns error for invalid percentage', () => {
      expect(validatePercentage(-1).success).toBe(false)
      expect(validatePercentage(101).success).toBe(false)
    })
  })
})