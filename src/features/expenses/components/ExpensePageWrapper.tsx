// ExpensePageWrapper - Wrapper components for expense routes with navigation

import { useNavigate } from 'react-router-dom'
import { Layout } from '@components/layout/Layout'
import { ExpenseList } from '@features/expenses/components/ExpenseList'
import { ExpenseCapture } from '@features/expenses/components/ExpenseCapture'
import { useExpenses } from '@features/expenses/hooks/useExpenses'

export function ExpensesPage() {
  const navigate = useNavigate()
  const { createExpense } = useExpenses()

  const handleCapture = async (file: File, category?: string, notes?: string) => {
    await createExpense({
      merchant: '',
      date: new Date(),
      amount: 0,
      category: category as any,
      photoPath: URL.createObjectURL(file),
      sourceEnv: (import.meta.env.VITE_SOURCE_ENV as any) || 'live',
      additionalNotes: notes,
    })
    navigate('/expenses')
  }

  return (
    <Layout title="Expenses">
      <ExpenseList onNew={() => navigate('/expenses/new')} />
    </Layout>
  )
}

export function NewExpensePage() {
  const navigate = useNavigate()
  const { createExpense } = useExpenses()

  const handleCapture = async (file: File, category?: string, notes?: string) => {
    await createExpense({
      merchant: '',
      date: new Date(),
      amount: 0,
      category: category as any,
      photoPath: URL.createObjectURL(file),
      sourceEnv: (import.meta.env.VITE_SOURCE_ENV as any) || 'live',
      additionalNotes: notes,
    })
    navigate('/expenses')
  }

  return (
    <Layout title="New Expense" showBack onBack={() => window.history.back()}>
      <ExpenseCapture onCapture={handleCapture} />
    </Layout>
  )
}