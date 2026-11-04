import { requireAdmin } from '../../../server/auth.js'
import { assignComplaint } from '../../../server/complaints.js'
import { assertMethod, qstring, readBody, wrap } from '../../../server/http.js'
import { parseId } from '../../../server/schemas.js'

export default wrap('assign', async (req, res) => {
  assertMethod(req, ['POST'])
  const admin = await requireAdmin(req)
  res.json(await assignComplaint(admin, parseId(qstring(req.query.id)), readBody(req)))
})
