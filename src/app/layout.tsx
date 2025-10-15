'use client'

import './globals.css' // keep your Tailwind base/imports here
import React from 'react'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased">
        {children}

        {/* subtle grid + moving glow, same as the mock */}
        <div className="pointer-events-none fixed inset-0 -z-10">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(148,163,184,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.06)_1px,transparent_1px)] bg-[size:28px_28px]" />
          {/* optional moving glow wash */}
          {/* <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-sky-500/10 via-sky-500/5 to-transparent" /> */}
        </div>
      </body>
    </html>
  )
}