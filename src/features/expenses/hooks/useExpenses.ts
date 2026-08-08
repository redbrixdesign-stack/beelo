// useExpenses - Dexie CRUD for expenses

import { useState, useEffect, useCallback } from 'react'
import { db } from '@lib/dexie'
import { useAuth } from '@hooks/useAuth'
import { enqueueSync } from '@lib/sync'
import { getDefaultSourceEnv } from '@lib/dexie'
import type { ExpenseDexie } from '@lib/dexie'

interface UseExpensesReturn {
  expenses: ExpenseDexie[]
  loading: boolean
  error: string | null
  loadExpenses: () => Promise<void>
  createExpense: (expense: Omit<ExpenseDexie, 'id' | 'advisorId' | 'createdAt' | 'updatedAt'>) => Promise<number>
  updateExpense: (id: number, updates: Partial<ExpenseDexie>) => Promise<void>
  deleteExpense: (id: number) => Promise<void>
  getExpense: (id: number) => Promise<ExpenseDexie | undefined>
  getTotalByCategory: () => Promise<Record<string, number>>
  getTotalByMonth: () => Promise<Record<string, number>>
}

export function useExpenses(): UseExpensesReturn {
  const { user } = useAuth()
  const [expenses, setExpenses] = useState<ExpenseDexie[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const advisorId = user?.id ? parseInt(user.id) : 0

  const loadExpenses = useCallback(async () => {
    if (!advisorId) return
    setLoading(true)
    setError(null)
    try {
      const data = await db.expenses.where('advisorId').equals(advisorId).reverse().sortBy('date')
      setExpenses(data)
    } catch {
      setError('Failed to load expenses')
    } finally {
      setLoading(false)
    }
  }, [advisorId])

  const createExpense = useCallback(async (expense: Omit<ExpenseDexie, 'id' | 'advisorId' | 'createdAt' | 'updatedAt'>) => {
    if (!advisorId) throw new Error('No advisor')
    const now = new Date()
    const sourceEnv = getDefaultSourceEnv()
    const localId = await db.expenses.add({
      ...expense,
      advisorId,
      sourceEnv,
      createdAt: now,
      updatedAt: now,
    } as ExpenseDexie)

    await enqueueSync('expenses', localId, 'create', {
      ...expense,
      advisor_id: advisorId,
      source_env: sourceEnv,
    })

    await loadExpenses()
    return localId
  }, [advisorId, loadExpenses])

  const updateExpense = useCallback(async (id: number, updates: Partial<ExpenseDexie>) => {
    if (!advisorId) throw new Error('No advisor')
    await db.expenses.update(id, { ...updates, updatedAt: new Date() })
    await enqueueSync('expenses', id, 'update', updates)
    await loadExpenses()
  }, [advisorId, loadExpenses])

  const deleteExpense = useCallback(async (id: number) => {
    if (!advisorId) throw new Error('No advisor')
    await db.expenses.delete(id)
    await enqueueSync('expenses', id, 'delete', {})
    await loadExpenses()
  }, [advisorId, loadExpenses])

  const getExpense = useCallback(async (id: number) => {
    return db.expenses.get(id)
  }, [])

  const getTotalByCategory = useCallback(async () => {
    if (!advisorId) return {}
    const data = await db.expenses.where('advisorId').equals(advisorId).toArray()
    const totals: Record<string, number> = {}
    for (const expense of data) {
      const cat = expense.category || 'other'
      totals[cat] = (totals[cat] || 0) + expense.amount
    }
    return totals
  }, [advisorId])

  const getTotalByMonth = useCallback(async () => {
    if (!advisorId) return {}
    const data = await db.expenses.where('advisorId').equals(advisorId).toArray()
    const totals: Record<string, number> = {}
    for (const expense of data) {
      const month = expense.date.toISOString().slice(0, 7) // YYYY-MM
      totals[month] = (totals[month] || 0) + expense.amount
    }
    return totals
  }, [advisorId])

  useEffect(() => {
    loadExpenses()
  }, [loadExpenses])

  return {
    expenses,
    loading,
    error,
    loadExpenses,
    createExpense,
    updateExpense,
    deleteExpense,
    getExpense,
    getTotalByCategory,
    getTotalByMonth,
  }
}