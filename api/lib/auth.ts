import type { Role } from '../../shared/types'
import { isSupabaseConfigured } from './env'
import { header, HttpError, type Req } from './http'
import { getAdmin } from './supabase'

export type AuthUser = {
  id: string
  email: string
  fullName: string
  role: Role
  phone: string | null
}

function bearer(req: Req): string | null {
  const value = header(req, 'authorization')
  const match = value?.match(/^Bearer\s+(.+)$/i)
  return match?.[1]?.trim() || null
}

export async function requireUser(req: Req): Promise<AuthUser> {
  if (!isSupabaseConfigured()) {
    throw new HttpError(503, 'Database is not configured.', {
      demoMode: true,
      code: 'DATABASE_UNAVAILABLE',
    })
  }
  const token = bearer(req)
  if (!token) throw new HttpError(401, 'Sign in required.')

  const supabase = getAdmin()
  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data.user) throw new HttpError(401, 'Your session is no longer valid. Sign in again.')

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, full_name, email, phone, role')
    .eq('id', data.user.id)
    .maybeSingle()

  if (profileError) {
    console.error('[auth:profile]', profileError.message)
    throw new HttpError(500, 'Your profile could not be loaded.')
  }
  if (!profile) throw new HttpError(403, 'Profile not found.')

  const role = profile.role
  if (role !== 'citizen' && role !== 'admin' && role !== 'officer') {
    throw new HttpError(403, 'This account does not have a valid role.')
  }

  return {
    id: profile.id,
    email: profile.email,
    fullName: profile.full_name,
    role,
    phone: profile.phone,
  }
}

export async function requireAdmin(req: Req): Promise<AuthUser> {
  const user = await requireUser(req)
  if (user.role !== 'admin') throw new HttpError(403, 'Administrator access is required.')
  return user
}
