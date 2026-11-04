export type ServerEnv = {
  supabaseUrl: string
  serviceRoleKey: string
  geminiKey: string
  geminiModel: string
}

export function getServerEnv(): ServerEnv {
  return {
    supabaseUrl: process.env.SUPABASE_URL || '',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    geminiKey: process.env.GEMINI_API_KEY || '',
    geminiModel: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
  }
}

export function isSupabaseConfigured(): boolean {
  const env = getServerEnv()
  return Boolean(env.supabaseUrl && env.serviceRoleKey)
}

export function isGeminiConfigured(): boolean {
  return Boolean(getServerEnv().geminiKey)
}

export function missingServerEnv(): string[] {
  const missing: string[] = []
  if (!process.env.SUPABASE_URL) missing.push('SUPABASE_URL')
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) missing.push('SUPABASE_SERVICE_ROLE_KEY')
  if (!process.env.GEMINI_API_KEY) missing.push('GEMINI_API_KEY')
  return missing
}
