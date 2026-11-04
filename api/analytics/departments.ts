import { requireAdmin } from '../lib/auth'
import { buildDepartmentStats } from '../lib/analytics'
import { assertMethod, wrap } from '../lib/http'

export default wrap('analytics-departments', async (req, res) => {
  assertMethod(req, ['GET'])
  await requireAdmin(req)
  res.json(await buildDepartmentStats())
})