import type React from 'react'
import { Input } from '@/components/ui'

// Temporary hardcoded airport list (expand later)
const airports = [
  { iata: 'DAL', name: 'Dallas Love Field' },
  { iata: 'DFW', name: 'Dallas/Fort Worth International' },
  { iata: 'TEB', name: 'Teterboro Airport' },
  { iata: 'LAX', name: 'Los Angeles International' },
  { iata: 'MIA', name: 'Miami International' },
]

// ✅ Exported type expected by page.tsx
export type QueryState = {
  from: string
  to: string
  start: string
  end: string
  seats: number
  classPref: string
}

export function AirportSelect({
  value,
  onChange,
}: {
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="relative">
      <Input
        list="airports"
        value={value}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
          onChange(e.target.value.toUpperCase())
        }
        maxLength={3}
        placeholder="DAL"
      />
      <datalist id="airports">
        {airports.map((a) => (
          <option key={a.iata} value={a.iata}>
            {a.name}
          </option>
        ))}
      </datalist>
    </div>
  )
}