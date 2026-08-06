import { WifiOff, RotateCcw, CheckCircle } from 'lucide-react'
import { useSync } from '../../hooks/useSync.tsx'
import { useOnline } from '../../hooks/useOnline.tsx'

export function SyncStatusBadge() {
  const { status, pendingCount } = useSync()
  const online = useOnline()

  if (!online) {
    return (
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '4px 10px',
        background: 'var(--color-warning-muted)',
        borderRadius: 'var(--radius-full)',
        fontSize: '0.7rem',
        fontWeight: 600,
        color: '#1a1a2e'
      }}>
        <WifiOff size={14} />
        Offline
      </span>
    )
  }

  if (status === 'pending') {
    return (
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '4px 10px',
        background: 'var(--color-warning-muted)',
        borderRadius: 'var(--radius-full)',
        fontSize: '0.7rem',
        fontWeight: 600,
        color: '#1a1a2e'
      }}>
        <RotateCcw size={14} className="animate-spin" />
        Pending {pendingCount}
      </span>
    )
  }

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      padding: '4px 10px',
      background: 'var(--color-success-muted)',
      borderRadius: 'var(--radius-full)',
      fontSize: '0.7rem',
      fontWeight: 600,
      color: 'var(--color-success)'
    }}>
      <CheckCircle size={14} />
      Synced
    </span>
  )
}