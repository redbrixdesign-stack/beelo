// ScheduleSuggestionList - List component for schedule suggestions

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle, ChevronRight, Filter, AlertCircle as AlertCircleIcon } from 'lucide-react'
import { Card } from '@components/ui/Card'
import { Badge } from '@components/ui/Badge'
import { Button } from '@components/ui/Button'
import { Input } from '@components/ui/Input'
import { Select } from '@components/ui/Select'
import { useScheduleSuggestions } from '../hooks/useScheduleSuggestions'
import { ScheduleSuggestionStatus, ScheduleRiskLevel } from '@lib/constants'
import type { ScheduleSuggestionDexie } from '@lib/dexie'

export function ScheduleSuggestionList() {
  const navigate = useNavigate()
  const { suggestions, loading, loadSuggestions } = useScheduleSuggestions()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<ScheduleSuggestionStatus | 'all'>('all')
  const [riskFilter, setRiskFilter] = useState<ScheduleRiskLevel | 'all'>('all')

  const filteredSuggestions = suggestions.filter(s => {
    const matchesSearch = !search || 
      s.suggestionText.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === 'all' || s.status === statusFilter
    // We don't have risk level stored, but we can filter by scheduleRiskFlag
    const matchesRisk = riskFilter === 'all' || (riskFilter === 'high' ? s.scheduleRiskFlag : !s.scheduleRiskFlag)
    return matchesSearch && matchesStatus && matchesRisk
  })

  const getStatusBadge = (status: ScheduleSuggestionStatus) => {
    const variants: Record<ScheduleSuggestionStatus, 'success' | 'warning' | 'info' | 'default' | 'error'> = {
      pending: 'warning',
      accepted: 'success',
      dismissed: 'default',
    }
    return <Badge variant={variants[status]} size="sm">{status}</Badge>
  }

  const handleSuggestionClick = (suggestion: ScheduleSuggestionDexie) => {
    navigate(`/schedule-suggestions/${suggestion.id}`)
  }

  useEffect(() => {
    loadSuggestions()
  }, [loadSuggestions])

  if (loading) {
    return <div style={{ padding: 'var(--spacing-xl)', textAlign: 'center' }}>Loading...</div>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 600 }}>Schedule Suggestions</h1>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-md)' }}>
        <Input
          placeholder="Search suggestions..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          leftIcon={<Filter size={18} />}
          style={{ flex: 1, minWidth: '200px' }}
        />
        <Select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as ScheduleSuggestionStatus | 'all')}
          options={['all', 'pending', 'accepted', 'dismissed'].map(s => ({ value: s, label: s === 'all' ? 'All Status' : s }))}
          style={{ minWidth: '150px' }}
        />
        <Select
          value={riskFilter}
          onChange={e => setRiskFilter(e.target.value as ScheduleRiskLevel | 'all')}
          options={['all', 'high', 'medium', 'low'].map(r => ({ value: r, label: r === 'all' ? 'All Risk' : r }))}
          style={{ minWidth: '150px' }}
        />
      </div>

      {filteredSuggestions.length === 0 ? (
        <Card padding="xl" style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>
          {suggestions.length === 0 ? 'No schedule suggestions yet. High-risk gaps will generate suggestions automatically.' : 'No suggestions match your filters.'}
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
          {filteredSuggestions.map(suggestion => (
            <Card
              key={suggestion.id}
              onClick={() => handleSuggestionClick(suggestion)}
              hoverable
              padding="md"
              style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 'var(--spacing-md)' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', flexWrap: 'wrap', marginBottom: 'var(--spacing-xs)' }}>
                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {suggestion.suggestionText.slice(0, 80)}...
                    </h3>
                    {getStatusBadge(suggestion.status)}
                    {suggestion.scheduleRiskFlag && (
                      <Badge variant="error" size="sm">
                        <AlertCircleIcon size={10} /> High Risk
                      </Badge>
                    )}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                    {suggestion.affectedVisitIds?.length || 0} visit(s) affected
                    {suggestion.estimatedSavingMinutes && (
                      <> • Est. saving: {suggestion.estimatedSavingMinutes} min</>
                    )}
                    {suggestion.estimatedSavingMiles && (
                      <> • Est. miles saved: {suggestion.estimatedSavingMiles}</>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 'var(--spacing-xs)' }}>
                  <ChevronRight size={20} style={{ color: 'var(--color-text-muted)' }} />
                </div>
              </div>
              {suggestion.status === 'pending' && (
                <div style={{ display: 'flex', gap: 'var(--spacing-sm)', marginTop: 'var(--spacing-sm)', paddingTop: 'var(--spacing-sm)', borderTop: '1px solid var(--color-border)' }}>
                  <Button variant="primary" size="sm" onClick={(e) => { e.stopPropagation(); /* accept */ }} leftIcon={<CheckCircle size={14} />}>
                    Accept
                  </Button>
                  <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); /* dismiss */ }}>
                    Dismiss
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

import { useState } from 'react'
import { AlertCircle as AlertCircleIcon } from 'lucide-react'