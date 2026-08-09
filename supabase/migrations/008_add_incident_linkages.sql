-- Migration 008: Add fit_line_item_id to incidents table
-- Links provisional incidents from fit_completion_receipt to the triggering fit_line_item
-- Also adds FK constraint on commission_line_item_id for referential integrity

ALTER TABLE incidents
  ADD COLUMN IF NOT EXISTS fit_line_item_id UUID REFERENCES fit_line_items(id) ON DELETE SET NULL;

-- Add FK constraint on commission_line_item_id (was bare UUID)
ALTER TABLE incidents
  DROP CONSTRAINT IF EXISTS incidents_commission_line_item_id_fkey,
  ADD CONSTRAINT incidents_commission_line_item_id_fkey
    FOREIGN KEY (commission_line_item_id) REFERENCES commission_line_items(id) ON DELETE SET NULL;

-- Index for the new column
CREATE INDEX IF NOT EXISTS idx_incidents_fit_line_item_id ON incidents(fit_line_item_id);