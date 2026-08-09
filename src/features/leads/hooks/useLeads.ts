// useLeads - Dexie CRUD for leads, call attempts, and voice notes

import { useState, useEffect, useCallback } from 'react'
import { db } from '@lib/dexie'
import { useAuth } from '@hooks/useAuth'
import { enqueueSync } from '@lib/sync'
import { getDefaultSourceEnv } from '@lib/dexie'
import type { LeadDexie, CallAttemptDexie, VoiceNoteDexie } from '@lib/dexie'

interface UseLeadsReturn {
  leads: LeadDexie[]
  loading: boolean
  error: string | null
  loadLeads: () => Promise<void>
  createLead: (lead: Omit<LeadDexie, 'id' | 'advisorId' | 'createdAt' | 'updatedAt'>) => Promise<number>
  updateLead: (id: number, updates: Partial<LeadDexie>) => Promise<void>
  deleteLead: (id: number) => Promise<void>
  getLead: (id: number) => Promise<LeadDexie | undefined>
  callAttempts: CallAttemptDexie[]
  loadCallAttempts: (leadId: number) => Promise<void>
  createCallAttempt: (attempt: Omit<CallAttemptDexie, 'id' | 'createdAt'>) => Promise<number>
  voiceNotes: VoiceNoteDexie[]
  loadVoiceNotes: () => Promise<void>
  createVoiceNote: (note: Omit<VoiceNoteDexie, 'id' | 'advisorId' | 'createdAt' | 'updatedAt'>) => Promise<number>
  updateVoiceNote: (id: number, updates: Partial<VoiceNoteDexie>) => Promise<void>
}

export function useLeads(): UseLeadsReturn {
  const { advisor } = useAuth()
  const [leads, setLeads] = useState<LeadDexie[]>([])
  const [callAttempts, setCallAttempts] = useState<CallAttemptDexie[]>([])
  const [voiceNotes, setVoiceNotes] = useState<VoiceNoteDexie[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const advisorId = advisor?.id ?? 0

  const loadLeads = useCallback(async () => {
    if (!advisorId) return
    setLoading(true)
    setError(null)
    try {
      const data = await db.leads.where('advisorId').equals(advisorId).reverse().sortBy('landedAt')
      setLeads(data)
    } catch {
      setError('Failed to load leads')
    } finally {
      setLoading(false)
    }
  }, [advisorId])

  const createLead = useCallback(async (lead: Omit<LeadDexie, 'id' | 'advisorId' | 'createdAt' | 'updatedAt'>) => {
    if (!advisorId) throw new Error('No advisor')
    const now = new Date()
    const sourceEnv = getDefaultSourceEnv()
    const localId = await db.leads.add({
      ...lead,
      advisorId,
      sourceEnv,
      createdAt: now,
      updatedAt: now,
    } as LeadDexie)

    await enqueueSync('leads', localId, 'create', {
      ...lead,
      advisor_id: advisorId,
      source_env: sourceEnv,
    })

    await loadLeads()
    return localId
  }, [advisorId, loadLeads])

  const updateLead = useCallback(async (id: number, updates: Partial<LeadDexie>) => {
    if (!advisorId) throw new Error('No advisor')
    await db.leads.update(id, { ...updates, updatedAt: new Date() })
    await enqueueSync('leads', id, 'update', updates)
    await loadLeads()
  }, [advisorId, loadLeads])

  const deleteLead = useCallback(async (id: number) => {
    if (!advisorId) throw new Error('No advisor')
    await db.leads.delete(id)
    await enqueueSync('leads', id, 'delete', {})
    await loadLeads()
  }, [advisorId, loadLeads])

  const getLead = useCallback(async (id: number) => {
    return db.leads.get(id)
  }, [])

  const loadCallAttempts = useCallback(async (leadId: number) => {
    if (!advisorId) return
    try {
      const data = await db.callAttempts.where('leadId').equals(leadId).reverse().sortBy('initiatedAt')
      setCallAttempts(data)
    } catch {
      setError('Failed to load call attempts')
    }
  }, [advisorId])

  const createCallAttempt = useCallback(async (attempt: Omit<CallAttemptDexie, 'id' | 'createdAt'>) => {
    if (!advisorId) throw new Error('No advisor')
    const now = new Date()
    const localId = await db.callAttempts.add({
      ...attempt,
      createdAt: now,
    } as CallAttemptDexie)

    await enqueueSync('callAttempts', localId, 'create', {
      ...attempt,
    })

    return localId
  }, [advisorId])

  const loadVoiceNotes = useCallback(async () => {
    if (!advisorId) return
    try {
      const data = await db.voiceNotes.where('advisorId').equals(advisorId).reverse().sortBy('recordedAt')
      setVoiceNotes(data)
    } catch {
      setError('Failed to load voice notes')
    }
  }, [advisorId])

  const createVoiceNote = useCallback(async (note: Omit<VoiceNoteDexie, 'id' | 'advisorId' | 'createdAt' | 'updatedAt'>) => {
    if (!advisorId) throw new Error('No advisor')
    const now = new Date()
    const sourceEnv = getDefaultSourceEnv()
    const localId = await db.voiceNotes.add({
      ...note,
      advisorId,
      sourceEnv,
      createdAt: now,
      updatedAt: now,
    } as VoiceNoteDexie)

    await enqueueSync('voiceNotes', localId, 'create', {
      ...note,
      advisor_id: advisorId,
      source_env: sourceEnv,
    })

    await loadVoiceNotes()
    return localId
  }, [advisorId, loadVoiceNotes])

  const updateVoiceNote = useCallback(async (id: number, updates: Partial<VoiceNoteDexie>) => {
    if (!advisorId) throw new Error('No advisor')
    await db.voiceNotes.update(id, { ...updates, updatedAt: new Date() })
    await enqueueSync('voiceNotes', id, 'update', updates)
    await loadVoiceNotes()
  }, [advisorId, loadVoiceNotes])

  useEffect(() => {
    loadLeads()
    loadVoiceNotes()
  }, [loadLeads, loadVoiceNotes])

  return {
    leads,
    loading,
    error,
    loadLeads,
    createLead,
    updateLead,
    deleteLead,
    getLead,
    callAttempts,
    loadCallAttempts,
    createCallAttempt,
    voiceNotes,
    loadVoiceNotes,
    createVoiceNote,
    updateVoiceNote,
  }
}