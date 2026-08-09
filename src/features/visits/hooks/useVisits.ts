// useVisits - Dexie CRUD for visits

import { useState, useEffect, useCallback } from 'react'
import { db } from '@lib/dexie'
import { useAuth } from '@hooks/useAuth'
import { enqueueSync } from '@lib/sync'
import { getDefaultSourceEnv } from '@lib/dexie'
import type { VisitDexie } from '@lib/dexie'

interface UseVisitsReturn {
  visits: VisitDexie[]
  loading: boolean
  error: string | null
  loadVisits: () => Promise<void>
  createVisit: (visit: Omit<VisitDexie, 'id' | 'advisorId' | 'createdAt' | 'updatedAt'>) => Promise<number>
  updateVisit: (id: number, updates: Partial<VisitDexie>) => Promise<void>
  deleteVisit: (id: number) => Promise<void>
  getVisit: (id: number) => Promise<VisitDexie | undefined>
  getVisitByJobCode: (jobCode: string) => Promise<VisitDexie | undefined>
  getVisitsByDateRange: (start: Date, end: Date) => Promise<VisitDexie[]>
  getVisitsByCustomer: (customerId: number) => Promise<VisitDexie[]>
}

export function useVisits() {
  const { advisor } = useAuth()
  const [visits, setVisits] = useState<VisitDexie[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const advisorId = advisor?.id ?? 0

  const loadVisits = useCallback(async () => {
    if (!advisorId) return
    setLoading(true)
    setError(null)
    try {
      const data = await db.visits
        .where('advisorId')
        .equals(advisorId)
        .reverse()
        .sortBy('dateTime')
      setVisits(data)
    } catch {
      setError('Failed to load visits')
    } finally {
      setLoading(false)
    }
  }, [advisorId])

  const createVisit = useCallback(async (visit: Omit<VisitDexie, 'id' | 'advisorId' | 'createdAt' | 'updatedAt'>) => {
    if (!advisorId) throw new Error('No advisor')
    const now = new Date()
    const sourceEnv = getDefaultSourceEnv()
    const localId = await db.visits.add({
      ...visit,
      advisorId,
      sourceEnv,
      createdAt: now,
      updatedAt: now,
    } as any)

    await enqueueSync('visits', localId, 'create', {
      ...visit,
      advisor_id: advisorId,
      source_env: sourceEnv,
    })

    await loadVisits()
    return localId
  }, [advisorId, loadVisits])

  const updateVisit = useCallback(async (id: number, updates: Partial<VisitDexie>) => {
    if (!advisorId) throw new Error('No advisor')
    await db.visits.update(id, { ...updates, updatedAt: new Date() })
    await enqueueSync('visits', id, 'update', updates)
    await loadVisits()
  }, [advisorId, loadVisits])

  const deleteVisit = useCallback(async (id: number) => {
    if (!advisorId) throw new Error('No advisor')
    await db.visits.delete(id)
    await enqueueSync('visits', id, 'delete', {})
    await loadVisits()
  }, [advisorId, loadVisits])

  const getVisit = useCallback(async (id: number) => {
    return db.visits.get(id)
  }, [])

  const getVisitByJobCode = useCallback(async (jobCode: string) => {
    if (!advisorId) return undefined
    return db.visits
      .where('advisorId')
      .equals(advisorId)
      .and(v => v.jobCode === jobCode)
      .first()
  }, [advisorId])

  const getVisitsByDateRange = useCallback(async (start: Date, end: Date) => {
    if (!advisorId) return []
    return db.visits
      .where('advisorId')
      .equals(advisorId)
      .and(v => v.dateTime >= start && v.dateTime <= end)
      .toArray()
  }, [advisorId])

  const getVisitsByCustomer = useCallback(async (customerId: number) => {
    if (!advisorId) return []
    return db.visits
      .where('advisorId')
      .equals(advisorId)
      .and(v => v.customerId === customerId)
      .toArray()
  }, [advisorId])

  useEffect(() => {
    loadVisits()
  }, [loadVisits])

  return {
    visits,
    loading,
    error,
    loadVisits,
    createVisit,
    updateVisit,
    deleteVisit,
    getVisit,
    getVisitByJobCode,
    getVisitsByDateRange,
    getVisitsByCustomer,
  }
}