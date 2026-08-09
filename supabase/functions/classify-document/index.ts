// Supabase Edge Function for Document Type Classification
// Detects document type from image before routing to specific OCR

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const DOCUMENT_TYPES = [
  'appointment_card',
  'quote_or_receipt',
  'fit_completion_receipt',
  'delivery_drop_note',
  'commission_statement',
  'expense_receipt',
  'dor_receipt',
] as const

type DocumentType = typeof DOCUMENT_TYPES[number]

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { image_path } = await req.json()
    
    if (!image_path) {
      return new Response(
        JSON.stringify({ error: 'Missing image_path' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { data: imageData, error: downloadError } = await supabase.storage
      .from('documents')
      .download(image_path)

    if (downloadError) {
      throw new Error(`Failed to download image: ${downloadError.message}`)
    }

    const imageBuffer = await imageData.arrayBuffer()
    const base64Image = btoa(String.fromCharCode(...new Uint8Array(imageBuffer)))

    const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': Deno.env.get('CLAUDE_API_KEY')!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'text',
              text: `You are a document classifier for UK blinds advisor documents. Identify the document type from this image.

Return ONLY valid JSON:
{
  "documentType": "appointment_card|quote_or_receipt|fit_completion_receipt|delivery_drop_note|commission_statement|expense_receipt|dor_receipt",
  "confidence": 0.0-1.0,
  "reasoning": "brief explanation"
}

Document types:
- appointment_card: Company appointment card with customer name, address, date/time, job code
- quote_or_receipt: Sales quote or receipt with line items (room, position, blind type, width, price)
- fit_completion_receipt: Fit completion receipt showing "Order Number", fitted/replacement status per line, £0 total, refit dates
- delivery_drop_note: Delivery note with multiple customer items, job codes, delivery status
- commission_statement: Weekly commission statement with table: Date, Invoice, Job Code, Customer, Type, Rate%, Order Value, Commission Amount
- expense_receipt: Standard receipt with merchant, date, total, VAT, items
- dor_receipt: Defective Order Receipt / penalty notification

Look for key visual markers: headers, table structures, specific labels (Job Code, Order Number, Commission Rate, etc.).`
            },
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: 'image/jpeg',
                data: base64Image
              }
            }
          ]
        }],
      }),
    })

    if (!claudeResponse.ok) {
      const errorText = await claudeResponse.text()
      throw new Error(`Claude API error: ${claudeResponse.status} ${errorText}`)
    }

    const claudeData = await claudeResponse.json()
    const ocrText = claudeData.content[0]?.text || '{}'
    
    let result
    try {
      result = JSON.parse(ocrText)
    } catch {
      const jsonMatch = ocrText.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0])
      } else {
        throw new Error('Failed to parse classification result')
      }
    }

    const documentType = DOCUMENT_TYPES.includes(result.documentType as DocumentType) 
      ? result.documentType 
      : 'quote_or_receipt'
    const confidence = typeof result.confidence === 'number' ? Math.max(0, Math.min(1, result.confidence)) : 0.5

    return new Response(
      JSON.stringify({ documentType, confidence, reasoning: result.reasoning }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Classify document error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})