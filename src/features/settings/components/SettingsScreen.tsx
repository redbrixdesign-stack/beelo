// SettingsScreen - Main settings screen

import { useState } from 'react'
import { Layout } from '@components/layout/Layout'
import { Card } from '@components/ui/Card'
import { Button } from '@components/ui/Button'
import { Badge } from '@components/ui/Badge'
import { Settings, PoundSign, Shield, Bell, Palette, Database, RotateCcw, Info } from 'lucide-react'
import { HMRCRatesConfig } from './HMRCRatesConfig'
import { BackupRestore } from './BackupRestore'
import { useSettings } from '../hooks/useSettings'

const SETTINGS_SECTIONS = [
  { id: 'hmrc', label: 'HMRC Rates', icon: PoundSign, component: HMRCRatesConfig },
  { id: 'backup', label: 'Backup & Restore', icon: RotateCcw, component: BackupRestore },
  { id: 'about', label: 'About', icon: Info, component: null },
] as const

export function SettingsScreen() {
  const { settings, loading } = useSettings()
  const [activeSection, setActiveSection] = useState<'hmrc' | 'backup' | 'about'>('hmrc')

  if (loading) {
    return <Layout title="Settings"><div style={{ padding: 'var(--spacing-xl)', textAlign: 'center' }}>Loading...</div></Layout>
  }

  return (
    <Layout title="Settings">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
        <Card padding="lg">
          <h3 style={{ margin: '0 0 var(--spacing-md)', fontSize: '1rem', fontWeight: 600 }}>Environment</h3>
          <Badge variant={settings.sourceEnv === 'live' ? 'success' : settings.sourceEnv === 'qa' ? 'warning' : 'info'} size="md">
            {settings.sourceEnv.toUpperCase()}
          </Badge>
          <p style={{ margin: 'var(--spacing-md) 0 0', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
            Current environment. Change via build configuration.
          </p>
        </Card>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
          {SETTINGS_SECTIONS.map(section => (
            <Card key={section.id} padding="md" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Button 
                variant={activeSection === section.id ? 'primary' : 'ghost'} 
                onClick={() => setActiveSection(section.id as any)}
                leftIcon={<section.icon size={18} />}
                fullWidth
                style={{ justifyContent: 'flex-start' }}
              >
                {section.label}
              </Button>
            </Card>
          ))}
        </div>

        {activeSection === 'hmrc' && <HMRCRatesConfig />}
        {activeSection === 'backup' && <BackupRestore />}
        {activeSection === 'about' && (
          <Card padding="lg">
            <h3 style={{ margin: '0 0 var(--spacing-md)', fontSize: '1rem', fontWeight: 600 }}>About Beelo</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
              <div><strong>Version:</strong> 1.0.0 (Phase 5)</div>
              <div><strong>Build:</strong> PWA with offline-first architecture</div>
              <div><strong>Stack:</strong> React 18, TypeScript, Vite, Dexie, Supabase</div>
              <div><strong>Environment:</strong> {settings.sourceEnv.toUpperCase()}</div>
            </div>
          </Card>
        )}
      </div>
    </Layout>
  )
}