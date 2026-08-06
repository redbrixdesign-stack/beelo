import { supabase } from './supabase'
import { db, type SyncQueueItem, getDefaultSourceEnv } from './dexie'

const SYNC_BATCH_SIZE = 50
const MAX_RETRIES = 3

let syncInProgress = false
let onlineListenerAdded = false

export function isOnline(): boolean {
  return navigator.onLine
}

export function addOnlineListener(onOnline: () => void, onOffline: () => void) {
  if (onlineListenerAdded) return
  
  window.addEventListener('online', onOnline)
  window.addEventListener('offline', onOffline)
  onlineListenerAdded = true
}

export function removeOnlineListener(onOnline: () => void, onOffline: () => void) {
  window.removeEventListener('online', onOnline)
  window.removeEventListener('offline', onOffline)
  onlineListenerAdded = false
}

export async function enqueueSync(
  entityType: string,
  entityId: number,
  operation: 'create' | 'update' | 'delete',
  payload: Record<string, unknown>
) {
  const item: Omit<SyncQueueItem, 'id'> = {
    entityType,
    entityId,
    operation,
    payload,
    status: 'pending',
    retryCount: 0,
    createdAt: new Date()
  }
  await db.syncQueue.add(item as SyncQueueItem)
}

export async function getPendingSyncCount(): Promise<number> {
  return db.syncQueue.where('status').anyOf('pending', 'failed').count()
}

export async function getSyncQueueItems(): Promise<SyncQueueItem[]> {
  return db.syncQueue.where('status').anyOf('pending', 'syncing', 'failed').toArray()
}

async function processSyncItem(item: SyncQueueItem): Promise<boolean> {
  const table = (supabase as any).from(item.entityType)
  
  try {
    await db.syncQueue.update(item.id!, { status: 'syncing' })
    
    let error: any = null
    
    switch (item.operation) {
      case 'create': {
        const { error: createError } = await table.insert({
          ...item.payload,
          source_env: getDefaultSourceEnv()
        })
        error = createError
        break
      }
      case 'update': {
        const { id, ...updates } = item.payload
        const { error: updateError } = await table
          .update({ ...updates, updated_at: new Date().toISOString() })
          .eq('id', id)
        error = updateError
        break
      }
      case 'delete': {
        const { error: deleteError } = await table
          .delete()
          .eq('id', item.entityId)
        error = deleteError
        break
      }
    }
    
    if (error) {
      throw error
    }
    
    await db.syncQueue.update(item.id!, { status: 'synced' })
    return true
  } catch (err) {
    const newRetryCount = item.retryCount + 1
    const update: Partial<SyncQueueItem> = {
      status: newRetryCount >= MAX_RETRIES ? 'failed' : 'pending',
      retryCount: newRetryCount,
      lastError: err instanceof Error ? err.message : 'Unknown error'
    }
    
    if (newRetryCount >= MAX_RETRIES) {
      update.status = 'failed'
    }
    
    await db.syncQueue.update(item.id!, update)
    return false
  }
}

export async function processSyncQueue(): Promise<{ processed: number; failed: number }> {
  if (syncInProgress || !isOnline()) {
    return { processed: 0, failed: 0 }
  }
  
  syncInProgress = true
  
  try {
    const pendingItems = await db.syncQueue
      .where('status')
      .anyOf('pending', 'failed')
      .limit(SYNC_BATCH_SIZE)
      .toArray()
    
    let processed = 0
    let failed = 0
    
    for (const item of pendingItems) {
      if (!isOnline()) break
      
      const success = await processSyncItem(item)
      if (success) {
        processed++
      } else {
        failed++
      }
    }
    
    return { processed, failed }
  } finally {
    syncInProgress = false
  }
}

export async function retryFailedSyncs(): Promise<void> {
  await db.syncQueue
    .where('status')
    .equals('failed')
    .modify({ status: 'pending', retryCount: 0, lastError: undefined })
  
  await processSyncQueue()
}

export async function clearSyncedItems(): Promise<number> {
  const count = await db.syncQueue.where('status').equals('synced').count()
  await db.syncQueue.where('status').equals('synced').delete()
  return count
}

export async function getSyncStatus(): Promise<'synced' | 'pending' | 'offline'> {
  if (!isOnline()) return 'offline'
  
  const pendingCount = await getPendingSyncCount()
  if (pendingCount > 0) return 'pending'
  
  return 'synced'
}