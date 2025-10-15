// app/privacy/page.tsx
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

import Header from '../header'
import Footer from '../footer'

export const metadata = {
  title: 'Privacy Policy — Altidal',
  description: 'How Altidal collects, uses, and protects your data.',
}

export default function PrivacyPage() {
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
          <h1 className="text-2xl font-semibold tracking-tight text-slate-100">Privacy Policy</h1>
          <p className="mt-2 text-sm text-slate-400">Last updated: {updated}</p>
          <p className="mt-3 text-sm text-slate-300">
            This Privacy Policy explains how Altidal (“we”, “us”) collects, uses, and shares information when you use our
            website, APIs, and services (the “Services”).
          </p>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl p-5 border border-slate-800/60 bg-slate-900/60 ring-1 ring-inset ring-sky-500/10">
            <h2 className="text-lg font-semibold text-slate-100">Information We Collect</h2>
            <ul className="mt-3 space-y-2 text-sm text-slate-300">
              <li>Account & contact details you provide (e.g., email for alerts).</li>
              <li>Usage data (pages viewed, queries, device/browser metadata).</li>
              <li>Upload data (e.g., operator CSVs) for ingestion and validation.</li>
              <li>Cookies/local storage for preferences (e.g., currency).</li>
            </ul>
          </div>

          <div className="rounded-2xl p-5 border border-slate-800/60 bg-slate-900/60 ring-1 ring-inset ring-sky-500/10">
            <h2 className="text-lg font-semibold text-slate-100">How We Use Information</h2>
            <ul className="mt-3 space-y-2 text-sm text-slate-300">
              <li>Provide, maintain, and improve the Services and UI performance.</li>
              <li>Process uploads, normalize data, and surface relevant inventory.</li>
              <li>Communicate updates and respond to inquiries (with your consent).</li>
              <li>Detect abuse, debug issues, and meet legal obligations.</li>
            </ul>
          </div>
        </section>

        <section className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl p-5 border border-slate-800/60 bg-slate-900/60 ring-1 ring-inset ring-sky-500/10">
            <h2 className="text-lg font-semibold text-slate-100">Sharing & Disclosure</h2>
            <p className="mt-3 text-sm text-slate-300">
              We don’t sell personal information. We may share limited data with service providers (e.g., hosting, analytics)
              under contract; with partners when you explicitly interact (e.g., enquiries); or as required by law.
            </p>
          </div>

          <div className="rounded-2xl p-5 border border-slate-800/60 bg-slate-900/60 ring-1 ring-inset ring-sky-500/10">
            <h2 className="text-lg font-semibold text-slate-100">Data Retention</h2>
            <p className="mt-3 text-sm text-slate-300">
              We retain data as long as necessary for the purposes above, then delete or anonymize it. You can request deletion of
              your personal data at any time.
            </p>
          </div>
        </section>

        <section className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl p-5 border border-slate-800/60 bg-slate-900/60 ring-1 ring-inset ring-sky-500/10">
            <h2 className="text-lg font-semibold text-slate-100">Your Rights</h2>
            <ul className="mt-3 space-y-2 text-sm text-slate-300">
              <li>Access, correct, or delete your personal data.</li>
              <li>Opt-out of non-essential communications.</li>
              <li>Control cookies via your browser settings.</li>
            </ul>
          </div>

          <div className="rounded-2xl p-5 border border-slate-800/60 bg-slate-900/60 ring-1 ring-inset ring-sky-500/10">
            <h2 className="text-lg font-semibold text-slate-100">Security</h2>
            <p className="mt-3 text-sm text-slate-300">
              We use industry-standard measures to protect data. No method of transmission or storage is 100% secure; we continually
              improve our practices.
            </p>
          </div>
        </section>

        <section className="mt-4 grid gap-4">
          <div className="rounded-2xl p-5 border border-slate-800/60 bg-slate-900/60 ring-1 ring-inset ring-sky-500/10">
            <h2 className="text-lg font-semibold text-slate-100">International & Children</h2>
            <p className="mt-3 text-sm text-slate-300">
              The Services may be operated from the U.S. and elsewhere. By using them, you consent to processing outside your region.
              Altidal is not directed to children under 13.
            </p>
          </div>

          <div className="rounded-2xl p-5 border border-slate-800/60 bg-slate-900/60 ring-1 ring-inset ring-sky-500/10">
            <h2 className="text-lg font-semibold text-slate-100">Contact</h2>
            <p className="mt-3 text-sm text-slate-300">
              Questions or requests? Email{' '}
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