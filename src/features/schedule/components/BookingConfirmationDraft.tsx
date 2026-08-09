// BookingConfirmationDraft - Draft confirmation message for visit booking
// Always user-approved before sending. Asks about parking + clear windows.

import { useState, useEffect } from 'react'
import { Card } from '@components/ui/Card'
import { Button } from '@components/ui/Button'
import { Input } from '@components/ui/Input'
import { Badge } from '@components/ui/Badge'
import { Copy, Send, Edit, CheckCircle, AlertCircle, Car, Home, AppWindow } from 'lucide-react'
import type { VisitDexie } from '@lib/dexie'

interface BookingConfirmationDraftProps {
  visit: VisitDexie
  onSend?: (message: string) => Promise<void>
  onCopy?: (message: string) => void
  onClose?: () => void
}

const TEMPLATE = `Hi {customer_name}, confirming your appointment for {date} at {time}. 

Please ensure:
✅ Clear access to windows for measurement
✅ Parking available nearby

Let me know if anything changes. Thanks!`

export function BookingConfirmationDraft({ visit, onSend, onCopy, onClose }: BookingConfirmationDraftProps) {
  const [draft, setDraft] = useState('')
  const [copied, setCopied] = useState(false)
  const [sending, setSending] = useState(false)

  useEffect(() => {
    if (visit) {
      const date = new Date(visit.dateTime).toLocaleDateString('en-GB', { 
        weekday: 'short', day: 'numeric', month: 'short' 
      })
      const time = new Date(visit.dateTime).toLocaleTimeString('en-GB', { 
        hour: '2-digit', minute: '2-digit' 
      })
      const message = TEMPLATE
        .replace('{customer_name}', visit.displayName || visit.customerNumber || 'there')
        .replace('{date}', date)
        .replace('{time}', time)
      setDraft(message)
    }
  }, [visit])

  const handleCopy = async () => {
    if (onCopy) {
      await onCopy(draft)
    } else {
      await navigator.clipboard.writeText(draft)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSend = async () => {
    if (!onSend) return
    setSending(true)
    try {
      await onSend(draft)
    } finally {
      setSending(false)
    }
  }

  const parkingKnown = visit.preVisitNotes?.toLowerCase().includes('park') || false
  const windowsClear = visit.preVisitNotes?.toLowerCase().includes('window') || false

  return (
    <Card padding="lg">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--spacing-lg)' }}>
        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
            <Home size={18} style={{ color: 'var(--color-primary)' }} />
            Booking Confirmation Draft
          </span>
        </h3>
        {onClose && (
          <Button variant="ghost" size="sm" onClick={onClose} style={{ padding: 'var(--spacing-xs)' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </Button>
        )}
      </div>

      {/* Pre-flight checks */}
      <div style={{ 
        padding: 'var(--spacing-md)', 
        borderRadius: 'var(--radius-md)', 
        background: 'var(--color-surface)', 
        border: '1px solid var(--color-border)',
        marginBottom: 'var(--spacing-lg)'
      }}>
        <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: 'var(--spacing-sm)' }}>
          Pre-flight checks
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-md)' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', fontSize: '0.8rem', cursor: 'pointer' }}>
            <input type="checkbox" checked={parkingKnown} onChange={e => setDraft(draft.replace('✅ Parking', e.target.checked ? '✅ Parking' : '⬜ Parking'))} />
            <Car size={14} style={{ color: parkingKnown ? 'var(--color-success)' : 'var(--color-text-muted)' }} />
            <span style={{ marginLeft: 'var(--spacing-xs)', color: parkingKnown ? 'var(--color-success)' : 'var(--color-text-muted)' }}>Parking confirmed</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', fontSize: '0.8rem', cursor: 'pointer' }}>
            <input type="checkbox" checked={windowsClear} onChange={e => setDraft(draft.replace('✅ Clear access', e.target.checked ? '✅ Clear access' : '⬜ Clear access'))} />
            <AppWindow size={14} style={{ color: windowsClear ? 'var(--color-success)' : 'var(--color-text-muted)' }} />
            <span style={{ marginLeft: 'var(--spacing-xs)', color: windowsClear ? 'var(--color-success)' : 'var(--color-text-muted)' }}>Windows accessible</span>
          </label>
        </div>
      </div>

      {/* Message editor */}
      <div style={{ marginBottom: 'var(--spacing-lg)' }}>
        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, color: 'var(--color-text-muted)', marginBottom: 'var(--spacing-xs)' }}>
          Message (edit before sending)
        </label>
        <textarea
          value={draft}
          onChange={e => setDraft(e.target.value)}
          rows={6}
          style={{
            width: '100%',
            padding: 'var(--spacing-md)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            background: 'var(--color-background)',
            color: 'var(--color-text)',
            fontFamily: 'inherit',
            fontSize: '0.875rem',
            lineHeight: 1.5,
            resize: 'vertical',
            boxSizing: 'border-box',
          }}
          placeholder="Draft your confirmation message..."
        />
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-md)', justifyContent: 'flex-end' }}>
        <Button variant="secondary" onClick={handleCopy} leftIcon={<Copy size={16} />} disabled={sending}>
          {copied ? 'Copied!' : 'Copy to Clipboard'}
        </Button>
        <Button variant="primary" onClick={handleSend} leftIcon={<Send size={16} />} disabled={sending || !draft.trim()}>
          {sending ? 'Sending...' : 'Send via SMS/WhatsApp'}
        </Button>
      </div>

      <p style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: 'var(--spacing-md)' }}>
        This is a draft. Nothing sends without your approval. Message uses your default SMS app or clipboard.
      </p>
    </Card>
  )
}