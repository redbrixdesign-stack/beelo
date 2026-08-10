// ExpenseList - List of expenses with filters

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card } from '@components/ui/Card'
import { Button } from '@components/ui/Button'
import { Badge } from '@components/ui/Badge'
import { Input } from '@components/ui/Input'
import { Select } from '@components/ui/Select'
import { Plus, Calendar, Filter, ChevronRight, CreditCard, DollarSign } from 'lucide-react'
import { useExpenses } from '../hooks/useExpenses'
import { EXPENSE_CATEGORIES, ExpenseCategory } from '@lib/constants'
import type { ExpenseDexie } from '@lib/dexie'

interface ExpenseListProps {
  onNew: () => void
  dateRange?: { start: Date; end: Date }
}

export function ExpenseList({ onNew, dateRange }: ExpenseListProps) {
  const navigate = useNavigate()
  const { expenses, loading, loadExpenses, getExpensesByDateRange, deleteExpense } = useExpenses()
  const [categoryFilter, setCategoryFilter] = useState<ExpenseCategory | 'all'>('all')
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (dateRange) {
      getExpensesByDateRange(dateRange.start, dateRange.end).then(setExpenses)
    } else {
      loadExpenses()
    }
  }, [dateRange, loadExpenses, getExpensesByDateRange])

  const filteredExpenses = expenses.filter(exp => {
    const matchesSearch = !search || 
      exp.merchant?.toLowerCase().includes(search.toLowerCase()) ||
      exp.category?.toLowerCase().includes(search.toLowerCase())
    const matchesCategory = categoryFilter === 'all' || exp.category === categoryFilter
    return matchesSearch && matchesCategory
  })

  const categoryLabels: Record<ExpenseCategory, string> = {
    fuel: 'Fuel', parking: 'Parking', materials: 'Materials',
    tools: 'Tools', subsistence: 'Subsistence', accommodation: 'Accommodation',
    training: 'Training', insurance: 'Insurance', phone: 'Phone',
    software: 'Software', other: 'Other',
  }

  const getCategoryIcon = (cat: ExpenseCategory) => {
    const icons: Record<ExpenseCategory, typeof CreditCard | typeof Calendar> = {
      fuel: CreditCard, parking: Calendar, materials: CreditCard,
      tools: CreditCard, subsistence: CreditCard, accommodation: CreditCard,
      training: CreditCard, insurance: CreditCard, phone: CreditCard,
      software: CreditCard, other: CreditCard,
    }
    return icons[cat] || CreditCard
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this expense?')) return
    await deleteExpense(id)
  }

  if (loading) {
    return <div style={{ padding: 'var(--spacing-xl)', textAlign: 'center' }}>Loading...</div>
  }

  const total = filteredExpenses.reduce((sum, e) => sum + (e.amount || 0), 0)
  const vatTotal = filteredExpenses.reduce((sum, e) => sum + (e.vatAmount || 0), 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--spacing-md)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>Expenses ({filteredExpenses.length})</h3>
          <div style={{ display: 'flex', gap: 'var(--spacing-lg)', fontSize: '0.85rem' }}>
            <span><DollarSign size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} /> Total: £{total.toFixed(2)}</span>
            <span><DollarSign size={14} style={{ verticalAlign: 'middle', marginRight: 4, color: 'var(--color-success)' }} /> VAT: £{vatTotal.toFixed(2)}</span>
          </div>
        </div>
        <Button variant="secondary" onClick={onNew} leftIcon={<Plus size={16} />}>
          Add Expense
        </Button>
      </div>

      <Card padding="md">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-md)', alignItems: 'center' }}>
          <Input
            placeholder="Search merchant..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            leftIcon={<CreditCard size={18} />}
            style={{ flex: 1, minWidth: '200px' }}
          />
          <Select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value as ExpenseCategory | 'all')}
            options={['all', ...EXPENSE_CATEGORIES].map(c => ({ value: c, label: c === 'all' ? 'All Categories' : categoryLabels[c] }))}
            style={{ minWidth: '160px' }}
          />
        </div>
      </Card>

      {filteredExpenses.length === 0 ? (
        <Card padding="xl" style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>
          <CreditCard size={48} style={{ marginBottom: 'var(--spacing-md)', opacity: 0.5 }} />
          <p>No expenses found</p>
          {!search && categoryFilter === 'all' && (
            <Button onClick={onNew} style={{ marginTop: 'var(--spacing-md)' }}>
              <Plus size={18} /> Add First Expense
            </Button>
          )}
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
          {filteredExpenses.map(exp => (
            <Card key={exp.id} padding="md" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--spacing-sm)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                  <Badge variant="info" size="sm">
                    {categoryLabels[exp.category as ExpenseCategory] || exp.category}
                  </Badge>
                  <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>
                    {exp.merchant || 'Unknown Merchant'}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-lg)' }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--color-primary)' }}>
                      £{(exp.amount || 0).toFixed(2)}
                    </div>
                    {exp.vatAmount && (
                      <div style={{ fontSize: '0.7rem', color: 'var(--color-success)' }}>
                        VAT: £{exp.vatAmount.toFixed(2)}
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                    {exp.date ? new Date(exp.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : 'No date'}
                  </div>
                </div>
              </div>

              {exp.items && exp.items.length > 0 && (
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', paddingLeft: 'var(--spacing-md)' }}>
                  {exp.items.map((item: { description: string; amount?: number; vatAmount?: number }, i: number) => (
                    <div key={i}>
                      {item.description} — £{item.amount?.toFixed(2)}
                    </div>
                  ))}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--spacing-sm)', marginTop: 'var(--spacing-xs)' }}>
                <Button variant="ghost" size="sm" onClick={() => navigate(`/expenses/${exp.id}`)} leftIcon={<ChevronRight size={14} />}>
                  View
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(exp.id!)} style={{ color: 'var(--color-error)' }}>
                  <span>Delete</span>
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}