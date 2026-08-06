import { z } from 'zod'

export const jobCodeSchema = z.string().regex(/^[A-Z]\d{3}[A-Z]?$/, {
  message: 'Job code must be format like H342 or H301A (letter + 3 digits + optional letter)'
})

export const moneySchema = z.number().positive().multipleOf(0.01, 'Must have at most 2 decimal places')

export const percentageSchema = z.number().min(0).max(100)

export const positiveNumberSchema = z.number().positive()

export const hmrcRateSchema = z.object({
  tier1: z.number().positive(),
  tier2: z.number().positive(),
  thresholdMiles: z.number().int().positive()
})

export const advisorProfileSchema = z.object({
  businessName: z.string().min(1, 'Business name is required').max(100),
  employmentModel: z.enum(['company_advisor', 'independent']),
  baseLocation: z.string().optional(),
  workingPreferences: z.record(z.unknown()).default({}),
  commissionRatePercent: percentageSchema.default(15.25),
  vatAdjustmentPercent: percentageSchema.default(20.00),
  taxReservePercent: percentageSchema.default(25.00),
  installOnlyMinutesPerBlind: z.number().int().positive().default(16),
  fullJobMinutesPerBlind: z.number().int().positive().default(33),
  weeklyEarningsTarget: moneySchema.optional(),
  hmrcMileageRateTier1: positiveNumberSchema.default(0.55),
  hmrcMileageRateTier2: positiveNumberSchema.default(0.25),
  hmrcMileageThresholdMiles: z.number().int().positive().default(10000),
  consentStatus: z.enum(['pending', 'granted', 'revoked']).default('pending')
})

export const customerSchema = z.object({
  customerNumber: z.string().min(1, 'Customer number is required').max(50),
  phone: z.string().optional(),
  postcode: z.string().optional(),
  address: z.string().optional(),
  displayName: z.string().optional(),
  contactPreferences: z.record(z.unknown()).default({})
})

export const visitSchema = z.object({
  customerId: z.string().uuid(),
  customerNumber: z.string().min(1),
  appointmentNumber: z.string().optional(),
  jobCode: jobCodeSchema,
  orderNumber: z.string().optional(),
  appointmentType: z.enum(['sales', 'survey', 'fit', 'service_call']),
  jobSource: z.enum(['self_sold', 'company_assigned']).default('self_sold'),
  dateTime: z.string().datetime(),
  timeSlotStart: z.string().datetime().optional(),
  timeSlotEnd: z.string().datetime().optional(),
  status: z.string().optional(),
  contactedCustomer: z.boolean().default(false),
  blindCount: z.number().int().positive().optional(),
  preVisitNotes: z.string().optional(),
  companyScheduledDurationMinutes: z.number().int().positive().optional(),
  estimatedDurationMinutes: z.number().int().positive().optional(),
  location: z.string().optional(),
  sourceDocumentId: z.string().uuid().optional(),
  outcome: z.enum([
    'Ordered', 'Quoted', 'Needs to Think', 'Talk to Partner',
    'Comparing Quotes', 'Too Expensive', 'Spec Mismatch',
    'Not What They Wanted', 'Not in Range', 'Windows Too High',
    'Customer No Show', 'Advisor Could Not Attend'
  ]).optional(),
  outcomeValue: moneySchema.optional(),
  discountPercent: percentageSchema.optional(),
  commissionAmount: moneySchema.optional(),
  notes: z.string().optional()
})

export type JobCode = z.infer<typeof jobCodeSchema>
export type AdvisorProfile = z.infer<typeof advisorProfileSchema>
export type CustomerInput = z.infer<typeof customerSchema>
export type VisitInput = z.infer<typeof visitSchema>

export function validateJobCode(value: unknown): { success: boolean; data?: string; error?: string } {
  const result = jobCodeSchema.safeParse(value)
  if (result.success) return { success: true, data: result.data }
  return { success: false, error: result.error.errors[0].message }
}

export function validateMoney(value: unknown): { success: boolean; data?: number; error?: string } {
  const result = moneySchema.safeParse(value)
  if (result.success) return { success: true, data: result.data }
  return { success: false, error: result.error.errors[0].message }
}

export function validatePercentage(value: unknown): { success: boolean; data?: number; error?: string } {
  const result = percentageSchema.safeParse(value)
  if (result.success) return { success: true, data: result.data }
  return { success: false, error: result.error.errors[0].message }
}