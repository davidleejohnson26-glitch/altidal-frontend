
import { Mail, Phone } from 'lucide-react'

export function Footer() {
  return (
  <footer className="border-t border-slate-200/70 bg-white">
  <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-4 py-12 sm:grid-cols-3">
    <div>
      <div className="font-display text-lg font-semibold">Altidal</div>
      <p className="mt-2 text-sm text-slate-600">Where empty legs find altitude.</p>
    </div>
    <div>
      <div className="text-sm font-medium text-slate-900">Legal</div>
      <ul className="mt-2 text-sm text-slate-600 space-y-2">
        <li>Altidal is not an air carrier. We connect travelers with Part 135 operators and licensed brokers.</li>
      </ul>
    </div>
    <div>
      <div className="text-sm font-medium text-slate-900">Contact</div>
      <ul className="mt-2 text-sm text-slate-600 space-y-2">
        <li className="flex items-center gap-2"><Mail className="h-4 w-4" /> hello@altidal.com</li>
        <li className="flex items-center gap-2"><Phone className="h-4 w-4" /> +1 (555) 555-0199</li>
      </ul>
    </div>
  </div>
</footer>
  )
}
