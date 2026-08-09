// DocumentCapturePage - Wrapper for the capture route that provides onCapture handler

import { useNavigate } from 'react-router-dom'
import { Layout } from '@components/layout/Layout'
import { DocumentCapture } from '@features/documents/components/DocumentCapture'
import { useDocuments } from '@features/documents/hooks/useDocuments'
import { useToast } from '@components/ui/Toast'

export function DocumentCapturePage() {
  const navigate = useNavigate()
  const { createDocument } = useDocuments()
  const { showToast } = useToast()

  const handleCapture = async (file: File, _type?: string, _subtype?: string, _notes?: string) => {
    try {
      await createDocument({
        type: 'quote_or_receipt', // placeholder, will be auto-classified
        imagePath: URL.createObjectURL(file),
        status: 'uploaded',
        matchStatus: 'unmatched',
        sourceEnv: (import.meta.env.VITE_SOURCE_ENV as any) || 'live',
      })
      showToast('Document saved! OCR will run when online.', 'success')
      navigate('/documents')
    } catch (err) {
      showToast(`Failed to save: ${err instanceof Error ? err.message : 'Unknown error'}`, 'error')
    }
  }

  return (
    <Layout title="Capture Document" showBack onBack={() => window.history.back()}>
      <DocumentCapture onCapture={handleCapture} />
    </Layout>
  )
}