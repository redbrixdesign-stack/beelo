// BackupRestore - Export/backup/restore functionality

import { useState } from 'react'
import { db } from '@lib/dexie'
import { useAuth } from '@hooks/useAuth'
import { Card } from '@components/ui/Card'
import { Button } from '@components/ui/Button'
import { Input } from '@components/ui/Input'
import { Badge } from '@components/ui/Badge'
import { Download, Upload, Database, RotateCcw, AlertTriangle, CheckCircle, FileText } from 'lucide-react'

export function BackupRestore() {
  const { user } = useAuth()
  const [exporting, setExporting] = useState(false)
  const [importing, setImporting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const fileInputRef = useState<HTMLInputElement | null>(null)

  const advisorId = user?.id ? parseInt(user.id) : 0

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 5000)
  }

  const exportData = async () => {
    if (!advisorId) return
    setExporting(true)
    try {
      // Collect all advisor data
      const tables = [
        'advisors', 'customers', 'visits', 'leads', 'callAttempts', 'voiceNotes',
        'documents', 'fitLineItems', 'incidents', 'quoteLineItems', 'commissionLineItems',
        'trips', 'expenses', 'deliveryDropNotes', 'settings', 'dorPredictions',
        'onboardingState', 'pilotMetrics', 'messageDrafts', 'scheduleSuggestions',
        'measurementChecks', 'syncQueue'
      ]

      const data: Record<string, any[]> = {}
      for (const table of tables) {
        try {
          const records = await (db as any)[table].where('advisorId').equals(advisorId).toArray()
          data[table] = records
        } catch {
          // Table might not exist, skip
        }
      }

      const exportObj = {
        version: 1,
        exportedAt: new Date().toISOString(),
        advisorId,
        data,
      }

      const blob = new Blob([JSON.stringify(exportObj, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `beelo-backup-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      showMessage('success', 'Backup exported successfully')
    } catch (err) {
      console.error('Export failed:', err)
      showMessage('error', 'Failed to export backup')
    } finally {
      setExporting(false)
    }
  }

  const importData = async (file: File) => {
    if (!advisorId) return
    setImporting(true)
    try {
      const text = await file.text()
      const importObj = JSON.parse(text)

      if (!importObj.version || !importObj.data) {
        throw new Error('Invalid backup file format')
      }

      // Import each table
      for (const [tableName, records] of Object.entries(importObj.data)) {
        if (!(db as any)[tableName]) continue
        if (!Array.isArray(records)) continue

        const table = (db as any)[tableName]
        for (const record of records) {
          const { id, ...data } = record
          try {
            await table.add({ ...data, advisorId })
          } catch {
            // Record might already exist, try update
            if (id) {
              try {
                await table.update(id, data)
              } catch {
                // ignore
              }
            }
          }
        }
      }

      showMessage('success', 'Backup imported successfully')
    } catch (err) {
      console.error('Import failed:', err)
      showMessage('error', 'Failed to import backup: ' + (err as Error).message)
    } finally {
      setImporting(false)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      importData(file)
      // Reset input
      e.target.value = ''
    }
  }

  return (
    <Card padding="lg">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--spacing-lg)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
          <div style={{ 
            width: '40px', 
            height: '40px', 
            borderRadius: '50%', 
            background: 'var(--color-primary-muted)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            color: 'var(--color-primary)'
          }}>
            <Database size={20} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>Backup & Restore</h3>
            <p style={{ margin: 'var(--spacing-xs) 0 0', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
              Export or import your data
            </p>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--spacing-lg)' }}>
        <div style={{ padding: 'var(--spacing-lg)', background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', textAlign: 'center' }}>
          <div style={{ 
            width: '60px', 
            height: '60px', 
            borderRadius: '50%', 
            background: 'var(--color-primary-muted)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            color: 'var(--color-primary)',
            margin: '0 auto var(--spacing-md)'
          }}>
            <Download size={24} />
          </div>
          <h4 style={{ margin: '0 0 var(--spacing-xs)', fontSize: '1rem', fontWeight: 600 }}>Export Data</h4>
          <p style={{ margin: '0 0 var(--spacing-md)', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
            Download a complete backup of all your data as a JSON file
          </p>
          <Button variant="primary" onClick={exportData} disabled={exporting} fullWidth leftIcon={<Download size={16} />}>
            {exporting ? 'Exporting...' : 'Export Backup'}
          </Button>
        </div>

        <div style={{ padding: 'var(--spacing-lg)', background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', textAlign: 'center' }}>
          <div style={{ 
            width: '60px', 
            height: '60px', 
            borderRadius: '50%', 
            background: 'var(--color-warning-muted)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            color: 'var(--color-warning)',
            margin: '0 auto var(--spacing-md)'
          }}>
            <Upload size={24} />
          </div>
          <h4 style={{ margin: '0 0 var(--spacing-xs)', fontSize: '1rem', fontWeight: 600 }}>Import Data</h4>
          <p style={{ margin: '0 0 var(--spacing-md)', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
            Restore from a previously exported backup file
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={e => e.target.files?.[0] && importData(e.target.files[0])}
            style={{ display: 'none' }}
            id="backup-import"
          />
          <Button variant="secondary" onClick={() => document.getElementById('backup-import')?.click()} disabled={importing} fullWidth leftIcon={<Upload size={16} />}>
            {importing ? 'Importing...' : 'Choose Backup File'}
          </Button>
          <p style={{ margin: 'var(--spacing-md) 0 0', fontSize: '0.7rem', color: 'var(--color-warning)' }}>
            <AlertTriangle size={12} /> This will add data to your existing records
          </p>
        </div>
      </div>

      <div style={{ marginTop: 'var(--spacing-lg)', padding: 'var(--spacing-md)', background: 'var(--color-warning-muted)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-warning)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--spacing-sm)' }}>
          <AlertTriangle size={20} style={{ color: '#1a1a2e', flexShrink: 0, marginTop: '2px' }} />
          <div style={{ fontSize: '0.8rem', color: '#1a1a2e' }}>
            <strong>Important:</strong> Backups only include data for the current advisor. 
            Regular exports are recommended. The app also syncs to Supabase automatically when online.
          </div>
        </div>
      </div>
    </Card>
  )
}