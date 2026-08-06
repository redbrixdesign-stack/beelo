import { useAuth } from '@hooks/useAuth'
import { Layout } from '@components/layout/Layout'
import { ProfileForm } from '@components/auth/ProfileForm'
import { Card } from '@components/ui/Card'
import { SyncQueuePanel } from '@components/sync/SyncQueuePanel'
import { LogOut, User } from 'lucide-react'
import { Button } from '@components/ui/Button'
import { useNavigate } from 'react-router-dom'
import { useToast } from '@components/ui/Toast'

export function Profile() {
  const { advisor, user, signOut: signOutAuth } = useAuth()
  const navigate = useNavigate()
  const { showToast } = useToast()

  const handleSignOut = async () => {
    try {
      await signOutAuth()
      showToast('Signed out', 'success')
      navigate('/login')
    } catch {
      showToast('Failed to sign out', 'error')
    }
  }

  if (!user) {
    return <Layout title="Profile">Please sign in</Layout>
  }

  return (
    <Layout title="Profile">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
        <Card padding="md">
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'var(--color-primary-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <User size={28} style={{ color: 'var(--color-primary)' }} />
            </div>
            <div>
              <p style={{ margin: 0, fontWeight: 600, fontSize: '1.125rem' }}>{advisor?.businessName || 'Advisor'}</p>
              <p style={{ margin: '2px 0 0', fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
                {advisor?.employmentModel === 'company_advisor' ? 'Company Advisor' : 'Independent'}
              </p>
            </div>
          </div>
        </Card>

        <ProfileForm />

        <Card padding="md">
          <h2 style={{ margin: '0 0 var(--spacing-md)', fontSize: '1rem', fontWeight: 600 }}>Account</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
            <Button variant="secondary" onClick={handleSignOut} fullWidth leftIcon={<LogOut size={18} />}>
              Sign Out
            </Button>
          </div>
        </Card>

        <Card padding="md">
          <h2 style={{ margin: '0 0 var(--spacing-md)', fontSize: '1rem', fontWeight: 600 }}>Sync Status</h2>
          <SyncQueuePanel />
        </Card>

        <Card padding="md">
          <h2 style={{ margin: '0 0 var(--spacing-md)', fontSize: '1rem', fontWeight: 600 }}>App Info</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)', fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Version</span>
              <span style={{ fontWeight: 500 }}>0.1.0</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Environment</span>
              <span style={{ fontWeight: 500 }}>{(import.meta.env.VITE_SOURCE_ENV || 'live').toUpperCase()}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Offline Storage</span>
              <span style={{ fontWeight: 500 }}>Dexie / IndexedDB</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Backend</span>
              <span style={{ fontWeight: 500 }}>Supabase</span>
            </div>
          </div>
        </Card>
      </div>
    </Layout>
  )
}