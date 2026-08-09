// HMRCRatesConfig - HMRC mileage rate configuration

import { useState } from 'react'
import { useSettings } from '../hooks/useSettings'
import { Card } from '@components/ui/Card'
import { Button } from '@components/ui/Button'
import { Input } from '@components/ui/Input'
import { Badge } from '@components/ui/Badge'
import { Save, Info, AlertCircle, RotateCcw, Car, PoundSterling } from 'lucide-react'

export function HMRCRatesConfig() {
  const { settings, updateSetting, saving } = useSettings()
  const [localSettings, setLocalSettings] = useState(settings)
  const [saved, setSaved] = useState(false)

  const handleChange = (key: string, value: string | number) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }))
    setSaved(false)
  }

  const handleSave = async () => {
    for (const [key, value] of Object.entries(localSettings)) {
      await updateSetting(key as any, value)
    }
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleReset = () => {
    setLocalSettings(settings)
  }

  return (
    <Card padding="lg">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--spacing-lg)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
          <div style={{ 
            width: '48px', height: '48px', borderRadius: 'var(--radius-md)', 
            background: 'var(--color-primary-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Car size={24} style={{ color: 'var(--color-primary)' }} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 600 }}>HMRC Mileage Rates</h3>
            <p style={{ margin: 'var(--spacing-xs) 0 0', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
              Approved Mileage Allowance Payments (AMAP) — editable for future changes
            </p>
          </div>
        </div>
        <Badge variant="info" size="sm"><Info size={10} /> Configurable</Badge>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--spacing-lg)' }}>
        {/* Tier 1 */}
        <div style={{ padding: 'var(--spacing-md)', background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-sm)' }}>
            <PoundSterling size={18} style={{ color: 'var(--color-primary)' }} />
            <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--color-text-muted)', marginBottom: 'var(--spacing-xs)' }}>
              Tier 1 Rate (p/mile)
            </label>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
            <Input
              type="number"
              step="0.1"
              min="0"
              value={localSettings.hmrcMileageRateTier1}
              onChange={e => handleChange('hmrcMileageRateTier1', parseFloat(e.target.value) || 0)}
              style={{ width: '100px' }}
            />
            <span style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>p/mile</span>
          </div>
<p style={{ margin: 'var(--spacing-xs) 0 0', fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
              First {localSettings.hmrcMileageThresholdMiles?.toLocaleString() || 10000} business miles per tax year
            </p>
          <div style={{ marginTop: 'var(--spacing-sm)', fontSize: '0.75rem', color: 'var(--color-success)' }}>
            At {localSettings.hmrcMileageRateTier1}p/mile: £{((localSettings.hmrcMileageThresholdMiles || 10000) * (localSettings.hmrcMileageRateTier1 || 0.55) / 100).toFixed(2)}/year max at tier 1
          </div>
        </div>

        {/* Tier 2 */}
        <div style={{ padding: 'var(--spacing-md)', background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-sm)' }}>
            <PoundSterling size={18} style={{ color: 'var(--color-primary)' }} />
            <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--color-text-muted)', marginBottom: 'var(--spacing-xs)' }}>
              Tier 2 Rate (p/mile)
            </label>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
            <Input
              type="number"
              step="0.1"
              min="0"
              value={localSettings.hmrcMileageRateTier2}
              onChange={e => handleChange('hmrcMileageRateTier2', parseFloat(e.target.value) || 0)}
              style={{ width: '100px' }}
            />
            <span style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>p/mile</span>
          </div>
<p style={{ margin: 'var(--spacing-xs) 0 0', fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
              Miles above {localSettings.hmrcMileageThresholdMiles?.toLocaleString() || 10000} per tax year
            </p>
        </div>

        {/* Threshold */}
        <div style={{ padding: 'var(--spacing-md)', background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-sm)' }}>
            <RotateCcw size={18} style={{ color: 'var(--color-primary)' }} />
            <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--color-text-muted)', marginBottom: 'var(--spacing-xs)' }}>
              Tier Threshold (miles)
            </label>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
            <Input
              type="number"
              step="100"
              min="0"
              value={localSettings.hmrcMileageThresholdMiles}
              onChange={e => handleChange('hmrcMileageThresholdMiles', parseInt(e.target.value) || 0)}
              style={{ width: '120px' }}
            />
            <span style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>miles</span>
          </div>
          <p style={{ margin: 'var(--spacing-xs) 0 0', fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
            Annual threshold where tier 2 rate applies
          </p>
        </div>
      </div>

      {/* Current defaults info */}
      <Card padding="md" style={{ marginTop: 'var(--spacing-lg)', background: 'var(--color-info-muted)', border: '1px solid var(--color-info)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--spacing-sm)' }}>
          <Info size={18} style={{ color: 'var(--color-info)', marginTop: 2 }} />
          <div style={{ fontSize: '0.8rem', color: 'var(--color-info)' }}>
            <strong>2026/27 Defaults:</strong> Tier 1: 55p/mile, Tier 2: 25p/mile, Threshold: 10,000 miles.
            <br />Rates effective from 6 April 2026. Edit above to customise for your situation or future changes.
          </div>
        </div>
      </Card>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 'var(--spacing-md)', justifyContent: 'flex-end', marginTop: 'var(--spacing-lg)' }}>
        <Button variant="secondary" onClick={handleReset} leftIcon={<RotateCcw size={16} />} disabled={saving}>
          Reset to Saved
        </Button>
        <Button variant="primary" onClick={handleSave} leftIcon={saved ? undefined : <Save size={16} />} disabled={saving}>
          {saved ? 'Saved!' : saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </Card>
  )
}