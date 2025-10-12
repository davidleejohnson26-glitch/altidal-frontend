// app/api/page.tsx
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { Card, Button } from '@/components/ui'

const Code = ({ children }: { children: React.ReactNode }) => (
  <pre className="mt-3 overflow-x-auto rounded-xl border bg-slate-50 p-4 text-xs leading-relaxed">
    <code>{children}</code>
  </pre>
)

const Param = ({
  name,
  type,
  required = false,
  desc,
  example,
}: {
  name: string
  type: string
  required?: boolean
  desc: string
  example?: string
}) => (
  <div className="grid grid-cols-12 items-start gap-3 py-2 border-b last:border-b-0">
    <div className="col-span-12 md:col-span-3">
      <div className="font-mono text-[11px]">{name}</div>
      <div className="text-[10px] uppercase tracking-wide text-slate-500">{type}{required ? ' • required' : ''}</div>
    </div>
    <div className="col-span-12 md:col-span-9">
      <div className="text-sm text-slate-700">{desc}</div>
      {example && <div className="mt-1 text-xs text-slate-500">e.g. <span className="font-mono">{example}</span></div>}
    </div>
  </div>
)

export default function ApiDocsPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="mx-auto w-full max-w-7xl px-4 py-10 flex-1">
        <div className="max-w-3xl">
          <h1 className="text-3xl font-semibold tracking-tight">API Reference</h1>
          <p className="mt-3 text-slate-600">
            The Altidal API lets you search normalized empty legs across integrated operators.
            This page documents the public <span className="font-mono">GET /api/legs</span> endpoint.
          </p>
        </div>

        {/* Endpoint card */}
        <Card className="mt-8 p-6">
          <div className="flex items-center justify-between gap-3">
            <div className="text-lg font-semibold">GET /api/legs</div>
            <a href="/api/legs" className="text-sm text-sky-700 underline">Try it</a>
          </div>
          <p className="mt-2 text-sm text-slate-600">
            Returns a list of legs matching the provided filters. All times are ISO8601 UTC.
          </p>

          <h3 className="mt-5 text-sm font-semibold text-slate-900">Query Parameters</h3>
          <div className="mt-2 rounded-xl border">
            <div className="divide-y">
              <Param name="from" type="string(3)" desc="Origin IATA code." example="DAL" />
              <Param name="to" type="string(3)" desc="Destination IATA code." example="TEB" />
              <Param name="operator" type="'airpartner' | 'xo' | 'magellan'" desc="Filter by operator." example="xo" />
              <Param name="start" type="date (YYYY-MM-DD)" desc="Earliest departure date (inclusive, UTC)." example="2025-10-10" />
              <Param name="end" type="date (YYYY-MM-DD)" desc="Latest departure date (inclusive, UTC)." example="2025-10-15" />
              <Param name="seats" type="int ≥ 1" desc="Minimum seat count; includes unknown (0) by default." example="2" />
              <Param name="minPrice" type="number" desc="Minimum price (USD)." example="5000" />
              <Param name="maxPrice" type="number" desc="Maximum price (USD)." example="15000" />
              <Param name="class" type="string" desc="Aircraft class; includes Unknown." example="midsize" />
              <Param name="limit" type="int [1..200], default 50" desc="Max rows to return." example="100" />
            </div>
          </div>

          <h3 className="mt-6 text-sm font-semibold text-slate-900">Responses</h3>
          <p className="mt-1 text-sm text-slate-600">On success (<span className="font-mono">200</span>):</p>
          <Code>{`{
  "ok": true,
  "count": 2,
  "legs": [
    {
      "id": "leg_abc123",
      "operator": "xo",
      "from": { "iata": "DAL", "name": "Dallas Love Field", "city": "Dallas" },
      "to":   { "iata": "TEB", "name": "Teterboro",        "city": "New York" },
      "departAt": "2025-10-12T15:30:00.000Z",
      "priceUSD": 12000,
      "aircraft": { "type": "Citation XLS+", "class": "midsize", "seats": 8 },
      "url": "https://operator.example/offer/xyz"
    }
  ]
}`}</Code>

          <p className="mt-4 text-sm text-slate-600">On error (<span className="font-mono">4xx/5xx</span>):</p>
          <Code>{`{ "ok": false, "error": "message" }`}</Code>

          <h3 className="mt-6 text-sm font-semibold text-slate-900">Examples</h3>

          <div className="mt-2 grid gap-4 lg:grid-cols-2">
            <div>
              <div className="text-xs font-medium text-slate-700">curl</div>
              <Code>{`curl "http://localhost:3000/api/legs?from=DAL&to=TEB&seats=2&limit=50"`}</Code>
            </div>
            <div>
              <div className="text-xs font-medium text-slate-700">JavaScript (fetch)</div>
              <Code>{`const res = await fetch("/api/legs?operator=xo&minPrice=5000&maxPrice=15000&limit=25")
const json = await res.json()
if (!json.ok) throw new Error(json.error)
console.log(json.legs)`}</Code>
            </div>
          </div>

          <div className="mt-6 flex items-center gap-3">
            <a href="/api/legs">
              <Button variant="outline">Browse latest legs</Button>
            </a>
            <a href="/operators">
              <Button>Become a partner</Button>
            </a>
          </div>
        </Card>

        {/* Notes */}
        <div className="mt-6 text-xs text-slate-500">
          <p>
            Authentication: The public endpoint above doesn’t require a key for read access in this MVP.
            Write/partner ingestion is available via CSV upload or private APIs — contact us to enable.
          </p>
          <p className="mt-2">
            Rate limits: Be reasonable; we may throttle abusive patterns. Pagination via <span className="font-mono">limit</span>.
          </p>
        </div>
      </main>

      <Footer />
    </div>
  )
}