// DocumentCapture - Camera/gallery upload UI for documents (auto-classifies)

import { useState, useRef } from 'react'
import { Camera, FileText, X, Upload, Zap } from 'lucide-react'
import { Card } from '@components/ui/Card'
import { Button } from '@components/ui/Button'
import { Badge } from '@components/ui/Badge'
import { useToast } from '@components/ui/Toast'

interface DocumentCaptureProps {
  onCapture: (file: File, type?: string, subtype?: string, notes?: string) => Promise<void>
  disabled?: boolean
}

export function DocumentCapture({ onCapture, disabled }: DocumentCaptureProps) {
  const { showToast } = useToast()
  const [preview, setPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [detectedType, setDetectedType] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => setPreview(e.target?.result as string)
      reader.readAsDataURL(file)
      setDetectedType(null)
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
      const file = new File([blob], `document-${Date.now()}.jpg`, { type: 'image/jpeg' })
      
      await onCapture(file, undefined, undefined, undefined)
      
      showToast('Document saved! OCR will run when online.', 'success')
      
      setPreview(null)
      setDetectedType(null)
    } catch (err) {
      console.error('Failed to capture document:', err)
      showToast(`Failed to save: ${err instanceof Error ? err.message : 'Unknown error'}`, 'error')
    } finally {
      setUploading(false)
    }
  }

  const handleRemove = () => {
    setPreview(null)
    setDetectedType(null)
  }

  return (
    <Card padding="lg">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-lg)' }}>
        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>Capture Document</h3>
        <Badge variant="info" size="sm">
          <Zap size={12} style={{ marginRight: 4 }} /> Auto-detects type
        </Badge>
      </div>

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
                width: '44px',
                height: '44px',
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
              <X size={20} />
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

      {detectedType && (
        <div style={{ marginTop: 'var(--spacing-md)', padding: 'var(--spacing-sm)', background: 'var(--color-primary-muted)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
          <FileText size={16} style={{ color: 'var(--color-primary)' }} />
          <span style={{ fontSize: '0.85rem', color: 'var(--color-primary)' }}>
            Detected: {detectedType.replace(/_/g, ' ')}
          </span>
        </div>
      )}

      <Button
        variant="primary"
        onClick={handleSubmit}
        disabled={!preview || disabled || uploading}
        loading={uploading}
        fullWidth
        leftIcon={uploading ? undefined : <Upload size={16} />}
        style={{ marginTop: 'var(--spacing-lg)' }}
      >
        {uploading ? 'Processing...' : 'Save Document'}
      </Button>
    </Card>
  )
}