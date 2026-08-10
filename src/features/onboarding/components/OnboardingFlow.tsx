// OnboardingFlow - 6-step onboarding flow

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Layout } from '@components/layout/Layout'
import { Card } from '@components/ui/Card'
import { Button } from '@components/ui/Button'
import { Input } from '@components/ui/Input'
import { Select } from '@components/ui/Select'
import { CheckCircle, ChevronRight, ChevronLeft, User, Shield, Camera, Mic, Database, Sparkles, FileText, Target } from 'lucide-react'
import { useOnboarding } from '../hooks/useOnboarding'
import { useAuth } from '@hooks/useAuth'
import { useDexie } from '@hooks/useDexie'
import { enqueueSync } from '@lib/sync'
import { EmploymentModel, ConsentStatus } from '@lib/constants'

const STEPS = [
  { id: 'welcome', label: 'Welcome', icon: Sparkles },
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'business', label: 'Business', icon: Target },
  { id: 'consent', label: 'Consent', icon: FileText },
  { id: 'permissions', label: 'Permissions', icon: Shield },
  { id: 'environment', label: 'Environment', icon: Database },
  { id: 'tutorial', label: 'Tutorial', icon: Camera },
  { id: 'complete', label: 'Complete', icon: CheckCircle },
] as const

type StepId = typeof STEPS[number]['id']

export function OnboardingFlow() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { db, isReady } = useDexie()
  const { onboardingState, setStep, completeStep, skipStep, completeOnboarding } = useOnboarding()
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [formData, setFormData] = useState({
    businessName: '',
    employmentModel: 'company_advisor' as EmploymentModel,
    commissionRate: 15.25,
    vatAdjustmentPercent: 20.00,
    weeklyEarningsTarget: '',
    fullJobMinutesPerBlind: 33,
    sourceEnv: 'live' as const,
    consentStatus: 'pending' as ConsentStatus,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (onboardingState) {
      setCurrentStepIndex(STEPS.findIndex(s => s.id === onboardingState.currentStep) || 0)
    }
  }, [onboardingState])

  const handleNext = async () => {
    const currentStep = STEPS[currentStepIndex]

    console.log('=== NEXT CLICKED ===')
    console.log('Current step:', currentStep)
    console.log('Current step ID:', STEPS[currentStepIndex]?.id)

    const stepErrors = validateStep(currentStep.id)
    console.log('Validation result:', stepErrors)

    if (Object.keys(stepErrors).length > 0) {
      console.log('Validation failed - showing errors but allowing pilot to proceed')
      setErrors(stepErrors)
    } else {
      setErrors({})
    }

    if (currentStep.id === 'profile') {
      await saveProfile()
    } else if (currentStep.id === 'business') {
      await saveBusiness()
    } else if (currentStep.id === 'consent') {
      await saveConsent()
    }

    console.log('ADVANCING to step:', STEPS[currentStepIndex + 1]?.id)
    await completeStep(currentStep.id)
    const nextIndex = Math.min(currentStepIndex + 1, STEPS.length - 1)
    setCurrentStepIndex(nextIndex)
    await setStep(STEPS[nextIndex].id)
  }

  const handleBack = () => {
    const prevIndex = Math.max(currentStepIndex - 1, 0)
    setCurrentStepIndex(prevIndex)
    setStep(STEPS[prevIndex].id)
    setErrors({})
  }

  const handleSkip = async () => {
    const currentStep = STEPS[currentStepIndex]
    await skipStep(currentStep.id)
    const nextIndex = Math.min(currentStepIndex + 1, STEPS.length - 1)
    setCurrentStepIndex(nextIndex)
    await setStep(STEPS[nextIndex].id)
    setErrors({})
  }

  const validateStep = (stepId: StepId): Record<string, string> => {
    const errs: Record<string, string> = {}
    
    if (stepId === 'profile') {
      if (!formData.businessName.trim()) {
        errs.businessName = 'Business name is required'
      }
      if (!formData.employmentModel) {
        errs.employmentModel = 'Employment model is required'
      }
    }
    
    if (stepId === 'business') {
      if (formData.commissionRate < 0 || formData.commissionRate > 100) {
        errs.commissionRate = 'Commission rate must be between 0 and 100'
      }
      if (formData.vatAdjustmentPercent < 0 || formData.vatAdjustmentPercent > 100) {
        errs.vatAdjustmentPercent = 'VAT adjustment must be between 0 and 100'
      }
    }
    
    if (stepId === 'consent') {
      if (formData.consentStatus !== 'granted') {
        errs.consentStatus = 'You must grant consent to continue'
      }
    }
    
    return errs
  }

  const saveProfile = async () => {
    if (!user || !isReady) return
    const advisorId = parseInt(user.id)
    const now = new Date()

    await db.advisors.update(advisorId, {
      businessName: formData.businessName,
      employmentModel: formData.employmentModel,
      updatedAt: now,
    })

    await enqueueSync('advisors', advisorId, 'update', {
      business_name: formData.businessName,
      employment_model: formData.employmentModel,
    })
  }

  const saveBusiness = async () => {
    if (!user || !isReady) return
    const advisorId = parseInt(user.id)
    const now = new Date()

    await db.advisors.update(advisorId, {
      commissionRatePercent: formData.commissionRate,
      vatAdjustmentPercent: formData.vatAdjustmentPercent,
      weeklyEarningsTarget: formData.weeklyEarningsTarget ? parseFloat(formData.weeklyEarningsTarget) : null,
      fullJobMinutesPerBlind: formData.fullJobMinutesPerBlind,
      updatedAt: now,
    })

    await enqueueSync('advisors', advisorId, 'update', {
      commission_rate_percent: formData.commissionRate,
      vat_adjustment_percent: formData.vatAdjustmentPercent,
      weekly_earnings_target: formData.weeklyEarningsTarget ? parseFloat(formData.weeklyEarningsTarget) : null,
      full_job_minutes_per_blind: formData.fullJobMinutesPerBlind,
    })
  }

  const saveConsent = async () => {
    if (!user || !isReady) return
    const advisorId = parseInt(user.id)
    const now = new Date()

    await db.advisors.update(advisorId, {
      consentStatus: formData.consentStatus,
      updatedAt: now,
    })

    await enqueueSync('advisors', advisorId, 'update', {
      consent_status: formData.consentStatus,
    })
  }

  const handleFinish = async () => {
    await completeOnboarding()
    navigate('/')
  }

  const currentStep = STEPS[currentStepIndex]
  const progress = ((currentStepIndex + 1) / STEPS.length) * 100

  return (
    <Layout title="Setup" showBack={false}>
      <div style={{ maxWidth: '480px', margin: '0 auto' }}>
        {/* Progress */}
        <div style={{ marginBottom: 'var(--spacing-lg)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--spacing-xs)' }}>
            {STEPS.map((step, i) => (
              <div key={step.id} style={{ flex: 1, textAlign: 'center', position: 'relative' }}>
                <div style={{
                  width: '32px', height: '32px', borderRadius: '50%', margin: '0 auto var(--spacing-xs)',
                  background: i < currentStepIndex ? 'var(--color-primary)' : i === currentStepIndex ? 'var(--color-primary)' : 'var(--color-border)',
                  color: i <= currentStepIndex ? 'white' : 'var(--color-text-muted)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: '0.8rem',
                  border: i === currentStepIndex ? '3px solid var(--color-primary)' : 'none',
                }}>
                  {i < currentStepIndex ? <CheckCircle size={16} /> : <step.icon size={16} />}
                </div>
                <div style={{ fontSize: '0.65rem', color: i <= currentStepIndex ? 'var(--color-primary)' : 'var(--color-text-muted)', fontWeight: i <= currentStepIndex ? 600 : 400 }}>
                  {step.label}
                </div>
              </div>
            ))}
          </div>
          <div style={{ height: '4px', background: 'var(--color-border)', borderRadius: '2px', overflow: 'hidden' }}>
            <div style={{ width: `${progress}%`, height: '100%', background: 'var(--color-primary)', transition: 'width 0.3s' }} />
          </div>
        </div>

        {/* Step Content */}
        <Card padding="xl" style={{ minHeight: '300px' }}>
          {currentStep.id === 'welcome' && (
            <div style={{ textAlign: 'center' }}>
              <Sparkles size={64} style={{ color: 'var(--color-primary)', marginBottom: 'var(--spacing-lg)' }} />
              <h2 style={{ margin: '0 0 var(--spacing-md)', fontSize: '1.5rem' }}>Welcome to Beelo</h2>
              <p style={{ color: 'var(--color-text-muted)', lineHeight: 1.6, marginBottom: 'var(--spacing-lg)' }}>
                Your offline-first, voice-first operational memory for home-visit sales.
                We'll set up your profile, permissions, and walk through the key features.
              </p>
              <div style={{ textAlign: 'left', fontSize: '0.85rem', color: 'var(--color-text-muted)', lineHeight: 2 }}>
                <div>✓ Voice capture — hands-free, offline</div>
                <div>✓ Document OCR — quotes, commissions, fit receipts</div>
                <div>✓ DOR protection — catch penalties automatically</div>
                <div>✓ Schedule risk — never miss a buffer</div>
                <div>✓ Mileage tracking — HMRC rates built in</div>
              </div>
            </div>
          )}

          {currentStep.id === 'profile' && (
            <div>
              <h2 style={{ margin: '0 0 var(--spacing-md)', fontSize: '1.25rem' }}>Your Profile</h2>
              <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--spacing-lg)' }}>
                This appears on quotes and helps identify your jobs.
              </p>
              <Input
                label="Business Name"
                value={formData.businessName}
                onChange={e => setFormData(prev => ({ ...prev, businessName: e.target.value }))}
                placeholder="e.g. Smith Blinds"
                error={errors.businessName}
              />
              <Select
                label="Employment Model"
                value={formData.employmentModel}
                onChange={e => setFormData(prev => ({ ...prev, employmentModel: e.target.value as EmploymentModel }))}
                options={[
                  { value: 'company_advisor', label: 'Company Advisor' },
                  { value: 'independent', label: 'Independent' },
                ]}
                style={{ marginTop: 'var(--spacing-md)' }}
                error={errors.employmentModel}
              />
            </div>
          )}

          {currentStep.id === 'business' && (
            <div>
              <h2 style={{ margin: '0 0 var(--spacing-md)', fontSize: '1.25rem' }}>Business Settings</h2>
              <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--spacing-lg)' }}>
                These values are used for commission calculations and earnings tracking.
              </p>
              <Input
                label="Commission Rate (%)"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={formData.commissionRate}
                onChange={e => setFormData(prev => ({ ...prev, commissionRate: parseFloat(e.target.value) || 0 }))}
                error={errors.commissionRate}
              />
              <Input
                label="VAT Adjustment (%)"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={formData.vatAdjustmentPercent}
                onChange={e => setFormData(prev => ({ ...prev, vatAdjustmentPercent: parseFloat(e.target.value) || 0 }))}
                style={{ marginTop: 'var(--spacing-md)' }}
                error={errors.vatAdjustmentPercent}
              />
              <Input
                label="Weekly Earnings Target (£)"
                type="number"
                step="0.01"
                min="0"
                value={formData.weeklyEarningsTarget}
                onChange={e => setFormData(prev => ({ ...prev, weeklyEarningsTarget: e.target.value }))}
                placeholder="Optional"
                style={{ marginTop: 'var(--spacing-md)' }}
              />
              <Input
                label="Full Job Minutes per Blind"
                type="number"
                min="1"
                value={formData.fullJobMinutesPerBlind}
                onChange={e => setFormData(prev => ({ ...prev, fullJobMinutesPerBlind: parseInt(e.target.value) || 33 }))}
                style={{ marginTop: 'var(--spacing-md)' }}
              />
              <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: 'var(--spacing-sm)' }}>
                Default 33 min (install + prep + cleanup). Adjust based on your experience.
              </p>
            </div>
          )}

          {currentStep.id === 'consent' && (
            <div>
              <h2 style={{ margin: '0 0 var(--spacing-md)', fontSize: '1.25rem' }}>Data Consent</h2>
              <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--spacing-lg)' }}>
                Beelo stores your business data locally on your device and syncs it to our secure servers for backup and cross-device access. We never sell your data.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--spacing-md)', padding: 'var(--spacing-md)', background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', border: `2px solid ${formData.consentStatus === 'granted' ? 'var(--color-primary)' : 'var(--color-border)'}`, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={formData.consentStatus === 'granted'}
                    onChange={e => setFormData(prev => ({ ...prev, consentStatus: e.target.checked ? 'granted' : 'pending' }))}
                    style={{ marginTop: '2px' }}
                  />
                  <div>
                    <div style={{ fontWeight: 600 }}>I consent to data processing and sync</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: 'var(--spacing-xs)' }}>
                      Your data is encrypted in transit and at rest. You can revoke consent anytime in Settings.
                    </div>
                  </div>
                </label>
              </div>
              {errors.consentStatus && (
                <p style={{ color: 'var(--color-error)', fontSize: '0.85rem', marginTop: 'var(--spacing-md)' }}>
                  {errors.consentStatus}
                </p>
              )}
            </div>
          )}

          {currentStep.id === 'permissions' && (
            <div style={{ textAlign: 'center' }}>
              <Shield size={64} style={{ color: 'var(--color-primary)', marginBottom: 'var(--spacing-lg)' }} />
              <h2 style={{ margin: '0 0 var(--spacing-md)', fontSize: '1.25rem' }}>Permissions Needed</h2>
              <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--spacing-lg)', lineHeight: 1.6 }}>
                Beelo needs a few permissions to work properly. You can change these later in settings.
              </p>
              <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)', padding: 'var(--spacing-md)', background: 'var(--color-surface)', borderRadius: 'var(--radius-md)' }}>
                  <input type="checkbox" defaultChecked disabled />
                  <div>
                    <div style={{ fontWeight: 500 }}>Microphone</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Voice capture & transcription</div>
                  </div>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)', padding: 'var(--spacing-md)', background: 'var(--color-surface)', borderRadius: 'var(--radius-md)' }}>
                  <input type="checkbox" defaultChecked disabled />
                  <div>
                    <div style={{ fontWeight: 500 }}>Camera</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Document OCR & receipt capture</div>
                  </div>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)', padding: 'var(--spacing-md)', background: 'var(--color-surface)', borderRadius: 'var(--radius-md)' }}>
                  <input type="checkbox" defaultChecked disabled />
                  <div>
                    <div style={{ fontWeight: 500 }}>Location</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Mileage tracking & schedule risk</div>
                  </div>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)', padding: 'var(--spacing-md)', background: 'var(--color-surface)', borderRadius: 'var(--radius-md)' }}>
                  <input type="checkbox" defaultChecked disabled />
                  <div>
                    <div style={{ fontWeight: 500 }}>Notifications</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Downtime prompts & sync status</div>
                  </div>
                </label>
              </div>
            </div>
          )}

          {currentStep.id === 'environment' && (
            <div>
              <h2 style={{ margin: '0 0 var(--spacing-md)', fontSize: '1.25rem' }}>Environment</h2>
              <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--spacing-lg)' }}>
                Choose your environment. This affects which data you see and where it syncs.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                {['live', 'qa', 'demo'].map(env => (
                  <label key={env} style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)', padding: 'var(--spacing-md)', border: `2px solid ${formData.sourceEnv === env ? 'var(--color-primary)' : 'var(--color-border)'}`, borderRadius: 'var(--radius-md)', cursor: 'pointer' }}>
                    <input type="radio" name="sourceEnv" value={env} checked={formData.sourceEnv === env} onChange={e => setFormData(prev => ({ ...prev, sourceEnv: e.target.value as 'live' | 'qa' | 'demo' }))} />
                    <div>
                      <div style={{ fontWeight: 600, textTransform: 'capitalize' }}>{env}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                        {env === 'live' && 'Production data — real jobs, real money'}
                        {env === 'qa' && 'Quality assurance — test with staging data'}
                        {env === 'demo' && 'Demo mode — sample data for exploration'}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {currentStep.id === 'tutorial' && (
            <div style={{ textAlign: 'center' }}>
              <Camera size={64} style={{ color: 'var(--color-primary)', marginBottom: 'var(--spacing-lg)' }} />
              <h2 style={{ margin: '0 0 var(--spacing-md)', fontSize: '1.25rem' }}>Quick Tour</h2>
              <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--spacing-lg)' }}>
                Here's how to use the key features:
              </p>
              <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--spacing-md)', padding: 'var(--spacing-md)', background: 'var(--color-surface)', borderRadius: 'var(--radius-md)' }}>
                  <Mic size={24} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontWeight: 600 }}>Voice Capture</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Tap the mic button or say "Hey Siri, log call" — records offline, transcribes when online</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--spacing-md)', padding: 'var(--spacing-md)', background: 'var(--color-surface)', borderRadius: 'var(--radius-md)' }}>
                  <Camera size={24} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontWeight: 600 }}>Document OCR</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Photo a quote, commission statement, or fit receipt — auto-detects type, extracts line items</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--spacing-md)', padding: 'var(--spacing-md)', background: 'var(--color-surface)', borderRadius: 'var(--radius-md)' }}>
                  <Shield size={24} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontWeight: 600 }}>DOR Protection</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Commission statements scanned for penalties — only fitter_error counts toward your DOR%</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--spacing-md)', padding: 'var(--spacing-md)', background: 'var(--color-surface)', borderRadius: 'var(--radius-md)' }}>
                  <Sparkles size={24} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontWeight: 600 }}>Schedule Risk</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Enter blind count → auto-calculates duration → warns if next visit too tight</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentStep.id === 'complete' && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'var(--color-success-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto var(--spacing-lg)' }}>
                <CheckCircle size={40} style={{ color: 'var(--color-success)' }} />
              </div>
              <h2 style={{ margin: '0 0 var(--spacing-md)', fontSize: '1.5rem' }}>All Set!</h2>
              <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--spacing-lg)' }}>
                Your Beelo is ready. Start by capturing a voice note or photographing a document.
              </p>
              <div style={{ textAlign: 'left', fontSize: '0.85rem', color: 'var(--color-text-muted)', lineHeight: 2, maxWidth: '300px', margin: '0 auto var(--spacing-lg)' }}>
                <div>🎤 <strong>Voice:</strong> Tap mic or use Siri/Google shortcut</div>
                <div>📷 <strong>Documents:</strong> Tap "Capture Document" from Documents tab</div>
                <div>📅 <strong>Schedule:</strong> Add visits with blind count for risk check</div>
                <div>🛡️ <strong>DOR:</strong> Photo commission statements weekly</div>
              </div>
            </div>
          )}
        </Card>

        {/* Navigation */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'var(--spacing-lg)' }}>
          <Button 
            variant={currentStepIndex === 0 ? 'ghost' : 'secondary'} 
            onClick={handleBack} 
            disabled={currentStepIndex === 0}
            leftIcon={<ChevronLeft size={16} />}
          >
            Back
          </Button>
          <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
            {currentStepIndex < STEPS.length - 1 && (
              <>
                <Button variant="ghost" onClick={handleSkip}>
                  Skip
                </Button>
                <Button variant="primary" onClick={handleNext} rightIcon={<ChevronRight size={16} />}>
                  Next
                </Button>
              </>
            )}
            {currentStepIndex === STEPS.length - 1 && (
              <Button variant="primary" onClick={handleFinish} size="lg">
                Start Using Beelo
              </Button>
            )}
          </div>
        </div>
      </div>
    </Layout>
  )
}