// Supabase Edge Function for Fit Completion Receipt OCR
// Extracts fitted line items from fit completion receipts

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
              text: `You are an OCR service for UK blinds fit completion receipts. Extract fitted line items from this receipt.

Return ONLY valid JSON with this exact structure:
{
  "lineItems": [
    {
      "jobCode": "string",
      "lineNumber": number,
      "room": "string or null",
      "position": "string or null",
      "fitStatus": "fitted|replacement",
      "refitDate": "ISO date string or null"
    }
  ],
  "additionalNotes": "string or null",
  "confidence": 0.0-1.0,
  "modelVersion": "claude-3-haiku-20240307",
  "promptVersion": "fit-completion-ocr-v1"
}

Extraction rules:
- Each fitted window/blind = one line item
- jobCode: the job code for this fit (e.g. "HIL/123456")
- lineNumber: sequential line number (1, 2, 3...)
- room: room name if mentioned (e.g. "Living Room", "Kitchen")
- position: window position if mentioned (e.g. "Left", "Right", "Bay", "Patio Doors")
- fitStatus: "fitted" (new installation) or "replacement" (replacing existing)
- refitDate: date of refit if this is a replacement (ISO format YYYY-MM-DD)
- additionalNotes: ANY text visible on the receipt that doesn't fit the structured fields above — installer signature/name, customer signature, special instructions, access notes, parking info, warranty references, quality check marks, handover notes, etc. Capture verbatim. Use null if none.
- confidence: your confidence in extraction accuracy (0.0-1.0)

Fit completion receipts typically show: Job Code, Window/Blind details, Room, Position, Fitted/Replacement status, Refit date if applicable.
Be precise with job codes and line numbers.`
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
        throw new Error('Failed to parse OCR result')
      }
    }

    const normalizedResult = {
      lineItems: Array.isArray(result.lineItems) ? result.lineItems.map((item: any) => ({
        jobCode: item.jobCode || '',
        lineNumber: typeof item.lineNumber === 'number' && item.lineNumber > 0 ? item.lineNumber : 1,
        room: item.room || null,
        position: item.position || null,
        fitStatus: ['fitted', 'replacement'].includes(item.fitStatus) ? item.fitStatus : 'fitted',
        refitDate: item.refitDate || null,
      })) : [],
      additionalNotes: typeof result.additionalNotes === 'string' && result.additionalNotes.trim() ? result.additionalNotes.trim() : null,
      confidence: typeof result.confidence === 'number' ? Math.max(0, Math.min(1, result.confidence)) : 0.5,
      modelVersion: result.modelVersion || 'claude-3-haiku-20240307',
      promptVersion: result.promptVersion || 'fit-completion-ocr-v1',
    }

    return new Response(
      JSON.stringify(normalizedResult),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Fit completion OCR error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})