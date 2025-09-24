'use client'
import Link from 'next/link'
import { Plane } from 'lucide-react'
import { Card, Button } from '@/components/ui'

export function OperatorCTA() {
  return (
    <Card id="operators" className="mt-6">
      <div className="p-5 flex items-center gap-2 text-sm font-medium">
        <Plane className="h-4 w-4" />
        For operators & brokers
      </div>

      <div className="px-5 pb-5">
        <p className="text-sm text-slate-600">
          List your empty legs with Altidal and receive qualified inquiries. CSV/JSON upload and API available.
        </p>

        <div className="mt-4 flex gap-3">
          {/* Go to the upload page */}
          <Link href="/operators">
            <Button>Get started</Button>
          </Link>

          {/* Download sample CSV (must exist under public/samples/) */}
          <a
            href="/samples/altidal-empty-legs.csv"
            download
            className="inline-flex items-center rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            View CSV template
          </a>
        </div>
      </div>
    </Card>
  )
}