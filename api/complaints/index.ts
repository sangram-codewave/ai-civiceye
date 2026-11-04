import { requireUser } from '../../server/auth.js'
import { createComplaint, listComplaints } from '../../server/complaints.js'
import { assertMethod, readBody, wrap } from '../../server/http.js'

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
