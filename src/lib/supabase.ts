import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
})

// Signed URL helper for private storage buckets
export async function getDocumentImageUrl(path: string, expiresIn = 3600): Promise<string> {
  if (!path) return ''
  // If already a full URL (blob:, http:, https:), return as-is
  if (path.startsWith('blob:') || path.startsWith('http://') || path.startsWith('https://')) {
    return path
  }
  // If already a Supabase storage URL, return as-is
  if (path.includes('/storage/v1/object/')) {
    return path
  }
  // Strip bucket prefix if present (e.g., "documents/1/8.jpg" -> "1/8.jpg")
  const cleanPath = path.replace(/^documents\//, '')
  const { data, error } = await supabase.storage
    .from('documents')
    .createSignedUrl(cleanPath, expiresIn)
  if (error) {
    console.warn('Failed to create signed URL for document image:', error.message)
    // Fallback to public URL pattern (works if bucket is public)
    return `${supabaseUrl}/storage/v1/object/public/documents/${cleanPath}`
  }
  return data.signedUrl
}

// Pilot event types (matches DB constraint)
export type PilotEventType = 
  | 'visit_created'
  | 'document_captured'
  | 'voice_note_recorded'
  | 'ocr_completed'
  | 'ocr_failed'
  | 'sync_completed'
  | 'schedule_risk_warning_shown'

interface PilotEventData {
  visit_id?: number
  document_id?: number
  document_type?: string
  duration_ms?: number
  blind_count?: number
  risk_level?: 'low' | 'medium' | 'high'
  gap_minutes?: number
  estimated_duration?: number
  document_type?: string
  page_count?: number
  confidence?: number
  error_message?: string
  retry_count?: number
  items_count?: number
  total_size_bytes?: number
  risk_level?: 'low' | 'medium' | 'high'
  gap_minutes?: number
  estimated_duration_minutes?: number
}

// Pilot event logging - lightweight, PII-free
// Call this from client-side code for key user actions
export async function logPilotEvent(
  eventType: PilotEventType,
  eventData: Record<string, unknown> = {}
): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return // Not authenticated, skip silently

    // Get advisor ID from user
    const { data: advisor, error: advisorError } = await supabase
      .from('advisors')
      .select('id')
      .eq('auth_user_id', user.id)
      .maybeSingle()

    if (advisorError || !advisor) return

    const eventData = {
      ...eventData,
      timestamp: new Date().toISOString(),
      user_agent: navigator.userAgent,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
    }

    const { error } = await supabase
      .from('pilot_events')
      .insert({
        advisor_id: advisor.id,
        event_type: eventType,
        event_data: eventData,
      })

    if (error) {
      console.warn('Failed to log pilot event:', error.message)
    }
  } catch (err) {
    console.warn('Failed to log pilot event:', err)
  }
}

export type SupabaseClient = typeof supabase