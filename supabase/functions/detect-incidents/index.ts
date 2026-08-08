// Supabase Edge Function for Auto-Incident Detection
// Detects incidents from commission statements and fit completion receipts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Business rules from BusinessRules.md
const COMMISSION_RATE_TOLERANCE = 0.5 // 0.5% tolerance
const DOR_RATE_THRESHOLD = 2.5 // 2.5% DOR rate threshold
const PENALTY_TIERS = {
  standard: { rate: 100, maxBlinds: 3 },      // 100% cost, max 3 blinds
  elevated: { rate: 150, maxBlinds: 999 }     // 150% cost, no limit
}

interface CommissionLineItem {
  jobCode: string
  commissionRatePercent?: number
  amountIncVat?: number
  amountExcVat?: number
  lineType?: string
}

interface FitLineItem {
  jobCode: string
  fitStatus: 'fitted' | 'replacement'
  refitDate?: string
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

    const incidents = []

    // 1. Commission rate cross-check
    if (commission_statement_document_id) {
      const { data: commissionItems, error: commError } = await supabase
        .from('commission_line_items')
        .select('*')
        .eq('commission_statement_document_id', commission_statement_document_id)
        .eq('advisor_id', advisor_id)

      if (commError) throw new Error(`Failed to fetch commission items: ${commError.message}`)

      // Get advisor's expected commission rate
      const { data: advisor, error: advError } = await supabase
        .from('advisors')
        .select('commission_rate_percent')
        .eq('id', advisor_id)
        .single()

      if (advError) throw new Error(`Failed to fetch advisor: ${advError.message}`)

      const expectedRate = advisor.commission_rate_percent

      for (const item of commissionItems || []) {
        if (item.line_type === 'sale' && item.commission_rate_percent) {
          const rateDiff = Math.abs(item.commission_rate_percent - expectedRate)
          if (rateDiff > COMMISSION_RATE_TOLERANCE) {
            incidents.push({
              advisor_id,
              visit_id: item.visit_id || null,
              customer_id: item.customer_id || null,
              type: 'other',
              cause: 'supplier_error',
              cause_detail: `Commission rate mismatch: expected ${expectedRate}%, got ${item.commission_rate_percent}% (diff: ${rateDiff.toFixed(1)}%)`,
              counts_toward_dor: false,
              discovered_at: new Date().toISOString(),
              description: `Commission rate cross-check failed for job ${item.job_code}`,
              resolution_status: 'open',
              photos: [],
              commission_line_item_id: item.id,
              source_env: 'live',
              cross_check_status: 'pending',
              commission_rate_expected: expectedRate,
              commission_rate_actual: item.commission_rate_percent,
            })
          }
        }

        // Check for DOR penalties in commission statement
        if (item.line_type === 'dor_penalty' && item.amount_inc_vat) {
          incidents.push({
            advisor_id,
            visit_id: item.visit_id || null,
            customer_id: item.customer_id || null,
            type: 'other',
            cause: 'fitter_error',
            cause_detail: `DOR penalty detected: £${item.amount_inc_vat} for job ${item.job_code}`,
            counts_toward_dor: true,
            discovered_at: new Date().toISOString(),
            description: `DOR penalty from commission statement: ${item.job_code}`,
            resolution_status: 'open',
            photos: [],
            commission_line_item_id: item.id,
            source_env: 'live',
            cross_check_status: 'pending',
            penalty_amount: item.amount_inc_vat,
            dor_rate_at_time_percent: DOR_RATE_THRESHOLD,
          })
        }
      }
    }

    // 2. Fit completion receipt - check for replacements (refits)
    if (fit_completion_document_id) {
      const { data: fitItems, error: fitError } = await supabase
        .from('fit_line_items')
        .select('*')
        .eq('document_id', fit_completion_document_id)
        .eq('advisor_id', advisor_id)

      if (fitError) throw new Error(`Failed to fetch fit items: ${fitError.message}`)

      for (const item of fitItems || []) {
        if (item.fit_status === 'replacement' && item.refit_date) {
          // This is a refit - create provisional incident
          incidents.push({
            advisor_id,
            visit_id: null, // Will be matched later
            customer_id: null,
            type: 'mismeasurement', // Default, will be refined
            cause: 'fitter_error', // Default, will be refined
            cause_detail: `Refit required for job ${item.job_code} (line ${item.line_number}). Original fit: ${item.refit_date}`,
            counts_toward_dor: true,
            discovered_at: new Date().toISOString(),
            description: `Provisional incident from fit completion receipt: refit for ${item.job_code}`,
            resolution_status: 'open',
            photos: [],
            original_fit_visit_id: null, // TODO: match to visit
            within_warranty_period: true, // Assume within warranty for new refits
            source_env: 'live',
            cross_check_status: 'pending',
            fit_line_item_id: item.id,
            detected_at: new Date().toISOString(),
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
        incidents: incidents.map(i => ({
          type: i.type,
          cause: i.cause,
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