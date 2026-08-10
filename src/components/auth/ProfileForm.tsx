import { useState, useEffect } from 'react'
import { useAuth } from '../../hooks/useAuth.tsx'
import { useToast } from '../ui/Toast.tsx'
import { Button } from '../ui/Button.tsx'
import { Input } from '../ui/Input.tsx'
import { Select } from '../ui/Select.tsx'
import { Card } from '../ui/Card.tsx'
import { advisorProfileSchema, type AdvisorProfile } from '../../lib/validation.ts'
import { EMPLOYMENT_MODELS, CONSENT_STATUSES, type EmploymentModel, type ConsentStatus } from '../../lib/constants.ts'

export function ProfileForm() {
  const { advisor, refreshAdvisor } = useAuth()
  const { showToast } = useToast()
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState<AdvisorProfile>({
    businessName: '',
    employmentModel: 'company_advisor',
    workingPreferences: {},
    commissionRatePercent: 15.25,
    vatAdjustmentPercent: 20.00,
    taxReservePercent: 25.00,
    installOnlyMinutesPerBlind: 16,
    fullJobMinutesPerBlind: 33,
    weeklyEarningsTarget: undefined,
    hmrcMileageRateTier1: 0.55,
    hmrcMileageRateTier2: 0.25,
    hmrcMileageThresholdMiles: 10000,
    consentStatus: 'pending'
  })
  const [errors, setErrors] = useState<Partial<Record<keyof AdvisorProfile, string>>>({})

  useEffect(() => {
    if (advisor) {
      setFormData({
        businessName: advisor.businessName,
        employmentModel: advisor.employmentModel,
        workingPreferences: advisor.workingPreferences,
        commissionRatePercent: advisor.commissionRatePercent,
        vatAdjustmentPercent: advisor.vatAdjustmentPercent,
        taxReservePercent: advisor.taxReservePercent,
        installOnlyMinutesPerBlind: advisor.installOnlyMinutesPerBlind,
        fullJobMinutesPerBlind: advisor.fullJobMinutesPerBlind,
        weeklyEarningsTarget: advisor.weeklyEarningsTarget,
        hmrcMileageRateTier1: advisor.hmrcMileageRateTier1,
        hmrcMileageRateTier2: advisor.hmrcMileageRateTier2,
        hmrcMileageThresholdMiles: advisor.hmrcMileageThresholdMiles,
        consentStatus: advisor.consentStatus
      })
    }
  }, [advisor])

  const validateField = (name: keyof AdvisorProfile, value: unknown) => {
    const fieldSchema = advisorProfileSchema.shape[name]
    if (fieldSchema) {
      const result = fieldSchema.safeParse(value)
      if (!result.success) {
        setErrors(prev => ({ ...prev, [name]: result.error.errors[0].message }))
      } else {
        setErrors(prev => { const next = { ...prev }; delete next[name]; return next })
      }
    }
  }

  const handleChange = (name: keyof AdvisorProfile, value: unknown) => {
    setFormData(prev => ({ ...prev, [name]: value }))
    // Validate immediately for percentage/money fields to show errors
    if (['commissionRatePercent', 'vatAdjustmentPercent', 'taxReservePercent', 'hmrcMileageRateTier1', 'hmrcMileageRateTier2', 'weeklyEarningsTarget'].includes(name)) {
      const numValue = typeof value === 'string' ? parseFloat(value as string) : value
      if (typeof value === 'string' && value !== '' && isNaN(Number(value))) {
        setErrors(prev => ({ ...prev, [name]: 'Must be a valid number' }))
      } else {
        validateField(name, value)
      }
    } else {
      validateField(name, value)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const result = advisorProfileSchema.safeParse(formData)
    if (!result.success) {
      const fieldErrors: typeof errors = {}
      result.error.errors.forEach(err => {
        if (err.path[0]) fieldErrors[err.path[0] as keyof AdvisorProfile] = err.message
      })
      setErrors(fieldErrors)
      return
    }

    if (!advisor) return

    setSaving(true)
    try {
      const { updateAdvisorProfile } = await import('../../lib/auth')
      await updateAdvisorProfile(advisor.id!, formData)
      await refreshAdvisor()
      showToast('Profile saved', 'success')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save profile'
      showToast(message, 'error')
    } finally {
      setSaving(false)
    }
  }

  if (!advisor) {
    return (
      <Card padding="lg" style={{ textAlign: 'center' }}>
        <p style={{ color: 'var(--color-text-muted)' }}>Loading profile...</p>
      </Card>
    )
  }

  const employmentOptions = EMPLOYMENT_MODELS.map(v => ({ value: v, label: v === 'company_advisor' ? 'Company Advisor (Hillarys-style)' : 'Independent' }))
  const consentOptions = CONSENT_STATUSES.map(v => ({ value: v, label: v.charAt(0).toUpperCase() + v.slice(1) }))

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
      <Card padding="lg">
        <h2 style={{ margin: '0 0 var(--spacing-lg)', fontSize: '1.125rem', fontWeight: 600 }}>Business Details</h2>
        
        <Input
          label="Business Name"
          value={formData.businessName}
          onChange={(e) => handleChange('businessName', e.target.value)}
          error={errors.businessName}
          placeholder="Your trading name"
          fullWidth
        />

        <Select
          label="Employment Model"
          value={formData.employmentModel}
          onChange={(e) => handleChange('employmentModel', e.target.value as EmploymentModel)}
          options={employmentOptions}
          fullWidth
        />
      </Card>

      <Card padding="lg">
        <h2 style={{ margin: '0 0 var(--spacing-lg)', fontSize: '1.125rem', fontWeight: 600 }}>Commission & Tax</h2>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 'var(--spacing-md)' }}>
          <Input
            label="Commission Rate (%)"
            type="number"
            step="0.01"
            min="0"
            max="100"
            value={formData.commissionRatePercent}
            onChange={(e) => handleChange('commissionRatePercent', parseFloat(e.target.value) || 0)}
            error={errors.commissionRatePercent}
            fullWidth
          />
          <Input
            label="VAT Adjustment (%)"
            type="number"
            step="0.01"
            min="0"
            max="100"
            value={formData.vatAdjustmentPercent}
            onChange={(e) => handleChange('vatAdjustmentPercent', parseFloat(e.target.value) || 0)}
            error={errors.vatAdjustmentPercent}
            fullWidth
          />
          <Input
            label="Tax Reserve (%)"
            type="number"
            step="0.01"
            min="0"
            max="100"
            value={formData.taxReservePercent}
            onChange={(e) => handleChange('taxReservePercent', parseFloat(e.target.value) || 0)}
            error={errors.taxReservePercent}
            fullWidth
          />
        </div>

        <Input
          label="Weekly Earnings Target (£)"
          type="number"
          step="0.01"
          min="0"
          value={formData.weeklyEarningsTarget ?? ''}
          onChange={(e) => handleChange('weeklyEarningsTarget', e.target.value ? parseFloat(e.target.value) : undefined)}
          error={errors.weeklyEarningsTarget}
          placeholder="Optional"
          fullWidth
        />
      </Card>

      <Card padding="lg">
        <h2 style={{ margin: '0 0 var(--spacing-lg)', fontSize: '1.125rem', fontWeight: 600 }}>Scheduling</h2>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 'var(--spacing-md)' }}>
          <Input
            label="Install Only (min/blind)"
            type="number"
            min="1"
            value={formData.installOnlyMinutesPerBlind}
            onChange={(e) => handleChange('installOnlyMinutesPerBlind', parseInt(e.target.value) || 16)}
            error={errors.installOnlyMinutesPerBlind}
            fullWidth
          />
          <Input
            label="Full Job (min/blind)"
            type="number"
            min="1"
            value={formData.fullJobMinutesPerBlind}
            onChange={(e) => handleChange('fullJobMinutesPerBlind', parseInt(e.target.value) || 33)}
            error={errors.fullJobMinutesPerBlind}
            fullWidth
          />
        </div>
        <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', margin: 'var(--spacing-sm) 0 0' }}>
          Full job time is used for schedule-risk warnings. Industry benchmark ~33 min/blind.
        </p>
      </Card>

      <Card padding="lg">
        <h2 style={{ margin: '0 0 var(--spacing-lg)', fontSize: '1.125rem', fontWeight: 600 }}>HMRC Mileage Rates</h2>
        <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', margin: '0 0 var(--spacing-md)' }}>
          Used for mileage claims. Rates effective 6 April 2026.
        </p>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 'var(--spacing-md)' }}>
          <Input
            label="Tier 1 Rate (£/mile)"
            type="number"
            step="0.01"
            min="0"
            value={formData.hmrcMileageRateTier1}
            onChange={(e) => handleChange('hmrcMileageRateTier1', parseFloat(e.target.value) || 0.55)}
            error={errors.hmrcMileageRateTier1}
            fullWidth
          />
          <Input
            label="Tier 2 Rate (£/mile)"
            type="number"
            step="0.01"
            min="0"
            value={formData.hmrcMileageRateTier2}
            onChange={(e) => handleChange('hmrcMileageRateTier2', parseFloat(e.target.value) || 0.25)}
            error={errors.hmrcMileageRateTier2}
            fullWidth
          />
          <Input
            label="Threshold (miles)"
            type="number"
            min="1"
            value={formData.hmrcMileageThresholdMiles}
            onChange={(e) => handleChange('hmrcMileageThresholdMiles', parseInt(e.target.value) || 10000)}
            error={errors.hmrcMileageThresholdMiles}
            fullWidth
          />
        </div>
        <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', margin: 'var(--spacing-sm) 0 0' }}>
          First {formData.hmrcMileageThresholdMiles?.toLocaleString()} miles at £{formData.hmrcMileageRateTier1}/mile, then £{formData.hmrcMileageRateTier2}/mile.
        </p>
      </Card>

      <Card padding="lg">
        <h2 style={{ margin: '0 0 var(--spacing-lg)', fontSize: '1.125rem', fontWeight: 600 }}>Data Consent</h2>
        
        <Select
          label="Consent Status"
          value={formData.consentStatus}
          onChange={(e) => handleChange('consentStatus', e.target.value as ConsentStatus)}
          options={consentOptions}
          fullWidth
        />
        <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', margin: 'var(--spacing-sm) 0 0' }}>
          Required for processing customer data beyond core local capture.
        </p>
      </Card>

      <Button type="submit" loading={saving} fullWidth size="lg">
        Save Profile
      </Button>
    </form>
  )
}