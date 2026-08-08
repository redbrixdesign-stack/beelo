// Document types for Phase 3 - OCR extraction and incidents

export interface Document {
  id: string
  advisor_id: string
  type: 'appointment_card' | 'quote_or_receipt' | 'fit_completion_receipt' | 'delivery_drop_note' | 'commission_statement' | 'expense_receipt' | 'dor_receipt'
  subtype?: string
  image_path?: string
  parsed_json?: Record<string, unknown>
  status: 'uploaded' | 'processing' | 'parsed' | 'matched' | 'error'
  match_status: 'unmatched' | 'matched' | 'partial' | 'failed'
  source_env: 'demo' | 'qa' | 'live'
  additional_notes?: string
  // AI provenance
  model_version?: string
  prompt_version?: string
  confidence?: number
  extracted_at?: string
  created_at: string
  updated_at: string
  _sync_status?: 'pending' | 'synced' | 'failed'
  _last_synced_at?: string
}

export interface DocumentFormData {
  type: Document['type']
  subtype?: string
  image_path: string
  additional_notes?: string
}

export interface QuoteLineItem {
  id: string
  document_id: string
  room?: string
  position?: string
  description?: string
  range?: string
  colour?: string
  width_mm?: number
  quantity: number
  unit_price?: number
  line_total?: number
  source_env: 'demo' | 'qa' | 'live'
  // AI provenance
  model_version?: string
  prompt_version?: string
  confidence?: number
  extracted_at?: string
  created_at: string
  _sync_status?: 'pending' | 'synced' | 'failed'
  _last_synced_at?: string
}

export interface CommissionLineItem {
  id: string
  commission_statement_document_id: string
  line_date?: string
  invoice_number?: string
  job_code: string
  customer_number?: string
  customer_name?: string
  line_type?: 'sale' | 'service' | 'dor_penalty' | 'refit' | 'adjustment'
  commission_rate_percent?: number
  order_value_inc_vat?: number
  order_value_exc_vat?: number
  amount_inc_vat?: number
  amount_exc_vat?: number
  source_env: 'demo' | 'qa' | 'live'
  // AI provenance
  model_version?: string
  prompt_version?: string
  confidence?: number
  extracted_at?: string
  created_at: string
  _sync_status?: 'pending' | 'synced' | 'failed'
  _last_synced_at?: string
}

export interface FitLineItem {
  id: string
  document_id: string
  job_code: string
  line_number: number
  room?: string
  position?: string
  fit_status: 'fitted' | 'replacement'
  refit_date?: string
  source_env: 'demo' | 'qa' | 'live'
  // AI provenance
  model_version?: string
  prompt_version?: string
  confidence?: number
  extracted_at?: string
  created_at: string
  _sync_status?: 'pending' | 'synced' | 'failed'
  _last_synced_at?: string
}

export interface Incident {
  id: string
  advisor_id: string
  visit_id: string
  customer_id: string
  type: 'mismeasurement' | 'wrong_colour' | 'wrong_product' | 'installation_damage' | 'window_breakage' | 'logistics_damage' | 'theft' | 'warranty_malfunction' | 'other'
  cause: 'fitter_error' | 'customer_error' | 'supplier_error' | 'logistics_error' | 'theft' | 'product_defect' | 'accidental' | 'unknown'
  cause_detail?: string
  counts_toward_dor: boolean
  discovered_at: string
  description?: string
  resolution_status: 'open' | 'in_progress' | 'resolved' | 'disputed' | 'closed'
  photos: string[]
  notes?: string
  commission_line_item_id?: string
  logistics_leg?: 'hillarys_to_advisor' | 'advisor_to_customer'
  original_fit_visit_id?: string
  within_warranty_period?: boolean
  service_call_outcome?: 'repaired_on_site' | 'dor_raised_unrepairable' | 'escalated'
  dor_rate_at_time_percent?: number
  penalty_tier?: 'standard' | 'elevated'
  blinds_affected_count?: number
  penalty_amount?: number
  sale_value_lost?: number
  client_agreed_to_remake?: boolean
  remake_material_cost?: number
  remake_labour_absorbed?: number
  source_env: 'demo' | 'qa' | 'live'
  // AI provenance
  model_version?: string
  prompt_version?: string
  confidence?: number
  source_document_id?: string
  fit_line_item_id?: string
  detected_at?: string
  cross_check_status?: 'pending' | 'verified' | 'disputed'
  commission_rate_expected?: number
  commission_rate_actual?: number
  created_at: string
  updated_at: string
  _sync_status?: 'pending' | 'synced' | 'failed'
  _last_synced_at?: string
}

export interface IncidentFormData {
  type: Incident['type']
  cause: Incident['cause']
  cause_detail?: string
  counts_toward_dor: boolean
  description?: string
  photos?: string[]
  notes?: string
  commission_line_item_id?: string
  logistics_leg?: Incident['logistics_leg']
  original_fit_visit_id?: string
  within_warranty_period?: boolean
  service_call_outcome?: Incident['service_call_outcome']
  dor_rate_at_time_percent?: number
  penalty_tier?: 'standard' | 'elevated'
  blinds_affected_count?: number
  penalty_amount?: number
  sale_value_lost?: number
  client_agreed_to_remake?: boolean
  remake_material_cost?: number
  remake_labour_absorbed?: number
}