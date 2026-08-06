import { useState } from 'react'
import { Mail } from 'lucide-react'
import { useToast } from '../ui/Toast'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'

export function MagicLinkForm() {
  const { showToast } = useToast()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) {
      setError('Email is required')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Invalid email format')
      return
    }

    setLoading(true)
    setError('')
    try {
      const { signInWithMagicLink } = await import('../../lib/auth')
      await signInWithMagicLink(email)
      showToast('Magic link sent! Check your email.', 'success')
      setEmail('')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to send magic link'
      showToast(message, 'error')
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
      <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.875rem', margin: 0 }}>
        Or sign in with a magic link
      </p>
      
      <Input
        label="Email"
        type="email"
        value={email}
        onChange={(e) => { setEmail(e.target.value); setError('') }}
        error={error}
        placeholder="you@example.com"
        autoComplete="email"
        fullWidth
        leftIcon={<Mail size={20} />}
      />

      <Button type="submit" loading={loading} fullWidth variant="secondary">
        <Mail size={18} /> Send Magic Link
      </Button>
    </form>
  )
}