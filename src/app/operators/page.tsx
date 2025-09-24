'use client'
import { useState } from 'react'
import { Header } from '@/components/header'
import { Footer } from '@/components/footer'
import { Card, Button, Input } from '@/components/ui'

export default function OperatorUploadPage() {
  const [file, setFile] = useState<File | null>(null)
  const [status, setStatus] = useState<string | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFile(e.target.files?.[0] ?? null)
  }

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!file) return setStatus('Please choose a CSV file')

    setStatus('Uploading…')
    const form = new FormData()
    form.append('file', file)

    try {
      const res = await fetch('/api/upload-legs', { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok) {
        setStatus(`Upload failed: ${data?.error || res.status}`)
        return
      }
      setStatus(`Uploaded ${data.added} legs. Rejected rows: ${data.rejectedRows?.join(', ') || 'none'}.`)
    } catch (err: any) {
      setStatus(`Upload failed: ${err?.message || 'unknown error'}`)
    }
  }

  return (
    <div className="min-h-screen">
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-2xl font-semibold tracking-tight">For Operators</h1>
        <p className="mt-2 text-slate-600">Upload your empty legs via CSV. We’ll validate and list them immediately.</p>

        <Card className="mt-6 p-5">
          <form onSubmit={onSubmit} className="grid gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">CSV file</label>
              <Input type="file" accept=".csv,text/csv" onChange={handleFileChange} />
              <a
                className="mt-2 inline-block text-sm text-sky-700 hover:text-sky-900"
                href="/samples/altidal-empty-legs.csv"
                download
              >
                Download sample CSV
              </a>
            </div>
            <div className="flex gap-3">
              <Button type="submit">Upload</Button>
              {status && <div className="text-sm text-slate-600">{status}</div>}
            </div>
          </form>
        </Card>

        <p className="mt-6 text-xs text-slate-500">
          Note: This MVP stores uploads in memory for demos. We’ll move to a persistent database and API keys in the next phase.
        </p>
      </main>
      <Footer />
    </div>
  )
}