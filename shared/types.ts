export type Role = 'citizen' | 'admin' | 'officer'
export type Category =
  | 'pothole'
  | 'garbage'
  | 'drainage'
  | 'streetlight'
  | 'water_leakage'
  | 'infrastructure'
  | 'other'
export type Severity = 'low' | 'medium' | 'high' | 'critical'
export type ComplaintStatus = 'pending' | 'in_progress' | 'resolved'
export type DuplicateReviewStatus = 'pending' | 'confirmed' | 'dismissed'
export type AiSource = 'gemini' | 'edited' | 'manual'

export type AiAnalysis = {
  category: string
  severity: string
  description: string
  department: string
  confidence: number
  recommended_action: string
  priority_reason: string
  image_unclear?: boolean
  source?: AiSource
}

export type ResolutionAiResult = {
  improvement_detected: boolean
  observations: string
  confidence: number
  recommendation: string
}

export type ComplaintUpdate = {
  id: string
  complaint_id: string
  updated_by: string | null
  author_name: string | null
  old_status: ComplaintStatus | null
  new_status: ComplaintStatus
  remarks: string | null
  is_internal: boolean
  created_at: string
}

export type DuplicateFlag = {
  id: string
  complaint_id: string
  possible_duplicate_id: string
  possible_duplicate_reference: string | null
  similarity_score: number
  review_status: DuplicateReviewStatus
  created_at: string
}

export type ResolutionVerification = {
  id: string
  complaint_id: string
  before_image_url: string | null
  after_image_url: string | null
  ai_result: ResolutionAiResult | null
  human_verified: boolean
  verified_by: string | null
  created_at: string
}

export type ComplaintListItem = {
  id: string
  reference_number: string
  citizen_id: string
  citizen_name: string | null
  title: string
  description: string
  category: Category
  severity: Severity
  status: ComplaintStatus
  department_id: string | null
  department_name: string | null
  assigned_officer_id: string | null
  assigned_officer_name: string | null
  image_url: string | null
  resolution_image_url: string | null
  latitude: number
  longitude: number
  address: string | null
  ai_confidence: number | null
  ai_analysis: AiAnalysis | null
  created_at: string
  updated_at: string
  resolved_at: string | null
}

export type Complaint = ComplaintListItem & {
  updates: ComplaintUpdate[]
  duplicate_flags: DuplicateFlag[]
  verifications: ResolutionVerification[]
  duplicate_count: number
}

export type ComplaintSummary = {
  total: number
  pending: number
  inProgress: number
  resolved: number
}

export type ListResponse = {
  data: ComplaintListItem[]
  page: number
  pageSize: number
  total: number
  summary: ComplaintSummary
}

export type OfficerOption = {
  id: string
  fullName: string
  email: string
  role: Role
}

export type DepartmentWorkload = {
  id: string
  name: string
  pending: number
  inProgress: number
  resolved: number
  total: number
}

export type Overview = {
  total: number
  open: number
  pending: number
  inProgress: number
  critical: number
  resolved: number
  averageResolutionHours: number | null
}

export type OverviewResponse = Overview & {
  officers: OfficerOption[]
  departments: DepartmentWorkload[]
}

export type CategoryStat = {
  category: Category
  label: string
  count: number
}

export type TrendPoint = {
  month: string
  label: string
  reported: number
  resolved: number
}

export type HealthResponse = {
  ok: boolean
  demoMode: boolean
  services: { database: boolean; ai: boolean }
  missing: string[]
  totals: { complaints: number; resolved: number } | null
}

export type ComplaintDetailResponse = {
  complaint: Complaint
  departments: { id: string; name: string }[]
  officers: OfficerOption[]
}

export type ComplaintQuery = {
  q?: string
  category?: Category
  severity?: Severity
  departmentId?: string
  status?: ComplaintStatus
  from?: string
  to?: string
  sort?: 'created_at' | 'severity' | 'status' | 'reference_number'
  direction?: 'asc' | 'desc'
  page?: number
  pageSize?: number
  citizenId?: string
}
