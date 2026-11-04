import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { toast } from 'sonner'
import { CATEGORY_VALUES, SEVERITY_VALUES, STATUS_VALUES, categoryLabel, severityLabel, statusLabel } from '@shared/constants'
import type { Category, ComplaintQuery, ComplaintStatus, Severity } from '@shared/types'
import { SeverityBadge, StatusBadge } from '@/components/ComplaintBadges'
import { ComplaintMap } from '@/components/ComplaintMap'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/feedback'
import { Input, Select } from '@/components/ui/input'
import { useCategoryStats, useComplaints, useDepartmentStats, useOverview, useTrends } from '@/hooks/useCivicData'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { api, getErrorMessage } from '@/lib/api'
import { formatDate, formatHours } from '@/lib/format'

const chartColors = ['#1d4ed8', '#0f766e', '#b45309', '#7c3aed', '#0369a1', '#be123c', '#475569']

export function AdminDashboardPage() {
  useDocumentTitle('Overview')
  const overview = useOverview()
  const categories = useCategoryStats()
  const trends = useTrends()
  const departments = useDepartmentStats()
  const recent = useComplaints({ page: 1, pageSize: 5, sort: 'created_at', direction: 'desc' })
  const loading = overview.isLoading || categories.isLoading || trends.isLoading || departments.isLoading
  const error = overview.error || categories.error || trends.error || departments.error
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy">Municipal overview</h1>
        <p className="text-sm text-slate-600">Figures come from complaint records, not from fixed sample cards.</p>
      </div>
      {loading ? <Skeleton className="h-28" /> : null}
      {error ? <ErrorState message={getErrorMessage(error)} /> : null}
      {overview.data ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <Kpi label="Total complaints" value={overview.data.total} />
          <Kpi label="Open complaints" value={overview.data.open} />
          <Kpi label="Critical complaints" value={overview.data.critical} />
          <Kpi label="Resolved complaints" value={overview.data.resolved} />
          <Kpi label="Average resolution" value={formatHours(overview.data.averageResolutionHours)} />
        </div>
      ) : null}
      <div className="grid gap-4 xl:grid-cols-2">
        <ChartCard title="Complaints by category">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={categories.data?.categories ?? []}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={0} angle={-20} height={70} textAnchor="end" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="#1d4ed8" radius={6} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Complaints by severity">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={categories.data?.severities ?? []} dataKey="count" nameKey="severity" outerRadius={90}>
                {(categories.data?.severities ?? []).map((entry, index) => (
                  <Cell key={entry.severity} fill={chartColors[index % chartColors.length]} />
                ))}
              </Pie>
              <Legend />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Monthly complaint trends">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trends.data?.trends ?? []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="reported" stroke="#1d4ed8" strokeWidth={2} />
              <Line type="monotone" dataKey="resolved" stroke="#059669" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Department workload">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={departments.data?.departments ?? []}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-20} height={70} textAnchor="end" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Bar dataKey="pending" stackId="a" fill="#f97316" />
              <Bar dataKey="inProgress" stackId="a" fill="#2563eb" />
              <Bar dataKey="resolved" stackId="a" fill="#059669" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Latest complaints</h2>
          <Button asChild variant="outline"><Link to="/admin/complaints">Open the queue</Link></Button>
        </div>
        {recent.data?.data.map((complaint) => (
          <Link key={complaint.id} to={`/admin/complaints/${complaint.id}`} className="block rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold">{complaint.reference_number}</p>
              <StatusBadge status={complaint.status} />
            </div>
            <p className="mt-1 text-sm">{complaint.title}</p>
          </Link>
        ))}
      </section>
    </div>
  )
}

function Kpi({ label, value }: { label: string; value: number | string }) {
  return (
    <Card>
      <CardContent>
        <p className="text-sm text-slate-500">{label}</p>
        <p className="mt-2 text-2xl font-extrabold text-navy">{value}</p>
      </CardContent>
    </Card>
  )
}

function ChartCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card>
      <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
      <CardContent className="h-72">{children}</CardContent>
    </Card>
  )
}

export function AdminComplaintsPage() {
  useDocumentTitle('Complaints')
  const [filters, setFilters] = useState<ComplaintQuery>({ page: 1, pageSize: 8, sort: 'created_at', direction: 'desc' })
  const [search, setSearch] = useState('')
  const complaints = useComplaints(filters)
  const departments = useDepartmentStats()

  function update(patch: Partial<ComplaintQuery>) {
    setFilters((current) => ({ ...current, ...patch, page: patch.page ?? 1 }))
  }

  function sortBy(sort: NonNullable<ComplaintQuery['sort']>) {
    setFilters((current) => ({
      ...current,
      sort,
      direction: current.sort === sort && current.direction === 'asc' ? 'desc' : 'asc',
    }))
  }

  const rows = complaints.data?.data ?? []
  const total = complaints.data?.total ?? 0
  const pages = Math.max(1, Math.ceil(total / (filters.pageSize ?? 8)))

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-navy">Complaint queue</h1>
      <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Input
          placeholder="Search reference, title, address"
          value={search}
          onChange={(event) => {
            const value = event.target.value
            setSearch(value)
            update({ q: value || undefined })
          }}
        />
        <FilterSelect label="Category" value={filters.category ?? ''} onChange={(value) => update({ category: (value || undefined) as Category | undefined })} options={CATEGORY_VALUES.map((item) => ({ value: item, label: categoryLabel(item) }))} />
        <FilterSelect label="Severity" value={filters.severity ?? ''} onChange={(value) => update({ severity: (value || undefined) as Severity | undefined })} options={SEVERITY_VALUES.map((item) => ({ value: item, label: severityLabel(item) }))} />
        <FilterSelect label="Status" value={filters.status ?? ''} onChange={(value) => update({ status: (value || undefined) as ComplaintStatus | undefined })} options={STATUS_VALUES.map((item) => ({ value: item, label: statusLabel(item) }))} />
        <FilterSelect label="Department" value={filters.departmentId ?? ''} onChange={(value) => update({ departmentId: value || undefined })} options={(departments.data?.departments ?? []).map((item) => ({ value: item.id, label: item.name }))} />
        <div className="grid grid-cols-2 gap-2">
          <Input type="date" aria-label="From date" value={filters.from ?? ''} onChange={(event) => update({ from: event.target.value || undefined })} />
          <Input type="date" aria-label="To date" value={filters.to ?? ''} onChange={(event) => update({ to: event.target.value || undefined })} />
        </div>
      </div>
      {complaints.isLoading ? <Skeleton className="h-64" /> : null}
      {complaints.error ? <ErrorState message={getErrorMessage(complaints.error)} /> : null}
      {complaints.data && rows.length === 0 ? <EmptyState title="No complaints match" body="Try another category, status, or date range." /> : null}
      {rows.length ? (
        <>
          <div className="hidden overflow-x-auto rounded-2xl border border-slate-200 bg-white md:block">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <SortHeader label="Reference" onClick={() => sortBy('reference_number')} />
                  <th className="px-3 py-3">Complaint</th>
                  <th className="px-3 py-3">Category</th>
                  <SortHeader label="Severity" onClick={() => sortBy('severity')} />
                  <th className="px-3 py-3">Location</th>
                  <th className="px-3 py-3">Department</th>
                  <th className="px-3 py-3">Officer</th>
                  <SortHeader label="Reported" onClick={() => sortBy('created_at')} />
                  <SortHeader label="Status" onClick={() => sortBy('status')} />
                  <th className="px-3 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((complaint) => (
                  <tr key={complaint.id} className="border-t border-slate-100">
                    <td className="px-3 py-3 font-medium">{complaint.reference_number}</td>
                    <td className="px-3 py-3">{complaint.title}</td>
                    <td className="px-3 py-3">{categoryLabel(complaint.category)}</td>
                    <td className="px-3 py-3"><SeverityBadge severity={complaint.severity} /></td>
                    <td className="px-3 py-3">{complaint.address ?? `${complaint.latitude.toFixed(3)}, ${complaint.longitude.toFixed(3)}`}</td>
                    <td className="px-3 py-3">{complaint.department_name ?? '—'}</td>
                    <td className="px-3 py-3">{complaint.assigned_officer_name ?? '—'}</td>
                    <td className="px-3 py-3">{formatDate(complaint.created_at)}</td>
                    <td className="px-3 py-3"><StatusBadge status={complaint.status} /></td>
                    <td className="px-3 py-3"><Link className="font-semibold text-blue-700" to={`/admin/complaints/${complaint.id}`}>Open</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="grid gap-3 md:hidden">
            {rows.map((complaint) => (
              <article key={complaint.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="font-semibold">{complaint.reference_number}</p>
                <p className="mt-1">{complaint.title}</p>
                <p className="mt-1 text-sm text-slate-600">{complaint.address ?? 'No address'} · {complaint.department_name ?? 'Unassigned'}</p>
                <div className="mt-2 flex gap-2"><SeverityBadge severity={complaint.severity} /><StatusBadge status={complaint.status} /></div>
                <Button asChild size="sm" className="mt-3" variant="outline"><Link to={`/admin/complaints/${complaint.id}`}>Open</Link></Button>
              </article>
            ))}
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500">{total} complaints</span>
            <div className="flex items-center gap-2">
              <Button type="button" size="sm" variant="outline" disabled={(filters.page ?? 1) <= 1} onClick={() => update({ page: (filters.page ?? 1) - 1 })}>Previous</Button>
              <span>Page {filters.page ?? 1} of {pages}</span>
              <Button type="button" size="sm" variant="outline" disabled={(filters.page ?? 1) >= pages} onClick={() => update({ page: (filters.page ?? 1) + 1 })}>Next</Button>
            </div>
          </div>
        </>
      ) : null}
    </div>
  )
}

function SortHeader({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <th className="px-3 py-3">
      <button type="button" className="font-semibold uppercase tracking-wide" onClick={onClick}>{label}</button>
    </th>
  )
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <Select aria-label={label} value={value} onChange={(event) => onChange(event.target.value)}>
      <option value="">All {label.toLowerCase()}</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>{option.label}</option>
      ))}
    </Select>
  )
}

export function MapPage() {
  useDocumentTitle('Map')
  const [category, setCategory] = useState<Category | ''>('')
  const [status, setStatus] = useState<ComplaintStatus | ''>('')
  const complaints = useComplaints({
    page: 1,
    pageSize: 500,
    category: category || undefined,
    status: status || undefined,
  })
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-navy">Complaint map</h1>
          <p className="text-sm text-slate-600">OpenStreetMap markers are coloured by severity. Clusters group nearby reports.</p>
        </div>
        <div className="flex gap-2">
          <FilterSelect label="Category" value={category} onChange={(value) => setCategory(value as Category | '')} options={CATEGORY_VALUES.map((item) => ({ value: item, label: categoryLabel(item) }))} />
          <FilterSelect label="Status" value={status} onChange={(value) => setStatus(value as ComplaintStatus | '')} options={STATUS_VALUES.map((item) => ({ value: item, label: statusLabel(item) }))} />
        </div>
      </div>
      <div className="flex flex-wrap gap-3 text-xs text-slate-600">
        {SEVERITY_VALUES.map((severity) => (
          <span key={severity} className="inline-flex items-center gap-1">
            <span className={`h-2.5 w-2.5 rounded-full ${severity === 'critical' ? 'bg-red-600' : severity === 'high' ? 'bg-orange-600' : severity === 'medium' ? 'bg-amber-500' : 'bg-emerald-600'}`} />
            {severityLabel(severity)}
          </span>
        ))}
      </div>
      {complaints.isLoading ? <Skeleton className="h-[520px]" /> : null}
      {complaints.error ? <ErrorState message={getErrorMessage(complaints.error)} /> : null}
      {complaints.data ? <ComplaintMap complaints={complaints.data.data} linkBase="/admin/complaints" height="520px" /> : null}
    </div>
  )
}

export function AnalyticsPage() {
  useDocumentTitle('Analytics')
  const trends = useTrends()
  const departments = useDepartmentStats()
  const categories = useCategoryStats()
  const [summary, setSummary] = useState('')
  const [pending, setPending] = useState(false)
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-navy">Analytics</h1>
          <p className="text-sm text-slate-600">Resolution performance compares reports and closures by month.</p>
        </div>
        <Button
          type="button"
          disabled={pending}
          onClick={async () => {
            setPending(true)
            try {
              const { data } = await api.post<{ summary: string }>('/api/ai/generate-summary', {})
              setSummary(data.summary)
            } catch (error) {
              setSummary('')
              toast.error(getErrorMessage(error))
            } finally {
              setPending(false)
            }
          }}
        >
          {pending ? 'Writing summary…' : 'Generate AI summary'}
        </Button>
      </div>
      {summary ? <Card><CardContent className="whitespace-pre-wrap text-sm text-slate-700">{summary}</CardContent></Card> : null}
      <ChartCard title="Resolution performance">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={trends.data?.trends ?? []}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Legend />
            <Bar dataKey="reported" fill="#1d4ed8" radius={4} />
            <Bar dataKey="resolved" fill="#059669" radius={4} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
      <ChartCard title="Department workload">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={departments.data?.departments ?? []}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-20} height={70} textAnchor="end" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Legend />
            <Bar dataKey="pending" stackId="a" fill="#f97316" />
            <Bar dataKey="inProgress" stackId="a" fill="#2563eb" />
            <Bar dataKey="resolved" stackId="a" fill="#059669" />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
      {categories.isLoading || trends.isLoading || departments.isLoading ? <Skeleton className="h-10" /> : null}
      {categories.error || trends.error || departments.error ? (
        <ErrorState message={getErrorMessage(categories.error || trends.error || departments.error)} />
      ) : null}
    </div>
  )
}
