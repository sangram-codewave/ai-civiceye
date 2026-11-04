import { categoryStats, departmentWorkload, monthlyTrends, severityStats, summarize } from '../shared/analytics'
import type { Category, ComplaintStatus, Severity } from '../shared/types'
import { listDepartments, listOfficers } from './complaints'
import { raiseDbError } from './mappers'
import { getAdmin } from './supabase'

export async function analyticsRows() {
  const { data, error } = await getAdmin()
    .from('complaints')
    .select('category, severity, status, created_at, resolved_at, department_id, department:departments(name)')
    .limit(5000)
  if (error) raiseDbError(error, 'Analytics could not be loaded.')
  return (data ?? []).map((row) => {
    const department = row.department as { name: string } | { name: string }[] | null
    const departmentName = Array.isArray(department) ? department[0]?.name ?? null : department?.name ?? null
    return {
      category: row.category as Category,
      severity: row.severity as Severity,
      status: row.status as ComplaintStatus,
      created_at: row.created_at as string,
      resolved_at: (row.resolved_at as string | null) ?? null,
      department_id: (row.department_id as string | null) ?? null,
      department_name: departmentName,
    }
  })
}

export async function buildOverview() {
  const [rows, departments, officers] = await Promise.all([analyticsRows(), listDepartments(), listOfficers()])
  return {
    ...summarize(rows),
    officers,
    departments: departmentWorkload(departments, rows),
  }
}

export async function buildCategoryStats() {
  const rows = await analyticsRows()
  return { categories: categoryStats(rows), severities: severityStats(rows) }
}

export async function buildTrends() {
  return { trends: monthlyTrends(await analyticsRows()) }
}

export async function buildDepartmentStats() {
  const [rows, departments] = await Promise.all([analyticsRows(), listDepartments()])
  return { departments: departmentWorkload(departments, rows) }
}
