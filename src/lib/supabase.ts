import { createClient } from '@supabase/supabase-js'
import { db } from './dexie'
import { getDefaultSourceEnv } from './dexie'

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

// Pilot event logging - lightweight, PII-free
// Stores locally in Dexie (offline-first), then syncs to Supabase when online
export async function logPilotEvent(
  eventType: PilotEventType,
  eventData: Record<string, unknown> = {}
): Promise<void> {
  const sourceEnv = getDefaultSourceEnv()
  const now = new Date()
  
  // Get advisor ID from local Dexie (works offline)
  let advisorId: number | null = null
  try {
    const advisors = await db.advisors.toArray()
    if (advisors.length > 0) {
      advisorId = advisors[0].id ?? null
    }
  } catch {
    console.warn('Failed to get advisor from local DB')
  }
  
  if (!advisorId) {
    // No advisor configured yet, skip silently
    return
  }

  // Prepare event data with metadata
  const fullEventData = {
    ...eventData,
    timestamp: now.toISOString(),
    user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
    viewport: typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight}` : 'unknown',
  }

  // Store locally in Dexie (works offline)
  try {
    await db.pilotEvents.add({
      advisorId,
      eventType,
      eventData: fullEventData,
      sourceEnv,
      createdAt: now,
      synced: false,
    })
  } catch (err) {
    console.warn('Failed to log pilot event locally:', err)
  }

  // Also try to sync to Supabase if online
  if (navigator.onLine) {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: advisor, error: advisorError } = await supabase
          .from('advisors')
          .select('id')
          .eq('auth_user_id', user.id)
          .maybeSingle()

        if (!advisorError && advisor) {
          const { error } = await supabase
            .from('pilot_events')
            .insert({
              advisor_id: advisor.id,
              event_type: eventType,
              event_data: fullEventData,
            })

          if (error) {
            console.warn('Failed to log pilot event to Supabase:', error.message)
          } else {
            // Mark local event as synced
            try {
              const localEvents = await db.pilotEvents
                .where('advisorId')
                .equals(advisorId)
                .and(e => e.eventType === eventType && e.synced === false)
                .reverse()
                .limit(1)
                .toArray()
              if (localEvents.length > 0) {
                await db.pilotEvents.update(localEvents[0].id!, { synced: true })
              }
            } catch {
              // Ignore local update errors
            }
          }
        }
      }
    } catch (err) {
      console.warn('Failed to log pilot event to Supabase:', err)
    }
  }
}

export type SupabaseClient = typeof supabase