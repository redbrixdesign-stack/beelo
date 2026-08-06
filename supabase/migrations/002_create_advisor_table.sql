-- Migration 002: Create advisors table
-- Core advisor profile with HMRC mileage config, RLS from line 1

CREATE TABLE advisors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    business_name TEXT NOT NULL,
    employment_model TEXT NOT NULL CHECK (employment_model IN ('company_advisor', 'independent')),
    base_location TEXT,
    working_preferences JSONB DEFAULT '{}',
    commission_rate_percent NUMERIC(5,2) NOT NULL DEFAULT 15.25,
    vat_adjustment_percent NUMERIC(5,2) NOT NULL DEFAULT 20.00,
    tax_reserve_percent NUMERIC(5,2) NOT NULL DEFAULT 25.00,
    install_only_minutes_per_blind INTEGER NOT NULL DEFAULT 16,
    full_job_minutes_per_blind INTEGER NOT NULL DEFAULT 33,
    weekly_earnings_target NUMERIC(12,2),
    hmrc_mileage_rate_tier1 NUMERIC(5,2) NOT NULL DEFAULT 0.55,
    hmrc_mileage_rate_tier2 NUMERIC(5,2) NOT NULL DEFAULT 0.25,
    hmrc_mileage_threshold_miles INTEGER NOT NULL DEFAULT 10000,
    consent_status TEXT NOT NULL DEFAULT 'pending' CHECK (consent_status IN ('pending', 'granted', 'revoked')),
    source_env TEXT NOT NULL DEFAULT 'live' CHECK (source_env IN ('demo', 'qa', 'live')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE advisors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "advisor_isolation" ON advisors 
    FOR ALL USING (auth_user_id = auth.uid());

CREATE INDEX idx_advisors_auth_user_id ON advisors(auth_user_id);