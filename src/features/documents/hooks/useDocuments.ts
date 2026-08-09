// useDocuments - Dexie CRUD for documents and OCR line items

import { useState, useEffect, useCallback } from 'react'
import { db } from '@lib/dexie'
import { useAuth } from '@hooks/useAuth'
import { enqueueSync } from '@lib/sync'
import { getDefaultSourceEnv } from '@lib/dexie'
import type { DocumentDexie, QuoteLineItemDexie, CommissionLineItemDexie, FitLineItemDexie } from '@lib/dexie'

interface UseDocumentsReturn {
  documents: DocumentDexie[]
  loading: boolean
  error: string | null
  loadDocuments: () => Promise<void>
  createDocument: (doc: Omit<DocumentDexie, 'id' | 'advisorId' | 'createdAt' | 'updatedAt'>) => Promise<number>
  updateDocument: (id: number, updates: Partial<DocumentDexie>) => Promise<void>
  deleteDocument: (id: number) => Promise<void>
  getDocument: (id: number) => Promise<DocumentDexie | undefined>
  quoteLineItems: QuoteLineItemDexie[]
  loadQuoteLineItems: (documentId: number) => Promise<void>
  createQuoteLineItem: (item: Omit<QuoteLineItemDexie, 'id' | 'createdAt'>) => Promise<number>
  commissionLineItems: CommissionLineItemDexie[]
  loadCommissionLineItems: (documentId: number) => Promise<void>
  createCommissionLineItem: (item: Omit<CommissionLineItemDexie, 'id' | 'createdAt'>) => Promise<number>
  fitLineItems: FitLineItemDexie[]
  loadFitLineItems: (documentId: number) => Promise<void>
  createFitLineItem: (item: Omit<FitLineItemDexie, 'id' | 'createdAt'>) => Promise<number>
}

export function useDocuments(): UseDocumentsReturn {
  const { advisor } = useAuth()
  const [documents, setDocuments] = useState<DocumentDexie[]>([])
  const [quoteLineItems, setQuoteLineItems] = useState<QuoteLineItemDexie[]>([])
  const [commissionLineItems, setCommissionLineItems] = useState<CommissionLineItemDexie[]>([])
  const [fitLineItems, setFitLineItems] = useState<FitLineItemDexie[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const advisorId = advisor?.id ?? 0

  const loadDocuments = useCallback(async () => {
    if (!advisorId) return
    setLoading(true)
    setError(null)
    try {
      const data = await db.documents.where('advisorId').equals(advisorId).reverse().sortBy('createdAt')
      setDocuments(data)
    } catch {
      setError('Failed to load documents')
    } finally {
      setLoading(false)
    }
  }, [advisorId])

  const createDocument = useCallback(async (doc: Omit<DocumentDexie, 'id' | 'advisorId' | 'createdAt' | 'updatedAt'>) => {
    if (!advisorId) throw new Error('No advisor')
    const now = new Date()
    const sourceEnv = getDefaultSourceEnv()
    try {
      const localId = await db.documents.add({
        ...doc,
        advisorId,
        sourceEnv,
        createdAt: now,
        updatedAt: now,
      } as DocumentDexie)

      await enqueueSync('documents', localId, 'create', {
        ...doc,
        advisor_id: advisorId,
        source_env: sourceEnv,
      })

      await loadDocuments()
      return localId
    } catch (err) {
      console.error('Failed to create document:', err)
      throw new Error(`Failed to save document: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }, [advisorId, loadDocuments])

  const updateDocument = useCallback(async (id: number, updates: Partial<DocumentDexie>) => {
    if (!advisorId) throw new Error('No advisor')
    await db.documents.update(id, { ...updates, updatedAt: new Date() })
    await enqueueSync('documents', id, 'update', updates)
    await loadDocuments()
  }, [advisorId, loadDocuments])

  const deleteDocument = useCallback(async (id: number) => {
    if (!advisorId) throw new Error('No advisor')
    await db.documents.delete(id)
    await enqueueSync('documents', id, 'delete', {})
    await loadDocuments()
  }, [advisorId, loadDocuments])

  const getDocument = useCallback(async (id: number) => {
    return db.documents.get(id)
  }, [])

  const loadQuoteLineItems = useCallback(async (documentId: number) => {
    try {
      const data = await db.quoteLineItems.where('documentId').equals(documentId).toArray()
      setQuoteLineItems(data)
    } catch {
      setError('Failed to load quote line items')
    }
  }, [])

  const createQuoteLineItem = useCallback(async (item: Omit<QuoteLineItemDexie, 'id' | 'createdAt'>) => {
    if (!advisorId) throw new Error('No advisor')
    const now = new Date()
    const localId = await db.quoteLineItems.add({
      ...item,
      createdAt: now,
    } as QuoteLineItemDexie)

    await enqueueSync('quoteLineItems', localId, 'create', item)

    return localId
  }, [advisorId])

  const loadCommissionLineItems = useCallback(async (documentId: number) => {
    try {
      const data = await db.commissionLineItems.where('commissionStatementDocumentId').equals(documentId).toArray()
      setCommissionLineItems(data)
    } catch {
      setError('Failed to load commission line items')
    }
  }, [])

  const createCommissionLineItem = useCallback(async (item: Omit<CommissionLineItemDexie, 'id' | 'createdAt'>) => {
    if (!advisorId) throw new Error('No advisor')
    const now = new Date()
    const localId = await db.commissionLineItems.add({
      ...item,
      createdAt: now,
    } as CommissionLineItemDexie)

    await enqueueSync('commissionLineItems', localId, 'create', item)

    return localId
  }, [advisorId])

  const loadFitLineItems = useCallback(async (documentId: number) => {
    try {
      const data = await db.fitLineItems.where('documentId').equals(documentId).toArray()
      setFitLineItems(data)
    } catch {
      setError('Failed to load fit line items')
    }
  }, [])

  const createFitLineItem = useCallback(async (item: Omit<FitLineItemDexie, 'id' | 'createdAt'>) => {
    if (!advisorId) throw new Error('No advisor')
    const now = new Date()
    const localId = await db.fitLineItems.add({
      ...item,
      createdAt: now,
    } as FitLineItemDexie)

    await enqueueSync('fitLineItems', localId, 'create', item)

    return localId
  }, [advisorId])

  useEffect(() => {
    loadDocuments()
  }, [loadDocuments])

  return {
    documents,
    loading,
    error,
    loadDocuments,
    createDocument,
    updateDocument,
    deleteDocument,
    getDocument,
    quoteLineItems,
    loadQuoteLineItems,
    createQuoteLineItem,
    commissionLineItems,
    loadCommissionLineItems,
    createCommissionLineItem,
    fitLineItems,
    loadFitLineItems,
    createFitLineItem,
  }
}