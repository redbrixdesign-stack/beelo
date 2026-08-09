// ExpenseCapture - Receipt capture with category selection and OCR

import { useState, useRef } from 'react'
import { Camera, FileText, X, Upload, CreditCard, Receipt, Zap } from 'lucide-react'
import { Card } from '@components/ui/Card'
import { Button } from '@components/ui/Button'
import { Input } from '@components/ui/Input'
import { Select } from '@components/ui/Select'
import { Badge } from '@components/ui/Badge'
import { EXPENSE_CATEGORIES, ExpenseCategory } from '@lib/constants'

interface ExpenseCaptureProps {
  onCapture: (file: File, category?: ExpenseCategory, notes?: string) => Promise<void>
  disabled?: boolean
}

export function ExpenseCapture({ onCapture, disabled }: ExpenseCaptureProps) {
  const [selectedCategory, setSelectedCategory] = useState<ExpenseCategory>('fuel')
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
    if (!preview) return
    setUploading(true)
    try {
      const response = await fetch(preview)
      const blob = await response.blob()
      const file = new File([blob], `expense-${Date.now()}.jpg`, { type: 'image/jpeg' })
      
      await onCapture(file, selectedCategory, notes || undefined)
      
      setPreview(null)
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

  const categoryLabels: Record<ExpenseCategory, string> = {
    fuel: 'Fuel',
    parking: 'Parking',
    materials: 'Materials',
    tools: 'Tools',
    subsistence: 'Subsistence',
    accommodation: 'Accommodation',
    training: 'Training',
    insurance: 'Insurance',
    phone: 'Phone',
    software: 'Software',
    other: 'Other',
  }

  return (
    <Card padding="lg">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-lg)' }}>
        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>
          <CreditCard size={18} style={{ display: 'inline-block', marginRight: 'var(--spacing-sm)', verticalAlign: 'middle', color: 'var(--color-primary)' }} />
          Capture Expense Receipt
        </h3>
        <Badge variant="info" size="sm">
          <Zap size={12} style={{ marginRight: 4 }} /> Auto-extracts merchant/date/amount/VAT
        </Badge>
      </div>

      <Select
        label="Category"
        value={selectedCategory}
        onChange={e => setSelectedCategory(e.target.value as ExpenseCategory)}
        options={EXPENSE_CATEGORIES.map(c => ({ value: c, label: categoryLabels[c] }))}
        disabled={disabled || uploading}
      />

      <Input
        label="Notes (optional)"
        value={notes}
        onChange={e => setNotes(e.target.value)}
        placeholder="Additional context..."
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
            <Receipt size={20} style={{ opacity: 0.5 }} />
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
        disabled={!preview || disabled || uploading}
        fullWidth
        leftIcon={uploading ? undefined : <Upload size={16} />}
        style={{ marginTop: 'var(--spacing-lg)' }}
      >
        {uploading ? 'Processing...' : 'Save Expense'}
      </Button>
    </Card>
  )
}