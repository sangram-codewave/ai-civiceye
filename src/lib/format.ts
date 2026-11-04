import type { ComplaintStatus, Severity } from '@shared/types'

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(iso))
}

export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(iso))
}

export function formatHours(hours: number | null): string {
  if (hours == null) return '—'
  if (hours < 48) return `${Math.round(hours)} hours`
  return `${(hours / 24).toFixed(1)} days`
}

export function statusTone(status: ComplaintStatus): string {
  if (status === 'resolved') return 'bg-emerald-50 text-emerald-700 ring-emerald-200'
  if (status === 'in_progress') return 'bg-blue-50 text-blue-700 ring-blue-200'
  return 'bg-orange-50 text-orange-700 ring-orange-200'
}

export function severityTone(severity: Severity): string {
  if (severity === 'critical') return 'bg-red-50 text-red-700 ring-red-200'
  if (severity === 'high') return 'bg-orange-50 text-orange-700 ring-orange-200'
  if (severity === 'medium') return 'bg-amber-50 text-amber-700 ring-amber-200'
  return 'bg-emerald-50 text-emerald-700 ring-emerald-200'
}

export async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('The image could not be read.'))
    reader.readAsDataURL(file)
  })
}
