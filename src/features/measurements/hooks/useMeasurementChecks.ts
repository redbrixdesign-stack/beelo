// useMeasurementChecks - Dexie CRUD for measurement checks

import { useState, useEffect, useCallback } from 'react'
import { db } from '@lib/dexie'
import { useAuth } from '@hooks/useAuth'
import { enqueueSync } from '@lib/sync'
import { getDefaultSourceEnv } from '@lib/dexie'
import type { MeasurementCheckDexie } from '@lib/dexie'

interface UseMeasurementChecksReturn {
  measurementChecks: MeasurementCheckDexie[]
  loading: boolean
  error: string | null
  loadMeasurementChecks: (visitId: number) => Promise<void>
  createMeasurementCheck: (check: Omit<MeasurementCheckDexie, 'id' | 'advisorId' | 'createdAt' | 'updatedAt'>) => Promise<number>
  updateMeasurementCheck: (id: number, updates: Partial<MeasurementCheckDexie>) => Promise<void>
  deleteMeasurementCheck: (id: number) => Promise<void>
  getMeasurementCheck: (id: number) => Promise<MeasurementCheckDexie | undefined>
  computeWorkingWidth: (top: number, middle: number, bottom: number) => number
  computeWorkingDrop: (left: number, middle: number, right: number) => number
  computeDiagonalDiff: (tlbr: number, trbl: number) => number
  isWithinTolerance: (diff: number, tolerance: number) => boolean
}

export function useMeasurementChecks(): UseMeasurementChecksReturn {
  const { advisor } = useAuth()
  const [measurementChecks, setMeasurementChecks] = useState<MeasurementCheckDexie[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const advisorId = advisor?.id ?? 0

  const loadMeasurementChecks = useCallback(async (visitId: number) => {
    if (!advisorId) return
    setLoading(true)
    setError(null)
    try {
      const data = await db.measurementChecks
        .where('visitId')
        .equals(visitId)
        .toArray()
      setMeasurementChecks(data)
    } catch {
      setError('Failed to load measurement checks')
    } finally {
      setLoading(false)
    }
  }, [advisorId])

  const createMeasurementCheck = useCallback(async (check: Omit<MeasurementCheckDexie, 'id' | 'advisorId' | 'createdAt' | 'updatedAt'>) => {
    if (!advisorId) throw new Error('No advisor')
    const now = new Date()
    const sourceEnv = getDefaultSourceEnv()
    const localId = await db.measurementChecks.add({
      ...check,
      advisorId,
      sourceEnv,
      createdAt: now,
      updatedAt: now,
    } as MeasurementCheckDexie)

    await enqueueSync('measurementChecks', localId, 'create', {
      ...check,
      advisor_id: advisorId,
      source_env: sourceEnv,
    })

    await loadMeasurementChecks(check.visitId)
    return localId
  }, [advisorId, loadMeasurementChecks])

  const updateMeasurementCheck = useCallback(async (id: number, updates: Partial<MeasurementCheckDexie>) => {
    if (!advisorId) throw new Error('No advisor')
    await db.measurementChecks.update(id, { ...updates, updatedAt: new Date() })
    await enqueueSync('measurementChecks', id, 'update', updates)
    // Reload to refresh computed fields
    const check = await db.measurementChecks.get(id)
    if (check) await loadMeasurementChecks(check.visitId)
  }, [advisorId, loadMeasurementChecks])

  const deleteMeasurementCheck = useCallback(async (id: number) => {
    if (!advisorId) throw new Error('No advisor')
    const check = await db.measurementChecks.get(id)
    await db.measurementChecks.delete(id)
    await enqueueSync('measurementChecks', id, 'delete', {})
    if (check) await loadMeasurementChecks(check.visitId)
  }, [advisorId, loadMeasurementChecks])

  const getMeasurementCheck = useCallback(async (id: number) => {
    return db.measurementChecks.get(id)
  }, [])

  // BusinessRules.md: Working width/drop is the MINIMUM of the three readings, not average
  const computeWorkingWidth = useCallback((top: number, middle: number, bottom: number): number => {
    return Math.min(top, middle, bottom)
  }, [])

  const computeWorkingDrop = useCallback((left: number, middle: number, right: number): number => {
    return Math.min(left, middle, right)
  }, [])

  const computeDiagonalDiff = useCallback((tlbr: number, trbl: number): number => {
    return Math.abs(tlbr - trbl)
  }, [])

  const isWithinTolerance = useCallback((diff: number, tolerance: number): boolean => {
    return diff <= tolerance
  }, [])

  return {
    measurementChecks,
    loading,
    error,
    loadMeasurementChecks,
    createMeasurementCheck,
    updateMeasurementCheck,
    deleteMeasurementCheck,
    getMeasurementCheck,
    computeWorkingWidth,
    computeWorkingDrop,
    computeDiagonalDiff,
    isWithinTolerance,
  }
}