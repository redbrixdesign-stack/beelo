import { supabase } from './supabase'
import { db, type AdvisorDexie, getDefaultSourceEnv } from './dexie'
import { transformKeysToSnakeCase, transformKeysToCamelCase } from './dexie'

export interface SyncConflict {
  entityType: string
  localId: number
  remoteData: Record<string, unknown>
  localData: Record<string, unknown>
  field: string
  localValue: unknown
  remoteValue: unknown
}

export interface PullResult {
  entityType: string
  pulled: number
  conflicts: SyncConflict[]
  errors: string[]
}

export interface PushResult {
  pushed: number
  failed: number
  errors: string[]
}

const SYNC_BATCH_SIZE = 100

function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)
}

function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
}

function transformKeysToSnakeCase(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(obj)) {
    const snakeKey = camelToSnake(key)
    if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
      result[snakeKey] = transformKeysToSnakeCase(value as Record<string, unknown>)
    } else if (Array.isArray(value)) {
      result[snakeKey] = value.map(v => 
        v && typeof v === 'object' && !(v instanceof Date) 
          ? transformKeysToSnakeCase(v as Record<string, unknown>) 
          : v
      )
    } else {
      result[snakeKey] = value
    }
  }
  return result
}

function transformKeysToCamelCase(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = snakeToCamel(key)
    if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
      result[camelKey] = transformKeysToCamelCase(value as Record<string, unknown>)
    } else if (Array.isArray(value)) {
      result[camelKey] = value.map(v => 
        v && typeof v === 'object' && !(v instanceof Date) 
          ? transformKeysToCamelCase(v as Record<string, unknown>) 
          : v
      )
    } else {
      result[camelKey] = value
    }
  }
  return result
}

const ENTITY_TABLE_MAP: Record<string, string> = {
  advisors: 'advisors',
  customers: 'customers',
  visits: 'visits',
  leads: 'leads',
  callAttempts: 'call_attempts',
  voiceNotes: 'voice_notes',
  documents: 'documents',
  fitLineItems: 'fit_line_items',
  incidents: 'incidents',
  quoteLineItems: 'quote_line_items',
  commissionLineItems: 'commission_line_items',
  trips: 'trips',
  expenses: 'expenses',
  deliveryDropNotes: 'delivery_drop_notes',
  deliveryDropNoteLineItems: 'delivery_drop_note_line_items',
  expenseLineItems: 'expense_line_items',
  settings: 'settings',
  dorPredictions: 'dor_predictions',
  onboardingState: 'onboarding_state',
  pilotMetrics: 'pilot_metrics',
  messageDrafts: 'message_drafts',
  scheduleSuggestions: 'schedule_suggestions',
  measurementChecks: 'measurement_checks',
}

const ENTITY_DEXIE_MAP: Record<string, Table> = {}

async function getAdvisorForSync(): Promise<{ advisor: any; supabase: any } | null> {
  const advisors = await db.advisors.toArray()
  const advisor = advisors[0] ?? null
  if (!advisor?.supabaseId) {
    return null
  }
  return { advisor, supabase }
}

async function getRemoteData(supabase: any, entityType: string, advisorId: string, lastSynced: Date | null): Promise<any[]> {
  const tableName = ENTITY_TABLE_MAP[entityType]
  if (!tableName) {
    throw new Error(`Unknown entity type: ${entityType}`)
  }

  let query = supabase.from(tableName).select('*').eq('advisor_id', advisorId)

  if (lastSynced) {
    query = query.gte('updated_at', lastSynced.toISOString())
  }

  const { data, error } = await query.limit(SYNC_BATCH_SIZE)

  if (error) {
    throw new Error(`Failed to fetch ${entityType}: ${error.message}`)
  }

  return data?.map(transformKeysToCamelCase) ?? []
}

async function pushLocalChanges(entityType: string): Promise<{ pushed: number; failed: number; errors: string[] }> {
  const { advisor, supabase } = await getAdvisorForSync() ?? { advisor: null, supabase: null }
  if (!advisor || !supabase) {
    return { pushed: 0, failed: 0, errors: ['No advisor synced'] }
  }

  const tableName = ENTITY_TABLE_MAP[entityType]
  if (!tableName) {
    return { pushed: 0, failed: 0, errors: [`Unknown entity type: ${entityType}`] }
  }

  const dexieTable = (db as any)[entityType]
  if (!dexieTable) {
    return { pushed: 0, failed: 0, errors: [`Dexie table not found: ${entityType}`] }
  }

  const pendingItems = await db.syncQueue
    .where('entityType')
    .equals(entityType)
    .and(item => ['pending', 'failed'].includes(item.status))
    .limit(50)
    .toArray()

  let pushed = 0
  let failed = 0
  const errors: string[] = []

  for (const item of pendingItems) {
    try {
      await db.syncQueue.update(item.id!, { status: 'syncing' })

      const transformedPayload = transformPayloadForSupabase(item.payload, { supabaseId: advisor.supabaseId } as any, item.operation === 'create')

      const table = supabase.from(ENTITY_TABLE_MAP[entityType])
      let error: { message: string } | null = null

      switch (item.operation) {
        case 'create': {
          const { error: createError } = await table.insert({
            ...transformedPayload,
            source_env: 'live'
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
          if (entityType === 'documents' && item.payload?.image_path) {
            await supabase.storage.from('documents').remove([item.payload.image_path])
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
      pushed++
    } catch (err) {
      const newRetryCount = item.retryCount + 1
      await db.syncQueue.update(item.id!, {
        status: newRetryCount >= 3 ? 'failed' : 'pending',
        retryCount: newRetryCount,
        lastError: err instanceof Error ? err.message : 'Unknown error'
      })
      failed++
      errors.push(`${entityType}:${item.entityId} - ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  return { pushed, failed, errors }
}

function transformPayloadForSupabase(payload: Record<string, unknown>, advisor: { supabaseId: string } | null, isCreate: boolean): Record<string, unknown> {
  const transformed = transformKeysToSnakeCase(payload)

  if (isCreate && transformed.id !== undefined) {
    delete transformed.id
  }

  if (advisor && transformed.advisor_id !== undefined) {
    if (!advisor.supabaseId) {
      throw new Error('Advisor supabaseId not set')
    }
    transformed.advisor_id = advisor.supabaseId
  }

  for (const [key, value] of Object.entries(transformed)) {
    if (value instanceof Date) {
      transformed[key] = value.toISOString()
    }
  }

  return transformed
}

export async function pullFromSupabase(): Promise<PullResult[]> {
  const result = await getAdvisorForSync()
  if (!result) {
    return [{ entityType: '', pulled: 0, conflicts: [], errors: ['No advisor synced'] }]
  }

  const { advisor, supabase } = result
  const entityTypes = Object.keys(ENTITY_TABLE_MAP)
  const results: PullResult[] = []

  for (const entityType of entityTypes) {
    try {
      const dexieTable = (db as any)[entityType]
      if (!dexieTable) continue

      const lastRecord = await dexieTable
        .where('advisorId')
        .equals(result.advisor.id)
        .reverse()
        .sortBy('updatedAt')
        .then(records => records[0] ?? null)

      const lastSynced = lastRecord?.updatedAt ?? null
      const remoteData = await getRemoteData(supabase, entityType, result.advisor.supabaseId, lastSynced)

      let pulled = 0
      const conflicts: any[] = []

      for (const remoteRecord of remoteData) {
        const localRecord = await (db as any)[entityType].get(remoteRecord.id)
        
        if (!localRecord) {
          await (db as any)[entityType].put({ ...remoteRecord, advisorId: result.advisor.id })
          pulled++
        } else if (new Date(remoteRecord.updatedAt) > new Date(localRecord.updatedAt)) {
          // Last-write-wins conflict resolution
          const conflict = {
            entityType,
            localId: localRecord.id,
            remoteData: remoteRecord,
            localData: localRecord,
            field: 'updatedAt',
            localValue: localRecord.updatedAt,
            remoteValue: remoteRecord.updatedAt
          }
          conflicts.push(conflict)
          
          // Last-write-wins: remote wins
          await (db as any)[entityType].put({ ...remoteRecord, advisorId: result.advisor.id })
          pulled++
        }
      }

      results.push({ entityType, pulled, conflicts, errors: [] })
    } catch (err) {
      results.push({ entityType, pulled: 0, conflicts: [], errors: [err instanceof Error ? err.message : 'Unknown error'] })
    }
  }

  return results
}

export async function pushToSupabase(): Promise<PushResult> {
  const entityTypes = Object.keys(ENTITY_TABLE_MAP)
  let totalPushed = 0
  let totalFailed = 0
  const allErrors: string[] = []

  for (const entityType of entityTypes) {
    const result = await pushLocalChanges(entityType)
    totalPushed += result.pushed
    totalFailed += result.failed
    allErrors.push(...result.errors)
  }

  return { pushed: totalPushed, failed: totalFailed, errors: allErrors }
}

export async function fullSync(): Promise<{ pull: PullResult[]; push: PushResult }> {
  const pull = await pullFromSupabase()
  const push = await pushToSupabase()
  return { pull, push }
}

export function getEntityTableName(entityType: string): string {
  return ENTITY_TABLE_MAP[entityType] || entityType
}