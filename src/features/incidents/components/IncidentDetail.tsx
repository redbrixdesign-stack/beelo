// IncidentDetail - Detail view for an incident

import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useIncidents } from '../hooks/useIncidents'
import { Layout } from '@components/layout/Layout'
import { Card } from '@components/ui/Card'
import { Badge } from '@components/ui/Badge'
import { Button } from '@components/ui/Button'
import { Input } from '@components/ui/Input'
import { Select } from '@components/ui/Select'
import { AlertTriangle, ChevronLeft, Edit, Trash2, Clock, CheckCircle, AlertCircle, Hash, Users, FileText } from 'lucide-react'
import { INCIDENT_TYPES, IncidentType, INCIDENT_CAUSES, IncidentCause, INCIDENT_RESOLUTIONS, IncidentResolution, INCIDENT_CROSS_CHECK_STATUSES, IncidentCrossCheckStatus, LOGISTICS_LEGS, PENALTY_TIERS, SERVICE_CALL_OUTCOMES } from '@lib/constants'
import type { IncidentDexie } from '@lib/dexie'

export function IncidentDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { incidents, loadIncidents, getIncident, updateIncident } = useIncidents()
  const [incident, setIncident] = useState<IncidentDexie | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState<Record<string, any>>({})

  useEffect(() => {
    if (id) loadData()
  }, [id])

  const loadData = async () => {
    if (!id) return
    setLoading(true)
    try {
      const inc = await getIncident(parseInt(id))
      if (!inc) {
        navigate('/incidents')
        return
      }
      setIncident(inc)
      setEditForm({
        type: inc.type,
        cause: inc.cause,
        causeDetail: inc.causeDetail || '',
        countsTowardDor: inc.countsTowardDor,
        description: inc.description || '',
        resolutionStatus: inc.resolutionStatus,
        photos: inc.photos || [],
        notes: inc.notes || '',
        commissionLineItemId: inc.commissionLineItemId || '',
        logisticsLeg: inc.logisticsLeg || '',
        originalFitVisitId: inc.originalFitVisitId || '',
        withinWarrantyPeriod: inc.withinWarrantyPeriod,
        serviceCallOutcome: inc.serviceCallOutcome || '',
        dorRateAtTimePercent: inc.dorRateAtTimePercent || '',
        penaltyTier: inc.penaltyTier || '',
        blindsAffectedCount: inc.blindsAffectedCount || '',
        penaltyAmount: inc.penaltyAmount || '',
        saleValueLost: inc.saleValueLost || '',
        clientAgreedToRemake: inc.clientAgreedToRemake,
        remakeMaterialCost: inc.remakeMaterialCost || '',
        remakeLabourAbsorbed: inc.remakeLabourAbsorbed || '',
        crossCheckStatus: inc.crossCheckStatus || '',
        commissionRateExpected: inc.commissionRateExpected || '',
        commissionRateActual: inc.commissionRateActual || '',
      })
    } catch (err) {
      navigate('/incidents')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!incident) return
    setSaving(true)
    try {
      await updateIncident(incident.id!, editForm)
      setEditing(false)
      // Reload
      const updated = await getIncident(incident.id!)
      if (updated) setIncident(updated)
    } catch (err) {
      console.error('Failed to update incident:', err)
    } finally {
      setSaving(false)
    }
  }

  const getTypeBadge = (type: IncidentType) => {
    const variants: Record<string, 'success' | 'warning' | 'info' | 'default' | 'error'> = {
      mismeasurement: 'error',
      wrong_colour: 'warning',
      wrong_product: 'warning',
      installation_damage: 'error',
      window_breakage: 'error',
      logistics_damage: 'warning',
      theft: 'error',
      warranty_malfunction: 'info',
      other: 'default',
    }
    return <Badge variant={variants[type]} size="sm">{type.replace(/_/g, ' ')}</Badge>
  }

  const getResolutionBadge = (status: IncidentResolution) => {
    const variants: Record<string, 'success' | 'warning' | 'info' | 'default' | 'error'> = {
      open: 'error',
      in_progress: 'warning',
      resolved: 'success',
      disputed: 'warning',
      closed: 'default',
    }
    return <Badge variant={variants[status]} size="sm">{status.replace(/_/g, ' ')}</Badge>
  }

  if (loading) {
    return <Layout title="Incident"><div style={{ padding: 'var(--spacing-xl)', textAlign: 'center' }}>Loading...</div></Layout>
  }

  if (!incident) {
    return <Layout title="Incident"><div style={{ padding: 'var(--spacing-xl)', textAlign: 'center' }}>Incident not found</div></Layout>
  }

  return (
    <Layout title="Incident" onBack={() => navigate('/incidents')}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
        <Card padding="lg">
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--spacing-md)' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', flexWrap: 'wrap', marginBottom: 'var(--spacing-sm)' }}>
                <AlertTriangle size={24} style={{ color: 'var(--color-error)' }} />
                <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600' }}>
                  {incident.jobCode || 'Unknown Job'}
                </h2>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', flexWrap: 'wrap' }}>
                <Badge variant="error" size="md">{incident.type.replace(/_/g, ' ')}</Badge>
                <Badge variant="error" size="md">{incident.resolutionStatus.replace(/_/g, ' ')}</Badge>
                {incident.countsTowardDor && <Badge variant="error" size="md">DOR</Badge>}
                {incident.crossCheckStatus && <Badge variant="info" size="md">{incident.crossCheckStatus}</Badge>}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
              <Button variant={editing ? 'primary' : 'secondary'} onClick={() => setEditing(!editing)} leftIcon={editing ? undefined : <Edit size={16} />}>
                {editing ? 'Save' : 'Edit'}
              </Button>
              <Button variant="ghost" onClick={() => navigate('/incidents')}>
                Back
              </Button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--spacing-md)', marginTop: 'var(--spacing-md)' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--color-text-muted)', marginBottom: 'var(--spacing-xs)' }}>Cause</label>
              <div style={{ fontWeight: 500 }}>{incident.cause.replace(/_/g, ' ')}</div>
            </div>
            {incident.causeDetail && (
              <div>
                <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--color-text-muted)', marginBottom: 'var(--spacing-xs)' }}>Cause Detail</label>
                <div style={{ fontWeight: 500 }}>{incident.causeDetail}</div>
              </div>
            )}
            <div>
              <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--color-text-muted)', marginBottom: 'var(--spacing-xs)' }}>DOR Impact</label>
              <Badge variant={incident.countsTowardDor ? 'error' : 'success'} size="sm">
                {incident.countsTowardDor ? 'Counts toward DOR' : 'No DOR impact'}
              </Badge>
            </div>
            {incident.penaltyAmount && (
              <div>
                <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--color-text-muted)', marginBottom: 'var(--spacing-xs)' }}>Penalty Amount</label>
                <div style={{ fontWeight: 600, color: 'var(--color-error)' }}>£{incident.penaltyAmount}</div>
              </div>
            )}
            {incident.dorRateAtTimePercent && (
              <div>
                <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--color-text-muted)', marginBottom: 'var(--spacing-xs)' }}>DOR Rate at Time</label>
                <div style={{ fontWeight: 500 }}>{incident.dorRateAtTimePercent}%</div>
              </div>
            )}
            {incident.penaltyTier && (
              <div>
                <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--color-text-muted)', marginBottom: 'var(--spacing-xs)' }}>Penalty Tier</label>
                <Badge variant="warning" size="sm">{incident.penaltyTier}</Badge>
              </div>
            )}
            {incident.blindsAffectedCount && (
              <div>
                <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--color-text-muted)', marginBottom: 'var(--spacing-xs)' }}>Blinds Affected</label>
                <div style={{ fontWeight: 500 }}>{incident.blindsAffectedCount}</div>
              </div>
            )}
            {incident.saleValueLost && (
              <div>
                <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--color-text-muted)', marginBottom: 'var(--spacing-xs)' }}>Sale Value Lost</label>
                <div style={{ fontWeight: 500 }}>£{incident.saleValueLost}</div>
              </div>
            )}
            {incident.crossCheckStatus && (
              <div>
                <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--color-text-muted)', marginBottom: 'var(--spacing-xs)' }}>Cross-Check Status</label>
                <Badge variant="info" size="sm">{incident.crossCheckStatus}</Badge>
              </div>
            )}
            {incident.commissionRateExpected && incident.commissionRateActual && (
              <div>
                <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--color-text-muted)', marginBottom: 'var(--spacing-xs)' }}>Commission Rate</label>
                <div style={{ fontWeight: 500 }}>
                  Expected: {incident.commissionRateExpected}% / Actual: {incident.commissionRateActual}%
                </div>
              </div>
            )}
          </div>

          {incident.description && (
            <div style={{ marginTop: 'var(--spacing-md)', padding: 'var(--spacing-md)', background: 'var(--color-surface)', borderRadius: 'var(--radius-md)' }}>
              <strong>Description:</strong> {incident.description}
            </div>
          )}

          {incident.notes && (
            <div style={{ marginTop: 'var(--spacing-md)', padding: 'var(--spacing-md)', background: 'var(--color-surface)', borderRadius: 'var(--radius-md)' }}>
              <strong>Notes:</strong> {incident.notes}
            </div>
          )}

          <div style={{ marginTop: 'var(--spacing-md)', display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-xs)', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
            <span><Clock size={12} /> Discovered: {new Date(incident.discoveredAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
            {incident.detectedAt && <span>Detected: {new Date(incident.detectedAt).toLocaleDateString()}</span>}
            {incident.sourceDocumentId && <span>Source Doc: #{incident.sourceDocumentId}</span>}
            {incident.fitLineItemId && <span>Fit Line: #{incident.fitLineItemId}</span>}
            {incident.commissionLineItemId && <span>Commission Line: #{incident.commissionLineItemId}</span>}
          </div>
        </Card>

        {editing && (
          <Card padding="lg" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600' }}>Edit Incident</h3>

            <Select
              label="Type"
              value={editForm.type}
              onChange={e => setEditForm({ ...editForm, type: e.target.value as IncidentType })}
              options={INCIDENT_TYPES.map(t => ({ value: t, label: t.replace(/_/g, ' ') }))}
            />

            <Select
              label="Cause"
              value={editForm.cause}
              onChange={e => setEditForm({ ...editForm, cause: e.target.value as IncidentCause })}
              options={INCIDENT_CAUSES.map(c => ({ value: c, label: c.replace(/_/g, ' ') }))}
            />

            <Input
              label="Cause Detail"
              value={editForm.causeDetail}
              onChange={e => setEditForm({ ...editForm, causeDetail: e.target.value })}
              placeholder="Additional details about the cause"
            />

            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
              <input
                type="checkbox"
                id="countsTowardDor"
                checked={editForm.countsTowardDor}
                onChange={e => setEditForm({ ...editForm, countsTowardDor: e.target.checked })}
              />
              <label htmlFor="countsTowardDor" style={{ fontSize: '0.875rem' }}>Counts toward DOR</label>
            </div>

            <Select
              label="Resolution Status"
              value={editForm.resolutionStatus}
              onChange={e => setEditForm({ ...editForm, resolutionStatus: e.target.value as IncidentResolution })}
              options={INCIDENT_RESOLUTIONS.map(s => ({ value: s, label: s.replace(/_/g, ' ') }))}
            />

            <Select
              label="Cross-Check Status"
              value={editForm.crossCheckStatus}
              onChange={e => setEditForm({ ...editForm, crossCheckStatus: e.target.value as IncidentCrossCheckStatus })}
              options={['', 'pending', 'verified', 'disputed'].map(s => ({ value: s, label: s || 'Select' }))}
            />

            <Input
              label="Description"
              value={editForm.description}
              onChange={e => setEditForm({ ...editForm, description: e.target.value })}
              placeholder="Incident description"
              multiline
              rows={3}
            />

            <Input
              label="Notes"
              value={editForm.notes}
              onChange={e => setEditForm({ ...editForm, notes: e.target.value })}
              placeholder="Internal notes"
              multiline
              rows={2}
            />

            <Input
              label="Penalty Amount (£)"
              type="number"
              step="0.01"
              value={editForm.penaltyAmount}
              onChange={e => setEditForm({ ...editForm, penaltyAmount: e.target.value })}
              placeholder="0.00"
            />

            <Input
              label="DOR Rate at Time (%)"
              type="number"
              step="0.1"
              value={editForm.dorRateAtTimePercent}
              onChange={e => setEditForm({ ...editForm, dorRateAtTimePercent: e.target.value })}
              placeholder="2.5"
            />

            <Select
              label="Penalty Tier"
              value={editForm.penaltyTier}
              onChange={e => setEditForm({ ...editForm, penaltyTier: e.target.value })}
              options={['', ...PENALTY_TIERS].map(t => ({ value: t, label: t || 'Select' }))}
            />

            <Input
              label="Blinds Affected"
              type="number"
              value={editForm.blindsAffectedCount}
              onChange={e => setEditForm({ ...editForm, blindsAffectedCount: e.target.value })}
              placeholder="0"
            />

            <Input
              label="Sale Value Lost (£)"
              type="number"
              step="0.01"
              value={editForm.saleValueLost}
              onChange={e => setEditForm({ ...editForm, saleValueLost: e.target.value })}
              placeholder="0.00"
            />

            <Select
              label="Logistics Leg"
              value={editForm.logisticsLeg}
              onChange={e => setEditForm({ ...editForm, logisticsLeg: e.target.value })}
              options={['', ...LOGISTICS_LEGS].map(l => ({ value: l, label: l || 'Select' }))}
            />

            <div style={{ display: 'flex', gap: 'var(--spacing-sm)', marginTop: 'var(--spacing-md)' }}>
              <Button variant="primary" onClick={handleSave} disabled={saving} leftIcon={<CheckCircle size={16} />} fullWidth>
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
              <Button variant="ghost" onClick={() => setEditing(false)} fullWidth>
                Cancel
              </Button>
            </div>
          </Card>
        )}
      </div>
    </Layout>
  )
}