import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { getServerEnv, isSupabaseConfigured } from './env'
import { HttpError } from './http'

let client: SupabaseClient | null = null

export function getAdmin(): SupabaseClient {
  if (!isSupabaseConfigured()) {
    throw new HttpError(503, 'Database is not configured.', {
      demoMode: true,
      code: 'DATABASE_UNAVAILABLE',
    })
  }
  if (!client) {
    const env = getServerEnv()
    client = createClient(env.supabaseUrl, env.serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  }
  return client
}
