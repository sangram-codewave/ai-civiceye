import { requireUser } from '../../server/auth'
import { getComplaint, patchComplaint } from '../../server/complaints'
import { assertMethod, qstring, readBody, wrap } from '../../server/http'
import { parseId } from '../../server/schemas'

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
