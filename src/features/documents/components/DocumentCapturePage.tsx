// DocumentCapturePage - Wrapper for the capture route that provides onCapture handler

import { useNavigate } from 'react-router-dom'
import { Layout } from '@components/layout/Layout'
import { DocumentCapture } from '@features/documents/components/DocumentCapture'
import { useDocuments } from '@features/documents/hooks/useDocuments'

export function DocumentCapturePage() {
  const navigate = useNavigate()
  const { createDocument } = useDocuments()

  const handleCapture = async (file: File, _type?: string, _subtype?: string, _notes?: string) => {
    await createDocument({
      type: 'quote_or_receipt', // placeholder, will be auto-classified
      imagePath: URL.createObjectURL(file),
      status: 'uploaded',
      matchStatus: 'unmatched',
      sourceEnv: (import.meta.env.VITE_SOURCE_ENV as any) || 'live',
    })
    navigate('/documents')
  }

  return (
    <Layout title="Capture Document" showBack onBack={() => window.history.back()}>
      <DocumentCapture onCapture={handleCapture} />
    </Layout>
  )
}