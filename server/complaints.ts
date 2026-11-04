import { departmentForCategory, resolveDepartmentName, severityLabel } from '../shared/constants.js'
import type { AiAnalysis, Complaint, ComplaintDetailResponse, ListResponse, OfficerOption } from '../shared/types.js'
import type { AuthUser } from './auth.js'
import { detectDuplicates } from './duplicates.js'
import { HttpError, qstring, type Req } from './http.js'
import { decodeImage, uploadComplaintImage } from './images.js'
import { LIST_SELECT, mapComplaint, mapFlag, mapUpdate, mapVerification, raiseDbError, type ComplaintRow } from './mappers.js'
import {
  assignSchema,
  complaintQuerySchema,
  createComplaintSchema,
  parseBody,
  patchComplaintSchema,
  statusSchemaBody,
} from './schemas.js'
import { getAdmin } from './supabase.js'

function numberParam(value: string | undefined, fallback: number): number {
  if (!value) return fallback
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) throw new HttpError(400, 'Page values must be numbers.')
  return parsed
}

async function scopedCount(user: AuthUser, status?: string): Promise<number> {
  let query = getAdmin().from('complaints').select('id', { count: 'exact', head: true })
  if (user.role !== 'admin') query = query.eq('citizen_id', user.id)
  if (status) query = query.eq('status', status)
  const { count, error } = await query
  if (error) raiseDbError(error, 'Complaints could not be loaded.')
  return count ?? 0
}

export async function listComplaints(user: AuthUser, query: Req['query']): Promise<ListResponse> {
  const parsed = parseBody(complaintQuerySchema, {
    q: qstring(query.q),
    category: qstring(query.category),
    severity: qstring(query.severity),
    departmentId: qstring(query.departmentId),
    status: qstring(query.status),
    from: qstring(query.from),
    to: qstring(query.to),
    sort: qstring(query.sort),
    direction: qstring(query.direction),
    page: numberParam(qstring(query.page), 1),
    pageSize: numberParam(qstring(query.pageSize), 8),
  })
  if (parsed.from && parsed.to && parsed.from > parsed.to) {
    throw new HttpError(400, 'The start date must be on or before the end date.')
  }

  let request = getAdmin().from('complaints').select(LIST_SELECT, { count: 'exact' })
  if (user.role !== 'admin') request = request.eq('citizen_id', user.id)
  if (parsed.category) request = request.eq('category', parsed.category)
  if (parsed.severity) request = request.eq('severity', parsed.severity)
  if (parsed.status) request = request.eq('status', parsed.status)
  if (parsed.departmentId) request = request.eq('department_id', parsed.departmentId)
  if (parsed.from) request = request.gte('created_at', `${parsed.from}T00:00:00.000Z`)
  if (parsed.to) request = request.lte('created_at', `${parsed.to}T23:59:59.999Z`)
  if (parsed.q) {
    const safe = parsed.q.replace(/[%_,]/g, ' ').trim()
    if (safe) {
      request = request.or(
        `reference_number.ilike.%${safe}%,title.ilike.%${safe}%,address.ilike.%${safe}%,description.ilike.%${safe}%`,
      )
    }
  }
  const sortColumn = parsed.sort === 'severity' ? 'severity_rank' : parsed.sort
  const from = (parsed.page - 1) * parsed.pageSize
  const { data, error, count } = await request
    .order(sortColumn, { ascending: parsed.direction === 'asc' })
    .range(from, from + parsed.pageSize - 1)
  if (error) raiseDbError(error, 'Complaints could not be loaded.')

  const [total, pending, inProgress, resolved] = await Promise.all([
    scopedCount(user),
    scopedCount(user, 'pending'),
    scopedCount(user, 'in_progress'),
    scopedCount(user, 'resolved'),
  ])

  return {
    data: ((data ?? []) as ComplaintRow[]).map(mapComplaint),
    page: parsed.page,
    pageSize: parsed.pageSize,
    total: count ?? 0,
    summary: { total, pending, inProgress, resolved },
  }
}

async function loadComplaintRow(id: string): Promise<ComplaintRow> {
  const { data, error } = await getAdmin().from('complaints').select(LIST_SELECT).eq('id', id).maybeSingle()
  if (error) raiseDbError(error, 'The complaint could not be loaded.')
  if (!data) throw new HttpError(404, 'Complaint not found.')
  return data as ComplaintRow
}

function assertOwner(user: AuthUser, row: ComplaintRow): void {
  if (user.role !== 'admin' && row.citizen_id !== user.id) {
    throw new HttpError(403, 'You can only open your own complaints.')
  }
}

function assertAdmin(user: AuthUser): void {
  if (user.role !== 'admin') throw new HttpError(403, 'Administrator access is required.')
}

export async function getComplaint(user: AuthUser, id: string): Promise<ComplaintDetailResponse> {
  const row = await loadComplaintRow(id)
  assertOwner(user, row)
  const supabase = getAdmin()
  let updatesQuery = supabase
    .from('complaint_updates')
    .select(
      'id, complaint_id, updated_by, old_status, new_status, remarks, is_internal, created_at, author:profiles!complaint_updates_updated_by_fkey(full_name)',
    )
    .eq('complaint_id', id)
    .order('created_at', { ascending: true })
  if (user.role !== 'admin') updatesQuery = updatesQuery.eq('is_internal', false)

  const [updatesResult, flagsResult, verificationResult] = await Promise.all([
    updatesQuery,
    supabase
      .from('duplicate_flags')
      .select('id, complaint_id, possible_duplicate_id, similarity_score, review_status, created_at')
      .eq('complaint_id', id),
    supabase
      .from('resolution_verifications')
      .select('id, complaint_id, before_image_url, after_image_url, ai_result, human_verified, verified_by, created_at')
      .eq('complaint_id', id)
      .order('created_at', { ascending: false }),
  ])
  if (updatesResult.error) raiseDbError(updatesResult.error, 'The complaint timeline could not be loaded.')
  if (flagsResult.error) raiseDbError(flagsResult.error, 'Duplicate flags could not be loaded.')
  if (verificationResult.error) raiseDbError(verificationResult.error, 'Resolution checks could not be loaded.')

  const flagRows = flagsResult.data ?? []
  const duplicateIds = flagRows.map((flag) => flag.possible_duplicate_id)
  const references = new Map<string, string>()
  if (user.role === 'admin' && duplicateIds.length) {
    const { data: related, error } = await supabase
      .from('complaints')
      .select('id, reference_number')
      .in('id', duplicateIds)
    if (error) raiseDbError(error, 'Duplicate flags could not be loaded.')
    for (const relatedRow of related ?? []) references.set(relatedRow.id, relatedRow.reference_number)
  }

  const complaint: Complaint = {
    ...mapComplaint(row),
    updates: (updatesResult.data ?? []).map((item) => mapUpdate(item)),
    duplicate_flags: user.role === 'admin' ? flagRows.map((flag) => mapFlag(flag, references.get(flag.possible_duplicate_id) ?? null)) : [],
    verifications: (verificationResult.data ?? []).map((item) => mapVerification(item)),
    duplicate_count: flagRows.length,
  }

  if (user.role !== 'admin') {
    return { complaint, departments: [], officers: [] }
  }
  const [departments, officers] = await Promise.all([listDepartments(), listOfficers()])
  return { complaint, departments, officers }
}

export async function listDepartments(): Promise<{ id: string; name: string }[]> {
  const { data, error } = await getAdmin().from('departments').select('id, name').order('name')
  if (error) raiseDbError(error, 'Departments could not be loaded.')
  return data ?? []
}

export async function listOfficers(): Promise<OfficerOption[]> {
  const { data, error } = await getAdmin()
    .from('profiles')
    .select('id, full_name, email, role')
    .in('role', ['officer', 'admin'])
    .order('full_name')
  if (error) raiseDbError(error, 'Officers could not be loaded.')
  return (data ?? []).map((officer) => ({
    id: officer.id,
    fullName: officer.full_name,
    email: officer.email,
    role: officer.role,
  }))
}

async function departmentIdFor(name: string | undefined, category: Complaint['category']): Promise<string | null> {
  const target = resolveDepartmentName(name) || resolveDepartmentName(departmentForCategory(category))
  if (!target) return null
  const { data, error } = await getAdmin().from('departments').select('id').ilike('name', target).maybeSingle()
  if (error) raiseDbError(error, 'The department could not be resolved.')
  return data?.id ?? null
}

export async function createComplaint(user: AuthUser, body: unknown): Promise<ComplaintDetailResponse> {
  const parsed = parseBody(createComplaintSchema, body)
  const buffer = decodeImage(parsed.imageBase64, parsed.mimeType)
  const imageUrl = await uploadComplaintImage(user.id, buffer, parsed.mimeType)
  const departmentId = await departmentIdFor(parsed.departmentName, parsed.category)
  let aiAnalysis: AiAnalysis | null = null
  let aiConfidence: number | null = null
  if (parsed.aiSource !== 'manual' && parsed.aiAnalysis) {
    aiAnalysis = { ...parsed.aiAnalysis, source: parsed.aiSource }
    aiConfidence = parsed.aiConfidence ?? parsed.aiAnalysis.confidence
  }

  const { data, error } = await getAdmin()
    .from('complaints')
    .insert({
      citizen_id: user.id,
      title: parsed.title,
      description: parsed.description,
      category: parsed.category,
      severity: parsed.severity,
      department_id: departmentId,
      image_url: imageUrl,
      latitude: parsed.latitude,
      longitude: parsed.longitude,
      address: parsed.address || null,
      ai_confidence: aiConfidence,
      ai_analysis: aiAnalysis,
      status: 'pending',
    })
    .select('id')
    .single()
  if (error || !data) raiseDbError(error ?? { message: 'insert failed' }, 'The complaint could not be saved.')

  const { error: updateError } = await getAdmin().from('complaint_updates').insert({
    complaint_id: data.id,
    updated_by: user.id,
    old_status: null,
    new_status: 'pending',
    remarks: 'Complaint submitted.',
    is_internal: false,
  })
  if (updateError) console.error('[complaints:timeline]', updateError.message)

  try {
    await detectDuplicates(data.id)
  } catch (duplicateError) {
    console.error('[duplicates]', duplicateError)
  }
  return getComplaint(user, data.id)
}

export async function patchComplaint(user: AuthUser, id: string, body: unknown): Promise<ComplaintDetailResponse> {
  assertAdmin(user)
  const admin = user
  const parsed = parseBody(patchComplaintSchema, body)
  const existing = await loadComplaintRow(id)
  assertOwner(admin, existing)
  const notes: string[] = []
  const changes: { severity?: Complaint['severity'] } = {}
  if (parsed.severity && parsed.severity !== existing.severity) {
    changes.severity = parsed.severity
    notes.push(`Priority changed from ${severityLabel(existing.severity)} to ${severityLabel(parsed.severity)}.`)
  }
  if (parsed.remarks?.trim()) notes.push(parsed.remarks.trim())
  if (Object.keys(changes).length) {
    const { error } = await getAdmin().from('complaints').update(changes).eq('id', id)
    if (error) raiseDbError(error, 'The complaint could not be updated.')
  }
  if (notes.length) {
    const { error } = await getAdmin().from('complaint_updates').insert({
      complaint_id: id,
      updated_by: admin.id,
      old_status: existing.status,
      new_status: existing.status,
      remarks: notes.join(' '),
      is_internal: parsed.remarksInternal ?? !parsed.remarks,
    })
    if (error) raiseDbError(error, 'The note could not be saved.')
  }
  if (parsed.duplicateFlagId && parsed.duplicateReviewStatus) {
    const { data, error } = await getAdmin()
      .from('duplicate_flags')
      .update({ review_status: parsed.duplicateReviewStatus })
      .eq('id', parsed.duplicateFlagId)
      .eq('complaint_id', id)
      .select('id')
      .maybeSingle()
    if (error) raiseDbError(error, 'The duplicate flag could not be updated.')
    if (!data) throw new HttpError(404, 'Duplicate flag not found.')
  }
  if (parsed.verificationId && parsed.humanVerified) {
    const { data, error } = await getAdmin()
      .from('resolution_verifications')
      .update({ human_verified: true, verified_by: admin.id })
      .eq('id', parsed.verificationId)
      .eq('complaint_id', id)
      .select('id')
      .maybeSingle()
    if (error) raiseDbError(error, 'The verification could not be updated.')
    if (!data) throw new HttpError(404, 'Verification record not found.')
  }
  return getComplaint(admin, id)
}

export async function assignComplaint(user: AuthUser, id: string, body: unknown): Promise<ComplaintDetailResponse> {
  assertAdmin(user)
  const parsed = parseBody(assignSchema, body)
  const existing = await loadComplaintRow(id)
  const supabase = getAdmin()
  const { data: department, error: departmentError } = await supabase
    .from('departments')
    .select('id, name')
    .eq('id', parsed.departmentId)
    .maybeSingle()
  if (departmentError) raiseDbError(departmentError, 'The department could not be loaded.')
  if (!department) throw new HttpError(400, 'Choose a valid department.')

  let officerName: string | null = null
  if (parsed.officerId) {
    const { data: officer, error } = await supabase
      .from('profiles')
      .select('id, full_name, role')
      .eq('id', parsed.officerId)
      .maybeSingle()
    if (error) raiseDbError(error, 'The officer could not be loaded.')
    if (!officer || (officer.role !== 'officer' && officer.role !== 'admin')) {
      throw new HttpError(400, 'Choose a valid officer.')
    }
    officerName = officer.full_name
  }

  const { error: assignmentError } = await supabase.from('complaint_assignments').insert({
    complaint_id: id,
    department_id: department.id,
    officer_id: parsed.officerId ?? null,
    assigned_by: user.id,
  })
  if (assignmentError) raiseDbError(assignmentError, 'The assignment could not be saved.')

  const { error } = await supabase
    .from('complaints')
    .update({ department_id: department.id, assigned_officer_id: parsed.officerId ?? null })
    .eq('id', id)
  if (error) raiseDbError(error, 'The assignment could not be saved.')

  const { error: noteError } = await supabase.from('complaint_updates').insert({
    complaint_id: id,
    updated_by: user.id,
    old_status: existing.status,
    new_status: existing.status,
    remarks: `Assigned to ${department.name}${officerName ? ` (${officerName})` : ''}.`,
    is_internal: true,
  })
  if (noteError) console.error('[complaints:assign]', noteError.message)
  return getComplaint(user, id)
}

export async function updateComplaintStatus(user: AuthUser, id: string, body: unknown): Promise<ComplaintDetailResponse> {
  assertAdmin(user)
  const parsed = parseBody(statusSchemaBody, body)
  const existing = await loadComplaintRow(id)
  const remarks = parsed.remarks?.trim() ?? ''
  if (parsed.status === existing.status && !remarks) {
    throw new HttpError(400, 'Choose a new status or add a note.')
  }
  if (parsed.status === 'resolved' && existing.status !== 'resolved' && remarks.length < 5) {
    throw new HttpError(400, 'Add a short resolution note before marking this complaint resolved.')
  }
  const { error } = await getAdmin().from('complaints').update({ status: parsed.status }).eq('id', id)
  if (error) raiseDbError(error, 'The status could not be updated.')
  const { error: noteError } = await getAdmin().from('complaint_updates').insert({
    complaint_id: id,
    updated_by: user.id,
    old_status: existing.status,
    new_status: parsed.status,
    remarks: remarks || null,
    is_internal: false,
  })
  if (noteError) raiseDbError(noteError, 'The status note could not be saved.')
  return getComplaint(user, id)
}
