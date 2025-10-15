'use client'
import type React from 'react'
import { useEffect, useMemo, useState } from 'react'
import { Search, Bell } from 'lucide-react'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { Card } from '@/components/ui'
import { AirportSelect, QueryState } from '@/components/inputs'
import { Results } from '@/components/results'
import { MapPanel } from '@/components/map-panel'
import { OperatorCTA } from '@/components/operator-cta'
import { AlertModal } from '@/components/modals/alert-modal'
import { DetailModal } from '@/components/modals/detail-modal'
import { InquiryModal } from '@/components/modals/inquiry-modal'
import { Input, Button, Select } from '@/components/ui'


export default function Page() {
  const [query, setQuery] = useState<QueryState>({
    from: 'DAL',
    to: 'TEB',
    start: '',
    end: '',
    seats: 2,
    classPref: 'any',
  })
  const [loading, setLoading] = useState(false)
  const [legs, setLegs] = useState<any[]>([])
  const [selected, setSelected] = useState<any | null>(null)
  const [showAlert, setShowAlert] = useState(false)
  const [toast, setToast] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  // UI values -> API enum mapping
  const classValueForApi = (val: string) => {
    const map: Record<string, string> = {
      any: '',
      light: 'light',
      super_light: 'light',          // keep showing in UI; API has 'light' only
      midsize: 'midsize',
      super_midsize: 'super-midsize',
      heavy: 'heavy',
      ultra_long: 'ultra-long',
    }
    return map[val] ?? ''
  }

  // Fetch from API using current filters
  const doSearch = async (e?: React.FormEvent) => {
    e?.preventDefault()
    try {
      setLoading(true)

      const params = new URLSearchParams()
      if (query.from) params.set('from', query.from)
      if (query.to) params.set('to', query.to)
      if (query.start) params.set('start', query.start)
      if (query.end) params.set('end', query.end)
      if (query.seats) params.set('seats', String(query.seats))
      const apiClass = classValueForApi(query.classPref)
      if (apiClass) params.set('class', apiClass)

      const res = await fetch(`/api/legs?${params.toString()}`, { cache: 'no-store' })
      if (!res.ok) throw new Error(`API ${res.status}`)

      const data = await res.json()

const normalized = (Array.isArray(data.legs) ? data.legs : []).map((l: any) => {
  // Base depart time
  const depart = new Date(l.departAt)

  // Make a plausible arrival end-time (+2–4h depending on class)
  const classToHours: Record<string, number> = {
    light: 2.0,
    'midsize': 2.5,
    'super-midsize': 3.0,
    heavy: 3.5,
    'ultra-long': 4.0,
  }
  const hours = classToHours[l.aircraft?.class] ?? 3.0
  const arrive = new Date(depart.getTime() + hours * 60 * 60 * 1000)

  return {
    ...l,

    // what Results.tsx expects:
    price: { amount: l.priceUSD, currency: 'USD' },
    verifiedAt: l.verifiedAt ?? l.departAt ?? new Date().toISOString(),

    // add the fields your UI is formatting (prevents "Invalid Date"):
    start: depart.toISOString(),
    end: arrive.toISOString(),
  }
})

setLegs(normalized)
setToast({ type: 'ok', text: `${data.count ?? normalized.length} result(s) found` })
    } catch (err) {
      console.error(err)
      setToast({ type: 'err', text: 'Search failed. Please try again.' })
      setLegs([])
    } finally {
      setLoading(false)
      setTimeout(() => setToast(null), 2000)
    }
  }

  // Optional extra client-side filtering (kept minimal; API already filters)
  const filtered = useMemo(() => legs, [legs])

  useEffect(() => {
    // initial load
    doSearch()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="min-h-screen">
      <Header />

      <main className="mx-auto max-w-7xl px-4 pb-24">
        <section className="mx-auto mt-8 max-w-5xl">
          <div className="grid items-center gap-6 md:grid-cols-5">
            <div className="md:col-span-3">
              <h1 className="font-display text-4xl sm:text-5xl font-semibold tracking-tight">
                Search empty-leg private flights
              </h1>
              <p className="mt-3 max-w-xl text-base text-slate-600">
                Real-time repositioning legs from trusted operators and brokers. Save routes to get instant alerts.
              </p>
            </div>

            {/* Quick search card */}
            <Card className="md:col-span-2">
              <div className="border-b border-slate-100 p-5 text-sm font-medium text-slate-900 flex items-center gap-2">
                <Search className="h-4 w-4" /> Quick search
              </div>
              <div className="p-5">
                <form onSubmit={doSearch} className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">From (IATA)</label>
                    <AirportSelect value={query.from} onChange={(v) => setQuery((s) => ({ ...s, from: v }))} />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">To (IATA)</label>
                    <AirportSelect value={query.to} onChange={(v) => setQuery((s) => ({ ...s, to: v }))} />
                  </div>

                  {/* DATE WINDOW — exactly two pickers */}
                  <fieldset className="col-span-2">
                    <legend className="mb-2 block text-xs font-semibold text-slate-700">Date window</legend>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label htmlFor="earliest" className="mb-1 block text-xs font-medium text-slate-600">
                          Earliest depart
                        </label>
                        <Input
                          id="earliest"
                          type="date"
                          value={query.start}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setQuery((s) => ({ ...s, start: e.target.value }))
                          }
                          max={query.end || undefined}
                        />
                      </div>
                      <div>
                        <label htmlFor="latest" className="mb-1 block text-xs font-medium text-slate-600">
                          Latest depart
                        </label>
                        <Input
                          id="latest"
                          type="date"
                          value={query.end}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setQuery((s) => ({ ...s, end: e.target.value }))
                          }
                          min={query.start || undefined}
                        />
                      </div>
                    </div>
                    <p className="mt-2 text-xs text-slate-500">Tip: a 2–3 day window catches more empty legs.</p>
                  </fieldset>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">Seats</label>
                    <Input
                      type="number"
                      min={1}
                      max={16}
                      value={query.seats}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setQuery((s) => ({ ...s, seats: Number(e.target.value) }))
                      }
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">Class</label>
                    <Select
                      value={query.classPref}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                        setQuery((s) => ({ ...s, classPref: e.target.value }))
                      }
                    >
                      <option value="any">Any</option>
                      <option value="light">Light</option>
                      <option value="super_light">Super Light</option>
                      <option value="midsize">Midsize</option>
                      <option value="super_midsize">Super Midsize</option>
                      <option value="heavy">Heavy</option>
                      <option value="ultra_long">Ultra Long</option>
                    </Select>
                  </div>

                  <div className="col-span-2 flex items-center justify-between gap-3">
                    <Button type="submit" className="w-full" disabled={loading}>
                      <Search className="h-4 w-4" /> {loading ? 'Searching…' : 'Search'}
                    </Button>
                    <Button type="button" variant="outline" className="w-full" onClick={() => setShowAlert(true)}>
                      <Bell className="h-4 w-4" /> Save alert
                    </Button>
                  </div>
                </form>
              </div>
            </Card>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 mt-10">
          <div className="lg:col-span-2">
            <Results
              loading={loading}
              legs={filtered}
              onOpen={(l: any) => setSelected(l)}
              onSaveAlert={() => setShowAlert(true)}
            />
          </div>
          <div>
            <MapPanel legs={filtered} />
            <OperatorCTA />
          </div>
        </div>
      </main>

      <Footer />

      {selected && (
        <DetailModal
          leg={selected}
          onClose={() => setSelected(null)}
          onInquire={() => setSelected({ ...selected, inquire: true })}
        />
      )}
      {selected?.inquire && (
        <InquiryModal
          leg={selected}
          onClose={() => setSelected(null)}
          onSuccess={() => setToast({ type: 'ok', text: 'Inquiry sent' })}
        />
      )}
      {showAlert && (
        <AlertModal
          query={query}
          onClose={() => setShowAlert(false)}
          onSuccess={() => setToast({ type: 'ok', text: 'Alert created' })}
        />
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2">
          <div
            className={`rounded-full px-4 py-2 shadow-lg ${
              toast.type === 'ok' ? 'bg-emerald-600 text-white' : 'bg-slate-900 text-white'
            }`}
          >
            {toast.text}
          </div>
        </div>
      )}
    </div>
  )
}