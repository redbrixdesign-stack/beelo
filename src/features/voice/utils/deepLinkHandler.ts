// Deep-link handler for voice capture
// Handles beelo://voice-capture?trigger={source}&lead_id={optional}&appointment_id={optional}&source_env={env}

export interface VoiceCaptureDeepLinkParams {
  trigger: 'siri_shortcut' | 'google_assistant' | 'assistant_action' | 'manual_button'
  lead_id?: string
  appointment_id?: string
  source_env?: 'demo' | 'qa' | 'live'
}

export function parseVoiceCaptureDeepLink(url: string): VoiceCaptureDeepLinkParams | null {
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'beelo:' || parsed.hostname !== 'voice-capture') {
      return null
    }

    const params = parsed.searchParams
    const trigger = params.get('trigger') as VoiceCaptureDeepLinkParams['trigger']
    const lead_id = params.get('lead_id') || undefined
    const appointment_id = params.get('appointment_id') || undefined
    const source_env = (params.get('source_env') as 'demo' | 'qa' | 'live') || 'live'

    if (!trigger || !['siri_shortcut', 'google_assistant', 'assistant_action', 'manual_button'].includes(trigger)) {
      return null
    }

    return { trigger, lead_id, appointment_id, source_env }
  } catch {
    return null
  }
}

export function buildVoiceCaptureDeepLink(params: VoiceCaptureDeepLinkParams): string {
  const url = new URL('beelo://voice-capture')
  url.searchParams.set('trigger', params.trigger)
  if (params.lead_id) url.searchParams.set('lead_id', params.lead_id)
  if (params.appointment_id) url.searchParams.set('appointment_id', params.appointment_id)
  if (params.source_env) url.searchParams.set('source_env', params.source_env)
  return url.toString()
}

// iOS Siri Shortcut setup
export const SIRI_SHORTCUT_SETUP = {
  name: 'Log Call',
  phrase: 'Hey Siri, log call',
  url: (env: 'demo' | 'qa' | 'live' = 'live') => `beelo://voice-capture?trigger=siri_shortcut&source_env=${env}`,
  instructions: `
1. Open the Shortcuts app on iPhone
2. Tap "+" to create new shortcut
3. Search for "Open URL" action
4. Paste the URL above
5. Tap "Done"
6. Tap the shortcut name to rename to "Log Call"
7. Add to Siri with phrase "Log Call"
  `.trim()
}

// Android App Actions setup
export const APP_ACTIONS_SETUP = {
  name: 'Note Job',
  phrase: 'OK Google, note job on Beelo',
  intent: 'actions.intent.START_RECORDING',
  url: (env: 'demo' | 'qa' | 'live' = 'live') => `beelo://voice-capture?trigger=google_assistant&source_env=${env}`,
  actionsXml: `
<actions>
  <action intentName="actions.intent.START_RECORDING">
    <fulfillment urlTemplate="beelo://voice-capture?trigger=google_assistant&source_env=live">
      <parameter-mapping intentParameter="recording.@type" urlParameter="trigger" />
    </fulfillment>
  </action>
</actions>
  `.trim()
}