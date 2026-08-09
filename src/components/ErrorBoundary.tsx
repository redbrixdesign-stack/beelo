// ErrorBoundary - Catches React errors and displays fallback UI

import { Component, ReactNode, ErrorInfo } from 'react'
import { Button } from '@components/ui/Button'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Card } from '@components/ui/Card'

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

export class ErrorBoundary extends Component<{ children: ReactNode; fallback?: ReactNode }, ErrorBoundaryState> {
  constructor(props: { children: ReactNode; fallback?: ReactNode }) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo)
    this.setState({ error, errorInfo })
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }
      return (
        <Card padding="xl" style={{ textAlign: 'center' }}>
          <AlertTriangle size={48} style={{ color: 'var(--color-error)', marginBottom: 'var(--spacing-md)' }} />
          <h2 style={{ margin: '0 0 var(--spacing-sm)', fontSize: '1.125rem' }}>Something went wrong</h2>
          <p style={{ color: 'var(--color-text-muted)', marginBottom: 'var(--spacing-lg)' }}>
            {this.state.error?.message || 'An unexpected error occurred'}
          </p>
          <Button variant="primary" onClick={this.handleRetry} leftIcon={<RefreshCw size={16} />}>
            Try Again
          </Button>
        </Card>
      )
    }

    return this.props.children
  }
}