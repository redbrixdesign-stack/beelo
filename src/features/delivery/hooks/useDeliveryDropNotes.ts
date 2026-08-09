// useDeliveryDropNotes - Dexie CRUD for delivery drop notes

import { useState, useEffect, useCallback } from 'react'
import { db } from '@lib/dexie'
import { useAuth } from '@hooks/useAuth'
import { enqueueSync } from '@lib/sync'
import { getDefaultSourceEnv } from '@lib/dexie'
import type { DeliveryDropNoteDexie } from '@lib/dexie'

interface UseDeliveryDropNotesReturn {
  deliveryDropNotes: DeliveryDropNoteDexie[]
  loading: boolean
  error: string | null
  loadDeliveryDropNotes: () => Promise<void>
  createDeliveryDropNote: (note: Omit<DeliveryDropNoteDexie, 'id' | 'advisorId' | 'createdAt' | 'updatedAt'>) => Promise<number>
  updateDeliveryDropNote: (id: number, updates: Partial<DeliveryDropNoteDexie>) => Promise<void>
  deleteDeliveryDropNote: (id: number) => Promise<void>
  getDeliveryDropNote: (id: number) => Promise<DeliveryDropNoteDexie | undefined>
}

export function useDeliveryDropNotes(): UseDeliveryDropNotesReturn {
  const { user } = useAuth()
  const [deliveryDropNotes, setDeliveryDropNotes] = useState<DeliveryDropNoteDexie[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const advisorId = user?.id ? parseInt(user.id) : 0

  const loadDeliveryDropNotes = useCallback(async () => {
    if (!advisorId) return
    setLoading(true)
    setError(null)
    try {
      const data = await db.deliveryDropNotes
        .where('advisorId')
        .equals(advisorId)
        .reverse()
        .sortBy('createdAt')
      setDeliveryDropNotes(data)
    } catch {
      setError('Failed to load delivery drop notes')
    } finally {
      setLoading(false)
    }
  }, [advisorId])

  const createDeliveryDropNote = useCallback(async (note: Omit<DeliveryDropNoteDexie, 'id' | 'advisorId' | 'createdAt' | 'updatedAt'>) => {
    if (!advisorId) throw new Error('No advisor')
    const now = new Date()
    const sourceEnv = getDefaultSourceEnv()
    const localId = await db.deliveryDropNotes.add({
      ...note,
      advisorId,
      sourceEnv,
      createdAt: now,
      updatedAt: now,
    } as DeliveryDropNoteDexie)

    await enqueueSync('deliveryDropNotes', localId, 'create', {
      ...note,
      advisor_id: advisorId,
      source_env: sourceEnv,
    })

    await loadDeliveryDropNotes()
    return localId
  }, [advisorId, loadDeliveryDropNotes])

  const updateDeliveryDropNote = useCallback(async (id: number, updates: Partial<DeliveryDropNoteDexie>) => {
    if (!advisorId) throw new Error('No advisor')
    await db.deliveryDropNotes.update(id, { ...updates, updatedAt: new Date() })
    await enqueueSync('deliveryDropNotes', id, 'update', updates)
    await loadDeliveryDropNotes()
  }, [advisorId, loadDeliveryDropNotes])

  const deleteDeliveryDropNote = useCallback(async (id: number) => {
    if (!advisorId) throw new Error('No advisor')
    await db.deliveryDropNotes.delete(id)
    await enqueueSync('deliveryDropNotes', id, 'delete', {})
    await loadDeliveryDropNotes()
  }, [advisorId, loadDeliveryDropNotes])

  const getDeliveryDropNote = useCallback(async (id: number) => {
    return db.deliveryDropNotes.get(id)
  }, [])

  useEffect(() => {
    loadDeliveryDropNotes()
  }, [loadDeliveryDropNotes])

  return {
    deliveryDropNotes,
    loading,
    error,
    loadDeliveryDropNotes,
    createDeliveryDropNote,
    updateDeliveryDropNote,
    deleteDeliveryDropNote,
    getDeliveryDropNote,
  }
}