
import { Card } from '@/components/ui'

export function MapPanel({ legs }: any) {
  return (
    <Card className="sticky top-24">
      <div className="p-5 text-sm font-medium">Map preview</div>
      <div className="px-5 pb-5">
        <div className="relative h-72 w-full overflow-hidden rounded-xl bg-gradient-to-b from-sky-100 to-slate-100 ring-1 ring-slate-200">
          <svg width="100%" height="100%" viewBox="0 0 400 300">
            <defs>
              <linearGradient id="g1" x1="0" x2="1">
                <stop offset="0%" stopColor="#bae6fd" />
                <stop offset="100%" stopColor="#e2e8f0" />
              </linearGradient>
            </defs>
            <rect width="400" height="300" fill="url(#g1)" />
            {legs.slice(0,3).map((_: any, i: number) => <circle key={i} cx={50 + i*90} cy={80 + i*40} r={6} fill="#0ea5e9" />)}
            {legs.slice(0,3).map((_: any, i: number) => <circle key={`b${i}`} cx={220 + i*60} cy={160 - i*20} r={6} fill="#475569" />)}
            {legs.slice(0,3).map((_: any, i: number) => <line key={`l${i}`} x1={50 + i*90} y1={80 + i*40} x2={220 + i*60} y2={160 - i*20} stroke="#0ea5e9" strokeDasharray="6 6" strokeWidth="2" />)}
          </svg>
        </div>
        <p className="mt-3 text-xs text-slate-500">Upgrade to MapLibre/Mapbox for interactive routing and nearby airports.</p>
      </div>
    </Card>
  )
}
