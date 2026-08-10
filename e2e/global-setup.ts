import { chromium, FullConfig } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'http://localhost:54321'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

async function globalSetup(config: FullConfig) {
  if (!supabaseServiceKey) {
    console.warn('SUPABASE_SERVICE_ROLE_KEY not set, skipping test user creation')
    return
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  const testEmail = `test-${Date.now()}@example.com`
  const testPassword = 'password123'

  // Create test user with confirmed email
  const { data, error } = await supabase.auth.admin.createUser({
    email: testEmail,
    password: testPassword,
    email_confirm: true,
    user_metadata: { full_name: 'Test User' }
  })

  if (error) {
    console.error('Failed to create test user:', error)
    return
  }

  console.log('Created test user:', testEmail)
  
  // Store credentials for tests
  process.env.TEST_USER_EMAIL = testEmail
  process.env.TEST_USER_PASSWORD = testPassword
}

export default globalSetup