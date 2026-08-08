// ExpenseList - List component for expenses

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Clock, ChevronRight, Filter, AlertCircle, CheckCircle, Receipt, Trash2, Edit } from 'lucide-react'
import { Card } from '@components/ui/Card'
import { Badge } from '@components/ui/Badge'
import { Button } from '@components/ui/Button'
import { Input } from '@components/ui/Input'
import { Select } from '@components/ui/Select'
import { useExpenses } from '../hooks/useExpenses'
import { EXPENSE_CATEGORIES, ExpenseCategory } from '@lib/constants'

export function ExpenseList() {
  const navigate = useNavigate()
  const { expenses, loading, loadExpenses } = useExpenses()
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<ExpenseCategory | 'all'>('all')

  const filteredExpenses = expenses.filter(expense => {
    const matchesSearch = !search || 
      expense.merchant?.toLowerCase().includes(search.toLowerCase()) ||
      expense.category?.toLowerCase().includes(search.toLowerCase())
    const matchesCategory = categoryFilter === 'all' || expense.category === categoryFilter
    return matchesSearch && matchesCategory
  })

  const getCategoryBadge = (category?: ExpenseCategory) => {
    if (!category) return null
    return <Badge variant="info" size="sm">{category}</Badge>
  }

  const formatDate = (dateStr: string | Date) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  const formatAmount = (amount: number) => {
    return `£${amount.toFixed(2)}`
  }

  const handleExpenseClick = (expense: any) => {
    navigate(`/expenses/${expense.id}`)
  }

  const handleDelete = async (e: React.MouseEvent, expense: any) => {
    e.stopPropagation()
    if (!confirm('Delete this expense? This cannot be undone.')) return
    // Note: deleteExpense not in hook, would need to add
  }

  if (loading) {
    return <div style={{ padding: 'var(--spacing-xl)', textAlign: 'center' }}>Loading...</div>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 600 }}>Expenses</h1>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-md)' }}>
        <Input
          placeholder="Search merchant or category..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          leftIcon={<Filter size={18} />}
          style={{ flex: 1, minWidth: '200px' }}
        />
        <Select
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value as ExpenseCategory | 'all')}
          options={['all', ...EXPENSE_CATEGORIES].map(c => ({ value: c, label: c === 'all' ? 'All Categories' : c.charAt(0).toUpperCase() + c.slice(1) }))}
          style={{ minWidth: '150px' }}
        />
      </div>

      {filteredExpenses.length === 0 ? (
        <Card padding="xl" style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>
          {expenses.length === 0 ? 'No expenses yet. Use "Capture Expense" to add one.' : 'No expenses match your filters.'}
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
          {filteredExpenses.map(expense => (
            <Card
              key={expense.id}
              onClick={() => handleExpenseClick(expense)}
              hoverable
              padding="md"
              style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}
            >
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
                {expense.photoPath && (
                  <img 
                    src={expense.photoPath} 
                    alt="Receipt" 
                    style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'var(--radius-sm)' }}
                  />
                }
              </div>
              
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', flexWrap: 'wrap' }}>
                  <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {expense.merchant || 'Unknown merchant'}
                  </h3>
                  {getCategoryBadge(expense.category)}
                </div>
                <div style={{ marginTop: 'var(--spacing-xs)', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                  {formatAmount(expense.amount)} • {formatDate(expense.date)}
                  {expense.notes && <span> • {expense.notes}</span>}
                </div>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 'var(--spacing-xs)' }}>
                <div style={{ fontWeight: 600, color: 'var(--color-error)', fontSize: '0.9rem' }}>
                  {formatAmount(expense.amount)}
                </div>
                <ChevronRight size={20} style={{ color: 'var(--color-text-muted)' }} />
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

import type { ExpenseDexie } from '@lib/dexie'