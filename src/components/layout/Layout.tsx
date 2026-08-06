import { ReactNode } from 'react'
import { Header } from './Header'
import { BottomNav } from './BottomNav'
import { ToastProvider } from '../ui/Toast'

interface LayoutProps {
  children: ReactNode
  title?: string
  showBack?: boolean
  onBack?: () => void
  onMenuClick?: () => void
}

export function Layout({ 
  children, 
  title = 'Beelo', 
  showBack = false, 
  onBack, 
  onMenuClick 
}: LayoutProps) {
  return (
    <ToastProvider>
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <Header title={title} showBack={showBack} onBack={onBack} onMenuClick={onMenuClick} />
        <main style={{ 
          flex: 1, 
          padding: 'var(--spacing-md)', 
          paddingBottom: 'calc(var(--bottom-nav-height) + var(--spacing-md) + env(safe-area-inset-bottom, 0))',
          maxWidth: '600px',
          margin: '0 auto',
          width: '100%'
        }}>
          {children}
        </main>
        <BottomNav />
      </div>
    </ToastProvider>
  )
}