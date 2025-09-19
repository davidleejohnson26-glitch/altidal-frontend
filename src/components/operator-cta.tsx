
import { Card, Button } from '@/components/ui'
import { Plane } from 'lucide-react'

export function OperatorCTA() {
  return (
    <Card id="operators" className="mt-6">
      <div className="p-5 flex items-center gap-2 text-sm font-medium"><Plane className="h-4 w-4" /> For operators & brokers</div>
      <div className="px-5 pb-5">
        <p className="text-sm text-slate-600">List your empty legs with Altidal and receive qualified inquiries. CSV/JSON upload and API available.</p>
        <div className="mt-3 flex gap-2">
          <Button>Get started</Button>
          <Button variant="outline">View CSV template</Button>
        </div>
      </div>
    </Card>
  )
}
