// AppActionsGuide - Android setup guide for Google Assistant App Actions

import { useState } from 'react'
import { Layout } from '@components/layout/Layout'
import { Card } from '@components/ui/Card'
import { Button } from '@components/ui/Button'
import { Badge } from '@components/ui/Badge'
import { Copy, Check, Settings, Mic } from 'lucide-react'
import { buildVoiceCaptureDeepLink, APP_ACTIONS_SETUP } from '@features/voice/utils/deepLinkHandler'

export function AppActionsGuide() {
  const [copied, setCopied] = useState<string | null>(null)
  const sourceEnv: 'demo' | 'qa' | 'live' = (import.meta.env.VITE_SOURCE_ENV as 'demo' | 'qa' | 'live') || 'live'
  const deepLinkUrl = buildVoiceCaptureDeepLink({ 
    trigger: 'google_assistant', 
    source_env: sourceEnv 
  })

  const handleCopy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(label)
      setTimeout(() => setCopied(null), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  return (
    <Layout title="Google Assistant Setup">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
        <Card padding="lg" style={{ textAlign: 'center' }}>
          <div style={{ 
            width: '80px', 
            height: '80px', 
            borderRadius: '50%', 
            background: 'var(--color-primary-muted)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            margin: '0 auto var(--spacing-md)'
          }}>
            <Android size={40} style={{ color: 'var(--color-primary)' }} />
          </div>
          <h2 style={{ margin: '0 0 var(--spacing-xs)', fontSize: '1.25rem' }}>Google Assistant Setup</h2>
          <p style={{ color: 'var(--color-text-muted)', margin: '0 0 var(--spacing-lg)' }}>
            Enable hands-free voice capture with "OK Google, note job on Beelo"
          </p>
          <Badge variant="info" size="md" style={{ marginBottom: 'var(--spacing-md)' }}>
            Voice command: "OK Google, note job on Beelo"
          </Badge>
        </Card>

        <Card padding="lg">
          <h3 style={{ margin: '0 0 var(--spacing-md)', fontSize: '1rem', fontWeight: 600 }}>How It Works</h3>
          <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--spacing-lg)', fontSize: '0.875rem' }}>
            Android App Actions let you launch Beelo's voice capture directly from Google Assistant.
            No separate app install needed - just enable in Assistant settings.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', padding: 'var(--spacing-sm)', background: 'var(--color-surface)', borderRadius: 'var(--radius-md)' }}>
            <Mic size={20} style={{ color: 'var(--color-primary)' }} />
            <div>
              <div style={{ fontWeight: 500 }}>Say: "OK Google, note job on Beelo"</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Launches Beelo voice capture immediately</div>
            </div>
          </div>
        </Card>

        <Card padding="lg">
          <h3 style={{ margin: '0 0 var(--spacing-md)', fontSize: '1rem', fontWeight: 600 }}>Setup Instructions</h3>
          <ol style={{ margin: 0, paddingLeft: 'var(--spacing-lg)', fontSize: '0.875rem', color: 'var(--color-text)', lineHeight: 2 }}>
            <li>Open the <strong>Google Assistant</strong> app or say "OK Google"</li>
            <li>Say <strong>"Open Assistant settings"</strong> or go to Assistant settings manually</li>
            <li>Tap <strong>"App Actions"</strong> or <strong>"Shortcuts"</strong></li>
            <li>Search for <strong>"Beelo"</strong> or <strong>"note job"</strong></li>
            <li>Tap <strong>"Add"</strong> or <strong>"Enable"</strong></li>
            <li>Set your custom phrase (default: <strong>"note job on Beelo"</strong>)</li>
          </ol>
        </Card>

        <Card padding="lg">
          <h3 style={{ margin: '0 0 var(--spacing-md)', fontSize: '1rem', fontWeight: 600 }}>Deep Link URL</h3>
          <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--spacing-sm)', fontSize: '0.875rem' }}>
            This URL is registered in the Android manifest for App Actions
          </p>
          <div style={{ 
            display: 'flex', 
            gap: 'var(--spacing-sm)', 
            marginBottom: 'var(--spacing-md)' 
          }}>
            <code style={{ 
              flex: 1, 
              padding: 'var(--spacing-sm)', 
              background: 'var(--color-bg)', 
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.75rem',
              wordBreak: 'break-all'
            }}>
              {deepLinkUrl}
            </code>
            <Button 
              variant="secondary" 
              size="sm" 
              onClick={() => handleCopy(deepLinkUrl, 'url')}
              leftIcon={copied === 'url' ? <Check size={16} /> : <Copy size={16} />}
            >
              {copied === 'url' ? 'Copied!' : 'Copy'}
            </Button>
          </div>
        </Card>

        <Card padding="lg">
          <h3 style={{ margin: '0 0 var(--spacing-md)', fontSize: '1rem', fontWeight: 600 }}>actions.xml (for developers)</h3>
          <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--spacing-sm)', fontSize: '0.8rem' }}>
            Add this to your app's <code>res/xml/actions.xml</code> if building a native wrapper
          </p>
          <pre style={{ 
            background: 'var(--color-bg)', 
            padding: 'var(--spacing-md)', 
            borderRadius: 'var(--radius-md)', 
            overflow: 'auto',
            fontSize: '0.7rem',
            lineHeight: 1.5,
            color: 'var(--color-text)'
          }}>
            {APP_ACTIONS_SETUP.actionsXml}
          </pre>
        </Card>

        <Card padding="lg" style={{ borderColor: 'var(--color-warning)', background: 'var(--color-warning-muted)' }}>
          <h3 style={{ margin: '0 0 var(--spacing-sm)', fontSize: '0.9rem', fontWeight: 600, color: '#1a1a2e' }}>
            <Settings size={18} style={{ marginRight: 'var(--spacing-xs)', verticalAlign: 'middle' }} />
            Requirements
          </h3>
          <ul style={{ margin: 0, paddingLeft: 'var(--spacing-lg)', fontSize: '0.8rem', color: '#1a1a2e', lineHeight: 1.8 }}>
            <li>Android 8.0 (API 26) or later</li>
            <li>Google Assistant enabled</li>
            <li>Beelo PWA installed (add to Home Screen)</li>
            <li>Microphone permission granted to Beelo</li>
            <li>Google App updated to latest version</li>
          </ul>
        </Card>
      </div>
    </Layout>
  )
}