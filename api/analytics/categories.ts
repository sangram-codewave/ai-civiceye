import { requireAdmin } from '../lib/auth'
import { buildCategoryStats } from '../lib/analytics'
import { assertMethod, wrap } from '../lib/http'

export default wrap('analytics-categories', async (req, res) => {
  assertMethod(req, ['GET'])
  await requireAdmin(req)
  res.json(await buildCategoryStats())
})
