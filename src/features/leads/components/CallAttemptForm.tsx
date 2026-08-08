// CallAttemptForm - Form for logging a call attempt

import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '@hooks/useAuth'
import { useDexie } from '@hooks/useDexie'
import { useToast } from '@components/ui/Toast'
import { Layout } from '@components/layout/Layout'
import { Card } from '@components/ui/Card'
import { Button } from '@components/ui/Button'
import { Select } from '@components/ui/Select'
import { Input } from '@components/ui/Input'
import { ChevronLeft, Save, Phone, Mic } from 'lucide-react'
import { enqueueSync } from '@lib/sync'
import { CALL_OUTCOMES } from '@lib/constants'
import type { CallAttemptDexie, VoiceNoteDexie } from '@lib/dexie'

export function CallAttemptForm() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const { advisor } = useAuth()
  const { db, isReady } = useDexie()
  const { showToast } = useToast()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ outcome: 'connected' as const, notes: '' })

  const advisorId = advisor?.id ? parseInt(advisor.id) : 0

  const handleSubmit = async () => {
    if (!advisorId || !id) return
    setSaving(true)
    try {
      const localId = await db.callAttempts.add({
        leadId: parseInt(id),
        initiatedAt: new Date(),
        outcome: form.outcome,
        sourceEnv: (import.meta.env.VITE_SOURCE_ENV as any) || 'live',
        createdAt: new Date(),
      } as CallAttemptDexie)

      await enqueueSync('callAttempts', localId, 'create', {
        lead_id: parseInt(id),
        initiated_at: new Date().toISOString(),
        outcome: form.outcome,
        source_env: (import.meta.env.VITE_SOURCE_ENV as any) || 'live',
      })

      showToast('Call logged', 'success')
      navigate(`/leads/${id}`)
    } catch (err) {
      showToast('Failed to log call', 'error')
    } finally {
      setSaving(false)
    }
  }

  if (!isReady) {
    return <Layout title="Log Call"><div style={{ padding: 'var(--spacing-xl)', textAlign: 'center' }}>Loading...</div></Layout>
  }

  return (
    <Layout title="Log Call" onBack={() => id && navigate(`/leads/${id}`)}>
      <Card padding="lg" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', padding: 'var(--spacing-md)', background: 'var(--color-primary-muted)', borderRadius: 'var(--radius-md)' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Phone size={20} style={{ color: 'white' }} />
          </div>
          <div>
            <div style={{ fontWeight: 600 }}>Log Call Attempt</div>
            <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>Select outcome and add notes</div>
          </div>
        </div>

        <Select
          label="Outcome"
          value={form.outcome}
          onChange={e => setForm({ ...form, outcome: e.target.value as typeof form.outcome })}
          options={CALL_OUTCOMES.map(o => ({ value: o, label: o.replace('_', ' ') }))}
        />
        <Input
          label="Notes (optional)"
          value={form.notes}
          onChange={e => setForm({ ...form, notes: e.target.value })}
          placeholder="What happened on the call?"
          multiline
          rows={3}
        />

        <div style={{ display: 'flex', gap: 'var(--spacing-sm)', marginTop: 'var(--spacing-md)' }}>
          <Button variant="primary" onClick={handleSubmit} disabled={saving} leftIcon={<Save size={16} />} fullWidth>
            {saving ? 'Saving...' : 'Log Call'}
          </Button>
          <Button variant="ghost" onClick={() => id && navigate(`/leads/${id}`)} fullWidth>
            Cancel
          </Button>
        </div>
      </Card>
    </Layout>
  )
}