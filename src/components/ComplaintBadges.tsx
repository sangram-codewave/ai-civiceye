import {
  Building2,
  CircleHelp,
  Construction,
  Droplets,
  Lightbulb,
  Trash2,
  Waves,
} from 'lucide-react'
import { categoryLabel, severityLabel, statusLabel } from '@shared/constants'
import type { Category, ComplaintStatus, Severity } from '@shared/types'
import { Badge } from '@/components/ui/feedback'
import { severityTone, statusTone } from '@/lib/format'

const icons = {
  pothole: Construction,
  garbage: Trash2,
  drainage: Waves,
  streetlight: Lightbulb,
  water_leakage: Droplets,
  infrastructure: Building2,
  other: CircleHelp,
}

export function CategoryIcon({ category, className }: { category: Category; className?: string }) {
  const Icon = icons[category]
  return <Icon className={className} aria-hidden="true" />
}

export function StatusBadge({ status }: { status: ComplaintStatus }) {
  return <Badge className={statusTone(status)}>{statusLabel(status)}</Badge>
}

export function SeverityBadge({ severity }: { severity: Severity }) {
  return <Badge className={severityTone(severity)}>{severityLabel(severity)}</Badge>
}

export function CategoryBadge({ category }: { category: Category }) {
  return <Badge className="bg-slate-50 text-slate-700 ring-slate-200">{categoryLabel(category)}</Badge>
}
