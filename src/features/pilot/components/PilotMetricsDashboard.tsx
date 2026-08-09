// PilotMetricsDashboard - Dashboard with 8 key metrics, time ranges, quick actions

import { useState, useEffect } from 'react'
import { Card } from '@components/ui/Card'
import { Button } from '@components/ui/Button'
import { Badge } from '@components/ui/Badge'
import { TrendingUp, TrendingDown, Minus, Target, Clock, Mic, Camera, Shield, DollarSign, BarChart2, Plus, Zap } from 'lucide-react'
import { usePilotMetrics } from '../hooks/usePilotMetrics'

const METRIC_DEFINITIONS = [
  { key: 'voice_notes_captured', label: 'Voice Notes', icon: Mic, color: 'var(--color-primary)', unit: '' },
  { key: 'documents_captured', label: 'Documents', icon: Camera, color: 'var(--color-info)', unit: '' },
  { key: 'ocr_parsed', label: 'OCR Parsed', icon: Shield, color: 'var(--color-success)', unit: '' },
  { key: 'dor_incidents_detected', label: 'DOR Detected', icon: Target, color: 'var(--color-error)', unit: '' },
  { key: 'schedule_warnings', label: 'Schedule Risks', icon: Clock, color: 'var(--color-warning)', unit: '' },
  { key: 'visits_completed', label: 'Visits Done', icon: Target, color: 'var(--color-primary)', unit: '' },
  { key: 'mileage_logged', label: 'Mileage (mi)', icon: Clock, color: 'var(--color-info)', unit: 'mi' },
  { key: 'expenses_logged', label: 'Expenses', icon: DollarSign, color: 'var(--color-success)', unit: '' },
] as const

type TimeRange = 'week' | 'month' | 'quarter'

export function PilotMetricsDashboard() {
  const { metrics, loading, recordMetric, getMetricsForRange } = usePilotMetrics()
  const [timeRange, setTimeRange] = useState<TimeRange>('week')
  const [rangeMetrics, setRangeMetrics] = useState<Record<string, number>>({})
  const [comparison, setComparison] = useState<Record<string, { diff: number; pct: number }>>({})

  useEffect(() => {
    if (metrics) {
      const current = getMetricsForRange(timeRange)
      setRangeMetrics(current)
      
      // Calculate vs previous period
      const prevRange = timeRange === 'week' ? 'week' : timeRange === 'month' ? 'month' : 'quarter'
      // Simplified: just show current vs a baseline
      const comparisonData: Record<string, { diff: number; pct: number }> = {}
      METRIC_DEFINITIONS.forEach(m => {
        const val = current[m.key] || 0
        // In real app, would compare to previous period
        comparisonData[m.key] = { diff: 0, pct: 0 }
      })
      setComparison(comparisonData)
    }
  }, [metrics, timeRange])

  const handleQuickAction = async (key: string) => {
    await recordMetric(key, 1)
    // Optimistic update
    setRangeMetrics(prev => ({ ...prev, [key]: (prev[key] || 0) + 1 }))
  }

  const getTrendIcon = (diff: number) => {
    if (diff > 0) return <TrendingUp size={14} style={{ color: 'var(--color-success)' }} />
    if (diff < 0) return <TrendingDown size={14} style={{ color: 'var(--color-error)' }} />
    return <Minus size={14} style={{ color: 'var(--color-text-muted)' }} />
  }

  if (loading) {
    return <Card padding="xl" style={{ textAlign: 'center' }}>Loading metrics...</Card>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
      {/* Header + Time Range */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--spacing-md)' }}>
        <div>
          <h2 style={{ margin: '0 0 var(--spacing-xs)', fontSize: '1.25rem', fontWeight: 600 }}>Pilot Metrics</h2>
          <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
            Track adoption & outcomes across the pilot cohort
          </p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--spacing-xs)' }}>
          {(['week', 'month', 'quarter'] as TimeRange[]).map(range => (
            <Button
              key={range}
              variant={timeRange === range ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setTimeRange(range)}
            >
              {range.charAt(0).toUpperCase() + range.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      {/* Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 'var(--spacing-md)' }}>
        {METRIC_DEFINITIONS.map(def => {
          const value = rangeMetrics[def.key] || 0
          const comp = comparison[def.key] || { diff: 0, pct: 0 }
          const Icon = def.icon
          return (
            <Card key={def.key} padding="md" style={{ 
              borderLeft: `4px solid ${def.color}`,
              transition: 'transform 0.15s',
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {def.label}
                  </div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: def.color, marginTop: 'var(--spacing-xs)' }}>
                    {value}{def.unit && <span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--color-text-muted)', marginLeft: 4 }}>{def.unit}</span>}
                  </div>
                </div>
                <Icon size={24} style={{ color: def.color, opacity: 0.7 }} />
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleQuickAction(def.key)}
                style={{ marginTop: 'var(--spacing-sm)', width: '100%' }}
                leftIcon={<Plus size={12} />}
              >
                +1
              </Button>
</Card>
          )})}
        </div>

      {/* Quick Actions */}
      <Card padding="lg">
        <h3 style={{ margin: '0 0 var(--spacing-lg)', fontSize: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
          <Zap size={18} style={{ color: 'var(--color-warning)' }} />
          Quick Actions
        </h3>
        <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: 'var(--spacing-lg)' }}>
          Tap to log activity during the day. Metrics update instantly.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 'var(--spacing-md)' }}>
          {[
            { key: 'voice_notes_captured', label: 'Voice Note', icon: Mic, color: 'var(--color-primary)' },
            { key: 'documents_captured', label: 'Document', icon: Camera, color: 'var(--color-info)' },
            { key: 'visits_completed', label: 'Visit Done', icon: Target, color: 'var(--color-success)' },
            { key: 'schedule_warnings', label: 'Risk Warning', icon: Clock, color: 'var(--color-warning)' },
          ].map(action => (
            <Button
              key={action.key}
              variant="secondary"
              onClick={() => handleQuickAction(action.key)}
              leftIcon={<action.icon size={16} />}
              style={{ 
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--spacing-xs)',
                padding: 'var(--spacing-md)', borderLeft: `3px solid ${action.color}`
              }}
            >
              <span style={{ fontWeight: 600 }}>{action.label}</span>
              <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>+1</span>
            </Button>
          ))}
        </div>
      </Card>

      {/* Summary */}
      {metrics && (
        <Card padding="lg" style={{ background: 'var(--color-info-muted)', border: '1px solid var(--color-info)' }}>
          <h3 style={{ margin: '0 0 var(--spacing-md)', fontSize: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
            <BarChart2 size={18} style={{ color: 'var(--color-info)' }} />
            Pilot Summary
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--spacing-md)' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Total Voice Notes</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-primary)' }}>
                {metrics.voiceNotesCaptured || 0}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Documents OCR'd</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-info)' }}>
                {metrics.documentsParsed || 0}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>DOR Incidents</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-error)' }}>
                {metrics.dorIncidentsDetected || 0}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Schedule Risks</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-warning)' }}>
                {metrics.scheduleWarnings || 0}
              </div>
            </div>
          </div>
          <p style={{ marginTop: 'var(--spacing-md)', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
            Pilot cohort: {metrics.advisorCount || 0} advisors • {metrics.weeksActive || 0} weeks active
          </p>
        </Card>
      )}
    </div>
  )
}