import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useDexie } from '../../hooks/useDexie'
import { useToast } from '../ui/Toast'
import { enqueueSync } from '../../lib/sync'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Card } from '../ui/Card'
import { customerSchema, type CustomerInput } from '../../lib/validation'
import { CUSTOMER_STATUSES, type CustomerStatus } from '../../lib/constants'
import type { CustomerDexie } from '../../lib/dexie'

export function CustomerForm() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const { advisor } = useAuth()
  const { db, isReady } = useDexie()
  const { showToast } = useToast()
  const isEditing = !!id
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState<CustomerInput>({
    customerNumber: '',
    phone: '',
    postcode: '',
    address: '',
    displayName: '',
    contactPreferences: {}
  })
  const [errors, setErrors] = useState<Partial<Record<keyof CustomerInput, string>>>({})
  const [status, setStatus] = useState<CustomerStatus>('active')

  useEffect(() => {
    if (isEditing && isReady && advisor) {
      loadCustomer()
    }
  }, [isEditing, isReady, advisor])

  const loadCustomer = async () => {
    if (!advisor || !id) return
    setLoading(true)
    try {
      const customer = await db.customers
        .where('advisorId')
        .equals(advisor.id!)
        .and(c => c.customerNumber === id || String(c.id) === id)
        .first()
      
      if (customer) {
        setFormData({
          customerNumber: customer.customerNumber,
          phone: customer.phone || '',
          postcode: customer.postcode || '',
          address: customer.address || '',
          displayName: customer.displayName || '',
          contactPreferences: customer.contactPreferences || {}
        })
        setStatus(customer.status)
      } else {
        showToast('Customer not found', 'error')
        navigate('/customers')
      }
    } catch (err) {
      console.error('Failed to load customer:', err)
      showToast('Failed to load customer', 'error')
    } finally {
      setLoading(false)
    }
  }

  const validateField = (name: keyof CustomerInput, value: unknown) => {
    const fieldSchema = customerSchema.shape[name]
    if (fieldSchema) {
      const result = fieldSchema.safeParse(value)
      if (!result.success) {
        setErrors(prev => ({ ...prev, [name]: result.error.errors[0].message }))
      } else {
        setErrors(prev => { const next = { ...prev }; delete next[name]; return next })
      }
    }
  }

  const handleChange = (name: keyof CustomerInput, value: unknown) => {
    setFormData(prev => ({ ...prev, [name]: value }))
    validateField(name, value)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const result = customerSchema.safeParse(formData)
    if (!result.success) {
      const fieldErrors: typeof errors = {}
      result.error.errors.forEach(err => {
        if (err.path[0]) fieldErrors[err.path[0] as keyof CustomerInput] = err.message
      })
      setErrors(fieldErrors)
      return
    }

    if (!advisor) return

    setSaving(true)
    try {
      const now = new Date()
      const payload = {
        ...formData,
        advisorId: advisor.id,
        status,
        sourceEnv: (import.meta.env.VITE_SOURCE_ENV || 'live'),
        updatedAt: now.toISOString()
      }

      let customerId: number
      if (isEditing) {
        const existing = await db.customers
          .where('advisorId')
          .equals(advisor.id!)
          .and(c => c.customerNumber === formData.customerNumber)
          .first()
        if (existing) {
          await db.customers.update(existing.id!, { ...payload, updatedAt: now })
          customerId = existing.id!
        } else {
          throw new Error('Customer not found')
        }
      } else {
        const existing = await db.customers
          .where('advisorId')
          .equals(advisor.id!)
          .and(c => c.customerNumber === formData.customerNumber)
          .first()
        if (existing) {
          throw new Error('Customer number already exists')
        }
        customerId = await db.customers.add({ ...payload, createdAt: now } as CustomerDexie)
      }

      await enqueueSync('customers', customerId, isEditing ? 'update' : 'create', payload)
      
      showToast(isEditing ? 'Customer updated' : 'Customer created', 'success')
      navigate('/customers')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save customer'
      showToast(message, 'error')
      if (message.includes('already exists')) {
        setErrors({ customerNumber: 'This customer number already exists' })
      }
    } finally {
      setSaving(false)
    }
  }

  if (!isReady || (isEditing && loading)) {
    return <div style={{ padding: 'var(--spacing-xl)', textAlign: 'center' }}>Loading...</div>
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>
          {isEditing ? 'Edit Customer' : 'New Customer'}
        </h1>
        <Button variant="ghost" onClick={() => navigate('/customers')}>Cancel</Button>
      </div>

      <Card padding="lg">
        <Input
          label="Customer Number *"
          value={formData.customerNumber}
          onChange={(e) => handleChange('customerNumber', e.target.value.toUpperCase())}
          error={errors.customerNumber}
          placeholder="e.g. CUST-001"
          fullWidth
          disabled={isEditing}
        />

        <Input
          label="Display Name"
          value={formData.displayName}
          onChange={(e) => handleChange('displayName', e.target.value)}
          error={errors.displayName}
          placeholder="How they appear in lists"
          fullWidth
        />

        <Input
          label="Phone"
          value={formData.phone}
          onChange={(e) => handleChange('phone', e.target.value)}
          error={errors.phone}
          placeholder="+44 7xxx xxxxxx"
          type="tel"
          fullWidth
        />

        <Input
          label="Postcode"
          value={formData.postcode}
          onChange={(e) => handleChange('postcode', e.target.value.toUpperCase())}
          error={errors.postcode}
          placeholder="SW1A 1AA"
          fullWidth
        />

        <Input
          label="Address"
          value={formData.address}
          onChange={(e) => handleChange('address', e.target.value)}
          error={errors.address}
          placeholder="Full address"
          fullWidth
        />

        <Select
          label="Status"
          value={status}
          onChange={(e) => setStatus(e.target.value as CustomerStatus)}
          options={CUSTOMER_STATUSES.map(s => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1) }))}
          fullWidth
        />
      </Card>

      <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
        <Button variant="secondary" onClick={() => navigate('/customers')} fullWidth>
          Cancel
        </Button>
        <Button type="submit" loading={saving} fullWidth>
          {isEditing ? 'Update' : 'Create'} Customer
        </Button>
      </div>
    </form>
  )
}