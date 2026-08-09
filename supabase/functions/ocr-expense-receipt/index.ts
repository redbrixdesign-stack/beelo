// Supabase Edge Function for Expense Receipt OCR
// Extracts expense details from receipt images

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const EXPENSE_CATEGORIES = [
  'fuel', 'parking', 'materials', 'tools', 'subsistence', 
  'accommodation', 'training', 'insurance', 'phone', 'software', 'other'
]

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
        max_tokens: 2048,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'text',
              text: `You are an OCR service for UK expense receipts. Extract expense details from this receipt image.

Return ONLY valid JSON with this exact structure:
{
  "merchant": "string or null",
  "date": "ISO date string or null",
  "amount": number or null,
  "vatAmount": number or null,
  "category": "fuel|parking|materials|tools|subsistence|accommodation|training|insurance|phone|software|other",
  "items": [
    {
      "description": "string",
      "amount": number,
      "vatAmount": number or null
    }
  ],
  "additionalNotes": "string or null",
  "confidence": 0.0-1.0,
  "modelVersion": "claude-3-haiku-20240307",
  "promptVersion": "expense-receipt-ocr-v1"
}

Extraction rules:
- merchant: business name on receipt
- date: transaction date (ISO format YYYY-MM-DD)
- amount: total amount in GBP (include VAT)
- vatAmount: VAT amount if shown separately
- category: one of: fuel, parking, materials, tools, subsistence, accommodation, training, insurance, phone, software, other
- items: individual line items if visible
- additionalNotes: ANY text visible on the receipt that doesn't fit the structured fields above — payment method, card last 4 digits, loyalty points, staff name, till number, promotional messages, return policy, VAT number, address, phone, website, etc. Capture verbatim. Use null if none.
- confidence: your confidence in extraction accuracy (0.0-1.0)

UK receipts typically show: Merchant name, Date, VAT registration number, Items with prices, Subtotal, VAT, Total.
Handle £ symbols, commas in numbers. If VAT not shown separately, calculate as amount * 0.1667 (20% VAT).
Be precise with financial figures.`
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
      merchant: result.merchant || null,
      date: result.date || null,
      amount: typeof result.amount === 'number' && result.amount > 0 ? result.amount : null,
      vatAmount: typeof result.vatAmount === 'number' ? result.vatAmount : null,
      category: EXPENSE_CATEGORIES.includes(result.category) ? result.category : 'other',
      items: Array.isArray(result.items) ? result.items.map((item: any) => ({
        description: item.description || '',
        amount: typeof item.amount === 'number' ? item.amount : 0,
        vatAmount: typeof item.vatAmount === 'number' ? item.vatAmount : null,
      })) : [],
      additionalNotes: typeof result.additionalNotes === 'string' && result.additionalNotes.trim() ? result.additionalNotes.trim() : null,
      confidence: typeof result.confidence === 'number' ? Math.max(0, Math.min(1, result.confidence)) : 0.5,
      modelVersion: result.modelVersion || 'claude-3-haiku-20240307',
      promptVersion: result.promptVersion || 'expense-receipt-ocr-v1',
    }

    return new Response(
      JSON.stringify(normalizedResult),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Expense receipt OCR error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})