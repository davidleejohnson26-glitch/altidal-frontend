'use client'
import { Card, Chip, Button } from '@/components/ui'
import { Info, Loader2, MapPin, ChevronRight } from 'lucide-react'
import { formatMoney } from '@/lib/utils'

// ---------- Safe date helpers ----------
const parseISO = (s?: string | null) => {
  if (!s) return null
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? null : d
}

const fmt = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
})

const fmtTime = (d: Date | null) => (d ? fmt.format(d) : '—')

// Title case helper for class labels like "super-midsize"
const titleCase = (s: string) =>
  s.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

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
          <div className="p-6 flex items-start gap-3 text-slate-600">
            <Info className="mt-0.5 h-5 w-5 text-slate-400" />
            <div>
              <div className="text-slate-900 font-medium">No matches yet</div>
              <div className="text-sm mt-1">
                Empty legs are dynamic. Broaden dates or create an alert — we’ll email you as soon as a match appears.
              </div>
            </div>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {legs.map((leg: any) => (
            <LegCard key={leg.id} leg={leg} onOpen={() => onOpen(leg)} />
          ))}
        </div>
      )}
    </section>
  )
}

function LegCard({ leg, onOpen }: any) {
  // Safely compute times:
  // prefer leg.start/leg.end (set in normalization), fall back to departAt if needed
  const start = parseISO(leg.start ?? leg.departAt ?? null)
  const end = parseISO(leg.end ?? null)

  // Class label tolerant to '-' or '_'
  const classLabel = leg?.aircraft?.class ? titleCase(String(leg.aircraft.class)) : '—'

  // Operator/source
  const sourceLabel = leg.operator ?? leg.source ?? 'Partner'

  // Verified date safety
  const verified = parseISO(leg.verifiedAt) ?? start
  const verifiedLabel = verified ? verified.toLocaleDateString() : '—'

  return (
    <Card>
      <div className="grid grid-cols-1 md:grid-cols-12">
        {/* LEFT: route + details */}
        <div className="md:col-span-8">
          {/* Route header */}
          <div className="flex flex-wrap items-center gap-2 p-5 border-b border-slate-100 text-slate-900">
            <div className="flex items-center gap-2 text-base font-semibold">
              <MapPin className="h-4 w-4 text-sky-600" />
              <span>
                {leg.from.city} ({leg.from.iata})
              </span>
              <ChevronRight className="h-4 w-4 text-slate-400" />
              <span>
                {leg.to.city} ({leg.to.iata})
              </span>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Chip className="bg-sky-50 text-sky-700 border-sky-200">
                {fmtTime(start)}
              </Chip>
              {end ? <Chip>→ {fmtTime(end)}</Chip> : null}
            </div>
          </div>

          {/* Details row */}
          <div className="p-5 flex flex-wrap items-center gap-3 text-sm text-slate-600">
            <Chip>{leg.aircraft.type}</Chip>
            <Chip>{leg.aircraft.seats} seats</Chip>
            <Chip className="capitalize">{classLabel}</Chip>
            <Chip>Verified {verifiedLabel}</Chip>
            <Chip className="bg-emerald-50 text-emerald-700 border-emerald-200 !text-sm">
              {formatMoney(leg.price.amount, leg.price.currency)}
            </Chip>
          </div>
        </div>

        {/* RIGHT: source + CTA */}
        <div className="md:col-span-4 border-t md:border-l border-slate-100 p-4 flex md:flex-col items-center justify-between gap-4">
          <div className="text-sm">
            <div className="font-medium">Source</div>
            <div className="text-slate-600">{sourceLabel}</div>
          </div>
          <Button onClick={onOpen}>
            <Info className="h-4 w-4" /> Details
          </Button>
        </div>
      </div>
    </Card>
  )
}