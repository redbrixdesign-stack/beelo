// IncidentList - List component for incidents

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, ChevronRight, Filter, Clock, CheckCircle, AlertCircle } from 'lucide-react'
import { Card } from '@components/ui/Card'
import { Badge } from '@components/ui/Badge'
import { Button } from '@components/ui/Button'
import { Input } from '@components/ui/Input'
import { Select } from '@components/ui/Select'
import { useIncidents } from '../hooks/useIncidents'
import { INCIDENT_TYPES, IncidentType, INCIDENT_CAUSES, IncidentCause, INCIDENT_RESOLUTIONS, IncidentResolution, INCIDENT_CROSS_CHECK_STATUSES, IncidentCrossCheckStatus } from '@lib/constants'

export function IncidentList() {
  const navigate = useNavigate()
  const { incidents, loading, loadIncidents } = useIncidents()
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<IncidentType | 'all'>('all')
  const [resolutionFilter, setResolutionFilter] = useState<IncidentResolution | 'all'>('all')
  const [crossCheckFilter, setCrossCheckFilter] = useState<IncidentCrossCheckStatus | 'all'>('all')

  const filteredIncidents = incidents.filter(incident => {
    const matchesSearch = !search || 
      incident.jobCode?.toLowerCase().includes(search.toLowerCase()) ||
      incident.description?.toLowerCase().includes(search.toLowerCase())
    const matchesType = typeFilter === 'all' || incident.type === typeFilter
    const matchesResolution = resolutionFilter === 'all' || incident.resolutionStatus === resolutionFilter
    const matchesCrossCheck = crossCheckFilter === 'all' || incident.crossCheckStatus === crossCheckFilter
    return matchesSearch && matchesType && matchesResolution && matchesCrossCheck
  })

  const getTypeBadge = (type: IncidentType) => {
    const variants: Record<IncidentType, 'success' | 'warning' | 'info' | 'default' | 'error'> = {
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
    const variants: Record<IncidentResolution, 'success' | 'warning' | 'info' | 'default' | 'error'> = {
      open: 'error',
      in_progress: 'warning',
      resolved: 'success',
      disputed: 'warning',
      closed: 'default',
    }
    return <Badge variant={variants[status]} size="sm">{status.replace(/_/g, ' ')}</Badge>
  }

  const getCrossCheckBadge = (status?: IncidentCrossCheckStatus) => {
    if (!status) return null
    const variants: Record<IncidentCrossCheckStatus, 'success' | 'warning' | 'info' | 'default' | 'error'> = {
      pending: 'warning',
      verified: 'success',
      disputed: 'error',
    }
    return <Badge variant={variants[status]} size="sm">{status}</Badge>
  }

  const getCauseBadge = (cause: IncidentCause) => {
    return <Badge variant="default" size="sm">{cause.replace(/_/g, ' ')}</Badge>
  }

  const handleIncidentClick = (incident: any) => {
    navigate(`/incidents/${incident.id}`)
  }

  useEffect(() => {
    loadIncidents()
  }, [loadIncidents])

  if (loading) {
    return <div style={{ padding: 'var(--spacing-xl)', textAlign: 'center' }}>Loading...</div>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 600 }}>Incidents</h1>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-md)' }}>
        <Input
          placeholder="Search job code or description..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: '200px' }}
        />
        <Select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value as IncidentType | 'all')}
          options={['all', ...INCIDENT_TYPES].map(t => ({ value: t, label: t === 'all' ? 'All Types' : t.replace(/_/g, ' ') }))}
          style={{ minWidth: '150px' }}
        />
        <Select
          value={resolutionFilter}
          onChange={e => setResolutionFilter(e.target.value as IncidentResolution | 'all')}
          options={['all', ...INCIDENT_RESOLUTIONS].map(s => ({ value: s, label: s === 'all' ? 'All Resolutions' : s.replace(/_/g, ' ') }))}
          style={{ minWidth: '150px' }}
        />
        <Select
          value={crossCheckFilter}
          onChange={e => setCrossCheckFilter(e.target.value as IncidentCrossCheckStatus | 'all')}
          options={['all', ...INCIDENT_CROSS_CHECK_STATUSES].map(s => ({ value: s, label: s === 'all' ? 'All Cross-Check' : s }))}
          style={{ minWidth: '150px' }}
        />
      </div>

      {filteredIncidents.length === 0 ? (
        <Card padding="xl" style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>
          {incidents.length === 0 ? 'No incidents recorded yet.' : 'No incidents match your filters.'}
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
          {filteredIncidents.map(incident => (
            <Card
              key={incident.id}
              onClick={() => handleIncidentClick(incident)}
              hoverable
              padding="md"
              style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 'var(--spacing-md)' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', flexWrap: 'wrap' }}>
                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600' }}>
                      {incident.jobCode || 'Unknown Job'}
                    </h3>
                    {getTypeBadge(incident.type)}
                    {getResolutionBadge(incident.resolutionStatus)}
                    {incident.crossCheckStatus && (
                      <Badge variant="info" size="sm">{incident.crossCheckStatus}</Badge>
                    )}
                    {incident.countsTowardDor && (
                      <Badge variant="error" size="sm">DOR</Badge>
                    )}
                  </div>
                  <div style={{ marginTop: 'var(--spacing-xs)', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                    {incident.description}
                  </div>
                  <div style={{ marginTop: 'var(--spacing-xs)', fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                    <span>Cause: {incident.cause.replace(/_/g, ' ')}</span>
                    {incident.causeDetail && <span> • {incident.causeDetail}</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 'var(--spacing-xs)' }}>
                  <ChevronRight size={20} style={{ color: 'var(--color-text-muted)' }} />
                  <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                    {new Date(incident.discoveredAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                  </span>
                </div>
              </div>
              {incident.crossCheckStatus && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                  <span>Cross-check:</span>
                  <Badge variant="info" size="sm">{incident.crossCheckStatus}</Badge>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}