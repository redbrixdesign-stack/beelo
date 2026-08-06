import { Layout } from '@components/layout/Layout'
import { SyncQueuePanel } from '@components/sync/SyncQueuePanel'
import { useSync } from '@hooks/useSync'
import { useOnline } from '@hooks/useOnline'
import { Card } from '@components/ui/Card'
import { Wifi, WifiOff, Cloud, RotateCcw, CheckCircle } from 'lucide-react'

export function SyncStatus() {
  const { status, pendingCount } = useSync()
  const online = useOnline()

  return (
    <Layout title="Sync Status">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
        <Card padding="lg" style={{ textAlign: 'center' }}>
          <div style={{ 
            width: '80px', 
            height: '80px', 
            borderRadius: '50%', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            margin: '0 auto var(--spacing-md)',
            background: !online ? 'var(--color-warning-muted)' : status === 'pending' ? 'var(--color-warning-muted)' : 'var(--color-success-muted)'
          }}>
            {!online && <WifiOff size={40} style={{ color: '#1a1a2e' }} />}
            {online && status === 'pending' && <RotateCcw size={40} style={{ color: '#1a1a2e' }} className="animate-spin" />}
            {online && status === 'synced' && <CheckCircle size={40} style={{ color: 'var(--color-success)' }} />}
          </div>
          <h2 style={{ margin: '0 0 var(--spacing-xs)', fontSize: '1.25rem' }}>
            {!online ? 'Offline' : status === 'pending' ? 'Syncing...' : 'All Synced'}
          </h2>
          <p style={{ margin: 0, color: 'var(--color-text-muted)' }}>
            {!online 
              ? 'Changes saved locally. Will sync when connection returns.' 
              : status === 'pending' 
                ? `${pendingCount} item${pendingCount !== 1 ? 's' : ''} pending`
                : 'All changes are up to date'}
          </p>
        </Card>

        <Card padding="md">
          <h3 style={{ margin: '0 0 var(--spacing-md)', fontSize: '1rem', fontWeight: 600 }}>Queue Details</h3>
          <SyncQueuePanel />
        </Card>

        <Card padding="md">
          <h3 style={{ margin: '0 0 var(--spacing-md)', fontSize: '1rem', fontWeight: 600 }}>Network Status</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--spacing-sm)', background: 'var(--color-bg)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                {online ? <Wifi size={20} style={{ color: 'var(--color-success)' }} /> : <WifiOff size={20} style={{ color: 'var(--color-error)' }} />}
                <span>Internet Connection</span>
              </div>
              <span style={{ fontWeight: 500, color: online ? 'var(--color-success)' : 'var(--color-error)' }}>
                {online ? 'Online' : 'Offline'}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--spacing-sm)', background: 'var(--color-bg)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                <Cloud size={20} style={{ color: 'var(--color-primary)' }} />
                <span>Supabase Connection</span>
              </div>
              <span style={{ fontWeight: 500, color: online && status !== 'pending' ? 'var(--color-success)' : 'var(--color-text-muted)' }}>
                {online && status !== 'pending' ? 'Connected' : online ? 'Syncing...' : 'Unavailable'}
              </span>
            </div>
          </div>
        </Card>
      </div>
    </Layout>
  )
}