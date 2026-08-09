// ExpenseReceiptView - View for expense receipt OCR results

import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Layout } from '@components/layout/Layout'
import { Card } from '@components/ui/Card'
import { Badge } from '@components/ui/Badge'
import { Button } from '@components/ui/Button'
import { FileText, Clock, DollarSign, Receipt, AlertTriangle, Trash2, Edit, CreditCard, Tag } from 'lucide-react'
import { useExpenses } from '../hooks/useExpenses'
import { EXPENSE_CATEGORIES, ExpenseCategory } from '@lib/constants'
import type { ExpenseDexie } from '@lib/dexie'

export function ExpenseReceiptView() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { expenses, loadExpenses, getExpense, deleteExpense } = useExpenses()
  const [expense, setExpense] = useState<ExpenseDexie | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (id) loadData()
  }, [id])

  const loadData = async () => {
    if (!id) return
    setLoading(true)
    try {
      const exp = await getExpense(parseInt(id))
      if (!exp) {
        navigate('/expenses')
        return
      }
      setExpense(exp)
    } catch (err) {
      navigate('/expenses')
    } finally {
      setLoading(false)
    }
  }

  const getCategoryBadge = (cat: string) => {
    const labels: Record<string, string> = {
      fuel: 'Fuel', parking: 'Parking', materials: 'Materials',
      tools: 'Tools', subsistence: 'Subsistence', accommodation: 'Accommodation',
      training: 'Training', insurance: 'Insurance', phone: 'Phone',
      software: 'Software', other: 'Other',
    }
    return <Badge variant="info" size="sm">{labels[cat] || cat}</Badge>
  }

  const handleDelete = async () => {
    if (!expense || !confirm('Delete this expense? This cannot be undone.')) return
    setDeleting(true)
    try {
      await deleteExpense(expense.id!)
      navigate('/expenses')
    } catch (err) {
      console.error('Failed to delete:', err)
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return <Layout title="Expense"><div style={{ padding: 'var(--spacing-xl)', textAlign: 'center' }}>Loading...</div></Layout>
  }

  if (!expense) {
    return <Layout title="Expense"><div style={{ padding: 'var(--spacing-xl)', textAlign: 'center' }}>Expense not found</div></Layout>
  }

  return (
    <Layout title="Expense" onBack={() => navigate('/expenses')}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
        <Card padding="lg">
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--spacing-md)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
              <div style={{ 
                width: '56px', height: '56px', borderRadius: 'var(--radius-md)',
                background: 'var(--color-primary-muted)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <Receipt size={28} style={{ color: 'var(--color-primary)' }} />
              </div>
              <div>
                <h2 style={{ margin: '0 0 var(--spacing-xs)', fontSize: '1.125rem', fontWeight: 600 }}>
                  {expense.merchant || 'Unknown Merchant'}
                </h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', flexWrap: 'wrap', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                  <span><Calendar size={12} /> {expense.date ? new Date(expense.date).toLocaleDateString('en-GB') : 'No date'}</span>
                  <span><Tag size={12} /> {expense.category}</span>
                  {expense.vatAmount && <span><DollarSign size={12} /> VAT: £{expense.vatAmount.toFixed(2)}</span>}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
              <Button variant="ghost" onClick={handleDelete} leftIcon={<Trash2 size={16} />} disabled={deleting} style={{ color: 'var(--color-error)' }}>
                Delete
              </Button>
            </div>
          </div>

          <div style={{ marginTop: 'var(--spacing-lg)', display: 'flex', alignItems: 'baseline', gap: 'var(--spacing-lg)' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Total Amount</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-primary)' }}>
                £{(expense.amount || 0).toFixed(2)}
              </div>
            </div>
            {expense.vatAmount && (
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>VAT</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--color-success)' }}>
                  £{expense.vatAmount.toFixed(2)}
                </div>
              </div>
            )}
          </div>
        </Card>

        <Card padding="lg">
          <h3 style={{ margin: '0 0 var(--spacing-lg)', fontSize: '1rem', fontWeight: 600 }}>Line Items</h3>
          {expense.items && expense.items.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
              {expense.items.map((item: { description: string; amount?: number; vatAmount?: number }, index: number) => (
                <div key={index} style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 'var(--spacing-sm)', padding: 'var(--spacing-sm)', background: 'var(--color-surface)', borderRadius: 'var(--radius-md)', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600, color: 'var(--color-primary)' }}>{index + 1}</span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <div style={{ fontWeight: 500, fontSize: '0.85rem' }}>
                      {item.description}
                    </div>
                    {item.vatAmount && (
                      <div style={{ fontSize: '0.7rem', color: 'var(--color-success)' }}>
                        VAT: £{item.vatAmount.toFixed(2)}
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign: 'right', fontWeight: 600 }}>
                    £{item.amount?.toFixed(2) || '—'}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: 'var(--color-text-muted)', textAlign: 'center' }}>No line items extracted</p>
          )}
        </Card>

        <Card padding="lg" style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--spacing-lg)', flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--color-primary)' }}>
                {(expense.confidence ? expense.confidence * 100 : 50).toFixed(0)}%
              </div>
              <div style={{ fontSize: '0.75rem' }}>OCR Confidence</div>
            </div>
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>
                {expense.modelVersion || 'claude-3-haiku'}
              </div>
              <div style={{ fontSize: '0.75rem' }}>Model</div>
            </div>
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--color-text-muted)' }}>
                {expense.promptVersion || 'v1'}
              </div>
              <div style={{ fontSize: '0.75rem' }}>Prompt</div>
            </div>
          </div>
        </Card>
      </div>
    </Layout>
  )
}