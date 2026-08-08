-- Beelo Initial Schema
-- Generated from src/lib/dexie.ts

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Advisors table
CREATE TABLE advisors (
  id BIGSERIAL PRIMARY KEY,
  auth_user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_name TEXT NOT NULL,
  employment_model TEXT NOT NULL CHECK (employment_model IN ('company_advisor', 'independent')),
  base_location TEXT,
  working_preferences JSONB DEFAULT '{}',
  commission_rate_percent NUMERIC(5,2) DEFAULT 15.25,
  vat_adjustment_percent NUMERIC(5,2) DEFAULT 20.00,
  tax_reserve_percent NUMERIC(5,2) DEFAULT 20.00,
  install_only_minutes_per_blind INTEGER DEFAULT 17,
  full_job_minutes_per_blind INTEGER DEFAULT 33,
  weekly_earnings_target NUMERIC(10,2),
  hmrc_mileage_rate_tier1 NUMERIC(5,2) DEFAULT 55.00,
  hmrc_mileage_rate_tier2 NUMERIC(5,2) DEFAULT 25.00,
  hmrc_mileage_threshold_miles INTEGER DEFAULT 10000,
  consent_status TEXT DEFAULT 'pending' CHECK (consent_status IN ('pending', 'granted', 'revoked')),
  source_env TEXT DEFAULT 'live' CHECK (source_env IN ('demo', 'qa', 'live')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_advisors_auth_user_id ON advisors(auth_user_id);
CREATE INDEX idx_advisors_source_env ON advisors(source_env);

-- Customers table
CREATE TABLE customers (
  id BIGSERIAL PRIMARY KEY,
  advisor_id BIGINT NOT NULL REFERENCES advisors(id) ON DELETE CASCADE,
  customer_number TEXT NOT NULL,
  phone TEXT,
  postcode TEXT,
  address TEXT,
  display_name TEXT,
  contact_preferences JSONB DEFAULT '{}',
  history JSONB DEFAULT '{}',
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived', 'blocked')),
  source_env TEXT DEFAULT 'live' CHECK (source_env IN ('demo', 'qa', 'live')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (advisor_id, customer_number)
);

CREATE INDEX idx_customers_advisor_id ON customers(advisor_id);
CREATE INDEX idx_customers_source_env ON customers(source_env);

-- Visits table
CREATE TABLE visits (
  id BIGSERIAL PRIMARY KEY,
  advisor_id BIGINT NOT NULL REFERENCES advisors(id) ON DELETE CASCADE,
  customer_id BIGINT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  customer_number TEXT NOT NULL,
  appointment_number TEXT,
  job_code TEXT NOT NULL,
  order_number TEXT,
  appointment_type TEXT NOT NULL CHECK (appointment_type IN ('sales', 'survey', 'fit', 'service_call')),
  job_source TEXT NOT NULL CHECK (job_source IN ('self_sold', 'company_assigned')),
  date_time TIMESTAMPTZ NOT NULL,
  time_slot_start TIMESTAMPTZ,
  time_slot_end TIMESTAMPTZ,
  status TEXT,
  contacted_customer BOOLEAN DEFAULT FALSE,
  blind_count INTEGER,
  pre_visit_notes TEXT,
  company_scheduled_duration_minutes INTEGER,
  estimated_duration_minutes INTEGER,
  location TEXT,
  address TEXT,
  source_document_id BIGINT,
  source_env TEXT DEFAULT 'live' CHECK (source_env IN ('demo', 'qa', 'live')),
  outcome TEXT,
  outcome_value NUMERIC,
  discount_percent NUMERIC(5,2),
  commission_amount NUMERIC(10,2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_visits_advisor_id ON visits(advisor_id);
CREATE INDEX idx_visits_job_code ON visits(advisor_id, job_code);
CREATE INDEX idx_visits_date_time ON visits(advisor_id, date_time);
CREATE INDEX idx_visits_source_env ON visits(source_env);

-- Leads table
CREATE TABLE leads (
  id BIGSERIAL PRIMARY KEY,
  advisor_id BIGINT NOT NULL REFERENCES advisors(id) ON DELETE CASCADE,
  name TEXT,
  phone TEXT,
  landed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'call_attempted', 'connected', 'no_response', 'follow_up_due', 'converted_to_visit', 'lost')),
  contact_attempts_count INTEGER DEFAULT 0,
  source TEXT,
  source_env TEXT DEFAULT 'live' CHECK (source_env IN ('demo', 'qa', 'live')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_leads_advisor_id ON leads(advisor_id);
CREATE INDEX idx_leads_source_env ON leads(source_env);

-- Call Attempts table
CREATE TABLE call_attempts (
  id BIGSERIAL PRIMARY KEY,
  lead_id BIGINT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  initiated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  outcome TEXT NOT NULL CHECK (outcome IN ('connected', 'no_answer', 'voicemail')),
  voice_note_id BIGINT,
  source_env TEXT DEFAULT 'live' CHECK (source_env IN ('demo', 'qa', 'live')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_call_attempts_lead_id ON call_attempts(lead_id);
CREATE INDEX idx_call_attempts_source_env ON call_attempts(source_env);

-- Voice Notes table
CREATE TABLE voice_notes (
  id BIGSERIAL PRIMARY KEY,
  advisor_id BIGINT NOT NULL REFERENCES advisors(id) ON DELETE CASCADE,
  audio_path TEXT,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  duration_seconds INTEGER,
  trigger_method TEXT NOT NULL CHECK (trigger_method IN ('manual_button', 'siri_shortcut', 'assistant_action')),
  status TEXT DEFAULT 'recorded' CHECK (status IN ('recorded', 'transcribed', 'unmatched', 'matched', 'reviewed', 'error')),
  transcript TEXT,
  extracted_blind_count INTEGER,
  extracted_parking_notes TEXT,
  extracted_access_notes TEXT,
  extracted_name_spoken TEXT,
  linked_appointment_screenshot_document_id BIGINT,
  matched_visit_id BIGINT,
  matched_customer_id BIGINT,
  match_method TEXT CHECK (match_method IN ('screenshot_proximity', 'manual_review', 'name_hint')),
  lead_id BIGINT,
  source_env TEXT DEFAULT 'live' CHECK (source_env IN ('demo', 'qa', 'live')),
  model_version TEXT,
  prompt_version TEXT,
  confidence NUMERIC(3,2),
  extracted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_voice_notes_advisor_id ON voice_notes(advisor_id);
CREATE INDEX idx_voice_notes_status ON voice_notes(advisor_id, status);
CREATE INDEX idx_voice_notes_source_env ON voice_notes(source_env);

-- Documents table
CREATE TABLE documents (
  id BIGSERIAL PRIMARY KEY,
  advisor_id BIGINT NOT NULL REFERENCES advisors(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('appointment_card', 'quote_or_receipt', 'fit_completion_receipt', 'delivery_drop_note', 'commission_statement', 'expense_receipt', 'dor_receipt')),
  subtype TEXT,
  image_path TEXT,
  parsed_json JSONB,
  status TEXT DEFAULT 'uploaded' CHECK (status IN ('uploaded', 'processing', 'parsed', 'matched', 'error')),
  match_status TEXT DEFAULT 'unmatched' CHECK (match_status IN ('unmatched', 'matched', 'partial', 'failed')),
  source_env TEXT DEFAULT 'live' CHECK (source_env IN ('demo', 'qa', 'live')),
  additional_notes TEXT,
  model_version TEXT,
  prompt_version TEXT,
  confidence NUMERIC(3,2),
  extracted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_documents_advisor_id_type ON documents(advisor_id, type);
CREATE INDEX idx_documents_advisor_id_status ON documents(advisor_id, status);
CREATE INDEX idx_documents_advisor_id ON documents(advisor_id);

-- Fit Line Items table
CREATE TABLE fit_line_items (
  id BIGSERIAL PRIMARY KEY,
  document_id BIGINT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  job_code TEXT NOT NULL,
  line_number INTEGER NOT NULL,
  room TEXT,
  position TEXT,
  fit_status TEXT NOT NULL CHECK (fit_status IN ('fitted', 'replacement')),
  refit_date TIMESTAMPTZ,
  source_env TEXT DEFAULT 'live' CHECK (source_env IN ('demo', 'qa', 'live')),
  model_version TEXT,
  prompt_version TEXT,
  confidence NUMERIC(3,2),
  extracted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_fit_line_items_document_id ON fit_line_items(document_id);
CREATE INDEX idx_fit_line_items_job_code ON fit_line_items(job_code);

-- Incidents table
CREATE TABLE incidents (
  id BIGSERIAL PRIMARY KEY,
  advisor_id BIGINT NOT NULL REFERENCES advisors(id) ON DELETE CASCADE,
  visit_id BIGINT NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
  customer_id BIGINT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('mismeasurement', 'wrong_colour', 'wrong_product', 'installation_damage', 'window_breakage', 'logistics_damage', 'theft', 'warranty_malfunction', 'other')),
  cause TEXT NOT NULL CHECK (cause IN ('fitter_error', 'customer_error', 'supplier_error', 'logistics_error', 'theft', 'product_defect', 'accidental', 'unknown')),
  cause_detail TEXT,
  counts_toward_dor BOOLEAN DEFAULT FALSE,
  discovered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  description TEXT,
  resolution_status TEXT DEFAULT 'open' CHECK (resolution_status IN ('open', 'in_progress', 'resolved', 'disputed', 'closed')),
  photos TEXT[] DEFAULT '{}',
  notes TEXT,
  commission_line_item_id BIGINT,
  logistics_leg TEXT CHECK (logistics_leg IN ('hillarys_to_advisor', 'advisor_to_customer')),
  original_fit_visit_id BIGINT REFERENCES visits(id),
  within_warranty_period BOOLEAN,
  service_call_outcome TEXT CHECK (service_call_outcome IN ('repaired_on_site', 'dor_raised_unrepairable', 'escalated')),
  dor_rate_at_time_percent NUMERIC(5,2),
  penalty_tier TEXT CHECK (penalty_tier IN ('standard', 'elevated')),
  blinds_affected_count INTEGER,
  penalty_amount NUMERIC(10,2),
  sale_value_lost NUMERIC(10,2),
  client_agreed_to_remake BOOLEAN,
  remake_material_cost NUMERIC(10,2),
  remake_labour_absorbed NUMERIC(10,2),
  source_env TEXT DEFAULT 'live' CHECK (source_env IN ('demo', 'qa', 'live')),
  model_version TEXT,
  prompt_version TEXT,
  confidence NUMERIC(3,2),
  source_document_id BIGINT,
  fit_line_item_id BIGINT REFERENCES fit_line_items(id),
  detected_at TIMESTAMPTZ,
  cross_check_status TEXT CHECK (cross_check_status IN ('pending', 'verified', 'disputed')),
  commission_rate_expected NUMERIC(5,2),
  commission_rate_actual NUMERIC(5,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_incidents_advisor_id ON incidents(advisor_id);
CREATE INDEX idx_incidents_visit_id ON incidents(visit_id);
CREATE INDEX idx_incidents_source_env ON incidents(source_env);

-- Quote Line Items table
CREATE TABLE quote_line_items (
  id BIGSERIAL PRIMARY KEY,
  document_id BIGINT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  room TEXT,
  position TEXT,
  description TEXT,
  range TEXT,
  colour TEXT,
  width_mm INTEGER,
  quantity INTEGER NOT NULL,
  unit_price NUMERIC(10,2),
  line_total NUMERIC(10,2),
  source_env TEXT DEFAULT 'live' CHECK (source_env IN ('demo', 'qa', 'live')),
  model_version TEXT,
  prompt_version TEXT,
  confidence NUMERIC(3,2),
  extracted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_quote_line_items_document_id ON quote_line_items(document_id);
CREATE INDEX idx_quote_line_items_job_code ON quote_line_items(document_id); -- job_code in parsed_json

-- Commission Line Items table
CREATE TABLE commission_line_items (
  id BIGSERIAL PRIMARY KEY,
  commission_statement_document_id BIGINT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  line_date TIMESTAMPTZ,
  invoice_number TEXT,
  job_code TEXT NOT NULL,
  customer_number TEXT,
  customer_name TEXT,
  line_type TEXT CHECK (line_type IN ('sale', 'service', 'dor_penalty', 'refit', 'adjustment')),
  commission_rate_percent NUMERIC(5,2),
  order_value_inc_vat NUMERIC(10,2),
  order_value_exc_vat NUMERIC(10,2),
  amount_inc_vat NUMERIC(10,2),
  amount_exc_vat NUMERIC(10,2),
  source_env TEXT DEFAULT 'live' CHECK (source_env IN ('demo', 'qa', 'live')),
  model_version TEXT,
  prompt_version TEXT,
  confidence NUMERIC(3,2),
  extracted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_commission_line_items_document_id ON commission_line_items(commission_statement_document_id);
CREATE INDEX idx_commission_line_items_job_code ON commission_line_items(job_code);

-- Trips table
CREATE TABLE trips (
  id BIGSERIAL PRIMARY KEY,
  advisor_id BIGINT NOT NULL REFERENCES advisors(id) ON DELETE CASCADE,
  visit_id BIGINT REFERENCES visits(id),
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  distance_miles NUMERIC(8,2),
  path_points JSONB,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
  source_env TEXT DEFAULT 'live' CHECK (source_env IN ('demo', 'qa', 'live')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_trips_advisor_id ON trips(advisor_id);
CREATE INDEX idx_trips_visit_id ON trips(visit_id);

-- Expenses table
CREATE TABLE expenses (
  id BIGSERIAL PRIMARY KEY,
  advisor_id BIGINT NOT NULL REFERENCES advisors(id) ON DELETE CASCADE,
  merchant TEXT,
  date TIMESTAMPTZ NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  vat_amount NUMERIC(10,2),
  category TEXT CHECK (category IN ('fuel', 'parking', 'materials', 'tools', 'subsistence', 'accommodation', 'training', 'insurance', 'phone', 'software', 'other')),
  photo_path TEXT,
  source_document_id BIGINT REFERENCES documents(id),
  source_env TEXT DEFAULT 'live' CHECK (source_env IN ('demo', 'qa', 'live')),
  model_version TEXT,
  prompt_version TEXT,
  confidence NUMERIC(3,2),
  extracted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_expenses_advisor_id_date ON expenses(advisor_id, date);
CREATE INDEX idx_expenses_advisor_id ON expenses(advisor_id);

-- Delivery Drop Notes table
CREATE TABLE delivery_drop_notes (
  id BIGSERIAL PRIMARY KEY,
  advisor_id BIGINT NOT NULL REFERENCES advisors(id) ON DELETE CASCADE,
  document_id BIGINT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  job_code TEXT NOT NULL,
  customer_number TEXT NOT NULL,
  delivery_date TIMESTAMPTZ NOT NULL,
  items JSONB NOT NULL DEFAULT '[]',
  fan_out_targets TEXT[] DEFAULT '{}',
  source_env TEXT DEFAULT 'live' CHECK (source_env IN ('demo', 'qa', 'live')),
  model_version TEXT,
  prompt_version TEXT,
  confidence NUMERIC(3,2),
  extracted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_delivery_drop_notes_advisor_id ON delivery_drop_notes(advisor_id);
CREATE INDEX idx_delivery_drop_notes_delivery_date ON delivery_drop_notes(advisor_id, delivery_date);

-- Settings table
CREATE TABLE settings (
  id BIGSERIAL PRIMARY KEY,
  advisor_id BIGINT NOT NULL REFERENCES advisors(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  source_env TEXT DEFAULT 'live' CHECK (source_env IN ('demo', 'qa', 'live')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (advisor_id, key)
);

CREATE INDEX idx_settings_advisor_id ON settings(advisor_id);

-- DOR Predictions table
CREATE TABLE dor_predictions (
  id BIGSERIAL PRIMARY KEY,
  advisor_id BIGINT NOT NULL REFERENCES advisors(id) ON DELETE CASCADE,
  week_start TIMESTAMPTZ NOT NULL,
  week_end TIMESTAMPTZ NOT NULL,
  predicted_dor_rate NUMERIC(5,2),
  current_dor_rate NUMERIC(5,2),
  blinds_at_risk INTEGER,
  estimated_penalty NUMERIC(10,2),
  confidence NUMERIC(3,2),
  model_version TEXT,
  prompt_version TEXT,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  source_env TEXT DEFAULT 'live' CHECK (source_env IN ('demo', 'qa', 'live')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_dor_predictions_advisor_id ON dor_predictions(advisor_id);
CREATE INDEX idx_dor_predictions_week_start ON dor_predictions(advisor_id, week_start);

-- Onboarding State table
CREATE TABLE onboarding_state (
  id BIGSERIAL PRIMARY KEY,
  advisor_id BIGINT NOT NULL REFERENCES advisors(id) ON DELETE CASCADE,
  current_step INTEGER DEFAULT 0,
  completed_steps INTEGER[] DEFAULT '{}',
  skipped_steps INTEGER[] DEFAULT '{}',
  source_env TEXT DEFAULT 'live' CHECK (source_env IN ('demo', 'qa', 'live')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_onboarding_state_advisor_id ON onboarding_state(advisor_id);

-- Pilot Metrics table
CREATE TABLE pilot_metrics (
  id BIGSERIAL PRIMARY KEY,
  advisor_id BIGINT NOT NULL REFERENCES advisors(id) ON DELETE CASCADE,
  date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metric_name TEXT NOT NULL,
  metric_value NUMERIC NOT NULL,
  metadata JSONB,
  source_env TEXT DEFAULT 'live' CHECK (source_env IN ('demo', 'qa', 'live')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_pilot_metrics_advisor_id_date ON pilot_metrics(advisor_id, date);
CREATE INDEX idx_pilot_metrics_advisor_id ON pilot_metrics(advisor_id);

-- Message Drafts table
CREATE TABLE message_drafts (
  id BIGSERIAL PRIMARY KEY,
  advisor_id BIGINT NOT NULL REFERENCES advisors(id) ON DELETE CASCADE,
  related_type TEXT NOT NULL,
  related_id BIGINT NOT NULL,
  draft_text TEXT NOT NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'discarded')),
  source_env TEXT DEFAULT 'live' CHECK (source_env IN ('demo', 'qa', 'live')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_message_drafts_advisor_id ON message_drafts(advisor_id);

-- Schedule Suggestions table
CREATE TABLE schedule_suggestions (
  id BIGSERIAL PRIMARY KEY,
  advisor_id BIGINT NOT NULL REFERENCES advisors(id) ON DELETE CASCADE,
  date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  suggestion_text TEXT NOT NULL,
  affected_visit_ids BIGINT[] DEFAULT '{}',
  estimated_saving_miles NUMERIC,
  estimated_saving_minutes NUMERIC,
  schedule_risk_flag BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'dismissed')),
  source_env TEXT DEFAULT 'live' CHECK (source_env IN ('demo', 'qa', 'live')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_schedule_suggestions_advisor_id_date ON schedule_suggestions(advisor_id, date);
CREATE INDEX idx_schedule_suggestions_advisor_id ON schedule_suggestions(advisor_id);

-- Measurement Checks table
CREATE TABLE measurement_checks (
  id BIGSERIAL PRIMARY KEY,
  advisor_id BIGINT NOT NULL REFERENCES advisors(id) ON DELETE CASCADE,
  visit_id BIGINT NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
  window_id TEXT,
  blind_type TEXT,
  fit_method TEXT CHECK (fit_method IN ('recess', 'exact')),
  width_top_cm NUMERIC(8,2),
  width_middle_cm NUMERIC(8,2),
  width_bottom_cm NUMERIC(8,2),
  working_width_cm NUMERIC(8,2),
  drop_left_cm NUMERIC(8,2),
  drop_middle_cm NUMERIC(8,2),
  drop_right_cm NUMERIC(8,2),
  working_drop_cm NUMERIC(8,2),
  diagonal_tl_br_cm NUMERIC(8,2),
  diagonal_tr_bl_cm NUMERIC(8,2),
  diagonal_diff_cm NUMERIC(8,2),
  tolerance_cm NUMERIC(4,2) DEFAULT 1.0,
  is_square BOOLEAN,
  passes_tolerance BOOLEAN,
  notes TEXT,
  photos TEXT[] DEFAULT '{}',
  source_env TEXT DEFAULT 'live' CHECK (source_env IN ('demo', 'qa', 'live')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_measurement_checks_advisor_id ON measurement_checks(advisor_id);
CREATE INDEX idx_measurement_checks_visit_id ON measurement_checks(visit_id);

-- Sync Queue table
CREATE TABLE sync_queue (
  id BIGSERIAL PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id BIGINT NOT NULL,
  operation TEXT NOT NULL CHECK (operation IN ('create', 'update', 'delete')),
  payload JSONB NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'syncing', 'synced', 'failed')),
  retry_count INTEGER DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sync_queue_entity ON sync_queue(entity_type, entity_id);
CREATE INDEX idx_sync_queue_status ON sync_queue(status);

-- RLS Policies
ALTER TABLE advisors ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE fit_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE commission_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_drop_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE dor_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE pilot_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE measurement_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_queue ENABLE ROW LEVEL SECURITY;

-- RLS Policies: advisor_id = auth.uid()
CREATE POLICY "Advisors can only access their own data" ON advisors
  USING (auth_user_id = auth.uid());

CREATE POLICY "Customers: advisor isolation" ON customers
  USING (advisor_id = (SELECT id FROM advisors WHERE auth_user_id = auth.uid()));

CREATE POLICY "Visits: advisor isolation" ON visits
  USING (advisor_id = (SELECT id FROM advisors WHERE auth_user_id = auth.uid()));

CREATE POLICY "Leads: advisor isolation" ON leads
  USING (advisor_id = (SELECT id FROM advisors WHERE auth_user_id = auth.uid()));

CREATE POLICY "Call attempts: advisor isolation" ON call_attempts
  USING (lead_id IN (SELECT id FROM leads WHERE advisor_id = (SELECT id FROM advisors WHERE auth_user_id = auth.uid())));

CREATE POLICY "Voice notes: advisor isolation" ON voice_notes
  USING (advisor_id = (SELECT id FROM advisors WHERE auth_user_id = auth.uid()));

CREATE POLICY "Documents: advisor isolation" ON documents
  USING (advisor_id = (SELECT id FROM advisors WHERE auth_user_id = auth.uid()));

CREATE POLICY "Fit line items: advisor isolation" ON fit_line_items
  USING (document_id IN (SELECT id FROM documents WHERE advisor_id = (SELECT id FROM advisors WHERE auth_user_id = auth.uid())));

CREATE POLICY "Incidents: advisor isolation" ON incidents
  USING (advisor_id = (SELECT id FROM advisors WHERE auth_user_id = auth.uid()));

CREATE POLICY "Quote line items: advisor isolation" ON quote_line_items
  USING (document_id IN (SELECT id FROM documents WHERE advisor_id = (SELECT id FROM advisors WHERE auth_user_id = auth.uid())));

CREATE POLICY "Commission line items: advisor isolation" ON commission_line_items
  USING (commission_statement_document_id IN (SELECT id FROM documents WHERE advisor_id = (SELECT id FROM advisors WHERE auth_user_id = auth.uid())));

CREATE POLICY "Trips: advisor isolation" ON trips
  USING (advisor_id = (SELECT id FROM advisors WHERE auth_user_id = auth.uid()));

CREATE POLICY "Expenses: advisor isolation" ON expenses
  USING (advisor_id = (SELECT id FROM advisors WHERE auth_user_id = auth.uid()));

CREATE POLICY "Delivery drop notes: advisor isolation" ON delivery_drop_notes
  USING (advisor_id = (SELECT id FROM advisors WHERE auth_user_id = auth.uid()));

CREATE POLICY "Settings: advisor isolation" ON settings
  USING (advisor_id = (SELECT id FROM advisors WHERE auth_user_id = auth.uid()));

CREATE POLICY "DOR predictions: advisor isolation" ON dor_predictions
  USING (advisor_id = (SELECT id FROM advisors WHERE auth_user_id = auth.uid()));

CREATE POLICY "Onboarding state: advisor isolation" ON onboarding_state
  USING (advisor_id = (SELECT id FROM advisors WHERE auth_user_id = auth.uid()));

CREATE POLICY "Pilot metrics: advisor isolation" ON pilot_metrics
  USING (advisor_id = (SELECT id FROM advisors WHERE auth_user_id = auth.uid()));

CREATE POLICY "Message drafts: advisor isolation" ON message_drafts
  USING (advisor_id = (SELECT id FROM advisors WHERE auth_user_id = auth.uid()));

CREATE POLICY "Schedule suggestions: advisor isolation" ON schedule_suggestions
  USING (advisor_id = (SELECT id FROM advisors WHERE auth_user_id = auth.uid()));

CREATE POLICY "Measurement checks: advisor isolation" ON measurement_checks
  USING (advisor_id = (SELECT id FROM advisors WHERE auth_user_id = auth.uid()));

CREATE POLICY "Sync queue: advisor isolation" ON sync_queue
  USING (entity_id IN (SELECT id FROM advisors WHERE auth_user_id = auth.uid())); -- simplified

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_advisors_updated_at BEFORE UPDATE ON advisors FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_visits_updated_at BEFORE UPDATE ON visits FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON leads FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_call_attempts_updated_at BEFORE UPDATE ON call_attempts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_voice_notes_updated_at BEFORE UPDATE ON voice_notes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_fit_line_items_updated_at BEFORE UPDATE ON fit_line_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_incidents_updated_at BEFORE UPDATE ON incidents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_quote_line_items_updated_at BEFORE UPDATE ON quote_line_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_commission_line_items_updated_at BEFORE UPDATE ON commission_line_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_trips_updated_at BEFORE UPDATE ON trips FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON expenses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_dor_predictions_updated_at BEFORE UPDATE ON dor_predictions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_onboarding_state_updated_at BEFORE UPDATE ON onboarding_state FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_pilot_metrics_updated_at BEFORE UPDATE ON pilot_metrics FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_message_drafts_updated_at BEFORE UPDATE ON message_drafts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_schedule_suggestions_updated_at BEFORE UPDATE ON schedule_suggestions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_measurement_checks_updated_at BEFORE UPDATE ON measurement_checks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_delivery_drop_notes_updated_at ON delivery_drop_notes;
CREATE TRIGGER update_delivery_drop_notes_updated_at BEFORE UPDATE ON delivery_drop_notes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();