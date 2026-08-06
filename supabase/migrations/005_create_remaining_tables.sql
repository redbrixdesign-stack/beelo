-- Migration 005: Create remaining tables (Phase 2-5 entities)
-- All tables with RLS from line 1, source_env on every record
-- NO provenance fields on documents (added in Phase 3)

-- ============================================
-- Leads (Phase 2)
-- ============================================
CREATE TYPE lead_status AS ENUM ('new', 'call_attempted', 'connected', 'no_response', 'follow_up_due', 'converted_to_visit', 'lost');
CREATE TYPE lead_source AS ENUM ('Facebook', 'Instagram', 'TikTok', 'Google', 'Website', 'Referral', 'Leaflet', 'Show Home', 'Event', 'Walk-in', 'Other');

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
CREATE POLICY "lead_isolation" ON leads FOR ALL USING (advisor_id IN (SELECT id FROM advisors WHERE auth_user_id = auth.uid()));
CREATE INDEX idx_leads_advisor_id ON leads(advisor_id);

-- ============================================
-- CallAttempts (Phase 2)
-- ============================================
CREATE TYPE call_outcome AS ENUM ('connected', 'no_answer', 'voicemail');

CREATE TABLE call_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    initiated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    outcome call_outcome NOT NULL,
    voice_note_id UUID,
    source_env TEXT NOT NULL DEFAULT 'live' CHECK (source_env IN ('demo', 'qa', 'live')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE call_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "call_attempt_isolation" ON call_attempts FOR ALL USING (lead_id IN (SELECT id FROM leads WHERE advisor_id IN (SELECT id FROM advisors WHERE auth_user_id = auth.uid())));
CREATE INDEX idx_call_attempts_lead_id ON call_attempts(lead_id);

-- ============================================
-- VoiceNotes (Phase 2)
-- ============================================
CREATE TYPE voice_note_status AS ENUM ('recorded', 'transcribed', 'unmatched', 'matched', 'reviewed');
CREATE TYPE voice_note_trigger AS ENUM ('manual_button', 'siri_shortcut', 'assistant_action');

CREATE TABLE voice_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    advisor_id UUID NOT NULL REFERENCES advisors(id) ON DELETE CASCADE,
    audio_path TEXT,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    duration_seconds INTEGER,
    trigger_method voice_note_trigger NOT NULL DEFAULT 'manual_button',
    status voice_note_status NOT NULL DEFAULT 'recorded',
    transcript TEXT,
    extracted_blind_count INTEGER,
    extracted_parking_notes TEXT,
    extracted_access_notes TEXT,
    extracted_name_spoken TEXT,
    linked_appointment_screenshot_document_id UUID,
    matched_visit_id UUID REFERENCES visits(id) ON DELETE SET NULL,
    matched_customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    match_method TEXT CHECK (match_method IN ('screenshot_proximity', 'manual_review', 'name_hint')),
    lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
    source_env TEXT NOT NULL DEFAULT 'live' CHECK (source_env IN ('demo', 'qa', 'live')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE voice_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "voice_note_isolation" ON voice_notes FOR ALL USING (advisor_id IN (SELECT id FROM advisors WHERE auth_user_id = auth.uid()));
CREATE INDEX idx_voice_notes_advisor_id ON voice_notes(advisor_id);
CREATE INDEX idx_voice_notes_status ON voice_notes(advisor_id, status);

-- ============================================
-- Documents (Phase 3) - NO provenance fields yet
-- ============================================
CREATE TYPE document_type AS ENUM (
    'appointment_card', 'quote_or_receipt', 'fit_completion_receipt',
    'delivery_drop_note', 'commission_statement', 'expense_receipt', 'dor_receipt'
);
CREATE TYPE document_status AS ENUM ('uploaded', 'processing', 'parsed', 'matched', 'error');
CREATE TYPE document_match_status AS ENUM ('unmatched', 'matched', 'partial', 'failed');

CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    advisor_id UUID NOT NULL REFERENCES advisors(id) ON DELETE CASCADE,
    type document_type NOT NULL,
    subtype TEXT,
    image_path TEXT,
    parsed_json JSONB,
    status document_status NOT NULL DEFAULT 'uploaded',
    match_status document_match_status NOT NULL DEFAULT 'unmatched',
    source_env TEXT NOT NULL DEFAULT 'live' CHECK (source_env IN ('demo', 'qa', 'live')),
    additional_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "document_isolation" ON documents FOR ALL USING (advisor_id IN (SELECT id FROM advisors WHERE auth_user_id = auth.uid()));
CREATE INDEX idx_documents_advisor_id ON documents(advisor_id);
CREATE INDEX idx_documents_type ON documents(advisor_id, type);
CREATE INDEX idx_documents_status ON documents(advisor_id, status);

-- ============================================
-- FitLineItems (Phase 3)
-- ============================================
CREATE TYPE fit_status AS ENUM ('fitted', 'replacement');

CREATE TABLE fit_line_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    job_code TEXT NOT NULL CHECK (job_code ~ '^[A-Z]\d{3}[A-Z]?$'),
    line_number INTEGER NOT NULL,
    room TEXT,
    position TEXT,
    fit_status fit_status NOT NULL,
    refit_date TIMESTAMPTZ,
    source_env TEXT NOT NULL DEFAULT 'live' CHECK (source_env IN ('demo', 'qa', 'live')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE fit_line_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fit_line_item_isolation" ON fit_line_items FOR ALL USING (document_id IN (SELECT id FROM documents WHERE advisor_id IN (SELECT id FROM advisors WHERE auth_user_id = auth.uid())));
CREATE INDEX idx_fit_line_items_document_id ON fit_line_items(document_id);
CREATE INDEX idx_fit_line_items_job_code ON fit_line_items(job_code);

-- ============================================
-- Incidents (Phase 3)
-- ============================================
CREATE TYPE incident_type AS ENUM (
    'mismeasurement', 'wrong_colour', 'wrong_product', 'installation_damage',
    'window_breakage', 'logistics_damage', 'theft', 'warranty_malfunction', 'other'
);
CREATE TYPE incident_cause AS ENUM (
    'fitter_error', 'customer_error', 'supplier_error', 'logistics_error',
    'theft', 'product_defect', 'accidental', 'unknown'
);
CREATE TYPE incident_resolution AS ENUM ('open', 'in_progress', 'resolved', 'disputed', 'closed');
CREATE TYPE logistics_leg AS ENUM ('hillarys_to_advisor', 'advisor_to_customer');
CREATE TYPE service_call_outcome AS ENUM ('repaired_on_site', 'dor_raised_unrepairable', 'escalated');
CREATE TYPE penalty_tier AS ENUM ('standard', 'elevated');

CREATE TABLE incidents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    advisor_id UUID NOT NULL REFERENCES advisors(id) ON DELETE CASCADE,
    visit_id UUID NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    type incident_type NOT NULL,
    cause incident_cause NOT NULL,
    cause_detail TEXT,
    counts_toward_dor BOOLEAN NOT NULL DEFAULT FALSE,
    discovered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    description TEXT,
    resolution_status incident_resolution NOT NULL DEFAULT 'open',
    photos JSONB DEFAULT '[]',
    notes TEXT,
    commission_line_item_id UUID,
    logistics_leg logistics_leg,
    original_fit_visit_id UUID REFERENCES visits(id) ON DELETE SET NULL,
    within_warranty_period BOOLEAN,
    service_call_outcome service_call_outcome,
    dor_rate_at_time_percent NUMERIC(5,2),
    penalty_tier penalty_tier,
    blinds_affected_count INTEGER,
    penalty_amount NUMERIC(12,2),
    sale_value_lost NUMERIC(12,2),
    client_agreed_to_remake BOOLEAN,
    remake_material_cost NUMERIC(12,2),
    remake_labour_absorbed NUMERIC(12,2),
    source_env TEXT NOT NULL DEFAULT 'live' CHECK (source_env IN ('demo', 'qa', 'live')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "incident_isolation" ON incidents FOR ALL USING (advisor_id IN (SELECT id FROM advisors WHERE auth_user_id = auth.uid()));
CREATE INDEX idx_incidents_advisor_id ON incidents(advisor_id);
CREATE INDEX idx_incidents_visit_id ON incidents(visit_id);

-- ============================================
-- QuoteLineItems (Phase 3)
-- ============================================
CREATE TABLE quote_line_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    room TEXT,
    position TEXT,
    description TEXT,
    range TEXT,
    colour TEXT,
    width_mm INTEGER,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price NUMERIC(10,2),
    line_total NUMERIC(12,2),
    source_env TEXT NOT NULL DEFAULT 'live' CHECK (source_env IN ('demo', 'qa', 'live')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE quote_line_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "quote_line_item_isolation" ON quote_line_items FOR ALL USING (document_id IN (SELECT id FROM documents WHERE advisor_id IN (SELECT id FROM advisors WHERE auth_user_id = auth.uid())));
CREATE INDEX idx_quote_line_items_document_id ON quote_line_items(document_id);

-- ============================================
-- CommissionLineItems (Phase 3)
-- ============================================
CREATE TABLE commission_line_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    commission_statement_document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    line_date DATE,
    invoice_number TEXT,
    job_code TEXT NOT NULL CHECK (job_code ~ '^[A-Z]\d{3}[A-Z]?$'),
    customer_number TEXT,
    customer_name TEXT,
    line_type TEXT,
    commission_rate_percent NUMERIC(5,2),
    order_value_inc_vat NUMERIC(12,2),
    order_value_exc_vat NUMERIC(12,2),
    amount_inc_vat NUMERIC(12,2),
    amount_exc_vat NUMERIC(12,2),
    source_env TEXT NOT NULL DEFAULT 'live' CHECK (source_env IN ('demo', 'qa', 'live')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE commission_line_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "commission_line_item_isolation" ON commission_line_items FOR ALL USING (commission_statement_document_id IN (SELECT id FROM documents WHERE advisor_id IN (SELECT id FROM advisors WHERE auth_user_id = auth.uid())));
CREATE INDEX idx_commission_line_items_document_id ON commission_line_items(commission_statement_document_id);
CREATE INDEX idx_commission_line_items_job_code ON commission_line_items(job_code);

-- ============================================
-- Trips (Phase 4)
-- ============================================
CREATE TABLE trips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    advisor_id UUID NOT NULL REFERENCES advisors(id) ON DELETE CASCADE,
    visit_id UUID REFERENCES visits(id) ON DELETE SET NULL,
    started_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    distance_miles NUMERIC(8,2),
    path_points JSONB,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
    source_env TEXT NOT NULL DEFAULT 'live' CHECK (source_env IN ('demo', 'qa', 'live')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
CREATE POLICY "trip_isolation" ON trips FOR ALL USING (advisor_id IN (SELECT id FROM advisors WHERE auth_user_id = auth.uid()));
CREATE INDEX idx_trips_advisor_id ON trips(advisor_id);
CREATE INDEX idx_trips_visit_id ON trips(visit_id);

-- ============================================
-- Expenses (Phase 5)
-- ============================================
CREATE TABLE expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    advisor_id UUID NOT NULL REFERENCES advisors(id) ON DELETE CASCADE,
    merchant TEXT,
    date DATE NOT NULL,
    amount NUMERIC(12,2) NOT NULL,
    vat_amount NUMERIC(12,2),
    category TEXT,
    photo_path TEXT,
    source_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
    source_env TEXT NOT NULL DEFAULT 'live' CHECK (source_env IN ('demo', 'qa', 'live')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "expense_isolation" ON expenses FOR ALL USING (advisor_id IN (SELECT id FROM advisors WHERE auth_user_id = auth.uid()));
CREATE INDEX idx_expenses_advisor_id ON expenses(advisor_id);
CREATE INDEX idx_expenses_date ON expenses(advisor_id, date);

-- ============================================
-- MessageDrafts (Phase 2/4)
-- ============================================
CREATE TABLE message_drafts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    advisor_id UUID NOT NULL REFERENCES advisors(id) ON DELETE CASCADE,
    related_type TEXT NOT NULL,
    related_id UUID NOT NULL,
    draft_text TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'discarded')),
    source_env TEXT NOT NULL DEFAULT 'live' CHECK (source_env IN ('demo', 'qa', 'live')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE message_drafts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "message_draft_isolation" ON message_drafts FOR ALL USING (advisor_id IN (SELECT id FROM advisors WHERE auth_user_id = auth.uid()));
CREATE INDEX idx_message_drafts_advisor_id ON message_drafts(advisor_id);

-- ============================================
-- ScheduleSuggestions (Phase 4)
-- ============================================
CREATE TABLE schedule_suggestions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    advisor_id UUID NOT NULL REFERENCES advisors(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    suggestion_text TEXT NOT NULL,
    affected_visit_ids UUID[] NOT NULL DEFAULT '{}',
    estimated_saving_miles NUMERIC(8,2),
    estimated_saving_minutes INTEGER,
    schedule_risk_flag BOOLEAN NOT NULL DEFAULT FALSE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'dismissed')),
    source_env TEXT NOT NULL DEFAULT 'live' CHECK (source_env IN ('demo', 'qa', 'live')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE schedule_suggestions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "schedule_suggestion_isolation" ON schedule_suggestions FOR ALL USING (advisor_id IN (SELECT id FROM advisors WHERE auth_user_id = auth.uid()));
CREATE INDEX idx_schedule_suggestions_advisor_id ON schedule_suggestions(advisor_id);
CREATE INDEX idx_schedule_suggestions_date ON schedule_suggestions(advisor_id, date);

-- ============================================
-- MeasurementChecks (Phase 5) - Units in CM
-- ============================================
CREATE TYPE fit_method AS ENUM ('recess', 'exact');

CREATE TABLE measurement_checks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    advisor_id UUID NOT NULL REFERENCES advisors(id) ON DELETE CASCADE,
    visit_id UUID NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
    window_id TEXT,
    blind_type TEXT,
    fit_method fit_method NOT NULL,
    width_top_cm NUMERIC(6,2),
    width_middle_cm NUMERIC(6,2),
    width_bottom_cm NUMERIC(6,2),
    working_width_cm NUMERIC(6,2),
    drop_left_cm NUMERIC(6,2),
    drop_middle_cm NUMERIC(6,2),
    drop_right_cm NUMERIC(6,2),
    working_drop_cm NUMERIC(6,2),
    diagonal_tl_br_cm NUMERIC(6,2),
    diagonal_tr_bl_cm NUMERIC(6,2),
    diagonal_diff_cm NUMERIC(6,2),
    tolerance_cm NUMERIC(4,2) NOT NULL DEFAULT 1.00,
    is_square BOOLEAN,
    passes_tolerance BOOLEAN,
    notes TEXT,
    photos JSONB DEFAULT '[]',
    source_env TEXT NOT NULL DEFAULT 'live' CHECK (source_env IN ('demo', 'qa', 'live')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE measurement_checks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "measurement_check_isolation" ON measurement_checks FOR ALL USING (advisor_id IN (SELECT id FROM advisors WHERE auth_user_id = auth.uid()));
CREATE INDEX idx_measurement_checks_advisor_id ON measurement_checks(advisor_id);
CREATE INDEX idx_measurement_checks_visit_id ON measurement_checks(visit_id);