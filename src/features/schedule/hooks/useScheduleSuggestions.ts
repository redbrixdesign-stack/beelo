// useScheduleSuggestions - Dexie CRUD for schedule suggestions

import { useState, useEffect, useCallback } from 'react'
import { db } from '@lib/dexie'
import { useAuth } from '@hooks/useAuth'
import { enqueueSync } from '@lib/sync'
import { getDefaultSourceEnv } from '@lib/dexie'
import type { ScheduleSuggestionDexie } from '@lib/dexie'

interface UseScheduleSuggestionsReturn {
  suggestions: ScheduleSuggestionDexie[]
  loading: boolean
  error: string | null
  loadSuggestions: () => Promise<void>
  createSuggestion: (suggestion: Omit<ScheduleSuggestionDexie, 'id' | 'advisorId' | 'createdAt' | 'updatedAt'>) => Promise<number>
  updateSuggestion: (id: number, updates: Partial<ScheduleSuggestionDexie>) => Promise<void>
  deleteSuggestion: (id: number) => Promise<void>
  acceptSuggestion: (id: number) => Promise<void>
  dismissSuggestion: (id: number) => Promise<void>
}

export function useScheduleSuggestions(): UseScheduleSuggestionsReturn {
  const { user } = useAuth()
  const [suggestions, setSuggestions] = useState<ScheduleSuggestionDexie[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const advisorId = user?.id ? parseInt(user.id) : 0

  const loadSuggestions = useCallback(async () => {
    if (!advisorId) return
    setLoading(true)
    setError(null)
    try {
      const data = await db.scheduleSuggestions
        .where('advisorId')
        .equals(advisorId)
        .reverse()
        .sortBy('date')
      setSuggestions(data)
    } catch {
      setError('Failed to load schedule suggestions')
    } finally {
      setLoading(false)
    }
  }, [advisorId])

  const createSuggestion = useCallback(async (suggestion: Omit<ScheduleSuggestionDexie, 'id' | 'advisorId' | 'createdAt' | 'updatedAt'>) => {
    if (!advisorId) throw new Error('No advisor')
    const now = new Date()
    const sourceEnv = getDefaultSourceEnv()
    const localId = await db.scheduleSuggestions.add({
      ...suggestion,
      advisorId,
      sourceEnv,
      createdAt: now,
      updatedAt: now,
    })

    await enqueueSync('scheduleSuggestions', localId, 'create', {
      ...suggestion,
      advisor_id: advisorId,
      source_env: sourceEnv,
    })

    await loadSuggestions()
    return localId
  }, [advisorId, loadSuggestions])

  const updateSuggestion = useCallback(async (id: number, updates: Partial<ScheduleSuggestionDexie>) => {
    if (!advisorId) throw new Error('No advisor')
    await db.scheduleSuggestions.update(id, { ...updates, updatedAt: new Date() })
    await enqueueSync('scheduleSuggestions', id, 'update', updates)
    await loadSuggestions()
  }, [advisorId, loadSuggestions])

  const deleteSuggestion = useCallback(async (id: number) => {
    if (!advisorId) throw new Error('No advisor')
    await db.scheduleSuggestions.delete(id)
    await enqueueSync('scheduleSuggestions', id, 'delete', {})
    await loadSuggestions()
  }, [advisorId, loadSuggestions])

  const acceptSuggestion = useCallback(async (id: number) => {
    await updateSuggestion(id, { status: 'accepted', updatedAt: new Date() })
  }, [updateSuggestion])

  const dismissSuggestion = useCallback(async (id: number) => {
    await updateSuggestion(id, { status: 'dismissed', updatedAt: new Date() })
  }, [updateSuggestion])

  useEffect(() => {
    loadSuggestions()
  }, [loadSuggestions])

  return {
    suggestions,
    loading,
    error,
    loadSuggestions,
    createSuggestion,
    updateSuggestion,
    deleteSuggestion,
    acceptSuggestion,
    dismissSuggestion,
  }
}

import { useState, useEffect, useCallback } from 'react'
import { db } from '@lib/dexie'
import { useAuth } from '@hooks/useAuth'
import { enqueueSync } from '@lib/sync'
import { getDefaultSourceEnv } from '@lib/dexie'
import type { ScheduleSuggestionDexie } from '@lib/dexie'