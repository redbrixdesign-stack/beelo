import { useAuth } from '../../hooks/useAuth'
import { useDexie } from '../../hooks/useDexie'
import { useSync } from '../../hooks/useSync'
import { useDashboardStats } from '../../hooks/useDashboardStats'
import { useNavigate } from 'react-router-dom'
import { Layout } from '../components/layout/Layout'
import { CustomerList } from '../components/customers/CustomerList'
import { VisitList } from '../components/visits/VisitList'
import { SyncQueuePanel } from '../components/sync/SyncQueuePanel'
import { Calendar, Users, TrendingUp, AlertTriangle, CheckCircle, Clock } from 'lucide-react'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'

export function Home() {
  const { advisor, user, loading: authLoading } = useAuth()
  const { isReady } = useDexie()
  const { status, pendingCount } = useSync()
  const stats = useDashboardStats()
  const navigate = useNavigate()

  if (authLoading || !isReady) {
    return <div style={{ padding: 'var(--spacing-xl)', textAlign: 'center' }}>Loading...</div>
  }

  if (!user) {
    return (
      <Layout title="Beelo">
        <div style={{ textAlign: 'center', padding: 'var(--spacing-xl)' }}>
          <h1 style={{ fontSize: '1.5rem', marginBottom: 'var(--spacing-md)' }}>Welcome to Beelo</h1>
          <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--spacing-xl)' }}>
            Offline-first operational memory for home-visit sales advisors
          </p>
          <Button size="lg" onClick={() => navigate('/login')} fullWidth>
            Get Started
          </Button>
        </div>
      </Layout>
    )
  }

  if (!advisor) {
    return (
      <Layout title="Beelo">
        <div style={{ textAlign: 'center', padding: 'var(--spacing-xl)' }}>
          <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--spacing-lg)' }}>
            Complete your profile to get started
          </p>
          <Button size="lg" onClick={() => navigate('/profile')} fullWidth>
            Complete Profile
          </Button>
        </div>
      </Layout>
    )
  }

  return (
    <Layout title="Dashboard">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--spacing-md)' }}>
          <StatCard 
            icon={<Calendar size={24} />} 
            label="Visits This Week" 
            value={stats.visits} 
            color="var(--color-primary)"
          />
          <StatCard 
            icon={<Users size={24} />} 
            label="Customers" 
            value={stats.customers} 
            color="var(--color-primary)"
          />
          <StatCard 
            icon={<Clock size={24} />} 
            label="Upcoming" 
            value={stats.upcoming} 
            color="var(--color-warning)"
          />
          <StatCard 
            icon={<AlertTriangle size={24} />} 
            label="Needs Outcome" 
            value={stats.pendingOutcomes} 
            color={stats.pendingOutcomes > 0 ? 'var(--color-error)' : 'var(--color-success)'}
          />
        </div>

        <Card padding="md">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--spacing-md)' }}>
            <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>Quick Actions</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--spacing-sm)' }}>
            <Button variant="primary" onClick={() => navigate('/visits/new')} fullWidth style={{ minHeight: '60px' }}>
              <Calendar size={20} style={{ marginBottom: '4px' }} />
              <div>New Visit</div>
            </Button>
            <Button variant="secondary" onClick={() => navigate('/customers/new')} fullWidth style={{ minHeight: '60px' }}>
              <Users size={20} style={{ marginBottom: '4px' }} />
              <div>New Customer</div>
            </Button>
            <Button variant="secondary" onClick={() => navigate('/visits')} fullWidth style={{ minHeight: '60px' }}>
              <TrendingUp size={20} style={{ marginBottom: '4px' }} />
              <div>View Visits</div>
            </Button>
            <Button variant="secondary" onClick={() => navigate('/customers')} fullWidth style={{ minHeight: '60px' }}>
              <Users size={20} style={{ marginBottom: '4px' }} />
              <div>View Customers</div>
            </Button>
          </div>
        </Card>

        {pendingCount > 0 && (
          <Card padding="md" style={{ borderColor: 'var(--color-warning)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-sm)' }}>
              <Clock size={20} style={{ color: 'var(--color-warning)' }} />
              <span style={{ fontWeight: 600, color: 'var(--color-warning)' }}>Pending Sync</span>
              <Badge variant="warning" size="sm">{pendingCount} items</Badge>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', margin: 0 }}>
              Changes will sync automatically when online
            </p>
          </Card>
        )}

        <Card padding="md">
          <h2 style={{ margin: '0 0 var(--spacing-md)', fontSize: '1rem', fontWeight: 600 }}>Sync Status</h2>
          <SyncQueuePanel />
        </Card>
      </div>
    </Layout>
  )
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  return (
    <Card padding="md" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>{label}</span>
        <span style={{ color, fontSize: '1.5rem', fontWeight: 700 }}>{value}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center' }}>{icon}</div>
    </Card>
  )
}