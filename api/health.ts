import { isGeminiConfigured, isSupabaseConfigured, missingServerEnv } from '../server/env'
import { assertMethod, wrap } from '../server/http'
import { getAdmin } from '../server/supabase'

export default wrap('health', async (req, res) => {
  assertMethod(req, ['GET'])
  const databaseConfigured = isSupabaseConfigured()
  let database = databaseConfigured
  let totals: { complaints: number; resolved: number } | null = null
  if (databaseConfigured) {
    const supabase = getAdmin()
    const [all, resolved] = await Promise.all([
      supabase.from('complaints').select('id', { count: 'exact', head: true }),
      supabase.from('complaints').select('id', { count: 'exact', head: true }).eq('status', 'resolved'),
    ])
    if (all.error || resolved.error) {
      console.error('[health]', all.error?.message || resolved.error?.message)
      database = false
    } else {
      totals = { complaints: all.count ?? 0, resolved: resolved.count ?? 0 }
    }
  }
  res.json({
    ok: true,
    demoMode: !databaseConfigured,
    services: { database, ai: isGeminiConfigured() },
    missing: missingServerEnv(),
    totals,
  })
})
