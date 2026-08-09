// MeasurementCheckForm - Form for recording blind measurement checks
// BusinessRules.md: units in cm, working width/drop = min of 3 readings, tolerance default 1cm

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Layout } from '@components/layout/Layout'
import { Card } from '@components/ui/Card'
import { Button } from '@components/ui/Button'
import { Input } from '@components/ui/Input'
import { Select } from '@components/ui/Select'
import { Badge } from '@components/ui/Badge'
import { CheckCircle, AlertTriangle, ChevronLeft, Save, Ruler } from 'lucide-react'
import { useMeasurementChecks } from '../hooks/useMeasurementChecks'
import { FIT_METHODS, FitMethod } from '@lib/constants'

interface MeasurementCheckFormProps {
  visitId?: number
  checkId?: number
}

export function MeasurementCheckForm({ visitId: propVisitId, checkId }: MeasurementCheckFormProps) {
  const navigate = useNavigate()
  const { createMeasurementCheck, updateMeasurementCheck, getMeasurementCheck, computeWorkingWidth, computeWorkingDrop, computeDiagonalDiff, isWithinTolerance } = useMeasurementChecks()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  // Form state
  const [windowId, setWindowId] = useState('')
  const [blindType, setBlindType] = useState('')
  const [fitMethod, setFitMethod] = useState<FitMethod>('recess')
  const [tolerance, setTolerance] = useState(1.0)

  // Width readings (cm)
  const [widthTop, setWidthTop] = useState<number | ''>('')
  const [widthMiddle, setWidthMiddle] = useState<number | ''>('')
  const [widthBottom, setWidthBottom] = useState<number | ''>('')

  // Drop readings (cm)
  const [dropLeft, setDropLeft] = useState<number | ''>('')
  const [dropMiddle, setDropMiddle] = useState<number | ''>('')
  const [dropRight, setDropRight] = useState<number | ''>('')

  // Diagonal readings (cm)
  const [diagonalTlbr, setDiagonalTlbr] = useState<number | ''>('')
  const [diagonalTrbl, setDiagonalTrbl] = useState<number | ''>('')

  const [notes, setNotes] = useState('')
  const [photos, setPhotos] = useState<string[]>([])

  // Computed values
  const workingWidth = widthTop !== '' && widthMiddle !== '' && widthBottom !== ''
    ? computeWorkingWidth(Number(widthTop), Number(widthMiddle), Number(widthBottom))
    : null
  const workingDrop = dropLeft !== '' && dropMiddle !== '' && dropRight !== ''
    ? computeWorkingDrop(Number(dropLeft), Number(dropMiddle), Number(dropRight))
    : null
  const diagonalDiff = diagonalTlbr !== '' && diagonalTrbl !== ''
    ? computeDiagonalDiff(Number(diagonalTlbr), Number(diagonalTrbl))
    : null
  const isSquare = diagonalDiff !== null ? isWithinTolerance(diagonalDiff, tolerance) : null
  const passesWidthTolerance = workingWidth !== null && widthTop !== '' && widthMiddle !== '' && widthBottom !== ''
    ? (Math.max(Number(widthTop), Number(widthMiddle), Number(widthBottom)) - workingWidth) <= tolerance
    : null
  const passesDropTolerance = workingDrop !== null && dropLeft !== '' && dropMiddle !== '' && dropRight !== ''
    ? (Math.max(Number(dropLeft), Number(dropMiddle), Number(dropRight)) - workingDrop) <= tolerance
    : null
  const passesTolerance = isSquare !== null && passesWidthTolerance !== null && passesDropTolerance !== null
    ? isSquare && passesWidthTolerance && passesDropTolerance
    : null

  // Load existing check if editing
  useEffect(() => {
    if (checkId) {
      loadCheck()
    }
  }, [checkId])

  const loadCheck = async () => {
    if (!checkId) return
    setLoading(true)
    try {
      const check = await getMeasurementCheck(checkId)
      if (check) {
        setWindowId(check.windowId || '')
        setBlindType(check.blindType || '')
        setFitMethod(check.fitMethod)
        setTolerance(check.toleranceCm || 1.0)
        setWidthTop(check.widthTopCm || '')
        setWidthMiddle(check.widthMiddleCm || '')
        setWidthBottom(check.widthBottomCm || '')
        setDropLeft(check.dropLeftCm || '')
        setDropMiddle(check.dropMiddleCm || '')
        setDropRight(check.dropRightCm || '')
        setDiagonalTlbr(check.diagonalTlbrCm || '')
        setDiagonalTrbl(check.diagonalTrblCm || '')
        setNotes(check.notes || '')
        setPhotos(check.photos || [])
      }
    } catch (err) {
      console.error('Failed to load measurement check:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!propVisitId) return
    setSaving(true)
    try {
      const data = {
        visitId: propVisitId,
        windowId: windowId || undefined,
        blindType: blindType || undefined,
        fitMethod,
        widthTopCm: widthTop !== '' ? Number(widthTop) : undefined,
        widthMiddleCm: widthMiddle !== '' ? Number(widthMiddle) : undefined,
        widthBottomCm: widthBottom !== '' ? Number(widthBottom) : undefined,
        workingWidthCm: workingWidth !== null ? workingWidth : undefined,
        dropLeftCm: dropLeft !== '' ? Number(dropLeft) : undefined,
        dropMiddleCm: dropMiddle !== '' ? Number(dropMiddle) : undefined,
        dropRightCm: dropRight !== '' ? Number(dropRight) : undefined,
        workingDropCm: workingDrop !== null ? workingDrop : undefined,
        diagonalTlbrCm: diagonalTlbr !== '' ? Number(diagonalTlbr) : undefined,
        diagonalTrblCm: diagonalTrbl !== '' ? Number(diagonalTrbl) : undefined,
        diagonalDiffCm: diagonalDiff !== null ? diagonalDiff : undefined,
        toleranceCm: tolerance,
        isSquare,
        passesTolerance,
        notes: notes || undefined,
        photos,
      }

      if (checkId) {
        await updateMeasurementCheck(checkId, data)
      } else {
        await createMeasurementCheck(data)
      }
      navigate(-1)
    } catch (err) {
      console.error('Failed to save measurement check:', err)
    } finally {
      setSaving(false)
    }
  }

  const handlePhotoAdd = () => {
    // Placeholder for camera integration
    setPhotos(prev => [...prev, `photo-${Date.now()}.jpg`])
  }

  if (loading) {
    return <Layout title="Measurement Check"><div style={{ padding: 'var(--spacing-xl)', textAlign: 'center' }}>Loading...</div></Layout>
  }

  return (
    <Layout title={checkId ? 'Edit Measurement' : 'New Measurement'} onBack={() => navigate(-1)}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
        <Card padding="lg">
          <h3 style={{ margin: '0 0 var(--spacing-lg)', fontSize: '1rem', fontWeight: 600 }}>
            <Ruler size={18} style={{ display: 'inline-block', marginRight: 'var(--spacing-sm)', verticalAlign: 'middle' }} />
            Window & Blind Details
          </h3>
          <Input
            label="Window ID (optional)"
            placeholder="e.g. Living Room - Left"
            value={windowId}
            onChange={e => setWindowId(e.target.value)}
          />
          <Input
            label="Blind Type (optional)"
            placeholder="e.g. Roller, Venetian, Roman"
            value={blindType}
            onChange={e => setBlindType(e.target.value)}
          />
          <Select
            label="Fit Method"
            value={fitMethod}
            onChange={e => setFitMethod(e.target.value as FitMethod)}
            options={FIT_METHODS.map(f => ({ value: f, label: f.charAt(0).toUpperCase() + f.slice(1) }))}
          />
          <Input
            label="Tolerance (cm)"
            type="number"
            step="0.1"
            min="0.1"
            value={tolerance}
            onChange={e => setTolerance(parseFloat(e.target.value) || 1.0)}
            style={{ maxWidth: '120px' }}
          />
        </Card>

        <Card padding="lg">
          <h3 style={{ margin: '0 0 var(--spacing-lg)', fontSize: '1rem', fontWeight: 600 }}>Width Readings (cm)</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 'var(--spacing-md)' }}>
            <Input
              label="Top"
              type="number"
              step="0.1"
              min="0"
              value={widthTop}
              onChange={e => setWidthTop(e.target.value ? parseFloat(e.target.value) : '')}
            />
            <Input
              label="Middle"
              type="number"
              step="0.1"
              min="0"
              value={widthMiddle}
              onChange={e => setWidthMiddle(e.target.value ? parseFloat(e.target.value) : '')}
            />
            <Input
              label="Bottom"
              type="number"
              step="0.1"
              min="0"
              value={widthBottom}
              onChange={e => setWidthBottom(e.target.value ? parseFloat(e.target.value) : '')}
            />
          </div>
          {workingWidth !== null && (
            <div style={{ marginTop: 'var(--spacing-md)', padding: 'var(--spacing-md)', background: 'var(--color-surface)', borderRadius: 'var(--radius-md)' }}>
              <strong>Working Width (min): </strong> {workingWidth.toFixed(1)} cm
              {passesWidthTolerance !== null && (
                <Badge variant={passesWidthTolerance ? 'success' : 'error'} size="sm" style={{ marginLeft: 'var(--spacing-sm)' }}>
                  {passesWidthTolerance ? 'Within tolerance' : 'OUT OF TOLERANCE'}
                </Badge>
              )}
            </div>
          )}
        </Card>

        <Card padding="lg">
          <h3 style={{ margin: '0 0 var(--spacing-lg)', fontSize: '1rem', fontWeight: 600 }}>Drop Readings (cm)</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 'var(--spacing-md)' }}>
            <Input
              label="Left"
              type="number"
              step="0.1"
              min="0"
              value={dropLeft}
              onChange={e => setDropLeft(e.target.value ? parseFloat(e.target.value) : '')}
            />
            <Input
              label="Middle"
              type="number"
              step="0.1"
              min="0"
              value={dropMiddle}
              onChange={e => setDropMiddle(e.target.value ? parseFloat(e.target.value) : '')}
            />
            <Input
              label="Right"
              type="number"
              step="0.1"
              min="0"
              value={dropRight}
              onChange={e => setDropRight(e.target.value ? parseFloat(e.target.value) : '')}
            />
          </div>
          {workingDrop !== null && (
            <div style={{ marginTop: 'var(--spacing-md)', padding: 'var(--spacing-md)', background: 'var(--color-surface)', borderRadius: 'var(--radius-md)' }}>
              <strong>Working Drop (min): </strong> {workingDrop.toFixed(1)} cm
              {passesDropTolerance !== null && (
                <Badge variant={passesDropTolerance ? 'success' : 'error'} size="sm" style={{ marginLeft: 'var(--spacing-sm)' }}>
                  {passesDropTolerance ? 'Within tolerance' : 'OUT OF TOLERANCE'}
                </Badge>
              )}
            </div>
          )}
        </Card>

        <Card padding="lg">
          <h3 style={{ margin: '0 0 var(--spacing-lg)', fontSize: '1rem', fontWeight: 600 }}>Diagonal Check (Squareness)</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 'var(--spacing-md)' }}>
            <Input
              label="TL → BR"
              type="number"
              step="0.1"
              min="0"
              value={diagonalTlbr}
              onChange={e => setDiagonalTlbr(e.target.value ? parseFloat(e.target.value) : '')}
            />
            <Input
              label="TR → BL"
              type="number"
              step="0.1"
              min="0"
              value={diagonalTrbl}
              onChange={e => setDiagonalTrbl(e.target.value ? parseFloat(e.target.value) : '')}
            />
          </div>
          {diagonalDiff !== null && (
            <div style={{ marginTop: 'var(--spacing-md)', padding: 'var(--spacing-md)', background: 'var(--color-surface)', borderRadius: 'var(--radius-md)' }}>
              <strong>Diagonal Difference: </strong> {diagonalDiff.toFixed(1)} cm
              {isSquare !== null && (
                <Badge variant={isSquare ? 'success' : 'error'} size="sm" style={{ marginLeft: 'var(--spacing-sm)' }}>
                  {isSquare ? 'Square ✓' : 'NOT SQUARE'}
                </Badge>
              )}
            </div>
          )}
        </Card>

        <Card padding="lg">
          <h3 style={{ margin: '0 0 var(--spacing-lg)', fontSize: '1rem', fontWeight: 600 }}>Overall Result</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)', padding: 'var(--spacing-md)', borderRadius: 'var(--radius-lg)', background: passesTolerance === true ? 'var(--color-success-muted)' : passesTolerance === false ? 'var(--color-error-muted)' : 'var(--color-surface)', border: passesTolerance === true ? '2px solid var(--color-success)' : passesTolerance === false ? '2px solid var(--color-error)' : '1px solid var(--color-border)' }}>
            {passesTolerance === true ? (
              <>
                <CheckCircle size={32} style={{ color: 'var(--color-success)' }} />
                <strong style={{ color: 'var(--color-success)', fontSize: '1.1rem' }}>PASS - All measurements within tolerance</strong>
              </>
            ) : passesTolerance === false ? (
              <>
                <AlertTriangle size={32} style={{ color: 'var(--color-error)' }} />
                <strong style={{ color: 'var(--color-error)', fontSize: '1.1rem' }}>FAIL - Measurements exceed tolerance</strong>
              </>
            ) : (
              <span style={{ color: 'var(--color-text-muted)' }}>Enter all readings to compute result</span>
            )}
          </div>
        </Card>

        <Card padding="lg">
          <h3 style={{ margin: '0 0 var(--spacing-lg)', fontSize: '1rem', fontWeight: 600 }}>Photos & Notes</h3>
          <Input
            label="Notes"
            placeholder="Any observations..."
            value={notes}
            onChange={e => setNotes(e.target.value)}
            multiline
            rows={3}
          />
          <div style={{ marginTop: 'var(--spacing-md)' }}>
            <Button variant="secondary" onClick={handlePhotoAdd} leftIcon={<Ruler size={16} />}>
              Add Photo
            </Button>
            {photos.length > 0 && (
              <div style={{ marginTop: 'var(--spacing-sm)', display: 'flex', gap: 'var(--spacing-sm)', flexWrap: 'wrap' }}>
                {photos.map((photo, i) => (
                  <Badge variant="default" size="sm" key={i}>{photo}</Badge>
                ))}
              </div>
            )}
          </div>
        </Card>

        <Button
          variant="primary"
          onClick={handleSave}
          disabled={saving}
          fullWidth
          leftIcon={saving ? undefined : <Save size={16} />}
        >
          {saving ? 'Saving...' : checkId ? 'Update Measurement' : 'Save Measurement'}
        </Button>
      </div>
    </Layout>
  )
}