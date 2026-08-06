-- Migration 003: Create customers table
-- Customer records with company-issued customer_number, RLS from line 1

CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    advisor_id UUID NOT NULL REFERENCES advisors(id) ON DELETE CASCADE,
    customer_number TEXT NOT NULL,
    phone TEXT,
    postcode TEXT,
    address TEXT,
    display_name TEXT,
    contact_preferences JSONB DEFAULT '{}',
    history JSONB DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived', 'blocked')),
    source_env TEXT NOT NULL DEFAULT 'live' CHECK (source_env IN ('demo', 'qa', 'live')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (advisor_id, customer_number)
);

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "customer_isolation" ON customers 
    FOR ALL USING (advisor_id IN (SELECT id FROM advisors WHERE auth_user_id = auth.uid()));

CREATE INDEX idx_customers_advisor_id ON customers(advisor_id);
CREATE INDEX idx_customers_customer_number ON customers(advisor_id, customer_number);