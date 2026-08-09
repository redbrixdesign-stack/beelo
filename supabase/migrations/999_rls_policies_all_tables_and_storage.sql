-- Migration: 999_rls_policies_all_tables_and_storage
-- Complete RLS policies for ALL tables + Storage buckets
-- DROP POLICY IF EXISTS + CREATE POLICY pattern
-- Every policy enforces advisor_id = auth.uid() via advisors table

-- ============================================================================
-- STORAGE BUCKETS: CREATE IF NOT EXISTS + RLS POLICIES
-- ============================================================================

-- Create buckets if they don't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('documents', 'documents', false, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
  ('voice-notes', 'voice-notes', false, 5242880, ARRAY['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/ogg']),
  ('avatars', 'avatars', true, 2097152, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- Drop existing storage policies if they exist
DROP POLICY IF EXISTS "documents_upload" ON storage.objects;
DROP POLICY IF EXISTS "documents_download" ON storage.objects;
DROP POLICY IF EXISTS "documents_delete" ON storage.objects;
DROP POLICY IF EXISTS "voice_notes_upload" ON storage.objects;
DROP POLICY IF EXISTS "voice_notes_download" ON storage.objects;
DROP POLICY IF EXISTS "voice_notes_delete" ON storage.objects;
DROP POLICY IF EXISTS "avatars_upload" ON storage.objects;
DROP POLICY IF EXISTS "avatars_download" ON storage.objects;
DROP POLICY IF EXISTS "avatars_delete" ON storage.objects;

-- Storage policies for documents bucket (private, advisor-scoped)
CREATE POLICY "documents_upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'documents' AND
    (auth.uid() IN (SELECT auth_user_id FROM advisors WHERE id = (storage.foldername(name))[1]::uuid))
  );

CREATE POLICY "documents_download" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'documents' AND
    (auth.uid() IN (SELECT auth_user_id FROM advisors WHERE id = (storage.foldername(name))[1]::uuid))
  );

CREATE POLICY "documents_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'documents' AND
    (auth.uid() IN (SELECT auth_user_id FROM advisors WHERE id = (storage.foldername(name))[1]::uuid))
  );

-- Storage policies for voice-notes bucket (private, advisor-scoped)
CREATE POLICY "voice_notes_upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'voice-notes' AND
    (auth.uid() IN (SELECT auth_user_id FROM advisors WHERE id = (storage.foldername(name))[1]::uuid))
  );

CREATE POLICY "voice_notes_download" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'voice-notes' AND
    (auth.uid() IN (SELECT auth_user_id FROM advisors WHERE id = (storage.foldername(name))[1]::uuid))
  );

CREATE POLICY "voice_notes_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'voice-notes' AND
    (auth.uid() IN (SELECT auth_user_id FROM advisors WHERE id = (storage.foldername(name))[1]::uuid))
  );

-- Storage policies for avatars bucket (public read, advisor-scoped write)
CREATE POLICY "avatars_upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'avatars' AND
    (auth.uid() = (storage.foldername(name))[1]::uuid OR auth.uid() IN (SELECT auth_user_id FROM advisors WHERE id = (storage.foldername(name))[1]::uuid))
  );

CREATE POLICY "avatars_download" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'avatars');

CREATE POLICY "avatars_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'avatars' AND
    (auth.uid() = (storage.foldername(name))[1]::uuid OR auth.uid() IN (SELECT auth_user_id FROM advisors WHERE id = (storage.foldername(name))[1]::uuid))
  );

-- ============================================================================
-- TABLE RLS POLICIES
-- ============================================================================

-- advisors
DROP POLICY IF EXISTS "advisor_isolation" ON advisors;
DROP POLICY IF EXISTS "advisor_select" ON advisors;
DROP POLICY IF EXISTS "advisor_insert" ON advisors;
DROP POLICY IF EXISTS "advisor_update" ON advisors;
DROP POLICY IF EXISTS "advisor_delete" ON advisors;

ALTER TABLE advisors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "advisor_select" ON advisors FOR SELECT
    USING (auth_user_id = auth.uid());

CREATE POLICY "advisor_insert" ON advisors FOR INSERT
    WITH CHECK (auth_user_id = auth.uid());

CREATE POLICY "advisor_update" ON advisors FOR UPDATE
    USING (auth_user_id = auth.uid())
    WITH CHECK (auth_user_id = auth.uid());

CREATE POLICY "advisor_delete" ON advisors FOR DELETE
    USING (auth_user_id = auth.uid());

-- customers
DROP POLICY IF EXISTS "customer_isolation" ON customers;
DROP POLICY IF EXISTS "customer_select" ON customers;
DROP POLICY IF EXISTS "customer_insert" ON customers;
DROP POLICY IF EXISTS "customer_update" ON customers;
DROP POLICY IF EXISTS "customer_delete" ON customers;

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "customer_select" ON customers FOR SELECT
    USING (advisor_id IN (SELECT id FROM advisors WHERE auth_user_id = auth.uid()));

CREATE POLICY "customer_insert" ON customers FOR INSERT
    WITH CHECK (advisor_id IN (SELECT id FROM advisors WHERE auth_user_id = auth.uid()));

CREATE POLICY "customer_update" ON customers FOR UPDATE
    USING (advisor_id IN (SELECT id FROM advisors WHERE auth_user_id = auth.uid()))
    WITH CHECK (advisor_id IN (SELECT id FROM advisors WHERE auth_user_id = auth.uid()));

CREATE POLICY "customer_delete" ON customers FOR DELETE
    USING (advisor_id IN (SELECT id FROM advisors WHERE auth_user_id = auth.uid()));

-- visits
DROP POLICY IF EXISTS "visit_isolation" ON visits;
DROP POLICY IF EXISTS "visit_select" ON visits;
DROP POLICY IF EXISTS "visit_insert" ON visits;
DROP POLICY IF EXISTS "visit_update" ON visits;
DROP POLICY IF EXISTS "visit_delete" ON visits;

ALTER TABLE visits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "visit_select" ON visits FOR SELECT
    USING (advisor_id IN (SELECT id FROM advisors WHERE auth_user_id = auth.uid()));

CREATE POLICY "visit_insert" ON visits FOR INSERT
    WITH CHECK (advisor_id IN (SELECT id FROM advisors WHERE auth_user_id = auth.uid()));

CREATE POLICY "visit_update" ON visits FOR UPDATE
    USING (advisor_id IN (SELECT id FROM advisors WHERE auth_user_id = auth.uid()))
    WITH CHECK (advisor_id IN (SELECT id FROM advisors WHERE auth_user_id = auth.uid()));

CREATE POLICY "visit_delete" ON visits FOR DELETE
    USING (advisor_id IN (SELECT id FROM advisors WHERE auth_user_id = auth.uid()));

-- leads
DROP POLICY IF EXISTS "lead_isolation" ON leads;
DROP POLICY IF EXISTS "lead_select" ON leads;
DROP POLICY IF EXISTS "lead_insert" ON leads;
DROP POLICY IF EXISTS "lead_update" ON leads;
DROP POLICY IF EXISTS "lead_delete" ON leads;

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lead_select" ON leads FOR SELECT
    USING (advisor_id IN (SELECT id FROM advisors WHERE auth_user_id = auth.uid()));

CREATE POLICY "lead_insert" ON leads FOR INSERT
    WITH CHECK (advisor_id IN (SELECT id FROM advisors WHERE auth_user_id = auth.uid()));

CREATE POLICY "lead_update" ON leads FOR UPDATE
    USING (advisor_id IN (SELECT id FROM advisors WHERE auth_user_id = auth.uid()))
    WITH CHECK (advisor_id IN (SELECT id FROM advisors WHERE auth_user_id = auth.uid()));

CREATE POLICY "lead_delete" ON leads FOR DELETE
    USING (advisor_id IN (SELECT id FROM advisors WHERE auth_user_id = auth.uid()));

-- call_attempts
DROP POLICY IF EXISTS "call_attempt_isolation" ON call_attempts;
DROP POLICY IF EXISTS "call_attempt_select" ON call_attempts;
DROP POLICY IF EXISTS "call_attempt_insert" ON call_attempts;
DROP POLICY IF EXISTS "call_attempt_update" ON call_attempts;
DROP POLICY IF EXISTS "call_attempt_delete" ON call_attempts;

ALTER TABLE call_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "call_attempt_select" ON call_attempts FOR SELECT
    USING (lead_id IN (SELECT id FROM leads WHERE advisor_id IN (SELECT id FROM advisors WHERE auth_user_id = auth.uid())));

CREATE POLICY "call_attempt_insert" ON call_attempts FOR INSERT
    WITH CHECK (lead_id IN (SELECT id FROM leads WHERE advisor_id IN (SELECT id FROM advisors WHERE auth_user_id = auth.uid())));

CREATE POLICY "call_attempt_update" ON call_attempts FOR UPDATE
    USING (lead_id IN (SELECT id FROM leads WHERE advisor_id IN (SELECT id FROM advisors WHERE auth_user_id = auth.uid())))
    WITH CHECK (lead_id IN (SELECT id FROM leads WHERE advisor_id IN (SELECT id FROM advisors WHERE auth_user_id = auth.uid())));

CREATE POLICY "call_attempt_delete" ON call_attempts FOR DELETE
    USING (lead_id IN (SELECT id FROM leads WHERE advisor_id IN (SELECT id FROM advisors WHERE auth_user_id = auth.uid())));

-- voice_notes
DROP POLICY IF EXISTS "voice_note_isolation" ON voice_notes;
DROP POLICY IF EXISTS "voice_note_select" ON voice_notes;
DROP POLICY IF EXISTS "voice_note_insert" ON voice_notes;
DROP POLICY IF EXISTS "voice_note_update" ON voice_notes;
DROP POLICY IF EXISTS "voice_note_delete" ON voice_notes;

ALTER TABLE voice_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "voice_note_select" ON voice_notes FOR SELECT
    USING (advisor_id IN (SELECT id FROM advisors WHERE auth_user_id = auth.uid()));

CREATE POLICY "voice_note_insert" ON voice_notes FOR INSERT
    WITH CHECK (advisor_id IN (SELECT id FROM advisors WHERE auth_user_id = auth.uid()));

CREATE POLICY "voice_note_update" ON voice_notes FOR UPDATE
    USING (advisor_id IN (SELECT id FROM advisors WHERE auth_user_id = auth.uid()))
    WITH CHECK (advisor_id IN (SELECT id FROM advisors WHERE auth_user_id = auth.uid()));

CREATE POLICY "voice_note_delete" ON voice_notes FOR DELETE
    USING (advisor_id IN (SELECT id FROM advisors WHERE auth_user_id = auth.uid()));

-- documents
DROP POLICY IF EXISTS "document_isolation" ON documents;
DROP POLICY IF EXISTS "document_select" ON documents;
DROP POLICY IF EXISTS "document_insert" ON documents;
DROP POLICY IF EXISTS "document_update" ON documents;
DROP POLICY IF EXISTS "document_delete" ON documents;

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "document_select" ON documents FOR SELECT
    USING (advisor_id IN (SELECT id FROM advisors WHERE auth_user_id = auth.uid()));

CREATE POLICY "document_insert" ON documents FOR INSERT
    WITH CHECK (advisor_id IN (SELECT id FROM advisors WHERE auth_user_id = auth.uid()));

CREATE POLICY "document_update" ON documents FOR UPDATE
    USING (advisor_id IN (SELECT id FROM advisors WHERE auth_user_id = auth.uid()))
    WITH CHECK (advisor_id IN (SELECT id FROM advisors WHERE auth_user_id = auth.uid()));

CREATE POLICY "document_delete" ON documents FOR DELETE
    USING (advisor_id IN (SELECT id FROM advisors WHERE auth_user_id = auth.uid()));

-- fit_line_items
DROP POLICY IF EXISTS "fit_line_item_isolation" ON fit_line_items;
DROP POLICY IF EXISTS "fit_line_item_select" ON fit_line_items;
DROP POLICY IF EXISTS "fit_line_item_insert" ON fit_line_items;
DROP POLICY IF EXISTS "fit_line_item_update" ON fit_line_items;
DROP POLICY IF EXISTS "fit_line_item_delete" ON fit_line_items;

ALTER TABLE fit_line_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fit_line_item_select" ON fit_line_items FOR SELECT
    USING (document_id IN (SELECT id FROM documents WHERE advisor_id IN (SELECT id FROM advisors WHERE auth_user_id = auth.uid())));

CREATE POLICY "fit_line_item_insert" ON fit_line_items FOR INSERT
    WITH CHECK (document_id IN (SELECT id FROM documents WHERE advisor_id IN (SELECT id FROM advisors WHERE auth_user_id = auth.uid())));

CREATE POLICY "fit_line_item_update" ON fit_line_items FOR UPDATE
    USING (document_id IN (SELECT id FROM documents WHERE advisor_id IN (SELECT id FROM advisors WHERE auth_user_id = auth.uid())))
    WITH CHECK (document_id IN (SELECT id FROM documents WHERE advisor_id IN (SELECT id FROM advisors WHERE auth_user_id = auth.uid())));

CREATE POLICY "fit_line_item_delete" ON fit_line_items FOR DELETE
    USING (document_id IN (SELECT id FROM documents WHERE advisor_id IN (SELECT id FROM advisors WHERE auth_user_id = auth.uid())));

-- incidents
DROP POLICY IF EXISTS "incident_isolation" ON incidents;
DROP POLICY IF EXISTS "incident_select" ON incidents;
DROP POLICY IF EXISTS "incident_insert" ON incidents;
DROP POLICY IF EXISTS "incident_update" ON incidents;
DROP POLICY IF EXISTS "incident_delete" ON incidents;

ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "incident_select" ON incidents FOR SELECT
    USING (advisor_id IN (SELECT id FROM advisors WHERE auth_user_id = auth.uid()));

CREATE POLICY "incident_insert" ON incidents FOR INSERT
    WITH CHECK (advisor_id IN (SELECT id FROM advisors WHERE auth_user_id = auth.uid()));

CREATE POLICY "incident_update" ON incidents FOR UPDATE
    USING (advisor_id IN (SELECT id FROM advisors WHERE auth_user_id = auth.uid()))
    WITH CHECK (advisor_id IN (SELECT id FROM advisors WHERE auth_user_id = auth.uid()));

CREATE POLICY "incident_delete" ON incidents FOR DELETE
    USING (advisor_id IN (SELECT id FROM advisors WHERE auth_user_id = auth.uid()));

-- quote_line_items
DROP POLICY IF EXISTS "quote_line_item_isolation" ON quote_line_items;
DROP POLICY IF EXISTS "quote_line_item_select" ON quote_line_items;
DROP POLICY IF EXISTS "quote_line_item_insert" ON quote_line_items;
DROP POLICY IF EXISTS "quote_line_item_update" ON quote_line_items;
DROP POLICY IF EXISTS "quote_line_item_delete" ON quote_line_items;

ALTER TABLE quote_line_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "quote_line_item_select" ON quote_line_items FOR SELECT
    USING (document_id IN (SELECT id FROM documents WHERE advisor_id IN (SELECT id FROM advisors WHERE auth_user_id = auth.uid())));

CREATE POLICY "quote_line_item_insert" ON quote_line_items FOR INSERT
    WITH CHECK (document_id IN (SELECT id FROM documents WHERE advisor_id IN (SELECT id FROM advisors WHERE auth_user_id = auth.uid())));

CREATE POLICY "quote_line_item_update" ON quote_line_items FOR UPDATE
    USING (document_id IN (SELECT id FROM documents WHERE advisor_id IN (SELECT id FROM advisors WHERE auth_user_id = auth.uid())))
    WITH CHECK (document_id IN (SELECT id FROM documents WHERE advisor_id IN (SELECT id FROM advisors WHERE auth_user_id = auth.uid())));

CREATE POLICY "quote_line_item_delete" ON quote_line_items FOR DELETE
    USING (document_id IN (SELECT id FROM documents WHERE advisor_id IN (SELECT id FROM advisors WHERE auth_user_id = auth.uid()));

-- commission_line_items
DROP POLICY IF EXISTS "commission_line_item_isolation" ON commission_line_items;
DROP POLICY IF EXISTS "commission_line_item_select" ON commission_line_items;
DROP POLICY IF EXISTS "commission_line_item_insert" ON commission_line_items;
DROP POLICY IF EXISTS "commission_line_item_update" ON commission_line_items;
DROP POLICY IF EXISTS "commission_line_item_delete" ON commission_line_items;

ALTER TABLE commission_line_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "commission_line_item_select" ON commission_line_items FOR SELECT
    USING (commission_statement_document_id IN (SELECT id FROM documents WHERE advisor_id IN (SELECT id FROM advisors WHERE auth_user_id = auth.uid())));

CREATE POLICY "commission_line_item_insert" ON commission_line_items FOR INSERT
    WITH CHECK (commission_statement_document_id IN (SELECT id FROM documents WHERE advisor_id IN (SELECT id FROM advisors WHERE auth_user_id = auth.uid())));

CREATE POLICY "commission_line_item_update" ON commission_line_items FOR UPDATE
    USING (commission_statement_document_id IN (SELECT id FROM documents WHERE advisor_id IN (SELECT id FROM advisors WHERE auth_user_id = auth.uid())))
    WITH CHECK (commission_statement_document_id IN (SELECT id FROM documents WHERE advisor_id IN (SELECT id FROM advisors WHERE auth_user_id = auth.uid())));

CREATE POLICY "commission_line_item_delete" ON commission_line_items FOR DELETE
    USING (commission_statement_document_id IN (SELECT id FROM documents WHERE advisor_id IN (SELECT id FROM advisors WHERE auth_user_id = auth.uid()));

-- trips
DROP POLICY IF EXISTS "trip_isolation" ON trips;
DROP POLICY IF EXISTS "trip_select" ON trips;
DROP POLICY IF EXISTS "trip_insert" ON trips;
DROP POLICY IF EXISTS "trip_update" ON trips;
DROP POLICY IF EXISTS "trip_delete" ON trips;

ALTER TABLE trips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "trip_select" ON trips FOR SELECT
    USING (advisor_id IN (SELECT id FROM advisors WHERE auth_user_id = auth.uid()));

CREATE POLICY "trip_insert" ON trips FOR INSERT
    WITH CHECK (advisor_id IN (SELECT id FROM advisors WHERE auth_user_id = auth.uid()));

CREATE POLICY "trip_update" ON trips FOR UPDATE
    USING (advisor_id IN (SELECT id FROM advisors WHERE auth_user_id = auth.uid()))
    WITH CHECK (advisor_id IN (SELECT id FROM advisors WHERE auth_user_id = auth.uid()));

CREATE POLICY "trip_delete" ON trips FOR DELETE
    USING (advisor_id IN (SELECT id FROM advisors WHERE auth_user_id = auth.uid()));

-- expenses
DROP POLICY IF EXISTS "expense_isolation" ON expenses;
DROP POLICY IF EXISTS "expense_select" ON expenses;
DROP POLICY IF EXISTS "expense_insert" ON expenses;
DROP POLICY IF EXISTS "expense_update" ON expenses;
DROP POLICY IF EXISTS "expense_delete" ON expenses;

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "expense_select" ON expenses FOR SELECT
    USING (advisor_id IN (SELECT id FROM advisors WHERE auth_user_id = auth.uid()));

CREATE POLICY "expense_insert" ON expenses FOR INSERT
    WITH CHECK (advisor_id IN (SELECT id FROM advisors WHERE auth_user_id = auth.uid()));

CREATE POLICY "expense_update" ON expenses FOR UPDATE
    USING (advisor_id IN (SELECT id FROM advisors WHERE auth_user_id = auth.uid()))
    WITH CHECK (advisor_id IN (SELECT id FROM advisors WHERE auth_user_id = auth.uid()));

CREATE POLICY "expense_delete" ON expenses FOR DELETE
    USING (advisor_id IN (SELECT id FROM advisors WHERE auth_user_id = auth.uid()));

-- message_drafts
DROP POLICY IF EXISTS "message_draft_isolation" ON message_drafts;
DROP POLICY IF EXISTS "message_draft_select" ON message_drafts;
DROP POLICY IF EXISTS "message_draft_insert" ON message_drafts;
DROP POLICY IF EXISTS "message_draft_update" ON message_drafts;
DROP POLICY IF EXISTS "message_draft_delete" ON message_drafts;

ALTER TABLE message_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "message_draft_select" ON message_drafts FOR SELECT
    USING (advisor_id IN (SELECT id FROM advisors WHERE auth_user_id = auth.uid()));

CREATE POLICY "message_draft_insert" ON message_drafts FOR INSERT
    WITH CHECK (advisor_id IN (SELECT id FROM advisors WHERE auth_user_id = auth.uid()));

CREATE POLICY "message_draft_update" ON message_drafts FOR UPDATE
    USING (advisor_id IN (SELECT id FROM advisors WHERE auth_user_id = auth.uid()))
    WITH CHECK (advisor_id IN (SELECT id FROM advisors WHERE auth_user_id = auth.uid()));

CREATE POLICY "message_draft_delete" ON message_drafts FOR DELETE
    USING (advisor_id IN (SELECT id FROM advisors WHERE auth_user_id = auth.uid()));

-- schedule_suggestions
DROP POLICY IF EXISTS "schedule_suggestion_isolation" ON schedule_suggestions;
DROP POLICY IF EXISTS "schedule_suggestion_select" ON schedule_suggestions;
DROP POLICY IF EXISTS "schedule_suggestion_insert" ON schedule_suggestions;
DROP POLICY IF EXISTS "schedule_suggestion_update" ON schedule_suggestions;
DROP POLICY IF EXISTS "schedule_suggestion_delete" ON schedule_suggestions;

ALTER TABLE schedule_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "schedule_suggestion_select" ON schedule_suggestions FOR SELECT
    USING (advisor_id IN (SELECT id FROM advisors WHERE auth_user_id = auth.uid()));

CREATE POLICY "schedule_suggestion_insert" ON schedule_suggestions FOR INSERT
    WITH CHECK (advisor_id IN (SELECT id FROM advisors WHERE auth_user_id = auth.uid()));

CREATE POLICY "schedule_suggestion_update" ON schedule_suggestions FOR UPDATE
    USING (advisor_id IN (SELECT id FROM advisors WHERE auth_user_id = auth.uid()))
    WITH CHECK (advisor_id IN (SELECT id FROM advisors WHERE auth_user_id = auth.uid()));

CREATE POLICY "schedule_suggestion_delete" ON schedule_suggestions FOR DELETE
    USING (advisor_id IN (SELECT id FROM advisors WHERE auth_user_id = auth.uid()));

-- measurement_checks
DROP POLICY IF EXISTS "measurement_check_isolation" ON measurement_checks;
DROP POLICY IF EXISTS "measurement_check_select" ON measurement_checks;
DROP POLICY IF EXISTS "measurement_check_insert" ON measurement_checks;
DROP POLICY IF EXISTS "measurement_check_update" ON measurement_checks;
DROP POLICY IF EXISTS "measurement_check_delete" ON measurement_checks;

ALTER TABLE measurement_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "measurement_check_select" ON measurement_checks FOR SELECT
    USING (advisor_id IN (SELECT id FROM advisors WHERE auth_user_id = auth.uid()));

CREATE POLICY "measurement_check_insert" ON measurement_checks FOR INSERT
    WITH CHECK (advisor_id IN (SELECT id FROM advisors WHERE auth_user_id = auth.uid()));

CREATE POLICY "measurement_check_update" ON measurement_checks FOR UPDATE
    USING (advisor_id IN (SELECT id FROM advisors WHERE auth_user_id = auth.uid()))
    WITH CHECK (advisor_id IN (SELECT id FROM advisors WHERE auth_user_id = auth.uid()));

CREATE POLICY "measurement_check_delete" ON measurement_checks FOR DELETE
    USING (advisor_id IN (SELECT id FROM advisors WHERE auth_user_id = auth.uid()));

-- delivery_drop_notes
DROP POLICY IF EXISTS "delivery_drop_note_isolation" ON delivery_drop_notes;
DROP POLICY IF EXISTS "delivery_drop_note_select" ON delivery_drop_notes;
DROP POLICY IF EXISTS "delivery_drop_note_insert" ON delivery_drop_notes;
DROP POLICY IF EXISTS "delivery_drop_note_update" ON delivery_drop_notes;
DROP POLICY IF EXISTS "delivery_drop_note_delete" ON delivery_drop_notes;

ALTER TABLE delivery_drop_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "delivery_drop_note_select" ON delivery_drop_notes FOR SELECT
    USING (advisor_id IN (SELECT id FROM advisors WHERE auth_user_id = auth.uid()));

CREATE POLICY "delivery_drop_note_insert" ON delivery_drop_notes FOR INSERT
    WITH CHECK (advisor_id IN (SELECT id FROM advisors WHERE auth_user_id = auth.uid()));

CREATE POLICY "delivery_drop_note_update" ON delivery_drop_notes FOR UPDATE
    USING (advisor_id IN (SELECT id FROM advisors WHERE auth_user_id = auth.uid()))
    WITH CHECK (advisor_id IN (SELECT id FROM advisors WHERE auth_user_id = auth.uid()));

CREATE POLICY "delivery_drop_note_delete" ON delivery_drop_notes FOR DELETE
    USING (advisor_id IN (SELECT id FROM advisors WHERE auth_user_id = auth.uid()));

-- settings
DROP POLICY IF EXISTS "settings_isolation" ON settings;
DROP POLICY IF EXISTS "settings_select" ON settings;
DROP POLICY IF EXISTS "settings_insert" ON settings;
DROP POLICY IF EXISTS "settings_update" ON settings;
DROP POLICY IF EXISTS "settings_delete" ON settings;

ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "settings_select" ON settings FOR SELECT
    USING (advisor_id IN (SELECT id FROM advisors WHERE auth_user_id = auth.uid()));

CREATE POLICY "settings_insert" ON settings FOR INSERT
    WITH CHECK (advisor_id IN (SELECT id FROM advisors WHERE auth_user_id = auth.uid()));

CREATE POLICY "settings_update" ON settings FOR UPDATE
    USING (advisor_id IN (SELECT id FROM advisors WHERE auth_user_id = auth.uid()))
    WITH CHECK (advisor_id IN (SELECT id FROM advisors WHERE auth_user_id = auth.uid()));

CREATE POLICY "settings_delete" ON settings FOR DELETE
    USING (advisor_id IN (SELECT id FROM advisors WHERE auth_user_id = auth.uid()));

-- dor_predictions
DROP POLICY IF EXISTS "dor_prediction_isolation" ON dor_predictions;
DROP POLICY IF EXISTS "dor_prediction_select" ON dor_predictions;
DROP POLICY IF EXISTS "dor_prediction_insert" ON dor_predictions;
DROP POLICY IF EXISTS "dor_prediction_update" ON dor_predictions;
DROP POLICY IF EXISTS "dor_prediction_delete" ON dor_predictions;

ALTER TABLE dor_predictions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dor_prediction_select" ON dor_predictions FOR SELECT
    USING (advisor_id IN (SELECT id FROM advisors WHERE auth_user_id = auth.uid()));

CREATE POLICY "dor_prediction_insert" ON dor_predictions FOR INSERT
    WITH CHECK (advisor_id IN (SELECT id FROM advisors WHERE auth_user_id = auth.uid()));

CREATE POLICY "dor_prediction_update" ON dor_predictions FOR UPDATE
    USING (advisor_id IN (SELECT id FROM advisors WHERE auth_user_id = auth.uid()))
    WITH CHECK (advisor_id IN (SELECT id FROM advisors WHERE auth_user_id = auth.uid()));

CREATE POLICY "dor_prediction_delete" ON dor_predictions FOR DELETE
    USING (advisor_id IN (SELECT id FROM advisors WHERE auth_user_id = auth.uid()));

-- onboarding_state
DROP POLICY IF EXISTS "onboarding_state_isolation" ON onboarding_state;
DROP POLICY IF EXISTS "onboarding_state_select" ON onboarding_state;
DROP POLICY IF EXISTS "onboarding_state_insert" ON onboarding_state;
DROP POLICY IF EXISTS "onboarding_state_update" ON onboarding_state;
DROP POLICY IF EXISTS "onboarding_state_delete" ON onboarding_state;

ALTER TABLE onboarding_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "onboarding_state_select" ON onboarding_state FOR SELECT
    USING (advisor_id IN (SELECT id FROM advisors WHERE auth_user_id = auth.uid()));

CREATE POLICY "onboarding_state_insert" ON onboarding_state FOR INSERT
    WITH CHECK (advisor_id IN (SELECT id FROM advisors WHERE auth_user_id = auth.uid()));

CREATE POLICY "onboarding_state_update" ON onboarding_state FOR UPDATE
    USING (advisor_id IN (SELECT id FROM advisors WHERE auth_user_id = auth.uid()))
    WITH CHECK (advisor_id IN (SELECT id FROM advisors WHERE auth_user_id = auth.uid()));

CREATE POLICY "onboarding_state_delete" ON onboarding_state FOR DELETE
    USING (advisor_id IN (SELECT id FROM advisors WHERE auth_user_id = auth.uid()));

-- pilot_metrics
DROP POLICY IF EXISTS "pilot_metrics_isolation" ON pilot_metrics;
DROP POLICY IF EXISTS "pilot_metrics_select" ON pilot_metrics;
DROP POLICY IF EXISTS "pilot_metrics_insert" ON pilot_metrics;
DROP POLICY IF EXISTS "pilot_metrics_update" ON pilot_metrics;
DROP POLICY IF EXISTS "pilot_metrics_delete" ON pilot_metrics;

ALTER TABLE pilot_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pilot_metrics_select" ON pilot_metrics FOR SELECT
    USING (advisor_id IN (SELECT id FROM advisors WHERE auth_user_id = auth.uid()));

CREATE POLICY "pilot_metrics_insert" ON pilot_metrics FOR INSERT
    WITH CHECK (advisor_id IN (SELECT id FROM advisors WHERE auth_user_id = auth.uid()));

CREATE POLICY "pilot_metrics_update" ON pilot_metrics FOR UPDATE
    USING (advisor_id IN (SELECT id FROM advisors WHERE auth_user_id = auth.uid()))
    WITH CHECK (advisor_id IN (SELECT id FROM advisors WHERE auth_user_id = auth.uid()));

CREATE POLICY "pilot_metrics_delete" ON pilot_metrics FOR DELETE
    USING (advisor_id IN (SELECT id FROM advisors WHERE auth_user_id = auth.uid()));

-- delivery_drop_note_line_items
DROP POLICY IF EXISTS "delivery_drop_note_line_item_isolation" ON delivery_drop_note_line_items;
DROP POLICY IF EXISTS "delivery_drop_note_line_item_select" ON delivery_drop_note_line_items;
DROP POLICY IF EXISTS "delivery_drop_note_line_item_insert" ON delivery_drop_note_line_items;
DROP POLICY IF EXISTS "delivery_drop_note_line_item_update" ON delivery_drop_note_line_items;
DROP POLICY IF EXISTS "delivery_drop_note_line_item_delete" ON delivery_drop_note_line_items;

ALTER TABLE delivery_drop_note_line_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "delivery_drop_note_line_item_select" ON delivery_drop_note_line_items FOR SELECT
    USING (delivery_drop_note_id IN (SELECT id FROM delivery_drop_notes WHERE advisor_id IN (SELECT id FROM advisors WHERE auth_user_id = auth.uid())));

CREATE POLICY "delivery_drop_note_line_item_insert" ON delivery_drop_note_line_items FOR INSERT
    WITH CHECK (delivery_drop_note_id IN (SELECT id FROM delivery_drop_notes WHERE advisor_id IN (SELECT id FROM advisors WHERE auth_user_id = auth.uid())));

CREATE POLICY "delivery_drop_note_line_item_update" ON delivery_drop_note_line_items FOR UPDATE
    USING (delivery_drop_note_id IN (SELECT id FROM delivery_drop_notes WHERE advisor_id IN (SELECT id FROM advisors WHERE auth_user_id = auth.uid())))
    WITH CHECK (delivery_drop_note_id IN (SELECT id FROM delivery_drop_notes WHERE advisor_id IN (SELECT id FROM advisors WHERE auth_user_id = auth.uid())));

CREATE POLICY "delivery_drop_note_line_item_delete" ON delivery_drop_note_line_items FOR DELETE
    USING (delivery_drop_note_id IN (SELECT id FROM delivery_drop_notes WHERE advisor_id IN (SELECT id FROM advisors WHERE auth_user_id = auth.uid()));

-- expense_line_items
DROP POLICY IF EXISTS "expense_line_item_isolation" ON expense_line_items;
DROP POLICY IF EXISTS "expense_line_item_select" ON expense_line_items;
DROP POLICY IF EXISTS "expense_line_item_insert" ON expense_line_items;
DROP POLICY IF EXISTS "expense_line_item_update" ON expense_line_items;
DROP POLICY IF EXISTS "expense_line_item_delete" ON expense_line_items;

ALTER TABLE expense_line_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "expense_line_item_select" ON expense_line_items FOR SELECT
    USING (expense_id IN (SELECT id FROM expenses WHERE advisor_id IN (SELECT id FROM advisors WHERE auth_user_id = auth.uid())));

CREATE POLICY "expense_line_item_insert" ON expense_line_items FOR INSERT
    WITH CHECK (expense_id IN (SELECT id FROM expenses WHERE advisor_id IN (SELECT id FROM advisors WHERE auth_user_id = auth.uid())));

CREATE POLICY "expense_line_item_update" ON expense_line_items FOR UPDATE
    USING (expense_id IN (SELECT id FROM expenses WHERE advisor_id IN (SELECT id FROM advisors WHERE auth_user_id = auth.uid())))
    WITH CHECK (expense_id IN (SELECT id FROM expenses WHERE advisor_id IN (SELECT id FROM advisors WHERE auth_user_id = auth.uid())));

CREATE POLICY "expense_line_item_delete" ON expense_line_items FOR DELETE
    USING (expense_id IN (SELECT id FROM expenses WHERE advisor_id IN (SELECT id FROM advisors WHERE auth_user_id = auth.uid()));

-- ============================================================================
-- VERIFICATION QUERY
-- ============================================================================

-- Run this after applying to verify all policies exist:
-- SELECT policyname, schemaname, tablename, cmd, qual, with_check
-- FROM pg_policies
-- WHERE schemaname IN ('public', 'storage')
-- ORDER BY schemaname, tablename, policyname;