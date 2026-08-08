// LeadList - List component for leads

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Phone, Clock, Filter } from 'lucide-react'
import { Card } from '@components/ui/Card'
import { Badge } from '@components/ui/Badge'
import { Button } from '@components/ui/Button'
import { Input } from '@components/ui/Input'
import { Select } from '@components/ui/Select'
import { useLeads } from '../hooks/useLeads'
import { LEAD_SOURCES, LEAD_STATUSES, LeadStatus, LeadSource } from '@lib/constants'

export function LeadList() {
  const navigate = useNavigate()
  const { leads, loading, loadLeads, callAttempts, loadCallAttempts } = useLeads()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<LeadStatus | 'all'>('all')
  const [sourceFilter, setSourceFilter] = useState<LeadSource | 'all'>('all')

  const filteredLeads = leads.filter(lead => {
    const matchesSearch = !search || 
      lead.name?.toLowerCase().includes(search.toLowerCase()) ||
      lead.phone?.includes(search)
    const matchesStatus = statusFilter === 'all' || lead.status === statusFilter
    const matchesSource = sourceFilter === 'all' || lead.source === sourceFilter
    return matchesSearch && matchesStatus && matchesSource
  })

  const getStatusBadge = (status: LeadStatus) => {
    const variants: Record<LeadStatus, 'success' | 'warning' | 'info' | 'default' | 'error'> = {
      new: 'info',
      call_attempted: 'warning',
      connected: 'success',
      no_response: 'warning',
      follow_up_due: 'warning',
      converted_to_visit: 'success',
      lost: 'error',
    }
    const labels: Record<LeadStatus, string> = {
      new: 'New',
      call_attempted: 'Called',
      connected: 'Connected',
      no_response: 'No Response',
      follow_up_due: 'Follow Up',
      converted_to_visit: 'Converted',
      lost: 'Lost',
    }
    return <Badge variant={variants[status]} size="sm">{labels[status]}</Badge>
  }

  const getSourceBadge = (source?: LeadSource) => {
    if (!source) return null
    return <Badge variant="default" size="sm">{source}</Badge>
  }

  const getLastCallOutcome = (leadId: number) => {
    const calls = callAttempts.filter(c => c.leadId === leadId)
    if (calls.length === 0) return null
    const latest = calls[0]
    const variants: Record<string, 'success' | 'warning' | 'info' | 'default' | 'error'> = {
      connected: 'success',
      no_answer: 'warning',
      voicemail: 'info',
    }
    return <Badge variant={variants[latest.outcome] || 'default'} size="sm">{latest.outcome.replace('_', ' ')}</Badge>
  }

  const handleLeadClick = (lead: LeadDexie) => {
    navigate(`/leads/${lead.id}`)
  }

  if (loading) {
    return <div style={{ padding: 'var(--spacing-xl)', textAlign: 'center' }}>Loading...</div>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 600 }}>Leads</h1>
        <Button onClick={() => navigate('/leads/new')} leftIcon={<Plus size={18} />}>
          Add Lead
        </Button>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-md)' }}>
        <Input
          placeholder="Search name or phone..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          leftIcon={<Filter size={18} />}
          style={{ flex: 1, minWidth: '200px' }}
        />
        <Select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as LeadStatus | 'all')}
          options={['all', ...LEAD_STATUSES].map(s => ({ value: s, label: s === 'all' ? 'All Status' : s.replace(/_/g, ' ') }))}
          style={{ minWidth: '150px' }}
        />
        <Select
          value={sourceFilter}
          onChange={e => setSourceFilter(e.target.value as LeadSource | 'all')}
          options={['all', ...LEAD_SOURCES].map(s => ({ value: s, label: s === 'all' ? 'All Sources' : s }))}
          style={{ minWidth: '150px' }}
        />
      </div>

      {filteredLeads.length === 0 ? (
        <Card padding="xl" style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>
          {leads.length === 0 ? 'No leads yet. Tap "Add Lead" to create one.' : 'No leads match your filters.'}
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
          {filteredLeads.map(lead => (
            <Card
              key={lead.id}
              onClick={() => handleLeadClick(lead)}
              hoverable
              padding="md"
              style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 'var(--spacing-md)' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', flexWrap: 'wrap' }}>
                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {lead.name || 'Unnamed Lead'}
                    </h3>
                    {getStatusBadge(lead.status)}
                    {getSourceBadge(lead.source)}
                  </div>
                  {lead.phone && (
                    <div style={{ marginTop: 'var(--spacing-xs)', display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                      <Phone size={16} /> {lead.phone}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 'var(--spacing-xs)' }}>
                  {getLastCallOutcome(lead.id!)}
                  <ChevronRight size={20} style={{ color: 'var(--color-text-muted)' }} />
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>
                <Clock size={12} /> Added {new Date(lead.landedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                {lead.contactAttemptsCount > 0 && (
                  <>
                    <span>•</span>
                    <Clock size={12} /> {lead.contactAttemptsCount} call{lead.contactAttemptsCount > 1 ? 's' : ''}
                  </>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

import type { LeadDexie } from '@lib/dexie'