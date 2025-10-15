'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { MotionProps } from 'framer-motion'
import { Search, Calendar, Clock, MoveRight, DollarSign, MapPin, Mail } from 'lucide-react'
import Header from './header'
import Footer from './footer'
import Button from './ui/button'
import Input from './ui/input'

// ---- Framer Motion TS helpers (so className/initial/... are accepted)
type MDivProps = React.HTMLAttributes<HTMLDivElement> & MotionProps
type MSpanProps = React.HTMLAttributes<HTMLSpanElement> & MotionProps
const MotionDiv: React.FC<MDivProps> = (p) => <motion.div {...p} />
const MotionSpan: React.FC<MSpanProps> = (p) => <motion.span {...p} />

// ------------------------------
// Config (airports suggestions OFF -> no 404s)
// ------------------------------
const FX = { USD: 1, EUR: 0.92, GBP: 0.78 }
const AIRPORTS_ENABLED = false

// ------------------------------
// Helpers
// ------------------------------
const toCurrency = (usd: number | null | undefined, ccy: keyof typeof FX) =>
  usd == null ? null : usd * (FX[ccy] || 1)

const fmtMoney = (amt: number | null | undefined, ccy: string) =>
  amt == null ? '—' : new Intl.NumberFormat(undefined, { style: 'currency', currency: ccy as any }).format(amt)

const fmtWhen = (iso?: string) =>
  iso
    ? new Date(iso).toLocaleString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—'

const fmtHHMM = (iso?: string) => {
  if (!iso) return '--:--'
  const d = new Date(iso)
  return isNaN(d.getTime()) ? '--:--' : `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

const pad = (t: string, n: number) => (t || '').toUpperCase().slice(0, n).padEnd(n, ' ')
const toRad = (d: number) => (d * Math.PI) / 180
const haversine = (a: { lat: number; lon: number }, b: { lat: number; lon: number }) => {
  const R = 6371e3, dLat = toRad(b.lat - a.lat), dLon = toRad(b.lon - a.lon)
  const la1 = toRad(a.lat), la2 = toRad(b.lat)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

function aircraftLabel(a: any): string {
  if (!a) return ''
  if (typeof a === 'string') return a
  const parts = [a.type || a.model || a.name, a.class || a.category, a.seats ? `${a.seats} seats` : null].filter(Boolean)
  return parts.join(' · ')
}

// ---- Robust normalization helpers
const pickIata = (v: any): string =>
  (v?.iata || v?.IATA || v?.code || v)?.toString?.().toUpperCase?.() || ''

function normalizeDepartAt(l: any): string | undefined {
  let v =
    l.departAt || l.depart_at || l.start || l.start_at || l.departure ||
    (l.date && l.time ? `${l.date}T${l.time}` : l.date)
  if (v == null) return undefined
  if (typeof v === 'number') return new Date(v < 2e10 ? v * 1000 : v).toISOString()
  if (typeof v === 'string' && v.includes(' ')) v = v.replace(' ', 'T')
  const d = new Date(v)
  return isNaN(d.getTime()) ? undefined : d.toISOString()
}

function normalizeLeg(l: any) {
  const fromIata =
    (l.fromIata || l.from_iata || l.from || l.origin || l.startAirport || l.start_airport || '') &&
    pickIata(l.fromIata || l.from_iata || l.from || l.origin || l.startAirport || l.start_airport)

  const toIata =
    (l.toIata || l.to_iata || l.to || l.destination || l.endAirport || l.end_airport || '') &&
    pickIata(l.toIata || l.to_iata || l.to || l.destination || l.endAirport || l.end_airport)

  const departAt = normalizeDepartAt(l)

  const ac =
    l.aircraft || {
      type: l.aircraftType || l.aircraft_type || l.type || l.model,
      class: l.aircraftClass || l.aircraft_class || l.class,
      seats: l.seats ?? l.aircraftSeats ?? l.aircraft_seats,
    }

  const priceUSD =
    l.priceUSD ?? l.price_usd ??
    (typeof l.price === 'number' ? l.price : undefined) ??
    (l.price && typeof l.price?.amount === 'number' && (l.price?.currency || 'USD') === 'USD' ? l.price.amount : undefined)

  return {
    id: l.id || `${fromIata || 'UNK'}-${toIata || 'UNK'}-${departAt || Math.random()}`,
    fromIata,
    toIata,
    departAt,
    priceUSD: typeof priceUSD === 'number' ? priceUSD : undefined,
    aircraft: ac,
  }
}

// ------------------------------
// Tiny atoms
// ------------------------------
function FlipText({ text, size = 'md' }: { text: string; size?: 'sm' | 'md' | 'lg' }) {
  const safe = (text ?? '').toString()
  const chars = pad(safe, Math.max(safe.length, 2)).split('')
  const cell = 'relative mx-0.5 inline-flex h-9 w-7 items-center justify-center overflow-hidden rounded-[6px] bg-slate-900/90 ring-1 ring-inset ring-slate-700/70 shadow-[inset_0_-1px_0_0_rgba(255,255,255,0.03)]'
  const sz = size === 'lg' ? 'text-xl' : size === 'md' ? 'text-base' : 'text-sm'
  return (
    <div className="flex select-none">
      {chars.map((c, i) => (
        <MotionSpan
          key={`${i}-${c}`}
          className={`${cell} ${sz} font-semibold tracking-widest text-slate-100`}
          initial={{ rotateX: -90, opacity: 0 }}
          animate={{ rotateX: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 24, delay: i * 0.03 }}
        >
          <span className="relative w-full text-center">
            <span className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 border-t border-slate-800/70" />
            {c === ' ' ? '\u00A0' : c}
          </span>
        </MotionSpan>
      ))}
    </div>
  )
}

function AirportInput({
  label, value, onChange, airports,
}: { label: string; value: string; onChange: (v: string) => void; airports: Record<string, any> }) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState(value || '')
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => setQ(value || ''), [value])
  useEffect(() => { const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as any)) setOpen(false) }
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h) }, [])

  const items = useMemo(() => {
    if (!AIRPORTS_ENABLED) return []
    const s = (q || '').trim().toUpperCase()
    if (s.length < 1) return []
    const entries = Object.entries(airports || {})
    const f = entries.filter(([code, meta]: any) => code.indexOf(s) === 0 || String(meta?.city || '').toUpperCase().includes(s))
    return f.slice(0, 8)
  }, [q, airports])

  return (
    <div className="relative" ref={ref}>
      <div className="mb-1 flex items-center gap-1 text-xs text-slate-400"><MapPin className="h-3.5 w-3.5" />{label}</div>
      <Input className="uppercase bg-slate-900/70" maxLength={3} placeholder="IATA" value={q}
        onFocus={() => AIRPORTS_ENABLED && setOpen(true)}
        onChange={(e) => { const v = (e.target.value || '').toUpperCase(); setQ(v); onChange(v) }} />
      {AIRPORTS_ENABLED && open && items.length > 0 && (
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-md border border-slate-800/60 bg-slate-900/90 shadow-lg">
          {items.map(([iata, meta]: any) => (
            <button key={iata} className="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-slate-200 hover:bg-slate-800/60"
              onMouseDown={(e) => { e.preventDefault(); onChange(iata); setQ(iata); setOpen(false) }}>
              <span className="font-semibold">{iata}</span>
              <span className="truncate text-slate-400">{meta?.city || ''}{meta?.country ? `, ${meta.country}` : ''}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ------------------------------
// Modals + Toast (same UI)
// ------------------------------
function AlertsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const initialRef = useRef<HTMLInputElement | null>(null)
  useEffect(() => { if (open && initialRef.current) initialRef.current.focus() }, [open])
  useEffect(() => { const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }; if (open) document.addEventListener('keydown', onKey); return () => document.removeEventListener('keydown', onKey) }, [open, onClose])
  if (!open) return null
  const submit = (e: React.FormEvent) => { e.preventDefault(); onClose() }
  return (
    <AnimatePresence>
      <MotionDiv
        className="fixed inset-0 z-[100] flex items-center justify-center p-4"
        role="dialog"
        aria-modal
        aria-labelledby="alerts-title"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <div className="absolute inset-0 bg-black/60" onClick={onClose} />
        <MotionDiv
          className="relative z-[101] w-full max-w-md rounded-2xl border border-slate-800 bg-slate-950 p-5 shadow-2xl"
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 30, opacity: 0 }}
        >
          <h2 id="alerts-title" className="text-lg font-semibold text-slate-100">Get alerts</h2>
          <p className="mt-1 text-sm text-slate-400">Tell us what you want to see and we’ll notify you.</p>
          <form className="mt-4 space-y-3" onSubmit={submit}>
            <label className="block text-sm text-slate-300">Email
              <Input ref={initialRef} type="email" required placeholder="you@company.com" className="mt-1 bg-slate-900/70" />
            </label>
            <label className="block text-sm text-slate-300">Phone (optional)
              <Input type="tel" placeholder="+1 555 555 0199" className="mt-1 bg-slate-900/70" />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="From (IATA)" className="uppercase bg-slate-900/70" maxLength={3} />
              <Input placeholder="To (IATA)"   className="uppercase bg-slate-900/70" maxLength={3} />
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-300"><input type="checkbox" className="h-4 w-4" /> I agree to receive notifications.</label>
            <div className="mt-3 flex items-center justify-end gap-2">
              <Button type="button" onClick={onClose} className="border border-slate-700 bg-transparent text-slate-300 hover:bg-slate-800">Cancel</Button>
              <Button type="submit" className="bg-sky-600/90 text-white hover:bg-sky-500 ring-1 ring-inset ring-sky-400/30">Save alert</Button>
            </div>
          </form>
        </MotionDiv>
      </MotionDiv>
    </AnimatePresence>
  )
}

function EnquiryModal({ open, onClose, leg, contactEmail, onToast }:{ open:boolean; onClose:()=>void; leg:any; contactEmail:string; onToast:(msg:string)=>void }) {
  const emailTo = contactEmail || 'hello@altidal.com'
  const from = leg?.fromIata || ''
  const to = leg?.toIata || ''
  const when = leg?.departAt ? new Date(leg.departAt).toLocaleString() : ''
  const aircraft = aircraftLabel(leg?.aircraft)
  const price = typeof leg?.priceUSD === 'number' ? `$${Math.round(leg.priceUSD).toLocaleString()}` : ''
  const subject = encodeURIComponent(`Enquiry: ${from} → ${to} ${when ? '(' + when + ')' : ''}`)
  const body = encodeURIComponent(
`Hi Altidal,

I’d like to enquire about this empty leg:

Route: ${from} → ${to}
When: ${when}
Aircraft: ${aircraft}
Price (USD): ${price}

My details:
Name:
Phone:
Notes:

Thanks!`)
  const mailto = `mailto:${emailTo}?subject=${subject}&body=${body}`
  const firstRef = useRef<HTMLAnchorElement | null>(null)
  useEffect(() => { if (open && firstRef.current) firstRef.current.focus() }, [open])
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }; if (open) document.addEventListener('keydown', k); return () => document.removeEventListener('keydown', k) }, [open, onClose])
  if (!open) return null
  return (
    <AnimatePresence>
      <MotionDiv
        className="fixed inset-0 z-[100] flex items-center justify-center p-4"
        role="dialog"
        aria-modal
        aria-labelledby="enquiry-title"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <div className="absolute inset-0 bg-black/60" onClick={onClose} />
        <MotionDiv
          className="relative z-[101] w-full max-w-md rounded-2xl border border-slate-800 bg-slate-950 p-5 shadow-2xl"
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 30, opacity: 0 }}
        >
          <h2 id="enquiry-title" className="text-lg font-semibold text-slate-100">Send enquiry</h2>
          <p className="mt-1 text-sm text-slate-400">This opens your email client and sends to <span className="text-slate-200">{emailTo}</span>.</p>
          <div className="mt-4 rounded-md border border-slate-800 bg-slate-900/60 p-3 text-sm text-slate-300">
            <div><span className="text-slate-400">Route:</span> {from} → {to}</div>
            <div><span className="text-slate-400">When:</span> {when || '—'}</div>
            {aircraft ? <div><span className="text-slate-400">Aircraft:</span> {aircraft}</div> : null}
            {price ? <div><span className="text-slate-400">Price:</span> {price}</div> : null}
          </div>
          <div className="mt-4 flex items-center justify-end gap-2">
            <Button type="button" onClick={onClose} className="border border-slate-700 bg-transparent text-slate-300 hover:bg-slate-800">Cancel</Button>
            <a ref={firstRef} href={mailto} onClick={() => onToast?.('Opening your email client…')}
               className="inline-flex items-center rounded-md bg-sky-600/90 px-3 py-2 text-sm font-medium text-white ring-1 ring-inset ring-sky-400/30 hover:bg-sky-500">
              <Mail className="mr-2 h-4 w-4" /> Open email
            </a>
          </div>
        </MotionDiv>
      </MotionDiv>
    </AnimatePresence>
  )
}

function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => { if (!message) return; const t = setTimeout(onClose, 2400); return () => clearTimeout(t) }, [message, onClose])
  if (!message) return null
  return (
    <MotionDiv
      className="fixed right-4 top-4 z-[200] rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 shadow-lg"
      initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
    >
      {message}
    </MotionDiv>
  )
}

// ------------------------------
// Board row
// ------------------------------
function BoardRow({ leg, airports, currency, onEnquire }:{
  leg:any; airports:Record<string,any>; currency:keyof typeof FX; onEnquire:(l:any)=>void
}) {
  const fromMeta = airports?.[leg.fromIata] || {}
  const toMeta   = airports?.[leg.toIata]   || {}
  const from = pad(leg.fromIata || '—', 3)
  const to   = pad(leg.toIata   || '—', 3)
  const t = fmtHHMM(leg.departAt)

  let ppm: number | null = null
  if (fromMeta.lat != null && toMeta.lat != null) {
    const meters = haversine(fromMeta, toMeta)
    const miles = meters / 1609.34
    const priceCcy = toCurrency(leg.priceUSD, currency)
    if (priceCcy != null && miles > 0) ppm = priceCcy / miles
  }

  return (
    <div className="group grid grid-cols-12 items-center gap-3 rounded-lg border border-slate-800/60 bg-gradient-to-r from-slate-900/60 to-slate-900/30 px-3 py-3 transition hover:border-sky-700 hover:from-slate-900/80">
      <div className="col-span-3">
        <div className="flex items-center gap-3">
          <Clock className="h-4 w-4 text-sky-400" />
          <FlipText text={t} size="lg" />
        </div>
        <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
          <Calendar className="h-3.5 w-3.5" /> {fmtWhen(leg.departAt)}
        </div>
      </div>

      <div className="col-span-4">
        <div className="flex items/end">
          <div className="flex flex-col">
            <FlipText text={from} size="lg" />
            <span className="mt-1 text-xs text-slate-400">{fromMeta.city || ''}{fromMeta.country ? `, ${fromMeta.country}` : ''}</span>
          </div>
          <MoveRight className="mx-3 h-6 w-6 text-sky-400" />
          <div className="flex flex-col">
            <FlipText text={to} size="lg" />
            <span className="mt-1 text-xs text-slate-400">{toMeta.city || ''}{toMeta.country ? `, ${toMeta.country}` : ''}</span>
          </div>
        </div>
      </div>

      <div className="col-span-2 truncate text-sm text-slate-400">{aircraftLabel(leg.aircraft) || '—'}</div>

      <div className="col-span-2 text-right">
        <div className="text-2xl font-semibold tabular-nums tracking-tight text-sky-300">
          {fmtMoney(toCurrency(leg.priceUSD, currency), currency)}
        </div>
        {ppm != null ? <div className="text-xs text-slate-400">~ {fmtMoney(ppm, currency)} / mi</div> : null}
      </div>

      <div className="col-span-1 flex items-center justify-end gap-2">
        <Button onClick={() => onEnquire(leg)} className="bg-sky-600/90 text-white hover:bg-sky-500 ring-1 ring-inset ring-sky-400/30">Enquire</Button>
      </div>
    </div>
  )
}

// ------------------------------
// SEO
// ------------------------------
function SEOJsonLD() {
  const org = { '@context': 'https://schema.org', '@type': 'Organization', name: 'Altidal', url: 'https://altidal.com', logo: 'https://altidal.com/logo.png', sameAs: ['https://twitter.com/altidal'] }
  const site = { '@context': 'https://schema.org', '@type': 'WebSite', name: 'Altidal', url: 'https://altidal.com', potentialAction: { '@type': 'SearchAction', target: 'https://altidal.com/empty-legs?q={search_term_string}', 'query-input': 'required name=search_term_string' } }
  return (<><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(org) }} /><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(site) }} /></>)
}

// ------------------------------
// Page
// ------------------------------
export default function Page() {
  const [fromIata, setFrom] = useState('')
  const [toIata, setTo] = useState('')
  const [date, setDate] = useState('')
  const [q, setQ] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [currency, setCurrency] = useState<'USD' | 'EUR' | 'GBP'>(() => { try { return (localStorage.getItem('currency') as any) || 'USD' } catch { return 'USD' } })

  const [airports] = useState<Record<string, any>>({})
  const [legs, setLegs] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [alertsOpen, setAlertsOpen] = useState(false)
  const [enquiryOpen, setEnquiryOpen] = useState(false)
  const [enquiryLeg, setEnquiryLeg] = useState<any | null>(null)
  const [toast, setToast] = useState('')

  const [geoTried, setGeoTried] = useState(false)
  const [ready, setReady] = useState(false)

  // ❗️No start/end in query -> API never filters by date
  const [query, setQuery] = useState({ from: '', to: '', seats: 0, classPref: 'any' })

  const classValueForApi = (val: string) => {
    const map: Record<string, string> = { any: '', light: 'light', super_light: 'light', midsize: 'midsize', super_midsize: 'super-midsize', heavy: 'heavy', ultra_long: 'ultra-long' }
    return map[val] ?? ''
  }

  // Abortable fetch
  const fetchCtl = useRef<AbortController | null>(null)
  async function doSearch() {
    try {
      setLoading(true)
      fetchCtl.current?.abort()
      const ctl = new AbortController()
      fetchCtl.current = ctl

      const params = new URLSearchParams()
      if (query.from) params.set('from', query.from.toUpperCase())
      if (query.to) params.set('to', query.to.toUpperCase())
      if (query.seats) params.set('seats', String(query.seats))
      const apiClass = classValueForApi(query.classPref)
      if (apiClass) params.set('class', apiClass)

      const res = await fetch(`/api/legs?${params.toString()}`, { cache: 'no-store', signal: ctl.signal })
      if (!res.ok) throw new Error(`API ${res.status}`)
      const data = await res.json()
      const arr = Array.isArray(data) ? data : Array.isArray(data.legs) ? data.legs : []
      setLegs(arr.map(normalizeLeg))
      setToast(`${data.count ?? arr.length} result(s) found`)
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        console.error(err)
        setToast('Search failed. Please try again.')
        setLegs([])
      }
    } finally {
      setLoading(false)
      setTimeout(() => setToast(''), 1500)
    }
  }

  // sync query with UI (no date)
  useEffect(() => {
    setQuery((s) => ({ ...s, from: fromIata || '', to: toIata || '' }))
  }, [fromIata, toIata])

  // search when ready
  useEffect(() => {
    if (!ready) return
    const t = setTimeout(() => { doSearch() }, 350)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, query.from, query.to, query.seats, query.classPref])

  // '/' focus
  const searchRef = useRef<HTMLInputElement | null>(null)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === '/' && !e.metaKey && !e.ctrlKey && !e.altKey) { e.preventDefault(); searchRef.current?.focus() } }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // header event
  useEffect(() => {
    const handler = () => setAlertsOpen(true)
    window.addEventListener('open-alerts', handler)
    return () => window.removeEventListener('open-alerts', handler)
  }, [])

  // geolocate once
  useEffect(() => {
    if (geoTried) return
    if (!navigator.geolocation) { setGeoTried(true); setReady(true); return }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const me = { lat: pos.coords.latitude, lon: pos.coords.longitude }
        if (!fromIata) {
          const nearDallas = Math.abs(me.lat - 32.7767) < 1 && Math.abs(me.lon + 96.7970) < 1
          if (nearDallas) setFrom('DAL')
        }
        setGeoTried(true)
        setReady(true)
      },
      () => { setGeoTried(true); setReady(true) },
      { enableHighAccuracy: false, maximumAge: 300000, timeout: 8000 }
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geoTried])

  useEffect(() => { try { localStorage.setItem('currency', currency) } catch {} }, [currency])

  // 👉 Client-side filter by text, optional date, and price
  const filtered = useMemo(() => {
    let out = legs.slice()
    const needle = (q || '').toLowerCase().trim()
    if (needle) {
      out = out.filter((l) =>
        [l.fromIata, l.toIata, aircraftLabel(l.aircraft)]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(needle)
      )
    }
    if (date) out = out.filter((l) => (l.departAt ? new Date(l.departAt).toISOString().slice(0, 10) === date : false))
    if (maxPrice) out = out.filter((l) => (l.priceUSD == null ? Infinity : l.priceUSD) <= Number(maxPrice))
    return out
  }, [legs, q, date, maxPrice])

  return (
    <>
      <SEOJsonLD />
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-[60] focus:rounded-md focus:bg-slate-900 focus:px-3 focus:py-2 focus:text-slate-100">Skip to content</a>

      <Header />

      {/* Info banner */}
      <section className="mx-auto max-w-7xl px-4 pt-6">
        <div className="rounded-2xl border border-slate-800/60 bg-slate-900/60 p-5 shadow-[0_0_0_1px_rgba(14,165,233,0.12)] ring-1 ring-inset ring-sky-500/10">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="md:col-span-2">
              <h1 className="text-xl font-semibold tracking-tight text-slate-100">Fly smarter with Empty Legs</h1>
              <p className="mt-2 text-sm leading-relaxed text-slate-300">Empty legs are repositioning flights offered at a discount when an aircraft needs to move without passengers. Altidal surfaces these opportunities and helps you act fast when the timing and routing line up.</p>
              <ul className="mt-3 grid list-disc gap-1 pl-5 text-sm text-slate-300">
                <li><span className="text-slate-400">Dynamic pricing:</span> great value when flexible on time/date.</li>
                <li><span className="text-slate-400">Route-first discovery:</span> search by IATA and filter by date/price.</li>
                <li><span className="text-slate-400">Transparent details:</span> aircraft, departure window, and est. price-per-mile.</li>
              </ul>
            </div>
            <div className="flex items-center justify-center md:justify-end">
              <div className="rounded-xl border border-slate-800/70 bg-slate-950/60 px-4 py-3 text-sm text-slate-300">
                <div className="font-semibold text-slate-100">Why Altidal?</div>
                <div className="mt-1 space-y-1"><div>• Fast, modern UI</div><div>• Airport-aware search</div><div>• Dark neon theme</div></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Search ribbon */}
      <section className="mx-auto max-w-7xl px-4">
        <div className="mt-6 rounded-2xl border border-slate-800/60 bg-slate-900/60 p-3 shadow-[0_0_0_1px_rgba(14,165,233,0.15)] ring-1 ring-inset ring-sky-500/10 backdrop-blur">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-6">
            <AirportInput label="From" value={fromIata} onChange={setFrom} airports={{}} />
            <AirportInput label="To"   value={toIata}   onChange={setTo}   airports={{}} />
            <div>
              <div className="mb-1 text-xs text-slate-400">Date</div>
              <Input type="date" className="bg-slate-900/70" value={date} onChange={(e) => setDate((e.target as HTMLInputElement).value)} />
            </div>
            <div className="md:col-span-2">
              <div className="mb-1 text-xs text-slate-400">Search</div>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <Input ref={searchRef} className="bg-slate-900/70 pl-9" placeholder="Aircraft, notes… (press / to focus)" value={q} onChange={(e) => setQ((e.target as HTMLInputElement).value)} />
              </div>
            </div>
            <div>
              <div className="mb-1 text-xs text-slate-400">Max price</div>
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-slate-500" />
                <Input type="number" min={0} step={100} placeholder="Max $" className="bg-slate-900/70" value={maxPrice} onChange={(e) => setMaxPrice((e.target as HTMLInputElement).value)} />
              </div>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between">
            <div className="text-xs text-slate-400">Tip: type the city or IATA code in From/To. Press Backspace to clear.</div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-400">Currency</label>
              <select value={currency} onChange={(e) => setCurrency(e.target.value as any)} className="rounded-md border border-slate-700 bg-slate-900/70 px-2 py-1 text-sm">
                <option value="USD">USD</option><option value="EUR">EUR</option><option value="GBP">GBP</option>
              </select>
            </div>
          </div>
        </div>
      </section>

      {/* Board */}
      <main id="main" className="mx-auto mt-6 max-w-7xl px-4">
        <div className="mb-2 text-sm text-slate-400">
          {loading ? 'Loading…' : `${filtered.length} result${filtered.length === 1 ? '' : 's'}`}
        </div>

        {legs.length > 0 && filtered.length === 0 ? (
          <div className="rounded-md border border-slate-800 bg-slate-900/60 p-3 text-slate-300">
            No results match your search/date/price filters.
          </div>
        ) : null}

        <div className="space-y-2">
          {filtered.map((leg) => (
            <BoardRow
              key={leg.id}
              leg={leg}
              airports={airports}
              currency={currency}
              onEnquire={(l) => { setEnquiryLeg(l); setEnquiryOpen(true) }}
            />
          ))}
        </div>
      </main>

      <Footer />

      <AlertsModal open={alertsOpen} onClose={() => setAlertsOpen(false)} />
      <EnquiryModal open={enquiryOpen} onClose={() => setEnquiryOpen(false)} leg={enquiryLeg} contactEmail="hello@altidal.com" onToast={(m) => setToast(m || 'Email draft opened')} />
      <AnimatePresence>{toast ? <Toast message={toast} onClose={() => setToast('')} /> : null}</AnimatePresence>

      {/* Background */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(148,163,184,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.06)_1px,transparent_1px)] bg-[size:28px_28px]" />
        <MotionDiv
          className="absolute inset-x-0 h-24 bg-gradient-to-b from-sky-500/10 via-sky-500/5 to-transparent"
          initial={{ y: -100 }}
          animate={{ y: [-100, 1200] }}
          transition={{ repeat: Infinity, duration: 8, ease: 'linear' }}
        />
      </div>
    </>
  )
}