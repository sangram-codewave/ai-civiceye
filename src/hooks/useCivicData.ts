import { useQuery } from '@tanstack/react-query'
import { departmentWorkload, categoryStats, monthlyTrends, severityStats, summarize } from '@shared/analytics'
import { DEMO_ACCOUNTS, DEPARTMENTS } from '@shared/constants'
import { demoComplaints, demoOfficers } from '@shared/demoData'
import { queryComplaints } from '@shared/query'
import type {
  CategoryStat,
  ComplaintDetailResponse,
  ComplaintQuery,
  DepartmentWorkload,
  HealthResponse,
  ListResponse,
  OverviewResponse,
  TrendPoint,
} from '@shared/types'
import { api } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'

function cleanParams(filters: ComplaintQuery) {
  return Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== undefined && value !== ''))
}

export function useHealth() {
  return useQuery({
    queryKey: ['health'],
    retry: false,
    queryFn: async () => (await api.get<HealthResponse>('/api/health')).data,
  })
}

export function useComplaints(filters: ComplaintQuery) {
  const { demoMode, user } = useAuth()
  return useQuery({
    queryKey: ['complaints', filters, demoMode, user?.id, user?.role],
    enabled: Boolean(user),
    queryFn: async (): Promise<ListResponse> => {
      if (demoMode) {
        return queryComplaints(demoComplaints, {
          ...filters,
          citizenId: user?.role === 'admin' ? undefined : user?.id,
        })
      }
      const { data } = await api.get<ListResponse>('/api/complaints', { params: cleanParams(filters) })
      return data
    },
  })
}

export function useComplaint(id: string | undefined) {
  const { demoMode, user } = useAuth()
  return useQuery({
    queryKey: ['complaint', id, demoMode, user?.role],
    enabled: Boolean(user && id),
    queryFn: async (): Promise<ComplaintDetailResponse> => {
      if (!id) throw new Error('Complaint not found.')
      if (demoMode) {
        const complaint = demoComplaints.find((item) => item.id === id)
        if (!complaint || (user?.role !== 'admin' && complaint.citizen_id !== user?.id)) {
          throw new Error('Complaint not found.')
        }
        return {
          complaint:
            user?.role === 'admin'
              ? complaint
              : {
                  ...complaint,
                  duplicate_flags: [],
                  updates: complaint.updates.filter((item) => !item.is_internal),
                },
          departments: DEPARTMENTS.map((department) => ({ id: department.id, name: department.name })),
          officers: [
            ...demoOfficers,
            {
              id: 'demo-admin',
              fullName: DEMO_ACCOUNTS.admin.fullName,
              email: DEMO_ACCOUNTS.admin.email,
              role: 'admin' as const,
            },
          ],
        }
      }
      const { data } = await api.get<ComplaintDetailResponse>(`/api/complaints/${id}`)
      return data
    },
  })
}

function demoOverview(): OverviewResponse {
  return {
    ...summarize(demoComplaints),
    officers: [
      ...demoOfficers,
      {
        id: 'demo-admin',
        fullName: DEMO_ACCOUNTS.admin.fullName,
        email: DEMO_ACCOUNTS.admin.email,
        role: 'admin',
      },
    ],
    departments: departmentWorkload(
      DEPARTMENTS.map((department) => ({ id: department.id, name: department.name })),
      demoComplaints,
    ),
  }
}

export function useOverview() {
  const { demoMode, user } = useAuth()
  return useQuery({
    queryKey: ['analytics', 'overview', demoMode],
    enabled: user?.role === 'admin',
    queryFn: async () => {
      if (demoMode) return demoOverview()
      return (await api.get<OverviewResponse>('/api/analytics', { params: { view: 'overview' } })).data
    },
  })
}

export function useCategoryStats() {
  const { demoMode, user } = useAuth()
  return useQuery({
    queryKey: ['analytics', 'categories', demoMode],
    enabled: user?.role === 'admin',
    queryFn: async () => {
      if (demoMode) {
        return { categories: categoryStats(demoComplaints), severities: severityStats(demoComplaints) }
      }
      return (await api.get<{ categories: CategoryStat[]; severities: { severity: string; count: number }[] }>(
        '/api/analytics',
        { params: { view: 'categories' } },
      )).data
    },
  })
}

export function useTrends() {
  const { demoMode, user } = useAuth()
  return useQuery({
    queryKey: ['analytics', 'trends', demoMode],
    enabled: user?.role === 'admin',
    queryFn: async () => {
      if (demoMode) return { trends: monthlyTrends(demoComplaints) }
      return (await api.get<{ trends: TrendPoint[] }>('/api/analytics', { params: { view: 'trends' } })).data
    },
  })
}

export function useDepartmentStats() {
  const { demoMode, user } = useAuth()
  return useQuery({
    queryKey: ['analytics', 'departments', demoMode],
    enabled: user?.role === 'admin',
    queryFn: async () => {
      if (demoMode) {
        return {
          departments: departmentWorkload(
            DEPARTMENTS.map((department) => ({ id: department.id, name: department.name })),
            demoComplaints,
          ),
        }
      }
      return (await api.get<{ departments: DepartmentWorkload[] }>('/api/analytics', { params: { view: 'departments' } })).data
    },
  })
}
