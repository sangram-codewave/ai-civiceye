export function isSupabaseConfigured(): boolean {
  return Boolean(import.meta.env.SUPABASE_URL && import.meta.env.SUPABASE_ANON_KEY)
}

export function missingClientEnv(): string[] {
  const missing: string[] = []
  if (!import.meta.env.SUPABASE_URL) missing.push('SUPABASE_URL')
  if (!import.meta.env.SUPABASE_ANON_KEY) missing.push('SUPABASE_ANON_KEY')
  return missing
}
