import { useState } from 'react'
import { ChevronDown, ChevronUp, RotateCcw, AlertCircle, CheckCircle, Clock } from 'lucide-react'
import { useSync } from '../../hooks/useSync.tsx'
import { Button } from '../ui/Button.tsx'
import { Card } from '../ui/Card.tsx'

export function SyncQueuePanel() {
  const { queueItems, pendingCount, retryFailed, clearSynced, isProcessing } = useSync()
  const [expanded, setExpanded] = useState(false)

  if (queueItems.length === 0) {
    return (
      <Card style={{ padding: 'var(--spacing-md)', textAlign: 'center' }}>
        <CheckCircle size={32} style={{ color: 'var(--color-success)', marginBottom: 'var(--spacing-sm)' }} />
        <p style={{ color: 'var(--color-text-muted)', margin: 0 }}>All synced</p>
      </Card>
    )
  }

  const statusIcons = {
    pending: <Clock size={16} style={{ color: 'var(--color-warning)' }} />,
    syncing: <RotateCcw size={16} style={{ color: 'var(--color-primary)', animation: 'spin 1s linear infinite' }} />,
    synced: <CheckCircle size={16} style={{ color: 'var(--color-success)' }} />,
    failed: <AlertCircle size={16} style={{ color: 'var(--color-error)' }} />
  }

  const statusLabels = {
    pending: 'Pending',
    syncing: 'Syncing...',
    synced: 'Synced',
    failed: 'Failed'
  }

  return (
    <Card>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--spacing-md)' }}>
        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>Sync Queue ({pendingCount} pending)</h3>
        <button
          onClick={() => setExpanded(!expanded)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '4px 8px',
            background: 'transparent',
            border: 'none',
            color: 'var(--color-text-muted)',
            fontSize: '0.75rem'
          }}
        >
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {expanded && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
          {queueItems.map(item => (
            <div
              key={`${item.entityType}-${item.entityId}-${item.operation}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--spacing-sm)',
                padding: 'var(--spacing-sm)',
                background: 'var(--color-bg)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)'
              }}
            >
              {statusIcons[item.status as keyof typeof statusIcons]}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {item.entityType}
                </p>
                <p style={{ margin: '2px 0 0', fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                  {item.operation} • {statusLabels[item.status as keyof typeof statusLabels]}
                  {item.retryCount > 0 && ` (retry ${item.retryCount})`}
                </p>
                {item.lastError && (
                  <p style={{ margin: '4px 0 0', fontSize: '0.7rem', color: 'var(--color-error)' }}>
                    {item.lastError}
                  </p>
                )}
              </div>
              {item.status === 'failed' && (
                <Button variant="ghost" size="sm" onClick={retryFailed}>
                  <RotateCcw size={14} /> Retry
                </Button>
              )}
            </div>
          ))}

          <div style={{ display: 'flex', gap: 'var(--spacing-sm)', marginTop: 'var(--spacing-sm)', paddingTop: 'var(--spacing-sm)', borderTop: '1px solid var(--color-border)' }}>
            <Button variant="secondary" size="sm" onClick={retryFailed} disabled={isProcessing} loading={isProcessing} fullWidth>
              <RotateCcw size={14} /> Retry All Failed
            </Button>
            <Button variant="ghost" size="sm" onClick={clearSynced} disabled={isProcessing} loading={isProcessing} fullWidth>
              <CheckCircle size={14} /> Clear Synced
            </Button>
          </div>
        </div>
      )}
    </Card>
  )
}