-- Migration 007: Create Phase 3-5 tables (from archived 001_initial_schema)
-- These tables existed only in the superseded 001_initial_schema.sql
-- Rewritten with UUID PKs, RLS from line 1, source_env on every record
-- to match the authoritative 002-006 migration style

-- ============================================
-- Delivery Drop Notes (Phase 3)
-- ============================================
CREATE TABLE delivery_drop_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    advisor_id UUID NOT NULL REFERENCES advisors(id) ON DELETE CASCADE,
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    job_code TEXT NOT NULL CHECK (job_code ~ '^[A-Z]\d{3}[A-Z]?$'),
    customer_number TEXT NOT NULL,
    delivery_date TIMESTAMPTZ NOT NULL,
    items JSONB NOT NULL DEFAULT '[]',
    fan_out_targets TEXT[] DEFAULT '{}',
    source_env TEXT NOT NULL DEFAULT 'live' CHECK (source_env IN ('demo', 'qa', 'live')),
    model_version TEXT,
    prompt_version TEXT,
    confidence NUMERIC(3,2),
    extracted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE delivery_drop_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "delivery_drop_note_isolation" ON delivery_drop_notes FOR ALL 
    USING (advisor_id IN (SELECT id FROM advisors WHERE auth_user_id = auth.uid()));
CREATE INDEX idx_delivery_drop_notes_advisor_id ON delivery_drop_notes(advisor_id);
CREATE INDEX idx_delivery_drop_notes_delivery_date ON delivery_drop_notes(advisor_id, delivery_date);

-- ============================================
-- Settings (Phase 5)
-- ============================================
CREATE TABLE settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    advisor_id UUID NOT NULL REFERENCES advisors(id) ON DELETE CASCADE,
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    source_env TEXT NOT NULL DEFAULT 'live' CHECK (source_env IN ('demo', 'qa', 'live')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (advisor_id, key)
);

ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "settings_isolation" ON settings FOR ALL 
    USING (advisor_id IN (SELECT id FROM advisors WHERE auth_user_id = auth.uid()));
CREATE INDEX idx_settings_advisor_id ON settings(advisor_id);

-- ============================================
-- DOR Predictions (Phase 5)
-- ============================================
CREATE TABLE dor_predictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    advisor_id UUID NOT NULL REFERENCES advisors(id) ON DELETE CASCADE,
    week_start TIMESTAMPTZ NOT NULL,
    week_end TIMESTAMPTZ NOT NULL,
    predicted_dor_rate NUMERIC(5,2),
    current_dor_rate NUMERIC(5,2),
    blinds_at_risk INTEGER,
    estimated_penalty NUMERIC(12,2),
    confidence NUMERIC(3,2),
    model_version TEXT,
    prompt_version TEXT,
    generated_at TIMESTAMPTZ DEFAULT NOW(),
    source_env TEXT NOT NULL DEFAULT 'live' CHECK (source_env IN ('demo', 'qa', 'live')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE dor_predictions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dor_prediction_isolation" ON dor_predictions FOR ALL 
    USING (advisor_id IN (SELECT id FROM advisors WHERE auth_user_id = auth.uid()));
CREATE INDEX idx_dor_predictions_advisor_id ON dor_predictions(advisor_id);
CREATE INDEX idx_dor_predictions_week_start ON dor_predictions(advisor_id, week_start);

-- ============================================
-- Onboarding State (Phase 5)
-- ============================================
CREATE TABLE onboarding_state (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    advisor_id UUID NOT NULL REFERENCES advisors(id) ON DELETE CASCADE,
    current_step INTEGER NOT NULL DEFAULT 0,
    completed_steps INTEGER[] NOT NULL DEFAULT '{}',
    skipped_steps INTEGER[] NOT NULL DEFAULT '{}',
    source_env TEXT NOT NULL DEFAULT 'live' CHECK (source_env IN ('demo', 'qa', 'live')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE onboarding_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "onboarding_state_isolation" ON onboarding_state FOR ALL 
    USING (advisor_id IN (SELECT id FROM advisors WHERE auth_user_id = auth.uid()));
CREATE INDEX idx_onboarding_state_advisor_id ON onboarding_state(advisor_id);

-- ============================================
-- Pilot Metrics (Phase 5)
-- ============================================
CREATE TABLE pilot_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    advisor_id UUID NOT NULL REFERENCES advisors(id) ON DELETE CASCADE,
    date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    metric_name TEXT NOT NULL,
    metric_value NUMERIC NOT NULL,
    metadata JSONB,
    source_env TEXT NOT NULL DEFAULT 'live' CHECK (source_env IN ('demo', 'qa', 'live')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE pilot_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pilot_metrics_isolation" ON pilot_metrics FOR ALL 
    USING (advisor_id IN (SELECT id FROM advisors WHERE auth_user_id = auth.uid()));
CREATE INDEX idx_pilot_metrics_advisor_id_date ON pilot_metrics(advisor_id, date);
CREATE INDEX idx_pilot_metrics_advisor_id ON pilot_metrics(advisor_id);

-- ============================================
-- Updated at triggers for new tables
-- ============================================
CREATE TRIGGER update_delivery_drop_notes_updated_at BEFORE UPDATE ON delivery_drop_notes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_dor_predictions_updated_at BEFORE UPDATE ON dor_predictions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_onboarding_state_updated_at BEFORE UPDATE ON onboarding_state FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_pilot_metrics_updated_at BEFORE UPDATE ON pilot_metrics FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();