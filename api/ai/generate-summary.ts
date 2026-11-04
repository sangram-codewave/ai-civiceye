import { requireAdmin } from '../lib/auth'
import { isGeminiConfigured } from '../lib/env'
import { summariseComplaints } from '../lib/gemini'
import { assertMethod, HttpError, readBody, wrap } from '../lib/http'
import { raiseDbError } from '../lib/mappers'
import { assertRateLimit } from '../lib/rateLimit'
import { parseBody, summarySchema } from '../lib/schemas'
import { getAdmin } from '../lib/supabase'

export default wrap('generate-summary', async (req, res) => {
  assertMethod(req, ['POST'])
  const admin = await requireAdmin(req)
  if (!isGeminiConfigured()) {
    throw new HttpError(503, 'Gemini API key is not configured.', { code: 'AI_UNAVAILABLE' })
  }
  assertRateLimit(`ai:${admin.id}`, 10, 10 * 60 * 1000)
  const body = parseBody(summarySchema, readBody(req))
  let query = getAdmin()
    .from('complaints')
    .select('reference_number, title, category, severity, status, address, created_at')
    .order('created_at', { ascending: false })
    .limit(30)
  if (body.complaintIds?.length) query = query.in('id', body.complaintIds)
  const { data, error } = await query
  if (error) raiseDbError(error, 'Complaints could not be summarized.')
  if (!data?.length) throw new HttpError(400, 'There are no complaints to summarize.')
  const lines = data.map(
    (row) =>
      `${row.reference_number} | ${row.category} | ${row.severity} | ${row.status} | ${row.address ?? 'no address'} | ${row.title}`,
  )
  const summary = await summariseComplaints(lines)
  res.json({ summary, persisted: false })
})
