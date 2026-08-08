import { describe, it, expect } from 'vitest'
import { 
  parseVoiceCaptureDeepLink, 
  buildVoiceCaptureDeepLink,
  SIRI_SHORTCUT_SETUP,
  APP_ACTIONS_SETUP 
} from './deepLinkHandler'

describe('Voice Capture Deep Link Handler', () => {
  describe('parseVoiceCaptureDeepLink', () => {
    it('parses valid Siri shortcut deep link', () => {
      const url = 'beelo://voice-capture?trigger=siri_shortcut&source_env=live'
      const result = parseVoiceCaptureDeepLink(url)
      
      expect(result).not.toBeNull()
      expect(result?.trigger).toBe('siri_shortcut')
      expect(result?.source_env).toBe('live')
      expect(result?.lead_id).toBeUndefined()
      expect(result?.appointment_id).toBeUndefined()
    })

    it('parses valid Google Assistant deep link', () => {
      const url = 'beelo://voice-capture?trigger=google_assistant&lead_id=123&source_env=demo'
      const result = parseVoiceCaptureDeepLink(url)
      
      expect(result).not.toBeNull()
      expect(result?.trigger).toBe('google_assistant')
      expect(result?.lead_id).toBe('123')
      expect(result?.source_env).toBe('demo')
    })

    it('parses manual button deep link', () => {
      const url = 'beelo://voice-capture?trigger=manual_button&appointment_id=456'
      const result = parseVoiceCaptureDeepLink(url)
      
      expect(result).not.toBeNull()
      expect(result?.trigger).toBe('manual_button')
      expect(result?.appointment_id).toBe('456')
    })

    it('rejects invalid protocol', () => {
      const url = 'https://beelo.app/voice-capture?trigger=siri_shortcut'
      const result = parseVoiceCaptureDeepLink(url)
      expect(result).toBeNull()
    })

    it('rejects invalid trigger', () => {
      const url = 'beelo://voice-capture?trigger=invalid_trigger'
      const result = parseVoiceCaptureDeepLink(url)
      expect(result).toBeNull()
    })

    it('rejects malformed URL', () => {
      const url = 'not-a-url'
      const result = parseVoiceCaptureDeepLink(url)
      expect(result).toBeNull()
    })
  })

  describe('buildVoiceCaptureDeepLink', () => {
    it('builds Siri shortcut URL', () => {
      const url = buildVoiceCaptureDeepLink({ 
        trigger: 'siri_shortcut', 
        source_env: 'live' 
      })
      expect(url).toBe('beelo://voice-capture?trigger=siri_shortcut&source_env=live')
    })

    it('builds URL with lead_id', () => {
      const url = buildVoiceCaptureDeepLink({ 
        trigger: 'siri_shortcut', 
        lead_id: '123',
        source_env: 'demo' 
      })
      expect(url).toBe('beelo://voice-capture?trigger=siri_shortcut&lead_id=123&source_env=demo')
    })

    it('builds URL with appointment_id', () => {
      const url = buildVoiceCaptureDeepLink({ 
        trigger: 'assistant_action', 
        appointment_id: '456',
        source_env: 'qa' 
      })
      expect(url).toBe('beelo://voice-capture?trigger=assistant_action&appointment_id=456&source_env=qa')
    })

    it('defaults to live environment when not specified', () => {
      const url = buildVoiceCaptureDeepLink({ 
        trigger: 'manual_button' 
      })
      expect(url).toBe('beelo://voice-capture?trigger=manual_button')
    })
  })

  describe('SIRI_SHORTCUT_SETUP', () => {
    it('has correct voice phrase', () => {
      expect(SIRI_SHORTCUT_SETUP.phrase).toBe('Hey Siri, log call')
    })

    it('generates correct URL for live env', () => {
      const url = SIRI_SHORTCUT_SETUP.url('live')
      expect(url).toContain('beelo://voice-capture')
      expect(url).toContain('trigger=siri_shortcut')
      expect(url).toContain('source_env=live')
    })
  })

  describe('APP_ACTIONS_SETUP', () => {
    it('has correct voice phrase', () => {
      expect(APP_ACTIONS_SETUP.phrase).toBe('OK Google, note job on Beelo')
    })

    it('has correct intent name', () => {
      expect(APP_ACTIONS_SETUP.intent).toBe('actions.intent.START_RECORDING')
    })

    it('actionsXml contains correct intent', () => {
      expect(APP_ACTIONS_SETUP.actionsXml).toContain('actions.intent.START_RECORDING')
      expect(APP_ACTIONS_SETUP.actionsXml).toContain('beelo://voice-capture')
    })
  })
})