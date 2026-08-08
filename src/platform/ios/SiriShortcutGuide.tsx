// SiriShortcutGuide - iOS setup guide for Siri Shortcuts voice capture

import { useState } from 'react'
import { Layout } from '@components/layout/Layout'
import { Card } from '@components/ui/Card'
import { Button } from '@components/ui/Button'
import { Badge } from '@components/ui/Badge'
import { Copy, Check, ExternalLink, Mic, AlertCircle, Phone } from 'lucide-react'
import { buildVoiceCaptureDeepLink } from '@features/voice/utils/deepLinkHandler'

export function SiriShortcutGuide() {
  const [copied, setCopied] = useState<string | null>(null)
  const sourceEnv: 'demo' | 'qa' | 'live' = (import.meta.env.VITE_SOURCE_ENV as 'demo' | 'qa' | 'live') || 'live'
  const deepLinkUrl = buildVoiceCaptureDeepLink({ 
    trigger: 'siri_shortcut', 
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
    <Layout title="Siri Shortcut Setup">
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
            <Phone size={40} style={{ color: 'var(--color-primary)' }} />
          </div>
          <h2 style={{ margin: '0 0 var(--spacing-xs)', fontSize: '1.25rem' }}>Siri Shortcut Setup</h2>
          <p style={{ color: 'var(--color-text-muted)', margin: '0 0 var(--spacing-lg)' }}>
            Enable hands-free voice capture with "Hey Siri, log call"
          </p>
          <Badge variant="info" size="md" style={{ marginBottom: 'var(--spacing-md)' }}>
            Voice command: "Hey Siri, log call"
          </Badge>
        </Card>

        <Card padding="lg">
          <h3 style={{ margin: '0 0 var(--spacing-md)', fontSize: '1rem', fontWeight: 600 }}>One-tap Install</h3>
          <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--spacing-lg)', fontSize: '0.875rem' }}>
            Tap the button below on your iPhone to automatically create the shortcut
          </p>
          <Button 
            variant="primary" 
            size="lg" 
            fullWidth
            onClick={() => window.open(deepLinkUrl, '_blank')}
            leftIcon={<ExternalLink size={18} />}
          >
            Install "Log Call" Shortcut
          </Button>
          <p style={{ margin: 'var(--spacing-md) 0 0', fontSize: '0.75rem', color: 'var(--color-text-muted)', textAlign: 'center' }}>
            Opens in Shortcuts app • Requires iOS 14+
          </p>
        </Card>

        <Card padding="lg">
          <h3 style={{ margin: '0 0 var(--spacing-md)', fontSize: '1rem', fontWeight: 600 }}>Manual Setup Steps</h3>
          <ol style={{ margin: 0, paddingLeft: 'var(--spacing-lg)', fontSize: '0.875rem', color: 'var(--color-text)', lineHeight: 2 }}>
            <li>Open the <strong>Shortcuts</strong> app on your iPhone</li>
            <li>Tap <strong>+</strong> to create a new shortcut</li>
            <li>Search for <strong>"Open URL"</strong> action and add it</li>
            <li>Paste this URL: <code style={{ background: 'var(--color-bg)', padding: '2px 4px', borderRadius: '4px', fontSize: '0.75rem' }}>{deepLinkUrl}</code></li>
            <li>Tap <strong>Next</strong>, name it <strong>"Log Call"</strong></li>
            <li>Tap <strong>Done</strong></li>
            <li>Go to shortcut settings → <strong>Add to Siri</strong></li>
            <li>Record phrase: <strong>"Log Call"</strong></li>
          </ol>
        </Card>

        <Card padding="lg">
          <h3 style={{ margin: '0 0 var(--spacing-md)', fontSize: '1rem', fontWeight: 600 }}>Deep Link URL</h3>
          <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--spacing-sm)', fontSize: '0.875rem' }}>
            Copy this URL to manually create the shortcut
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
          <h3 style={{ margin: '0 0 var(--spacing-md)', fontSize: '1rem', fontWeight: 600 }}>Usage</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', padding: 'var(--spacing-sm)', background: 'var(--color-surface)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--color-primary-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Mic size={20} style={{ color: 'var(--color-primary)' }} />
              </div>
              <div>
                <div style={{ fontWeight: 500 }}>Say: "Hey Siri, log call"</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Opens Beelo and starts recording immediately</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', padding: 'var(--spacing-sm)', background: 'var(--color-surface)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--color-primary-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Mic size={20} style={{ color: 'var(--color-primary)' }} />
              </div>
              <div>
                <div style={{ fontWeight: 500 }}>Say: "Hey Siri, log call for [Lead Name]"</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Pre-fills lead info if you share from lead detail</div>
              </div>
            </div>
          </div>
        </Card>

        <Card padding="lg" style={{ borderColor: 'var(--color-warning)', background: 'var(--color-warning-muted)' }}>
          <h3 style={{ margin: '0 0 var(--spacing-sm)', fontSize: '0.9rem', fontWeight: 600, color: '#1a1a2e' }}>
            <AlertCircle size={18} style={{ marginRight: 'var(--spacing-xs)', verticalAlign: 'middle' }} />
            Requirements
          </h3>
          <ul style={{ margin: 0, paddingLeft: 'var(--spacing-lg)', fontSize: '0.8rem', color: '#1a1a2e', lineHeight: 1.8 }}>
            <li>iOS 14 or later</li>
            <li>Shortcuts app installed (pre-installed on iOS 13+)</li>
            <li>Beelo PWA installed (add to Home Screen)</li>
            <li>Microphone permission granted to Beelo</li>
          </ul>
        </Card>
      </div>
    </Layout>
  )
}