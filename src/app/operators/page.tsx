'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { MotionProps } from 'framer-motion'
import { UploadCloud, FileSpreadsheet, Info, CheckCircle2, AlertTriangle } from 'lucide-react'

// ✅ Relative, default imports that match your project structure
import Header from '../header'
import Footer from '../footer'
import Button from '../ui/button'
import Input from '../ui/input'

// ✅ Helper type to satisfy TS for motion.div props (adds className, etc.)
type MDivProps = React.HTMLAttributes<HTMLDivElement> & MotionProps

export default function OperatorUploadPage() {
  const [file, setFile] = useState<File | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [toast, setToast] = useState<string>('')

  const onFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFile(e.target.files?.[0] ?? null)
  }

  // Drag & drop
  const [dragOver, setDragOver] = useState(false)
  const onDrop = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(false)
    const f = e.dataTransfer.files?.[0]
    if (f && (/(csv|text\/csv|text\/plain)/.test(f.type) || f.name?.toLowerCase().endsWith('.csv'))) {
      setFile(f)
    } else if (f) {
      setStatus('Please drop a .csv file')
    }
  }, [])

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!file) {
      setStatus('Please choose a CSV file')
      return
    }

    setStatus('Uploading…')
    const form = new FormData()
    form.append('file', file)

    try {
      const res = await fetch('/api/upload-legs', { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok) {
        const msg = `Upload failed: ${data?.error || res.status}`
        setStatus(msg)
        setToast(msg)
        return
      }
      const msg = `Uploaded ${data.added} legs. Rejected rows: ${data.rejectedRows?.join(', ') || 'none'}.`
      setStatus(msg)
      setToast('Upload complete')
      setFile(null)
    } catch (err: any) {
      const msg = `Upload failed: ${err?.message || 'unknown error'}`
      setStatus(msg)
      setToast(msg)
    }
  }

  // auto-hide toast
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(''), 2200)
    return () => clearTimeout(t)
  }, [toast])

  return (
    <>
      {/* Skip link + header */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-[60] focus:rounded-md focus:bg-slate-900 focus:px-3 focus:py-2 focus:text-slate-100"
      >
        Skip to content
      </a>
      <Header />

      {/* Hero / info banner */}
      <section className="mx-auto max-w-7xl px-4 pt-6">
        <div className="rounded-2xl border border-slate-800/60 bg-slate-900/60 p-5 shadow-[0_0_0_1px_rgba(14,165,233,0.12)] ring-1 ring-inset ring-sky-500/10">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="md:col-span-2">
              <h1 className="text-xl font-semibold tracking-tight text-slate-100">For Operators</h1>
              <p className="mt-2 text-sm leading-relaxed text-slate-300">
                Upload your empty legs via CSV and we’ll validate and list them immediately. Faster exposure, less phone tag.
              </p>
              <ul className="mt-3 grid list-disc gap-1 pl-5 text-sm text-slate-300">
                <li><span className="text-slate-400">Instant listing:</span> legs appear in the marketplace right away.</li>
                <li><span className="text-slate-400">Simple CSV format:</span> upload from your existing ops tools.</li>
                <li><span className="text-slate-400">Clean UX:</span> drag-and-drop or pick a file.</li>
              </ul>
            </div>
            <div className="flex items-center justify-center md:justify-end">
              <div className="rounded-xl border border-slate-800/70 bg-slate-950/60 px-4 py-3 text-sm text-slate-300">
                <div className="font-semibold text-slate-100">CSV columns</div>
                <div className="mt-1 space-y-1">
                  <div>• from_iata, to_iata</div>
                  <div>• depart_at (ISO)</div>
                  <div>• aircraft_class/type</div>
                  <div>• price_usd</div>
                </div>
                <a
                  className="mt-3 inline-flex items-center text-xs text-sky-400 hover:text-sky-300"
                  href="/samples/altidal-empty-legs.csv"
                  download
                >
                  <FileSpreadsheet className="mr-1 h-3.5 w-3.5" />
                  Download sample CSV
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Upload panel */}
      <main id="main" className="mx-auto mt-6 max-w-4xl px-4">
        <div className="rounded-2xl border border-slate-800/60 bg-slate-900/60 p-5 shadow-[0_0_0_1px_rgba(14,165,233,0.15)] ring-1 ring-inset ring-sky-500/10 backdrop-blur">
          <form onSubmit={onSubmit} className="grid gap-5">
            <label
              onDragOver={(e) => {
                e.preventDefault()
                setDragOver(true)
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              className={[
                'flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-5 py-10 text-center transition',
                dragOver ? 'border-sky-500/60 bg-sky-500/10' : 'border-slate-700/80 bg-slate-950/40 hover:bg-slate-950/60',
              ].join(' ')}
            >
              <UploadCloud className="h-8 w-8 text-sky-400" />
              <div className="text-slate-200 font-medium">Drag & drop your CSV here</div>
              <div className="text-sm text-slate-400">or click to choose a file</div>
              <Input
                type="file"
                accept=".csv,text/csv,text/plain"
                onChange={onFilePick}
                className="mt-3 w-full max-w-sm bg-slate-900/70"
              />
              {file ? (
                <div className="mt-3 text-xs text-slate-400">
                  Selected: <span className="text-slate-200">{file.name}</span>
                  {file.size ? ` • ${(file.size / 1024).toFixed(1)} KB` : null}
                </div>
              ) : null}
            </label>

            <div className="flex items-start gap-2 rounded-lg border border-slate-800 bg-slate-950/50 p-3 text-sm text-slate-300">
              <Info className="mt-0.5 h-4 w-4 text-sky-400" />
              <div>
                Need a template?{' '}
                <a href="/samples/altidal-empty-legs.csv" download className="text-sky-400 hover:text-sky-300">
                  Download the sample CSV
                </a>
                . The uploader validates basic shapes and will report rejected rows.
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="submit"
                className="bg-sky-600/90 text-white hover:bg-sky-500 ring-1 ring-inset ring-sky-400/30"
                disabled={!file}
              >
                Upload CSV
              </Button>
              {status ? (
                <div className="flex items-center gap-2 text-sm text-slate-300">
                  {status.startsWith('Upload complete') || status.startsWith('Uploaded') ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  ) : status.startsWith('Upload failed') || status.includes('failed') ? (
                    <AlertTriangle className="h-4 w-4 text-amber-400" />
                  ) : null}
                  <span className="whitespace-pre-wrap">{status}</span>
                </div>
              ) : null}
            </div>
          </form>
        </div>

        <p className="mt-6 text-xs text-slate-500">
          Note: This MVP stores uploads in memory for demos. We’ll move to a persistent database and API keys in the next phase.
        </p>
      </main>

      <Footer />

      {/* Toast */}
      <AnimatePresence>
        {toast ? (
          <motion.div
            {...({
              initial: { opacity: 0, y: -10 },
              animate: { opacity: 1, y: 0 },
              exit: { opacity: 0, y: -10 },
              className:
                'fixed right-4 top-4 z-[200] rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 shadow-lg',
              children: toast,
            } as MDivProps)}
          />
        ) : null}
      </AnimatePresence>

      {/* Background grid + sweep */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(148,163,184,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.06)_1px,transparent_1px)] bg-[size:28px_28px]" />
        <motion.div
          {...({
            className: 'absolute inset-x-0 h-24 bg-gradient-to-b from-sky-500/10 via-sky-500/5 to-transparent',
            initial: { y: -100 },
            animate: { y: [-100, 1200] },
            transition: { repeat: Infinity, duration: 8, ease: 'linear' },
          } as MDivProps)}
        />
      </div>
    </>
  )
}
