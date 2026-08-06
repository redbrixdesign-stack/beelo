import { useState, useEffect } from 'react'
import { Search, Plus, Filter, ChevronRight, Hash } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useDexie } from '../../hooks/useDexie'
import { useAuth } from '../../hooks/useAuth'
import { Card } from '../ui/Card'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import { OUTCOME_TAXONOMY, APPOINTMENT_TYPES, type AppointmentType, type OutcomeTaxonomy } from '../../lib/constants'

export function VisitList() {
  const navigate = useNavigate()
  const { db, isReady } = useDexie()
  const { advisor } = useAuth()
  const [visits, setVisits] = useState<Array<any>>([])
  const [search, setSearch] = useState('')
  const [outcomeFilter, setOutcomeFilter] = useState<OutcomeTaxonomy | 'all'>('all')
  const [typeFilter, setTypeFilter] = useState<AppointmentType | 'all'>('all')
  const [loading, setLoading] = useState(true)
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    if (!isReady || !advisor) return
    loadVisits()
  }, [isReady, advisor])

  const loadVisits = async () => {
    if (!advisor) return
    setLoading(true)
    try {
      let data = await db.visits
        .where('advisorId')
        .equals(advisor.id!)
        .sortBy('dateTime')
      setVisits(data.reverse())
    } catch (err) {
      console.error('Failed to load visits:', err)
    } finally {
      setLoading(false)
    }
  }

  const filteredVisits = visits.filter(visit => {
    const matchesSearch = search === '' || 
      visit.jobCode.toLowerCase().includes(search.toLowerCase()) ||
      visit.customerNumber.toLowerCase().includes(search.toLowerCase()) ||
      visit.address?.toLowerCase().includes(search.toLowerCase())
    const matchesOutcome = outcomeFilter === 'all' || visit.outcome === outcomeFilter
    const matchesType = typeFilter === 'all' || visit.appointmentType === typeFilter
    return matchesSearch && matchesOutcome && matchesType
  })

  const handleCreate = () => navigate('/visits/new')

  if (!isReady) {
    return <div style={{ padding: 'var(--spacing-xl)', textAlign: 'center' }}>Loading...</div>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>Visits</h1>
        <Button onClick={handleCreate} size="sm">
          <Plus size={18} /> New Visit
        </Button>
      </div>

      <Input
        placeholder="Search visits..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        leftIcon={<Search size={20} />}
        fullWidth
        style={{ maxWidth: '360px' }}
      />

      <div style={{ display: 'flex', gap: 'var(--spacing-sm)', flexWrap: 'wrap' }}>
        <Button variant="secondary" size="sm" onClick={() => setShowFilters(!showFilters)}>
          <Filter size={16} /> Filters
        </Button>
      </div>

      {showFilters && (
        <Card padding="md" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
          <div style={{ display: 'flex', gap: 'var(--spacing-sm)', flexWrap: 'wrap' }}>
            <Select
              value={outcomeFilter}
              onChange={(e) => setOutcomeFilter(e.target.value as OutcomeTaxonomy | 'all')}
              options={[
                { value: 'all', label: 'All Outcomes' },
                ...OUTCOME_TAXONOMY.map(o => ({ value: o, label: o }))
              ]}
              style={{ minWidth: '180px' }}
            />
            <Select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as AppointmentType | 'all')}
              options={[
                { value: 'all', label: 'All Types' },
                ...APPOINTMENT_TYPES.map(t => ({ value: t, label: t.charAt(0).toUpperCase() + t.slice(1) }))
              ]}
              style={{ minWidth: '160px' }}
            />
            {(outcomeFilter !== 'all' || typeFilter !== 'all') && (
              <Button variant="ghost" size="sm" onClick={() => { setOutcomeFilter('all'); setTypeFilter('all'); }}>
                Clear
              </Button>
            )}
          </div>
        </Card>
      )}

      {loading ? (
        <div style={{ padding: 'var(--spacing-xl)', textAlign: 'center', color: 'var(--color-text-muted)' }}>
          Loading visits...
        </div>
      ) : filteredVisits.length === 0 ? (
        <Card padding="lg" style={{ textAlign: 'center' }}>
          <p style={{ color: 'var(--color-text-muted)', margin: '0 0 var(--spacing-md)' }}>
            {search || outcomeFilter !== 'all' || typeFilter !== 'all' 
              ? 'No visits match your filters' 
              : 'No visits yet'}
          </p>
          {!search && outcomeFilter === 'all' && typeFilter === 'all' && (
            <Button onClick={handleCreate}><Plus size={18} /> Add First Visit</Button>
          )}
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
          {filteredVisits.map(visit => (
            <VisitCard key={visit.id} visit={visit} />
          ))}
        </div>
      )}
    </div>
  )
}

function VisitCard({ visit }: { visit: any }) {
  const navigate = useNavigate()

  const getOutcomeBadge = (outcome?: string) => {
    if (!outcome) return <Badge variant="default" size="sm">No outcome</Badge>
    const positive = ['Ordered', 'Quoted'].includes(outcome)
    const negative = ['Too Expensive', 'Not What They Wanted', 'Spec Mismatch'].includes(outcome)
    return <Badge variant={positive ? 'success' : negative ? 'error' : 'warning'} size="sm">{outcome}</Badge>
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  }

  return (
    <Card
      onClick={() => navigate(`/visits/${visit.id}`)}
      hoverable
      padding="md"
      style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 'var(--spacing-md)' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', flexWrap: 'wrap' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--color-primary)', fontWeight: 600 }}>
              <Hash size={14} /> {visit.jobCode}
            </span>
            {visit.appointmentType && (
              <Badge variant="info" size="sm">{visit.appointmentType}</Badge>
            )}
            {visit.jobSource && (
              <Badge variant="default" size="sm">{visit.jobSource.replace('_', ' ')}</Badge>
            )}
          </div>
          <p style={{ margin: '4px 0 0', fontWeight: 600, fontSize: '1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {visit.customerNumber}
          </p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
            {formatDate(visit.dateTime)}
          </span>
          {visit.blindCount && (
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
              {visit.blindCount} blind{visit.blindCount > 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 'var(--spacing-xs)', borderTop: '1px solid var(--color-border)' }}>
        {getOutcomeBadge(visit.outcome)}
        <ChevronRight size={20} style={{ color: 'var(--color-text-muted)' }} />
      </div>
    </Card>
  )
}