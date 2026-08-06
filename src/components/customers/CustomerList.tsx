import { useState, useEffect } from 'react'
import { Search, Plus, ChevronRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useDexie } from '../../hooks/useDexie'
import { useAuth } from '../../hooks/useAuth'
import { Card } from '../ui/Card'
import { Input } from '../ui/Input'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import type { CustomerDexie } from '../../lib/dexie'

export function CustomerList() {
  const navigate = useNavigate()
  const { db, isReady } = useDexie()
  const { advisor } = useAuth()
  const [customers, setCustomers] = useState<CustomerDexie[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isReady || !advisor) return
    loadCustomers()
  }, [isReady, advisor])

  const loadCustomers = async () => {
    if (!advisor) return
    setLoading(true)
    try {
      const data = await db.customers
        .where('advisorId')
        .equals(advisor.id!)
        .sortBy('createdAt')
      setCustomers(data.reverse())
    } catch (_err) {
      console.error('Failed to load customers:', _err)
    } finally {
      setLoading(false)
    }
  }

  const filteredCustomers = customers.filter(c =>
    c.displayName?.toLowerCase().includes(search.toLowerCase()) ||
    c.customerNumber.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search) ||
    c.postcode?.toLowerCase().includes(search.toLowerCase())
  )

  const handleCreate = () => navigate('/customers/new')

  if (!isReady) {
    return <div style={{ padding: 'var(--spacing-xl)', textAlign: 'center' }}>Loading...</div>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>Customers</h1>
        <Button onClick={handleCreate} size="sm">
          <Plus size={18} /> New Customer
        </Button>
      </div>

      <Input
        placeholder="Search customers..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        leftIcon={<Search size={20} />}
        fullWidth
        style={{ maxWidth: '360px' }}
      />

      {loading ? (
        <div style={{ padding: 'var(--spacing-xl)', textAlign: 'center', color: 'var(--color-text-muted)' }}>
          Loading customers...
        </div>
      ) : filteredCustomers.length === 0 ? (
        <Card padding="lg" style={{ textAlign: 'center' }}>
          <p style={{ color: 'var(--color-text-muted)', margin: '0 0 var(--spacing-md)' }}>
            {search ? 'No customers match your search' : 'No customers yet'}
          </p>
          {!search && <Button onClick={handleCreate}><Plus size={18} /> Add First Customer</Button>}
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
          {filteredCustomers.map(customer => (
            <CustomerCard key={customer.id} customer={customer} />
          ))}
        </div>
      )}
    </div>
  )
}

function CustomerCard({ customer }: { customer: CustomerDexie }) {
  const navigate = useNavigate()

  return (
    <Card
      onClick={() => navigate(`/customers/${customer.id}`)}
      hoverable
      padding="md"
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--spacing-md)' }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontWeight: 600, fontSize: '1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {customer.displayName || 'Unnamed Customer'}
        </p>
        <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: 'var(--color-text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          #{customer.customerNumber} {customer.phone ? `• ${customer.phone}` : ''}
        </p>
        {customer.address && (
          <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: 'var(--color-text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {customer.address}
          </p>
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
        <Badge variant={customer.status === 'active' ? 'success' : 'default'} size="sm">
          {customer.status}
        </Badge>
        <ChevronRight size={20} style={{ color: 'var(--color-text-muted)' }} />
      </div>
    </Card>
  )
}