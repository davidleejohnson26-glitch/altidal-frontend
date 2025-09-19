
'use client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useEffect } from 'react'
import { Input, Button } from '@/components/ui'
import { Loader2, X } from 'lucide-react'

const inquirySchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  notes: z.string().optional(),
})

export function InquiryModal({ leg, onClose, onSuccess }: any) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const { register, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm({ resolver: zodResolver(inquirySchema) })
  const submit = async (data: any) => {
    await new Promise(r => setTimeout(r, 700)) // simulate
    reset(); onClose(); onSuccess?.()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-xl ring-1 ring-slate-200">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <div className="text-sm font-semibold">Send inquiry</div>
          <button onClick={onClose} className="rounded-full p-1 hover:bg-slate-100"><X className="h-4 w-4" /></button>
        </div>
        <form onSubmit={handleSubmit(submit)} className="p-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Name</label>
              <Input placeholder="Your full name" {...register('name')} />
              {errors.name && <p className="mt-1 text-xs text-red-600">{String(errors.name.message)}</p>}
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Email</label>
              <Input placeholder="you@example.com" {...register('email')} />
              {errors.email && <p className="mt-1 text-xs text-red-600">{String(errors.email.message)}</p>}
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Phone (optional)</label>
            <Input placeholder="+1 (555) 555-0199" {...register('phone')} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Notes</label>
            <Input placeholder="Timing flexibility, pax, catering…" {...register('notes')} />
          </div>
          <div className="flex items-center justify-between">
            <div className="text-xs text-slate-500">We’ll forward your request to the operator/broker.</div>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send'}</Button>
          </div>
        </form>
      </div>
    </div>
  )
}
