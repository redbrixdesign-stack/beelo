// Supabase Edge Function for voice note transcription
// Uses Claude API to transcribe audio and extract structured fields

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
    const { voice_note_id, audio_path } = await req.json()
    
    if (!voice_note_id || !audio_path) {
      return new Response(
        JSON.stringify({ error: 'Missing voice_note_id or audio_path' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Download audio from storage
    const { data: audioData, error: downloadError } = await supabase.storage
      .from('voice-notes')
      .download(audio_path)

    if (downloadError) {
      throw new Error(`Failed to download audio: ${downloadError.message}`)
    }

    // Convert to base64 for Claude API
    const audioBuffer = await audioData.arrayBuffer()
    const base64Audio = btoa(String.fromCharCode(...new Uint8Array(audioBuffer)))

    // Call Claude API for transcription
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
              text: `You are a transcription service for a UK home-visit blinds advisor. Transcribe the audio and extract structured fields.

Return ONLY valid JSON with this exact structure:
{
  "transcript": "full transcript text",
  "extracted_blind_count": number or null,
  "extracted_parking_notes": "string or null",
  "extracted_access_notes": "string or null",
  "extracted_name_spoken": "string or null",
  "confidence": 0.0-1.0
}

Extraction rules:
- blind_count: number of blinds mentioned (e.g. "3 blinds", "five blinds")
- parking_notes: any parking instructions or restrictions mentioned
- access_notes: any access issues (gates, codes, stairs, etc.)
- name_spoken: customer name mentioned in the recording
- confidence: your confidence in the transcription accuracy (0.0-1.0)

UK English spelling. Be concise.`
            },
            {
              type: 'audio',
              source: {
                type: 'base64',
                media_type: 'audio/m4a',
                data: base64Audio
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
    const transcriptText = claudeData.content[0]?.text || '{}'
    
    let result
    try {
      result = JSON.parse(transcriptText)
    } catch {
      // If JSON parse fails, try to extract from text
      const jsonMatch = transcriptText.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0])
      } else {
        result = {
          transcript: transcriptText,
          extracted_blind_count: null,
          extracted_parking_notes: null,
          extracted_access_notes: null,
          extracted_name_spoken: null,
          confidence: 0.5
        }
      }
    }

    // Validate and normalize result
    const normalizedResult = {
      transcript: result.transcript || '',
      extracted_blind_count: typeof result.extracted_blind_count === 'number' ? result.extracted_blind_count : null,
      extracted_parking_notes: result.extracted_parking_notes || null,
      extracted_access_notes: result.extracted_access_notes || null,
      extracted_name_spoken: result.extracted_name_spoken || null,
      confidence: typeof result.confidence === 'number' ? Math.max(0, Math.min(1, result.confidence)) : 0.5,
    }

    return new Response(
      JSON.stringify(normalizedResult),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Transcription error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})