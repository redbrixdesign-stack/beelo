// Manual matcher component
// Allows user to manually match VoiceNote to Visit or Customer

import { useState, useEffect, useCallback } from 'react'
import { Search, ChevronRight, Calendar, Users } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useDexie } from '@hooks/useDexie'
import { useAuth } from '@hooks/useAuth'
import { useToast } from '@components/ui/Toast'
import { enqueueSync } from '@lib/sync'
import { Card } from '@components/ui/Card'
import { Input } from '@components/ui/Input'
import { Select } from '@components/ui/Select'
import { Button } from '@components/ui/Button'
import { Badge } from '@components/ui/Badge'
import { OUTCOME_TAXONOMY, APPOINTMENT_TYPES, type AppointmentType, type OutcomeTaxonomy } from '@lib/constants'

interface ManualMatchCardProps {
  icon: React.ReactNode
  title: string
  subtitle: string
  badges?: { label: string; variant: 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info' }[]
  onSelect: () => void
}

function ManualMatchCard({ icon, title, subtitle, badges = [], onSelect }: ManualMatchCardProps) {
  return (
    <div
      onClick={onSelect}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--spacing-sm)',
        padding: 'var(--spacing-sm)',
        background: 'var(--color-bg)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--color-border)',
        cursor: 'pointer',
        transition: 'all var(--transition-fast)'
      }}
    >
      <div style={{ 
        width: '32px', 
        height: '32px', 
        borderRadius: '50%', 
        background: 'var(--color-primary-muted)',
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        color: 'var(--color-primary)'
      }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 500, fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {title}
        </div>
        <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
          {subtitle}
        </div>
      </div>
      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
        {badges.map((badge, i) => (
          <Badge key={i} variant={badge.variant} size="sm">
            {badge.label}
          </Badge>
        ))}
      </div>
      <ChevronRight size={20} style={{ color: 'var(--color-text-muted)' }} />
    </div>
  )
}

interface ManualMatcherProps {
  voiceNote: any
  onMatch: (visitId: number, matchMethod: 'screenshot_proximity' | 'manual_review' | 'name_hint') => Promise<void>
  onSkip: () => void
}

export function ManualMatcher({ voiceNote, onMatch, onSkip }: ManualMatcherProps) {
  const { db, isReady } = useDexie()
  const { advisor } = useAuth()
  const { showToast } = useToast()
  const [visits, setVisits] = useState<any[]>([])
  const [customers, setCustomers] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState<'visits' | 'customers'>('visits')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!isReady || !advisor) return
    loadData()
  }, [isReady, advisor])

  const loadData = async () => {
    if (!advisor) return
    setLoading(true)
    try {
      const [visitData, customerData] = await Promise.all([
        db.visits.where('advisorId').equals(advisor.id!).sortBy('dateTime'),
        db.customers.where('advisorId').equals(advisor.id!).sortBy('createdAt')
      ])
      setVisits(visitData.reverse())
      setCustomers(customerData.reverse())
    } catch (err) {
      console.error('Failed to load manual match data:', err)
    } finally {
      setLoading(false)
    }
  }

  const filteredVisits = visits.filter(v =>
    v.jobCode.toLowerCase().includes(search.toLowerCase()) ||
    v.customerNumber.toLowerCase().includes(search.toLowerCase()) ||
    v.address?.toLowerCase().includes(search.toLowerCase())
  )

  const filteredCustomers = customers.filter(c =>
    c.displayName?.toLowerCase().includes(search.toLowerCase()) ||
    c.customerNumber.toLowerCase().includes(search.toLowerCase()) ||
    c.phone?.includes(search) ||
    c.postcode?.toLowerCase().includes(search.toLowerCase())
  )

  const getVisitBadges = (visit: any) => {
    const badges: { label: string; variant: 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info' }[] = []
    if (visit.appointmentType) {
      badges.push({ label: visit.appointmentType, variant: 'info' })
    }
    if (visit.outcome) {
      badges.push({
        label: visit.outcome,
        variant: ['Ordered', 'Quoted'].includes(visit.outcome) ? 'success' : 'warning'
      })
    }
    return badges
  }

  const handleVisitMatch = async (visitId: number, matchMethod: 'screenshot_proximity' | 'manual_review' | 'name_hint') => {
    await onMatch(visitId, matchMethod)
  }

  const handleCustomerMatch = async (customer: any) => {
    window.location.href = `/customers/${customer.id}`
  }

  if (!isReady) {
    return <div style={{ padding: 'var(--spacing-xl)', textAlign: 'center' }}>Loading...</div>
  }

  const customerItems = filteredCustomers.map(customer => (
    <ManualMatchCard
      key={customer.id}
      icon={<Users size={16} />}
      title={customer.displayName || 'Unnamed Customer'}
      subtitle={`#${customer.customerNumber}${customer.phone ? ` • ${customer.phone}` : ''}`}
      onSelect={() => handleCustomerMatch(customer)}
    />
  ))

  const visitItems = filteredVisits.map(visit => {
    const badges: { label: string; variant: 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info' }[] = []
    if (visit.appointmentType) {
      badges.push({ label: visit.appointmentType, variant: 'info' })
    }
    if (visit.outcome) {
      badges.push({
        label: visit.outcome,
        variant: ['Ordered', 'Quoted'].includes(visit.outcome) ? 'success' : 'warning'
      })
    }
    return (
      <ManualMatchCard
        key={visit.id}
        icon={<Calendar size={16} />}
        title={`${visit.jobCode} • ${visit.customerNumber}`}
        subtitle={new Date(visit.dateTime).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
        badges={badges}
        onSelect={() => onMatch(parseInt(visit.id), 'manual_review')}
      />
    )
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>Manual Match</h1>
      </div>

      <Input
        placeholder="Search..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        leftIcon={<Search size={20} />}
        fullWidth
        style={{ maxWidth: '360px' }}
      />

      <div style={{ display: 'flex', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-md)' }}>
        <button
          onClick={() => setTab('visits')}
          style={{
            flex: 1,
            padding: 'var(--spacing-xs) var(--spacing-sm)',
            background: tab === 'visits' ? 'var(--color-primary-muted)' : 'transparent',
            border: 'none',
            borderBottom: tab === 'visits' ? '2px solid var(--color-primary)' : '2px solid transparent',
            color: tab === 'visits' ? 'var(--color-primary)' : 'var(--color-text-muted)',
            fontSize: '0.8rem',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px'
          }}
        >
          <Calendar size={16} /> Visits ({filteredVisits.length})
        </button>
        <button
          onClick={() => setTab('customers')}
          style={{
            flex: 1,
            padding: 'var(--spacing-xs) var(--spacing-sm)',
            background: tab === 'customers' ? 'var(--color-primary-muted)' : 'transparent',
            border: 'none',
            borderBottom: tab === 'customers' ? '2px solid var(--color-primary)' : '2px solid transparent',
            color: tab === 'customers' ? 'var(--color-primary)' : 'var(--color-text-muted)',
            fontSize: '0.8rem',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px'
          }}
        >
          <Users size={16} /> Customers ({filteredCustomers.length})
        </button>
      </div>

      {tab === 'visits' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
          {visitItems.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: 'var(--spacing-lg)' }}>
              No visits match your search
            </div>
          ) : (
            visitItems
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
          {customerItems.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: 'var(--spacing-lg)' }}>
              No customers match your search
            </div>
          ) : (
            customerItems
          )}
        </div>
      )}

      <Button variant="ghost" size="sm" onClick={onSkip} style={{ marginTop: 'var(--spacing-md)', width: '100%' }}>
        Skip to name-hint matching
      </Button>
    </div>
  )
}