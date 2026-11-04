import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { categoryLabel, severityLabel, statusLabel } from '@shared/constants'
import type { ComplaintStatus, Severity } from '@shared/types'
import { CategoryIcon, SeverityBadge, StatusBadge } from '@/components/ComplaintBadges'
import { ComplaintMap } from '@/components/ComplaintMap'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ErrorState, Skeleton } from '@/components/ui/feedback'
import { Input, Select, Textarea } from '@/components/ui/input'
import { useAuth } from '@/contexts/AuthContext'
import { useComplaint } from '@/hooks/useCivicData'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { api, getErrorData, getErrorMessage } from '@/lib/api'
import { fileToDataUrl, formatDateTime } from '@/lib/format'

export function ComplaintDetailPage({ mode }: { mode: 'citizen' | 'admin' }) {
  const { id = '' } = useParams()
  const complaintQuery = useComplaint(id)
  const complaint = complaintQuery.data?.complaint
  useDocumentTitle(complaint?.reference_number ?? 'Complaint')
  const back = mode === 'admin' ? '/admin/complaints' : '/app/complaints'

  if (complaintQuery.isLoading) return <Skeleton className="h-80" />
  if (complaintQuery.error || !complaint || !complaintQuery.data) {
    return <ErrorState message={getErrorMessage(complaintQuery.error, 'Complaint not found.')} />
  }

  const detail = complaintQuery.data
  return (
    <div className="space-y-5">
      <Link to={back} className="text-sm font-semibold text-blue-700">Back to complaints</Link>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">{complaint.reference_number}</p>
          <h1 className="text-2xl font-bold text-navy">{complaint.title}</h1>
          <div className="mt-3 flex flex-wrap gap-2">
            <StatusBadge status={complaint.status} />
            <SeverityBadge severity={complaint.severity} />
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(complaint.reference_number)
              toast.success('Reference number copied.')
            } catch {
              toast.error('The reference number could not be copied.')
            }
          }}
        >
          Copy reference
        </Button>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardContent className="space-y-4">
            {complaint.image_url ? (
              <img src={complaint.image_url} alt="Complaint" className="max-h-80 w-full rounded-xl object-cover" />
            ) : (
              <div className="grid h-48 place-items-center rounded-xl bg-slate-50 text-slate-500">
                <div className="text-center">
                  <CategoryIcon category={complaint.category} className="mx-auto h-8 w-8" />
                  <p className="mt-2 text-sm">No photo was stored with this record.</p>
                </div>
              </div>
            )}
            <p className="text-slate-700">{complaint.description}</p>
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <Info label="Category" value={categoryLabel(complaint.category)} />
              <Info label="Department" value={complaint.department_name ?? 'Not assigned'} />
              <Info label="Officer" value={complaint.assigned_officer_name ?? 'Not assigned'} />
              <Info label="Reported" value={formatDateTime(complaint.created_at)} />
              <Info label="Address" value={complaint.address ?? 'Not provided'} />
              <Info label="Coordinates" value={`${complaint.latitude.toFixed(5)}, ${complaint.longitude.toFixed(5)}`} />
            </dl>
          </CardContent>
        </Card>
        <div className="space-y-5">
          <Card>
            <CardHeader><CardTitle>Location</CardTitle></CardHeader>
            <CardContent>
              <ComplaintMap complaints={[complaint]} linkBase={mode === 'admin' ? '/admin/complaints' : '/app/complaints'} height="240px" />
            </CardContent>
          </Card>
          {complaint.ai_analysis && complaint.ai_analysis.source !== 'manual' ? (
            <Card>
              <CardHeader>
                <CardTitle>
                  {complaint.ai_analysis.source === 'edited' ? 'AI analysis, edited before submit' : 'AI analysis'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-slate-700">
                {complaint.ai_analysis.image_unclear ? (
                  <p className="rounded-lg bg-amber-50 px-3 py-2 text-amber-900">The image was unclear, so this analysis is uncertain.</p>
                ) : null}
                <p>Confidence {complaint.ai_confidence == null ? '—' : `${Math.round(complaint.ai_confidence * 100)}%`}</p>
                <p>{complaint.ai_analysis.description}</p>
                <p><span className="font-semibold">Action:</span> {complaint.ai_analysis.recommended_action}</p>
                <p><span className="font-semibold">Priority reason:</span> {complaint.ai_analysis.priority_reason}</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="text-sm text-slate-600">This complaint was entered manually, without an AI classification.</CardContent>
            </Card>
          )}
        </div>
      </div>

      {complaint.duplicate_count > 0 && mode === 'citizen' ? (
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
          An administrator will review a possible duplicate. Your complaint was not discarded.
        </p>
      ) : null}

      <Card>
        <CardHeader><CardTitle>Timeline</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {complaint.updates.length === 0 ? <p className="text-sm text-slate-500">No updates yet.</p> : null}
          {complaint.updates.map((update) => (
            <div key={update.id} className="border-l-2 border-slate-200 pl-4">
              <p className="text-sm font-semibold">
                {update.old_status ? `${statusLabel(update.old_status)} → ${statusLabel(update.new_status)}` : statusLabel(update.new_status)}
                {update.is_internal ? ' · Internal' : ''}
              </p>
              <p className="text-xs text-slate-500">{formatDateTime(update.created_at)} · {update.author_name ?? 'System'}</p>
              {update.remarks ? <p className="mt-1 text-sm text-slate-700">{update.remarks}</p> : null}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Resolution</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <Photo label="Before" url={complaint.image_url} />
          <Photo label="After" url={complaint.resolution_image_url} />
          {complaint.verifications.map((verification) => (
            <div key={verification.id} className="md:col-span-2 rounded-xl bg-slate-50 p-3 text-sm">
              <p className="font-semibold">{verification.human_verified ? 'Reviewed by a person' : 'Waiting for a person to review the AI note'}</p>
              {verification.ai_result ? (
                <>
                  <p className="mt-1">Visible improvement: {verification.ai_result.improvement_detected ? 'appears so' : 'not clearly'}</p>
                  <p>{verification.ai_result.observations}</p>
                  <p>Confidence {Math.round(verification.ai_result.confidence * 100)}%</p>
                  <p>{verification.ai_result.recommendation}</p>
                </>
              ) : (
                <p className="mt-1">No AI comparison was stored.</p>
              )}
            </div>
          ))}
          {complaint.resolved_at ? <p className="text-sm text-slate-600 md:col-span-2">Marked resolved {formatDateTime(complaint.resolved_at)}.</p> : null}
        </CardContent>
      </Card>

      {mode === 'admin' ? <AdminTools complaintId={complaint.id} detail={detail} /> : null}
    </div>
  )
}

function AdminTools({
  complaintId,
  detail,
}: {
  complaintId: string
  detail: NonNullable<ReturnType<typeof useComplaint>['data']>
}) {
  const complaint = detail.complaint
  const queryClient = useQueryClient()
  const { demoMode } = useAuth()
  const [departmentId, setDepartmentId] = useState(complaint.department_id ?? '')
  const [officerId, setOfficerId] = useState(complaint.assigned_officer_id ?? '')
  const [severity, setSeverity] = useState<Severity>(complaint.severity)
  const [status, setStatus] = useState<ComplaintStatus>(complaint.status)
  const [publicNote, setPublicNote] = useState('')
  const [internalNote, setInternalNote] = useState('')
  const [repair, setRepair] = useState<File | null>(null)

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['complaint', complaintId] })
    void queryClient.invalidateQueries({ queryKey: ['complaints'] })
    void queryClient.invalidateQueries({ queryKey: ['analytics'] })
  }
  const onError = (error: unknown) => {
    if (getErrorData(error)?.resolution_image_url) refresh()
    toast.error(getErrorMessage(error))
  }

  const assign = useMutation({
    mutationFn: async () => api.post(`/api/complaints/${complaintId}/assign`, { departmentId, officerId: officerId || null }),
    onSuccess: () => {
      toast.success('Assignment saved.')
      refresh()
    },
    onError,
  })
  const priority = useMutation({
    mutationFn: async () => api.patch(`/api/complaints/${complaintId}`, { severity }),
    onSuccess: () => {
      toast.success('Priority updated.')
      refresh()
    },
    onError,
  })
  const note = useMutation({
    mutationFn: async () => api.patch(`/api/complaints/${complaintId}`, { remarks: internalNote, remarksInternal: true }),
    onSuccess: () => {
      toast.success('Internal note added.')
      setInternalNote('')
      refresh()
    },
    onError,
  })
  const statusUpdate = useMutation({
    mutationFn: async () => api.post(`/api/complaints/${complaintId}/update-status`, { status, remarks: publicNote }),
    onSuccess: () => {
      toast.success('Status updated. AI did not change it.')
      setPublicNote('')
      refresh()
    },
    onError,
  })
  const verify = useMutation({
    mutationFn: async () => {
      if (!repair) throw new Error('Choose a repair photo.')
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(repair.type) || repair.size > 4 * 1024 * 1024) {
        throw new Error('Use a JPEG, PNG, or WebP image under 4 MB.')
      }
      const imageBase64 = await fileToDataUrl(repair)
      return api.post(`/api/ai/verify-resolution`, { complaintId, imageBase64, mimeType: repair.type })
    },
    onSuccess: () => {
      toast.success('Repair photo saved. The complaint status was not changed.')
      setRepair(null)
      refresh()
    },
    onError,
  })

  return (
    <Card>
      <CardHeader><CardTitle>Municipal actions</CardTitle></CardHeader>
      <CardContent className="space-y-5">
        {demoMode ? (
          <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">
            These actions call the API. In demo mode the database refuses them, so the sample record will not change.
          </p>
        ) : null}
        <div className="grid gap-3 md:grid-cols-2">
          <label className="space-y-1 text-sm">
            <span className="font-medium">Department</span>
            <Select value={departmentId} onChange={(event) => setDepartmentId(event.target.value)}>
              <option value="">Choose</option>
              {detail.departments.map((department) => (
                <option key={department.id} value={department.id}>{department.name}</option>
              ))}
            </Select>
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium">Officer</span>
            <Select value={officerId} onChange={(event) => setOfficerId(event.target.value)}>
              <option value="">Unassigned</option>
              {detail.officers.map((officer) => (
                <option key={officer.id} value={officer.id}>{officer.fullName}</option>
              ))}
            </Select>
          </label>
        </div>
        <Button type="button" onClick={() => assign.mutate()} disabled={assign.isPending || !departmentId}>
          {assign.isPending ? 'Saving assignment…' : 'Save assignment'}
        </Button>
        <div className="grid gap-3 md:grid-cols-[180px_1fr]">
          <label className="space-y-1 text-sm">
            <span className="font-medium">Priority</span>
            <Select value={severity} onChange={(event) => setSeverity(event.target.value as Severity)}>
              {(['low', 'medium', 'high', 'critical'] as const).map((item) => (
                <option key={item} value={item}>{severityLabel(item)}</option>
              ))}
            </Select>
          </label>
          <div className="self-end">
            <Button type="button" variant="outline" onClick={() => priority.mutate()} disabled={priority.isPending}>
              Update priority
            </Button>
          </div>
        </div>
        <label className="block space-y-1 text-sm">
          <span className="font-medium">Internal remark</span>
          <Textarea value={internalNote} onChange={(event) => setInternalNote(event.target.value)} />
        </label>
        <Button type="button" variant="outline" disabled={note.isPending || internalNote.trim().length < 2} onClick={() => note.mutate()}>
          Add internal remark
        </Button>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="space-y-1 text-sm">
            <span className="font-medium">Status</span>
            <Select value={status} onChange={(event) => setStatus(event.target.value as ComplaintStatus)}>
              {(['pending', 'in_progress', 'resolved'] as const).map((item) => (
                <option key={item} value={item}>{statusLabel(item)}</option>
              ))}
            </Select>
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium">Note visible to the citizen</span>
            <Input value={publicNote} onChange={(event) => setPublicNote(event.target.value)} />
          </label>
        </div>
        <Button type="button" variant="secondary" disabled={statusUpdate.isPending} onClick={() => statusUpdate.mutate()}>
          Update status
        </Button>
        <div className="space-y-2">
          <p className="text-sm font-medium">Repair photo</p>
          <Input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setRepair(event.target.files?.[0] ?? null)} />
          <Button type="button" disabled={verify.isPending} onClick={() => verify.mutate()}>
            {verify.isPending ? 'Checking photos…' : 'Upload repair photo and compare'}
          </Button>
        </div>
        {complaint.duplicate_flags.length ? (
          <div className="space-y-2">
            <p className="text-sm font-semibold">Possible duplicates</p>
            {complaint.duplicate_flags.map((flag) => (
              <div key={flag.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 p-3 text-sm">
                <p>
                  {flag.possible_duplicate_reference ?? flag.possible_duplicate_id} · score {Math.round(flag.similarity_score * 100)}% · {flag.review_status}
                </p>
                <div className="flex gap-2">
                  <Button type="button" size="sm" variant="outline" onClick={() => api.patch(`/api/complaints/${complaintId}`, { duplicateFlagId: flag.id, duplicateReviewStatus: 'confirmed' }).then(refresh).catch(onError)}>
                    Confirm
                  </Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => api.patch(`/api/complaints/${complaintId}`, { duplicateFlagId: flag.id, duplicateReviewStatus: 'dismissed' }).then(refresh).catch(onError)}>
                    Dismiss
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : null}
        {complaint.verifications.filter((item) => !item.human_verified).map((verification) => (
          <Button
            key={verification.id}
            type="button"
            variant="outline"
            onClick={() => api.patch(`/api/complaints/${complaintId}`, { verificationId: verification.id, humanVerified: true }).then(() => {
              toast.success('Marked as reviewed by a person. The status was not changed.')
              refresh()
            }).catch(onError)}
          >
            Mark AI comparison as reviewed
          </Button>
        ))}
      </CardContent>
    </Card>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  )
}

function Photo({ label, url }: { label: string; url: string | null }) {
  return (
    <div>
      <p className="mb-2 text-sm font-medium">{label}</p>
      {url ? <img src={url} alt={label} className="h-48 w-full rounded-xl object-cover" /> : <div className="grid h-48 place-items-center rounded-xl bg-slate-50 text-sm text-slate-500">No image</div>}
    </div>
  )
}
