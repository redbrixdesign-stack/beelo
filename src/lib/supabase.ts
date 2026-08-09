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

export type SupabaseClient = typeof supabase