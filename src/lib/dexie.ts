import Dexie, { Table } from 'dexie'
import type {
  SourceEnv, EmploymentModel, ConsentStatus,
  OutcomeTaxonomy, AppointmentType, JobSource,
  LeadStatus, LeadSource, CallOutcome,
  VoiceNoteStatus, VoiceNoteTrigger,
  DocumentType, DocumentStatus, DocumentMatchStatus,
  FitStatus, IncidentType, IncidentCause, IncidentResolution,
  LogisticsLeg, ServiceCallOutcome, PenaltyTier,
  FitMethod, CustomerStatus, TripStatus,
  MessageDraftStatus, ScheduleSuggestionStatus,
  ScheduleRiskLevel,
  IncidentCrossCheckStatus, CommissionLineType,
  ExpenseCategory, DeliveryItemStatus, OnboardingStep, SettingKey
} from './constants'

export interface AdvisorDexie {
  id?: number
  supabaseId?: string  // UUID from Supabase advisors.id
  authUserId: string
  businessName: string
  employmentModel: EmploymentModel
  baseLocation?: string
  workingPreferences: Record<string, unknown>
  commissionRatePercent: number
  vatAdjustmentPercent: number
  taxReservePercent: number
  installOnlyMinutesPerBlind: number
  fullJobMinutesPerBlind: number
  weeklyEarningsTarget?: number
  hmrcMileageRateTier1: number
  hmrcMileageRateTier2: number
  hmrcMileageThresholdMiles: number
  consentStatus: ConsentStatus
  sourceEnv: SourceEnv
  createdAt: Date
  updatedAt: Date
}

export interface CustomerDexie {
  id?: number
  advisorId: number
  customerNumber: string
  phone?: string
  postcode?: string
  address?: string
  displayName?: string
  contactPreferences: Record<string, unknown>
  history: Record<string, unknown>
  status: CustomerStatus
  sourceEnv: SourceEnv
  createdAt: Date
  updatedAt: Date
}

export interface VisitDexie {
  id?: number
  advisorId: number
  customerId: number
  customerNumber: string
  appointmentNumber?: string
  jobCode: string
  orderNumber?: string
  appointmentType: AppointmentType
  jobSource: JobSource
  dateTime: Date
  timeSlotStart?: Date
  timeSlotEnd?: Date
  status?: string
  contactedCustomer: boolean
  blindCount?: number
  preVisitNotes?: string
  companyScheduledDurationMinutes?: number
  estimatedDurationMinutes?: number
  location?: string
  address?: string
  sourceDocumentId?: number
  sourceEnv: SourceEnv
  outcome?: OutcomeTaxonomy
  outcomeValue?: number
  discountPercent?: number
  commissionAmount?: number
  notes?: string
  createdAt: Date
  updatedAt: Date
}

export interface LeadDexie {
  id?: number
  advisorId: number
  name?: string
  phone?: string
  landedAt: Date
  status: LeadStatus
  contactAttemptsCount: number
  source?: LeadSource
  sourceEnv: SourceEnv
  createdAt: Date
  updatedAt: Date
}

export interface CallAttemptDexie {
  id?: number
  leadId: number
  initiatedAt: Date
  outcome: CallOutcome
  voiceNoteId?: number
  sourceEnv: SourceEnv
  createdAt: Date
}

export interface VoiceNoteDexie {
  id?: number
  advisorId: number
  audioPath?: string
  recordedAt: Date
  durationSeconds?: number
  triggerMethod: VoiceNoteTrigger
  status: VoiceNoteStatus
  transcript?: string
  extractedBlindCount?: number
  extractedParkingNotes?: string
  extractedAccessNotes?: string
  extractedNameSpoken?: string
  linkedAppointmentScreenshotDocumentId?: number
  matchedVisitId?: number
  matchedCustomerId?: number
  matchMethod?: 'screenshot_proximity' | 'manual_review' | 'name_hint'
  leadId?: number
  sourceEnv: SourceEnv
  createdAt: Date
  updatedAt: Date
}

export interface DocumentDexie {
  id?: number
  advisorId: number
  type: DocumentType
  subtype?: string
  imagePath?: string
  parsedJson?: Record<string, unknown>
  status: DocumentStatus
  matchStatus: DocumentMatchStatus
  sourceEnv: SourceEnv
  additionalNotes?: string
  // AI provenance fields
  modelVersion?: string
  promptVersion?: string
  confidence?: number
  extractedAt?: Date
  // OCR processing
  ocrError?: string
  ocrRetryCount?: number
  createdAt: Date
  updatedAt: Date
}

export interface FitLineItemDexie {
  id?: number
  documentId: number
  jobCode: string
  lineNumber: number
  room?: string
  position?: string
  fitStatus: FitStatus
  refitDate?: Date
  sourceEnv: SourceEnv
  // AI provenance fields
  modelVersion?: string
  promptVersion?: string
  confidence?: number
  extractedAt?: Date
  createdAt: Date
}

export interface IncidentDexie {
  id?: number
  advisorId: number
  visitId: number
  customerId: number
  type: IncidentType
  cause: IncidentCause
  causeDetail?: string
  countsTowardDor: boolean
  discoveredAt: Date
  description?: string
  resolutionStatus: IncidentResolution
  photos: string[]
  notes?: string
  commissionLineItemId?: number
  logisticsLeg?: LogisticsLeg
  originalFitVisitId?: number
  withinWarrantyPeriod?: boolean
  serviceCallOutcome?: ServiceCallOutcome
  dorRateAtTimePercent?: number
  penaltyTier?: PenaltyTier
  blindsAffectedCount?: number
  penaltyAmount?: number
  saleValueLost?: number
  clientAgreedToRemake?: boolean
  remakeMaterialCost?: number
  remakeLabourAbsorbed?: number
  sourceEnv: SourceEnv
  // AI provenance fields
  modelVersion?: string
  promptVersion?: string
  confidence?: number
  sourceDocumentId?: number
  fitLineItemId?: number
  detectedAt?: Date
  crossCheckStatus?: IncidentCrossCheckStatus
  commissionRateExpected?: number
  commissionRateActual?: number
  createdAt: Date
  updatedAt: Date
}

export interface QuoteLineItemDexie {
  id?: number
  documentId: number
  room?: string
  position?: string
  description?: string
  range?: string
  colour?: string
  widthMm?: number
  quantity: number
  unitPrice?: number
  lineTotal?: number
  sourceEnv: SourceEnv
  // AI provenance fields
  modelVersion?: string
  promptVersion?: string
  confidence?: number
  extractedAt?: Date
  createdAt: Date
}

export interface CommissionLineItemDexie {
  id?: number
  commissionStatementDocumentId: number
  lineDate?: Date
  invoiceNumber?: string
  jobCode: string
  customerNumber?: string
  customerName?: string
  lineType?: CommissionLineType
  lineTypeRaw?: string
  commissionRatePercent?: number
  orderValueIncVat?: number
  orderValueExcVat?: number
  amountIncVat?: number
  amountExcVat?: number
  sourceEnv: SourceEnv
  // AI provenance fields
  modelVersion?: string
  promptVersion?: string
  confidence?: number
  extractedAt?: Date
  createdAt: Date
}

export interface TripDexie {
  id?: number
  advisorId: number
  visitId?: number
  startedAt?: Date
  endedAt?: Date
  distanceMiles?: number
  pathPoints?: unknown
  status: TripStatus
  sourceEnv: SourceEnv
  createdAt: Date
  updatedAt: Date
}

export interface ExpenseDexie {
  id?: number
  advisorId: number
  merchant?: string
  date: Date
  amount: number
  vatAmount?: number
  category?: ExpenseCategory
  photoPath?: string
  sourceDocumentId?: number
  sourceEnv: SourceEnv
  // AI provenance fields
  modelVersion?: string
  promptVersion?: string
  confidence?: number
  extractedAt?: Date
  createdAt: Date
  updatedAt: Date
}

export interface DeliveryDropNoteDexie {
  id?: number
  advisorId: number
  documentId: number
  jobCode: string
  customerNumber: string
  deliveryDate: Date
  items: Array<{
    lineNumber: number
    description: string
    quantity: number
    status: DeliveryItemStatus
  }>
  fanOutTargets: string[]
  sourceEnv: SourceEnv
  // AI provenance fields
  modelVersion?: string
  promptVersion?: string
  confidence?: number
  extractedAt?: Date
  createdAt: Date
  updatedAt: Date
}

export interface DeliveryDropNoteLineItemDexie {
  id?: number
  deliveryDropNoteId: number
  lineNumber: number
  description: string
  quantity: number
  status: DeliveryItemStatus
  sourceEnv: SourceEnv
  // AI provenance fields
  modelVersion?: string
  promptVersion?: string
  confidence?: number
  extractedAt?: Date
  createdAt: Date
}

export interface ExpenseLineItemDexie {
  id?: number
  expenseId: number
  description: string
  amount: number
  vatAmount?: number
  sourceEnv: SourceEnv
  // AI provenance fields
  modelVersion?: string
  promptVersion?: string
  confidence?: number
  extractedAt?: Date
  createdAt: Date
}

export interface SettingDexie {
  id?: number
  advisorId: number
  key: SettingKey
  value: string
  sourceEnv: SourceEnv
  createdAt: Date
  updatedAt: Date
}

export interface DORPredictionDexie {
  id?: number
  advisorId: number
  weekStart: Date
  weekEnd: Date
  predictedDORRate: number
  currentDORRate: number
  blindsAtRisk: number
  estimatedPenalty: number
  confidence: number
  modelVersion?: string
  promptVersion?: string
  generatedAt: Date
  sourceEnv: SourceEnv
  createdAt: Date
  updatedAt: Date
}

export interface OnboardingStateDexie {
  id?: number
  advisorId: number
  currentStep: number
  completedSteps: number[]
  skippedSteps: number[]
  sourceEnv: SourceEnv
  createdAt: Date
  updatedAt: Date
}

export interface PilotMetricDexie {
  id?: number
  advisorId: number
  date: Date
  metricName: string
  metricValue: number
  metadata?: Record<string, unknown>
  sourceEnv: SourceEnv
  createdAt: Date
}

export interface MessageDraftDexie {
  id?: number
  advisorId: number
  relatedType: string
  relatedId: number
  draftText: string
  status: MessageDraftStatus
  sourceEnv: SourceEnv
  createdAt: Date
  updatedAt: Date
}

export interface ScheduleSuggestionDexie {
  id?: number
  advisorId: number
  date: Date
  suggestionText: string
  affectedVisitIds: number[]
  estimatedSavingMiles?: number
  estimatedSavingMinutes?: number
  scheduleRiskFlag: boolean
  status: ScheduleSuggestionStatus
  sourceEnv: SourceEnv
  createdAt: Date
  updatedAt: Date
}

export interface MeasurementCheckDexie {
  id?: number
  advisorId: number
  visitId: number
  windowId?: string
  blindType?: string
  fitMethod: FitMethod
  widthTopCm?: number
  widthMiddleCm?: number
  widthBottomCm?: number
  workingWidthCm?: number
  dropLeftCm?: number
  dropMiddleCm?: number
  dropRightCm?: number
  workingDropCm?: number
  diagonalTlBrCm?: number
  diagonalTrBlCm?: number
  diagonalDiffCm?: number
  toleranceCm: number
  isSquare?: boolean
  passesTolerance?: boolean
  notes?: string
  photos: string[]
  sourceEnv: SourceEnv
  createdAt: Date
  updatedAt: Date
}

export interface SyncQueueItem {
  id?: number
  entityType: string
  entityId: number
  operation: 'create' | 'update' | 'delete'
  payload: Record<string, unknown>
  status: 'pending' | 'syncing' | 'synced' | 'failed'
  retryCount: number
  lastError?: string
  createdAt: Date
}

export class BeeloDB extends Dexie {
  advisors!: Table<AdvisorDexie>
  customers!: Table<CustomerDexie>
  visits!: Table<VisitDexie>
  leads!: Table<LeadDexie>
  callAttempts!: Table<CallAttemptDexie>
  voiceNotes!: Table<VoiceNoteDexie>
  documents!: Table<DocumentDexie>
  fitLineItems!: Table<FitLineItemDexie>
  incidents!: Table<IncidentDexie>
  quoteLineItems!: Table<QuoteLineItemDexie>
  commissionLineItems!: Table<CommissionLineItemDexie>
  trips!: Table<TripDexie>
  expenses!: Table<ExpenseDexie>
  deliveryDropNotes!: Table<DeliveryDropNoteDexie>
  deliveryDropNoteLineItems!: Table<DeliveryDropNoteLineItemDexie>
  expenseLineItems!: Table<ExpenseLineItemDexie>
  settings!: Table<SettingDexie>
  dorPredictions!: Table<DORPredictionDexie>
  onboardingState!: Table<OnboardingStateDexie>
  pilotMetrics!: Table<PilotMetricDexie>
  messageDrafts!: Table<MessageDraftDexie>
  scheduleSuggestions!: Table<ScheduleSuggestionDexie>
  measurementChecks!: Table<MeasurementCheckDexie>
  syncQueue!: Table<SyncQueueItem>

constructor() {
    super('BeeloDB')
    this.version(3).stores({
      advisors: '++id, supabaseId, authUserId, businessName, employmentModel, baseLocation, workingPreferences, commissionRatePercent, vatAdjustmentPercent, taxReservePercent, installOnlyMinutesPerBlind, fullJobMinutesPerBlind, weeklyEarningsTarget, hmrcMileageRateTier1, hmrcMileageRateTier2, hmrcMileageThresholdMiles, consentStatus, sourceEnv, createdAt, updatedAt, [authUserId]',
      customers: '++id, advisorId, customerNumber, phone, postcode, address, displayName, contactPreferences, history, status, sourceEnv, createdAt, updatedAt, [advisorId+customerNumber], [advisorId]',
      visits: '++id, advisorId, customerId, customerNumber, appointmentNumber, jobCode, orderNumber, appointmentType, jobSource, dateTime, timeSlotStart, timeSlotEnd, status, contactedCustomer, blindCount, preVisitNotes, companyScheduledDurationMinutes, estimatedDurationMinutes, location, sourceDocumentId, sourceEnv, outcome, outcomeValue, discountPercent, commissionAmount, notes, createdAt, updatedAt, [advisorId+jobCode], [advisorId+dateTime], [advisorId]',
      leads: '++id, advisorId, name, phone, landedAt, status, contactAttemptsCount, source, sourceEnv, createdAt, updatedAt, [advisorId]',
      callAttempts: '++id, leadId, initiatedAt, outcome, voiceNoteId, sourceEnv, createdAt, [leadId]',
      voiceNotes: '++id, advisorId, audioPath, recordedAt, durationSeconds, triggerMethod, status, transcript, extractedBlindCount, extractedParkingNotes, extractedAccessNotes, extractedNameSpoken, linkedAppointmentScreenshotDocumentId, matchedVisitId, matchedCustomerId, matchMethod, leadId, sourceEnv, createdAt, updatedAt, [advisorId+status], [advisorId]',
      documents: '++id, advisorId, type, subtype, imagePath, parsedJson, status, matchStatus, sourceEnv, additionalNotes, modelVersion, promptVersion, confidence, extractedAt, createdAt, updatedAt, [advisorId+type], [advisorId+status], [advisorId]',
      fitLineItems: '++id, documentId, jobCode, lineNumber, room, position, fitStatus, refitDate, sourceEnv, modelVersion, promptVersion, confidence, extractedAt, createdAt, [documentId], [jobCode]',
      incidents: '++id, advisorId, visitId, customerId, type, cause, causeDetail, countsTowardDor, discoveredAt, description, resolutionStatus, photos, notes, commissionLineItemId, logisticsLeg, originalFitVisitId, withinWarrantyPeriod, serviceCallOutcome, dorRateAtTimePercent, penaltyTier, blindsAffectedCount, penaltyAmount, saleValueLost, clientAgreedToRemake, remakeMaterialCost, remakeLabourAbsorbed, sourceEnv, modelVersion, promptVersion, confidence, sourceDocumentId, fitLineItemId, detectedAt, crossCheckStatus, commissionRateExpected, commissionRateActual, createdAt, updatedAt, [advisorId], [visitId]',
      quoteLineItems: '++id, documentId, room, position, description, range, colour, widthMm, quantity, unitPrice, lineTotal, sourceEnv, modelVersion, promptVersion, confidence, extractedAt, createdAt, [documentId]',
      commissionLineItems: '++id, commissionStatementDocumentId, lineDate, invoiceNumber, jobCode, customerNumber, customerName, lineType, lineTypeRaw, commissionRatePercent, orderValueIncVat, orderValueExcVat, amountIncVat, amountExcVat, sourceEnv, modelVersion, promptVersion, confidence, extractedAt, createdAt, [commissionStatementDocumentId], [jobCode]',
      trips: '++id, advisorId, visitId, startedAt, endedAt, distanceMiles, pathPoints, status, sourceEnv, createdAt, updatedAt, [advisorId], [visitId]',
      expenses: '++id, advisorId, merchant, date, amount, vatAmount, category, photoPath, sourceDocumentId, sourceEnv, modelVersion, promptVersion, confidence, extractedAt, createdAt, updatedAt, [advisorId+date], [advisorId]',
      deliveryDropNotes: '++id, advisorId, documentId, jobCode, customerNumber, deliveryDate, items, fanOutTargets, sourceEnv, modelVersion, promptVersion, confidence, extractedAt, createdAt, updatedAt, [advisorId+deliveryDate], [advisorId]',
      deliveryDropNoteLineItems: '++id, deliveryDropNoteId, lineNumber, description, quantity, status, sourceEnv, modelVersion, promptVersion, confidence, extractedAt, createdAt, [deliveryDropNoteId]',
      expenseLineItems: '++id, expenseId, description, amount, vatAmount, sourceEnv, modelVersion, promptVersion, confidence, extractedAt, createdAt, [expenseId]',
      settings: '++id, advisorId, key, value, sourceEnv, createdAt, updatedAt, [advisorId+key]',
      dorPredictions: '++id, advisorId, weekStart, weekEnd, predictedDORRate, currentDORRate, blindsAtRisk, estimatedPenalty, confidence, modelVersion, promptVersion, generatedAt, sourceEnv, createdAt, updatedAt, [advisorId+weekStart], [advisorId]',
      onboardingState: '++id, advisorId, currentStep, completedSteps, skippedSteps, sourceEnv, createdAt, updatedAt, [advisorId]',
      pilotMetrics: '++id, advisorId, date, metricName, metricValue, metadata, sourceEnv, createdAt, [advisorId+date], [advisorId]',
      messageDrafts: '++id, advisorId, relatedType, relatedId, draftText, status, sourceEnv, createdAt, updatedAt, [advisorId]',
      scheduleSuggestions: '++id, advisorId, date, suggestionText, affectedVisitIds, estimatedSavingMiles, estimatedSavingMinutes, scheduleRiskFlag, status, sourceEnv, createdAt, updatedAt, [advisorId+date], [advisorId]',
      measurementChecks: '++id, advisorId, visitId, windowId, blindType, fitMethod, widthTopCm, widthMiddleCm, widthBottomCm, workingWidthCm, dropLeftCm, dropMiddleCm, dropRightCm, workingDropCm, diagonalTlBrCm, diagonalTrBlCm, diagonalDiffCm, toleranceCm, isSquare, passesTolerance, notes, photos, sourceEnv, createdAt, updatedAt, [advisorId], [visitId]',
      syncQueue: '++id, entityType, entityId, operation, payload, status, retryCount, lastError, createdAt, [entityType+entityId], [status]'
    })
    this.version(1).stores({
      advisors: '++id, supabaseId, authUserId, businessName, employmentModel, baseLocation, workingPreferences, commissionRatePercent, vatAdjustmentPercent, taxReservePercent, installOnlyMinutesPerBlind, fullJobMinutesPerBlind, weeklyEarningsTarget, hmrcMileageRateTier1, hmrcMileageRateTier2, hmrcMileageThresholdMiles, consentStatus, sourceEnv, createdAt, updatedAt, [authUserId]',
      customers: '++id, advisorId, customerNumber, phone, postcode, address, displayName, contactPreferences, history, status, sourceEnv, createdAt, updatedAt, [advisorId+customerNumber], [advisorId]',
      visits: '++id, advisorId, customerId, customerNumber, appointmentNumber, jobCode, orderNumber, appointmentType, jobSource, dateTime, timeSlotStart, timeSlotEnd, status, contactedCustomer, blindCount, preVisitNotes, companyScheduledDurationMinutes, estimatedDurationMinutes, location, sourceDocumentId, sourceEnv, outcome, outcomeValue, discountPercent, commissionAmount, notes, createdAt, updatedAt, [advisorId+jobCode], [advisorId+dateTime], [advisorId]',
      leads: '++id, advisorId, name, phone, landedAt, status, contactAttemptsCount, source, sourceEnv, createdAt, updatedAt, [advisorId]',
      callAttempts: '++id, leadId, initiatedAt, outcome, voiceNoteId, sourceEnv, createdAt, [leadId]',
      voiceNotes: '++id, advisorId, audioPath, recordedAt, durationSeconds, triggerMethod, status, transcript, extractedBlindCount, extractedParkingNotes, extractedAccessNotes, extractedNameSpoken, linkedAppointmentScreenshotDocumentId, matchedVisitId, matchedCustomerId, matchMethod, leadId, sourceEnv, createdAt, updatedAt, [advisorId+status], [advisorId]',
      documents: '++id, advisorId, type, subtype, imagePath, parsedJson, status, matchStatus, sourceEnv, additionalNotes, modelVersion, promptVersion, confidence, extractedAt, createdAt, updatedAt, [advisorId+type], [advisorId+status], [advisorId]',
      fitLineItems: '++id, documentId, jobCode, lineNumber, room, position, fitStatus, refitDate, sourceEnv, modelVersion, promptVersion, confidence, extractedAt, createdAt, [documentId], [jobCode]',
      incidents: '++id, advisorId, visitId, customerId, type, cause, causeDetail, countsTowardDor, discoveredAt, description, resolutionStatus, photos, notes, commissionLineItemId, logisticsLeg, originalFitVisitId, withinWarrantyPeriod, serviceCallOutcome, dorRateAtTimePercent, penaltyTier, blindsAffectedCount, penaltyAmount, saleValueLost, clientAgreedToRemake, remakeMaterialCost, remakeLabourAbsorbed, sourceEnv, modelVersion, promptVersion, confidence, sourceDocumentId, fitLineItemId, detectedAt, crossCheckStatus, commissionRateExpected, commissionRateActual, createdAt, updatedAt, [advisorId], [visitId]',
      quoteLineItems: '++id, documentId, room, position, description, range, colour, widthMm, quantity, unitPrice, lineTotal, sourceEnv, modelVersion, promptVersion, confidence, extractedAt, createdAt, [documentId]',
      commissionLineItems: '++id, commissionStatementDocumentId, lineDate, invoiceNumber, jobCode, customerNumber, customerName, lineType, commissionRatePercent, orderValueIncVat, orderValueExcVat, amountIncVat, amountExcVat, sourceEnv, modelVersion, promptVersion, confidence, extractedAt, createdAt, [commissionStatementDocumentId], [jobCode]',
      trips: '++id, advisorId, visitId, startedAt, endedAt, distanceMiles, pathPoints, status, sourceEnv, createdAt, updatedAt, [advisorId], [visitId]',
      expenses: '++id, advisorId, merchant, date, amount, vatAmount, category, photoPath, sourceDocumentId, sourceEnv, modelVersion, promptVersion, confidence, extractedAt, createdAt, updatedAt, [advisorId+date], [advisorId]',
      deliveryDropNotes: '++id, advisorId, documentId, jobCode, customerNumber, deliveryDate, items, fanOutTargets, sourceEnv, modelVersion, promptVersion, confidence, extractedAt, createdAt, updatedAt, [advisorId+deliveryDate], [advisorId]',
      deliveryDropNoteLineItems: '++id, deliveryDropNoteId, lineNumber, description, quantity, status, sourceEnv, modelVersion, promptVersion, confidence, extractedAt, createdAt, [deliveryDropNoteId]',
      expenseLineItems: '++id, expenseId, description, amount, vatAmount, sourceEnv, modelVersion, promptVersion, confidence, extractedAt, createdAt, [expenseId]',
      settings: '++id, advisorId, key, value, sourceEnv, createdAt, updatedAt, [advisorId+key]',
      dorPredictions: '++id, advisorId, weekStart, weekEnd, predictedDORRate, currentDORRate, blindsAtRisk, estimatedPenalty, confidence, modelVersion, promptVersion, generatedAt, sourceEnv, createdAt, updatedAt, [advisorId+weekStart], [advisorId]',
      onboardingState: '++id, advisorId, currentStep, completedSteps, skippedSteps, sourceEnv, createdAt, updatedAt, [advisorId]',
      pilotMetrics: '++id, advisorId, date, metricName, metricValue, metadata, sourceEnv, createdAt, [advisorId+date], [advisorId]',
      messageDrafts: '++id, advisorId, relatedType, relatedId, draftText, status, sourceEnv, createdAt, updatedAt, [advisorId]',
      scheduleSuggestions: '++id, advisorId, date, suggestionText, affectedVisitIds, estimatedSavingMiles, estimatedSavingMinutes, scheduleRiskFlag, status, sourceEnv, createdAt, updatedAt, [advisorId+date], [advisorId]',
      measurementChecks: '++id, advisorId, visitId, windowId, blindType, fitMethod, widthTopCm, widthMiddleCm, widthBottomCm, workingWidthCm, dropLeftCm, dropMiddleCm, dropRightCm, workingDropCm, diagonalTlBrCm, diagonalTrBlCm, diagonalDiffCm, toleranceCm, isSquare, passesTolerance, notes, photos, sourceEnv, createdAt, updatedAt, [advisorId], [visitId]',
      syncQueue: '++id, entityType, entityId, operation, payload, status, retryCount, lastError, createdAt, [entityType+entityId], [status]'
    })
  }
}

export const db = new BeeloDB()

export function getDefaultSourceEnv(): SourceEnv {
  if (import.meta.env.DEV) return 'demo'
  if (window.location.hostname.includes('preview') || window.location.hostname.includes('staging')) return 'qa'
  return 'live'
}

export function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)
}

export function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
}

export function transformKeysToSnakeCase(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(obj)) {
    const snakeKey = camelToSnake(key)
    if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
      result[snakeKey] = transformKeysToSnakeCase(value as Record<string, unknown>)
    } else if (Array.isArray(value)) {
      result[snakeKey] = value.map(v => 
        v && typeof v === 'object' && !(v instanceof Date) 
          ? transformKeysToSnakeCase(v as Record<string, unknown>) 
          : v
      )
    } else {
      result[snakeKey] = value
    }
  }
  return result
}

export function transformKeysToCamelCase(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = snakeToCamel(key)
    if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
      result[camelKey] = transformKeysToCamelCase(value as Record<string, unknown>)
    } else if (Array.isArray(value)) {
      result[camelKey] = value.map(v => 
        v && typeof v === 'object' && !(v instanceof Date) 
          ? transformKeysToCamelCase(v as Record<string, unknown>) 
          : v
      )
    } else {
      result[camelKey] = value
    }
  }
  return result
}