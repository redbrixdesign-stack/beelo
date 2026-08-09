import { supabase } from './supabase'
import { db, type SyncQueueItem, getDefaultSourceEnv, type AdvisorDexie } from './dexie'
import { transformKeysToSnakeCase } from './dexie'

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

function transformPayloadForSupabase(payload: Record<string, unknown>, advisor: AdvisorDexie | null, isCreate: boolean): Record<string, unknown> {
  const transformed = transformKeysToSnakeCase(payload)
  
  if (isCreate && transformed.id !== undefined) {
    delete transformed.id
  }
  
  if (advisor && transformed.advisor_id !== undefined) {
    // Use the Supabase internal UUID (supabaseId), not authUserId
    // Fallback to authUserId if supabaseId not yet synced (first run)
    const advisorId = advisor.supabaseId || advisor.authUserId
    if (!advisor.supabaseId) {
      console.warn('Advisor supabaseId not set, using authUserId as fallback. Run syncAdvisorToSupabase first.')
    }
    transformed.advisor_id = advisorId
  }
  
  for (const [key, value] of Object.entries(transformed)) {
    if (value instanceof Date) {
      transformed[key] = value.toISOString()
    }
  }
  
  return transformed
}

async function getAdvisorForSync(): Promise<AdvisorDexie | null> {
  const advisors = await db.advisors.toArray()
  return advisors[0] ?? null
}

async function processSyncItem(item: SyncQueueItem): Promise<boolean> {
  const table = supabase.from(item.entityType)
  const advisor = await getAdvisorForSync()
  const isCreate = item.operation === 'create'
  
  try {
    await db.syncQueue.update(item.id!, { status: 'syncing' })
    
    let error: { message: string } | null = null
    
    const transformedPayload = transformPayloadForSupabase(item.payload, advisor, isCreate)
    
    switch (item.operation) {
      case 'create': {
        const { error: createError } = await table.insert({
          ...transformedPayload,
          source_env: getDefaultSourceEnv()
        })
        error = createError
        break
      }
      case 'update': {
        const { id, ...updates } = transformedPayload
        const { error: updateError } = await table
          .update({ ...updates, updated_at: new Date().toISOString() })
          .eq('id', id)
        error = updateError
        break
      }
      case 'delete': {
        // If it's a document, also delete the image from storage
        if (item.entityType === 'documents' && item.payload?.image_path) {
          const { error: storageError } = await supabase.storage
            .from('documents')
            .remove([item.payload.image_path])
          if (storageError) {
            console.warn('Failed to delete document image from storage:', storageError.message)
          }
        }
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