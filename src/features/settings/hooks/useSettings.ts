// useSettings - Dexie CRUD for settings

import { useState, useEffect, useCallback } from 'react'
import { db } from '@lib/dexie'
import { useAuth } from '@hooks/useAuth'
import { enqueueSync } from '@lib/sync'
import { getDefaultSourceEnv } from '@lib/dexie'
import type { SettingDexie } from '@lib/dexie'

const DEFAULT_SETTINGS = {
  hmrcMileageRateTier1: 0.55,
  hmrcMileageRateTier2: 0.25,
  hmrcMileageThresholdMiles: 10000,
  installOnlyMinutesPerBlind: 16,
  fullJobMinutesPerBlind: 33,
  weeklyEarningsTarget: null,
  vatAdjustmentPercent: 20.00,
  taxReservePercent: 25.00,
  commissionRatePercent: 15.25,
  sourceEnv: 'live',
}

export function useSettings() {
  const { advisor } = useAuth()
  const [settings, setSettings] = useState<Record<string, any>>(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const advisorId = advisor?.id ?? 0

  const loadSettings = useCallback(async () => {
    if (!advisorId) return
    setLoading(true)
    try {
      const records = await db.settings.where('advisorId').equals(advisorId).toArray()
      const merged = { ...DEFAULT_SETTINGS }
      for (const record of records) {
        let value: any = record.value
        try {
          value = JSON.parse(record.value)
        } catch {
          // Keep as string if not JSON
        }
        merged[record.key] = value
      }
      setSettings(merged)
    } catch (err) {
      console.error('Failed to load settings:', err)
    } finally {
      setLoading(false)
    }
  }, [advisorId])

  const updateSetting = useCallback(async (key: string, value: any) => {
    if (!advisorId) throw new Error('No advisor')
    setSaving(true)
    try {
      const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value)
      
      await db.settings.put({
        advisorId,
        key,
        value: stringValue,
        sourceEnv: getDefaultSourceEnv(),
        updatedAt: new Date(),
      } as SettingDexie)

      await enqueueSync('settings', `${advisorId}-${key}`, 'upsert', {
        advisor_id: advisorId,
        key,
        value: stringValue,
        source_env: getDefaultSourceEnv(),
      })

      setSettings(prev => ({ ...prev, [key]: value }))
    } catch (err) {
      console.error('Failed to update setting:', err)
      throw err
    } finally {
      setSaving(false)
    }
  }, [advisorId])

  useEffect(() => {
    loadSettings()
  }, [loadSettings])

  return {
    settings,
    loading,
    saving,
    updateSetting,
    refresh: loadSettings,
  }
}