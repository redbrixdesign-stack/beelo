// DocumentDetail - Detail view for a document with parsed results

import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useDocuments } from '../hooks/useDocuments'
import { Layout } from '@components/layout/Layout'
import { Card } from '@components/ui/Card'
import { Badge } from '@components/ui/Badge'
import { Button } from '@components/ui/Button'
import { FileText, Image, ChevronLeft, AlertCircle, CheckCircle, Clock, Hash, Trash2, Edit } from 'lucide-react'
import { DOCUMENT_STATUSES, DocumentStatus } from '@lib/constants'
import type { DocumentDexie, QuoteLineItemDexie, CommissionLineItemDexie, FitLineItemDexie } from '@lib/dexie'
import { supabase, getDocumentImageUrl } from '@lib/supabase'

export function DocumentDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { documents, loadDocuments, getDocument, deleteDocument, quoteLineItems, loadQuoteLineItems, commissionLineItems, loadCommissionLineItems, fitLineItems, loadFitLineItems } = useDocuments()
  const [document, setDocument] = useState<DocumentDexie | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'quote' | 'commission' | 'fit'>('overview')
  const [imageUrl, setImageUrl] = useState<string>('')

  useEffect(() => {
    if (id) loadData()
  }, [id])

  useEffect(() => {
    if (document?.imagePath) {
      getDocumentImageUrl(document.imagePath).then(setImageUrl)
    }
  }, [document?.imagePath])

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
      
      // Load line items based on document type
      if (doc.type === 'quote_or_receipt') {
        await loadQuoteLineItems(doc.id!)
      } else if (doc.type === 'commission_statement') {
        await loadCommissionLineItems(doc.id!)
      } else if (doc.type === 'fit_completion_receipt') {
        await loadFitLineItems(doc.id!)
      }
    } catch (err) {
      navigate('/documents')
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: DocumentStatus) => {
    const variants: Record<DocumentStatus, 'success' | 'warning' | 'info' | 'default' | 'error'> = {
      uploaded: 'default',
      processing: 'info',
      parsed: 'success',
      matched: 'success',
      error: 'error',
    }
    return <Badge variant={variants[status]} size="sm">{status}</Badge>
  }

  const handleDelete = async () => {
    if (!document || !confirm('Delete this document? This cannot be undone.')) return
    console.log('[DocumentDetail] Deleting document:', document.id, 'imagePath:', document.imagePath)
    setDeleting(true)
    try {
      await deleteDocument(document.id!)
      console.log('[DocumentDetail] Document deleted successfully:', document.id)
      showToast('Document deleted', 'success')
      navigate('/documents')
    } catch (err) {
      console.error('[DocumentDetail] Delete failed:', err)
      showToast(err instanceof Error ? err.message : 'Failed to delete document', 'error')
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return <Layout title="Document"><div style={{ padding: 'var(--spacing-xl)', textAlign: 'center' }}>Loading...</div></Layout>
  }

  if (!document) {
    return <Layout title="Document"><div style={{ padding: 'var(--spacing-xl)', textAlign: 'center' }}>Document not found</div></Layout>
  }

  const showQuoteTab = document.type === 'quote_or_receipt'
  const showCommissionTab = document.type === 'commission_statement'
  const showFitTab = document.type === 'fit_completion_receipt'

  return (
    <Layout title="Document" onBack={() => navigate('/documents')}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
        <Card padding="lg">
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--spacing-md)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
              <div style={{ 
                width: '60px', 
                height: '45px', 
                borderRadius: 'var(--radius-sm)',
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                {document.imagePath && (
                  <img src={imageUrl || document.imagePath} alt="Document" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'var(--radius-sm)' }} />
                )}
              </div>
              <div>
                <h2 style={{ margin: '0 0 var(--spacing-xs)', fontSize: '1.125rem', fontWeight: 600 }}>
                  {document.type.replace(/_/g, ' ')}
                </h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', flexWrap: 'wrap' }}>
                  {getStatusBadge(document.status)}
                  {document.subtype && <Badge variant="info" size="sm">{document.subtype}</Badge>}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
              <Button variant="ghost" onClick={() => navigate(`/documents/${document.id}/edit`)} leftIcon={<Edit size={16} />}>
                Edit
              </Button>
              <Button variant="ghost" onClick={handleDelete} leftIcon={<Trash2 size={16} />} disabled={deleting} loading={deleting}>
                Delete
              </Button>
            </div>
          </div>

          {document.additionalNotes && (
            <div style={{ marginTop: 'var(--spacing-md)', padding: 'var(--spacing-md)', background: 'var(--color-surface)', borderRadius: 'var(--radius-md)' }}>
              <strong>Notes:</strong> {document.additionalNotes}
            </div>
          )}

          <div style={{ marginTop: 'var(--spacing-md)', display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-xs)', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
            <span><Clock size={12} /> {new Date(document.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
            {document.extractedAt && <span>Extracted: {new Date(document.extractedAt).toLocaleDateString()}</span>}
            {document.confidence && <span>Confidence: {(document.confidence * 100).toFixed(0)}%</span>}
            {document.modelVersion && <span>Model: {document.modelVersion}</span>}
          </div>
        </Card>

        {showQuoteTab && quoteLineItems.length > 0 && (
          <Card padding="lg">
            <h3 style={{ margin: '0 0 var(--spacing-md)', fontSize: '1rem', fontWeight: 600 }}>Quote Line Items ({quoteLineItems.length})</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
              {quoteLineItems.map((item, index) => (
                <div key={item.id} style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 'var(--spacing-sm)', padding: 'var(--spacing-sm)', background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600, color: 'var(--color-primary)' }}>{index + 1}</span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <div style={{ fontWeight: 500, fontSize: '0.85rem' }}>
                      {item.description || item.room || item.position || 'Line item'}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                      {item.room && <span>{item.room}</span>}
                      {item.position && <span> • {item.position}</span>}
                      {item.range && <span> • {item.range}</span>}
                      {item.colour && <span> • {item.colour}</span>}
                      {item.widthMm && <span> • {item.widthMm}mm</span>}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 600 }}>
                      Qty: {item.quantity} × £{item.unitPrice?.toFixed(2) || '—'}
                    </div>
                    {item.lineTotal !== undefined && (
                      <div style={{ fontSize: '0.8rem', color: 'var(--color-primary)' }}>
                        = £{item.lineTotal.toFixed(2)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {showCommissionTab && commissionLineItems.length > 0 && (
          <Card padding="lg">
            <h3 style={{ margin: '0 0 var(--spacing-md)', fontSize: '1rem', fontWeight: 600 }}>Commission Line Items ({commissionLineItems.length})</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
              {commissionLineItems.map(item => (
                <div key={item.id} style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 'var(--spacing-sm)', padding: 'var(--spacing-sm)', background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', alignItems: 'center' }}>
                  <Badge variant="default" size="xs">{item.line_type || 'sale'}</Badge>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
                    <div style={{ fontWeight: 500, fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.job_code}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                      {item.customer_name && <span>{item.customer_name}</span>}
                      {item.invoice_number && <span> • Inv: {item.invoice_number}</span>}
                      {item.commission_rate_percent && <span> • {item.commission_rate_percent}%</span>}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', fontSize: '0.8rem' }}>
                    <div style={{ color: 'var(--color-primary)', fontWeight: 600 }}>
                      £{item.amount_inc_vat?.toFixed(2) || '—'}
                    </div>
                    {item.line_date && (
                      <div style={{ color: 'var(--color-text-muted)', fontSize: '0.7rem' }}>
                        {new Date(item.line_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {showFitTab && fitLineItems.length > 0 && (
          <Card padding="lg">
            <h3 style={{ margin: '0 0 var(--spacing-md)', fontSize: '1rem', fontWeight: 600 }}>Fit Line Items ({fitLineItems.length})</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
              {fitLineItems.map((item, index) => (
                <div key={item.id} style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 'var(--spacing-sm)', padding: 'var(--spacing-sm)', background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600, color: 'var(--color-primary)' }}>{item.line_number}</span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <div style={{ fontWeight: 500, fontSize: '0.85rem' }}>
                      {item.job_code}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                      {item.room && <span>{item.room}</span>}
                      {item.position && <span> • {item.position}</span>}
                      <Badge variant={item.fit_status === 'fitted' ? 'success' : 'warning'} size="xs">{item.fit_status}</Badge>
                      {item.refit_date && <span>Refit: {new Date(item.refit_date).toLocaleDateString()}</span>}
                    </div>
                  </div>
                  <Badge variant={item.fit_status === 'fitted' ? 'success' : 'warning'} size="sm">{item.fit_status}</Badge>
                </div>
              ))}
            </div>
          </Card>
        )}

        {!showQuoteTab && !showCommissionTab && !showFitTab && (
          <Card padding="lg" style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>
            <FileText size={48} style={{ marginBottom: 'var(--spacing-md)', opacity: 0.5 }} />
            <p>No extracted line items for this document type</p>
          </Card>
        )}
      </div>
    </Layout>
  )
}