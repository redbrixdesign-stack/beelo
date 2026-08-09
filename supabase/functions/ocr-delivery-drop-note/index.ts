// Supabase Edge Function for Delivery Drop Note OCR
// Multi-fan-out OCR: extracts items and distributes to customer, fitter, office

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
              text: `You are an OCR service for UK blinds delivery drop notes. Extract all items from this delivery note.

Return ONLY valid JSON with this exact structure:
{
  "jobCode": "string",
  "customerNumber": "string",
  "deliveryDate": "ISO date string or null",
  "items": [
    {
      "lineNumber": number,
      "description": "string",
      "quantity": number,
      "status": "delivered|pending|damaged|returned"
    }
  ],
  "fanOutTargets": ["customer", "fitter", "office"],
  "additionalNotes": "string or null",
  "confidence": 0.0-1.0,
  "modelVersion": "claude-3-haiku-20240307",
  "promptVersion": "delivery-drop-note-ocr-v1"
}

Extraction rules:
- jobCode: the job code on the delivery note (e.g. "H342")
- customerNumber: customer account number
- deliveryDate: date of delivery if visible
- items: each line item for blinds/products being delivered
- lineNumber: sequential (1, 2, 3...)
- description: product description (e.g. "Roller Blind - White - 1200x1500mm")
- quantity: number of units
- status: "delivered" (default), "pending", "damaged", "returned"
- fanOutTargets: who needs this info - always include ["customer", "fitter", "office"] for delivery notes
- additionalNotes: ANY text visible on the delivery note that doesn't fit the structured fields above — driver signature, recipient signature, delivery instructions, access codes, contact numbers, damage notes, partial delivery notes, return reasons, depot stamps, etc. Capture verbatim. Use null if none.
- confidence: your confidence in extraction accuracy (0.0-1.0)

UK English spelling. Be precise with job codes and quantities.`
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
      jobCode: result.jobCode || '',
      customerNumber: result.customerNumber || '',
      deliveryDate: result.deliveryDate || null,
      items: Array.isArray(result.items) ? result.items.map((item: any, index: number) => ({
        lineNumber: typeof item.lineNumber === 'number' && item.lineNumber > 0 ? item.lineNumber : index + 1,
        description: item.description || '',
        quantity: typeof item.quantity === 'number' && item.quantity > 0 ? item.quantity : 1,
        status: ['delivered', 'pending', 'damaged', 'returned'].includes(item.status) ? item.status : 'delivered',
      })) : [],
      fanOutTargets: Array.isArray(result.fanOutTargets) ? result.fanOutTargets : ['customer', 'fitter', 'office'],
      additionalNotes: typeof result.additionalNotes === 'string' && result.additionalNotes.trim() ? result.additionalNotes.trim() : null,
      confidence: typeof result.confidence === 'number' ? Math.max(0, Math.min(1, result.confidence)) : 0.5,
      modelVersion: result.modelVersion || 'claude-3-haiku-20240307',
      promptVersion: result.promptVersion || 'delivery-drop-note-ocr-v1',
    }

    return new Response(
      JSON.stringify(normalizedResult),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Delivery drop note OCR error:', error)
    
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