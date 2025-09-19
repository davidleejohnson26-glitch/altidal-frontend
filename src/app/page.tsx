
'use client'

import type React from "react";
import { useEffect, useMemo, useState } from 'react'
import { Search, Bell } from 'lucide-react'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { Card } from '@/components/ui'
import { AirportSelect, QueryState, airports } from '@/components/inputs'
import { Results } from '@/components/results'
import { MapPanel } from '@/components/map-panel'
import { OperatorCTA } from '@/components/operator-cta'
import { AlertModal } from '@/components/modals/alert-modal'
import { DetailModal } from '@/components/modals/detail-modal'
import { InquiryModal } from '@/components/modals/inquiry-modal'
import { Input, Button, Select } from '@/components/ui'
import { MOCK_LEGS } from '@/lib/mock'

export default function Page() {
  const [query, setQuery] = useState<QueryState>({ from: 'DAL', to: 'TEB', start: '', end: '', seats: 2, classPref: 'any' })
  const [loading, setLoading] = useState(false)
  const [legs, setLegs] = useState(MOCK_LEGS)
  const [selected, setSelected] = useState<any | null>(null)
  const [showAlert, setShowAlert] = useState(false)
  const [toast, setToast] = useState<{type:'ok'|'err', text:string} | null>(null)

  const filtered = useMemo(() => {
    return legs.filter(l => {
      const from = query.from ? l.from.iata === query.from : true
      const to = query.to ? l.to.iata === query.to : true
      const seats = query.seats ? (l.aircraft?.seats || 0) >= query.seats : true
      const cls = query.classPref && query.classPref !== 'any' ? l.aircraft.class === query.classPref : true
      return from && to && seats && cls
    })
  }, [legs, query])

  const doSearch = (e?: React.FormEvent) => {
    e?.preventDefault()
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      setToast({ type: 'ok', text: `${filtered.length} result(s) found` })
      setTimeout(() => setToast(null), 2000)
    }, 600)
  }

  useEffect(() => { doSearch() }, [])

  return (
    <div className="min-h-screen">
      <Header />

      <main className="mx-auto max-w-7xl px-4 pb-24">
        <section className="mx-auto mt-8 max-w-5xl">
          <div className="grid items-center gap-6 md:grid-cols-5">
            <div className="md:col-span-3">
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Search empty‑leg private flights</h1>
              <p className="mt-2 max-w-xl text-sm text-slate-600">
                Real‑time repositioning legs from trusted operators and brokers. Save routes to get instant alerts.
              </p>
            </div>
            <Card className="md:col-span-2">
              <div className="border-b border-slate-100 p-5 text-sm font-medium text-slate-900 flex items-center gap-2">
                <Search className="h-4 w-4" /> Quick search
              </div>
              <div className="p-5">
                <form onSubmit={doSearch} className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">From (IATA)</label>
                    <AirportSelect value={query.from} onChange={(v)=>setQuery(s=>({...s, from:v}))} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">To (IATA)</label>
                    <AirportSelect value={query.to} onChange={(v)=>setQuery(s=>({...s, to:v}))} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">Earliest</label>
                    <Input
  type="date"
  value={query.start}
  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
    setQuery((s) => ({ ...s, start: e.target.value }))
  }
/>

<Input
  type="date"
  value={query.end}
  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
    setQuery((s) => ({ ...s, end: e.target.value }))
  }
/>

<Input
  type="number"
  min={1}
  max={16}
  value={query.seats}
  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
    setQuery((s) => ({ ...s, seats: Number(e.target.value) }))
  }
/>

<Select
  value={query.classPref}
  onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
    setQuery((s) => ({ ...s, classPref: e.target.value }))
  }/>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">Latest</label>
                    <Input type="date" value={query.end} onChange={(e)=>setQuery(s=>({...s, end:e.target.value}))} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">Seats</label>
                    <Input type="number" min={1} max={16} value={query.seats} onChange={(e)=>setQuery(s=>({...s, seats:Number(e.target.value)}))} />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">Class</label>
                    <Select value={query.classPref} onChange={(e)=>setQuery(s=>({...s, classPref:e.target.value}))}>
                      <option value="any">Any</option>
                      <option value="light">Light</option>
                      <option value="super_light">Super Light</option>
                      <option value="midsize">Midsize</option>
                      <option value="super_midsize">Super Midsize</option>
                      <option value="heavy">Heavy</option>
                    </Select>
                  </div>
                  <div className="col-span-2 flex items-center justify-between gap-3">
                    <Button type="submit" className="w-full"><Search className="h-4 w-4" /> Search</Button>
                    <Button type="button" variant="outline" className="w-full" onClick={()=>setShowAlert(true)}><Bell className="h-4 w-4" /> Save alert</Button>
                  </div>
                </form>
              </div>
            </Card>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 mt-10">
          <div className="lg:col-span-2">
            <Results loading={loading} legs={filtered} onOpen={(l)=>setSelected(l)} onSaveAlert={()=>setShowAlert(true)} />
          </div>
          <div>
            <MapPanel legs={filtered} />
            <OperatorCTA />
          </div>
        </div>
      </main>

      <Footer />

      {selected && (
        <DetailModal leg={selected} onClose={()=>setSelected(null)} onInquire={()=>setSelected({...selected, inquire:true})} />
      )}
      {selected?.inquire && (
        <InquiryModal leg={selected} onClose={()=>setSelected(null)} onSuccess={()=>setToast({type:'ok', text:'Inquiry sent'})} />
      )}
      {showAlert && (
        <AlertModal query={query} onClose={()=>setShowAlert(false)} onSuccess={()=>setToast({type:'ok', text:'Alert created'})} />
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2">
          <div className={`rounded-full px-4 py-2 shadow-lg ${toast.type==='ok'?'bg-emerald-600 text-white':'bg-slate-900 text-white'}`}>{toast.text}</div>
        </div>
      )}
    </div>
  )
}
