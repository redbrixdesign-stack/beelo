import { Home, Calendar, Users, Settings } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'

const navItems = [
  { path: '/', label: 'Home', icon: Home },
  { path: '/visits', label: 'Visits', icon: Calendar },
  { path: '/customers', label: 'Customers', icon: Users },
  { path: '/profile', label: 'Profile', icon: Settings }
] as const

export function BottomNav() {
  const location = useLocation()
  const navigate = useNavigate()

  return (
    <nav style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      height: 'var(--bottom-nav-height)',
      display: 'flex',
      justifyContent: 'space-around',
      alignItems: 'center',
      background: 'var(--color-bg-elevated)',
      borderTop: '1px solid var(--color-border)',
      paddingBottom: 'env(safe-area-inset-bottom, 0)',
      zIndex: 100
    }} role="navigation" aria-label="Main navigation">
      {navItems.map(({ path, label, icon: Icon }) => {
        const isActive = location.pathname === path || (path !== '/' && location.pathname.startsWith(path))
        return (
          <button
            key={path}
            onClick={() => navigate(path)}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              padding: 'var(--spacing-xs) var(--spacing-sm)',
              background: 'transparent',
              border: 'none',
              color: isActive ? 'var(--color-primary)' : 'var(--color-text-muted)',
              fontSize: '0.7rem',
              fontWeight: 500,
              minHeight: 'var(--tap-target)',
              transition: 'color var(--transition-fast)'
            }}
            aria-current={isActive ? 'page' : undefined}
            aria-label={label}
          >
            <Icon size={24} style={{ strokeWidth: isActive ? 3 : 2 }} />
            <span>{label}</span>
          </button>
        )
      })}
    </nav>
  )
}