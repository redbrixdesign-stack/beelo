-- Migration: 20260807_phase2_entities.sql
-- Create leads, call_attempts, voice_notes tables with RLS from line 1

-- ============================================
-- Leads
-- ============================================
CREATE TYPE lead_status AS ENUM (
    'new', 'call_attempted', 'connected', 'no_response', 
    'follow_up_due', 'converted_to_visit', 'lost'
);
CREATE TYPE lead_source AS ENUM (
    'Facebook', 'Instagram', 'TikTok', 'Google', 'Website', 
    'Referral', 'Leaflet', 'Show Home', 'Event', 'Walk-in', 'Other'
);

CREATE TABLE leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    advisor_id UUID NOT NULL REFERENCES advisors(id) ON DELETE CASCADE,
    name TEXT,
    phone TEXT,
    landed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status lead_status NOT NULL DEFAULT 'new',
    contact_attempts_count INTEGER NOT NULL DEFAULT 0,
    source lead_source,
    source_env TEXT NOT NULL DEFAULT 'live' CHECK (source_env IN ('demo', 'qa', 'live')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "leads_select_own" ON leads FOR SELECT USING (advisor_id = (SELECT id FROM advisors WHERE auth_user_id = auth.uid()));
CREATE POLICY "leads_insert_own" ON leads FOR INSERT WITH CHECK (advisor_id = (SELECT id FROM advisors WHERE auth_user_id = auth.uid()));
CREATE POLICY "leads_update_own" ON leads FOR UPDATE USING (advisor_id = (SELECT id FROM advisors WHERE auth_user_id = auth.uid())) WITH CHECK (advisor_id = (SELECT id FROM advisors WHERE auth_user_id = auth.uid()));
CREATE POLICY "leads_delete_own" ON leads FOR DELETE USING (advisor_id = (SELECT id FROM advisors WHERE auth_user_id = auth.uid()));

CREATE INDEX idx_leads_advisor_id_status ON leads(advisor_id, status);
CREATE INDEX idx_leads_advisor_id_landed_at ON leads(advisor_id, landed_at DESC);
CREATE INDEX idx_leads_advisor_id_phone ON leads(advisor_id, phone);

-- ============================================
-- CallAttempts
-- ============================================
CREATE TYPE call_outcome AS ENUM ('connected', 'no_answer', 'voicemail');

CREATE TABLE call_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    initiated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    outcome call_outcome NOT NULL,
    voice_note_id UUID REFERENCES voice_notes(id) ON DELETE SET NULL,
    source_env TEXT NOT NULL DEFAULT 'live' CHECK (source_env IN ('demo', 'qa', 'live')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE call_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "call_attempts_select_own" ON call_attempts FOR SELECT USING (
    lead_id IN (SELECT id FROM leads WHERE advisor_id = (SELECT id FROM advisors WHERE auth_user_id = auth.uid()))
);
CREATE POLICY "call_attempts_insert_own" ON call_attempts FOR INSERT WITH CHECK (
    lead_id IN (SELECT id FROM leads WHERE advisor_id = (SELECT id FROM advisors WHERE auth_user_id = auth.uid()))
);
CREATE POLICY "call_attempts_update_own" ON call_attempts FOR UPDATE USING (
    lead_id IN (SELECT id FROM leads WHERE advisor_id = (SELECT id FROM advisors WHERE auth_user_id = auth.uid()))
) WITH CHECK (
    lead_id IN (SELECT id FROM leads WHERE advisor_id = (SELECT id FROM advisors WHERE auth_user_id = auth.uid()))
);
CREATE POLICY "call_attempts_delete_own" ON call_attempts FOR DELETE USING (
    lead_id IN (SELECT id FROM leads WHERE advisor_id = (SELECT id FROM advisors WHERE auth_user_id = auth.uid()))
);

CREATE INDEX idx_call_attempts_lead_id ON call_attempts(lead_id, initiated_at DESC);

-- ============================================
-- VoiceNotes
-- ============================================
CREATE TYPE voice_note_status AS ENUM ('recorded', 'transcribed', 'unmatched', 'matched', 'reviewed');
CREATE TYPE voice_note_trigger AS ENUM ('manual_button', 'siri_shortcut', 'assistant_action');

CREATE TABLE voice_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    advisor_id UUID NOT NULL REFERENCES advisors(id) ON DELETE CASCADE,
    audio_path TEXT NOT NULL,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    duration_seconds INTEGER,
    trigger_method voice_note_trigger NOT NULL DEFAULT 'manual_button',
    status voice_note_status NOT NULL DEFAULT 'recorded',
    transcript TEXT,
    extracted_blind_count INTEGER,
    extracted_parking_notes TEXT,
    extracted_access_notes TEXT,
    extracted_name_spoken TEXT,
    linked_appointment_screenshot_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
    matched_visit_id UUID REFERENCES visits(id) ON DELETE SET NULL,
    matched_customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    match_method TEXT CHECK (match_method IN ('screenshot_proximity', 'manual_review', 'name_hint')),
    lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
    source_env TEXT NOT NULL DEFAULT 'live' CHECK (source_env IN ('demo', 'qa', 'live')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE voice_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "voice_notes_select_own" ON voice_notes FOR SELECT USING (advisor_id = (SELECT id FROM advisors WHERE auth_user_id = auth.uid()));
CREATE POLICY "voice_notes_insert_own" ON voice_notes FOR INSERT WITH CHECK (advisor_id = (SELECT id FROM advisors WHERE auth_user_id = auth.uid()));
CREATE POLICY "voice_notes_update_own" ON voice_notes FOR UPDATE USING (advisor_id = (SELECT id FROM advisors WHERE auth_user_id = auth.uid())) WITH CHECK (advisor_id = (SELECT id FROM advisors WHERE auth_user_id = auth.uid()));
CREATE POLICY "voice_notes_delete_own" ON voice_notes FOR DELETE USING (advisor_id = (SELECT id FROM advisors WHERE auth_user_id = auth.uid()));

CREATE INDEX idx_voice_notes_advisor_id_status ON voice_notes(advisor_id, status);
CREATE INDEX idx_voice_notes_advisor_id_recorded ON voice_notes(advisor_id, recorded_at DESC);
CREATE INDEX idx_voice_notes_advisor_id_lead ON voice_notes(advisor_id, lead_id);
CREATE INDEX idx_voice_notes_matched_visit ON voice_notes(matched_visit_id);
CREATE INDEX idx_voice_notes_linked_screenshot ON voice_notes(linked_appointment_screenshot_document_id);

-- ============================================
-- Updated at triggers
-- ============================================
CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON leads FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_call_attempts_updated_at BEFORE UPDATE ON call_attempts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_voice_notes_updated_at BEFORE UPDATE ON voice_notes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();