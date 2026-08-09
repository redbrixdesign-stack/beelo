import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '@hooks/useAuth'
import { useDexie } from '@hooks/useDexie'
import { useToast } from '@components/ui/Toast'
import { Layout } from '@components/layout/Layout'
import { Card } from '@components/ui/Card'
import { Badge } from '@components/ui/Badge'
import { Button } from '@components/ui/Button'
import { Input } from '@components/ui/Input'
import { Select } from '@components/ui/Select'
import { Calendar, Phone, Hash, Edit, Trash2, ChevronLeft, Plus, Clock, CheckCircle, AlertTriangle, Mic, Users, ArrowRight, MapPin } from 'lucide-react'
import { VoiceNoteCard } from '../voice/components/VoiceNoteCard'
import { LEAD_STATUSES, LEAD_SOURCES, CALL_OUTCOMES } from '@lib/constants'
import { enqueueSync } from '@lib/sync'
import type { LeadDexie, CallAttemptDexie, VoiceNoteDexie } from '@lib/dexie'

export function LeadDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { advisor } = useAuth()
  const { db, isReady } = useDexie()
  const { showToast } = useToast()
  const [lead, setLead] = useState<LeadDexie | null>(null)
  const [callAttempts, setCallAttempts] = useState<CallAttemptDexie[]>([])
  const [voiceNotes, setVoiceNotes] = useState<VoiceNoteDexie[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState({ name: '', phone: '', source: '' })
  const [showCallForm, setShowCallForm] = useState(false)
  const [callForm, setCallForm] = useState({ outcome: 'connected' as const, notes: '' })

  const advisorId = advisor?.id ? parseInt(advisor.id) : 0

  const loadData = useCallback(async () => {
    if (!id || !isReady) return
    setLoading(true)
    try {
      const leadData = await db.leads.get(parseInt(id))
      if (!leadData) {
        showToast('Lead not found', 'error')
        navigate('/leads')
        return
      }
      setLead(leadData)
      setEditForm({ name: leadData.name || '', phone: leadData.phone || '', source: leadData.source || '' })

      const calls = await db.callAttempts.where('leadId').equals(parseInt(id)).reverse().sortBy('initiatedAt')
      setCallAttempts(calls)

      const notes = await db.voiceNotes.where('leadId').equals(parseInt(id)).reverse().sortBy('recordedAt')
      setVoiceNotes(notes)
    } catch (err) {
      showToast('Failed to load lead', 'error')
    } finally {
      setLoading(false)
    }
  }, [id, isReady, db, navigate, showToast])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleSave = async () => {
    if (!lead || !advisorId) return
    try {
      await db.leads.update(lead.id!, { ...editForm, updatedAt: new Date() })
      await enqueueSync('leads', lead.id!, 'update', editForm)
      setLead({ ...lead, ...editForm, updatedAt: new Date() })
      setEditing(false)
      showToast('Lead updated', 'success')
    } catch (err) {
      showToast('Failed to update lead', 'error')
    }
  }

  const handleDelete = async () => {
    if (!lead || !confirm('Delete this lead? This cannot be undone.')) return
    setDeleting(true)
    try {
      await db.leads.delete(lead.id!)
      await enqueueSync('leads', lead.id!, 'delete', {})
      showToast('Lead deleted', 'success')
      navigate('/leads')
    } catch (err) {
      showToast('Failed to delete lead', 'error')
    } finally {
      setDeleting(false)
    }
  }

  const handleAddCall = async () => {
    if (!lead || !advisorId) return
    try {
      const localId = await db.callAttempts.add({
        leadId: lead.id!,
        initiatedAt: new Date(),
        outcome: callForm.outcome,
        sourceEnv: (import.meta.env.VITE_SOURCE_ENV as 'demo' | 'qa' | 'live') || 'live',
        createdAt: new Date(),
      } as any)

      await enqueueSync('callAttempts', localId, 'create', {
        lead_id: lead.id,
        initiated_at: new Date().toISOString(),
        outcome: callForm.outcome,
        source_env: (import.meta.env.VITE_SOURCE_ENV as 'demo' | 'qa' | 'live') || 'live',
      })

      await loadData()
      setShowCallForm(false)
      setCallForm({ outcome: 'connected', notes: '' })
      showToast('Call logged', 'success')
    } catch (err) {
      showToast('Failed to log call', 'error')
    }
  }

  const handleConvertToVisit = async () => {
    if (!lead) return
    showToast('Visit creation coming in Phase 4', 'info')
  }

  const getStatusBadge = (status: LeadDexie['status']) => {
    const variants: Record<LeadDexie['status'], 'success' | 'warning' | 'info' | 'default' | 'error'> = {
      new: 'info',
      call_attempted: 'warning',
      connected: 'success',
      no_response: 'warning',
      follow_up_due: 'warning',
      converted_to_visit: 'success',
      lost: 'error',
    }
    const labels: Record<LeadDexie['status'], string> = {
      new: 'New',
      call_attempted: 'Called',
      connected: 'Connected',
      no_response: 'No Response',
      follow_up_due: 'Follow Up',
      converted_to_visit: 'Converted',
      lost: 'Lost',
    }
    return <Badge variant={variants[status]} size="md">{labels[status]}</Badge>
  }

  if (!isReady || loading) {
    return <Layout title="Lead"><div style={{ padding: 'var(--spacing-xl)', textAlign: 'center' }}>Loading...</div></Layout>
  }

  if (!lead) {
    return <Layout title="Lead"><div style={{ padding: 'var(--spacing-xl)', textAlign: 'center' }}>Lead not found</div></Layout>
  }

  return (
    <Layout title={lead.name || 'Lead'} onBack={() => navigate('/leads')}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
        <Card padding="lg" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--spacing-sm)' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>{lead.name || 'Unnamed Lead'}</h2>
              <div style={{ marginTop: 'var(--spacing-xs)', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                {lead.phone || 'No phone'}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
              {getStatusBadge(lead.status)}
              {lead.source && <Badge variant="default" size="md">{lead.source}</Badge>}
            </div>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-md)' }}>
            {lead.phone && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', padding: 'var(--spacing-sm) var(--spacing-md)', background: 'var(--color-surface)', borderRadius: 'var(--radius-md)' }}>
                <Phone size={16} /> {lead.phone}
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', padding: 'var(--spacing-sm) var(--spacing-md)', background: 'var(--color-surface)', borderRadius: 'var(--radius-md)' }}>
              <Calendar size={16} /> Added {new Date(lead.landedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', padding: 'var(--spacing-sm) var(--spacing-md)', background: 'var(--color-surface)', borderRadius: 'var(--radius-md)' }}>
              <Clock size={16} /> {lead.contactAttemptsCount} call{lead.contactAttemptsCount > 1 ? 's' : ''} attempted
            </div>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-md)' }}>
            <Button variant={editing ? 'primary' : 'secondary'} onClick={() => setEditing(!editing)} leftIcon={editing ? undefined : <Edit size={16} />}>
              {editing ? 'Save' : 'Edit'}
            </Button>
            <Button variant="secondary" onClick={() => setShowCallForm(true)} leftIcon={<Plus size={16} />}>
              Log Call
            </Button>
            <Button variant="secondary" onClick={handleConvertToVisit} leftIcon={<ArrowRight size={16} />}>
              Convert to Visit
            </Button>
            <Button variant="ghost" onClick={handleDelete} leftIcon={<Trash2 size={16} />} disabled={deleting}>
              Delete
            </Button>
          </div>

          {editing && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)', paddingTop: 'var(--spacing-md)', borderTop: '1px solid var(--color-border)' }}>
              <Input
                label="Name"
                value={editForm.name}
                onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                placeholder="Lead name"
              />
              <Input
                label="Phone"
                type="tel"
                value={editForm.phone}
                onChange={e => setEditForm({ ...editForm, phone: e.target.value })}
                placeholder="Phone number"
              />
              <Select
                label="Source"
                value={editForm.source}
                onChange={e => setEditForm({ ...editForm, source: e.target.value as LeadDexie['source'] })}
                options={['', ...LEAD_SOURCES].map(s => ({ value: s, label: s || 'Select source' }))}
              />
            </div>
          </Card>
        )}

        {showCallForm && (
          <Card padding="lg" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>Log Call</h3>
            <Select
              label="Outcome"
              value={callForm.outcome}
              onChange={e => setCallForm({ ...callForm, outcome: e.target.value as typeof callForm.outcome })}
              options={CALL_OUTCOMES.map(o => ({ value: o, label: o.replace('_', ' ') }))}
            />
            <Input
              label="Notes (optional)"
              value={callForm.notes}
              onChange={e => setCallForm({ ...callForm, notes: e.target.value })}
              placeholder="What happened on the call?"
              multiline
              rows={3}
            />
            <div style={{ display: 'flex', gap: 'var(--spacing-sm)', marginTop: 'var(--spacing-md)' }}>
              <Button onClick={handleAddCall} leftIcon={<CheckCircle size={16} />} fullWidth>
                Save Call
              </Button>
              <Button variant="ghost" onClick={() => setShowCallForm(false)} fullWidth>
                Cancel
              </Button>
            </div>
          </Card>
        )}

        {callAttempts.length > 0 && (
          <Card padding="lg">
            <h3 style={{ margin: '0 0 var(--spacing-md)', fontSize: '1rem', fontWeight: 600 }}>Call History</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
              {callAttempts.map(call => (
                <div key={call.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--spacing-sm)', background: 'var(--color-surface)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                    <Badge variant="default" size="sm">{call.outcome.replace('_', ' ')}</Badge>
                    <span style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                      {new Date(call.initiatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {voiceNotes.length > 0 && (
          <Card padding="lg">
            <h3 style={{ margin: '0 0 var(--spacing-md)', fontSize: '1rem', fontWeight: 600 }}>Voice Notes</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
              {voiceNotes.map(note => (
                <VoiceNoteCard key={note.id} note={note} compact />
              ))}
            </div>
          </Card>
        )}
      </div>
    </Layout>
  )
}