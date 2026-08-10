import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@hooks/useAuth'
import { db } from '@lib/dexie'

export function useOnboardingGuard() {
  const { advisor, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [onboardingComplete, setOnboardingComplete] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    let mounted = true

    async function checkOnboarding() {
      if (authLoading) return
      if (!advisor) {
        setChecking(false)
        return
      }

      try {
        const onboardingRecord = await db.onboardingState.where('advisorId').equals(advisor.id).first()

        const isComplete = !!onboardingRecord?.completed

        if (mounted) {
          setOnboardingComplete(isComplete)
          setChecking(false)
        }
      } catch (err) {
        console.error('Failed to check onboarding status:', err)
        if (mounted) {
          setChecking(false)
        }
      }
    }

    checkOnboarding()

    return () => {
      mounted = false
    }
  }, [advisor, authLoading])

  useEffect(() => {
    if (!checking && !onboardingComplete && advisor && location.pathname !== '/onboarding') {
      navigate('/onboarding', { replace: true })
    }
  }, [checking, onboardingComplete, advisor, location.pathname, navigate])

  return { onboardingComplete, checking }
}

export function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const { onboardingComplete, checking } = useOnboardingGuard()
  const { loading: authLoading } = useAuth()

  if (authLoading || checking) {
    return (
      <div style={{ padding: 'var(--spacing-xl)', textAlign: 'center' }}>
        Loading...
      </div>
    )
  }

  if (!onboardingComplete) {
    return null
  }

  return <>{children}</>
}