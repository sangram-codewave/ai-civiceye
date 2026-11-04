import { requireUser } from '../lib/auth'
import { detectDuplicates } from '../lib/duplicates'
import { assertMethod, HttpError, readBody, wrap } from '../lib/http'
import { assertRateLimit } from '../lib/rateLimit'
import { duplicateSchema, parseBody } from '../lib/schemas'
import { getAdmin } from '../lib/supabase'

export default wrap('detect-duplicates', async (req, res) => {
  assertMethod(req, ['POST'])
  const user = await requireUser(req)
  assertRateLimit(`ai:${user.id}`, 10, 10 * 60 * 1000)
  const body = parseBody(duplicateSchema, readBody(req))
  const { data, error } = await getAdmin()
    .from('complaints')
    .select('id, citizen_id')
    .eq('id', body.complaintId)
    .maybeSingle()
  if (error) throw new HttpError(500, 'The complaint could not be loaded.')
  if (!data) throw new HttpError(404, 'Complaint not found.')
  if (user.role !== 'admin' && data.citizen_id !== user.id) {
    throw new HttpError(403, 'You can only check your own complaints.')
  }
  const flagged = await detectDuplicates(body.complaintId)
  res.json({ flagged, discarded: false })
})
