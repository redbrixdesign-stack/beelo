// DeliveryDropNoteView - View for delivery drop note with fan-out display

import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Layout } from '@components/layout/Layout'
import { Card } from '@components/ui/Card'
import { Badge } from '@components/ui/Badge'
import { Button } from '@components/ui/Button'
import { Package, User, Truck, Building, AlertTriangle, CheckCircle, X, ChevronLeft, Hash, Calendar, FileText } from 'lucide-react'
import { useDeliveryDropNotes } from '../hooks/useDeliveryDropNotes'
import { useDocuments } from '@features/documents/hooks/useDocuments'
import type { DocumentDexie } from '@lib/dexie'

export function DeliveryDropNoteView() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { documents, loadDocuments, getDocument } = useDocuments()
  const { deliveryDropNotes, loadDeliveryDropNotes, getDeliveryDropNote } = useDeliveryDropNotes()
  const [document, setDocument] = useState<DocumentDexie | null>(null)
  const [note, setNote] = useState<any>(null)
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

      // Load delivery drop note data
      const notes = await db.deliveryDropNotes
        .where('documentId')
        .equals(doc.id!)
        .toArray()
      
      if (notes.length > 0) {
        setNote(notes[0])
      }
    } catch (err) {
      navigate('/documents')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <Layout title="Delivery Note"><div style={{ padding: 'var(--spacing-xl)', textAlign: 'center' }}>Loading...</div></Layout>
  }

  if (!document || !note) {
    return <Layout title="Delivery Note"><div style={{ padding: 'var(--spacing-xl)', textAlign: 'center' }}>Delivery note not found</div></Layout>
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

  const getTargetBadge = (target: string) => {
    const icons: Record<string, typeof User | typeof Truck | typeof Building> = {
      customer: User,
      fitter: Truck,
      office: Building,
    }
    const Icon = icons[target] || User
    return (
      <Badge variant="info" size="sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
        <Icon size={10} /> {target.charAt(0).toUpperCase() + target.slice(1)}
      </Badge>
    )
  }

  return (
    <Layout title="Delivery Note" onBack={() => navigate('/documents')}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
        {/* Header */}
        <Card padding="lg">
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--spacing-md)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
              <div style={{ 
                width: '56px', height: '56px', borderRadius: 'var(--radius-md)',
                background: 'var(--color-primary-muted)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <Package size={28} style={{ color: 'var(--color-primary)' }} />
              </div>
              <div>
                <h2 style={{ margin: '0 0 var(--spacing-xs)', fontSize: '1.125rem', fontWeight: 600 }}>
                  Delivery Drop Note
                </h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', flexWrap: 'wrap', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                  <span><Hash size={12} /> {note.jobCode}</span>
                  <span><Calendar size={12} /> {note.deliveryDate ? new Date(note.deliveryDate).toLocaleDateString('en-GB') : 'No date'}</span>
                  <span><FileText size={12} /> {note.items?.length || 0} items</span>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-sm)' }}>
              {note.fanOutTargets?.map(target => getTargetBadge(target))}
            </div>
          </div>
        </Card>

        {/* Items */}
        <Card padding="lg">
          <h3 style={{ margin: '0 0 var(--spacing-lg)', fontSize: '1rem', fontWeight: 600 }}>
            Items ({note.items?.length || 0})
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
            {note.items?.map((item: any, index: number) => (
              <div key={item.lineNumber || index} style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 'var(--spacing-sm)', padding: 'var(--spacing-sm)', background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', alignItems: 'center' }}>
                <span style={{ fontWeight: 600, color: 'var(--color-primary)', minWidth: '32px' }}>{item.lineNumber || index + 1}</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
                  <div style={{ fontWeight: 500, fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.description}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                    Qty: {item.quantity}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                  {getStatusBadge(item.status)}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Fan-out info */}
        <Card padding="lg" style={{ background: 'var(--color-info-muted)', border: '1px solid var(--color-info)' }}>
          <h3 style={{ margin: '0 0 var(--spacing-md)', fontSize: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
            <Package size={18} /> Multi-Fan-Out Distribution
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-info)', marginBottom: 'var(--spacing-md)' }}>
            This delivery note has been distributed to the following parties:
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-sm)' }}>
            {note.fanOutTargets?.map(target => (
              <Badge key={target} variant="info" size="md" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ fontSize: '0.75rem' }}>
                  {target === 'customer' && <User size={12} />}
                  {target === 'fitter' && <Truck size={12} />}
                  {target === 'office' && <Building size={12} />}
                  {target.charAt(0).toUpperCase() + target.slice(1)}
                </span>
              </Badge>
            ))}
          </div>
        </Card>

        {/* OCR Confidence */}
        <Card padding="lg" style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--spacing-lg)', flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--color-primary)' }}>
                {(note.confidence * 100).toFixed(0)}%
              </div>
              <div style={{ fontSize: '0.75rem' }}>OCR Confidence</div>
            </div>
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>
                {note.modelVersion || 'claude-3-haiku'}
              </div>
              <div style={{ fontSize: '0.75rem' }}>Model</div>
            </div>
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>
                {note.promptVersion || 'v1'}
              </div>
              <div style={{ fontSize: '0.75rem' }}>Prompt</div>
            </div>
          </div>
        </Card>
      </div>
    </Layout>
  )
}

import { db } from '@lib/dexie'