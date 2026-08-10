// IncidentList - List of incidents with filtering

import { useState, useEffect } from 'react'
import { Card } from '@components/ui/Card'
import { Badge } from '@components/ui/Badge'
import { Button } from '@components/ui/Button'
import { AlertTriangle, CheckCircle, Shield, Filter, ChevronRight } from 'lucide-react'
import { useIncidents } from '../hooks/useIncidents'
import { INCIDENT_TYPES, IncidentType, INCIDENT_CAUSES, IncidentCause } from '@lib/constants'
import type { IncidentDexie } from '@lib/dexie'

interface IncidentListProps {
  visitId?: number
  onOpen?: (incident: IncidentDexie) => void
}

export function IncidentList({ visitId, onOpen }: IncidentListProps) {
  const { incidents, loading, loadIncidents, loadIncidentsByVisit } = useIncidents()
  const [typeFilter, setTypeFilter] = useState<IncidentType | 'all'>('all')
  const [causeFilter, setCauseFilter] = useState<IncidentCause | 'all'>('all')
  const [dorFilter, setDorFilter] = useState<'all' | 'yes' | 'no'>('all')

  useEffect(() => {
    if (visitId) {
      loadIncidentsByVisit(visitId)
    } else {
      loadIncidents()
    }
  }, [visitId, loadIncidents, loadIncidentsByVisit])

  const filteredIncidents = incidents.filter(inc => {
    if (typeFilter !== 'all' && inc.type !== typeFilter) return false
    if (causeFilter !== 'all' && inc.cause !== causeFilter) return false
    if (dorFilter === 'yes' && !inc.countsTowardDor) return false
    if (dorFilter === 'no' && inc.countsTowardDor) return false
    return true
  })

  const getTypeLabel = (type: IncidentType) => type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  const getCauseLabel = (cause: IncidentCause) => {
    const labels: Record<IncidentCause, string> = {
      fitter_error: 'Fitter Error',
      customer_error: 'Customer Error',
      supplier_error: 'Supplier Error',
      logistics_error: 'Logistics Error',
      theft: 'Theft',
      product_defect: 'Product Defect',
      accidental: 'Accidental',
      unknown: 'Unknown',
    }
    return labels[cause]
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

  if (loading) {
    return <div style={{ padding: 'var(--spacing-xl)', textAlign: 'center' }}>Loading...</div>
  }

  if (filteredIncidents.length === 0) {
    return (
      <Card padding="xl" style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>
        <AlertTriangle size={48} style={{ marginBottom: 'var(--spacing-md)', opacity: 0.5 }} />
        <p>{visitId ? 'No incidents for this visit' : 'No incidents recorded'}</p>
        {!visitId && (
          <Button onClick={() => window.location.href = '/incidents/new'} style={{ marginTop: 'var(--spacing-md)' }}>
            <Plus size={18} /> Log First Incident
          </Button>
        )}
      </Card>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
      {/* Filters */}
      <Card padding="md">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-md)', alignItems: 'flex-end' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
            <Filter size={16} style={{ color: 'var(--color-text-muted)' }} />
            <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--color-text-muted)' }}>Filters:</span>
          </div>
          <Select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value as IncidentType | 'all')}
            options={['all', ...INCIDENT_TYPES].map(t => ({ value: t, label: t === 'all' ? 'All Types' : getTypeLabel(t) }))}
            style={{ minWidth: '140px' }}
          />
          <Select
            value={causeFilter}
            onChange={e => setCauseFilter(e.target.value as IncidentCause | 'all')}
            options={['all', ...INCIDENT_CAUSES].map(c => ({ value: c, label: c === 'all' ? 'All Causes' : getCauseLabel(c) }))}
            style={{ minWidth: '140px' }}
          />
          <Select
            value={dorFilter}
            onChange={e => setDorFilter(e.target.value as 'all' | 'yes' | 'no')}
            options={[
              { value: 'all', label: 'DOR Impact: All' },
              { value: 'yes', label: 'Counts → DOR' },
              { value: 'no', label: 'No DOR Impact' },
            ]}
            style={{ minWidth: '140px' }}
          />
        </div>
      </Card>

      {/* Incident List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
        {filteredIncidents.map(incident => (
          <Card key={incident.id} padding="md" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--spacing-sm)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', flex: 1, minWidth: 200 }}>
                <div style={{ 
                  width: '36px', height: '36px', borderRadius: '50%', 
                  background: incident.countsTowardDor ? 'var(--color-error-muted)' : 'var(--color-success-muted)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                }}>
                  {incident.countsTowardDor ? (
                    <AlertTriangle size={16} style={{ color: 'var(--color-error)' }} />
                  ) : (
                    <Shield size={16} style={{ color: 'var(--color-success)' }} />
                  )}
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                    {getTypeLabel(incident.type)}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'flex', gap: 'var(--spacing-sm)', flexWrap: 'wrap' }}>
                    <span>{getCauseLabel(incident.cause)}</span>
                    {incident.jobCode && <span>Job: {incident.jobCode}</span>}
                    {incident.penaltyAmount && <span>£{incident.penaltyAmount.toFixed(2)}</span>}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                {getResolutionBadge(incident.resolutionStatus)}
                {incident.countsTowardDor && (
                  <Badge variant="error" size="sm">
                    <AlertTriangle size={10} /> DOR
                  </Badge>
                )}
                <ChevronRight size={16} style={{ color: 'var(--color-text-muted)' }} />
              </div>
            </div>

            {incident.causeDetail && (
              <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', paddingLeft: '44px' }}>
                {incident.causeDetail}
              </div>
            )}

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-xs)', fontSize: '0.7rem', color: 'var(--color-text-muted)', paddingLeft: '44px' }}>
              {incident.discoveredAt && <span>Found: {new Date(incident.discoveredAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>}
              {incident.commissionLineItemId && <span>From commission statement</span>}
              {incident.fitLineItemId && <span>From fit completion</span>}
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

import { Select } from '@components/ui/Select'