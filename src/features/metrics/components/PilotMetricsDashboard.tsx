// PilotMetricsDashboard - Pilot metrics display

import { useState, useEffect } from 'react'
import { Card } from '@components/ui/Card'
import { Badge } from '@components/ui/Badge'
import { Select } from '@components/ui/Select'
import { Button } from '@components/ui/Button'
import { TrendingUp, TrendingDown, Clock, Users, Mic, FileText, DollarSign, AlertTriangle, CheckCircle, AlertCircle } from 'lucide-react'
import { usePilotMetrics } from '../hooks/usePilotMetrics'

export function PilotMetricsDashboard() {
  const { metrics, loading, recordMetric, getMetric, getSummary } = usePilotMetrics()
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d')
  const [summary, setSummary] = useState<Record<string, number>>({})

  useEffect(() => {
    getSummary().then(setSummary)
  }, [getSummary])

  const getMetricData = async (name: string) => {
    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90
    return getMetric(name, days)
  }

  const metricConfigs = [
    { key: 'voice_notes_created', label: 'Voice Notes', icon: Mic, color: 'var(--color-primary)' },
    { key: 'documents_uploaded', label: 'Documents', icon: FileText, color: 'var(--color-success)' },
    { key: 'leads_created', label: 'Leads', icon: Users, color: 'var(--color-warning)' },
    { key: 'calls_logged', label: 'Calls', icon: Mic, color: 'var(--color-primary)' },
    { key: 'expenses_recorded', label: 'Expenses', icon: DollarSign, color: 'var(--color-error)' },
    { key: 'incidents_detected', label: 'Incidents', icon: AlertTriangle, color: 'var(--color-error)' },
    { key: 'schedule_risks_avoided', label: 'Schedule Risks', icon: AlertCircle, color: 'var(--color-warning)' },
    { key: 'offline_sessions', label: 'Offline Sessions', icon: Clock, color: 'var(--color-text-muted)' },
  ]

  if (loading) {
    return (
      <Card padding="lg" style={{ textAlign: 'center' }}>
        <div style={{ color: 'var(--color-text-muted)' }}>Loading metrics...</div>
      </Card>
    )
  }

  return (
    <Card padding="lg">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--spacing-lg)' }}>
        <h2 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 600 }}>Pilot Metrics</h2>
        <Select
          value={timeRange}
          onChange={e => setTimeRange(e.target.value as '7d' | '30d' | '90d')}
          options={[
            { value: '7d', label: '7 days' },
            { value: '30d', label: '30 days' },
            { value: '90d', label: '90 days' },
          ]}
          style={{ minWidth: '120px' }}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-lg)' }}>
        {metricConfigs.map(config => {
          const total = summary[config.key] || 0
          return (
            <div key={config.key} style={{ padding: 'var(--spacing-md)', background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-xs)' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: `${config.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: config.color }}>
                  {typeof config.icon === 'string' ? (
                    <span style={{ fontSize: '1rem' }}>{config.icon === 'Users' ? '👥' : config.icon === 'Mic' ? '🎤' : config.icon === 'FileText' ? '📄' : config.icon === 'DollarSign' ? '💰' : config.icon === 'AlertTriangle' ? '⚠️' : config.icon === 'AlertCircle' ? '🔔' : config.icon === 'CheckCircle' ? '✅' : config.icon === 'Clock' ? '⏰' : '📊'}</span>
                  ) : (
                    <config.icon size={16} />
                  )}
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{config.label}</span>
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: config.color }}>
                {total}
              </div>
            </div>
          )
        })}
      </div>

      <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 'var(--spacing-lg)' }}>
        <h3 style={{ margin: '0 0 var(--spacing-md)', fontSize: '1rem', fontWeight: 600 }}>Quick Actions</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-sm)' }}>
          <Button variant="secondary" size="sm" onClick={() => recordMetric('voice_notes_created', 1)} leftIcon={<Mic size={14} />}>
            Log Voice Note
          </Button>
          <Button variant="secondary" size="sm" onClick={() => recordMetric('documents_uploaded', 1)} leftIcon={<FileText size={14} />}>
            Upload Document
          </Button>
          <Button variant="secondary" size="sm" onClick={() => recordMetric('leads_created', 1)} leftIcon={<Users size={14} />}>
            Add Lead
          </Button>
          <Button variant="secondary" size="sm" onClick={() => recordMetric('calls_logged', 1)} leftIcon={<Mic size={14} />}>
            Log Call
          </Button>
          <Button variant="secondary" size="sm" onClick={() => recordMetric('expenses_recorded', 1)} leftIcon={<DollarSign size={14} />}>
            Add Expense
          </Button>
        </div>
      </div>
    </Card>
  )
}