// DORPrediction - DOR rate prediction display with chart

import { useEffect, useRef } from 'react'
import { Card } from '@components/ui/Card'
import { Badge } from '@components/ui/Badge'
import { TrendingUp, TrendingDown, Minus, AlertTriangle, Shield, Target, DollarSign, BarChart2 } from 'lucide-react'
import { useDORPrediction } from '../hooks/useDORPrediction'
import { DOR_PENALTY_TIERS } from '@lib/constants'

export function DORPrediction() {
  const { metrics, loading, recompute } = useDORPrediction()
  const chartRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!chartRef.current || !metrics) return
    drawChart()
  }, [metrics])

  const drawChart = () => {
    const canvas = chartRef.current
    if (!canvas || !metrics) return
    
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const { weeklyData, currentDORRate, predictedDORRate } = metrics
    const width = canvas.width = canvas.offsetWidth
    const height = canvas.height = 200
    const padding = 40

    ctx.clearRect(0, 0, width, height)

    // Find min/max for scaling
    const rates = weeklyData.map(w => w.dorRate)
    rates.push(currentDORRate, predictedDORRate)
    const maxRate = Math.max(...rates, 3)
    const minRate = Math.min(...rates, 0)

    const xStep = (width - 2 * padding) / Math.max(1, weeklyData.length - 1)

    // Draw grid
    ctx.strokeStyle = 'var(--color-border)'
    ctx.lineWidth = 1
    for (let i = 0; i <= 4; i++) {
      const y = padding + (height - 2 * padding) * (i / 4)
      ctx.beginPath()
      ctx.moveTo(padding, y)
      ctx.lineTo(width - padding, y)
      ctx.stroke()
    }

    // Draw 2.5% threshold line
    const thresholdY = padding + (height - 2 * padding) * (1 - 2.5 / maxRate)
    ctx.strokeStyle = 'var(--color-error)'
    ctx.setLineDash([5, 5])
    ctx.beginPath()
    ctx.moveTo(padding, thresholdY)
    ctx.lineTo(width - padding, thresholdY)
    ctx.stroke()
    ctx.setLineDash([])

    // Draw actual DOR rate line
    ctx.strokeStyle = 'var(--color-primary)'
    ctx.lineWidth = 2
    ctx.beginPath()
    weeklyData.forEach((w, i) => {
      const x = padding + i * xStep
      const y = padding + (height - 2 * padding) * (1 - w.dorRate / maxRate)
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    })
    ctx.stroke()

    // Draw predicted point
    if (weeklyData.length > 0) {
      const x = padding + (weeklyData.length - 1) * xStep
      const y = padding + (height - 2 * padding) * (1 - predictedDORRate / maxRate)
      ctx.fillStyle = 'var(--color-warning)'
      ctx.beginPath()
      ctx.arc(x, y, 6, 0, Math.PI * 2)
      ctx.fill()
    }

    // Draw threshold label
    ctx.fillStyle = 'var(--color-error)'
    ctx.font = '11px system-ui'
    ctx.fillText('2.5% threshold (elevated tier)', width - padding - 150, thresholdY - 5)
  }

  if (loading) {
    return (
      <Card padding="xl" style={{ textAlign: 'center' }}>
        <BarChart2 size={48} style={{ marginBottom: 'var(--spacing-md)', opacity: 0.5 }} />
        <p>Calculating DOR prediction...</p>
      </Card>
    )
  }

  if (!metrics) {
    return (
      <Card padding="xl" style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>
        <BarChart2 size={48} style={{ marginBottom: 'var(--spacing-md)', opacity: 0.5 }} />
        <p>No incident data available</p>
        <p style={{ fontSize: '0.85rem', marginTop: 'var(--spacing-sm)' }}>
          Create incidents with <strong>countsTowardDor=true</strong> to see prediction
        </p>
      </Card>
    )
  }

  const { currentDORRate, predictedDORRate, blindsAtRisk, estimatedPenalty, tier, weeklyData } = metrics
  const trend = weeklyData.length >= 2 
    ? weeklyData[weeklyData.length - 1].dorRate - weeklyData[0].dorRate
    : 0
  const isImproving = trend < -0.1
  const isWorsening = trend > 0.1

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
      {/* Current Status */}
      <Card padding="lg">
        <h3 style={{ margin: '0 0 var(--spacing-lg)', fontSize: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
          <BarChart2 size={18} style={{ color: 'var(--color-primary)' }} />
          DOR Rate Prediction
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 'var(--spacing-lg)' }}>
          <div style={{ textAlign: 'center', padding: 'var(--spacing-md)', background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)' }}>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-primary)' }}>
              {currentDORRate.toFixed(1)}%
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Current DOR Rate (4-wk)</div>
          </div>
          <div style={{ textAlign: 'center', padding: 'var(--spacing-md)', background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)' }}>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-warning)' }}>
              {predictedDORRate.toFixed(1)}%
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Predicted Next Week</div>
          </div>
          <div style={{ textAlign: 'center', padding: 'var(--spacing-md)', background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)' }}>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: tier === 'elevated' ? 'var(--color-error)' : 'var(--color-success)' }}>
              {tier.toUpperCase()}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Penalty Tier</div>
          </div>
        </div>

        {/* Trend indicator */}
        <div style={{ marginTop: 'var(--spacing-lg)', display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', padding: 'var(--spacing-md)', borderRadius: 'var(--radius-md)', background: isWorsening ? 'var(--color-error-muted)' : isImproving ? 'var(--color-success-muted)' : 'var(--color-info-muted)' }}>
          {isWorsening && <TrendingUp size={20} style={{ color: 'var(--color-error)' }} />}
          {isImproving && <TrendingDown size={20} style={{ color: 'var(--color-success)' }} />}
          {!isWorsening && !isImproving && <Minus size={20} style={{ color: 'var(--color-info)' }} />}
          <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>
            {isWorsening ? `Rate rising (+${trend.toFixed(1)}%) — risk increasing` : 
             isImproving ? `Rate falling (${trend.toFixed(1)}%) — improving` : 
             'Rate stable'}
          </span>
        </div>
      </Card>

      {/* Chart */}
<Card padding="lg">
          <h3 style={{ margin: '0 0 var(--spacing-lg)', fontSize: '1rem', fontWeight: 600 }}>4-Week Trend</h3>
        <canvas ref={chartRef} style={{ width: '100%', height: '200px', background: 'var(--color-background)', borderRadius: 'var(--radius-md)' }} />
      </Card>

      {/* Next Week Prediction */}
      <Card padding="lg" style={{ background: tier === 'elevated' ? 'var(--color-error-muted)' : 'var(--color-success-muted)', border: `1px solid ${tier === 'elevated' ? 'var(--color-error)' : 'var(--color-success)'}` }}>
        <h3 style={{ margin: '0 0 var(--spacing-lg)', fontSize: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
          {tier === 'elevated' ? <AlertTriangle size={18} style={{ color: 'var(--color-error)' }} /> : <Shield size={18} style={{ color: 'var(--color-success)' }} />}
          Next Week Prediction
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 'var(--spacing-lg)' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-primary)' }}>
              {blindsAtRisk}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Blinds at Risk</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.75rem', fontWeight: 700, color: tier === 'elevated' ? 'var(--color-error)' : 'var(--color-success)' }}>
              £{estimatedPenalty}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Estimated Penalty</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.75rem', fontWeight: 700, color: tier === 'elevated' ? 'var(--color-error)' : 'var(--color-success)' }}>
              £{DOR_PENALTY_TIERS[tier].amountPerBlind}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Per Blind ({tier})</div>
          </div>
        </div>

        <div style={{ marginTop: 'var(--spacing-lg)', padding: 'var(--spacing-md)', background: 'rgba(0,0,0,0.05)', borderRadius: 'var(--radius-md)', fontSize: '0.8rem' }}>
          <strong>BusinessRules.md:</strong> Flat penalty per blind — £20 standard / £40 elevated. 
          No additional remake cost for company_advisor. Tier based on rolling 4-week DOR%.
        </div>
      </Card>
    </div>
  )
}