// ExpenseReceiptView - View for expense receipt OCR results

import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useDocuments } from '../hooks/useDocuments'
import { Layout } from '@components/layout/Layout'
import { Card } from '@components/ui/Card'
import { Badge } from '@components/ui/Badge'
import { Button } from '@components/ui/Button'
import { FileText, Clock, PoundSterling, Receipt, AlertTriangle, Trash2, Edit } from 'lucide-react'
import type { DocumentDexie } from '@lib/dexie'

interface ParsedExpense {
  merchant?: string
  date?: string
  amount?: number
  vatAmount?: number
  category?: string
  items?: Array<{
    description: string
    amount: number
    vatAmount?: number
  }>
}

export function ExpenseReceiptView() {
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

  const formatAmount = (amount: number | null) => {
    if (amount === null || amount === undefined) return '—'
    return `£${amount.toFixed(2)}`
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  if (loading) {
    return (
      <Layout title="Expense Receipt">
        <div style={{ padding: 'var(--spacing-xl)', textAlign: 'center' }}>Loading...</div>
      </Layout>
    )
  }

  if (!document) {
    return (
      <Layout title="Expense Receipt">
        <div style={{ padding: 'var(--spacing-xl)', textAlign: 'center' }}>Document not found</div>
      </Layout>
    )
  }

  const parsed = document.parsedJson as Record<string, unknown> | undefined
  const items = (parsed?.items as Array<{ description: string; amount: number; vatAmount?: number }>) || []

  return (
    <Layout title="Expense Receipt" onBack={() => navigate('/documents')}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
        <Card padding="lg">
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--spacing-md)' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-sm)' }}>
                <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>Expense Receipt</h2>
                <Badge variant="info" size="sm">Expense</Badge>
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                Merchant: <strong>{(parsed?.merchant as string) || 'Unknown'}</strong>
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-lg)' }}>
            <div style={{ padding: 'var(--spacing-md)', background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginBottom: 'var(--spacing-xs)' }}>Merchant</div>
              <div style={{ fontSize: '1rem', fontWeight: 600 }}>{(parsed?.merchant as string) || 'Unknown'}</div>
            </div>
            <div style={{ padding: 'var(--spacing-md)', background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginBottom: 'var(--spacing-xs)' }}>Date</div>
              <div style={{ fontSize: '1rem', fontWeight: 600 }}>{formatDate((parsed?.date as string) || null)}</div>
            </div>
            <div style={{ padding: 'var(--spacing-md)', background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginBottom: 'var(--spacing-xs)' }}>Category</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--spacing-xs)' }}>
                <Badge variant="default" size="sm" style={{ background: 'var(--color-primary)20', color: 'var(--color-primary)' }}>
                  {(parsed?.category as string) || 'other'}
                </Badge>
              </div>
            </div>
            <div style={{ padding: 'var(--spacing-md)', background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginBottom: 'var(--spacing-xs)' }}>Total Amount</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-error)' }}>
                {formatAmount((parsed?.amount as number) || null)}
              </div>
            </div>
            <div style={{ padding: 'var(--spacing-md)', background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginBottom: 'var(--spacing-xs)' }}>VAT Amount</div>
              <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>
                {formatAmount((parsed?.vatAmount as number) || null)}
              </div>
            </div>
          </div>

          {items.length > 0 && (
            <Card padding="lg">
              <h3 style={{ margin: '0 0 var(--spacing-md)', fontSize: '1rem', fontWeight: 600 }}>Line Items ({items.length})</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
                {items.map((item: { description: string; amount: number; vatAmount?: number }, index: number) => (
                  <div key={index} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 'var(--spacing-sm)', padding: 'var(--spacing-sm)', background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', alignItems: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
                      <div style={{ fontWeight: 500, fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {item.description || 'Item'}
                      </div>
                      {item.vatAmount !== undefined && (
                        <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                          VAT: £{item.vatAmount?.toFixed(2) || '0.00'}
                        </div>
                      )}
                    </div>
                    <div style={{ textAlign: 'right', fontWeight: 600, color: 'var(--color-primary)' }}>
                      £{item.amount?.toFixed(2) || '0.00'}
                    </div>
                    {item.vatAmount !== undefined && (
                      <div style={{ textAlign: 'right', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                        VAT: £{item.vatAmount?.toFixed(2) || '0.00'}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}

          {document.additionalNotes && (
            <Card padding="lg" style={{ background: 'var(--color-surface)' }}>
              <strong>Notes:</strong> {document.additionalNotes}
            </Card>
          )}
        </div>
      </Layout>
    )
  )
}