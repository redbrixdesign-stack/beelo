import { describe, it, expect } from 'vitest'
import { 
  OUTCOME_TAXONOMY, 
  APPOINTMENT_TYPES, 
  JOB_SOURCES,
  SOURCE_ENVS,
  EMPLOYMENT_MODELS,
  isValidOutcome,
  isValidAppointmentType,
  isValidJobSource,
  isValidSourceEnv
} from '../lib/constants'

describe('Constants & Type Guards', () => {
  describe('OUTCOME_TAXONOMY', () => {
    it('contains all 12 validated outcomes', () => {
      expect(OUTCOME_TAXONOMY).toHaveLength(12)
      expect(OUTCOME_TAXONOMY).toContain('Ordered')
      expect(OUTCOME_TAXONOMY).toContain('Quoted')
      expect(OUTCOME_TAXONOMY).toContain('Needs to Think')
      expect(OUTCOME_TAXONOMY).toContain('Talk to Partner')
      expect(OUTCOME_TAXONOMY).toContain('Comparing Quotes')
      expect(OUTCOME_TAXONOMY).toContain('Too Expensive')
      expect(OUTCOME_TAXONOMY).toContain('Spec Mismatch')
      expect(OUTCOME_TAXONOMY).toContain('Not What They Wanted')
      expect(OUTCOME_TAXONOMY).toContain('Not in Range')
      expect(OUTCOME_TAXONOMY).toContain('Windows Too High')
      expect(OUTCOME_TAXONOMY).toContain('Customer No Show')
      expect(OUTCOME_TAXONOMY).toContain('Advisor Could Not Attend')
    })

    it('isValidOutcome returns true for valid outcomes', () => {
      for (const outcome of OUTCOME_TAXONOMY) {
        expect(isValidOutcome(outcome)).toBe(true)
      }
    })

    it('isValidOutcome returns false for invalid outcomes', () => {
      expect(isValidOutcome('Invalid')).toBe(false)
      expect(isValidOutcome('')).toBe(false)
      expect(isValidOutcome('ordered')).toBe(false) // case sensitive
    })
  })

  describe('APPOINTMENT_TYPES', () => {
    it('contains 4 valid types', () => {
      expect(APPOINTMENT_TYPES).toHaveLength(4)
      expect(APPOINTMENT_TYPES).toContain('sales')
      expect(APPOINTMENT_TYPES).toContain('survey')
      expect(APPOINTMENT_TYPES).toContain('fit')
      expect(APPOINTMENT_TYPES).toContain('service_call')
    })

    it('isValidAppointmentType works correctly', () => {
      expect(isValidAppointmentType('sales')).toBe(true)
      expect(isValidAppointmentType('service_call')).toBe(true)
      expect(isValidAppointmentType('invalid')).toBe(false)
    })
  })

  describe('JOB_SOURCES', () => {
    it('contains 2 valid sources', () => {
      expect(JOB_SOURCES).toHaveLength(2)
      expect(JOB_SOURCES).toContain('self_sold')
      expect(JOB_SOURCES).toContain('company_assigned')
    })

    it('isValidJobSource works correctly', () => {
      expect(isValidJobSource('self_sold')).toBe(true)
      expect(isValidJobSource('company_assigned')).toBe(true)
      expect(isValidJobSource('invalid')).toBe(false)
    })
  })

  describe('SOURCE_ENVS', () => {
    it('contains 3 environments', () => {
      expect(SOURCE_ENVS).toHaveLength(3)
      expect(SOURCE_ENVS).toContain('demo')
      expect(SOURCE_ENVS).toContain('qa')
      expect(SOURCE_ENVS).toContain('live')
    })

    it('isValidSourceEnv works correctly', () => {
      expect(isValidSourceEnv('demo')).toBe(true)
      expect(isValidSourceEnv('qa')).toBe(true)
      expect(isValidSourceEnv('live')).toBe(true)
      expect(isValidSourceEnv('production')).toBe(false)
    })
  })

  describe('EMPLOYMENT_MODELS', () => {
    it('contains 2 models', () => {
      expect(EMPLOYMENT_MODELS).toHaveLength(2)
      expect(EMPLOYMENT_MODELS).toContain('company_advisor')
      expect(EMPLOYMENT_MODELS).toContain('independent')
    })
  })
})