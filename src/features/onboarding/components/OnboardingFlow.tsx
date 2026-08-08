// OnboardingFlow - Multi-step onboarding flow

import { useState } from 'react'
import { Layout } from '@components/layout/Layout'
import { Card } from '@components/ui/Card'
import { Button } from '@components/ui/Button'
import { Input } from '@components/ui/Input'
import { Select } from '@components/ui/Select'
import { CheckCircle, ChevronRight, ChevronLeft, User, Shield, Mic, Camera, MapPin, CheckCircle2, AlertCircle } from 'lucide-react'
import { useOnboarding } from '../hooks/useOnboarding'
import { ONBOARDING_STEPS, OnboardingStep } from '@lib/constants'

const STEP_CONFIG: Record<OnboardingStep, { title: string; description: string; icon: any }> = {
  welcome: { title: 'Welcome to Beelo', description: 'Your hands-free operational memory for blinds advisors', icon: CheckCircle2 },
  profile: { title: 'Your Profile', description: 'Set up your advisor details and commission settings', icon: User },
  permissions: { title: 'Permissions', description: 'Enable microphone and camera for voice/photo capture', icon: Shield },
  environment: { title: 'Environment', description: 'Select your environment (Demo/QA/Live)', icon: AlertCircle },
  tutorial: { title: 'Quick Tutorial', description: 'Learn the key gestures and voice commands', icon: CheckCircle2 },
  complete: { title: 'All Set!', description: 'You\'re ready to start capturing jobs hands-free', icon: CheckCircle2 },
}

const STEP_ORDER: OnboardingStep[] = ['welcome', 'profile', 'permissions', 'environment', 'tutorial', 'complete']

export function OnboardingFlow() {
  const { 
    currentStep, 
    currentStepIndex, 
    stepOrder, 
    completeStep, 
    goToStep, 
    resetOnboarding, 
    isComplete,
    canProceed 
  } = useOnboarding()

  const config = STEP_CONFIG[currentStep]

  if (isComplete) {
    return (
      <Layout title="Onboarding Complete">
        <Card padding="xl" style={{ textAlign: 'center', maxWidth: '400px', margin: 'var(--spacing-xl) auto' }}>
          <div style={{ 
            width: '80px', 
            height: '80px', 
            borderRadius: '50%', 
            background: 'var(--color-success)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            color: 'white',
            margin: '0 auto var(--spacing-lg)'
          }}>
            <CheckCircle2 size={40} />
          </div>
          <h2 style={{ margin: '0 0 var(--spacing-sm)', fontSize: '1.5rem' }}>You're all set!</h2>
          <p style={{ margin: '0 0 var(--spacing-lg)', color: 'var(--color-text-muted)' }}>
            Beelo is ready to help you capture jobs hands-free.
          </p>
          <Button variant="primary" size="lg" onClick={() => window.location.href = '/'} fullWidth>
            Go to Dashboard
          </Button>
        </Card>
      </Layout>
    )
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 'welcome':
        return (
          <div style={{ textAlign: 'center' }}>
            <div style={{ 
              width: '100px', 
              height: '100px', 
              borderRadius: '50%', 
              background: 'var(--color-primary-muted)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              color: 'var(--color-primary)',
              margin: '0 auto var(--spacing-lg)'
            }}>
              <CheckCircle2 size={48} />
            </div>
            <h3 style={{ margin: '0 0 var(--spacing-sm)', fontSize: '1.25rem' }}>Welcome to Beelo</h3>
            <p style={{ margin: '0 0 var(--spacing-lg)', color: 'var(--color-text-muted)' }}>
              Your hands-free operational memory for blinds advisors. 
              Capture jobs, protect your pay, protect your schedule — all hands-free.
            </p>
            <div style={{ textAlign: 'left', fontSize: '0.85rem', color: 'var(--color-text-muted)', lineHeight: 2 }}>
              <div>✓ Voice capture via Siri/Google Assistant</div>
              <div>✓ OCR for quotes, receipts, commission statements</div>
              <div>✓ DOR detection & schedule risk warnings</div>
              <div>✓ Offline-first, works on-site</div>
            </div>
          </div>
        )

      case 'profile':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
            <Input
              label="Business Name"
              placeholder="e.g. John's Blinds"
              autoFocus
            />
            <Input
              label="Base Location"
              placeholder="e.g. Manchester, UK"
            />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)' }}>
              <Input
                label="Commission Rate (%)"
                type="number"
                step="0.01"
                placeholder="15.25"
              />
              <Input
                label="VAT Adjustment (%)"
                type="number"
                step="0.1"
                placeholder="20"
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)' }}>
              <Input
                label="Install Only (min/blind)"
                type="number"
                placeholder="17"
              />
              <Input
                label="Full Job (min/blind)"
                type="number"
                placeholder="33"
              />
            </div>
          </div>
        )

      case 'permissions':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)', padding: 'var(--spacing-md)', background: 'var(--color-primary-muted)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', flexShrink: 0 }}>
                <Mic size={24} />
              </div>
              <div>
                <strong>Microphone</strong>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Required for voice capture</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)', padding: 'var(--spacing-md)', background: 'var(--color-primary-muted)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', flexShrink: 0 }}>
                <Camera size={24} />
              </div>
              <div>
                <strong>Camera</strong>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Required for document/photo capture</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)', padding: 'var(--spacing-md)', background: 'var(--color-primary-muted)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', flexShrink: 0 }}>
                <MapPin size={24} />
              </div>
              <div>
                <strong>Location</strong>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Required for mileage tracking</div>
              </div>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
              You can change these in device settings later. All data stays on your device until synced.
            </p>
          </div>
        )

      case 'environment':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
            <p style={{ color: 'var(--color-text-muted)' }}>Select your environment. This affects which backend you sync with.</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--spacing-md)' }}>
              <button style={{ padding: 'var(--spacing-md)', border: '2px solid var(--color-border)', borderRadius: 'var(--radius-md)', background: 'var(--color-surface)', cursor: 'pointer' }}>
                <div style={{ fontWeight: 600 }}>Demo</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Development testing</div>
              </button>
              <button style={{ padding: 'var(--spacing-md)', border: '2px solid var(--color-warning)', borderRadius: 'var(--radius-md)', background: 'var(--color-warning-muted)', cursor: 'pointer' }}>
                <div style={{ fontWeight: 600 }}>QA</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Quality assurance</div>
              </button>
              <button style={{ padding: 'var(--spacing-md)', border: '2px solid var(--color-success)', borderRadius: 'var(--radius-md)', background: 'var(--color-success-muted)', cursor: 'pointer' }}>
                <div style={{ fontWeight: 600 }}>Live</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Production</div>
              </button>
            </div>
          </div>
        )

      case 'tutorial':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)', padding: 'var(--spacing-md)', background: 'var(--color-primary-muted)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', flexShrink: 0 }}>
                <Mic size={24} />
              </div>
              <div>
                <strong>"Hey Siri, log call"</strong>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Opens voice capture instantly</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)', padding: 'var(--spacing-md)', background: 'var(--color-primary-muted)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', flexShrink: 0 }}>
                <Camera size={24} />
              </div>
              <div>
                <strong>Tap camera for documents</strong>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Quotes, receipts, delivery notes</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)', padding: 'var(--spacing-md)', background: 'var(--color-primary-muted)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', flexShrink: 0 }}>
                <Mic size={24} />
              </div>
              <div>
                <strong>Downtime batch review</strong>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Match voice notes during gaps</div>
              </div>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
              All actions work offline. Data syncs automatically when you're back online.
            </p>
          </div>
        )

      case 'complete':
        return (
          <div style={{ textAlign: 'center' }}>
            <div style={{ 
              width: '80px', 
              height: '80px', 
              borderRadius: '50%', 
              background: 'var(--color-success)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              color: 'white',
              margin: '0 auto var(--spacing-lg)'
            }}>
              <CheckCircle2 size={40} />
            </div>
            <h3 style={{ margin: '0 0 var(--spacing-sm)', fontSize: '1.25rem' }}>You're ready!</h3>
            <p style={{ margin: '0 0 var(--spacing-lg)', color: 'var(--color-text-muted)' }}>
              Beelo is configured and ready to help you on-site.
            </p>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <Layout title={config.title}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
        {/* Progress indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-md)' }}>
          {stepOrder.map((step, index) => (
            <div key={step} style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', flex: 1 }}>
              <div style={{ 
                width: index === currentStepIndex ? '24px' : '20px', 
                height: index === currentStepIndex ? '24px' : '20px', 
                borderRadius: '50%', 
                background: index <= currentStepIndex ? 'var(--color-primary)' : 'var(--color-border)',
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                color: index <= currentStepIndex ? 'white' : 'transparent',
                transition: 'all var(--transition-normal)'
              }}>
                {index < currentStepIndex && <CheckCircle2 size={12} />}
                {index === currentStepIndex && <span style={{ fontSize: '0.7rem', fontWeight: 600 }}>{index + 1}</span>}
                {index > currentStepIndex && <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>{index + 1}</span>}
              </div>
              {index < stepOrder.length - 1 && <div style={{ flex: 1, height: '2px', background: index < currentStepIndex ? 'var(--color-primary)' : 'var(--color-border)' }} />}
            ))}
          </div>

          <Card padding="lg" style={{ flex: 1 }}>
            <div style={{ marginBottom: 'var(--spacing-lg)' }}>
              <h2 style={{ margin: '0 0 var(--spacing-xs)', fontSize: '1.25rem', fontWeight: 600 }}>{config.title}</h2>
              <p style={{ margin: 0, color: 'var(--color-text-muted)' }}>{config.description}</p>
            </div>

            {renderStepContent()}

            <div style={{ display: 'flex', gap: 'var(--spacing-sm)', marginTop: 'var(--spacing-lg)', paddingTop: 'var(--spacing-md)', borderTop: '1px solid var(--color-border)' }}>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => goToStep(stepOrder[currentStepIndex - 1])}
                disabled={currentStepIndex === 0}
                leftIcon={<ChevronLeft size={16} />}
              >
                Back
              </Button>
              <div style={{ flex: 1 }} />
              <Button 
                variant={currentStep === 'complete' ? 'primary' : 'primary'} 
                size="sm" 
                onClick={() => currentStep !== 'complete' ? completeStep(stepOrder[currentStepIndex]) : window.location.href = '/'}
                rightIcon={<ChevronRight size={16} />}
              >
                {currentStep === 'complete' ? 'Get Started' : currentStep === 'welcome' ? 'Get Started' : 'Continue'}
              </Button>
            </div>
          </Card>
        </div>
      </Layout>
    )
  )
}