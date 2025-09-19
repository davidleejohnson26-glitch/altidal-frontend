
'use client'
import { useEffect } from 'react'
import { Chip, Button } from '@/components/ui'
import { MapPin, Calendar, Mail, X } from 'lucide-react'
import { formatMoney } from '@/lib/utils'

export function DetailModal({ leg, onClose, onInquire }: any) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-xl ring-1 ring-slate-200">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <div className="text-sm font-semibold">Empty leg details</div>
          <button onClick={onClose} className="rounded-full p-1 hover:bg-slate-100"><X className="h-4 w-4" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex items-center gap-2 text-slate-800">
            <MapPin className="h-4 w-4 text-sky-600" />
            <span className="font-semibold">{leg.from.city} ({leg.from.iata}) → {leg.to.city} ({leg.to.iata})</span>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
            <Chip><Calendar className="mr-1 h-3 w-3" /> {new Date(leg.depStart).toLocaleString()} – {new Date(leg.depEnd).toLocaleTimeString()}</Chip>
            <Chip>{leg.aircraft.type}</Chip>
            <Chip>{leg.aircraft.seats} seats</Chip>
            <Chip className="capitalize">{leg.aircraft.class.replaceAll('_',' ')}</Chip>
            <Chip>Source: {leg.source}</Chip>
          </div>
          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div>
              <div className="text-xs uppercase tracking-wide text-slate-500">From</div>
              <div className="text-2xl font-semibold">{formatMoney(leg.price.amount)}</div>
              {leg.price.estimate && <div className="text-xs text-slate-500">Estimate – subject to operator confirmation</div>}
            </div>
            <Button onClick={onInquire}><Mail className="h-4 w-4" /> Inquire</Button>
          </div>
        </div>
      </div>
    </div>
  )
}
