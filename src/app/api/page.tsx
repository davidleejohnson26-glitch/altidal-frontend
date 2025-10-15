// src/app/api/page.tsx
'use client'

import React from 'react'
import { motion } from 'framer-motion'
import Header from '../header'
import Footer from '../footer'
import Button from '../ui/button' // use your local Button to avoid shadcn variant typing
import { Server, TerminalSquare, Link2 } from 'lucide-react'

// Safe motion.div wrapper to avoid TS friction in your env
const MDiv =
  motion.div as unknown as React.FC<
    React.HTMLAttributes<HTMLDivElement> & {
      initial?: any
      animate?: any
      transition?: any
    }
  >

const Code = ({ children }: { children: React.ReactNode }) => (
  <pre className="mt-3 overflow-x-auto rounded-xl border border-slate-800/60 bg-slate-950/80 p-4 text-[12px] leading-relaxed text-slate-200">
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
  <div className="grid grid-cols-12 items-start gap-3 border-b border-slate-800/60 py-3 last:border-b-0">
    <div className="col-span-12 md:col-span-4">
      <div className="font-mono text-[11px] text-slate-200">{name}</div>
      <div className="text-[10px] uppercase tracking-wide text-slate-500">
        {type}
        {required ? ' • required' : ''}
      </div>
    </div>
    <div className="col-span-12 md:col-span-8">
      <div className="text-sm text-slate-300">{desc}</div>
      {example && (
        <div className="mt-1 text-xs text-slate-400">
          e.g. <span className="font-mono text-slate-300">{example}</span>
        </div>
      )}
    </div>
  </div>
)

export default function ApiDocsPage() {
  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-[60] focus:rounded-md focus:bg-slate-900 focus:px-3 focus:py-2 focus:text-slate-100"
      >
        Skip to content
      </a>

      <Header />

      {/* Hero / info banner */}
      <section className="mx-auto max-w-7xl px-4 pt-6">
        <div className="rounded-2xl border border-slate-800/60 bg-slate-900/60 p-5 shadow-[0_0_0_1px_rgba(14,165,233,0.12)] ring-1 ring-inset ring-sky-500/10">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="md:col-span-2">
              <h1 className="text-xl font-semibold tracking-tight text-slate-100">API Reference</h1>
              <p className="mt-2 text-sm leading-relaxed text-slate-300">
                The Altidal API lets you search normalized empty legs across integrated operators. This page
                documents the public <span className="font-mono text-slate-100">GET /api/legs</span> endpoint.
              </p>
            </div>
            <div className="flex items-center justify-center md:justify-end">
              <div className="rounded-xl border border-slate-800/70 bg-slate-950/60 px-4 py-3 text-sm text-slate-300">
                <div className="flex items-center gap-2 font-semibold text-slate-100">
                  <Server className="h-4 w-4 text-sky-400" /> Public Beta
                </div>
                <div className="mt-1 space-y-1">
                  <div>• JSON over HTTPS</div>
                  <div>• No key (read-only)</div>
                  <div>• UTC ISO8601</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main content */}
      <main id="main" className="mx-auto mt-6 w-full max-w-7xl px-4 pb-12">
        {/* Endpoint card */}
        <section className="rounded-2xl border border-slate-800/60 bg-slate-900/60 p-6 ring-1 ring-inset ring-sky-500/10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-lg font-semibold text-slate-100">
              <Link2 className="h-4 w-4 text-sky-400" />
              GET <span className="font-mono">/api/legs</span>
            </div>
            <a
              href="/api/legs"
              className="text-sm text-sky-400 underline underline-offset-2 hover:text-sky-300"
            >
              Try it
            </a>
          </div>

          <p className="mt-2 text-sm text-slate-300">
            Returns a list of legs matching the provided filters. All times are ISO8601 UTC.
          </p>

          <h3 className="mt-5 text-sm font-semibold text-slate-200">Query Parameters</h3>
          <div className="mt-2 rounded-xl border border-slate-800/60 bg-slate-950/40">
            <div className="divide-y divide-slate-800/60">
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

          <h3 className="mt-6 text-sm font-semibold text-slate-200">Responses</h3>
          <p className="mt-1 text-sm text-slate-300">On success (<span className="font-mono">200</span>):</p>
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

          <p className="mt-4 text-sm text-slate-300">On error (<span className="font-mono">4xx/5xx</span>):</p>
          <Code>{`{ "ok": false, "error": "message" }`}</Code>

          <h3 className="mt-6 text-sm font-semibold text-slate-200">Examples</h3>
          <div className="mt-2 grid gap-4 lg:grid-cols-2">
            <div>
              <div className="flex items-center gap-2 text-xs font-medium text-slate-300">
                <TerminalSquare className="h-3.5 w-3.5 text-sky-400" /> curl
              </div>
              <Code>{`curl "http://localhost:3000/api/legs?from=DAL&to=TEB&seats=2&limit=50"`}</Code>
            </div>
            <div>
              <div className="flex items-center gap-2 text-xs font-medium text-slate-300">
                <TerminalSquare className="h-3.5 w-3.5 text-sky-400" /> JavaScript (fetch)
              </div>
              <Code>{`const res = await fetch("/api/legs?operator=xo&minPrice=5000&maxPrice=15000&limit=25")
const json = await res.json()
if (!json.ok) throw new Error(json.error)
console.log(json.legs)`}</Code>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <a href="/api/legs">
              <Button className="border-slate-700/70 bg-transparent text-slate-200 hover:bg-slate-800/60">
                Browse latest legs
              </Button>
            </a>
            <a href="/operators">
              <Button className="bg-sky-600/90 text-white hover:bg-sky-500 ring-1 ring-inset ring-sky-400/30">
                Become a partner
              </Button>
            </a>
          </div>
        </section>

        {/* Notes */}
        <section className="mt-6 rounded-2xl border border-slate-800/60 bg-slate-900/60 p-5 text-xs text-slate-400 ring-1 ring-inset ring-sky-500/10">
          <p>
            <span className="font-semibold text-slate-200">Authentication:</span> The public endpoint above doesn’t require a key for read access in this MVP.
            Write/partner ingestion is available via CSV upload or private APIs — contact us to enable.
          </p>
          <p className="mt-2">
            <span className="font-semibold text-slate-200">Rate limits:</span> Be reasonable; we may throttle abusive patterns. Pagination via <span className="font-mono">limit</span>.
          </p>
        </section>
      </main>

      <Footer />

      {/* Background grid + sweep */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(148,163,184,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.06)_1px,transparent_1px)] bg-[size:28px_28px]" />
        <MDiv
          className="absolute inset-x-0 h-24 bg-gradient-to-b from-sky-500/10 via-sky-500/5 to-transparent"
          initial={{ y: -100 }}
          animate={{ y: [-100, 1200] }}
          transition={{ repeat: Infinity, duration: 8, ease: 'linear' }}
        />
      </div>
    </>
  )
}
