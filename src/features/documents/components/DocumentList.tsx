// DocumentList - List component for uploaded documents

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, Clock, ChevronRight, Filter } from 'lucide-react'
import { Card } from '@components/ui/Card'
import { Badge } from '@components/ui/Badge'
import { Button } from '@components/ui/Button'
import { Input } from '@components/ui/Input'
import { Select } from '@components/ui/Select'
import { useDocuments } from '../hooks/useDocuments'
import { DOCUMENT_TYPES, DocumentType, DOCUMENT_STATUSES, DocumentStatus } from '@lib/constants'
import { supabase, getDocumentImageUrl } from '@lib/supabase'
import type { DocumentDexie } from '@lib/dexie'

export function DocumentList() {
  const navigate = useNavigate()
  const { documents, loading, loadDocuments } = useDocuments()
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<DocumentType | 'all'>('all')
  const [statusFilter, setStatusFilter] = useState<DocumentStatus | 'all'>('all')
  const [imageUrls, setImageUrls] = useState<Record<number, string>>({})

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = !search || 
      doc.type.toLowerCase().includes(search.toLowerCase()) ||
      doc.subtype?.toLowerCase().includes(search.toLowerCase())
    const matchesType = typeFilter === 'all' || doc.type === typeFilter
    const matchesStatus = statusFilter === 'all' || doc.status === statusFilter
    return matchesSearch && matchesType && matchesStatus
  })

  const getStatusBadge = (status: DocumentStatus) => {
    const variants: Record<DocumentStatus, 'success' | 'warning' | 'info' | 'default' | 'error'> = {
      uploaded: 'default',
      processing: 'info',
      parsed: 'success',
      matched: 'success',
      error: 'error',
      ocr_failed: 'error',
    }
    return <Badge variant={variants[status]} size="sm">{status}</Badge>
  }

  const getTypeBadge = (type: DocumentType) => {
    return <Badge variant="info" size="sm">{type.replace(/_/g, ' ')}</Badge>
  }

  const getTypeIcon = (type: DocumentType) => {
    switch (type) {
      case 'appointment_card':
      case 'delivery_drop_note':
        return <Image size={16} />
      default:
        return <FileText size={16} />
    }
  }

  const handleDocClick = (doc: DocumentDexie) => {
    navigate(`/documents/${doc.id}`)
  }

  useEffect(() => {
    loadDocuments()
  }, [loadDocuments])

  useEffect(() => {
    const fetchUrls = async () => {
      const urls: Record<number, string> = {}
      for (const doc of documents) {
        if (doc.imagePath) {
          urls[doc.id!] = await getDocumentImageUrl(doc.imagePath)
        }
      }
      setImageUrls(urls)
    }
    fetchUrls()
  }, [documents])

  if (loading) {
    return <div style={{ padding: 'var(--spacing-xl)', textAlign: 'center' }}>Loading...</div>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 600 }}>Documents</h1>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-md)' }}>
        <Input
          placeholder="Search..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          leftIcon={<Filter size={18} />}
          style={{ flex: 1, minWidth: '200px' }}
        />
        <Select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value as DocumentType | 'all')}
          options={['all', ...DOCUMENT_TYPES].map(t => ({ value: t, label: t === 'all' ? 'All Types' : t.replace(/_/g, ' ') }))}
          style={{ minWidth: '150px' }}
        />
        <Select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as DocumentStatus | 'all')}
          options={['all', ...DOCUMENT_STATUSES].map(s => ({ value: s, label: s === 'all' ? 'All Status' : s }))}
          style={{ minWidth: '150px' }}
        />
      </div>

      {filteredDocuments.length === 0 ? (
        <Card padding="xl" style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>
          {documents.length === 0 ? 'No documents yet. Use "Capture Document" to add one.' : 'No documents match your filters.'}
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
          {filteredDocuments.map(doc => (
            <Card
              key={doc.id}
              onClick={() => handleDocClick(doc)}
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
                {doc.imagePath && (
                  <img 
                    src={imageUrls[doc.id!] || doc.imagePath} 
                    alt="Document" 
                    style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'var(--radius-sm)' }}
                  />
                )}
              </div>
              
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', flexWrap: 'wrap' }}>
                  <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600 }}>
                    {doc.type.replace(/_/g, ' ')}
                  </h3>
                  {getStatusBadge(doc.status)}
                  {getTypeBadge(doc.type)}
                </div>
                {doc.subtype && (
                  <div style={{ marginTop: 'var(--spacing-xs)', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                    {doc.subtype}
                  </div>
                )}
                <div style={{ marginTop: 'var(--spacing-xs)', fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                  {doc.additionalNotes && (
                    <span style={{ display: 'inline-block', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {doc.additionalNotes}
                    </span>
                  )}
                </div>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 'var(--spacing-xs)' }}>
                <Clock size={16} style={{ color: 'var(--color-text-muted)' }} />
                <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                  {new Date(doc.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                </span>
                <ChevronRight size={20} style={{ color: 'var(--color-text-muted)' }} />
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

import type { DocumentDexie } from '@lib/dexie'