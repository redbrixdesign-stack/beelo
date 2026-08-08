// VoiceNoteCard - Card component for displaying a voice note

import { useState } from 'react'
import { Hash, Play, Mic, Trash2, Clock, MapPin, User, AlertTriangle } from 'lucide-react'
import { Card } from '@components/ui/Card'
import { Badge } from '@components/ui/Badge'
import { Button } from '@components/ui/Button'
import { formatDuration } from '@lib/utils'
import { useDexie } from '@hooks/useDexie'
import { useToast } from '@components/ui/Toast'

interface VoiceNoteCardProps {
  note: Record<string, unknown>
  onOpen?: () => void
  compact?: boolean
}

const formatDate = (dateStr: string | Date) => {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-GB', { 
    day: 'numeric', 
    month: 'short', 
    hour: '2-digit', 
    minute: '2-digit' 
  })
}

const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    recorded: 'var(--color-warning)',
    transcribed: 'var(--color-primary)',
    unmatched: 'var(--color-warning)',
    matched: 'var(--color-success)',
    reviewed: 'var(--color-text-muted)',
    error: 'var(--color-error)'
  }
  return colors[status] || 'var(--color-text-muted)'
}

export function VoiceNoteCard({ note, onOpen, compact = false }: VoiceNoteCardProps) {
  const { db } = useDexie()
  const { showToast } = useToast()
  const [deleting, setDeleting] = useState(false)

  const handlePlay = async () => {
    if (!note.audioPath) return
  }

  const handleDelete = async () => {
    if (!confirm('Delete this voice note? This cannot be undone.')) return
    
    setDeleting(true)
    try {
      await db.voiceNotes.delete(note.id!)
      showToast('Voice note deleted', 'success')
    } catch {
      showToast('Failed to delete voice note', 'error')
    } finally {
      setDeleting(false)
    }
  }

  const renderCompact = () => (
    <div
      onClick={onOpen}
      style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        padding: 'var(--spacing-sm)', 
        background: 'var(--color-surface)', 
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--color-border)',
        cursor: onOpen ? 'pointer' : 'default'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', flex: 1, minWidth: 0 }}>
        <div style={{ 
          width: '36px', 
          height: '36px', 
          borderRadius: '50%', 
          background: 'var(--color-primary-muted)',
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          color: 'var(--color-primary)'
        }}>
          <Mic size={18} />
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 500, fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {note.transcript?.slice(0, 50) || 'Voice note'}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
            <Clock size={12} /> {formatDuration(note.durationSeconds * 1000)} • {formatDate(note.recordedAt)}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
          <span style={{ color: getStatusColor(note.status), fontSize: '0.7rem', fontWeight: 600 }}>
            {note.status}
          </span>
          {note.matchedVisitId && <CheckCircle size={14} style={{ color: 'var(--color-success)' }} />}
        </div>
      </div>
    </div>
  )

  const renderFull = () => (
    <Card
      onClick={onOpen}
      hoverable
      padding="md"
      style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-sm)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
          <div style={{ 
            width: '40px', 
            height: '40px', 
            borderRadius: '50%', 
            background: 'var(--color-primary-muted)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center'
          }}>
            <Mic size={20} style={{ color: 'var(--color-primary)' }} />
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>
              {note.transcript?.slice(0, 60) || 'Voice note'}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}>
              <Clock size={12} /> {formatDuration(note.durationSeconds * 1000)} • {formatDate(note.recordedAt)}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
          <div style={{ display: 'flex', gap: '4px' }}>
            <span style={{ color: getStatusColor(note.status), fontSize: '0.7rem', fontWeight: 600 }}>
              {note.status}
            </span>
            {note.triggerMethod && <Badge variant="info" size="sm">{note.triggerMethod.replace('_', ' ')}</Badge>}
            {note.matchedVisitId && <CheckCircle size={14} style={{ color: 'var(--color-success)' }} />}
          </div>
        </div>
      </div>

      {note.transcript && (
        <div style={{ 
          paddingTop: 'var(--spacing-sm)', 
          borderTop: '1px solid var(--color-border)',
          fontSize: '0.8rem',
          lineHeight: 1.5,
          color: 'var(--color-text)'
        }}>
          {note.transcript}
        </div>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-xs)', marginTop: 'var(--spacing-xs)' }}>
        {note.extracted_blind_count && (
          <Badge variant="success" size="sm">
            <Hash size={12} /> {note.extracted_blind_count} blind{note.extracted_blind_count > 1 ? 's' : ''}
          </Badge>
        )}
        {note.extracted_name_spoken && (
          <Badge variant="success" size="sm">
            <User size={10} /> {note.extracted_name_spoken}
          </Badge>
        )}
        {note.extracted_parking_notes && (
          <Badge variant="warning" size="sm">
            <MapPin size={10} /> Parking
          </Badge>
        )}
        {note.extracted_access_notes && (
          <Badge variant="info" size="sm">
            <AlertTriangle size={10} /> Access
          </Badge>
        )}
      </div>

      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        paddingTop: 'var(--spacing-sm)', 
        borderTop: '1px solid var(--color-border)',
        marginTop: 'var(--spacing-sm)'
      }}>
        <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
          <Button variant="ghost" size="sm" onClick={handlePlay} disabled>
            <Play size={14} /> Play
          </Button>
          <Button variant="ghost" size="sm" onClick={handleDelete} disabled={deleting} leftIcon={<Trash2 size={14} />}>
            Delete
          </Button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
          <Clock size={12} /> {formatDate(note.createdAt)}
        </div>
      </div>
    </Card>
  )

  if (compact) {
    return renderCompact()
  }

  return renderFull()
}