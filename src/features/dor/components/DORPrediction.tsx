// DORPrediction - Rolling DOR rate prediction display

import { useDORPrediction } from '../hooks/useDORPrediction'
import { Card } from '@components/ui/Card'
import { Badge } from '@components/ui/Badge'
import { Button } from '@components/ui/Button'
import { AlertTriangle, TrendingUp, TrendingDown, Minus, AlertCircle, CheckCircle, Clock } from 'lucide-react'

export function DORPrediction() {
  const { 
    currentDORRate, 
    predictedDORRate, 
    blindsAtRisk, 
    estimatedPenalty, 
    weeklyTrend, 
    riskLevel, 
    loading, 
    refresh 
  } = useDORPrediction()

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'high': return 'var(--color-error)'
      case 'medium': return 'var(--color-warning)'
      default: return 'var(--color-success)'
    }
  }

  const getRiskLabel = (risk: string) => {
    switch (risk) {
      case 'high': return 'High Risk'
      case 'medium': return 'Medium Risk'
      default: return 'Low Risk'
    }
  }

  const getRiskIcon = (risk: string) => {
    switch (risk) {
      case 'high': return <AlertCircle size={24} style={{ color: 'var(--color-error)' }} />
      case 'medium': return <AlertTriangle size={24} style={{ color: 'var(--color-warning)' }} />
      default: return <CheckCircle size={24} style={{ color: 'var(--color-success)' }} />
    }
  }

  const formatRate = (rate: number) => `${rate.toFixed(1)}%`

  const getTrendIcon = (current: number, previous: number) => {
    if (current > previous) return <TrendingUp size={16} style={{ color: 'var(--color-error)' }} />
    if (current < previous) return <TrendingDown size={16} style={{ color: 'var(--color-success)' }} />
    return <Minus size={16} style={{ color: 'var(--color-text-muted)' }} />
  }

  if (loading) {
    return (
      <Card padding="lg" style={{ textAlign: 'center' }}>
        <div style={{ color: 'var(--color-text-muted)' }}>Computing DOR prediction...</div>
      </Card>
    )
  }

  return (
    <Card padding="lg">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--spacing-lg)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
          {getRiskIcon(riskLevel)}
          <div>
            <h2 style={{ margin: '0 0 var(--spacing-xs)', fontSize: '1.125rem', fontWeight: 600 }}>DOR Prediction</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
              <span>Rolling 4-week rate</span>
</div>
        </div>
      )}</div>
        <Badge variant={riskLevel === 'high' ? 'error' : riskLevel === 'medium' ? 'warning' : 'success'} size="md">
          {getRiskLabel(riskLevel)}
        </Badge>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-lg)' }}>
        <div style={{ padding: 'var(--spacing-md)', background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginBottom: 'var(--spacing-xs)' }}>Current DOR Rate</div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: currentDORRate >= 2.5 ? 'var(--color-error)' : currentDORRate >= 1.5 ? 'var(--color-warning)' : 'var(--color-success)' }}>
            {formatRate(currentDORRate)}
          </div>
        </div>
        <div style={{ padding: 'var(--spacing-md)', background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginBottom: 'var(--spacing-xs)' }}>Predicted Next Week</div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: predictedDORRate >= 2.5 ? 'var(--color-error)' : predictedDORRate >= 1.5 ? 'var(--color-warning)' : 'var(--color-success)' }}>
            {formatRate(predictedDORRate)}
            {predictedDORRate > currentDORRate && <TrendingUp size={24} style={{ color: 'var(--color-error)', verticalAlign: 'middle' }} />}
            {predictedDORRate < currentDORRate && <TrendingDown size={24} style={{ color: 'var(--color-success)', verticalAlign: 'middle' }} />}
          </div>
        </div>
        <div style={{ padding: 'var(--spacing-md)', background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginBottom: 'var(--spacing-xs)' }}>Blinds at Risk</div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-primary)' }}>
            {blindsAtRisk}
          </div>
        </div>
        <div style={{ padding: 'var(--spacing-md)', background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginBottom: 'var(--spacing-xs)' }}>Est. Penalty</div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-error)' }}>
            £{estimatedPenalty}
          </div>
        </div>
      </div>

      {weeklyTrend.length > 0 && (
        <div style={{ marginTop: 'var(--spacing-lg)' }}>
          <h3 style={{ margin: '0 0 var(--spacing-md)', fontSize: '0.9rem', fontWeight: 600 }}>Weekly Trend</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
            {weeklyTrend.slice(-8).map((week, index) => {
              const previous = weeklyTrend.slice(-8)[index - 1]
              return (
                <div key={week.week} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--spacing-sm)', background: 'var(--color-surface)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', minWidth: '120px' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                      {new Date(week.week).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                    </span>
                    <Badge variant={week.rate >= 2.5 ? 'error' : week.rate >= 1.5 ? 'warning' : 'success'} size="sm">
                      {formatRate(week.rate)}
                    </Badge>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>
                    <span>{week.blinds} blinds</span>
                    {previous && getTrendIcon(week.rate, previous.rate)}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 'var(--spacing-lg)', display: 'flex', gap: 'var(--spacing-sm)' }}>
        <Button variant="secondary" size="sm" onClick={refresh} leftIcon={<Clock size={14} />}>
          Refresh
        </Button>
      </div>
    </Card>
  )
}