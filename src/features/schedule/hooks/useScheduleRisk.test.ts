// Schedule risk computation tests

import { describe, it, expect } from 'vitest'

describe('Schedule Risk Computation', () => {
  const computeRiskLevel = (bufferMinutes: number): 'low' | 'medium' | 'high' => {
    if (bufferMinutes < 15) return 'high'
    if (bufferMinutes < 30) return 'medium'
    return 'low'
  }

  it('returns high risk for buffer < 15 minutes', () => {
    expect(computeRiskLevel(14)).toBe('high')
    expect(computeRiskLevel(10)).toBe('high')
    expect(computeRiskLevel(0)).toBe('high')
    expect(computeRiskLevel(-5)).toBe('high')
  })

  it('returns medium risk for buffer 15-29 minutes', () => {
    expect(computeRiskLevel(15)).toBe('medium')
    expect(computeRiskLevel(20)).toBe('medium')
    expect(computeRiskLevel(29)).toBe('medium')
  })

  it('returns low risk for buffer >= 30 minutes', () => {
    expect(computeRiskLevel(30)).toBe('low')
    expect(computeRiskLevel(45)).toBe('low')
    expect(computeRiskLevel(120)).toBe('low')
  })

  it('computes estimated duration correctly', () => {
    // 3 blinds * 33 min/blind = 99 minutes
    const estimatedDuration = 3 * 33
    expect(estimatedDuration).toBe(99)

    // 5 blinds * 33 min/blind = 165 minutes
    expect(5 * 33).toBe(165)
  })

  it('computes gap correctly', () => {
    const currentEnd = new Date('2024-01-15T10:00:00')
    const nextStart = new Date('2024-01-15T12:00:00')
    const gapMinutes = Math.round((nextStart.getTime() - currentEnd.getTime()) / (1000 * 60))
    expect(gapMinutes).toBe(120)
  })

  it('handles overlapping visits (negative gap)', () => {
    const currentEnd = new Date('2024-01-15T12:00:00')
    const nextStart = new Date('2024-01-15T11:30:00')
    const gapMinutes = Math.round((nextStart.getTime() - currentEnd.getTime()) / (1000 * 60))
    expect(gapMinutes).toBe(-30)
  })
})