// Supabase Edge Function for Quote/Receipt OCR
// Extracts line items from quote or receipt images

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

    // Download image from storage
    const { data: imageData, error: downloadError } = await supabase.storage
      .from('documents')
      .download(image_path)

    if (downloadError) {
      throw new Error(`Failed to download image: ${downloadError.message}`)
    }

    const imageBuffer = await imageData.arrayBuffer()
    const base64Image = btoa(String.fromCharCode(...new Uint8Array(imageBuffer)))

    // Call Claude API for OCR
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
              text: `You are an OCR service for UK blinds/sales advisors. Extract line items from this quote or receipt image.

Return ONLY valid JSON with this exact structure:
{
  "lineItems": [
    {
      "room": "string or null",
      "position": "string or null",
      "description": "string or null",
      "range": "string or null",
      "colour": "string or null",
      "widthMm": number or null,
      "quantity": number,
      "unitPrice": number or null,
      "lineTotal": number or null
    }
  ],
  "additionalNotes": "string or null",
  "confidence": 0.0-1.0,
  "modelVersion": "claude-3-haiku-20240307",
  "promptVersion": "quote-ocr-v1"
}

Extraction rules:
- Each row = one line item
- room: room name if mentioned (e.g. "Living Room", "Bedroom 1")
- position: window position if mentioned (e.g. "Left", "Right", "Bay")
- description: product description (e.g. "Roller Blind", "Venetian Blind")
- range: size range if mentioned (e.g. "1200mm x 1500mm")
- colour: colour if mentioned
- widthMm: width in millimetres (extract numbers only)
- quantity: count of blinds (default 1 if not clear)
- unitPrice: price per unit in GBP (extract numbers, handle £ symbol)
- lineTotal: total for this line (quantity × unitPrice)
- additionalNotes: ANY text visible on the document that doesn't fit the structured fields above — handwritten notes, special instructions, payment terms, delivery info, customer requests, installer names, phone numbers, email addresses, promotional text, disclaimers, etc. Capture verbatim. Use null if none.
- confidence: your confidence in extraction accuracy (0.0-1.0)

UK English spelling. Be precise with numbers. If a field is not visible, use null.`
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
      // Robust JSON extraction without regex backtracking
      // Find the first complete JSON object by tracking brace balance
      let braceCount = 0
      let startIdx = -1
      let endIdx = -1
      
      for (let i = 0; i < ocrText.length; i++) {
        const char = ocrText[i]
        if (char === '{') {
          if (braceCount === 0) startIdx = i
          braceCount++
        } else if (char === '}') {
          braceCount--
          if (braceCount === 0 && startIdx !== -1) {
            endIdx = i
            break
          }
        }
      }
      
      if (startIdx !== -1 && endIdx !== -1) {
        const jsonStr = ocrText.slice(startIdx, endIdx + 1)
        try {
          result = JSON.parse(jsonStr)
        } catch {
          throw new Error('Failed to parse OCR result')
        }
      } else {
        throw new Error('Failed to parse OCR result')
      }
    }

    // Validate and normalize
    const normalizedResult = {
      lineItems: Array.isArray(result.lineItems) ? result.lineItems.map((item: any) => ({
        room: item.room || null,
        position: item.position || null,
        description: item.description || null,
        range: item.range || null,
        colour: item.colour || null,
        widthMm: typeof item.widthMm === 'number' ? item.widthMm : null,
        quantity: typeof item.quantity === 'number' && item.quantity > 0 ? item.quantity : 1,
        unitPrice: typeof item.unitPrice === 'number' ? item.unitPrice : null,
        lineTotal: typeof item.lineTotal === 'number' ? item.lineTotal : null,
      })) : [],
      additionalNotes: typeof result.additionalNotes === 'string' && result.additionalNotes.trim() ? result.additionalNotes.trim() : null,
      confidence: typeof result.confidence === 'number' ? Math.max(0, Math.min(1, result.confidence)) : 0.5,
      modelVersion: result.modelVersion || 'claude-3-haiku-20240307',
      promptVersion: result.promptVersion || 'quote-ocr-v1',
    }

    return new Response(
      JSON.stringify(normalizedResult),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Quote OCR error:', error)
    
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