-- Migration 010: Add line item tables for delivery drop notes and expenses
-- These were previously TODOs in useOCR.ts - now implementing structured persistence

-- ============================================
-- Delivery Drop Note Line Items (Phase 3)
-- ============================================
CREATE TABLE delivery_drop_note_line_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    delivery_drop_note_id UUID NOT NULL REFERENCES delivery_drop_notes(id) ON DELETE CASCADE,
    line_number INTEGER NOT NULL,
    description TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'delivered' CHECK (status IN ('delivered', 'pending', 'damaged', 'returned')),
    source_env TEXT NOT NULL DEFAULT 'live' CHECK (source_env IN ('demo', 'qa', 'live')),
    model_version TEXT,
    prompt_version TEXT,
    confidence NUMERIC(3,2),
    extracted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE delivery_drop_note_line_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "delivery_drop_note_line_item_isolation" ON delivery_drop_note_line_items FOR ALL
    USING (delivery_drop_note_id IN (SELECT id FROM delivery_drop_notes WHERE advisor_id IN (SELECT id FROM advisors WHERE auth_user_id = auth.uid())));
CREATE INDEX idx_delivery_drop_note_line_items_delivery_drop_note_id ON delivery_drop_note_line_items(delivery_drop_note_id);

-- ============================================
-- Expense Line Items (Phase 5)
-- ============================================
CREATE TABLE expense_line_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    expense_id UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    amount NUMERIC(12,2) NOT NULL,
    vat_amount NUMERIC(12,2),
    source_env TEXT NOT NULL DEFAULT 'live' CHECK (source_env IN ('demo', 'qa', 'live')),
    model_version TEXT,
    prompt_version TEXT,
    confidence NUMERIC(3,2),
    extracted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE expense_line_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "expense_line_item_isolation" ON expense_line_items FOR ALL
    USING (expense_id IN (SELECT id FROM expenses WHERE advisor_id IN (SELECT id FROM advisors WHERE auth_user_id = auth.uid())));
CREATE INDEX idx_expense_line_items_expense_id ON expense_line_items(expense_id);

-- ============================================
-- Updated at triggers for new tables
-- ============================================
CREATE TRIGGER update_delivery_drop_note_line_items_updated_at BEFORE UPDATE ON delivery_drop_note_line_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_expense_line_items_updated_at BEFORE UPDATE ON expense_line_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();