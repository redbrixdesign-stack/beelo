// useSettings - Settings persistence and management

import { useState, useEffect, useCallback } from 'react'
import { db } from '@lib/dexie'
import { useAuth } from '@hooks/useAuth'
import { enqueueSync } from '@lib/sync'
import { getDefaultSourceEnv } from '@lib/dexie'
import type { SettingDexie, SettingKey } from '@lib/dexie'

interface SettingsState {
  hmrcMileageRateTier1: number
  hmrcMileageRateTier2: number
  hmrcMileageThresholdMiles: number
  installOnlyMinutesPerBlind: number
  fullJobMinutesPerBlind: number
  weeklyEarningsTarget: number | null
  vatAdjustmentPercent: number
  taxReservePercent: number
  commissionRatePercent: number
  sourceEnv: 'demo' | 'qa' | 'live'
}

const DEFAULT_SETTINGS: SettingsState = {
  hmrcMileageRateTier1: 55,
  hmrcMileageRateTier2: 25,
  hmrcMileageThresholdMiles: 10000,
  installOnlyMinutesPerBlind: 17,
  fullJobMinutesPerBlind: 33,
  weeklyEarningsTarget: null,
  vatAdjustmentPercent: 20,
  taxReservePercent: 20,
  commissionRatePercent: 15.25,
  sourceEnv: 'live',
}

export function useSettings() {
  const { user } = useAuth()
  const [settings, setSettings] = useState<SettingsState>(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const advisorId = user?.id ? parseInt(user.id) : 0

  const loadSettings = useCallback(async () => {
    if (!advisorId) return
    setLoading(true)
    try {
      const stored = await db.settings.where('advisorId').equals(advisorId).toArray()
      const loaded = { ...DEFAULT_SETTINGS }
      for (const setting of stored) {
        if (setting.key in loaded) {
          const value = setting.value
          // Type conversion
          if (typeof loaded[setting.key as keyof SettingsState] === 'number') {
            (loaded as any)[setting.key] = parseFloat(value)
          } else {
            (loaded as any)[setting.key] = value
          }
        }
      }
      setSettings(loaded)
    } catch {
      // Use defaults
    } finally {
      setLoading(false)
    }
  }, [advisorId])

  const updateSetting = useCallback(async (key: SettingKey, value: string | number) => {
    if (!advisorId) return
    setSaving(true)
    try {
      const existing = await db.settings.where({ advisorId, key }).first()
      const sourceEnv = (import.meta.env.VITE_SOURCE_ENV as any) || 'live'
      const now = new Date()

      if (existing) {
        await db.settings.update(existing.id!, { value: String(value), updatedAt: now })
      } else {
        await db.settings.add({
          advisorId,
          key,
          value: String(value),
          sourceEnv: (import.meta.env.VITE_SOURCE_ENV as any) || 'live',
          createdAt: now,
          updatedAt: now,
        })
      }

      await enqueueSync('settings', existing?.id || 0, existing ? 'update' : 'create', {
        key,
        value: String(value),
        source_env: (import.meta.env.VITE_SOURCE_ENV as any) || 'live',
      })

      setSettings(prev => ({ ...prev, [key]: value }))
    } catch (err) {
      console.error('Failed to update setting:', err)
    } finally {
      setSaving(false)
    }
  }, [advisorId])

  const resetToDefaults = useCallback(async () => {
    if (!advisorId) return
    setSaving(true)
    try {
      await db.settings.where('advisorId').equals(advisorId).delete()
      setSettings(DEFAULT_SETTINGS)
    } catch {
      // ignore
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
    resetToDefaults,
  }
}