// MeasurementCheckList - List of measurement checks for a visit

import { useNavigate } from 'react-router-dom'
import { Card } from '@components/ui/Card'
import { Button } from '@components/ui/Button'
import { Badge } from '@components/ui/Badge'
import { CheckCircle, AlertTriangle, ChevronRight, Ruler, Trash2, Edit } from 'lucide-react'
import { useMeasurementChecks } from '../hooks/useMeasurementChecks'
import type { MeasurementCheckDexie } from '@lib/dexie'

interface MeasurementCheckListProps {
  visitId: number
  checks: MeasurementCheckDexie[]
  onNew: () => void
}

export function MeasurementCheckList({ visitId, checks, onNew }: MeasurementCheckListProps) {
  const navigate = useNavigate()
  const { deleteMeasurementCheck } = useMeasurementChecks()
  const [deleting, setDeleting] = useState<number | null>(null)

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this measurement check?')) return
    setDeleting(id)
    try {
      await deleteMeasurementCheck(id)
    } catch (err) {
      console.error('Failed to delete:', err)
    } finally {
      setDeleting(null)
    }
  }

  const handleEdit = (id: number) => {
    navigate(`/visits/${visitId}/measurements/${id}`)
  }

  if (checks.length === 0) {
    return (
      <Card padding="xl" style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>
        <Ruler size={48} style={{ marginBottom: 'var(--spacing-md)', opacity: 0.5 }} />
        <p>No measurement checks recorded for this visit</p>
        <Button variant="primary" onClick={onNew} leftIcon={<Ruler size={16} />} style={{ marginTop: 'var(--spacing-lg)' }}>
          Add First Measurement
        </Button>
      </Card>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>Measurements ({checks.length})</h3>
        <Button variant="secondary" onClick={onNew} leftIcon={<Ruler size={16} />} size="sm">
          Add
        </Button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
        {checks.map(check => (
          <Card key={check.id} padding="md" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--spacing-sm)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                <Ruler size={20} style={{ color: 'var(--color-primary)' }} />
                <div>
                  <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>
                    {check.windowId || `Window ${check.id}`}
                    {check.blindType && <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', marginLeft: 'var(--spacing-sm)' }}>{check.blindType}</span>}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                    {check.fitMethod === 'recess' ? 'Recess fit' : 'Exact fit'} • {check.toleranceCm}cm tolerance
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                {check.passesTolerance === true && (
                  <Badge variant="success" size="sm"><CheckCircle size={12} /> Pass</Badge>
                )}
                {check.passesTolerance === false && (
                  <Badge variant="error" size="sm"><AlertTriangle size={12} /> Fail</Badge>
                )}
                {check.passesTolerance === null && (
                  <Badge variant="warning" size="sm">Incomplete</Badge>
                )}
              </div>
            </div>

            {check.workingWidthCm || check.workingDropCm || check.diagonalDiffCm !== undefined ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-lg)', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                {check.workingWidthCm && <span>Width: {check.workingWidthCm.toFixed(1)}cm</span>}
                {check.workingDropCm && <span>Drop: {check.workingDropCm.toFixed(1)}cm</span>}
                {check.diagonalDiffCm !== undefined && <span>Diag Δ: {check.diagonalDiffCm.toFixed(1)}cm</span>}
                {check.isSquare !== null && <span>{check.isSquare ? '✓ Square' : '✗ Not square'}</span>}
              </div>
            ) : null}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--spacing-sm)', marginTop: 'var(--spacing-xs)' }}>
              <Button variant="ghost" size="sm" onClick={() => handleEdit(check.id!)} leftIcon={<Edit size={14} />}>
                Edit
              </Button>
              <Button variant="ghost" size="sm" onClick={() => handleDelete(check.id!)} leftIcon={<Trash2 size={14} />} disabled={deleting === check.id}>
                Delete
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

import { useState } from 'react'