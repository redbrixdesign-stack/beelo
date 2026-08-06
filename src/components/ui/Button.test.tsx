import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Button } from './Button'

describe('Button', () => {
  it('renders children', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument()
  })

  it('applies variant styles via style prop', () => {
    const { rerender } = render(<Button variant="primary">Primary</Button>)
    const button = screen.getByRole('button')
    expect(button).toHaveAttribute('style')
    const style = button.getAttribute('style') || ''
    // Hover style is applied by default (not disabled)
    expect(style).toContain('var(--color-primary-hover)')

    rerender(<Button variant="secondary">Secondary</Button>)
    const style2 = screen.getByRole('button').getAttribute('style') || ''
    expect(style2).toContain('var(--color-surface-hover)')

    rerender(<Button variant="danger">Danger</Button>)
    const style3 = screen.getByRole('button').getAttribute('style') || ''
    expect(style3).toContain('brightness(1.1)')
  })

  it('applies base variant styles when disabled', () => {
    const { rerender } = render(<Button variant="primary" disabled>Primary</Button>)
    const button = screen.getByRole('button')
    expect(button).toBeDisabled()
    const style = button.getAttribute('style') || ''
    expect(style).toContain('var(--color-primary)')
    expect(style).not.toContain('var(--color-primary-hover)')

    rerender(<Button variant="secondary" disabled>Secondary</Button>)
    const style2 = screen.getByRole('button').getAttribute('style') || ''
    expect(style2).toContain('var(--color-surface)')
  })

  it('applies size styles via style prop', () => {
    const { rerender } = render(<Button size="sm">Small</Button>)
    const style = screen.getByRole('button').getAttribute('style') || ''
    expect(style).toContain('0.875rem')

    rerender(<Button size="lg">Large</Button>)
    const style2 = screen.getByRole('button').getAttribute('style') || ''
    expect(style2).toContain('1.125rem')
  })

  it('shows loading state', () => {
    render(<Button loading>Loading</Button>)
    const button = screen.getByRole('button')
    expect(button).toBeDisabled()
    expect(button).toContainHTML('svg')
  })

  it('disables button when disabled prop is set', () => {
    render(<Button disabled>Disabled</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('calls onClick handler', () => {
    const handleClick = vi.fn()
    render(<Button onClick={handleClick}>Click me</Button>)
    fireEvent.click(screen.getByRole('button'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('does not call onClick when disabled', () => {
    const handleClick = vi.fn()
    render(<Button disabled onClick={handleClick}>Click me</Button>)
    fireEvent.click(screen.getByRole('button'))
    expect(handleClick).not.toHaveBeenCalled()
  })

  it('applies fullWidth style', () => {
    render(<Button fullWidth>Full Width</Button>)
    const style = screen.getByRole('button').getAttribute('style') || ''
    expect(style).toContain('width: 100%')
  })
})