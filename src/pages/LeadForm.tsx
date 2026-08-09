import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '@hooks/useAuth'
import { useDexie } from '@hooks/useDexie'
import { useToast } from '@components/ui/Toast'
import { Layout } from '@components/layout/Layout'
import { Card } from '@components/ui/Card'
import { Button } from '@components/ui/Button'
import { Input } from '@components/ui/Input'
import { Select } from '@components/ui/Select'
import { ChevronLeft, Save } from 'lucide-react'
import { enqueueSync } from '@lib/sync'
import { getDefaultSourceEnv } from '@lib/dexie'
import { LEAD_SOURCES, LeadSource } from '@lib/constants'
import type { LeadDexie } from '@lib/dexie'

export function LeadForm() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const { advisor } = useAuth()
  const { db, isReady } = useDexie()
  const { showToast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', phone: '', source: '' as LeadSource })
  const isEditing = !!id

  const advisorId = advisor?.id ? parseInt(advisor.id) : 0

  useEffect(() => {
    if (isEditing && isReady) {
      loadLead()
    } else {
      setLoading(false)
    }
  }, [isEditing, isReady, id])

  const loadLead = async () => {
    if (!id) return
    try {
      const lead = await db.leads.get(parseInt(id))
      if (lead) {
        setForm({ name: lead.name || '', phone: lead.phone || '', source: lead.source || '' })
      } else {
        showToast('Lead not found', 'error')
        navigate('/leads')
      }
    } catch (err) {
      showToast('Failed to load lead', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (!advisorId) return
    if (!form.name.trim() && !form.phone.trim()) {
      showToast('Please enter at least a name or phone number', 'error')
      return
    }

    setSaving(true)
    try {
      const now = new Date()
      const sourceEnv = getDefaultSourceEnv()

      if (isEditing && id) {
        await db.leads.update(parseInt(id), { ...form, updatedAt: now })
        await enqueueSync('leads', parseInt(id), 'update', form)
        showToast('Lead updated', 'success')
      } else {
        const localId = await db.leads.add({
          advisorId,
          ...form,
          landedAt: now,
          status: 'new',
          contactAttemptsCount: 0,
          sourceEnv,
          createdAt: now,
          updatedAt: now,
        } as any)

        await enqueueSync('leads', localId, 'create', {
          ...form,
          advisor_id: advisorId,
          landed_at: now.toISOString(),
          status: 'new',
          contact_attempts_count: 0,
          source_env: sourceEnv,
        })

        showToast('Lead created', 'success')
      }
      navigate('/leads')
    } catch (err) {
      showToast('Failed to save lead', 'error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <Layout title={isEditing ? 'Edit Lead' : 'New Lead'}><div style={{ padding: 'var(--spacing-xl)', textAlign: 'center' }}>Loading...</div></Layout>
  }

  return (
    <Layout title={isEditing ? 'Edit Lead' : 'New Lead'} onBack={() => navigate('/leads')}>
      <Card padding="lg" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
        <Input
          label="Name"
          value={form.name}
          onChange={e => setForm({ ...form, name: e.target.value })}
          placeholder="Lead name"
          autoFocus
        />
        <Input
          label="Phone"
          type="tel"
          value={form.phone}
          onChange={e => setForm({ ...form, phone: e.target.value })}
          placeholder="Phone number"
        />
        <Select
          label="Source"
          value={form.source}
          onChange={e => setForm({ ...form, source: e.target.value as LeadSource })}
          options={['', ...LEAD_SOURCES].map(s => ({ value: s, label: s || 'Select source' }))}
        />

        <div style={{ display: 'flex', gap: 'var(--spacing-sm)', marginTop: 'var(--spacing-md)' }}>
          <Button variant="primary" onClick={handleSubmit} disabled={saving} leftIcon={<Save size={16} />} fullWidth>
            {saving ? 'Saving...' : (isEditing ? 'Save Changes' : 'Create Lead')}
          </Button>
          <Button variant="ghost" onClick={() => navigate('/leads')} fullWidth>
            Cancel
          </Button>
        </div>
      </Card>
    </Layout>
  )
}