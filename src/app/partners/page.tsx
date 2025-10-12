// app/partners/page.tsx
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { prisma } from '@/lib/prisma'
import { Card, Button } from '@/components/ui'

type PartnerKey = 'airpartner' | 'xo' | 'magellan'

const PARTNERS: { key: PartnerKey; name: string; blurb: string; site?: string }[] = [
  { key: 'airpartner', name: 'Air Partner', blurb: 'Global aviation services with a broad empty-leg footprint.' },
  { key: 'xo',         name: 'XO',          blurb: 'Tech-forward marketplace with frequent US/EU repositioning deals.' },
  { key: 'magellan',   name: 'Magellan Jets', blurb: 'On-demand private aviation with competitive one-way pricing.' },
]

async function getPartnerStats() {
  // Group by operator to get live counts
  const rows = await prisma.leg.groupBy({
    by: ['operator'],
    _count: { _all: true },
  })

  const counts = Object.fromEntries(rows.map(r => [r.operator, r._count._all])) as Record<string, number>

  return {
    airpartner: counts['airpartner'] ?? 0,
    xo: counts['xo'] ?? 0,
    magellan: counts['magellan'] ?? 0,
    total: rows.reduce((acc, r) => acc + r._count._all, 0),
  }
}

export default async function PartnersPage() {
  const stats = await getPartnerStats()

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="mx-auto w-full max-w-7xl px-4 py-10 flex-1">
        <div className="max-w-3xl">
          <h1 className="text-3xl font-semibold tracking-tight">Partners</h1>
          <p className="mt-3 text-slate-600 leading-relaxed">
            Altidal aggregates empty-leg and flight-deal inventory from leading operators to make private aviation
            more transparent and easier to book. We currently index <strong>{stats.total}</strong> live legs across our partners.
          </p>
        </div>

        {/* Partner cards */}
        <section className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {PARTNERS.map(p => (
            <Card key={p.key} className="p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">{p.name}</h2>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
                    {stats[p.key]} legs
                  </span>
                </div>
                <p className="mt-2 text-sm text-slate-600">{p.blurb}</p>
              </div>

              <div className="mt-4 flex items-center gap-2">
                <a
                  href={`/api/legs?operator=${p.key}&limit=50`}
                  className="text-sm text-sky-700 hover:text-sky-900 underline"
                >
                  View latest legs
                </a>
                {p.site && (
                  <>
                    <span className="text-slate-300">•</span>
                    <a
                      href={p.site}
                      target="_blank"
                      className="text-sm text-slate-600 hover:text-slate-900 underline"
                    >
                      Visit site
                    </a>
                  </>
                )}
              </div>
            </Card>
          ))}
        </section>

        {/* Why partner */}
        <section className="mt-10 grid gap-4 lg:grid-cols-3">
          <Card className="p-5">
            <h3 className="font-medium">Real-time distribution</h3>
            <p className="mt-2 text-sm text-slate-600">
              Push your empty legs to a qualified audience of brokers and buyers. We refresh continually and surface your best deals first.
            </p>
          </Card>
          <Card className="p-5">
            <h3 className="font-medium">Quality controls</h3>
            <p className="mt-2 text-sm text-slate-600">
              We normalize aircraft, pricing, and routing data, dedupe duplicates, and flag outliers for review.
            </p>
          </Card>
          <Card className="p-5">
            <h3 className="font-medium">Easy integration</h3>
            <p className="mt-2 text-sm text-slate-600">
              CSV upload, JSON API, or scraper integration. Start simple—scale later.
            </p>
          </Card>
        </section>

        {/* CTA */}
        <section className="mt-10 flex flex-col items-start gap-3 rounded-2xl border p-6 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-lg font-semibold">Become a partner</h3>
            <p className="mt-1 text-sm text-slate-600">
              Upload a sample CSV or connect your API. We’ll validate and list your legs quickly.
            </p>
          </div>
          <div className="flex gap-3">
            <a href="/operators">
              <Button>Upload legs</Button>
            </a>
            <a href="mailto:hello@altidal.com">
              <Button variant="outline">Talk to us</Button>
            </a>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}