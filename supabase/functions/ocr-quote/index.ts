// Supabase Edge Function for Quote/Receipt OCR
// Extracts line items from quote or receipt images

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Safe error serializer - extracts only primitive fields
function serializeError(error: unknown): { message: string; name?: string; code?: string } {
  if (error instanceof Error) {
    return {
      message: error.message,
      name: error.name,
      code: (error as any).code,
    }
  }
  if (typeof error === 'object' && error !== null) {
    return {
      message: String(error),
      name: (error as any).name,
      code: (error as any).code,
    }
  }
  return { message: String(error) }
}

// Safe JSON serializer for error responses
function errorResponse(error: unknown, status: number): Response {
  return new Response(
    JSON.stringify({ success: false, error: serializeError(error) }),
    { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

// Retry helper with exponential backoff (max 3 attempts)
async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  baseDelayMs = 1000
): Promise<T> {
  let lastError: unknown
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      if (attempt < maxAttempts) {
        const delay = baseDelayMs * Math.pow(2, attempt - 1)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }
  throw lastError
}

serve(async (req) => {
  // Top-level try/catch for the entire handler
  try {
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders })
    }

    let documentId: string
    let imagePath: string

    try {
      const body = await req.json()
      documentId = body.document_id
      imagePath = body.image_path
    } catch {
      return errorResponse(new Error('Invalid JSON body'), 400)
    }

    if (!documentId || !imagePath) {
      return errorResponse(new Error('Missing document_id or image_path'), 400)
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Strip bucket prefix if present (e.g. "documents/1/8.jpg" -> "1/8.jpg")
    const cleanImagePath = imagePath.replace(/^documents\//, '')

    // Download image from storage
    const { data: imageData, error: downloadError } = await supabase.storage
      .from('documents')
      .download(cleanImagePath)

    if (downloadError) {
      return errorResponse(new Error(`Failed to download image: ${downloadError.message}`), 500)
    }

    const imageBuffer = await imageData.arrayBuffer()
    const bytes = new Uint8Array(imageBuffer)
    // Build binary string via simple loops to avoid call stack overflow
    // (String.fromCharCode.apply/spread would push 32KB+ args onto the stack)
    const chunkSize = 0x8000 // 32KB chunks
    let binary = ''
    for (let i = 0; i < bytes.length; i += chunkSize) {
      let chunkStr = ''
      const end = Math.min(i + chunkSize, bytes.length)
      for (let j = i; j < end; j++) {
        chunkStr += String.fromCharCode(bytes[j])
      }
      binary += chunkStr
    }
    const base64Image = btoa(binary)

    // Call Claude API for OCR with retry logic
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 120000) // 2 min timeout
    
    const claudeResponse = await withRetry(async () => {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
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
                text: `You are a document classifier and extractor for a UK blinds sales advisor.

Analyze the image and return ONLY valid JSON:
{
  "document_type": "quote" | "commission_statement" | "fit_receipt" | "delivery_note" | "expense_receipt" | "unknown",
  "confidence": 0.0-1.0,
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
  "extracted_data": {
    "customer_name": "string or null",
    "job_code": "string or null",
    "total_price": "number or null",
    "commission_amount": "number or null",
    "dor_penalty": "number or null",
    "fitter_name": "string or null",
    "completion_date": "string or null",
    "blinds_fitted_count": "number or null",
    "delivery_date": "string or null",
    "items_delivered": "number or null",
    "merchant": "string or null",
    "amount": "number or null",
    "date": "string or null",
    "category": "string or null"
  },
  "additionalNotes": "string or null",
  "modelVersion": "claude-3-haiku-20240307",
  "promptVersion": "quote-ocr-v2"
}

Classification rules:
- "quote": Contains prices, blind descriptions, customer details, job code
- "commission_statement": Contains "commission", "DOR", "statement", "Hillarys" or similar
- "fit_receipt": Contains "fit", "installation", "completed", fitter signature
- "delivery_note": Contains "delivered", "drop note", "goods received"
- "expense_receipt": Contains "receipt", "paid", "VAT", fuel or meal purchases
- "unknown": Cannot determine type

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
- extracted_data: populate fields based on document_type
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
    const validDocTypes = ['quote', 'commission_statement', 'fit_receipt', 'delivery_note', 'expense_receipt', 'unknown']
    const normalizedResult = {
      document_type: validDocTypes.includes(result.document_type) ? result.document_type : 'unknown',
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
      extracted_data: result.extracted_data && typeof result.extracted_data === 'object' ? result.extracted_data : {},
      additionalNotes: typeof result.additionalNotes === 'string' && result.additionalNotes.trim() ? result.additionalNotes.trim() : null,
      confidence: typeof result.confidence === 'number' ? Math.max(0, Math.min(1, result.confidence)) : 0.5,
      modelVersion: result.modelVersion || 'claude-3-haiku-20240307',
      promptVersion: result.promptVersion || 'quote-ocr-v2',
    }

    return new Response(
      JSON.stringify({ success: true, data: normalizedResult }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Quote OCR error:', error)
    
    // Handle timeout specifically
    if (error.name === 'AbortError' || error.message?.includes('timeout')) {
      return errorResponse(new Error('OCR processing timed out. Please try again with a clearer image.'), 408)
    }
    
    return errorResponse(error, 500)
  }
})