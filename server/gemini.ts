import { departmentForCategory, normalizeCategory, resolveDepartmentName } from '../shared/constants'
import type { AiAnalysis, ResolutionAiResult } from '../shared/types'
import { getServerEnv, isGeminiConfigured } from './env'
import { HttpError } from './http'

const analysisResponseSchema = {
  type: 'object',
  properties: {
    category: {
      type: 'string',
      enum: [
        'Pothole',
        'Garbage overflow',
        'Drainage blockage',
        'Broken streetlight',
        'Water leakage',
        'Damaged public infrastructure',
        'Other',
      ],
    },
    severity: { type: 'string', enum: ['Low', 'Medium', 'High', 'Critical'] },
    description: { type: 'string' },
    department: {
      type: 'string',
      enum: ['Road Maintenance', 'Sanitation', 'Drainage', 'Electrical', 'Water Supply'],
    },
    confidence: { type: 'number' },
    recommended_action: { type: 'string' },
    priority_reason: { type: 'string' },
    image_unclear: { type: 'boolean' },
  },
  required: [
    'category',
    'severity',
    'description',
    'department',
    'confidence',
    'recommended_action',
    'priority_reason',
    'image_unclear',
  ],
}

const verificationResponseSchema = {
  type: 'object',
  properties: {
    improvement_detected: { type: 'boolean' },
    observations: { type: 'string' },
    confidence: { type: 'number' },
    recommendation: { type: 'string' },
  },
  required: ['improvement_detected', 'observations', 'confidence', 'recommendation'],
}

type GeminiPart = { text: string } | { inlineData: { mimeType: string; data: string } }

function clampConfidence(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new HttpError(502, 'AI analysis returned invalid data. Enter the details manually.')
  }
  const normalized = value > 1 && value <= 100 ? value / 100 : value
  if (normalized < 0 || normalized > 1) {
    throw new HttpError(502, 'AI analysis returned invalid data. Enter the details manually.')
  }
  return normalized
}

async function generate(parts: GeminiPart[], schema: object): Promise<unknown> {
  if (!isGeminiConfigured()) {
    throw new HttpError(503, 'Gemini API key is not configured. Enter complaint details manually.', {
      code: 'AI_UNAVAILABLE',
    })
  }
  const env = getServerEnv()
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(env.geminiModel)}:generateContent?key=${encodeURIComponent(env.geminiKey)}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts }],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: 'application/json',
          responseSchema: schema,
        },
      }),
    },
  )
  const payload = (await response.json()) as {
    error?: { message?: string }
    candidates?: { content?: { parts?: { text?: string }[] } }[]
  }
  if (!response.ok) {
    console.error('[gemini]', payload.error?.message || response.status)
    throw new HttpError(502, 'AI analysis failed. You can continue by entering the details manually.')
  }
  const text = payload.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('').trim()
  if (!text) throw new HttpError(502, 'AI analysis returned an empty response. Enter the details manually.')
  try {
    return JSON.parse(text) as unknown
  } catch {
    throw new HttpError(502, 'AI analysis returned invalid data. Enter the details manually.')
  }
}

export async function analyseComplaintImage(base64: string, mimeType: string): Promise<AiAnalysis> {
  const raw = await generate(
    [
      {
        text: `You analyse photos for a municipal civic-complaint desk in India.
Identify the visible civic issue. Use only the allowed category, severity, and department values.
If the photo is dark, blurry, or does not clearly show a civic problem, set image_unclear to true, category to Other, severity to Low, and confidence below 0.4.
When image_unclear is true, the description must say that the image is unclear and must not claim certainty.
confidence is a number from 0 to 1.`,
      },
      { inlineData: { mimeType, data: base64 } },
    ],
    analysisResponseSchema,
  )
  if (!raw || typeof raw !== 'object') {
    throw new HttpError(502, 'AI analysis returned invalid data. Enter the details manually.')
  }
  const record = raw as Record<string, unknown>
  const category = typeof record.category === 'string' ? normalizeCategory(record.category) : null
  if (!category || typeof record.severity !== 'string' || typeof record.description !== 'string') {
    throw new HttpError(502, 'AI analysis returned invalid data. Enter the details manually.')
  }
  const unclear = record.image_unclear === true
  let confidence = clampConfidence(record.confidence)
  let description = record.description.trim()
  if (unclear) {
    confidence = Math.min(confidence, 0.4)
    if (!/unclear/i.test(description)) description = `The image is unclear. ${description}`
  }
  const department =
    (typeof record.department === 'string' ? resolveDepartmentName(record.department) : null) ||
    departmentForCategory(category)
  const recommended = String(record.recommended_action || '').trim()
  const reason = String(record.priority_reason || '').trim()
  if (!recommended || !reason || !description) {
    throw new HttpError(502, 'AI analysis returned invalid data. Enter the details manually.')
  }
  return {
    category: typeof record.category === 'string' ? record.category : category,
    severity: record.severity,
    description,
    department,
    confidence,
    recommended_action: recommended,
    priority_reason: reason,
    image_unclear: unclear,
  }
}

export async function summariseComplaints(lines: string[]): Promise<string> {
  const raw = await generate(
    [
      {
        text: `Write a short operational summary for a municipal administrator.
Use only the complaint records below. Do not invent places, counts, or outcomes.
Keep it under 160 words and mention the most urgent items first.

${lines.join('\n')}`,
      },
    ],
    {
      type: 'object',
      properties: { summary: { type: 'string' } },
      required: ['summary'],
    },
  )
  if (!raw || typeof raw !== 'object' || typeof (raw as { summary?: unknown }).summary !== 'string') {
    throw new HttpError(502, 'AI summary failed. Try again later.')
  }
  return (raw as { summary: string }).summary.trim()
}

export async function compareRepairImages(
  before: { base64: string; mimeType: string },
  after: { base64: string; mimeType: string },
): Promise<ResolutionAiResult> {
  const raw = await generate(
    [
      {
        text: `Compare two photos of the same civic complaint. The first image is before the repair and the second is after.
Say whether a visible improvement appears. Do not declare the complaint resolved.
The recommendation must tell a person to verify the result.
confidence is a number from 0 to 1. If either photo is unclear, say so and keep confidence at or below 0.4.`,
      },
      { inlineData: { mimeType: before.mimeType, data: before.base64 } },
      { inlineData: { mimeType: after.mimeType, data: after.base64 } },
    ],
    verificationResponseSchema,
  )
  if (!raw || typeof raw !== 'object') {
    throw new HttpError(502, 'AI verification failed. A person still needs to review the photos.')
  }
  const record = raw as Record<string, unknown>
  if (typeof record.improvement_detected !== 'boolean' || typeof record.observations !== 'string') {
    throw new HttpError(502, 'AI verification failed. A person still needs to review the photos.')
  }
  return {
    improvement_detected: record.improvement_detected,
    observations: record.observations.trim(),
    confidence: clampConfidence(record.confidence),
    recommendation:
      String(record.recommendation || '').trim() ||
      'A municipal officer should verify the photos before changing the complaint status.',
  }
}

export async function embedText(text: string): Promise<number[] | null> {
  if (!isGeminiConfigured()) return null
  const env = getServerEnv()
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${encodeURIComponent(env.geminiKey)}`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ content: { parts: [{ text: text.slice(0, 2000) }] } }),
      },
    )
    if (!response.ok) {
      console.error('[gemini-embed] request failed, using text similarity')
      return null
    }
    const payload = (await response.json()) as { embedding?: { values?: number[] } }
    return payload.embedding?.values ?? null
  } catch (error) {
    console.error('[gemini-embed] falling back to text similarity', error)
    return null
  }
}
