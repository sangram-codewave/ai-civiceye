import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { isSupabaseConfigured } from './env'

export const supabase: SupabaseClient | null = isSupabaseConfigured()
  ? createClient(import.meta.env.SUPABASE_URL, import.meta.env.SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
  : null
