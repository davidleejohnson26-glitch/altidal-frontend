// app/empty-legs/page.tsx
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { Card, Button } from '@/components/ui'

export const metadata = {
  title: 'What Are Empty Legs? — Altidal',
  description:
    'Learn how private jet empty legs work, why they can be 30–75% cheaper, and tips to book them smartly with Altidal.',
}

const Bullet = ({ children }: { children: React.ReactNode }) => (
  <li className="flex items-start gap-2">
    <span className="mt-[6px] inline-block h-1.5 w-1.5 rounded-full bg-sky-600" />
    <span className="text-sm text-slate-700">{children}</span>
  </li>
)

export default function EmptyLegsPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="mx-auto w-full max-w-7xl px-4 py-10 flex-1">
        <div className="max-w-3xl">
          <h1 className="text-3xl font-semibold tracking-tight">Empty Legs: The Smart Way to Fly Private</h1>
          <p className="mt-3 text-slate-600">
            “Empty legs” are repositioning flights — when an aircraft must fly without passengers to its next pickup or back to base.
            Because that flight is already planned, seats are often discounted compared to standard on-demand charters.
          </p>
        </div>

        {/* Benefits */}
        <section className="mt-8 grid gap-4 md:grid-cols-2">
          <Card className="p-5">
            <h2 className="text-lg font-semibold">Why they’re cheaper</h2>
            <ul className="mt-3 space-y-2">
              <Bullet>Aircraft and crew are already scheduled — fewer variable costs to cover.</Bullet>
              <Bullet>Operators prefer any revenue to flying empty; discounts can be substantial.</Bullet>
              <Bullet>Last-minute inventory gets marked down as departure approaches.</Bullet>
            </ul>
          </Card>
          <Card className="p-5">
            <h2 className="text-lg font-semibold">Typical savings</h2>
            <p className="mt-3 text-sm text-slate-700">
              Depending on route, timing, and aircraft type, consumers often see <strong>30–75% off</strong> standard charter pricing.
              Smaller jets and popular corridors (e.g., LA↔️Vegas, NYC↔️Florida) see frequent deals.
            </p>
          </Card>
        </section>

        {/* How it works */}
        <section className="mt-8 grid gap-4 lg:grid-cols-3">
          <Card className="p-5">
            <h3 className="font-medium">1) Find a match</h3>
            <p className="mt-2 text-sm text-slate-700">
              Search available empty legs on Altidal by route, date, or operator. Inventory changes throughout the day.
            </p>
          </Card>
          <Card className="p-5">
            <h3 className="font-medium">2) Confirm details</h3>
            <p className="mt-2 text-sm text-slate-700">
              Empty legs are usually <em>point-to-point, fixed time</em>. Some allow minor time or airport adjustments for a fee.
            </p>
          </Card>
          <Card className="p-5">
            <h3 className="font-medium">3) Book & fly</h3>
            <p className="mt-2 text-sm text-slate-700">
              Complete booking with the operator. You’ll receive FBO details, departure time, and any catering or baggage notes.
            </p>
          </Card>
        </section>

        {/* Tips */}
        <section className="mt-8">
          <Card className="p-5">
            <h2 className="text-lg font-semibold">Tips for getting the best deal</h2>
            <ul className="mt-3 space-y-2">
              <Bullet><strong>Be flexible</strong> on time and nearby airports (TEB/EWR/HPN, OAK/SJC/SFO).</Bullet>
              <Bullet><strong>Travel light</strong>: some legs have weight/baggage limits depending on fuel and range.</Bullet>
              <Bullet><strong>Move quickly</strong>: the same leg can be listed by multiple brokers; good ones go fast.</Bullet>
              <Bullet><strong>Check seats & aircraft</strong>: cabin size, range, and seating vary by type.</Bullet>
              <Bullet><strong>Watch weather/ops</strong>: repositioning can shift if the primary charter changes.</Bullet>
            </ul>
          </Card>
        </section>

        {/* FAQ */}
        <section className="mt-8 grid gap-4 md:grid-cols-2">
          <Card className="p-5">
            <h3 className="font-medium">Can I choose my exact time?</h3>
            <p className="mt-2 text-sm text-slate-700">
              Often the time is fixed by the reposition schedule. Some operators offer modest flexibility for a fee or if it still
              aligns with the primary mission.
            </p>
          </Card>
          <Card className="p-5">
            <h3 className="font-medium">Are empty legs shared?</h3>
            <p className="mt-2 text-sm text-slate-700">
              Most are private to your party, but certain operators offer per-seat deals on select routes. Availability varies.
            </p>
          </Card>
          <Card className="p-5">
            <h3 className="font-medium">What if the operator cancels?</h3>
            <p className="mt-2 text-sm text-slate-700">
              If the primary charter changes, the reposition can shift or cancel. Operators typically offer alternatives or refunds per
              their terms — confirm policies before booking.
            </p>
          </Card>
          <Card className="p-5">
            <h3 className="font-medium">How do prices compare?</h3>
            <p className="mt-2 text-sm text-slate-700">
              Pricing depends on aircraft and market dynamics but is often significantly below standard one-way or roundtrip charter rates.
            </p>
          </Card>
        </section>

        {/* CTAs */}
        <section className="mt-10 flex flex-col items-start gap-3 rounded-2xl border p-6 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-lg font-semibold">Ready to browse live empty legs?</h3>
            <p className="mt-1 text-sm text-slate-600">Filter by route, time, operator, and price.</p>
          </div>
          <div className="flex gap-3">
            <a href="/">
              <Button>Search empty legs</Button>
            </a>
            <a href="/routes">
              <Button variant="outline">View routes map</Button>
            </a>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}