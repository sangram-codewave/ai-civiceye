import { requireAdmin } from '../../lib/auth'
import { assignComplaint } from '../../lib/complaints'
import { assertMethod, qstring, readBody, wrap } from '../../lib/http'
import { parseId } from '../../lib/schemas'

export default wrap('assign', async (req, res) => {
  assertMethod(req, ['POST'])
  const admin = await requireAdmin(req)
  res.json(await assignComplaint(admin, parseId(qstring(req.query.id)), readBody(req)))
})
