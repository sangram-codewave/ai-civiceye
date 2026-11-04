import { requireAdmin } from '../../../server/auth'
import { updateComplaintStatus } from '../../../server/complaints'
import { assertMethod, qstring, readBody, wrap } from '../../../server/http'
import { parseId } from '../../../server/schemas'

export default wrap('update-status', async (req, res) => {
  assertMethod(req, ['POST'])
  const admin = await requireAdmin(req)
  res.json(await updateComplaintStatus(admin, parseId(qstring(req.query.id)), readBody(req)))
})
