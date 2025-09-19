
import './globals.css'
import type { Metadata } from 'next'
import { Inter, Sora } from 'next/font/google'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const sora = Sora({ subsets: ['latin'], variable: '--font-sora' })

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
    <html lang="en" className={`${inter.variable} ${sora.variable}`}>
      <body className="font-sans">{children}</body>
    </html>
  )
}

