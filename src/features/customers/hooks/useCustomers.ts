// useCustomers - Dexie CRUD for customers

import { useState, useEffect, useCallback } from 'react'
import { db } from '@lib/dexie'
import { useAuth } from '@hooks/useAuth'
import { enqueueSync } from '@lib/sync'
import { getDefaultSourceEnv } from '@lib/dexie'
import type { CustomerDexie } from '@lib/dexie'

interface UseCustomersReturn {
  customers: CustomerDexie[]
  loading: boolean
  error: string | null
  loadCustomers: () => Promise<void>
  createCustomer: (customer: Omit<CustomerDexie, 'id' | 'advisorId' | 'createdAt' | 'updatedAt'>) => Promise<number>
  updateCustomer: (id: number, updates: Partial<CustomerDexie>) => Promise<void>
  deleteCustomer: (id: number) => Promise<void>
  getCustomer: (id: number) => Promise<CustomerDexie | undefined>
  getCustomerByNumber: (customerNumber: string) => Promise<CustomerDexie | undefined>
}

export function useCustomers() {
  const { advisor } = useAuth()
  const [customers, setCustomers] = useState<CustomerDexie[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const advisorId = advisor?.id ?? 0

  const loadCustomers = useCallback(async () => {
    if (!advisorId) return
    setLoading(true)
    setError(null)
    try {
      const data = await db.customers
        .where('advisorId')
        .equals(advisorId)
        .reverse()
        .sortBy('createdAt')
      setCustomers(data)
    } catch {
      setError('Failed to load customers')
    } finally {
      setLoading(false)
    }
  }, [advisorId])

  const createCustomer = useCallback(async (customer: Omit<CustomerDexie, 'id' | 'advisorId' | 'createdAt' | 'updatedAt'>) => {
    if (!advisorId) throw new Error('No advisor')
    const now = new Date()
    const sourceEnv = getDefaultSourceEnv()
    const localId = await db.customers.add({
      ...customer,
      advisorId,
      sourceEnv,
      createdAt: now,
      updatedAt: now,
    } as any)

    await enqueueSync('customers', localId, 'create', {
      ...customer,
      advisor_id: advisorId,
      source_env: sourceEnv,
    })

    await loadCustomers()
    return localId
  }, [advisorId, loadCustomers])

  const updateCustomer = useCallback(async (id: number, updates: Partial<CustomerDexie>) => {
    if (!advisorId) throw new Error('No advisor')
    await db.customers.update(id, { ...updates, updatedAt: new Date() })
    await enqueueSync('customers', id, 'update', updates)
    await loadCustomers()
  }, [advisorId, loadCustomers])

  const deleteCustomer = useCallback(async (id: number) => {
    if (!advisorId) throw new Error('No advisor')
    await db.customers.delete(id)
    await enqueueSync('customers', id, 'delete', {})
    await loadCustomers()
  }, [advisorId, loadCustomers])

  const getCustomer = useCallback(async (id: number) => {
    return db.customers.get(id)
  }, [])

  const getCustomerByNumber = useCallback(async (customerNumber: string) => {
    if (!advisorId) return undefined
    return db.customers
      .where('advisorId')
      .equals(advisorId)
      .and(c => c.customerNumber === customerNumber)
      .first()
  }, [advisorId])

  useEffect(() => {
    loadCustomers()
  }, [loadCustomers])

  return {
    customers,
    loading,
    error,
    loadCustomers,
    createCustomer,
    updateCustomer,
    deleteCustomer,
    getCustomer,
    getCustomerByNumber,
  }
}