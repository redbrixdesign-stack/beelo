// DocumentCapture - Camera/gallery upload UI for documents

import { useState, useRef } from 'react'
import { Camera, FileText, X, Upload } from 'lucide-react'
import { Card } from '@components/ui/Card'
import { Button } from '@components/ui/Button'
import { Input } from '@components/ui/Input'
import { Select } from '@components/ui/Select'
import { DOCUMENT_TYPES, DocumentType } from '@lib/constants'

interface DocumentCaptureProps {
  onCapture: (file: File, type: DocumentType, subtype?: string, notes?: string) => Promise<void>
  disabled?: boolean
}

export function DocumentCapture({ onCapture, disabled }: DocumentCaptureProps) {
  const [selectedType, setSelectedType] = useState<DocumentType>('quote_or_receipt')
  const [subtype, setSubtype] = useState('')
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
      // Convert base64 to file
      const response = await fetch(preview)
      const blob = await response.blob()
      const file = new File([blob], `document-${Date.now()}.jpg`, { type: 'image/jpeg' })
      
      await onCapture(file, selectedType, subtype || undefined, notes || undefined)
      
      setPreview(null)
      setSubtype('')
      setNotes('')
    } catch (err) {
      console.error('Failed to capture document:', err)
    } finally {
      setUploading(false)
    }
  }

  const handleRemove = () => {
    setPreview(null)
  }

  return (
    <Card padding="lg">
      <h3 style={{ margin: '0 0 var(--spacing-lg)', fontSize: '1rem', fontWeight: 600 }}>Capture Document</h3>

      <Select
        label="Document Type"
        value={selectedType}
        onChange={e => setSelectedType(e.target.value as DocumentType)}
        options={DOCUMENT_TYPES.map(t => ({ value: t, label: t.replace(/_/g, ' ') }))}
        disabled={disabled || uploading}
      />

      {(selectedType === 'quote_or_receipt' || selectedType === 'fit_completion_receipt') && (
        <Input
          label="Subtype (optional)"
          placeholder="e.g. roller, venetian, roman"
          value={subtype}
          onChange={e => setSubtype(e.target.value)}
          disabled={disabled || uploading}
        />
      )}

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
              alt="Document preview" 
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
            <span>Tap to capture or upload</span>
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
        disabled={!preview || disabled || uploading}
        fullWidth
        leftIcon={uploading ? undefined : <Upload size={16} />}
        style={{ marginTop: 'var(--spacing-lg)' }}
      >
        {uploading ? 'Processing...' : 'Save Document'}
      </Button>
    </Card>
  )
}