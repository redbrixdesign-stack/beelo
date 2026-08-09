// Supabase Edge Function for Commission Statement OCR
// Extracts commission line items from commission statement images/PDFs

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { document_id, image_path } = await req.json()
    
    if (!document_id || !image_path) {
      return new Response(
        JSON.stringify({ error: 'Missing document_id or image_path' }),
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

    // Call Claude API with timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 120000) // 2 min timeout

    const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': Deno.env.get('CLAUDE_API_KEY')!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 4096,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'text',
              text: `You are an OCR service for UK blinds advisor commission statements. Extract commission line items from this statement.

Return ONLY valid JSON with this exact structure:
{
  "lineItems": [
    {
      "lineDate": "ISO date string or null",
      "invoiceNumber": "string or null",
      "jobCode": "string",
      "customerNumber": "string or null",
      "customerName": "string or null",
      "lineType": "sale|service|dor_penalty|refit|adjustment",
      "lineTypeRaw": "string or null",
      "commissionRatePercent": number or null,
      "orderValueIncVat": number or null,
      "orderValueExcVat": number or null,
      "amountIncVat": number or null,
      "amountExcVat": number or null
    }
  ],
  "additionalNotes": "string or null",
  "confidence": 0.0-1.0,
  "modelVersion": "claude-3-haiku-20240307",
  "promptVersion": "commission-ocr-v2"
}

Extraction rules:
- Each row in the commission table = one line item
- lineDate: date of the line (commission statement date or invoice date)
- invoiceNumber: invoice/reference number
- jobCode: the job code (e.g. "HIL/123456")
- customerNumber: customer account number if shown
- customerName: customer name if shown
- lineType: "sale" (standard sale), "service" (service call), "dor_penalty" (DOR penalty), "refit" (refit work), "adjustment" (manual adjustment)
- lineTypeRaw: THE EXACT REASON TEXT as shown on the statement for DOR penalties (e.g. "Mismeasure", "Wrong Colour", "Wrong Order", "Installation Damage", "Logistics Damage", "Theft", "Warranty Malfunction"). For non-DOR lines, use null.
- commissionRatePercent: commission rate as percentage (e.g. 10 for 10%)
- orderValueIncVat: order value including VAT in GBP
- orderValueExcVat: order value excluding VAT in GBP
- amountIncVat: commission amount including VAT in GBP
- amountExcVat: commission amount excluding VAT in GBP
- additionalNotes: ANY text visible on the statement that doesn't fit the structured fields above — period totals, adjustments explanations, memo lines, footnotes, payment references, advisor notes, company messages, etc. Capture verbatim. Use null if none.
- confidence: your confidence in extraction accuracy (0.0-1.0)

UK commission statements typically show: Date, Invoice, Job Code, Customer, Type, Rate%, Order Value, Commission Amount.
For DOR penalty rows, there is typically a reason column with text like "Mismeasure", "Wrong Colour", "Wrong Order".
Handle £ symbols, commas in numbers, and negative values for adjustments/penalties.
Be precise with financial figures. CRITICAL: Capture the exact reason text for DOR penalties.`
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
      signal: controller.signal
    })

    clearTimeout(timeoutId)

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
      // Non-greedy match for first complete JSON object
      const jsonMatch = ocrText.match(/\{[\s\S]*?\}/)
      if (jsonMatch) {
        try {
          result = JSON.parse(jsonMatch[0])
        } catch {
          throw new Error('Failed to parse OCR result')
        }
      } else {
        throw new Error('Failed to parse OCR result')
      }
    }

    const normalizedResult = {
      lineItems: Array.isArray(result.lineItems) ? result.lineItems.map((item: any) => ({
        lineDate: item.lineDate || null,
        invoiceNumber: item.invoiceNumber || null,
        jobCode: item.jobCode || '',
        customerNumber: item.customerNumber || null,
        customerName: item.customerName || null,
        lineType: ['sale', 'service', 'dor_penalty', 'refit', 'adjustment'].includes(item.lineType) ? item.lineType : 'sale',
        lineTypeRaw: item.lineTypeRaw || null,
        commissionRatePercent: typeof item.commissionRatePercent === 'number' ? item.commissionRatePercent : null,
        orderValueIncVat: typeof item.orderValueIncVat === 'number' ? item.orderValueIncVat : null,
        orderValueExcVat: typeof item.orderValueExcVat === 'number' ? item.orderValueExcVat : null,
        amountIncVat: typeof item.amountIncVat === 'number' ? item.amountIncVat : null,
        amountExcVat: typeof item.amountExcVat === 'number' ? item.amountExcVat : null,
      })) : [],
      additionalNotes: typeof result.additionalNotes === 'string' && result.additionalNotes.trim() ? result.additionalNotes.trim() : null,
      confidence: typeof result.confidence === 'number' ? Math.max(0, Math.min(1, result.confidence)) : 0.5,
      modelVersion: result.modelVersion || 'claude-3-haiku-20240307',
      promptVersion: result.promptVersion || 'commission-ocr-v2',
    }

    return new Response(
      JSON.stringify(normalizedResult),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Commission OCR error:', error)
    
    // Handle timeout specifically
    if (error.name === 'AbortError' || error.message?.includes('timeout')) {
      return new Response(
        JSON.stringify({ error: 'OCR processing timed out. Please try again with a clearer image.' }),
        { status: 408, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})