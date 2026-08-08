// Lead types
export interface Lead {
  id: string
  advisor_id: string
  name?: string
  phone?: string
  landed_at: string
  status: 'new' | 'call_attempted' | 'connected' | 'no_response' | 'follow_up_due' | 'converted_to_visit' | 'lost'
  contact_attempts_count: number
  source?: 'Facebook' | 'Instagram' | 'TikTok' | 'Google' | 'Website' | 'Referral' | 'Leaflet' | 'Show Home' | 'Event' | 'Walk-in' | 'Other'
  source_env: 'demo' | 'qa' | 'live'
  created_at: string
  updated_at: string
  _sync_status?: 'pending' | 'synced' | 'failed'
  _last_synced_at?: string
}

export interface LeadFormData {
  name?: string
  phone?: string
  source?: Lead['source']
}

export interface CallAttempt {
  id: string
  lead_id: string
  initiated_at: string
  outcome: 'connected' | 'no_answer' | 'voicemail'
  voice_note_id?: string
  source_env: 'demo' | 'qa' | 'live'
  created_at: string
  _sync_status?: 'pending' | 'synced' | 'failed'
}

export interface CallAttemptFormData {
  outcome: CallAttempt['outcome']
  notes?: string
}

export interface VoiceNote {
  id: string
  advisor_id: string
  audio_path: string
  recorded_at: string
  duration_seconds?: number
  trigger_method: 'manual_button' | 'siri_shortcut' | 'assistant_action'
  status: 'recorded' | 'transcribed' | 'unmatched' | 'matched' | 'reviewed'
  transcript?: string
  extracted_blind_count?: number
  extracted_parking_notes?: string
  extracted_access_notes?: string
  extracted_name_spoken?: string
  linked_appointment_screenshot_document_id?: string
  matched_visit_id?: string
  matched_customer_id?: string
  match_method?: 'screenshot_proximity' | 'manual_review' | 'name_hint'
  lead_id?: string
  source_env: 'demo' | 'qa' | 'live'
  created_at: string
  updated_at: string
  _sync_status?: 'pending' | 'synced' | 'failed'
  _last_synced_at?: string
}

export interface VoiceNoteFormData {
  audio_path: string
  recorded_at: string
  duration_seconds?: number
  trigger_method: VoiceNote['trigger_method']
  lead_id?: string
}