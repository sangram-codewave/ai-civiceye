import { requireUser } from '../../server/auth.js'
import { getComplaint, patchComplaint } from '../../server/complaints.js'
import { assertMethod, qstring, readBody, wrap } from '../../server/http.js'
import { parseId } from '../../server/schemas.js'

export default wrap('complaint', async (req, res) => {
  assertMethod(req, ['GET', 'PATCH'])
  const user = await requireUser(req)
  const id = parseId(qstring(req.query.id))
  if ((req.method || 'GET').toUpperCase() === 'PATCH') {
    res.json(await patchComplaint(user, id, readBody(req)))
    return
  }
  res.json(await getComplaint(user, id))
})
