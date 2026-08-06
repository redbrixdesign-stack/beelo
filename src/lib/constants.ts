export const OUTCOME_TAXONOMY = [
  'Ordered',
  'Quoted',
  'Needs to Think',
  'Talk to Partner',
  'Comparing Quotes',
  'Too Expensive',
  'Spec Mismatch',
  'Not What They Wanted',
  'Not in Range',
  'Windows Too High',
  'Customer No Show',
  'Advisor Could Not Attend'
] as const

export type OutcomeTaxonomy = typeof OUTCOME_TAXONOMY[number]

export const APPOINTMENT_TYPES = ['sales', 'survey', 'fit', 'service_call'] as const
export type AppointmentType = typeof APPOINTMENT_TYPES[number]

export const JOB_SOURCES = ['self_sold', 'company_assigned'] as const
export type JobSource = typeof JOB_SOURCES[number]

export const LEAD_STATUSES = ['new', 'call_attempted', 'connected', 'no_response', 'follow_up_due', 'converted_to_visit', 'lost'] as const
export type LeadStatus = typeof LEAD_STATUSES[number]

export const LEAD_SOURCES = ['Facebook', 'Instagram', 'TikTok', 'Google', 'Website', 'Referral', 'Leaflet', 'Show Home', 'Event', 'Walk-in', 'Other'] as const
export type LeadSource = typeof LEAD_SOURCES[number]

export const CALL_OUTCOMES = ['connected', 'no_answer', 'voicemail'] as const
export type CallOutcome = typeof CALL_OUTCOMES[number]

export const VOICE_NOTE_STATUSES = ['recorded', 'transcribed', 'unmatched', 'matched', 'reviewed'] as const
export type VoiceNoteStatus = typeof VOICE_NOTE_STATUSES[number]

export const VOICE_NOTE_TRIGGERS = ['manual_button', 'siri_shortcut', 'assistant_action'] as const
export type VoiceNoteTrigger = typeof VOICE_NOTE_TRIGGERS[number]

export const DOCUMENT_TYPES = [
  'appointment_card',
  'quote_or_receipt',
  'fit_completion_receipt',
  'delivery_drop_note',
  'commission_statement',
  'expense_receipt',
  'dor_receipt'
] as const
export type DocumentType = typeof DOCUMENT_TYPES[number]

export const DOCUMENT_STATUSES = ['uploaded', 'processing', 'parsed', 'matched', 'error'] as const
export type DocumentStatus = typeof DOCUMENT_STATUSES[number]

export const DOCUMENT_MATCH_STATUSES = ['unmatched', 'matched', 'partial', 'failed'] as const
export type DocumentMatchStatus = typeof DOCUMENT_MATCH_STATUSES[number]

export const FIT_STATUSES = ['fitted', 'replacement'] as const
export type FitStatus = typeof FIT_STATUSES[number]

export const INCIDENT_TYPES = [
  'mismeasurement', 'wrong_colour', 'wrong_product', 'installation_damage',
  'window_breakage', 'logistics_damage', 'theft', 'warranty_malfunction', 'other'
] as const
export type IncidentType = typeof INCIDENT_TYPES[number]

export const INCIDENT_CAUSES = [
  'fitter_error', 'customer_error', 'supplier_error', 'logistics_error',
  'theft', 'product_defect', 'accidental', 'unknown'
] as const
export type IncidentCause = typeof INCIDENT_CAUSES[number]

export const INCIDENT_RESOLUTIONS = ['open', 'in_progress', 'resolved', 'disputed', 'closed'] as const
export type IncidentResolution = typeof INCIDENT_RESOLUTIONS[number]

export const LOGISTICS_LEGS = ['hillarys_to_advisor', 'advisor_to_customer'] as const
export type LogisticsLeg = typeof LOGISTICS_LEGS[number]

export const SERVICE_CALL_OUTCOMES = ['repaired_on_site', 'dor_raised_unrepairable', 'escalated'] as const
export type ServiceCallOutcome = typeof SERVICE_CALL_OUTCOMES[number]

export const PENALTY_TIERS = ['standard', 'elevated'] as const
export type PenaltyTier = typeof PENALTY_TIERS[number]

export const FIT_METHODS = ['recess', 'exact'] as const
export type FitMethod = typeof FIT_METHODS[number]

export const CUSTOMER_STATUSES = ['active', 'archived', 'blocked'] as const
export type CustomerStatus = typeof CUSTOMER_STATUSES[number]

export const EMPLOYMENT_MODELS = ['company_advisor', 'independent'] as const
export type EmploymentModel = typeof EMPLOYMENT_MODELS[number]

export const SOURCE_ENVS = ['demo', 'qa', 'live'] as const
export type SourceEnv = typeof SOURCE_ENVS[number]

export const CONSENT_STATUSES = ['pending', 'granted', 'revoked'] as const
export type ConsentStatus = typeof CONSENT_STATUSES[number]

export const TRIP_STATUSES = ['pending', 'completed', 'cancelled'] as const
export type TripStatus = typeof TRIP_STATUSES[number]

export const MESSAGE_DRAFT_STATUSES = ['draft', 'sent', 'discarded'] as const
export type MessageDraftStatus = typeof MESSAGE_DRAFT_STATUSES[number]

export const SCHEDULE_SUGGESTION_STATUSES = ['pending', 'accepted', 'dismissed'] as const
export type ScheduleSuggestionStatus = typeof SCHEDULE_SUGGESTION_STATUSES[number]

export function isValidOutcome(value: string): value is OutcomeTaxonomy {
  return OUTCOME_TAXONOMY.includes(value as OutcomeTaxonomy)
}

export function isValidAppointmentType(value: string): value is AppointmentType {
  return APPOINTMENT_TYPES.includes(value as AppointmentType)
}

export function isValidJobSource(value: string): value is JobSource {
  return JOB_SOURCES.includes(value as JobSource)
}

export function isValidSourceEnv(value: string): value is SourceEnv {
  return SOURCE_ENVS.includes(value as SourceEnv)
}