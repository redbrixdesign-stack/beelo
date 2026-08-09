// IncidentCauseSelector - Dropdown for selecting incident cause with DOR impact preview
// BusinessRules.md: Only fitter_error opens advisor to penalty

import { useState, useEffect } from 'react'
import { Select } from '@components/ui/Select'
import { Badge } from '@components/ui/Badge'
import { AlertTriangle, CheckCircle, Info, Shield } from 'lucide-react'
import { INCIDENT_TYPES, IncidentType, INCIDENT_CAUSES, IncidentCause, DOR_REASON_TO_INCIDENT_TYPE } from '@lib/constants'

interface IncidentCauseSelectorProps {
  incidentType: IncidentType
  cause: IncidentCause
  countsTowardDor: boolean
  onChange: (type: IncidentType, cause: IncidentCause, countsTowardDor: boolean) => void
  disabled?: boolean
}

const CAUSE_DETAILS: Record<IncidentCause, { label: string; description: string; dorImpact: 'penalty' | 'no-penalty' | 'depends' }> = {
  fitter_error: { label: 'Fitter Error', description: 'Advisor measurement/installation mistake', dorImpact: 'penalty' },
  customer_error: { label: 'Customer Error', description: 'Customer provided wrong info/changed mind', dorImpact: 'no-penalty' },
  supplier_error: { label: 'Supplier Error', description: 'Production fault (Hillarys responsibility)', dorImpact: 'no-penalty' },
  logistics_error: { label: 'Logistics Error', description: 'Damaged in transit (Hillarys responsibility)', dorImpact: 'no-penalty' },
  theft: { label: 'Theft', description: 'Stolen goods (Hillarys responsibility)', dorImpact: 'no-penalty' },
  product_defect: { label: 'Product Defect', description: 'Warranty failure (Hillarys responsibility)', dorImpact: 'no-penalty' },
  accidental: { label: 'Accidental', description: 'Unforeseen accident', dorImpact: 'no-penalty' },
  unknown: { label: 'Unknown', description: 'Cause not yet determined', dorImpact: 'depends' },
}

const TYPE_TO_DEFAULT_CAUSE: Record<IncidentType, IncidentCause> = {
  mismeasurement: 'fitter_error',
  wrong_colour: 'fitter_error',
  wrong_product: 'fitter_error',
  installation_damage: 'fitter_error',
  window_breakage: 'fitter_error',
  logistics_damage: 'logistics_error',
  theft: 'theft',
  warranty_malfunction: 'product_defect',
  other: 'unknown',
}

export function IncidentCauseSelector({ 
  incidentType, 
  cause, 
  countsTowardDor, 
  onChange, 
  disabled 
}: IncidentCauseSelectorProps) {
  const [selectedType, setSelectedType] = useState<IncidentType>(incidentType)
  const [selectedCause, setSelectedCause] = useState<IncidentCause>(cause)
  const [selectedCountsTowardDor, setSelectedCountsTowardDor] = useState(countsTowardDor)

  // Sync with props
  useEffect(() => {
    setSelectedType(incidentType)
    setSelectedCause(cause)
    setSelectedCountsTowardDor(countsTowardDor)
  }, [incidentType, cause, countsTowardDor])

  // Auto-update countsTowardDor when cause changes
  useEffect(() => {
    const newCountsTowardDor = selectedCause === 'fitter_error'
    setSelectedCountsTowardDor(newCountsTowardDor)
    onChange(selectedType, selectedCause, newCountsTowardDor)
  }, [selectedCause, selectedType, onChange])

  // When type changes, suggest default cause
  useEffect(() => {
    const defaultCause = TYPE_TO_DEFAULT_CAUSE[selectedType] || 'unknown'
    if (selectedCause !== defaultCause) {
      setSelectedCause(defaultCause)
    }
  }, [selectedType])

  const causeDetail = CAUSE_DETAILS[selectedCause]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
      {/* Incident Type */}
      <div>
        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, marginBottom: 'var(--spacing-xs)', color: 'var(--color-text)' }}>
          Incident Type
        </label>
        <Select
          value={selectedType}
          onChange={e => setSelectedType(e.target.value as IncidentType)}
          options={INCIDENT_TYPES.map(t => ({ 
            value: t, 
            label: t.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) 
          }))}
          disabled={disabled}
        />
      </div>

      {/* Cause */}
      <div>
        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, marginBottom: 'var(--spacing-xs)', color: 'var(--color-text)' }}>
          Cause
        </label>
        <Select
          value={selectedCause}
          onChange={e => setSelectedCause(e.target.value as IncidentCause)}
          options={INCIDENT_CAUSES.map(c => ({ 
            value: c, 
            label: CAUSE_DETAILS[c].label 
          }))}
          disabled={disabled}
        />
      </div>

      {/* DOR Impact Preview */}
      <div style={{ 
        padding: 'var(--spacing-md)', 
        borderRadius: 'var(--radius-md)', 
        background: selectedCountsTowardDor ? 'var(--color-error-muted)' : 'var(--color-success-muted)',
        border: selectedCountsTowardDor ? '1px solid var(--color-error)' : '1px solid var(--color-success)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
          {selectedCountsTowardDor ? (
            <AlertTriangle size={20} style={{ color: 'var(--color-error)' }} />
          ) : selectedCause === 'unknown' ? (
            <Info size={20} style={{ color: 'var(--color-warning)' }} />
          ) : (
            <Shield size={20} style={{ color: 'var(--color-success)' }} />
          )}
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>
              {selectedCountsTowardDor ? '⚠️ COUNTS TOWARD DOR' : '✓ Does NOT count toward DOR'}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
              {causeDetail.description}
              {selectedCause === 'fitter_error' && ' — Flat penalty per blind (£20 standard / £40 elevated)'}
              {selectedCause === 'unknown' && ' — Set cause to determine DOR impact'}
            </div>
          </div>
        </div>
      </div>

      {/* Business Rule Reminder */}
      <div style={{ 
        padding: 'var(--spacing-sm)', 
        background: 'var(--color-info-muted)', 
        borderRadius: 'var(--radius-sm)', 
        fontSize: '0.7rem', 
        color: 'var(--color-info)',
        border: '1px solid var(--color-info)'
      }}>
        <Info size={12} style={{ display: 'inline-block', marginRight: '4px', verticalAlign: 'middle' }} />
        BusinessRules.md: Only <strong>fitter_error</strong> opens advisor to financial penalty. 
        All other causes (supplier_error, logistics_error, theft, product_defect, customer_error) are company's responsibility.
      </div>
    </div>
  )
}