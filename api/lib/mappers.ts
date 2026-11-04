import type {
  AiAnalysis,
  ComplaintListItem,
  ComplaintStatus,
  ComplaintUpdate,
  DuplicateFlag,
  ResolutionAiResult,
  ResolutionVerification,
} from '../../shared/types'
import { HttpError } from './http'

type Relation<T> = T | T[] | null

function one<T>(value: Relation<T>): T | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

function asNumber(value: number | string | null | undefined): number | null {
  if (value == null || value === '') return null
  const number = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(number) ? number : null
}

export type ComplaintRow = {
  id: string
  reference_number: string
  citizen_id: string
  title: string
  description: string
  category: ComplaintListItem['category']
  severity: ComplaintListItem['severity']
  status: ComplaintStatus
  department_id: string | null
  assigned_officer_id: string | null
  image_url: string | null
  resolution_image_url: string | null
  latitude: number | string
  longitude: number | string
  address: string | null
  ai_confidence: number | string | null
  ai_analysis: AiAnalysis | null
  created_at: string
  updated_at: string
  resolved_at: string | null
  department?: Relation<{ name: string }>
  officer?: Relation<{ full_name: string }>
  citizen?: Relation<{ full_name: string }>
}

export const LIST_SELECT = `
  id, reference_number, citizen_id, title, description, category, severity, status,
  department_id, assigned_officer_id, image_url, resolution_image_url,
  latitude, longitude, address, ai_confidence, ai_analysis,
  created_at, updated_at, resolved_at,
  department:departments(name),
  officer:profiles!complaints_assigned_officer_id_fkey(full_name),
  citizen:profiles!complaints_citizen_id_fkey(full_name)
`

export function mapComplaint(row: ComplaintRow): ComplaintListItem {
  return {
    id: row.id,
    reference_number: row.reference_number,
    citizen_id: row.citizen_id,
    citizen_name: one(row.citizen)?.full_name ?? null,
    title: row.title,
    description: row.description,
    category: row.category,
    severity: row.severity,
    status: row.status,
    department_id: row.department_id,
    department_name: one(row.department)?.name ?? null,
    assigned_officer_id: row.assigned_officer_id,
    assigned_officer_name: one(row.officer)?.full_name ?? null,
    image_url: row.image_url,
    resolution_image_url: row.resolution_image_url,
    latitude: asNumber(row.latitude) ?? 0,
    longitude: asNumber(row.longitude) ?? 0,
    address: row.address,
    ai_confidence: asNumber(row.ai_confidence),
    ai_analysis: row.ai_analysis,
    created_at: row.created_at,
    updated_at: row.updated_at,
    resolved_at: row.resolved_at,
  }
}

export function mapUpdate(row: {
  id: string
  complaint_id: string
  updated_by: string | null
  old_status: ComplaintStatus | null
  new_status: ComplaintStatus
  remarks: string | null
  is_internal: boolean
  created_at: string
  author?: Relation<{ full_name: string }>
}): ComplaintUpdate {
  return {
    id: row.id,
    complaint_id: row.complaint_id,
    updated_by: row.updated_by,
    author_name: one(row.author)?.full_name ?? null,
    old_status: row.old_status,
    new_status: row.new_status,
    remarks: row.remarks,
    is_internal: row.is_internal,
    created_at: row.created_at,
  }
}

export function mapFlag(
  row: {
    id: string
    complaint_id: string
    possible_duplicate_id: string
    similarity_score: number | string
    review_status: DuplicateFlag['review_status']
    created_at: string
  },
  reference: string | null,
): DuplicateFlag {
  return {
    id: row.id,
    complaint_id: row.complaint_id,
    possible_duplicate_id: row.possible_duplicate_id,
    possible_duplicate_reference: reference,
    similarity_score: asNumber(row.similarity_score) ?? 0,
    review_status: row.review_status,
    created_at: row.created_at,
  }
}

export function mapVerification(row: {
  id: string
  complaint_id: string
  before_image_url: string | null
  after_image_url: string | null
  ai_result: ResolutionAiResult | null
  human_verified: boolean
  verified_by: string | null
  created_at: string
}): ResolutionVerification {
  return {
    id: row.id,
    complaint_id: row.complaint_id,
    before_image_url: row.before_image_url,
    after_image_url: row.after_image_url,
    ai_result: row.ai_result,
    human_verified: row.human_verified,
    verified_by: row.verified_by,
    created_at: row.created_at,
  }
}

export function raiseDbError(error: { message: string }, fallback: string): never {
  console.error('[db]', error.message)
  if (/relation|does not exist|schema cache/i.test(error.message)) {
    throw new HttpError(
      500,
      'Database tables are missing. Run supabase/migrations/001_init.sql in the Supabase SQL editor.',
    )
  }
  throw new HttpError(500, fallback)
}
