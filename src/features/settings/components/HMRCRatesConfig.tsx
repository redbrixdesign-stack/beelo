// HMRCRatesConfig - HMRC mileage rate configuration

import { useState } from 'react'
import { useSettings } from '../hooks/useSettings'
import { Card } from '@components/ui/Card'
import { Button } from '@components/ui/Button'
import { Input } from '@components/ui/Input'
import { Badge } from '@components/ui/Badge'
import { Save, Info, AlertCircle, PoundSterling } from 'lucide-react'

export function HMRCRatesConfig() {
  const { settings, updateSetting, saving } = useSettings()
  const [localSettings, setLocalSettings] = useState(settings)

  const handleChange = (key: string, value: string | number) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }))
  }

  const handleSave = async () => {
    for (const [key, value] of Object.entries(localSettings)) {
      await updateSetting(key as any, value)
    }
  }

  const handleReset = () => {
    setLocalSettings(settings)
  }

  return (
    <Card padding="lg">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--spacing-lg)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
          <div style={{ 
            width: '40px', 
            height: '40px', 
            borderRadius: '50%', 
            background: 'var(--color-primary-muted)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            color: 'var(--color-primary)'
          }}>
            <PoundSterling size={20} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>HMRC Mileage Rates</h3>
            <p style={{ margin: 'var(--spacing-xs) 0 0', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
              Approved Mileage Allowance Payments (AMAP) rates
            </p>
          </div>
        </div>
        <Badge variant="info" size="sm">
          <Info size={10} /> Configurable
        </Badge>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 'var(--spacing-lg)' }}>
        <div style={{ padding: 'var(--spacing-md)', background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
          <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--color-text-muted)', marginBottom: 'var(--spacing-xs)' }}>
            Tier 1 Rate (p/mile)
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
            <Input
              type="number"
              step="0.1"
              value={localSettings.hmrcMileageRateTier1}
              onChange={e => handleChange('hmrcMileageRateTier1', parseFloat(e.target.value))}
              style={{ width: '80px' }}
            />
            <span style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>p/mile</span>
          </div>
          <p style={{ margin: 'var(--spacing-xs) 0 0', fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
            First 10,000 business miles per tax year
          </p>
        </div>

        <div style={{ padding: 'var(--spacing-md)', background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
          <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--color-text-muted)', marginBottom: 'var(--spacing-xs)' }}>
            Tier 2 Rate (p/mile)
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
            <Input
              type="number"
              step="0.1"
              value={localSettings.hmrcMileageRateTier2}
              onChange={e => handleChange('hmrcMileageRateTier2', parseFloat(e.target.value))}
              style={{ width: '80px' }}
            />
            <span style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>p/mile</span>
          </div>
          <p style={{ margin: 'var(--spacing-xs) 0 0', fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
            Miles above 10,000 per tax year
          </p>
        </div>

        <div style={{ padding: 'var(--spacing-md)', background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
          <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--color-text-muted)', marginBottom: 'var(--spacing-xs)' }}>
            Tier Threshold (miles)
          </label>
          <Input
            type="number"
            step="100"
            value={localSettings.hmrcMileageThresholdMiles}
            onChange={e => handleChange('hmrcMileageThresholdMiles', parseInt(e.target.value))}
            style={{ width: '100px' }}
          />
          <p style={{ margin: 'var(--spacing-xs) 0 0', fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
            Threshold between tier 1 and tier 2
          </p>
        </div>
      </div>

      <div style={{ marginTop: 'var(--spacing-xl)', padding: 'var(--spacing-md)', background: 'var(--color-primary-muted)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-primary)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--spacing-sm)' }}>
          <AlertCircle size={20} style={{ color: 'var(--color-primary)', flexShrink: 0, marginTop: '2px' }} />
          <div style={{ fontSize: '0.8rem', color: 'var(--color-primary)' }}>
            <strong>Rates effective from 6 April 2026:</strong> 55p/mile for first 10,000 miles, 25p/mile thereafter. 
            First change since 2011. Update these annually from HMRC guidance.
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 'var(--spacing-sm)', marginTop: 'var(--spacing-lg)' }}>
        <Button variant="primary" onClick={handleSave} disabled={saving} leftIcon={<Save size={16} />} fullWidth>
          {saving ? 'Saving...' : 'Save Rates'}
        </Button>
      </div>
    </Card>
  )
}