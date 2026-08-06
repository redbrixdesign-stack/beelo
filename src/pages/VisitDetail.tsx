import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useDexie } from '../../hooks/useDexie'
import { useToast } from '../components/ui/Toast'
import { Layout } from '../components/layout/Layout'
import { VisitForm } from '../components/visits/VisitForm'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Calendar, Hash, Edit, Trash2, ChevronLeft } from 'lucide-react'

export function VisitDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { advisor } = useAuth()
  const { db, isReady } = useDexie()
  const { showToast } = useToast()
  const [visit, setVisit] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (!isReady || !advisor || !id) return
    loadVisit()
  }, [isReady, advisor, id])

  const loadVisit = async () => {
    if (!advisor || !id) return
    setLoading(true)
    try {
      const data = await db.visits
        .where('advisorId')
        .equals(advisor.id!)
        .and(v => String(v.id) === id)
        .first()
      setVisit(data)
    } catch (err) {
      console.error('Failed to load visit:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!advisor || !visit || !confirm('Delete this visit? This cannot be undone.')) return
    
    setDeleting(true)
    try {
      await db.visits.delete(visit.id!)
      // Note: In a real app, we'd also enqueue a delete sync
      showToast('Visit deleted', 'success')
      navigate('/visits')
    } catch (err) {
      showToast('Failed to delete visit', 'error')
    } finally {
      setDeleting(false)
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-GB', { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric',
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  if (!isReady || loading) {
    return <Layout title="Visit">Loading...</Layout>
  }

  if (!visit) {
    return (
      <Layout title="Visit" showBack onBack={() => navigate('/visits')}>
        <Card padding="lg" style={{ textAlign: 'center' }}>
          <p style={{ color: 'var(--color-text-muted)', margin: '0 0 var(--spacing-md)' }}>Visit not found</p>
          <Button variant="secondary" onClick={() => navigate('/visits')}>Back to Visits</Button>
        </Card>
      </Layout>
    )
  }

  const getOutcomeBadge = (outcome?: string) => {
    if (!outcome) return <Badge variant="default" size="md">No outcome set</Badge>
    const positive = ['Ordered', 'Quoted'].includes(outcome)
    const negative = ['Too Expensive', 'Not What They Wanted', 'Spec Mismatch'].includes(outcome)
    return <Badge variant={positive ? 'success' : negative ? 'error' : 'warning'} size="md">{outcome}</Badge>
  }

  return (
    <Layout title="Visit" showBack onBack={() => navigate('/visits')}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
        <Card padding="md">
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-md)' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', flexWrap: 'wrap', marginBottom: 'var(--spacing-sm)' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.875rem', color: 'var(--color-primary)', fontWeight: 600 }}>
                  <Hash size={16} /> {visit.jobCode}
                </span>
                {visit.appointmentType && <Badge variant="info" size="sm">{visit.appointmentType}</Badge>}
                {visit.jobSource && <Badge variant="default" size="sm">{visit.jobSource.replace('_', ' ')}</Badge>}
              </div>
              <p style={{ margin: 0, fontSize: '1.125rem', fontWeight: 600 }}>{visit.customerNumber}</p>
              <p style={{ margin: '4px 0 0', color: 'var(--color-text-muted)' }}>
                <Calendar size={16} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                {formatDate(visit.dateTime)}
              </p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 'var(--spacing-sm)' }}>
              {getOutcomeBadge(visit.outcome)}
              <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
                <Button variant="ghost" size="sm" onClick={() => navigate(`/visits/${visit.id}/edit`)}>
                  <Edit size={16} /> Edit
                </Button>
                <Button variant="ghost" size="sm" onClick={handleDelete} disabled={deleting}>
                  <Trash2 size={16} /> Delete
                </Button>
              </div>
            </div>
          </div>

          {visit.blindCount && (
            <div style={{ paddingTop: 'var(--spacing-md)', borderTop: '1px solid var(--color-border)' }}>
              <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
                <strong>{visit.blindCount} blind{visit.blindCount > 1 ? 's' : ''}</strong>
                {visit.estimatedDurationMinutes && ` • ~${visit.estimatedDurationMinutes} min estimated`}
              </p>
            </div>
          )}

          {visit.location && (
            <div style={{ paddingTop: 'var(--spacing-md)', borderTop: '1px solid var(--color-border)' }}>
              <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
                {visit.location}
              </p>
            </div>
          )}

          {visit.preVisitNotes && (
            <div style={{ paddingTop: 'var(--spacing-md)', borderTop: '1px solid var(--color-border)' }}>
              <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--color-text)' }}>
                <strong>Pre-visit notes:</strong> {visit.preVisitNotes}
              </p>
            </div>
          )}

          {visit.notes && (
            <div style={{ paddingTop: 'var(--spacing-md)', borderTop: '1px solid var(--color-border)' }}>
              <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--color-text)' }}>
                <strong>Notes:</strong> {visit.notes}
              </p>
            </div>
          )}

          {(visit.outcomeValue || visit.discountPercent || visit.commissionAmount) && (
            <div style={{ paddingTop: 'var(--spacing-md)', borderTop: '1px solid var(--color-border)' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-md)', fontSize: '0.875rem' }}>
                {visit.outcomeValue && (
                  <span style={{ color: 'var(--color-success)' }}>Value: £{visit.outcomeValue.toFixed(2)}</span>
                )}
                {visit.discountPercent && (
                  <span>Discount: {visit.discountPercent}%</span>
                )}
                {visit.commissionAmount && (
                  <span style={{ color: 'var(--color-primary)' }}>Commission: £{visit.commissionAmount.toFixed(2)}</span>
                )}
              </div>
            </div>
          )}
        </Card>
      </div>
    </Layout>
  )
}

import { useState } from 'react'