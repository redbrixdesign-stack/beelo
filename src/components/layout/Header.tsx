import { Menu } from 'lucide-react'
import { useSync } from '../../hooks/useSync'
import { useOnline } from '../../hooks/useOnline'
import { Badge } from '../ui/Badge'
import { getDefaultSourceEnv } from '../../lib/dexie'

interface HeaderProps {
  title: string
  showBack?: boolean
  onBack?: () => void
  onMenuClick?: () => void
}

export function Header({ title, showBack = false, onBack, onMenuClick }: HeaderProps) {
  const { status, pendingCount } = useSync()
  const online = useOnline()

  const getStatusBadge = () => {
    if (!online) return <Badge variant="warning" size="sm">Offline</Badge>
    if (status === 'pending') return <Badge variant="warning" size="sm">Pending {pendingCount}</Badge>
    if (status === 'synced') return <Badge variant="success" size="sm">Synced</Badge>
    return null
  }

  const getSourceEnvBadge = () => {
    const env = getDefaultSourceEnv()
    const variants = { demo: 'info', qa: 'warning', live: 'success' } as const
    return <Badge variant={variants[env]} size="sm">{env.toUpperCase()}</Badge>
  }

  return (
    <header style={{
      position: 'sticky',
      top: 0,
      zIndex: 100,
      height: 'var(--header-height)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 var(--spacing-md)',
      background: 'var(--color-bg-elevated)',
      borderBottom: '1px solid var(--color-border)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
        {showBack && onBack && (
          <button
            onClick={onBack}
            style={{
              width: '40px',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 'var(--radius-md)',
              color: 'var(--color-text)',
              background: 'transparent'
            }}
            aria-label="Back"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
          </button>
        )}
        <h1 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--color-text)', margin: 0 }}>
          {title}
        </h1>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
        {getSourceEnvBadge()}
        {getStatusBadge()}
        {onMenuClick && (
          <button
            onClick={onMenuClick}
            style={{
              width: '40px',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 'var(--radius-md)',
              color: 'var(--color-text)',
              background: 'transparent'
            }}
            aria-label="Menu"
          >
            <Menu size={24} />
          </button>
        )}
      </div>
    </header>
  )
}