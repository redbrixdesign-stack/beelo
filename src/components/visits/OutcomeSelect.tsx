import { Select } from '../ui/Select'
import { OUTCOME_TAXONOMY, type OutcomeTaxonomy } from '../../lib/constants'

interface OutcomeSelectProps {
  value: OutcomeTaxonomy | ''
  onChange: (value: OutcomeTaxonomy | undefined) => void
  label?: string
  error?: string
  fullWidth?: boolean
}

export function OutcomeSelect({ value, onChange, label = 'Outcome', error, fullWidth = true }: OutcomeSelectProps) {
  const options = [
    { value: '', label: 'Select outcome...' },
    ...OUTCOME_TAXONOMY.map(o => ({ value: o, label: o }))
  ]

  return (
    <Select
      label={label}
      value={value}
      onChange={(e) => onChange(e.target.value as OutcomeTaxonomy || undefined)}
      options={options}
      error={error}
      fullWidth={fullWidth}
    />
  )
}