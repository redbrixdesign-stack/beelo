import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock IndexedDB for Dexie tests
const mockIDB = {
  open: vi.fn(),
  deleteDatabase: vi.fn(),
  databases: vi.fn()
}

Object.defineProperty(globalThis, 'indexedDB', {
  value: mockIDB,
  writable: true
})

// Mock navigator.onLine
Object.defineProperty(navigator, 'onLine', {
  value: true,
  writable: true
})

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn()
  })),
  writable: true
})

// Suppress console.error in tests (optional)
const originalError = console.error
console.error = (...args) => {
  if (args[0]?.includes?.('Warning: ReactDOM.render is no longer supported')) return
  originalError.apply(console, args)
}