// ExportData.tsx
import { useState } from 'react'
import { useDexie } from '@hooks/useDexie'
import { useAuth } from '@hooks/useAuth'
import { Card } from '@components/ui/Card'
import { Button } from '@components/ui/Button'
import { Download, Database } from 'lucide-react'

export function ExportData() {
  const { db } = useDexie()
  const { advisor } = useAuth()
  const [exporting, setExporting] = useState(false)

  const handleExport = async () => {
    setExporting(true)
    try {
      const advisorId = advisor?.id
      if (!advisorId) throw new Error('No advisor')

      const backup: Record<string, unknown> = {}
      const tables = [
        'advisors', 'customers', 'visits', 'leads', 'voiceNotes',
        'documents', 'incidents', 'trips', 'expenses', 'settings'
      ]

      for (const tableName of tables) {
        const table = (db as Record<string, unknown>)[tableName]
        if (!table || typeof table !== 'object') continue
        const dexieTable = table as { toArray?: () => Promise<unknown[]>; where?: (field: string) => { equals: (val: string) => { toArray: () => Promise<unknown[]> } } }
        if (tableName === 'advisors') {
          backup[tableName] = await dexieTable.where!('id').equals(advisorId).toArray()
        } else {
          backup[tableName] = await dexieTable.where!('advisorId').equals(advisorId).toArray()
        }
      }

      backup._metadata = {
        exportedAt: new Date().toISOString(),
        version: '1.0',
        advisorId,
      }

      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'beelo-export-' + new Date().toISOString().slice(0, 10) + '.json'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Export failed:', err)
      alert('Export failed: ' + (err as Error).message)
    } finally {
      setExporting(false)
    }
  }

  return (
    <Card padding="lg">
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
        <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--color-primary-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Database size={24} style={{ color: 'var(--color-primary)' }} />
        </div>
        <div>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>Export All Data</h3>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Download a complete JSON backup</p>
        </div>
      </div>
      <Button variant="primary" onClick={handleExport} leftIcon={<Download size={16} />} disabled={exporting} fullWidth>
        {exporting ? 'Exporting...' : 'Export All Data (JSON)'}
      </Button>
    </Card>
  )
}
