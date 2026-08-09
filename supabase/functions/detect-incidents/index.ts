// Supabase Edge Function for Auto-Incident Detection
// Detects incidents from commission statements and fit completion receipts
// Business rule: ONLY fitter_error opens advisor to penalty. All other causes are company's responsibility.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Business rules from BusinessRules.md
const COMMISSION_RATE_TOLERANCE = 0.5 // 0.5% tolerance
const DOR_RATE_THRESHOLD = 2.5 // 2.5% DOR rate threshold

interface CommissionLineItem {
  id: string
  jobCode: string
  commissionRatePercent?: number
  amountIncVat?: number
  amountExcVat?: number
  lineType?: string
}

interface FitLineItem {
  id: string
  jobCode: string
  fitStatus: 'fitted' | 'replacement'
  refitDate?: string
  lineNumber: number
}

interface VisitMatch {
  id: string
  customer_id: string
  job_code: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { advisor_id, commission_statement_document_id, fit_completion_document_id } = await req.json()
    
    if (!advisor_id) {
      return new Response(
        JSON.stringify({ error: 'Missing advisor_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // --- TENANT ISOLATION CHECK ---
    // Service role bypasses RLS, so we must verify the caller owns the documents
    if (commission_statement_document_id) {
      const { data: doc, error } = await supabase
        .from('documents')
        .select('advisor_id')
        .eq('id', commission_statement_document_id)
        .single()
      if (error || !doc || doc.advisor_id !== advisor_id) {
        return new Response(
          JSON.stringify({ error: 'Commission statement document not found or access denied' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }
    if (fit_completion_document_id) {
      const { data: doc, error } = await supabase
        .from('documents')
        .select('advisor_id')
        .eq('id', fit_completion_document_id)
        .single()
      if (error || !doc || doc.advisor_id !== advisor_id) {
        return new Response(
          JSON.stringify({ error: 'Fit completion document not found or access denied' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    const incidents = []
    const unmatched: Array<{ job_code: string; reason: string }> = []

    // Helper: find visit and customer by job_code
    const findVisitByJobCode = async (jobCode: string): Promise<VisitMatch | null> => {
      const { data } = await supabase
        .from('visits')
        .select('id, customer_id, job_code')
        .eq('advisor_id', advisor_id)
        .eq('job_code', jobCode)
        .maybeSingle()
      return data ? { id: data.id, customer_id: data.customer_id, job_code: data.job_code } : null
    }

    // 1. Commission rate cross-check (does not create penalty incidents)
    if (commission_statement_document_id) {
      const { data: commissionItems, error: commError } = await supabase
        .from('commission_line_items')
        .select('*')
        .eq('commission_statement_document_id', commission_statement_document_id)
        .eq('advisor_id', advisor_id)

      if (commError) throw new Error(`Failed to fetch commission items: ${commError.message}`)

      const { data: advisor, error: advError } = await supabase
        .from('advisors')
        .select('commission_rate_percent')
        .eq('id', advisor_id)
        .single()

      if (advError) throw new Error(`Failed to fetch advisor: ${advError.message}`)

      const expectedRate = advisor.commission_rate_percent

      for (const item of commissionItems || []) {
        // Commission rate mismatch — flag for review, NOT a penalty
        if (item.line_type === 'sale' && item.commission_rate_percent) {
          const rateDiff = Math.abs(item.commission_rate_percent - expectedRate)
          if (rateDiff > COMMISSION_RATE_TOLERANCE) {
            const visitMatch = await findVisitByJobCode(item.job_code)
            if (!visitMatch) {
              unmatched.push({ job_code: item.job_code, reason: 'No visit found for commission rate cross-check' })
              continue
            }
            incidents.push({
              advisor_id,
              visit_id: visitMatch.id,
              customer_id: visitMatch.customer_id,
              type: 'other',
              cause: 'supplier_error', // rate set by company, not advisor
              cause_detail: `Commission rate mismatch: expected ${expectedRate}%, got ${item.commission_rate_percent}% (diff: ${rateDiff.toFixed(1)}%)`,
              counts_toward_dor: false,
              discovered_at: new Date().toISOString(),
              description: `Commission rate cross-check failed for job ${item.job_code}`,
              resolution_status: 'open',
              photos: [],
              commission_line_item_id: item.id,
              source_env: 'live',
            })
          }
        }

        // DOR penalty line — create provisional incident, default to UNKNOWN cause
        // DO NOT default to fitter_error. BusinessRules.md: only fitter_error opens advisor to penalty.
        if (item.line_type === 'dor_penalty' && item.amount_inc_vat) {
          const visitMatch = await findVisitByJobCode(item.job_code)
          if (!visitMatch) {
            unmatched.push({ job_code: item.job_code, reason: 'No visit found for DOR penalty line' })
            continue
          }
          incidents.push({
            advisor_id,
            visit_id: visitMatch.id,
            customer_id: visitMatch.customer_id,
            type: 'other', // raw reason from statement needed to classify (Mismeasure/Wrong Colour/Wrong Order)
            cause: 'unknown', // DEFAULT: unknown. Requires human review to set cause.
            cause_detail: `DOR penalty detected: £${item.amount_inc_vat} for job ${item.job_code}. Reason from statement: ${item.line_type}.`,
            counts_toward_dor: false, // DEFAULT: false. Only set true if cause confirmed as fitter_error.
            discovered_at: new Date().toISOString(),
            description: `DOR penalty from commission statement: ${item.job_code}`,
            resolution_status: 'open',
            photos: [],
            commission_line_item_id: item.id,
            source_env: 'live',
            penalty_amount: item.amount_inc_vat,
            dor_rate_at_time_percent: DOR_RATE_THRESHOLD,
          })
        }
      }
    }

    // 2. Fit completion receipt — replacements create provisional incidents
    if (fit_completion_document_id) {
      const { data: fitItems, error: fitError } = await supabase
        .from('fit_line_items')
        .select('*')
        .eq('document_id', fit_completion_document_id)
        .eq('advisor_id', advisor_id)

      if (fitError) throw new Error(`Failed to fetch fit items: ${fitError.message}`)

      for (const item of fitItems || []) {
        if (item.fit_status === 'replacement' && item.refit_date) {
          const visitMatch = await findVisitByJobCode(item.job_code)
          if (!visitMatch) {
            unmatched.push({ job_code: item.job_code, reason: 'No visit found for fit completion replacement' })
            continue
          }
          incidents.push({
            advisor_id,
            visit_id: visitMatch.id,
            customer_id: visitMatch.customer_id,
            type: 'mismeasurement', // provisional; will be refined when commission statement confirms
            cause: 'unknown', // DEFAULT: unknown. BusinessRules.md: only fitter_error counts toward DOR.
            cause_detail: `Refit required for job ${item.job_code} (line ${item.line_number}). Refit date: ${item.refit_date}. Awaiting commission statement confirmation.`,
            counts_toward_dor: false, // DEFAULT: false. Only true if cause confirmed as fitter_error.
            discovered_at: new Date().toISOString(),
            description: `Provisional incident from fit completion receipt: refit for ${item.job_code}`,
            resolution_status: 'open',
            photos: [],
            original_fit_visit_id: visitMatch.id, // link to original fit visit
            within_warranty_period: true,
            source_env: 'live',
            fit_line_item_id: item.id,
          })
        }
      }
    }

    // Save incidents to database
    if (incidents.length > 0) {
      const { error: insertError } = await supabase
        .from('incidents')
        .insert(incidents)

      if (insertError) {
        throw new Error(`Failed to insert incidents: ${insertError.message}`)
      }
    }

    return new Response(
      JSON.stringify({ 
        incidents_created: incidents.length,
        unmatched,
        incidents: incidents.map(i => ({
          type: i.type,
          cause: i.cause,
          counts_toward_dor: i.counts_toward_dor,
          job_code: i.description?.match(/job\s+([A-Z0-9\/]+)/i)?.[1] || 'unknown',
        }))
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Detect incidents error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})