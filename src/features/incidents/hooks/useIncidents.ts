// useIncidents - Dexie CRUD for incidents

import { useState, useEffect, useCallback } from 'react'
import { db } from '@lib/dexie'
import { useAuth } from '@hooks/useAuth'
import { enqueueSync } from '@lib/sync'
import { getDefaultSourceEnv } from '@lib/dexie'
import type { IncidentDexie } from '@lib/dexie'

interface UseIncidentsReturn {
  incidents: IncidentDexie[]
  loading: boolean
  error: string | null
  loadIncidents: () => Promise<void>
  createIncident: (incident: Omit<IncidentDexie, 'id' | 'advisorId' | 'createdAt' | 'updatedAt'>) => Promise<number>
  updateIncident: (id: number, updates: Partial<IncidentDexie>) => Promise<void>
  deleteIncident: (id: number) => Promise<void>
  getIncident: (id: number) => Promise<IncidentDexie | undefined>
}

export function useIncidents(): UseIncidentsReturn {
  const { user } = useAuth()
  const [incidents, setIncidents] = useState<IncidentDexie[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const advisorId = user?.id ? parseInt(user.id) : 0

  const loadIncidents = useCallback(async () => {
    if (!advisorId) return
    setLoading(true)
    setError(null)
    try {
      const data = await db.incidents.where('advisorId').equals(advisorId).reverse().sortBy('discoveredAt')
      setIncidents(data)
    } catch {
      setError('Failed to load incidents')
    } finally {
      setLoading(false)
    }
  }, [advisorId])

  const createIncident = useCallback(async (incident: Omit<IncidentDexie, 'id' | 'advisorId' | 'createdAt' | 'updatedAt'>) => {
    if (!advisorId) throw new Error('No advisor')
    const now = new Date()
    const sourceEnv = getDefaultSourceEnv()
    const localId = await db.incidents.add({
      ...incident,
      advisorId,
      sourceEnv,
      createdAt: now,
      updatedAt: now,
    } as IncidentDexie)

    await enqueueSync('incidents', localId, 'create', {
      ...incident,
      advisor_id: advisorId,
      source_env: sourceEnv,
    })

    await loadIncidents()
    return localId
  }, [advisorId, loadIncidents])

  const updateIncident = useCallback(async (id: number, updates: Partial<IncidentDexie>) => {
    if (!advisorId) throw new Error('No advisor')
    await db.incidents.update(id, { ...updates, updatedAt: new Date() })
    await enqueueSync('incidents', id, 'update', updates)
    await loadIncidents()
  }, [advisorId, loadIncidents])

  const deleteIncident = useCallback(async (id: number) => {
    if (!advisorId) throw new Error('No advisor')
    await db.incidents.delete(id)
    await enqueueSync('incidents', id, 'delete', {})
    await loadIncidents()
  }, [advisorId, loadIncidents])

  const getIncident = useCallback(async (id: number) => {
    return db.incidents.get(id)
  }, [])

  useEffect(() => {
    loadIncidents()
  }, [loadIncidents])

  return {
    incidents,
    loading,
    error,
    loadIncidents,
    createIncident,
    updateIncident,
    deleteIncident,
    getIncident,
  }
}