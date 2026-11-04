import { requireAdmin } from '../../lib/auth'
import { updateComplaintStatus } from '../../lib/complaints'
import { assertMethod, qstring, readBody, wrap } from '../../lib/http'
import { parseId } from '../../lib/schemas'

export default wrap('update-status', async (req, res) => {
  assertMethod(req, ['POST'])
  const admin = await requireAdmin(req)
  res.json(await updateComplaintStatus(admin, parseId(qstring(req.query.id)), readBody(req)))
})
