-- Migration 009: Phase 3 - Provenance fields and raw line_type capture
-- Per plan.yaml: provenance fields (model_version, prompt_version, confidence) added in Phase 3 ONLY
-- BusinessRules.md: commission statement DOR reason is free text (Mismeasure/Wrong Colour/Wrong Order)
-- needed for automatic cause determination in detect-incidents

-- ============================================
-- 1. Documents table - provenance fields
-- ============================================
ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS model_version TEXT,
  ADD COLUMN IF NOT EXISTS prompt_version TEXT,
  ADD COLUMN IF NOT EXISTS confidence NUMERIC(3,2);

-- ============================================
-- 2. Commission line items - raw line_type for DOR cause detection
-- ============================================
ALTER TABLE commission_line_items
  ADD COLUMN IF NOT EXISTS line_type_raw TEXT;  -- e.g. 'Mismeasure', 'Wrong Colour', 'Wrong Order'

CREATE INDEX IF NOT EXISTS idx_commission_line_items_line_type_raw 
  ON commission_line_items(line_type_raw);

-- ============================================
-- 3. Quote line items - provenance fields
-- ============================================
ALTER TABLE quote_line_items
  ADD COLUMN IF NOT EXISTS model_version TEXT,
  ADD COLUMN IF NOT EXISTS prompt_version TEXT,
  ADD COLUMN IF NOT EXISTS confidence NUMERIC(3,2);

-- ============================================
-- 4. Commission line items - provenance fields
-- ============================================
ALTER TABLE commission_line_items
  ADD COLUMN IF NOT EXISTS model_version TEXT,
  ADD COLUMN IF NOT EXISTS prompt_version TEXT,
  ADD COLUMN IF NOT EXISTS confidence NUMERIC(3,2);

-- ============================================
-- 5. Fit line items - provenance fields
-- ============================================
ALTER TABLE fit_line_items
  ADD COLUMN IF NOT EXISTS model_version TEXT,
  ADD COLUMN IF NOT EXISTS prompt_version TEXT,
  ADD COLUMN IF NOT EXISTS confidence NUMERIC(3,2);

-- ============================================
-- 6. Updated at triggers for modified tables
-- ============================================
CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_quote_line_items_updated_at BEFORE UPDATE ON quote_line_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_commission_line_items_updated_at BEFORE UPDATE ON commission_line_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_fit_line_items_updated_at BEFORE UPDATE ON fit_line_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();