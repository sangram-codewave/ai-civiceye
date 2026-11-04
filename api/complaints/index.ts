import { requireUser } from '../lib/auth'
import { createComplaint, listComplaints } from '../lib/complaints'
import { assertMethod, readBody, wrap } from '../lib/http'

export default wrap('complaints', async (req, res) => {
  assertMethod(req, ['GET', 'POST'])
  const user = await requireUser(req)
  if ((req.method || 'GET').toUpperCase() === 'POST') {
    const complaint = await createComplaint(user, readBody(req))
    res.status(201).json(complaint)
    return
  }
  res.json(await listComplaints(user, req.query))
})
