import { supabase } from './supabase'
import { db, type AdvisorDexie, getDefaultSourceEnv } from './dexie'
import type { AdvisorProfile } from './validation'

export async function signUp(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({ email, password })
  if (error) throw error
  return data
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

export async function signInWithMagicLink(email: string) {
  const { data, error } = await supabase.auth.signInWithOtp({ email })
  if (error) throw error
  return data
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession()
  return session
}

export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function onAuthStateChange(callback: (event: string, session: unknown) => void) {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(callback)
  return subscription
}

export async function createAdvisorProfile(profile: AdvisorProfile, authUserId: string) {
  const sourceEnv = getDefaultSourceEnv()
  const now = new Date()
  
  const advisor: Omit<AdvisorDexie, 'id'> = {
    authUserId,
    businessName: profile.businessName,
    employmentModel: profile.employmentModel,
    baseLocation: profile.baseLocation,
    workingPreferences: profile.workingPreferences ?? {},
    commissionRatePercent: profile.commissionRatePercent,
    vatAdjustmentPercent: profile.vatAdjustmentPercent,
    taxReservePercent: profile.taxReservePercent,
    installOnlyMinutesPerBlind: profile.installOnlyMinutesPerBlind,
    fullJobMinutesPerBlind: profile.fullJobMinutesPerBlind,
    weeklyEarningsTarget: profile.weeklyEarningsTarget,
    hmrcMileageRateTier1: profile.hmrcMileageRateTier1,
    hmrcMileageRateTier2: profile.hmrcMileageRateTier2,
    hmrcMileageThresholdMiles: profile.hmrcMileageThresholdMiles,
    consentStatus: profile.consentStatus ?? 'pending',
    sourceEnv,
    createdAt: now,
    updatedAt: now
  }

  const localId = await db.advisors.add(advisor as AdvisorDexie)
  return { ...advisor, id: localId }
}

export async function getAdvisorByAuthUserId(authUserId: string) {
  return db.advisors.where('authUserId').equals(authUserId).first()
}

export async function getAdvisorById(id: number) {
  return db.advisors.get(id)
}

export async function updateAdvisorProfile(id: number, updates: Partial<AdvisorProfile>) {
  const now = new Date()
  const payload = { ...updates, updatedAt: now }
  await db.advisors.update(id, payload)
  return db.advisors.get(id)
}

export async function syncAdvisorToSupabase(advisor: AdvisorDexie) {
  const { error } = await supabase
    .from('advisors')
    .upsert({
      id: advisor.id,
      auth_user_id: advisor.authUserId,
      business_name: advisor.businessName,
      employment_model: advisor.employmentModel,
      base_location: advisor.baseLocation,
      working_preferences: advisor.workingPreferences,
      commission_rate_percent: advisor.commissionRatePercent,
      vat_adjustment_percent: advisor.vatAdjustmentPercent,
      tax_reserve_percent: advisor.taxReservePercent,
      install_only_minutes_per_blind: advisor.installOnlyMinutesPerBlind,
      full_job_minutes_per_blind: advisor.fullJobMinutesPerBlind,
      weekly_earnings_target: advisor.weeklyEarningsTarget,
      hmrc_mileage_rate_tier1: advisor.hmrcMileageRateTier1,
      hmrc_mileage_rate_tier2: advisor.hmrcMileageRateTier2,
      hmrc_mileage_threshold_miles: advisor.hmrcMileageThresholdMiles,
      consent_status: advisor.consentStatus,
      source_env: advisor.sourceEnv,
      created_at: advisor.createdAt.toISOString(),
      updated_at: advisor.updatedAt.toISOString()
    }, { onConflict: 'id' })
  
  if (error) throw error
  return true
}