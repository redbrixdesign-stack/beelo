// SettingsScreen - Main settings screen with tabs

import { useState } from 'react'
import { Layout } from '@components/layout/Layout'
import { Card } from '@components/ui/Card'
import { Button } from '@components/ui/Button'
import { Badge } from '@components/ui/Badge'
import { Settings, PoundSterling, Shield, Bell, Palette, Database, RotateCcw, Info, User, Car, Sparkles, Download, Database } from 'lucide-react'
import { HMRCRatesConfig } from './HMRCRatesConfig'
import { BackupRestore } from './BackupRestore'
import { ExportData } from './ExportData'
import { useSettings } from '../hooks/useSettings'

const SETTINGS_SECTIONS = [
  { id: 'profile', label: 'Profile', icon: User, component: null },
  { id: 'hmrc', label: 'HMRC Rates', icon: PoundSterling, component: HMRCRatesConfig },
  { id: 'backup', label: 'Backup & Restore', icon: RotateCcw, component: BackupRestore },
  { id: 'export', label: 'Export Data', icon: Download, component: ExportData },
  { id: 'notifications', label: 'Notifications', icon: Bell, component: null },
  { id: 'appearance', label: 'Appearance', icon: Palette, component: null },
  { id: 'data', label: 'Data & Sync', icon: Database, component: null },
  { id: 'about', label: 'About', icon: Info, component: null },
] as const

export function SettingsScreen() {
  const { settings, loading } = useSettings()
  const [activeSection, setActiveSection] = useState<'profile' | 'hmrc' | 'backup' | 'notifications' | 'appearance' | 'data' | 'about'>('profile')

  if (loading) {
    return <Layout title="Settings"><div style={{ padding: 'var(--spacing-xl)', textAlign: 'center' }}>Loading...</div></Layout>
  }

  const ActiveComponent = SETTINGS_SECTIONS.find(s => s.id === activeSection)?.component

  return (
    <Layout title="Settings">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
        {/* Profile Header */}
        <Card padding="lg">
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
            <div style={{ 
              width: '56px', height: '56px', borderRadius: '50%', 
              background: 'var(--color-primary-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <User size={28} style={{ color: 'var(--color-primary)' }} />
            </div>
            <div style={{ flex: 1 }}>
              <h2 style={{ margin: '0 0 var(--spacing-xs)', fontSize: '1.125rem', fontWeight: 600 }}>
                {settings.businessName || 'Your Business'}
              </h2>
              <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                {settings.commissionRatePercent}% commission • {settings.fullJobMinutesPerBlind} min/blind
              </div>
            </div>
            <Badge variant="info" size="sm" style={{ textTransform: 'uppercase' }}>
              {settings.sourceEnv}
            </Badge>
          </div>
        </Card>

        {/* Section List */}
        <Card padding="md">
          <h3 style={{ margin: '0 0 var(--spacing-md)', fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>
            Settings
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)' }}>
            {SETTINGS_SECTIONS.map(section => (
              <Button
                key={section.id}
                variant={activeSection === section.id ? 'primary' : 'ghost'}
                onClick={() => setActiveSection(section.id as any)}
                style={{ 
                  justifyContent: 'flex-start', 
                  gap: 'var(--spacing-md)',
                  borderRadius: 'var(--radius-md)',
                }}
                leftIcon={<section.icon size={18} />}
              >
                {section.label}
                {section.component && <Badge variant="info" size="xs">Configure</Badge>}
              </Button>
            ))}
          </div>
        </Card>

        {/* Active Section Content */}
        {ActiveComponent && <ActiveComponent />}

        {/* Placeholder for non-implemented sections */}
        {!ActiveComponent && activeSection !== 'profile' && !['hmrc', 'backup'].includes(activeSection) && (
          <Card padding="xl" style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>
            <Settings size={48} style={{ marginBottom: 'var(--spacing-md)', opacity: 0.5 }} />
            <h3 style={{ margin: '0 0 var(--spacing-sm)' }}>{SETTINGS_SECTIONS.find(s => s.id === activeSection)?.label}</h3>
            <p>Coming in a future update</p>
          </Card>
        )}

        {/* Environment Badge */}
        <Card padding="md" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--spacing-md)', flexWrap: 'wrap', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
            <Badge variant={settings.sourceEnv === 'live' ? 'success' : settings.sourceEnv === 'qa' ? 'warning' : 'info'} size="sm">
              Environment: {settings.sourceEnv.toUpperCase()}
            </Badge>
            <Badge variant="default" size="sm">
              v1.0.0
            </Badge>
          </div>
        </Card>
      </div>
    </Layout>
  )
}