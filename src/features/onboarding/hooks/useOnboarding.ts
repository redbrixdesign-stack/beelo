// useOnboarding - Onboarding flow state management

import { useState, useEffect, useCallback } from 'react'
import { db } from '@lib/dexie'
import { useAuth } from '@hooks/useAuth'
import type { OnboardingStateDexie, OnboardingStep } from '@lib/dexie'

const STEP_ORDER: OnboardingStep[] = ['welcome', 'profile', 'permissions', 'environment', 'tutorial', 'complete']

export function useOnboarding() {
  const { user } = useAuth()
  const [state, setState] = useState<OnboardingStateDexie | null>(null)
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [loading, setLoading] = useState(true)

  const advisorId = user?.id ? parseInt(user.id) : 0

  const loadState = useCallback(async () => {
    if (!advisorId) return
    setLoading(true)
    try {
      const existing = await db.onboardingState.where('advisorId').equals(advisorId).first()
      if (existing) {
        setState(existing)
        setCurrentStepIndex(STEP_ORDER.indexOf(existing.currentStep as any))
      } else {
        // Create initial state
        const now = new Date()
        await db.onboardingState.add({
          advisorId,
          currentStep: 0,
          completedSteps: [],
          skippedSteps: [],
          sourceEnv: (import.meta.env.VITE_SOURCE_ENV as any) || 'live',
          createdAt: now,
          updatedAt: now,
        })
        setCurrentStepIndex(0)
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [advisorId])

  const completeStep = useCallback(async (step: OnboardingStep, skipped = false) => {
    if (!advisorId || !state) return
    try {
      const stepIndex = STEP_ORDER.indexOf(step)
      const newCompleted = skipped ? state.skippedSteps : [...state.completedSteps, stepIndex]
      const nextIndex = Math.min(stepIndex + 1, STEP_ORDER.length - 1)

      await db.onboardingState.update(state.id!, {
        currentStep: nextIndex,
        completedSteps: newCompleted,
        skippedSteps: skipped ? [...state.skippedSteps, stepIndex] : state.skippedSteps,
        updatedAt: new Date(),
      })

      setState(prev => prev ? {
        ...prev,
        currentStep: nextIndex,
        completedSteps: newCompleted,
        skippedSteps: skipped ? [...prev.skippedSteps, stepIndex] : prev.skippedSteps,
      } : null)
      setCurrentStepIndex(nextIndex)
    } catch {
      // ignore
    }
  }, [advisorId, state])

  const goToStep = useCallback((step: OnboardingStep) => {
    const index = STEP_ORDER.indexOf(step)
    if (index >= 0 && index <= currentStepIndex + 1) {
      setCurrentStepIndex(index)
    }
  }, [currentStepIndex])

  const resetOnboarding = useCallback(async () => {
    if (!advisorId || !state) return
    try {
      await db.onboardingState.update(state.id!, {
        currentStep: 0,
        completedSteps: [],
        skippedSteps: [],
        updatedAt: new Date(),
      })
      setCurrentStepIndex(0)
      setState(prev => prev ? { ...prev, currentStep: 0, completedSteps: [], skippedSteps: [] } : null)
    } catch {
      // ignore
    }
  }, [advisorId, state])

  const isStepComplete = useCallback((step: OnboardingStep) => {
    if (!state) return false
    return state.completedSteps.includes(STEP_ORDER.indexOf(step))
  }, [state])

  const isStepSkipped = useCallback((step: OnboardingStep) => {
    if (!state) return false
    return state.skippedSteps.includes(STEP_ORDER.indexOf(step))
  }, [state])

  const canProceed = useCallback((step: OnboardingStep) => {
    const index = STEP_ORDER.indexOf(step)
    return index <= currentStepIndex
  }, [currentStepIndex])

  useEffect(() => {
    loadState()
  }, [loadState])

  return {
    state,
    currentStep: STEP_ORDER[currentStepIndex],
    currentStepIndex,
    stepOrder: STEP_ORDER,
    loading,
    completeStep,
    goToStep,
    resetOnboarding,
    isStepComplete,
    isStepSkipped,
    canProceed,
    isComplete: currentStepIndex === STEP_ORDER.length - 1,
  }
}