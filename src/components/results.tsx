
'use client'
import { Card, Chip, Button } from '@/components/ui'
import { Info, Loader2, MapPin, ChevronRight } from 'lucide-react'
import { formatMoney } from '@/lib/utils'

export function Results({ loading, legs, onOpen, onSaveAlert }: any) {
  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold tracking-tight">Results</h2>
        <Button variant="ghost" onClick={onSaveAlert}>Create alert from search</Button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-4 text-slate-600">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading latest empty legs...
        </div>
      ) : legs.length === 0 ? (
        <Card>
          <div className="p-5 flex items-start gap-3 text-slate-600">
            <Info className="mt-0.5 h-4 w-4" />
            <div>
              <div className="font-medium">No matches yet</div>
              <div className="text-sm">Empty legs are dynamic. Try broadening dates or enable alerts to get notified.</div>
            </div>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {legs.map((leg: any) => <LegCard key={leg.id} leg={leg} onOpen={()=>onOpen(leg)} />)}
        </div>
      )}
    </section>
  )
}

function LegCard({ leg, onOpen }: any) {
  return (
    <Card>
      <div className="grid grid-cols-1 md:grid-cols-12">
        <div className="md:col-span-8">
          <div className="flex items-center gap-2 p-5 border-b border-slate-100 text-slate-800">
            <MapPin className="h-4 w-4 text-sky-600" />
            <span className="font-semibold">{leg.from.city} ({leg.from.iata})</span>
            <ChevronRight className="h-4 w-4 text-slate-400" />
            <span className="font-semibold">{leg.to.city} ({leg.to.iata})</span>
            <div className="ml-auto flex items-center gap-2">
              <Chip>{new Date(leg.depStart).toLocaleString()}</Chip>
              <Chip>→ {new Date(leg.depEnd).toLocaleTimeString()}</Chip>
            </div>
          </div>
          <div className="p-5 flex flex-wrap items-center gap-3 text-sm text-slate-600">
            <Chip>{leg.aircraft.type}</Chip>
            <Chip>{leg.aircraft.seats} seats</Chip>
            <Chip className="capitalize">{leg.aircraft.class.replaceAll('_',' ')}</Chip>
            <Chip>Verified {new Date(leg.verifiedAt).toLocaleDateString()}</Chip>
            <Chip className="bg-emerald-50 text-emerald-700 border-emerald-200">{formatMoney(leg.price.amount, leg.price.currency)}</Chip>
          </div>
        </div>
        <div className="md:col-span-4 border-t md:border-l border-slate-100 p-4 flex md:flex-col items-center justify-between gap-4">
          <div className="text-sm">
            <div className="font-medium">Source</div>
            <div className="text-slate-600">{leg.source}</div>
          </div>
          <Button onClick={onOpen}><Info className="h-4 w-4" /> Details</Button>
        </div>
      </div>
    </Card>
  )
}
