
import { Input } from '@/components/ui'

export const airports = [
  { iata: 'DAL', name: 'Dallas Love Field' },
  { iata: 'ADS', name: 'Addison Airport' },
  { iata: 'DFW', name: 'Dallas/Fort Worth Intl' },
  { iata: 'TEB', name: 'Teterboro' },
  { iata: 'HPN', name: 'Westchester County' },
  { iata: 'MMU', name: 'Morristown' },
  { iata: 'VNY', name: 'Van Nuys' },
  { iata: 'ASE', name: 'Aspen/Pitkin County' },
]

export type QueryState = { from: string; to: string; start: string; end: string; seats: number; classPref: string }

export function AirportSelect({ value, onChange }: { value: string; onChange: (v:string)=>void }) {
  return (
    <div className="relative">
      <Input list="airports" value={value} onChange={(e)=>onChange(e.target.value.toUpperCase())} maxLength={3} placeholder="DAL" />
      <datalist id="airports">
        {airports.map(a => <option key={a.iata} value={a.iata}>{a.name}</option>)}
      </datalist>
    </div>
  )
}
