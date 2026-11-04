import { z } from 'zod'
import { CATEGORY_VALUES, SEVERITY_VALUES, STATUS_VALUES } from '../shared/constants.js'
import { HttpError } from './http.js'

export const categorySchema = z.enum(CATEGORY_VALUES)
export const severitySchema = z.enum(SEVERITY_VALUES)
export const statusSchema = z.enum(STATUS_VALUES)

const imageFields = {
  imageBase64: z.string().min(20, 'Attach a complaint image.'),
  mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp']),
}

export const analyseSchema = z.object(imageFields)

export const aiAnalysisSchema = z.object({
  category: z.string().min(1),
  severity: z.string().min(1),
  description: z.string().min(1),
  department: z.string(),
  confidence: z.number().min(0).max(1),
  recommended_action: z.string().min(1),
  priority_reason: z.string().min(1),
  image_unclear: z.boolean().optional(),
  source: z.enum(['gemini', 'edited', 'manual']).optional(),
})

export const createComplaintSchema = z.object({
  ...imageFields,
  title: z.string().trim().min(3, 'Enter a short title.').max(140),
  description: z.string().trim().min(10, 'Describe the issue in a sentence or two.').max(4000),
  category: categorySchema,
  severity: severitySchema,
  departmentName: z.string().trim().max(80).optional(),
  latitude: z.number().gte(-90).lte(90),
  longitude: z.number().gte(-180).lte(180),
  address: z.string().trim().max(500).optional(),
  aiConfidence: z.number().min(0).max(1).nullable().optional(),
  aiAnalysis: aiAnalysisSchema.nullable().optional(),
  aiSource: z.enum(['gemini', 'edited', 'manual']),
})

export const complaintQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  category: categorySchema.optional(),
  severity: severitySchema.optional(),
  departmentId: z.uuid().optional(),
  status: statusSchema.optional(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a YYYY-MM-DD date.').optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a YYYY-MM-DD date.').optional(),
  sort: z.enum(['created_at', 'severity', 'status', 'reference_number']).default('created_at'),
  direction: z.enum(['asc', 'desc']).default('desc'),
  page: z.number().int().min(1).max(10000).default(1),
  pageSize: z.number().int().min(1).max(500).default(8),
})

export const patchComplaintSchema = z
  .object({
    severity: severitySchema.optional(),
    remarks: z.string().trim().max(2000).optional(),
    remarksInternal: z.boolean().optional(),
    duplicateFlagId: z.uuid().optional(),
    duplicateReviewStatus: z.enum(['confirmed', 'dismissed']).optional(),
    verificationId: z.uuid().optional(),
    humanVerified: z.boolean().optional(),
  })
  .refine((value) => Object.values(value).some((item) => item !== undefined), {
    message: 'No changes were provided.',
  })

export const assignSchema = z.object({
  departmentId: z.uuid(),
  officerId: z.uuid().nullable().optional(),
})

export const statusSchemaBody = z.object({
  status: statusSchema,
  remarks: z.string().trim().max(2000).optional(),
})

export const duplicateSchema = z.object({
  complaintId: z.uuid(),
})

export const summarySchema = z.object({
  complaintIds: z.array(z.uuid()).max(30).optional(),
})

export const verifySchema = z.object({
  complaintId: z.uuid(),
  imageBase64: z.string().min(20, 'Attach the repair image.'),
  mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp']),
})

export function parseId(value: string | undefined): string {
  const parsed = z.uuid().safeParse(value)
  if (!parsed.success) throw new HttpError(400, 'The complaint id is not valid.')
  return parsed.data
}

export function parseBody<T>(schema: z.ZodType<T>, body: unknown): T {
  const result = schema.safeParse(body)
  if (!result.success) {
    const issue = result.error.issues[0]
    const path = issue?.path.length ? `${issue.path.join('.')}: ` : ''
    throw new HttpError(400, `${path}${issue?.message || 'Invalid input.'}`)
  }
  return result.data
}
