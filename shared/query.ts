import type { Complaint, ComplaintListItem, ComplaintQuery, ListResponse } from './types.js'

const SEVERITY_RANK = { low: 1, medium: 2, high: 3, critical: 4 }
const STATUS_RANK = { pending: 1, in_progress: 2, resolved: 3 }

function includes(query: string, complaint: ComplaintListItem): boolean {
  const haystack = [
    complaint.reference_number,
    complaint.title,
    complaint.description,
    complaint.address ?? '',
    complaint.category,
    complaint.department_name ?? '',
  ]
    .join(' ')
    .toLowerCase()
  return haystack.includes(query)
}

export function queryComplaints(items: Complaint[], query: ComplaintQuery): ListResponse {
  const scoped = query.citizenId ? items.filter((item) => item.citizen_id === query.citizenId) : items
  const summary = {
    total: scoped.length,
    pending: scoped.filter((item) => item.status === 'pending').length,
    inProgress: scoped.filter((item) => item.status === 'in_progress').length,
    resolved: scoped.filter((item) => item.status === 'resolved').length,
  }
  const filtered = scoped.filter((item) => {
    if (query.category && item.category !== query.category) return false
    if (query.severity && item.severity !== query.severity) return false
    if (query.status && item.status !== query.status) return false
    if (query.departmentId && item.department_id !== query.departmentId) return false
    const day = item.created_at.slice(0, 10)
    if (query.from && day < query.from) return false
    if (query.to && day > query.to) return false
    if (query.q && !includes(query.q.trim().toLowerCase(), item)) return false
    return true
  })
  const direction = query.direction === 'asc' ? 1 : -1
  const sort = query.sort ?? 'created_at'
  filtered.sort((left, right) => {
    if (sort === 'severity') return (SEVERITY_RANK[left.severity] - SEVERITY_RANK[right.severity]) * direction
    if (sort === 'status') return (STATUS_RANK[left.status] - STATUS_RANK[right.status]) * direction
    if (sort === 'reference_number') return left.reference_number.localeCompare(right.reference_number) * direction
    return (new Date(left.created_at).getTime() - new Date(right.created_at).getTime()) * direction
  })
  const page = query.page && query.page > 0 ? query.page : 1
  const pageSize = query.pageSize && query.pageSize > 0 ? query.pageSize : 8
  const start = (page - 1) * pageSize
  return {
    data: filtered.slice(start, start + pageSize),
    page,
    pageSize,
    total: filtered.length,
    summary,
  }
}
