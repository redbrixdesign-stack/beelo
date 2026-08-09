// IncidentDetail - Detail view for an incident with cause selector

import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Layout } from '@components/layout/Layout'
import { Card } from '@components/ui/Card'
import { Badge } from '@components/ui/Badge'
import { Button } from '@components/ui/Button'
import { AlertTriangle, CheckCircle, Shield, ChevronLeft, Edit, Trash2, Calendar, Hash, AlertCircle, Info } from 'lucide-react'
import { useIncidents } from '../hooks/useIncidents'
import { IncidentCauseSelector } from './IncidentCauseSelector'
import { INCIDENT_TYPES, IncidentType, INCIDENT_CAUSES, IncidentCause, INCIDENT_RESOLUTIONS } from '@lib/constants'
import type { IncidentDexie } from '@lib/dexie'

export function IncidentDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { incidents, loadIncidents, getIncident, updateIncident, deleteIncident } = useIncidents()
  const [incident, setIncident] = useState<IncidentDexie | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [activeTab, setActiveTab] = useState<'details' | 'photos' | 'notes'>('details')

  useEffect(() => {
    if (id) loadIncident()
  }, [id])

  const loadIncident = async () => {
    if (!id) return
    setLoading(true)
    try {
      const inc = await getIncident(parseInt(id))
      if (!inc) {
        navigate('/incidents')
        return
      }
      setIncident(inc)
    } catch (err) {
      navigate('/incidents')
    } finally {
      setLoading(false)
    }
  }

  const handleCauseChange = async (type: IncidentType, cause: IncidentCause, countsTowardDor: boolean) => {
    if (!incident) return
    setSaving(true)
    try {
      await updateIncident(incident.id!, { 
        type, 
        cause, 
        countsTowardDor,
        penaltyAmount: countsTowardDor ? (incident.blindsAffectedCount || 1) * 20 : 0,
      })
      setIncident(prev => prev ? { ...prev, type, cause, countsTowardDor } : null)
    } catch (err) {
      console.error('Failed to update incident:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleResolutionChange = async (status: string) => {
    if (!incident) return
    await updateIncident(incident.id!, { resolutionStatus: status as any })
    setIncident(prev => prev ? { ...prev, resolutionStatus: status } : null)
  }

  const handleDelete = async () => {
    if (!incident || !confirm('Delete this incident? This cannot be undone.')) return
    setDeleting(true)
    try {
      await deleteIncident(incident.id!)
      navigate('/incidents')
    } catch (err) {
      console.error('Failed to delete:', err)
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return <Layout title="Incident"><div style={{ padding: 'var(--spacing-xl)', textAlign: 'center' }}>Loading...</div></Layout>
  }

  if (!incident) {
    return <Layout title="Incident"><div style={{ padding: 'var(--spacing-xl)', textAlign: 'center' }}>Incident not found</div></Layout>
  }

  const getResolutionBadge = (status: string) => {
    const variants: Record<string, 'success' | 'warning' | 'info' | 'default' | 'error'> = {
      open: 'warning',
      in_progress: 'info',
      resolved: 'success',
      disputed: 'error',
      closed: 'default',
    }
    return <Badge variant={variants[status] || 'default'} size="sm">{status}</Badge>
  }

  const renderDetailsTab = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
      {/* Cause Selector */}
      <Card padding="lg">
        <h3 style={{ margin: '0 0 var(--spacing-lg)', fontSize: '1rem', fontWeight: 600 }}>
          <AlertCircle size={18} style={{ display: 'inline-block', marginRight: 'var(--spacing-sm)', verticalAlign: 'middle', color: 'var(--color-warning)' }} />
          Cause & DOR Impact
        </h3>
        <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: 'var(--spacing-lg)' }}>
          Select the root cause. <strong>Only <code>fitter_error</code> counts toward DOR</strong> and incurs a flat penalty (&pound;20/blind standard, &pound;40/blind elevated). All other causes are company&apos;s responsibility per BusinessRules.md.
        </p>
        <IncidentCauseSelector
          incidentType={incident.type}
          cause={incident.cause}
          countsTowardDor={incident.countsTowardDor}
          onChange={handleCauseChange}
        />
      </Card>

      {/* Resolution Status */}
      <Card padding="lg">
        <h3 style={{ margin: '0 0 var(--spacing-lg)', fontSize: '1rem', fontWeight: 600 }}>
          Resolution Status
        </h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-sm)' }}>
          {INCIDENT_RESOLUTIONS.map(status => (
            <Button
              key={status}
              variant={incident.resolutionStatus === status ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => handleResolutionChange(status)}
            >
              {status.replace(/_/g, ' ')}
            </Button>
          ))}
        </div>
      </Card>

      {/* Details */}
      <Card padding="lg">
        <h3 style={{ margin: '0 0 var(--spacing-lg)', fontSize: '1rem', fontWeight: 600 }}>Details</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--spacing-md)' }}>
          <div>
            <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginBottom: '2px' }}>Discovered</div>
            <div>{incident.discoveredAt ? new Date(incident.discoveredAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '&mdash;'}</div>
          </div>
          {incident.description && (
            <div style={{ gridColumn: '1 / -1' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginBottom: '2px' }}>Description</div>
              <div>{incident.description}</div>
            </div>
          )}
          {incident.causeDetail && (
            <div style={{ gridColumn: '1 / -1' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginBottom: '2px' }}>Cause Detail</div>
              <div>{incident.causeDetail}</div>
            </div>
          )}
          {incident.penaltyTier && (
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginBottom: '2px' }}>Penalty Tier</div>
              <Badge variant={incident.penaltyTier === 'elevated' ? 'error' : 'warning'} size="sm">
                {incident.penaltyTier}
              </Badge>
            </div>
          )}
          {incident.dorRateAtTimePercent && (
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginBottom: '2px' }}>DOR Rate at Time</div>
              <div>{incident.dorRateAtTimePercent}%</div>
            </div>
          )}
          {incident.blindsAffectedCount && (
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginBottom: '2px' }}>Blinds Affected</div>
              <div>{incident.blindsAffectedCount}</div>
            </div>
          )}
          {incident.penaltyAmount && (
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginBottom: '2px' }}>Penalty Amount</div>
              <div style={{ fontWeight: 600, color: incident.countsTowardDor ? 'var(--color-error)' : 'var(--color-success)' }}>
                &pound;{incident.penaltyAmount.toFixed(2)}
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Source Links */}
      <Card padding="lg">
        <h3 style={{ margin: '0 0 var(--spacing-lg)', fontSize: '1rem', fontWeight: 600 }}>Source</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-md)', fontSize: '0.85rem' }}>
          {incident.commissionLineItemId && (
            <Badge variant="info" size="sm">
              <Hash size={12} /> From Commission Statement
            </Badge>
          )}
          {incident.fitLineItemId && (
            <Badge variant="info" size="sm">
              <Calendar size={12} /> From Fit Completion Receipt
            </Badge>
          )}
          {incident.originalFitVisitId && (
            <Badge variant="default" size="sm">
              <Info size={12} /> Links to Original Fit Visit
            </Badge>
          )}
        </div>
      </Card>
    </div>
  )

  const renderPhotosTab = () => (
    <Card padding="lg" style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>
      <AlertTriangle size={48} style={{ marginBottom: 'var(--spacing-md)', opacity: 0.5 }} />
      <p>Photos not yet implemented</p>
    </Card>
  )

  const renderNotesTab = () => (
    <Card padding="lg">
      <h3 style={{ margin: '0 0 var(--spacing-lg)', fontSize: '1rem', fontWeight: 600 }}>Notes</h3>
      <p style={{ color: 'var(--color-text-muted)' }}>{incident.notes || 'No notes recorded'}</p>
    </Card>
  )

  return (
    <Layout title="Incident" onBack={() => navigate('/incidents')}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
        {/* Header */}
        <Card padding="lg">
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--spacing-md)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
              <div style={{ 
                width: '48px', height: '48px', borderRadius: '50%', 
                background: incident.countsTowardDor ? 'var(--color-error-muted)' : 'var(--color-success-muted)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                {incident.countsTowardDor ? (
                  <AlertTriangle size={24} style={{ color: 'var(--color-error)' }} />
                ) : (
                  <Shield size={24} style={{ color: 'var(--color-success)' }} />
                )}
              </div>
              <div>
                <h2 style={{ margin: '0 0 var(--spacing-xs)', fontSize: '1.125rem', fontWeight: 600 }}>
                  {incident.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', flexWrap: 'wrap' }}>
                  {getResolutionBadge(incident.resolutionStatus)}
                  {incident.countsTowardDor && (
                    <Badge variant="error" size="sm">
                      <AlertTriangle size={10} /> COUNTS TOWARD DOR
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
              <Button variant="ghost" onClick={handleDelete} leftIcon={<Trash2 size={16} />} disabled={deleting} style={{ color: 'var(--color-error)' }}>
                Delete
              </Button>
            </div>
          </div>

          <div style={{ marginTop: 'var(--spacing-lg)', display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-lg)', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
            <div><strong>Cause: </strong>{incident.cause.replace(/_/g, ' ')}</div>
            {incident.jobCode && <div><strong>Job: </strong>{incident.jobCode}</div>}
            {incident.penaltyAmount && <div><strong>Penalty: </strong>&pound;{incident.penaltyAmount.toFixed(2)}</div>}
            {incident.blindsAffectedCount && <div><strong>Blinds: </strong>{incident.blindsAffectedCount}</div>}
            {incident.dorRateAtTimePercent && <div><strong>DOR Rate: </strong>{incident.dorRateAtTimePercent}%</div>}
          </div>
        </Card>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)' }}>
          {['details', 'photos', 'notes'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              style={{
                padding: 'var(--spacing-md) var(--spacing-lg)',
                border: 'none',
                background: 'transparent',
                color: activeTab === tab ? 'var(--color-primary)' : 'var(--color-text-muted)',
                fontWeight: activeTab === tab ? 600 : 400,
                borderBottom: activeTab === tab ? '2px solid var(--color-primary)' : '2px solid transparent',
                cursor: 'pointer',
                fontSize: '0.875rem',
              }}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div style={{ padding: 'var(--spacing-lg) 0' }}>
          {activeTab === 'details' && renderDetailsTab()}
          {activeTab === 'photos' && renderPhotosTab()}
          {activeTab === 'notes' && renderNotesTab()}
        </div>
      </div>
    </Layout>
  )
}