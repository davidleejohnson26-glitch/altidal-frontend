
import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Altidal — Empty‑leg private flights',
  description: 'Where empty legs find altitude.',
  openGraph: {
    title: 'Altidal',
    description: 'Search empty‑leg private flights and get alerts.',
    url: 'https://altidal.com',
    siteName: 'Altidal',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
