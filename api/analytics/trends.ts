import { requireAdmin } from '../lib/auth'
import { buildTrends } from '../lib/analytics'
import { assertMethod, wrap } from '../lib/http'

export default wrap('analytics-trends', async (req, res) => {
  assertMethod(req, ['GET'])
  await requireAdmin(req)
  res.json(await buildTrends())
})
