import { requireAdmin } from '../../server/auth.js'
import { buildCategoryStats, buildDepartmentStats, buildOverview, buildTrends } from '../../server/analytics.js'
import { HttpError, assertMethod, qstring, wrap } from '../../server/http.js'

const views = {
  overview: buildOverview,
  categories: buildCategoryStats,
  trends: buildTrends,
  departments: buildDepartmentStats,
} as const

export default wrap('analytics', async (req, res) => {
  assertMethod(req, ['GET'])
  await requireAdmin(req)
  const view = qstring(req.query.view) ?? 'overview'
  const build = views[view as keyof typeof views]
  if (!build) throw new HttpError(400, 'Choose an analytics view: overview, categories, trends, or departments.')
  res.json(await build())
})
