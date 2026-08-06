import { useParams, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { useDexie } from '../../hooks/useDexie'
import { useToast } from '../components/ui/Toast'
import { Layout } from '../components/layout/Layout'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Edit, Trash2, Hash, Phone, MapPin } from 'lucide-react'
import type { CustomerDexie } from '../../lib/dexie'
import type { VisitDexie } from '../../lib/dexie'

export function CustomerDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { advisor } = useAuth()
  const { db, isReady } = useDexie()
  const { showToast } = useToast()
  const [customer, setCustomer] = useState<CustomerDexie | null>(null)
  const [visits, setVisits] = useState<VisitDexie[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (!isReady || !advisor || !id) return
    loadCustomer()
  }, [isReady, advisor, id])

  const loadCustomer = async () => {
    if (!advisor || !id) return
    setLoading(true)
    try {
      const customerData = await db.customers
        .where('advisorId')
        .equals(advisor.id!)
        .and(c => c.customerNumber === id || String(c.id) === id)
        .first()
      
      if (customerData) {
        setCustomer(customerData)
        const visitData = await db.visits
          .where('customerId')
          .equals(customerData.id!)
          .sortBy('dateTime')
        setVisits(visitData.reverse())
      }
    } catch {
      console.error('Failed to load customer:')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!customer || !confirm('Delete this customer? This cannot be undone.')) return
    
    setDeleting(true)
    try {
      await db.customers.delete(customer.id!)
      showToast('Customer deleted', 'success')
      navigate('/customers')
    } catch {
      showToast('Failed to delete customer', 'error')
    } finally {
      setDeleting(false)
    }
  }

  if (!isReady || loading) {
    return <Layout title="Customer">Loading...</Layout>
  }

  if (!customer) {
    return (
      <Layout title="Customer" showBack onBack={() => navigate('/customers')}>
        <Card padding="lg" style={{ textAlign: 'center' }}>
          <p style={{ color: 'var(--color-text-muted)', margin: '0 0 var(--spacing-md)' }}>Customer not found</p>
          <Button variant="secondary" onClick={() => navigate('/customers')}>Back to Customers</Button>
        </Card>
      </Layout>
    )
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'success' | 'warning' | 'error' | 'default'> = {
      active: 'success',
      archived: 'warning',
      blocked: 'error'
    }
    return <Badge variant={variants[status] || 'default'} size="md">{status}</Badge>
  }

  return (
    <Layout title="Customer" showBack onBack={() => navigate('/customers')}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
        <Card padding="md">
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-md)' }}>
            <div>
              <p style={{ margin: 0, fontSize: '1.125rem', fontWeight: 600 }}>
                {customer.displayName || 'Unnamed Customer'}
              </p>
              <p style={{ margin: '4px 0 0', color: 'var(--color-text-muted)' }}>
                #{customer.customerNumber}
              </p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 'var(--spacing-sm)' }}>
              {getStatusBadge(customer.status)}
              <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
                <Button variant="ghost" size="sm" onClick={() => navigate(`/customers/${customer.id}/edit`)}>
                  <Edit size={16} /> Edit
                </Button>
                <Button variant="ghost" size="sm" onClick={handleDelete} disabled={deleting}>
                  <Trash2 size={16} /> Delete
                </Button>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
            {customer.phone && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                <Phone size={16} /> {customer.phone}
              </div>
            )}
            {customer.postcode && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                <MapPin size={16} /> {customer.postcode}
              </div>
            )}
            {customer.address && (
              <div style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                {customer.address}
              </div>
            )}
          </div>
        </Card>

        <Card padding="md">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--spacing-md)' }}>
            <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>Visits ({visits.length})</h2>
            <Button variant="primary" size="sm" onClick={() => navigate('/visits/new')}>
              New Visit
            </Button>
          </div>

          {visits.length === 0 ? (
            <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: 'var(--spacing-lg)', margin: 0 }}>
              No visits yet
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
              {visits.map(visit => (
                <div
                  key={visit.id}
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between', 
                    padding: 'var(--spacing-sm)', 
                    background: 'var(--color-bg)', 
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--color-primary)' }}>
                      <Hash size={14} /> {visit.jobCode}
                    </span>
                    <span style={{ fontWeight: 500 }}>{new Date(visit.dateTime).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                    {visit.appointmentType && <Badge variant="info" size="sm">{visit.appointmentType}</Badge>}
                  </div>
                  {visit.outcome && (
                    <Badge variant={['Ordered', 'Quoted'].includes(visit.outcome) ? 'success' : 'warning'} size="sm">
                      {visit.outcome}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </Layout>
  )
}