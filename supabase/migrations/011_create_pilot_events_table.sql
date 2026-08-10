-- Migration: 011_create_pilot_events_table.sql
-- Lightweight, PII-free event logging for pilot analytics

-- ============================================================================
-- Pilot Events Table
-- ============================================================================
CREATE TABLE pilot_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    advisor_id UUID NOT NULL REFERENCES advisors(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL CHECK (event_type IN (
        'visit_created',
        'document_captured',
        'voice_note_recorded',
        'ocr_completed',
        'ocr_failed',
        'sync_completed',
        'schedule_risk_warning_shown'
    )),
    -- Minimal, non-PII context for debugging/analytics
    event_data JSONB NOT NULL DEFAULT '{}',
    -- Timestamp
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX idx_pilot_events_advisor_id ON pilot_events(advisor_id);
CREATE INDEX idx_pilot_events_event_type ON pilot_events(event_type);
CREATE INDEX idx_pilot_events_created_at ON pilot_events(created_at DESC);

-- RLS: Advisor can only see their own events
ALTER TABLE pilot_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pilot_events_select_own" ON pilot_events
    FOR SELECT USING (advisor_id IN (SELECT id FROM advisors WHERE auth_user_id = auth.uid()));

CREATE POLICY "pilot_events_insert_own" ON pilot_events
    FOR INSERT WITH CHECK (advisor_id IN (SELECT id FROM advisors WHERE auth_user_id = auth.uid()));

-- No UPDATE/DELETE policies - events are immutable once created

-- Index for cleanup/retention queries
CREATE INDEX idx_pilot_events_advisor_created ON pilot_events(advisor_id, created_at DESC);

-- Comment
COMMENT ON TABLE pilot_events IS 'Lightweight, PII-free event logging for pilot analytics. No customer names, addresses, or photos stored.';
COMMENT ON COLUMN pilot_events.event_data IS 'Minimal non-PII context: e.g., {"visit_id": 123, "document_type": "quote_or_receipt", "duration_ms": 1500, "blind_count": 4, "risk_level": "high"}';