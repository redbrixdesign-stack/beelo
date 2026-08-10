import { describe, it, expect } from 'vitest'
import { formatDuration } from './utils'

describe('Utility Functions', () => {
  describe('formatDuration', () => {
    it('formats seconds only', () => {
      expect(formatDuration(0)).toBe('0s')
      expect(formatDuration(30)).toBe('30s')
      expect(formatDuration(59)).toBe('59s')
    })

    it('formats minutes and seconds', () => {
      expect(formatDuration(60)).toBe('1m')
      expect(formatDuration(61)).toBe('1m 1s')
      expect(formatDuration(90)).toBe('1m 30s')
      expect(formatDuration(119)).toBe('1m 59s')
      expect(formatDuration(120)).toBe('2m')
      expect(formatDuration(3599)).toBe('59m 59s')
    })

    it('formats hours and minutes', () => {
      expect(formatDuration(3600)).toBe('1h')
      expect(formatDuration(3660)).toBe('1h 1m')
      expect(formatDuration(3720)).toBe('1h 2m')
      expect(formatDuration(7200)).toBe('2h')
      expect(formatDuration(7260)).toBe('2h 1m')
    })

    it('formats hours, minutes, and seconds (seconds truncated)', () => {
      expect(formatDuration(3661)).toBe('1h 1m')
      expect(formatDuration(7321)).toBe('2h 2m')
    })

    it('handles decimal seconds (truncates)', () => {
      expect(formatDuration(59.9)).toBe('59.9s')
      expect(formatDuration(60.1)).toContain('1m')
    })
  })
})