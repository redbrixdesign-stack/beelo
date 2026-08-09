// OnboardingFlow - 6-step onboarding flow

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Layout } from '@components/layout/Layout'
import { Card } from '@components/ui/Card'
import { Button } from '@components/ui/Button'
import { Input } from '@components/ui/Input'
import { Badge } from '@components/ui/Badge'
import { CheckCircle, ChevronRight, ChevronLeft, User, Shield, Bell, Camera, Mic, Database, Sparkles } from 'lucide-react'
import { useOnboarding } from '../hooks/useOnboarding'
import { useAuth } from '@hooks/useAuth'
import { useDexie } from '@hooks/useDexie'
import { enqueueSync } from '@lib/sync'
import { getDefaultSourceEnv } from '@lib/dexie'

const STEPS = [
  { id: 'welcome', label: 'Welcome', icon: Sparkles },
  { id: 'profile', label: 'Profile', icon: User },
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
    commissionRate: 15.25,
    fullJobMinutesPerBlind: 33,
    sourceEnv: 'live' as const,
  })

  useEffect(() => {
    if (onboardingState) {
      setCurrentStepIndex(STEPS.findIndex(s => s.id === onboardingState.currentStep) || 0)
    }
  }, [onboardingState])

  const handleNext = async () => {
    const currentStep = STEPS[currentStepIndex]
    
    // Save step-specific data
    if (currentStep.id === 'profile') {
      await saveProfile()
    }

    await completeStep(currentStep.id)
    const nextIndex = Math.min(currentStepIndex + 1, STEPS.length - 1)
    setCurrentStepIndex(nextIndex)
    await setStep(STEPS[nextIndex].id)
  }

  const handleBack = () => {
    const prevIndex = Math.max(currentStepIndex - 1, 0)
    setCurrentStepIndex(prevIndex)
    setStep(STEPS[prevIndex].id)
  }

  const handleSkip = async () => {
    const currentStep = STEPS[currentStepIndex]
    await skipStep(currentStep.id)
    const nextIndex = Math.min(currentStepIndex + 1, STEPS.length - 1)
    setCurrentStepIndex(nextIndex)
    await setStep(STEPS[nextIndex].id)
  }

  const saveProfile = async () => {
    if (!user || !isReady) return
    const advisorId = parseInt(user.id)
    const now = new Date()
    const sourceEnv = getDefaultSourceEnv()

    await db.advisors.update(advisorId, {
      businessName: formData.businessName,
      commissionRatePercent: formData.commissionRate,
      fullJobMinutesPerBlind: formData.fullJobMinutesPerBlind,
      sourceEnv: formData.sourceEnv,
      updatedAt: now,
    })

    await enqueueSync('advisors', advisorId, 'update', {
      business_name: formData.businessName,
      commission_rate_percent: formData.commissionRate,
      full_job_minutes_per_blind: formData.fullJobMinutesPerBlind,
      source_env: formData.sourceEnv,
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
              />
              <Input
                label="Commission Rate (%)"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={formData.commissionRate}
                onChange={e => setFormData(prev => ({ ...prev, commissionRate: parseFloat(e.target.value) || 0 }))}
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
                    <input type="radio" name="sourceEnv" value={env} checked={formData.sourceEnv === env} onChange={e => setFormData(prev => ({ ...prev, sourceEnv: e.target.value as any }))} />
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