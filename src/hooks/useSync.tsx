import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react'
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

type SyncStatus = 'synced' | 'pending' | 'offline'

interface SyncContextType {
  status: SyncStatus
  pendingCount: number
  queueItems: Array<{ entityType: string; entityId: number; operation: string; status: string; retryCount: number; lastError?: string }>
  isProcessing: boolean
  refreshStatus: () => Promise<void>
  retryFailed: () => Promise<void>
  clearSynced: () => Promise<void>
}

const SyncContext = createContext<SyncContextType | null>(null)

export function SyncProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<SyncStatus>('synced')
  const [pendingCount, setPendingCount] = useState(0)
  const [queueItems, setQueueItems] = useState<SyncContextType['queueItems']>([])
  const [isProcessing, setIsProcessing] = useState(false)

  const refreshStatus = useCallback(async () => {
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

  useEffect(() => {
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
      removeOnlineListener(handleOnline, handleOffline)
    }
  }, [refreshStatus])

  useEffect(() => {
    if (isOnline() && pendingCount > 0 && !isProcessing) {
      const process = async () => {
        setIsProcessing(true)
        try {
          await processSyncQueue()
        } finally {
          setIsProcessing(false)
          refreshStatus()
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
      refreshStatus,
      retryFailed,
      clearSynced
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