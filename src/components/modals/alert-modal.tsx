
'use client'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Input, Button, Select } from '@/components/ui'
import { X, Loader2 } from 'lucide-react'

const alertSchema = z.object({
  from: z.string().min(3),
  to: z.string().min(3),
  start: z.string().min(1),
  end: z.string().min(1),
  seats: z.coerce.number().min(1).max(16),
  classPref: z.string().optional(),
  email: z.string().email(),
})

export function AlertModal({ query, onClose, onSuccess }: any) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const { register, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm({
    resolver: zodResolver(alertSchema),
    defaultValues: { ...query, email: '' },
  })
  const submit = async (data: any) => {
    await new Promise(r => setTimeout(r, 700))
    reset(); onClose(); onSuccess?.()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-xl ring-1 ring-slate-200">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <div className="text-sm font-semibold">Create route alert</div>
          <button onClick={onClose} className="rounded-full p-1 hover:bg-slate-100"><X className="h-4 w-4" /></button>
        </div>
        <form onSubmit={handleSubmit(submit)} className="p-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">From</label>
              <Input {...register('from')} />
              {errors.from && <p className="mt-1 text-xs text-red-600">From airport is required</p>}
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">To</label>
              <Input {...register('to')} />
              {errors.to && <p className="mt-1 text-xs text-red-600">To airport is required</p>}
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Earliest</label>
              <Input type="date" {...register('start')} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Latest</label>
              <Input type="date" {...register('end')} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Seats</label>
              <Input type="number" min={1} max={16} {...register('seats', { valueAsNumber: true })} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Class</label>
              <Select defaultValue={query.classPref} {...register('classPref')}>
                <option value="any">Any</option>
                <option value="light">Light</option>
                <option value="super_light">Super Light</option>
                <option value="midsize">Midsize</option>
                <option value="super_midsize">Super Midsize</option>
                <option value="heavy">Heavy</option>
              </Select>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Email for alerts</label>
            <Input placeholder="you@example.com" {...register('email')} />
            {errors.email && <p className="mt-1 text-xs text-red-600">Valid email required</p>}
          </div>
          <div className="flex items-center justify-between">
            <div className="text-xs text-slate-500">We’ll email you when we find matching empty legs.</div>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create alert'}</Button>
          </div>
        </form>
      </div>
    </div>
  )
}
