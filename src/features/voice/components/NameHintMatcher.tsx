// Name hint matcher component
// Matches VoiceNote to Customer based on extracted name spoken

import { useState, useEffect, useCallback } from 'react'
import { useDexie } from '@hooks/useDexie'
import { useAuth } from '@hooks/useAuth'
import { useToast } from '@components/ui/Toast'
import { Card } from '@components/ui/Card'
import { Badge } from '@components/ui/Badge'
import { Button } from '@components/ui/Button'
import { Users, CheckCircle } from 'lucide-react'
import { enqueueSync } from '@lib/sync'
import type { CustomerDexie, VoiceNoteDexie } from '@lib/dexie'

interface NameHintMatcherProps {
  voiceNote: VoiceNoteDexie
  onMatch: (customerId: number, matchMethod: 'name_hint') => Promise<void>
  onSkip: () => void
}

export function NameHintMatcher({ voiceNote, onMatch, onSkip }: NameHintMatcherProps) {
  const { db, isReady } = useDexie()
  const { advisor } = useAuth()
  const { showToast } = useToast()
  const [customers, setCustomers] = useState<CustomerDexie[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [matchedCustomer, setMatchedCustomer] = useState<CustomerDexie | null>(null)

  const extractedName = voiceNote.extracted_name_spoken

  useEffect(() => {
    if (!isReady || !advisor) return
    loadCustomers()
  }, [isReady, advisor])

  const loadCustomers = async () => {
    if (!advisor) return
    setLoading(true)
    try {
      const data = await db.customers
        .where('advisorId')
        .equals(advisor.id!)
        .sortBy('createdAt')
      setCustomers(data.reverse())
    } catch (err) {
      console.error('Failed to load customers for name hint:', err)
    } finally {
      setLoading(false)
    }
  }

  // Fuzzy matching function
  const getMatchScore = (name1: string, name2: string): number => {
    const n1 = name1.toLowerCase().trim()
    const n2 = name2.toLowerCase().trim()
    
    if (n1 === n2) return 100
    if (n1.includes(n2) || n2.includes(n1)) return 80
    
    // Simple word overlap scoring
    const words1 = n1.split(/\s+/).filter(w => w.length > 2)
    const words2 = n2.split(/\s+/).filter(w => w.length > 2)
    const overlap = words1.filter(w => words2.includes(w)).length
    const total = new Set([...words1, ...words2]).size
    
    return Math.round((overlap / total) * 60) + 20
  }

  const scoredCustomers = customers
    .filter(c => c.displayName)
    .map(c => ({
      ...c,
      matchScore: getMatchScore(extractedName || '', c.displayName!)
    }))
    .filter(c => c.matchScore >= 30)
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, 10)

  const handleMatch = async (customer: CustomerDexie) => {
    await onMatch(customer.id, 'name_hint')
    showToast(`Matched to ${customer.displayName}`, 'success')
  }

  if (loading) {
    return (
      <Card padding="md" style={{ textAlign: 'center' }}>
        <div style={{ color: 'var(--color-text-muted)' }}>Loading customers...</div>
      </Card>
    )
  }

  if (!extractedName) {
    return (
      <Card padding="md" style={{ textAlign: 'center' }}>
        <AlertCircle size={32} style={{ color: 'var(--color-warning)', marginBottom: 'var(--spacing-sm)' }} />
        <p style={{ margin: '0 0 var(--spacing-md)', color: 'var(--color-text-muted)' }}>
          No name was extracted from the voice note
        </p>
        <Button variant="ghost" size="sm" onClick={onSkip}>
          Try manual matching
        </Button>
      </Card>
    )
  }

  if (scoredCustomers.length === 0) {
    return (
      <Card padding="md" style={{ textAlign: 'center' }}>
        <AlertCircle size={32} style={{ color: 'var(--color-warning)', marginBottom: 'var(--spacing-sm)' }} />
        <p style={{ margin: '0 0 var(--spacing-md)' }}>
          No customers found with similar names
        </p>
        <Button variant="ghost" size="sm" onClick={onSkip}>
          Try manual matching
        </Button>
      </Card>
    )
  }

  return (
    <Card padding="md">
      <h3 style={{ margin: '0 0 var(--spacing-sm)', fontSize: '0.9rem', fontWeight: 600 }}>
        Name Hint Match
      </h3>
      
      <div style={{ 
        marginBottom: 'var(--spacing-md)', 
        padding: 'var(--spacing-sm)', 
        background: 'var(--color-primary-muted)', 
        borderRadius: 'var(--radius-md)',
        fontSize: '0.8rem',
        color: 'var(--color-primary)'
      }}>
        <strong>Extracted name:</strong> "{extractedName}"
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
        {scoredCustomers.map(customer => (
          <NameMatchCard
            key={customer.id}
            customer={customer}
            onSelect={() => {
              setMatchedCustomer(customer)
              setTimeout(() => onMatch(customer.id, 'name_hint'), 200)
            }}
          />
        ))}

        <Button variant="ghost" size="sm" onClick={onSkip} style={{ marginTop: 'var(--spacing-md)', width: '100%' }}>
          Skip to manual matching
        </Button>
      </div>
    </Card>
  )
}

function NameMatchCard({ customer, onSelect }: { customer: CustomerDexie & { matchScore: number }; onSelect: () => void }) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'var(--color-success)'
    if (score >= 50) return 'var(--color-warning)'
    return 'var(--color-text-muted)'
  }

  return (
    <div
      onClick={onSelect}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 'var(--spacing-sm)',
        background: 'var(--color-bg)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        cursor: 'pointer',
        transition: 'all var(--transition-fast)'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', flex: 1, minWidth: 0 }}>
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
          <Users size={20} />
        </div>
        
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 500, fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {customer.displayName}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
            #{customer.customerNumber} {customer.phone ? `• ${customer.phone}` : ''}
          </div>
        </div>
      </div>
      
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'flex-end', 
        gap: '2px',
        minWidth: '60px'
      }}>
        <span style={{ 
          fontSize: '0.7rem', 
          fontWeight: 600, 
          color: getScoreColor(customer.matchScore)
        }}>
          {customer.matchScore}% match
        </span>
        {customer.address && (
          <span style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '120px' }}>
            {customer.address}
          </span>
        )}
      </div>
      
      <CheckCircle size={20} style={{ color: 'var(--color-primary)', marginLeft: 'var(--spacing-sm)' }} />
    </div>
  )
}