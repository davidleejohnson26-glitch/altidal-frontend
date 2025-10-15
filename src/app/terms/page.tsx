// app/terms/page.tsx
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

import Header from '../header'
import Footer from '../footer'

export const metadata = {
  title: 'Terms of Service — Altidal',
  description: 'The rules and conditions for using Altidal.',
}

export default function TermsPage() {
  const updated = '2025-01-01'

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-[60] focus:rounded-md focus:bg-slate-900 focus:px-3 focus:py-2 focus:text-slate-100"
      >
        Skip to content
      </a>

      <Header />

      <main id="main" className="mx-auto w-full max-w-7xl px-4 py-10">
        <section className="rounded-2xl border border-slate-800/60 bg-slate-900/60 p-6 ring-1 ring-inset ring-sky-500/10 shadow-[0_0_0_1px_rgba(14,165,233,0.12)]">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-100">Terms of Service</h1>
          <p className="mt-2 text-sm text-slate-400">Last updated: {updated}</p>
          <p className="mt-3 text-sm text-slate-300">
            These Terms govern your access to and use of Altidal (“we”, “us”) websites, APIs, and services (the “Services”).
            By using the Services, you agree to these Terms.
          </p>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl p-5 border border-slate-800/60 bg-slate-900/60 ring-1 ring-inset ring-sky-500/10">
            <h2 className="text-lg font-semibold text-slate-100">Use of Services</h2>
            <ul className="mt-3 space-y-2 text-sm text-slate-300">
              <li>Don’t misuse or interfere with the Services or access non-public areas.</li>
              <li>Follow published API rules, rate limits, and attribution requirements.</li>
              <li>You’re responsible for content you upload (e.g., CSVs) and its accuracy.</li>
            </ul>
          </div>

          <div className="rounded-2xl p-5 border border-slate-800/60 bg-slate-900/60 ring-1 ring-inset ring-sky-500/10">
            <h2 className="text-lg font-semibold text-slate-100">Content & Listings</h2>
            <p className="mt-3 text-sm text-slate-300">
              Inventory, prices, and schedules are subject to change and may be provided by third parties. We don’t
              guarantee availability, accuracy, or suitability of any listing.
            </p>
          </div>
        </section>

        <section className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl p-5 border border-slate-800/60 bg-slate-900/60 ring-1 ring-inset ring-sky-500/10">
            <h2 className="text-lg font-semibold text-slate-100">Accounts & Communications</h2>
            <p className="mt-3 text-sm text-slate-300">
              If you create an account or subscribe to alerts, keep credentials confidential. We may send service or
              transactional emails; you can opt out of non-essential ones.
            </p>
          </div>

          <div className="rounded-2xl p-5 border border-slate-800/60 bg-slate-900/60 ring-1 ring-inset ring-sky-500/10">
            <h2 className="text-lg font-semibold text-slate-100">Prohibited Activities</h2>
            <ul className="mt-3 space-y-2 text-sm text-slate-300">
              <li>Automated scraping beyond documented APIs or rate limits.</li>
              <li>Reverse engineering or circumventing security/controls.</li>
              <li>Infringing, unlawful, or harmful behavior on or via the Services.</li>
            </ul>
          </div>
        </section>

        <section className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl p-5 border border-slate-800/60 bg-slate-900/60 ring-1 ring-inset ring-sky-500/10">
            <h2 className="text-lg font-semibold text-slate-100">Disclaimers</h2>
            <p className="mt-3 text-sm text-slate-300">
              THE SERVICES ARE PROVIDED “AS IS” WITHOUT WARRANTIES OF ANY KIND. TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE
              DISCLAIM IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
            </p>
          </div>

          <div className="rounded-2xl p-5 border border-slate-800/60 bg-slate-900/60 ring-1 ring-inset ring-sky-500/10">
            <h2 className="text-lg font-semibold text-slate-100">Liability</h2>
            <p className="mt-3 text-sm text-slate-300">
              To the fullest extent permitted by law, Altidal will not be liable for indirect, incidental, special,
              consequential, or punitive damages, or any loss of profits or data.
            </p>
          </div>
        </section>

        <section className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl p-5 border border-slate-800/60 bg-slate-900/60 ring-1 ring-inset ring-sky-500/10">
            <h2 className="text-lg font-semibold text-slate-100">Termination</h2>
            <p className="mt-3 text-sm text-slate-300">
              We may suspend or terminate access for any violation of these Terms. You may stop using the Services at any time.
            </p>
          </div>

          <div className="rounded-2xl p-5 border border-slate-800/60 bg-slate-900/60 ring-1 ring-inset ring-sky-500/10">
            <h2 className="text-lg font-semibold text-slate-100">Governing Law</h2>
            <p className="mt-3 text-sm text-slate-300">
              These Terms are governed by the laws of the jurisdiction where Altidal is organized, without regard to
              conflict-of-laws principles.
            </p>
          </div>
        </section>

        <section className="mt-4 grid gap-4">
          <div className="rounded-2xl p-5 border border-slate-800/60 bg-slate-900/60 ring-1 ring-inset ring-sky-500/10">
            <h2 className="text-lg font-semibold text-slate-100">Changes</h2>
            <p className="mt-3 text-sm text-slate-300">
              We may update these Terms from time to time. We’ll revise the “Last updated” date and, where appropriate, provide
              additional notice. Continued use signifies acceptance.
            </p>
          </div>

          <div className="rounded-2xl p-5 border border-slate-800/60 bg-slate-900/60 ring-1 ring-inset ring-sky-500/10">
            <h2 className="text-lg font-semibold text-slate-100">Contact</h2>
            <p className="mt-3 text-sm text-slate-300">
              Questions? Email{' '}
              <a href="mailto:hello@altidal.com" className="text-sky-400 underline">
                hello@altidal.com
              </a>
              .
            </p>
          </div>
        </section>
      </main>

      <Footer />

      {/* Background */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(148,163,184,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.06)_1px,transparent_1px)] bg-[size:28px_28px]" />
        <div className="absolute inset-x-0 h-24 bg-gradient-to-b from-sky-500/10 via-sky-500/5 to-transparent" />
      </div>
    </>
  )
}
