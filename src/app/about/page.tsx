// app/about/page.tsx
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'

export default function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="mx-auto max-w-3xl px-4 py-12 flex-1">
        <h1 className="text-3xl font-semibold tracking-tight">About Altidal</h1>

        <p className="mt-4 text-slate-600 leading-relaxed">
          Altidal aggregates <strong>empty-leg</strong> and <strong>flight-deal</strong> listings
          from leading private jet operators into one real-time view.
          Our goal is to make business aviation inventory transparent,
          searchable, and accessible to brokers and travelers alike.
        </p>

        <section className="mt-10 space-y-4">
          <h2 className="text-xl font-semibold">How It Works</h2>
          <ul className="list-disc pl-5 space-y-2 text-slate-600">
            <li>Scrapers collect data from multiple operators and APIs.</li>
            <li>Legs are normalized into a unified format and saved via Prisma.</li>
            <li>The frontend lets users search, filter, and view deals instantly.</li>
          </ul>
        </section>

        <section className="mt-10 space-y-4">
          <h2 className="text-xl font-semibold">Who We Work With</h2>
          <p className="text-slate-600">
            We currently aggregate data from Air Partner, XO, and Magellan Jets — with more operators
            coming soon. Our aim is to support the entire charter ecosystem.
          </p>
        </section>

        <section className="mt-10 space-y-4">
          <h2 className="text-xl font-semibold">Contact</h2>
          <p className="text-slate-600">
            For partnership inquiries, API access, or media requests, reach us at{' '}
            <a href="mailto:hello@altidal.com" className="text-sky-700 underline">
              hello@altidal.com
            </a>.
          </p>
        </section>
      </main>

      <Footer />
    </div>
  )
}