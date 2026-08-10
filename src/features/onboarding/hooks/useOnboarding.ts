// useOnboarding - Onboarding flow state management

import { useState, useEffect, useCallback } from 'react'
import { db } from '@lib/dexie'
import { useAuth } from '@hooks/useAuth'
import { enqueueSync } from '@lib/sync'
import { getDefaultSourceEnv } from '@lib/dexie'
import type { OnboardingStateDexie } from '@lib/dexie'

const STEPS = ['welcome', 'profile', 'business', 'consent', 'permissions', 'environment', 'tutorial', 'complete'] as const
type StepId = typeof STEPS[number]

interface OnboardingState {
  currentStep: StepId
  completedSteps: StepId[]
  skippedSteps: StepId[]
}

export function useOnboarding() {
  const { advisor } = useAuth()
  const [onboardingState, setOnboardingState] = useState<OnboardingState | null>(null)
  const [loading, setLoading] = useState(true)

  const advisorId = advisor?.id ?? 0

  const loadOnboardingState = useCallback(async () => {
    if (!advisorId) return
    setLoading(true)
    try {
      const record = await db.onboardingState.where('advisorId').equals(advisorId).first()
      if (record) {
        setOnboardingState({
          currentStep: record.currentStep,
          completedSteps: record.completedSteps,
          skippedSteps: record.skippedSteps,
        })
      } else {
        // First time - create initial state
        const initialState: OnboardingState = {
          currentStep: 'welcome',
          completedSteps: [],
          skippedSteps: [],
        }
        setOnboardingState(initialState)
        await saveOnboardingState(initialState)
      }
    } catch (err) {
      console.error('Failed to load onboarding state:', err)
    } finally {
      setLoading(false)
    }
  }, [advisorId])

  const saveOnboardingState = useCallback(async (state: OnboardingState) => {
    if (!advisorId) return
    const now = new Date()
    const sourceEnv = getDefaultSourceEnv()

    await db.onboardingState.put({
      advisorId,
      currentStep: state.currentStep,
      completedSteps: state.completedSteps,
      skippedSteps: state.skippedSteps,
      sourceEnv,
      updatedAt: now,
    } as OnboardingStateDexie)

    await enqueueSync('onboardingState', advisorId, 'upsert', {
      advisor_id: advisorId,
      current_step: state.currentStep,
      completed_steps: state.completedSteps,
      skipped_steps: state.skippedSteps,
      source_env: sourceEnv,
    })
  }, [advisorId])

  const setStep = useCallback(async (step: StepId) => {
    if (!onboardingState) return
    const newState = { ...onboardingState, currentStep: step }
    setOnboardingState(newState)
    await saveOnboardingState(newState)
  }, [onboardingState, saveOnboardingState])

  const completeStep = useCallback(async (step: StepId) => {
    if (!onboardingState) return
    if (!onboardingState.completedSteps.includes(step)) {
      const newState = {
        ...onboardingState,
        completedSteps: [...onboardingState.completedSteps, step],
      }
      setOnboardingState(newState)
      await saveOnboardingState(newState)
    }
  }, [onboardingState, saveOnboardingState])

  const skipStep = useCallback(async (step: StepId) => {
    if (!onboardingState) return
    if (!onboardingState.skippedSteps.includes(step)) {
      const newState = {
        ...onboardingState,
        skippedSteps: [...onboardingState.skippedSteps, step],
      }
      setOnboardingState(newState)
      await saveOnboardingState(newState)
    }
  }, [onboardingState, saveOnboardingState])

  const completeOnboarding = useCallback(async () => {
    if (!onboardingState) return
    const newState = {
      ...onboardingState,
      currentStep: 'complete' as StepId,
      completedSteps: [...onboardingState.completedSteps, 'complete'],
    }
    setOnboardingState(newState)
    await saveOnboardingState(newState)
  }, [onboardingState, saveOnboardingState])

  useEffect(() => {
    loadOnboardingState()
  }, [loadOnboardingState])

  return {
    onboardingState,
    loading,
    setStep,
    completeStep,
    skipStep,
    completeOnboarding,
  }
}