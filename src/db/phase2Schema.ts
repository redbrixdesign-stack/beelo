// Dexie schema additions for Phase 2 entities
// Import this in src/lib/dexie.ts to extend the database schema

// Type definitions for Phase 2 Dexie tables
export interface LeadDexie {
  id?: number
  advisorId: number
  name?: string
  phone?: string
  postcode?: string
  address?: string
  displayName?: string
  contactPreferences: Record<string, unknown>
  history: Record<string, unknown>
  status: 'active' | 'archived' | 'blocked'
  sourceEnv: 'demo' | 'qa' | 'live'
  createdAt: Date
  updatedAt: Date
}

export interface CallAttemptDexie {
  id?: number
  leadId: number
  initiatedAt: Date
  outcome: 'connected' | 'no_answer' | 'voicemail'
  voiceNoteId?: number
  sourceEnv: 'demo' | 'qa' | 'live'
  createdAt: Date
}

export interface VoiceNoteDexie {
  id?: number
  advisorId: number
  audioPath?: string
  recordedAt: Date
  durationSeconds?: number
  triggerMethod: 'manual_button' | 'siri_shortcut' | 'assistant_action'
  status: 'recorded' | 'transcribed' | 'unmatched' | 'matched' | 'reviewed'
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
  sourceEnv: 'demo' | 'qa' | 'live'
  createdAt: Date
  updatedAt: Date
}

// Sync queue additions for Phase 2 entities
export interface SyncQueueItem {
  id?: number
  entityType: 'leads' | 'callAttempts' | 'voiceNotes' | string
  entityId: number
  operation: 'create' | 'update' | 'delete'
  payload: Record<string, unknown>
  status: 'pending' | 'syncing' | 'synced' | 'failed'
  retryCount: number
  lastError?: string
  createdAt: Date
}

export const PHASE2_DEXIE_TABLES = {
  leads: '++id, advisorId, name, phone, landedAt, status, contactAttemptsCount, source, sourceEnv, createdAt, updatedAt, [advisorId+status], [advisorId+landedAt], [advisorId+phone]',
  callAttempts: '++id, leadId, initiatedAt, outcome, voiceNoteId, sourceEnv, createdAt, [leadId+initiatedAt]',
  voiceNotes: '++id, advisorId, audioPath, recordedAt, durationSeconds, triggerMethod, status, transcript, extractedBlindCount, extractedParkingNotes, extractedAccessNotes, extractedNameSpoken, linkedAppointmentScreenshotDocumentId, matchedVisitId, matchedCustomerId, matchMethod, leadId, sourceEnv, createdAt, updatedAt, [advisorId+status], [advisorId+recordedAt], [advisorId+leadId], [matchedVisitId], [linkedAppointmentScreenshotDocumentId]'
} as const