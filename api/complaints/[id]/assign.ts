import { requireAdmin } from '../../../server/auth'
import { assignComplaint } from '../../../server/complaints'
import { assertMethod, qstring, readBody, wrap } from '../../../server/http'
import { parseId } from '../../../server/schemas'

export default wrap('assign', async (req, res) => {
  assertMethod(req, ['POST'])
  const admin = await requireAdmin(req)
  res.json(await assignComplaint(admin, parseId(qstring(req.query.id)), readBody(req)))
})
