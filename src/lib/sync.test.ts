import { describe, it, expect, vi, beforeEach } from 'vitest'
import { 
  enqueueSync, 
  getPendingSyncCount,
  getSyncStatus 
} from '../lib/sync'
import { db } from '../lib/dexie'

// Mock Dexie
vi.mock('../lib/dexie', () => ({
  db: {
    syncQueue: {
      add: vi.fn(),
      where: vi.fn(() => ({
        anyOf: vi.fn(() => ({
          count: vi.fn(),
          toArray: vi.fn(),
          limit: vi.fn(() => ({
            toArray: vi.fn()
          }))
        })),
        equals: vi.fn(() => ({
          count: vi.fn(),
          modify: vi.fn(),
          delete: vi.fn()
        }))
      })),
      update: vi.fn(),
      delete: vi.fn()
    }
  }
}))

// Mock supabase
vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: vi.fn(),
      update: vi.fn(() => ({ eq: vi.fn() })),
      delete: vi.fn(() => ({ eq: vi.fn() }))
    }))
  }
}))

// Mock navigator.onLine
Object.defineProperty(navigator, 'onLine', {
  value: true,
  writable: true
})

describe('Sync Queue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('enqueueSync', () => {
    it('adds item to sync queue', async () => {
      const mockAdd = vi.fn().mockResolvedValue(1)
      db.syncQueue.add = mockAdd

      await enqueueSync('visits', 123, 'create', { jobCode: 'H342' })

      expect(mockAdd).toHaveBeenCalledWith(expect.objectContaining({
        entityType: 'visits',
        entityId: 123,
        operation: 'create',
        payload: { jobCode: 'H342' },
        status: 'pending',
        retryCount: 0
      }))
    })
  })

  describe('getPendingSyncCount', () => {
    it('returns count of pending and failed items', async () => {
      const mockCount = vi.fn().mockResolvedValue(5)
      db.syncQueue.where = vi.fn(() => ({
        anyOf: vi.fn(() => ({ count: mockCount }))
      }))

      const count = await getPendingSyncCount()
      expect(count).toBe(5)
    })
  })

  describe('getSyncStatus', () => {
    it('returns offline when navigator.onLine is false', async () => {
      Object.defineProperty(navigator, 'onLine', { value: false, writable: true })
      const status = await getSyncStatus()
      expect(status).toBe('offline')
    })

    it('returns pending when there are pending items', async () => {
      Object.defineProperty(navigator, 'onLine', { value: true, writable: true })
      db.syncQueue.where = vi.fn(() => ({
        anyOf: vi.fn(() => ({ count: vi.fn().mockResolvedValue(3) }))
      }))
      const status = await getSyncStatus()
      expect(status).toBe('pending')
    })

    it('returns synced when online and no pending items', async () => {
      Object.defineProperty(navigator, 'onLine', { value: true, writable: true })
      db.syncQueue.where = vi.fn(() => ({
        anyOf: vi.fn(() => ({ count: vi.fn().mockResolvedValue(0) }))
      }))
      const status = await getSyncStatus()
      expect(status).toBe('synced')
    })
  })
})