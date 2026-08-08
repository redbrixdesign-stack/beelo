// ExpenseCapture - Camera/gallery upload for expense receipts

import { useState, useRef } from 'react'
import { Camera, FileText, X, Upload, Receipt } from 'lucide-react'
import { Card } from '@components/ui/Card'
import { Button } from '@components/ui/Button'
import { Badge } from '@components/ui/Badge'
import { Input } from '@components/ui/Input'
import { Select } from '@components/ui/Select'
import { EXPENSE_CATEGORIES, ExpenseCategory } from '@lib/constants'

interface ExpenseCaptureProps {
  onCapture: (file: File, category: ExpenseCategory, amount: number, notes?: string) => Promise<void>
  disabled?: boolean
}

export function ExpenseCapture({ onCapture, disabled }: ExpenseCaptureProps) {
  const [selectedCategory, setSelectedCategory] = useState<ExpenseCategory>('fuel')
  const [amount, setAmount] = useState('')
  const [notes, setNotes] = useState('')
  const [preview, setPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => setPreview(e.target?.result as string)
      reader.readAsDataURL(file)
    }
  }

  const handleCameraCapture = () => {
    fileInputRef.current?.click()
  }

  const handleSubmit = async () => {
    if (!preview || !amount) return
    setUploading(true)
    try {
      const response = await fetch(preview)
      const blob = await response.blob()
      const file = new File([blob], `expense-${Date.now()}.jpg`, { type: 'image/jpeg' })
      
      await onCapture(file, selectedCategory, parseFloat(amount), notes || undefined)
      
      setPreview(null)
      setAmount('')
      setNotes('')
    } catch (err) {
      console.error('Failed to capture expense:', err)
    } finally {
      setUploading(false)
    }
  }

  const handleRemove = () => {
    setPreview(null)
  }

  return (
    <Card padding="lg">
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-lg)' }}>
        <div style={{ 
          width: '40px', 
          height: '40px', 
          borderRadius: '50%', 
          background: 'var(--color-primary-muted)', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          color: 'var(--color-primary)'
        }}>
          <Receipt size={20} />
        </div>
        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>Capture Expense</h3>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
        <Select
          label="Category"
          value={selectedCategory}
          onChange={e => setSelectedCategory(e.target.value as ExpenseCategory)}
          options={EXPENSE_CATEGORIES.map(c => ({ value: c, label: c.charAt(0).toUpperCase() + c.slice(1) }))}
          disabled={disabled || uploading}
        />

        <Input
          label="Amount (£)"
          type="number"
          step="0.01"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          placeholder="0.00"
          disabled={disabled || uploading}
        />

        <Input
          label="Notes (optional)"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="What was this for?"
          multiline
          rows={2}
          disabled={disabled || uploading}
        />

        <div style={{ marginTop: 'var(--spacing-md)' }}>
          {preview ? (
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <img 
                src={preview} 
                alt="Receipt preview" 
                style={{ 
                  width: '100%', 
                  maxHeight: '300px', 
                  objectFit: 'cover', 
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)'
                }} 
              />
              <button
                onClick={handleRemove}
                style={{
                  position: 'absolute',
                  top: 'var(--spacing-sm)',
                  right: 'var(--spacing-sm)',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: 'rgba(0,0,0,0.7)',
                  color: 'white',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
                aria-label="Remove image"
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <div 
              onClick={handleCameraCapture}
              style={{
                width: '100%',
                aspectRatio: '4/3',
                border: '2px dashed var(--color-border)',
                borderRadius: 'var(--radius-lg)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 'var(--spacing-sm)',
                color: 'var(--color-text-muted)',
                cursor: disabled || uploading ? 'not-allowed' : 'pointer',
                background: 'var(--color-surface)',
                opacity: disabled || uploading ? 0.6 : 1,
              }}
            >
              <Camera size={32} />
              <span>Tap to capture receipt</span>
              <FileText size={20} style={{ opacity: 0.5 }} />
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />
            </div>
          )}
        </div>

        <Button
          variant="primary"
          onClick={handleSubmit}
          disabled={!preview || !amount || disabled || uploading}
          fullWidth
          leftIcon={uploading ? undefined : <Upload size={16} />}
        >
          {uploading ? 'Processing...' : 'Save Expense'}
        </Button>
      </div>
    </Card>
  )
}