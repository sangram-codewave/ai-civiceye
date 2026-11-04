import { Link } from 'react-router-dom'
import { categoryLabel } from '@shared/constants'
import { CategoryBadge, SeverityBadge, StatusBadge } from '@/components/ComplaintBadges'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/feedback'
import { useAuth } from '@/contexts/AuthContext'
import { useComplaints } from '@/hooks/useCivicData'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { formatDate } from '@/lib/format'
import { getErrorMessage } from '@/lib/api'

export function CitizenDashboardPage() {
  useDocumentTitle('Dashboard')
  const { user } = useAuth()
  const complaints = useComplaints({ page: 1, pageSize: 5, sort: 'created_at', direction: 'desc' })
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-navy">Hello, {user?.fullName.split(' ')[0]}</h1>
          <p className="text-sm text-slate-600">Track the issues you have reported to the city.</p>
        </div>
        <Button asChild>
          <Link to="/app/complaints/new">Report new issue</Link>
        </Button>
      </div>
      {complaints.isLoading ? <Skeleton className="h-28" /> : null}
      {complaints.error ? <ErrorState message={getErrorMessage(complaints.error)} /> : null}
      {complaints.data ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="Total" value={complaints.data.summary.total} />
          <Metric label="Pending" value={complaints.data.summary.pending} />
          <Metric label="In progress" value={complaints.data.summary.inProgress} />
          <Metric label="Resolved" value={complaints.data.summary.resolved} />
        </div>
      ) : null}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Recent complaints</h2>
        {complaints.data && complaints.data.data.length === 0 ? (
          <EmptyState title="No complaints yet" body="When you report an issue, it will show up here with a reference number." action={<Button asChild><Link to="/app/complaints/new">Report an issue</Link></Button>} />
        ) : null}
        <div className="grid gap-3">
          {complaints.data?.data.map((complaint) => (
            <Link key={complaint.id} to={`/app/complaints/${complaint.id}`} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:border-blue-200">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold">{complaint.reference_number}</p>
                <StatusBadge status={complaint.status} />
              </div>
              <p className="mt-2 text-sm text-slate-700">{complaint.title}</p>
              <p className="mt-2 text-xs text-slate-500">{categoryLabel(complaint.category)} · {formatDate(complaint.created_at)}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent>
        <p className="text-sm text-slate-500">{label}</p>
        <p className="mt-2 text-3xl font-extrabold text-navy">{value}</p>
      </CardContent>
    </Card>
  )
}

export function MyComplaintsPage() {
  useDocumentTitle('My complaints')
  const complaints = useComplaints({ page: 1, pageSize: 50, sort: 'created_at', direction: 'desc' })
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-navy">My complaints</h1>
        <Button asChild><Link to="/app/complaints/new">Report new issue</Link></Button>
      </div>
      {complaints.isLoading ? <Skeleton className="h-40" /> : null}
      {complaints.error ? <ErrorState message={getErrorMessage(complaints.error)} /> : null}
      {complaints.data && complaints.data.data.length === 0 ? (
        <EmptyState title="Nothing reported yet" body="Your reference numbers, departments, and statuses will appear here." />
      ) : null}
      <div className="grid gap-3">
        {complaints.data?.data.map((complaint) => (
          <article key={complaint.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-semibold">{complaint.reference_number}</p>
              <CategoryBadge category={complaint.category} />
              <SeverityBadge severity={complaint.severity} />
              <StatusBadge status={complaint.status} />
            </div>
            <h2 className="mt-2 font-medium">{complaint.title}</h2>
            <p className="mt-1 text-sm text-slate-600">{formatDate(complaint.created_at)} · {complaint.department_name ?? 'Department not set'}</p>
            <Button asChild variant="outline" size="sm" className="mt-3">
              <Link to={`/app/complaints/${complaint.id}`}>View details</Link>
            </Button>
          </article>
        ))}
      </div>
    </div>
  )
}
