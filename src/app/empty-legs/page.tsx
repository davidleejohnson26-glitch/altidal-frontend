// app/empty-legs/page.tsx
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

import React from 'react'
import Header from '../header'
import Footer from '../footer'
import Button from '../ui/button'

export const metadata = {
  title: 'What Are Empty Legs? — Altidal',
  description:
    'Learn how private jet empty legs work, why they can be 30–75% cheaper, and tips to book them smartly with Altidal.',
}

const Bullet = ({ children }: { children: React.ReactNode }) => (
  <li className="flex items-start gap-2">
    <span className="mt-[7px] inline-block h-1.5 w-1.5 rounded-full bg-sky-500/90 ring-1 ring-sky-300/30" />
    <span className="text-sm text-slate-300">{children}</span>
  </li>
)

export default function EmptyLegsPage() {
  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-[60] focus:rounded-md focus:bg-slate-900 focus:px-3 focus:py-2 focus:text-slate-100"
      >
        Skip to content
      </a>

      <Header />

      {/* Hero / intro */}
      <section className="mx-auto max-w-7xl px-4 pt-6">
        <div className="rounded-2xl border border-slate-800/60 bg-slate-900/60 p-5 shadow-[0_0_0_1px_rgba(14,165,233,0.12)] ring-1 ring-inset ring-sky-500/10">
          <div className="max-w-3xl">
            <h1 className="text-xl font-semibold tracking-tight text-slate-100">
              Empty Legs: The Smart Way to Fly Private
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-slate-300">
              “Empty legs” are repositioning flights — when an aircraft must fly without passengers to its next pickup or
              back to base. Because that flight is already planned, seats are often discounted compared to standard
              on-demand charters.
            </p>
          </div>
        </div>
      </section>

      <main id="main" className="mx-auto mt-6 w-full max-w-7xl px-4 pb-12">
        {/* Benefits */}
        <section className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-800/60 bg-slate-900/60 p-5 ring-1 ring-inset ring-sky-500/10">
            <h2 className="text-lg font-semibold text-slate-100">Why they’re cheaper</h2>
            <ul className="mt-3 space-y-2">
              <Bullet>Aircraft and crew are already scheduled — fewer variable costs to cover.</Bullet>
              <Bullet>Operators prefer any revenue to flying empty; discounts can be substantial.</Bullet>
              <Bullet>Last-minute inventory gets marked down as departure approaches.</Bullet>
            </ul>
          </div>

          <div className="rounded-2xl border border-slate-800/60 bg-slate-900/60 p-5 ring-1 ring-inset ring-sky-500/10">
            <h2 className="text-lg font-semibold text-slate-100">Typical savings</h2>
            <p className="mt-3 text-sm text-slate-300">
              Depending on route, timing, and aircraft type, consumers often see <strong className="text-slate-100">30–75% off</strong>{' '}
              standard charter pricing. Smaller jets and popular corridors (e.g., LA↔️Vegas, NYC↔️Florida) see frequent deals.
            </p>
          </div>
        </section>

        {/* How it works */}
        <section className="mt-6 grid gap-4 lg:grid-cols-3">
          <div className="rounded-2xl border border-slate-800/60 bg-slate-900/60 p-5 ring-1 ring-inset ring-sky-500/10">
            <h3 className="font-medium text-slate-100">1) Find a match</h3>
            <p className="mt-2 text-sm text-slate-300">
              Search available empty legs on Altidal by route, date, or operator. Inventory changes throughout the day.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-800/60 bg-slate-900/60 p-5 ring-1 ring-inset ring-sky-500/10">
            <h3 className="font-medium text-slate-100">2) Confirm details</h3>
            <p className="mt-2 text-sm text-slate-300">
              Empty legs are usually <em>point-to-point, fixed time</em>. Some allow minor time or airport adjustments for a fee.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-800/60 bg-slate-900/60 p-5 ring-1 ring-inset ring-sky-500/10">
            <h3 className="font-medium text-slate-100">3) Book & fly</h3>
            <p className="mt-2 text-sm text-slate-300">
              Complete booking with the operator. You’ll receive FBO details, departure time, and any catering or baggage notes.
            </p>
          </div>
        </section>

        {/* Tips */}
        <section className="mt-6">
          <div className="rounded-2xl border border-slate-800/60 bg-slate-900/60 p-5 ring-1 ring-inset ring-sky-500/10">
            <h2 className="text-lg font-semibold text-slate-100">Tips for getting the best deal</h2>
            <ul className="mt-3 space-y-2">
              <Bullet>
                <strong className="text-slate-100">Be flexible</strong> on time and nearby airports (TEB/EWR/HPN, OAK/SJC/SFO).
              </Bullet>
              <Bullet>
                <strong className="text-slate-100">Travel light</strong>: some legs have weight/baggage limits depending on fuel and range.
              </Bullet>
              <Bullet>
                <strong className="text-slate-100">Move quickly</strong>: the same leg can be listed by multiple brokers; good ones go fast.
              </Bullet>
              <Bullet>
                <strong className="text-slate-100">Check seats & aircraft</strong>: cabin size, range, and seating vary by type.
              </Bullet>
              <Bullet>
                <strong className="text-slate-100">Watch weather/ops</strong>: repositioning can shift if the primary charter changes.
              </Bullet>
            </ul>
          </div>
        </section>

        {/* FAQ */}
        <section className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-800/60 bg-slate-900/60 p-5 ring-1 ring-inset ring-sky-500/10">
            <h3 className="font-medium text-slate-100">Can I choose my exact time?</h3>
            <p className="mt-2 text-sm text-slate-300">
              Often the time is fixed by the reposition schedule. Some operators offer modest flexibility for a fee or if it still aligns
              with the primary mission.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-800/60 bg-slate-900/60 p-5 ring-1 ring-inset ring-sky-500/10">
            <h3 className="font-medium text-slate-100">Are empty legs shared?</h3>
            <p className="mt-2 text-sm text-slate-300">
              Most are private to your party, but certain operators offer per-seat deals on select routes. Availability varies.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-800/60 bg-slate-900/60 p-5 ring-1 ring-inset ring-sky-500/10">
            <h3 className="font-medium text-slate-100">What if the operator cancels?</h3>
            <p className="mt-2 text-sm text-slate-300">
              If the primary charter changes, the reposition can shift or cancel. Operators typically offer alternatives or refunds per
              their terms — confirm policies before booking.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-800/60 bg-slate-900/60 p-5 ring-1 ring-inset ring-sky-500/10">
            <h3 className="font-medium text-slate-100">How do prices compare?</h3>
            <p className="mt-2 text-sm text-slate-300">
              Pricing depends on aircraft and market dynamics but is often significantly below standard one-way or roundtrip charter rates.
            </p>
          </div>
        </section>

        {/* CTAs */}
        <section className="mt-8 rounded-2xl border border-slate-800/60 bg-slate-900/60 p-6 ring-1 ring-inset ring-sky-500/10 md:flex md:items-center md:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-100">Ready to browse live empty legs?</h3>
            <p className="mt-1 text-sm text-slate-300">Filter by route, time, operator, and price.</p>
          </div>
          <div className="mt-3 flex gap-3 md:mt-0">
            <a href="/">
              <Button className="bg-sky-600/90 text-white hover:bg-sky-500 ring-1 ring-inset ring-sky-400/30">
                Search empty legs
              </Button>
            </a>
            <a href="/routes">
              <Button className="border border-slate-700/70 bg-transparent text-slate-200 hover:bg-slate-800/60">
                View routes map
              </Button>
            </a>
          </div>
        </section>
      </main>

      <Footer />

      {/* Background grid (static) */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(148,163,184,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.06)_1px,transparent_1px)] bg-[size:28px_28px]" />
        <div className="absolute inset-x-0 h-24 bg-gradient-to-b from-sky-500/10 via-sky-500/5 to-transparent" />
      </div>
    </>
  )
}