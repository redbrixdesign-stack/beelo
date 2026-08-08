// DeliveryDropNoteView - View for delivery drop note with fan-out targets

import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useDocuments } from '../hooks/useDocuments'
import { Layout } from '@components/layout/Layout'
import { Card } from '@components/ui/Card'
import { Badge } from '@components/ui/Badge'
import { Button } from '@components/ui/Button'
import { FileText, Clock, Users, Truck, Building, Mail } from 'lucide-react'
import type { DocumentDexie } from '@lib/dexie'

export function DeliveryDropNoteView() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { documents, loadDocuments, getDocument } = useDocuments()
  const [document, setDocument] = useState<DocumentDexie | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (id) loadData()
  }, [id])

  const loadData = async () => {
    if (!id) return
    setLoading(true)
    try {
      const doc = await getDocument(parseInt(id))
      if (!doc) {
        navigate('/documents')
        return
      }
      setDocument(doc)
    } catch (err) {
      navigate('/documents')
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'success' | 'warning' | 'info' | 'default' | 'error'> = {
      delivered: 'success',
      pending: 'warning',
      damaged: 'error',
      returned: 'default',
    }
    return <Badge variant={variants[status] || 'default'} size="sm">{status}</Badge>
  }

  const getFanOutIcon = (target: string) => {
    switch (target) {
      case 'customer': return <Users size={16} />
      case 'fitter': return <Truck size={16} />
      case 'office': return <Building size={16} />
      default: return <Mail size={16} />
    }
  }

  if (loading) {
    return <Layout title="Delivery Note"><div style={{ padding: 'var(--spacing-xl)', textAlign: 'center' }}>Loading...</div></Layout>
  }

  if (!document) {
    return <Layout title="Delivery Note"><div style={{ padding: 'var(--spacing-xl)', textAlign: 'center' }}>Document not found</div></Layout>
  }

  const parsed = document.parsedJson as any
  const items = parsed?.items || []
  const fanOutTargets = parsed?.fanOutTargets || []

  return (
    <Layout title="Delivery Note" onBack={() => navigate('/documents')}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
        <Card padding="lg">
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--spacing-md)' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-sm)' }}>
                <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>Delivery Drop Note</h2>
                <Badge variant="info" size="sm">Delivery</Badge>
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                Job: <strong>{parsed?.jobCode || 'Unknown'}</strong> • Customer: <strong>{parsed?.customerNumber || 'Unknown'}</strong>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
              <Button variant="secondary" size="sm" leftIcon={<FileText size={14} />}>View Original</Button>
            </div>
          </div>

          <div style={{ marginTop: 'var(--spacing-md)', display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-sm)' }}>
            {document.confidence && (
              <Badge variant="default" size="sm">
                Confidence: {(document.confidence * 100).toFixed(0)}%
              </Badge>
            )}
            {document.modelVersion && (
              <Badge variant="default" size="sm">
                {document.modelVersion}
              </Badge>
            )}
            {document.extractedAt && (
              <Badge variant="default" size="sm">
                <Clock size={10} /> {new Date(document.extractedAt).toLocaleDateString()}
              </Badge>
            )}
          </div>
        </Card>

        <Card padding="lg">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--spacing-md)' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>Delivery Items ({items.length})</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-xs)' }}>
              {fanOutTargets.map(target => (
                <Badge key={target} variant="info" size="sm" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {getFanOutIcon(target)} {target}
                </Badge>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
            {items.map((item: any, index: number) => (
              <div key={item.lineNumber || index} style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 'var(--spacing-sm)', padding: 'var(--spacing-sm)', background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', alignItems: 'center' }}>
                <span style={{ fontWeight: 600, color: 'var(--color-primary)' }}>{item.lineNumber}</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <div style={{ fontWeight: 500, fontSize: '0.85rem' }}>
                    {item.description || 'Item'}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                    Qty: {item.quantity} • {getStatusBadge(item.status)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {document.additionalNotes && (
          <Card padding="lg" style={{ background: 'var(--color-surface)' }}>
            <strong>Notes:</strong> {document.additionalNotes}
          </Card>
        )}
      </div>
    </Layout>
  )
}