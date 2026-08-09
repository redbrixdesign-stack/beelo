import { useNavigate } from 'react-router-dom'
import { Layout } from '@components/layout/Layout'
import { Card } from '@components/ui/Card'
import { Button } from '@components/ui/Button'
import { Plus, FileText, Camera, Search, Filter } from 'lucide-react'
import { useDocuments } from '@features/documents/hooks/useDocuments'
import { DOCUMENT_TYPES, DocumentType } from '@lib/constants'
import { DocumentCapture } from '@features/documents/components/DocumentCapture'
import { DocumentList } from '@features/documents/components/DocumentList'
import { useState } from 'react'
import { Badge } from '@components/ui/Badge'
import { Input } from '@components/ui/Input'
import { Select } from '@components/ui/Select'

export function Documents() {
  const navigate = useNavigate()
  const { documents, loading, loadDocuments, createDocument, deleteDocument } = useDocuments()
  const [typeFilter, setTypeFilter] = useState<DocumentType | 'all'>('all')
  const [search, setSearch] = useState('')

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = !search || 
      doc.type.toLowerCase().includes(search.toLowerCase()) ||
      doc.subtype?.toLowerCase().includes(search.toLowerCase())
    const matchesType = typeFilter === 'all' || doc.type === typeFilter
    return matchesSearch && matchesType
  })

  const getTypeBadge = (type: DocumentType) => {
    const labels: Record<DocumentType, string> = {
      appointment_card: 'Appointment Card',
      quote_or_receipt: 'Quote/Receipt',
      fit_completion_receipt: 'Fit Completion',
      delivery_drop_note: 'Delivery Note',
      commission_statement: 'Commission Stmt',
      expense_receipt: 'Expense',
      dor_receipt: 'DOR Receipt',
    }
    return <Badge variant="info" size="sm">{labels[type]}</Badge>
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'success' | 'warning' | 'info' | 'default' | 'error'> = {
      uploaded: 'default',
      processing: 'info',
      parsed: 'success',
      matched: 'success',
      error: 'error',
      ocr_failed: 'error',
    }
    return <Badge variant={variants[status] || 'default'} size="sm">{status}</Badge>
  }

  const handleCapture = async (file: File, _type?: string, _subtype?: string, _notes?: string) => {
    await createDocument({
      type: 'quote_or_receipt', // placeholder, will be auto-classified
      imagePath: URL.createObjectURL(file),
      status: 'uploaded',
      matchStatus: 'unmatched',
      sourceEnv: (import.meta.env.VITE_SOURCE_ENV as any) || 'live',
    })
  }

  if (loading) {
    return <div style={{ padding: 'var(--spacing-xl)', textAlign: 'center' }}>Loading...</div>
  }

  return (
    <Layout title="Documents">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 600 }}>Documents</h1>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-lg)' }}>
          <DocumentCapture onCapture={handleCapture} />
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-md)' }}>
          <Input
            placeholder="Search..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            leftIcon={<Search size={18} />}
            style={{ flex: 1, minWidth: '200px' }}
          />
          <Select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value as DocumentType | 'all')}
            options={['all', ...DOCUMENT_TYPES].map(t => ({ value: t, label: t === 'all' ? 'All Types' : t.replace(/_/g, ' ') }))}
            style={{ minWidth: '150px' }}
          />
        </div>

        {filteredDocuments.length === 0 ? (
          <Card padding="xl" style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>
            {documents.length === 0 ? 'No documents yet. Tap "Capture Document" to add one.' : 'No documents match your filters.'}
          </Card>
        ) : (
          <DocumentList documents={filteredDocuments} onOpen={(doc) => navigate(`/documents/${doc.id}`)} />
        )}
      </div>
    </Layout>
  )
}