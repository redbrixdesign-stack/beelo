import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useDexie } from '../../hooks/useDexie'
import { useToast } from '../ui/Toast'
import { enqueueSync } from '../../lib/sync'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { Card } from '../ui/Card'
import { visitSchema, type VisitInput } from '../../lib/validation'
import { 
  OUTCOME_TAXONOMY, 
  APPOINTMENT_TYPES, 
  JOB_SOURCES, 
  type OutcomeTaxonomy, 
  type AppointmentType, 
  type JobSource 
} from '../../lib/constants'
import type { VisitDexie } from '../../lib/dexie'

export function VisitForm() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const { advisor } = useAuth()
  const { db, isReady } = useDexie()
  const { showToast } = useToast()
  const isEditing = !!id
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState<VisitInput>({
    customerId: '',
    customerNumber: '',
    appointmentNumber: '',
    jobCode: '',
    orderNumber: '',
    appointmentType: 'sales',
    jobSource: 'self_sold',
    dateTime: new Date().toISOString(),
    timeSlotStart: undefined,
    timeSlotEnd: undefined,
    status: '',
    contactedCustomer: false,
    blindCount: undefined,
    preVisitNotes: '',
    companyScheduledDurationMinutes: undefined,
    estimatedDurationMinutes: undefined,
    location: '',
    sourceDocumentId: undefined,
    outcome: undefined,
    outcomeValue: undefined,
    discountPercent: undefined,
    commissionAmount: undefined,
    notes: ''
  })
  const [errors, setErrors] = useState<Partial<Record<keyof VisitInput, string>>>({})
  const [customers, setCustomers] = useState<Array<{ id: number; customerNumber: string; displayName?: string }>>([])

  useEffect(() => {
    if (isReady && advisor) {
      loadCustomers()
    }
  }, [isReady, advisor])

  useEffect(() => {
    if (isEditing && isReady && advisor) {
      loadVisit()
    }
  }, [isEditing, isReady, advisor])

  const loadCustomers = async () => {
    if (!advisor) return
    try {
      const data = await db.customers
        .where('advisorId')
        .equals(advisor.id!)
        .sortBy('createdAt')
      setCustomers(data.reverse().map(c => ({ 
        id: c.id!, 
        customerNumber: c.customerNumber, 
        displayName: c.displayName 
      })))
    } catch (err) {
      console.error('Failed to load customers:', err)
    }
  }

  const loadVisit = async () => {
    if (!advisor || !id) return
    setLoading(true)
    try {
      const visit = await db.visits
        .where('advisorId')
        .equals(advisor.id!)
        .and(v => String(v.id) === id)
        .first()
      
      if (visit) {
        setFormData({
          customerId: String(visit.customerId),
          customerNumber: visit.customerNumber,
          appointmentNumber: visit.appointmentNumber || '',
          jobCode: visit.jobCode,
          orderNumber: visit.orderNumber || '',
          appointmentType: visit.appointmentType,
          jobSource: visit.jobSource,
          dateTime: new Date(visit.dateTime).toISOString().slice(0, 16),
          timeSlotStart: visit.timeSlotStart ? new Date(visit.timeSlotStart).toISOString().slice(0, 16) : undefined,
          timeSlotEnd: visit.timeSlotEnd ? new Date(visit.timeSlotEnd).toISOString().slice(0, 16) : undefined,
          status: visit.status || '',
          contactedCustomer: visit.contactedCustomer,
          blindCount: visit.blindCount,
          preVisitNotes: visit.preVisitNotes || '',
          companyScheduledDurationMinutes: visit.companyScheduledDurationMinutes,
          estimatedDurationMinutes: visit.estimatedDurationMinutes,
          location: visit.location || '',
          sourceDocumentId: visit.sourceDocumentId ? String(visit.sourceDocumentId) : undefined,
          outcome: visit.outcome,
          outcomeValue: visit.outcomeValue,
          discountPercent: visit.discountPercent,
          commissionAmount: visit.commissionAmount,
          notes: visit.notes || ''
        })
      } else {
        showToast('Visit not found', 'error')
        navigate('/visits')
      }
    } catch (err) {
      console.error('Failed to load visit:', err)
      showToast('Failed to load visit', 'error')
    } finally {
      setLoading(false)
    }
  }

  const validateField = (name: keyof VisitInput, value: unknown) => {
    const fieldSchema = visitSchema.shape[name]
    if (fieldSchema) {
      const result = fieldSchema.safeParse(value)
      if (!result.success) {
        setErrors(prev => ({ ...prev, [name]: result.error.errors[0].message }))
      } else {
        setErrors(prev => { const next = { ...prev }; delete next[name]; return next })
      }
    }
  }

  const handleChange = (name: keyof VisitInput, value: unknown) => {
    setFormData(prev => ({ ...prev, [name]: value }))
    validateField(name, value)
  }

  const handleCustomerChange = (customerId: string) => {
    const customer = customers.find(c => String(c.id) === customerId)
    handleChange('customerId', customerId)
    handleChange('customerNumber', customer?.customerNumber || '')
  }

  const handleBlindCountChange = (value: number) => {
    handleChange('blindCount', value)
    if (advisor && value) {
      const estimated = value * advisor.fullJobMinutesPerBlind
      handleChange('estimatedDurationMinutes', estimated)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const result = visitSchema.safeParse(formData)
    if (!result.success) {
      const fieldErrors: typeof errors = {}
      result.error.errors.forEach(err => {
        if (err.path[0]) fieldErrors[err.path[0] as keyof VisitInput] = err.message
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
        customerId: parseInt(formData.customerId),
        dateTime: new Date(formData.dateTime).toISOString(),
        timeSlotStart: formData.timeSlotStart ? new Date(formData.timeSlotStart).toISOString() : null,
        timeSlotEnd: formData.timeSlotEnd ? new Date(formData.timeSlotEnd).toISOString() : null,
        sourceEnv: (import.meta.env.VITE_SOURCE_ENV || 'live'),
        sourceDocumentId: formData.sourceDocumentId ? parseInt(formData.sourceDocumentId) : null,
        estimatedDurationMinutes: formData.estimatedDurationMinutes ?? 
          (formData.blindCount ? formData.blindCount * advisor.fullJobMinutesPerBlind : null),
        updatedAt: now.toISOString()
      }

      let visitId: number
      if (isEditing) {
        const existing = await db.visits
          .where('advisorId')
          .equals(advisor.id!)
          .and(v => String(v.id) === id)
          .first()
        if (existing) {
          await db.visits.update(existing.id!, { ...payload, updatedAt: now })
          visitId = existing.id!
        } else {
          throw new Error('Visit not found')
        }
      } else {
        visitId = await db.visits.add({ ...payload, createdAt: now } as VisitDexie)
      }

      await enqueueSync('visits', visitId, isEditing ? 'update' : 'create', payload)
      
      showToast(isEditing ? 'Visit updated' : 'Visit created', 'success')
      navigate('/visits')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save visit'
      showToast(message, 'error')
    } finally {
      setSaving(false)
    }
  }

  if (!isReady || (isEditing && loading)) {
    return <div style={{ padding: 'var(--spacing-xl)', textAlign: 'center' }}>Loading...</div>
  }

  const customerOptions = customers.map(c => ({ 
    value: String(c.id), 
    label: `${c.displayName || 'Unnamed'} (${c.customerNumber})` 
  }))

  const outcomeOptions = [
    { value: '', label: 'Select outcome...' },
    ...OUTCOME_TAXONOMY.map(o => ({ value: o, label: o }))
  ]

  const appointmentTypeOptions = APPOINTMENT_TYPES.map(t => ({ 
    value: t, 
    label: t.charAt(0).toUpperCase() + t.slice(1) 
  }))

  const jobSourceOptions = JOB_SOURCES.map(s => ({ 
    value: s, 
    label: s === 'self_sold' ? 'Self Sold' : 'Company Assigned' 
  }))

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>
          {isEditing ? 'Edit Visit' : 'New Visit'}
        </h1>
        <Button variant="ghost" onClick={() => navigate('/visits')}>Cancel</Button>
      </div>

      <Card padding="lg">
        <h2 style={{ margin: '0 0 var(--spacing-md)', fontSize: '1rem', fontWeight: 600 }}>Job Details</h2>
        
        <Select
          label="Customer *"
          value={formData.customerId}
          onChange={(e) => handleCustomerChange(e.target.value)}
          options={customerOptions}
          placeholder="Select customer"
          fullWidth
          error={!formData.customerId && errors.customerId ? 'Required' : undefined}
        />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 'var(--spacing-md)' }}>
          <Input
            label="Job Code *"
            value={formData.jobCode.toUpperCase()}
            onChange={(e) => handleChange('jobCode', e.target.value.toUpperCase())}
            error={errors.jobCode}
            placeholder="H342 or H301A"
            fullWidth
          />
          <Input
            label="Appointment Number"
            value={formData.appointmentNumber}
            onChange={(e) => handleChange('appointmentNumber', e.target.value)}
            error={errors.appointmentNumber}
            placeholder="Optional"
            fullWidth
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 'var(--spacing-md)' }}>
          <Select
            label="Appointment Type *"
            value={formData.appointmentType}
            onChange={(e) => handleChange('appointmentType', e.target.value as AppointmentType)}
            options={appointmentTypeOptions}
            fullWidth
          />
          <Select
            label="Job Source *"
            value={formData.jobSource}
            onChange={(e) => handleChange('jobSource', e.target.value as JobSource)}
            options={jobSourceOptions}
            fullWidth
          />
        </div>

        <Input
          label="Date & Time *"
          type="datetime-local"
          value={formData.dateTime}
          onChange={(e) => handleChange('dateTime', e.target.value)}
          error={errors.dateTime}
          fullWidth
        />
      </Card>

      <Card padding="lg">
        <h2 style={{ margin: '0 0 var(--spacing-md)', fontSize: '1rem', fontWeight: 600 }}>Schedule</h2>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 'var(--spacing-md)' }}>
          <Input
            label="Slot Start"
            type="datetime-local"
            value={formData.timeSlotStart || ''}
            onChange={(e) => handleChange('timeSlotStart', e.target.value || undefined)}
            error={errors.timeSlotStart}
            fullWidth
          />
          <Input
            label="Slot End"
            type="datetime-local"
            value={formData.timeSlotEnd || ''}
            onChange={(e) => handleChange('timeSlotEnd', e.target.value || undefined)}
            error={errors.timeSlotEnd}
            fullWidth
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 'var(--spacing-md)' }}>
          <Input
            label="Blind Count"
            type="number"
            min="1"
            value={formData.blindCount ?? ''}
            onChange={(e) => handleBlindCountChange(e.target.value ? parseInt(e.target.value) : 0)}
            error={errors.blindCount}
            placeholder="e.g. 8"
            fullWidth
          />
          <Input
            label="Company Slot (min)"
            type="number"
            min="1"
            value={formData.companyScheduledDurationMinutes ?? ''}
            onChange={(e) => handleChange('companyScheduledDurationMinutes', e.target.value ? parseInt(e.target.value) : undefined)}
            error={errors.companyScheduledDurationMinutes}
            fullWidth
          />
        </div>

        {formData.estimatedDurationMinutes && (
          <p style={{ margin: 'var(--spacing-sm) 0 0', fontSize: '0.875rem', color: 'var(--color-primary)' }}>
            Estimated duration: {formData.estimatedDurationMinutes} min ({formData.blindCount} blinds × {advisor?.fullJobMinutesPerBlind} min)
            {formData.companyScheduledDurationMinutes && formData.estimatedDurationMinutes > formData.companyScheduledDurationMinutes && (
              <span style={{ color: 'var(--color-error)', marginLeft: 'var(--spacing-sm)' }}>
                ⚠ Exceeds company slot by {formData.estimatedDurationMinutes - formData.companyScheduledDurationMinutes} min
              </span>
            )}
          </p>
        )}

        <Input
          label="Location / Address"
          value={formData.location}
          onChange={(e) => handleChange('location', e.target.value)}
          error={errors.location}
          placeholder="Full address or landmark"
          fullWidth
        />
      </Card>

      <Card padding="lg">
        <h2 style={{ margin: '0 0 var(--spacing-md)', fontSize: '1rem', fontWeight: 600 }}>Outcome & Notes</h2>
        
        <Select
          label="Outcome"
          value={formData.outcome || ''}
          onChange={(e) => handleChange('outcome', e.target.value as OutcomeTaxonomy || undefined)}
          options={outcomeOptions}
          fullWidth
        />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 'var(--spacing-md)' }}>
          <Input
            label="Outcome Value (£)"
            type="number"
            step="0.01"
            min="0"
            value={formData.outcomeValue ?? ''}
            onChange={(e) => handleChange('outcomeValue', e.target.value ? parseFloat(e.target.value) : undefined)}
            error={errors.outcomeValue}
            fullWidth
          />
          <Input
            label="Discount (%)"
            type="number"
            step="0.01"
            min="0"
            max="100"
            value={formData.discountPercent ?? ''}
            onChange={(e) => handleChange('discountPercent', e.target.value ? parseFloat(e.target.value) : undefined)}
            error={errors.discountPercent}
            fullWidth
          />
          <Input
            label="Commission (£)"
            type="number"
            step="0.01"
            min="0"
            value={formData.commissionAmount ?? ''}
            onChange={(e) => handleChange('commissionAmount', e.target.value ? parseFloat(e.target.value) : undefined)}
            error={errors.commissionAmount}
            fullWidth
          />
        </div>

        <Input
          label="Pre-Visit Notes"
          value={formData.preVisitNotes}
          onChange={(e) => handleChange('preVisitNotes', e.target.value)}
          error={errors.preVisitNotes}
          placeholder="Parking, access, special instructions..."
          fullWidth
          multiline
          rows={2}
        />

        <Input
          label="General Notes"
          value={formData.notes}
          onChange={(e) => handleChange('notes', e.target.value)}
          error={errors.notes}
          placeholder="Any other notes..."
          fullWidth
          multiline
          rows={2}
        />
      </Card>

      <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
        <Button variant="secondary" onClick={() => navigate('/visits')} fullWidth>
          Cancel
        </Button>
        <Button type="submit" loading={saving} fullWidth>
          {isEditing ? 'Update' : 'Create'} Visit
        </Button>
      </div>
    </form>
  )
}