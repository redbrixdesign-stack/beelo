// BackupRestore - JSON export/import backup and restore

import { useState } from 'react'
import { useDexie } from '@hooks/useDexie'
import { Card } from '@components/ui/Card'
import { Button } from '@components/ui/Button'
import { Badge } from '@components/ui/Badge'
import { Download, Upload, Database, AlertCircle, CheckCircle, X, RefreshCw } from 'lucide-react'

const BACKUP_TABLES = [
  'advisors', 'customers', 'visits', 'leads', 'callAttempts', 'voiceNotes',
  'documents', 'quoteLineItems', 'commissionLineItems', 'fitLineItems',
  'incidents', 'trips', 'expenses', 'deliveryDropNotes', 'settings',
  'dorPredictions', 'onboardingState', 'pilotMetrics', 'messageDrafts',
  'scheduleSuggestions', 'measurementChecks', 'syncQueue'
]

export function BackupRestore() {
  const { db } = useDexie()
  const [exporting, setExporting] = useState(false)
  const [importing, setImporting] = useState(false)
  const [lastExport, setLastExport] = useState<Date | null>(null)
  const [importResult, setImportResult] = useState<{ success: number; errors: string[] } | null>(null)

  const handleExport = async () => {
    setExporting(true)
    try {
      const backup: Record<string, any[]> = {}
      
      for (const tableName of BACKUP_TABLES) {
        const table = (db as any)[tableName]
        if (table) {
          backup[tableName] = await table.toArray()
        }
      }

      backup._metadata = {
        exportedAt: new Date().toISOString(),
        version: '1.0',
        tables: BACKUP_TABLES,
      }

      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `beelo-backup-${new Date().toISOString().slice(0, 10)}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      setLastExport(new Date())
    } catch (err) {
      console.error('Export failed:', err)
      alert('Export failed: ' + (err as Error).message)
    } finally {
      setExporting(false)
    }
  }

  const handleImport = async (file: File) => {
    setImporting(true)
    setImportResult(null)
    try {
      const text = await file.text()
      const backup = JSON.parse(text)

      if (!backup._metadata) {
        throw new Error('Invalid backup file: missing metadata')
      }

      let success = 0
      const errors: string[] = []

      for (const tableName of BACKUP_TABLES) {
        const records = backup[tableName]
        if (!Array.isArray(records)) continue

        const table = (db as any)[tableName]
        if (!table) {
          errors.push(`Table ${tableName} not found in database`)
          continue
        }

        try {
          await db.transaction('rw', table, async () => {
            for (const record of records) {
              const id = record.id
              delete record.id
              await table.put({ ...record, id })
            }
          })
          success += records.length
        } catch (err) {
          errors.push(`${tableName}: ${(err as Error).message}`)
        }
      }

      setImportResult({ success, errors })
    } catch (err) {
      setImportResult({ success: 0, errors: [(err as Error).message] })
    } finally {
      setImporting(false)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleImport(file)
  }

  return (
    <Card padding="lg">
      <h3 style={{ margin: '0 0 var(--spacing-lg)', fontSize: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
        <Database size={18} style={{ color: 'var(--color-primary)' }} />
        Backup & Restore
      </h3>

      <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: 'var(--spacing-lg)' }}>
        Export all your data as a JSON file for backup or transfer to another device. 
        Import restores data with upsert (add or update existing records).
      </p>

      <div style={{ padding: 'var(--spacing-lg)', background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)', marginBottom: 'var(--spacing-lg)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--spacing-md)' }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Export Backup</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
              Creates a JSON file with all {BACKUP_TABLES.length} tables
            </div>
          </div>
          <Button variant="primary" onClick={handleExport} leftIcon={<Download size={16} />} disabled={exporting}>
            {exporting ? 'Exporting...' : 'Export JSON'}
          </Button>
        </div>
        {lastExport && (
          <Badge variant="success" size="sm" style={{ marginTop: 'var(--spacing-sm)' }}>
            <CheckCircle size={10} /> Last export: {lastExport.toLocaleString()}
          </Badge>
        )}
      </div>

      <div style={{ padding: 'var(--spacing-lg)', background: 'var(--color-warning-muted)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-warning)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-md)' }}>
          <AlertCircle size={18} style={{ color: 'var(--color-warning)', marginTop: 2 }} />
          <div style={{ fontSize: '0.85rem', color: 'var(--color-warning)' }}>
            <strong>Import replaces/updates data.</strong> Uses upsert — existing records updated by ID, new records added. 
            Review the result summary after import.
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)', flexWrap: 'wrap' }}>
          <input
            type="file"
            accept=".json"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
            id="backup-import"
            disabled={importing}
          />
          <label htmlFor="backup-import" style={{ cursor: 'pointer' }}>
            <Button variant="secondary" leftIcon={<Upload size={16} />} disabled={importing}>
              {importing ? 'Importing...' : 'Choose JSON File'}
            </Button>
          </label>
        </div>

        {importResult && (
          <div style={{ marginTop: 'var(--spacing-md)', padding: 'var(--spacing-md)', background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', border: `1px solid ${importResult.errors.length > 0 ? 'var(--color-error)' : 'var(--color-success)'}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-sm)' }}>
              {importResult.errors.length > 0 ? (
                <AlertCircle size={16} style={{ color: 'var(--color-error)' }} />
              ) : (
                <CheckCircle size={16} style={{ color: 'var(--color-success)' }} />
              )}
              <strong>{importResult.errors.length > 0 ? 'Import completed with errors' : 'Import successful'}</strong>
            </div>
            <div style={{ fontSize: '0.8rem', display: 'flex', gap: 'var(--spacing-lg)' }}>
              <span><CheckCircle size={12} style={{ color: 'var(--color-success)', verticalAlign: 'middle', marginRight: 4 }} /> {importResult.success} records processed</span>
              {importResult.errors.length > 0 && (
                <span><AlertCircle size={12} style={{ color: 'var(--color-error)', verticalAlign: 'middle', marginRight: 4 }} /> {importResult.errors.length} errors</span>
              )}
            </div>
            {importResult.errors.length > 0 && (
              <details style={{ marginTop: 'var(--spacing-sm)' }}>
                <summary style={{ cursor: 'pointer', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>View errors</summary>
                <ul style={{ marginTop: 'var(--spacing-xs)', fontSize: '0.7rem', color: 'var(--color-error)' }}>
                  {importResult.errors.map((err, i) => <li key={i}>{err}</li>)}
                </ul>
              </details>
            )}
          </div>
        )}
      </div>
    </Card>
  )
}