import { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from 'react'
import { 
  isOnline, 
  addOnlineListener, 
  removeOnlineListener,
  getPendingSyncCount,
  getSyncQueueItems,
  processSyncQueue,
  retryFailedSyncs,
  clearSyncedItems,
  getSyncStatus
} from '../lib/sync'
import { pullFromSupabase, pushToSupabase, fullSync } from '../lib/syncEngine'
import { useToast } from '../components/ui/Toast'

type SyncStatus = 'synced' | 'pending' | 'offline'

interface SyncContextType {
  status: SyncStatus
  pendingCount: number
  queueItems: Array<{ entityType: string; entityId: number; operation: string; status: string; retryCount: number; lastError?: string }>
  isProcessing: boolean
  lastPull: Date | null
  lastPush: Date | null
  refreshStatus: () => Promise<void>
  retryFailed: () => Promise<void>
  clearSynced: () => Promise<void>
  pullFromServer: () => Promise<void>
  pushToServer: () => Promise<void>
  fullSync: () => Promise<void>
}

const SyncContext = createContext<SyncContextType | null>(null)

export function SyncProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<SyncStatus>('synced')
  const [pendingCount, setPendingCount] = useState(0)
  const [queueItems, setQueueItems] = useState<SyncContextType['queueItems']>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [lastPull, setLastPull] = useState<Date | null>(null)
  const [lastPush, setLastPush] = useState<Date | null>(null)
  const isMountedRef = useRef(true)
  const { showToast } = useToast()

  const refreshStatus = useCallback(async () => {
    if (!isMountedRef.current) return
    const [newStatus, count, items] = await Promise.all([
      getSyncStatus(),
      getPendingSyncCount(),
      getSyncQueueItems()
    ])
    
    setStatus(newStatus)
    setPendingCount(count)
    setQueueItems(items.map(item => ({
      entityType: item.entityType,
      entityId: item.entityId,
      operation: item.operation,
      status: item.status,
      retryCount: item.retryCount,
      lastError: item.lastError
    })))
  }, [])

  const retryFailed = useCallback(async () => {
    setIsProcessing(true)
    try {
      await retryFailedSyncs()
      await refreshStatus()
    } finally {
      setIsProcessing(false)
    }
  }, [refreshStatus])

  const clearSynced = useCallback(async () => {
    await clearSyncedItems()
    await refreshStatus()
  }, [refreshStatus])

  const pullFromServer = useCallback(async () => {
    setIsProcessing(true)
    try {
      const results = await pullFromSupabase()
      const now = new Date()
      setLastPull(now)
      const totalPulled = results.reduce((sum, r) => sum + r.pulled, 0)
      const totalConflicts = results.reduce((sum, r) => sum + r.conflicts.length, 0)
      if (totalConflicts > 0) {
        console.warn(`Sync conflicts resolved (last-write-wins): ${totalConflicts}`)
      }
      console.log(`Pulled ${totalPulled} records from server`)
      showToast(`Pulled ${totalPulled} records from server`, 'success')
    } catch (err) {
      console.error('Pull from server failed:', err)
      showToast(err instanceof Error ? err.message : 'Pull from server failed', 'error')
    } finally {
      if (isMountedRef.current) {
        setIsProcessing(false)
        await refreshStatus()
      }
    }
  }, [refreshStatus])

  const pushToServer = useCallback(async () => {
    setIsProcessing(true)
    try {
      const result = await pushToSupabase()
      const now = new Date()
      setLastPush(now)
      console.log(`Pushed ${result.pushed} records, ${result.failed} failed`)
      if (result.errors.length > 0) {
        console.warn('Push errors:', result.errors)
        showToast(`${result.errors.length} push errors occurred`, 'warning')
      }
      if (result.failed === 0) {
        showToast(`Pushed ${result.pushed} records to server`, 'success')
      }
    } catch (err) {
      console.error('Push to server failed:', err)
      showToast(err instanceof Error ? err.message : 'Push to server failed', 'error')
    } finally {
      if (isMountedRef.current) {
        setIsProcessing(false)
        await refreshStatus()
      }
    }
  }, [refreshStatus])

  const fullSync = useCallback(async () => {
    setIsProcessing(true)
    try {
      const { pull, push } = await fullSync()
      const now = new Date()
      setLastPull(now)
      setLastPush(now)
      const totalPulled = pull.reduce((sum, r) => sum + r.pulled, 0)
      const totalConflicts = pull.reduce((sum, r) => sum + r.conflicts.length, 0)
      if (totalConflicts > 0) {
        console.warn(`Sync conflicts resolved (last-write-wins): ${totalConflicts}`)
      }
      console.log(`Full sync: pulled ${totalPulled}, pushed ${push.pushed}`)
      if (push.errors.length > 0) {
        console.warn('Push errors:', push.errors)
        showToast(`${push.errors.length} push errors occurred`, 'warning')
      }
      if (push.failed === 0) {
        showToast(`Full sync: pulled ${totalPulled}, pushed ${push.pushed}`, 'success')
      }
    } catch (err) {
      console.error('Full sync failed:', err)
      showToast(err instanceof Error ? err.message : 'Full sync failed', 'error')
    } finally {
      if (isMountedRef.current) {
        setIsProcessing(false)
        await refreshStatus()
      }
    }
  }, [refreshStatus])

  useEffect(() => {
    isMountedRef.current = true
    refreshStatus()
    
    const handleOnline = () => {
      refreshStatus()
      processSyncQueue()
    }
    
    const handleOffline = () => {
      refreshStatus()
    }
    
    addOnlineListener(handleOnline, handleOffline)
    
    return () => {
      isMountedRef.current = false
      removeOnlineListener(handleOnline, handleOffline)
    }
  }, [refreshStatus])

  useEffect(() => {
    if (isOnline() && pendingCount > 0 && !isProcessing) {
      const process = async () => {
        setIsProcessing(true)
        try {
          const result = await processSyncQueue()
          if (result.errors.length > 0) {
            console.warn('Sync errors:', result.errors)
            showToast(`${result.errors.length} sync errors occurred`, 'warning')
          }
          if (result.failed === 0) {
            showToast(`Synced ${result.processed} items`, 'success')
          }
        } catch (err) {
          console.error('Sync failed:', err)
          showToast(err instanceof Error ? err.message : 'Sync failed', 'error')
        } finally {
          if (isMountedRef.current) {
            setIsProcessing(false)
            refreshStatus()
          }
        }
      }
      process()
    }
  }, [pendingCount, isProcessing, refreshStatus])

  return (
    <SyncContext.Provider value={{ 
      status, 
      pendingCount, 
      queueItems, 
      isProcessing,
      lastPull,
      lastPush,
      refreshStatus,
      retryFailed,
      clearSynced,
      pullFromServer,
      pushToServer,
      fullSync
    }}>
      {children}
    </SyncContext.Provider>
  )
}

export function useSync() {
  const context = useContext(SyncContext)
  if (!context) {
    throw new Error('useSync must be used within a SyncProvider')
  }
  return context
}