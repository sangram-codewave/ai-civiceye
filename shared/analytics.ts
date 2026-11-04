import { CATEGORY_VALUES, categoryLabel } from './constants'
import type {
  CategoryStat,
  ComplaintListItem,
  ComplaintStatus,
  DepartmentWorkload,
  Overview,
  TrendPoint,
} from './types'

type AnalyticsRow = Pick<
  ComplaintListItem,
  'category' | 'severity' | 'status' | 'created_at' | 'resolved_at' | 'department_id' | 'department_name'
>

export function summarize(rows: AnalyticsRow[]): Overview {
  const pending = rows.filter((row) => row.status === 'pending').length
  const inProgress = rows.filter((row) => row.status === 'in_progress').length
  const resolved = rows.filter((row) => row.status === 'resolved').length
  const critical = rows.filter((row) => row.severity === 'critical' && row.status !== 'resolved').length
  const hours = rows
    .filter((row) => row.status === 'resolved' && row.resolved_at)
    .map((row) => (new Date(row.resolved_at as string).getTime() - new Date(row.created_at).getTime()) / 36e5)
    .filter((value) => Number.isFinite(value) && value >= 0)
  return {
    total: rows.length,
    open: pending + inProgress,
    pending,
    inProgress,
    critical,
    resolved,
    averageResolutionHours: hours.length ? hours.reduce((sum, value) => sum + value, 0) / hours.length : null,
  }
}

export function categoryStats(rows: AnalyticsRow[]): CategoryStat[] {
  return CATEGORY_VALUES.map((category) => ({
    category,
    label: categoryLabel(category),
    count: rows.filter((row) => row.category === category).length,
  }))
}

export function severityStats(rows: AnalyticsRow[]): { severity: string; count: number }[] {
  return (['low', 'medium', 'high', 'critical'] as const).map((severity) => ({
    severity: severity[0]!.toUpperCase() + severity.slice(1),
    count: rows.filter((row) => row.severity === severity).length,
  }))
}

function monthKey(iso: string): string {
  const date = new Date(iso)
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  return `${date.getUTCFullYear()}-${month}`
}

export function monthlyTrends(rows: AnalyticsRow[], now = new Date()): TrendPoint[] {
  const points: TrendPoint[] = []
  for (let offset = 5; offset >= 0; offset -= 1) {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - offset, 1))
    const month = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`
    const label = new Intl.DateTimeFormat('en-IN', {
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(date)
    points.push({
      month,
      label,
      reported: rows.filter((row) => monthKey(row.created_at) === month).length,
      resolved: rows.filter((row) => row.resolved_at && monthKey(row.resolved_at) === month).length,
    })
  }
  return points
}

export function departmentWorkload(
  departments: { id: string; name: string }[],
  rows: AnalyticsRow[],
): DepartmentWorkload[] {
  return departments.map((department) => {
    const matching = rows.filter(
      (row) => row.department_id === department.id || row.department_name === department.name,
    )
    const count = (status: ComplaintStatus) => matching.filter((row) => row.status === status).length
    const pending = count('pending')
    const inProgress = count('in_progress')
    const resolved = count('resolved')
    return {
      id: department.id,
      name: department.name,
      pending,
      inProgress,
      resolved,
      total: pending + inProgress + resolved,
    }
  })
}
