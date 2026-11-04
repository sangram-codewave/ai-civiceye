import { requireAdmin } from '../lib/auth'
import { buildOverview } from '../lib/analytics'
import { assertMethod, wrap } from '../lib/http'

export default wrap('analytics-overview', async (req, res) => {
  assertMethod(req, ['GET'])
  await requireAdmin(req)
  res.json(await buildOverview())
})
