-- Migration 004: Create visits table
-- Core visit entity with outcome taxonomy, job code validation, RLS from line 1

CREATE TYPE visit_appointment_type AS ENUM ('sales', 'survey', 'fit', 'service_call');
CREATE TYPE visit_job_source AS ENUM ('self_sold', 'company_assigned');
CREATE TYPE visit_outcome AS ENUM (
    'Ordered', 'Quoted', 'Needs to Think', 'Talk to Partner',
    'Comparing Quotes', 'Too Expensive', 'Spec Mismatch',
    'Not What They Wanted', 'Not in Range', 'Windows Too High',
    'Customer No Show', 'Advisor Could Not Attend'
);

CREATE TABLE visits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    advisor_id UUID NOT NULL REFERENCES advisors(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    customer_number TEXT NOT NULL,
    appointment_number TEXT,
    job_code TEXT NOT NULL CHECK (job_code ~ '^[A-Z]\d{3}[A-Z]?$'),
    order_number TEXT,
    appointment_type visit_appointment_type NOT NULL,
    job_source visit_job_source NOT NULL DEFAULT 'self_sold',
    date_time TIMESTAMPTZ NOT NULL,
    time_slot_start TIMESTAMPTZ,
    time_slot_end TIMESTAMPTZ,
    status TEXT,
    contacted_customer BOOLEAN NOT NULL DEFAULT FALSE,
    blind_count INTEGER,
    pre_visit_notes TEXT,
    company_scheduled_duration_minutes INTEGER,
    estimated_duration_minutes INTEGER,
    location TEXT,
    source_document_id UUID,
    source_env TEXT NOT NULL DEFAULT 'live' CHECK (source_env IN ('demo', 'qa', 'live')),
    outcome visit_outcome,
    outcome_value NUMERIC(12,2),
    discount_percent NUMERIC(5,2) CHECK (discount_percent >= 0 AND discount_percent <= 100),
    commission_amount NUMERIC(12,2),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE visits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "visit_isolation" ON visits 
    FOR ALL USING (advisor_id IN (SELECT id FROM advisors WHERE auth_user_id = auth.uid()));

CREATE INDEX idx_visits_advisor_id ON visits(advisor_id);
CREATE INDEX idx_visits_customer_id ON visits(customer_id);
CREATE INDEX idx_visits_job_code ON visits(advisor_id, job_code);
CREATE INDEX idx_visits_date_time ON visits(advisor_id, date_time);