import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { DEMO_ACCOUNTS } from '@shared/constants'
import type { Role } from '@shared/types'
import { setApiToken } from '@/lib/api'
import { isSupabaseConfigured } from '@/lib/env'
import { supabase } from '@/lib/supabase'

export type SessionUser = {
  id: string
  email: string
  fullName: string
  role: Role
  phone: string | null
}

const DEMO_KEY = 'civiceye-demo-session'

const demoUsers: Record<'citizen' | 'admin', SessionUser> = {
  citizen: {
    id: 'demo-citizen',
    email: DEMO_ACCOUNTS.citizen.email,
    fullName: DEMO_ACCOUNTS.citizen.fullName,
    role: 'citizen',
    phone: DEMO_ACCOUNTS.citizen.phone,
  },
  admin: {
    id: 'demo-admin',
    email: DEMO_ACCOUNTS.admin.email,
    fullName: DEMO_ACCOUNTS.admin.fullName,
    role: 'admin',
    phone: DEMO_ACCOUNTS.admin.phone,
  },
}

type AuthContextValue = {
  user: SessionUser | null
  loading: boolean
  demoMode: boolean
  /** Local preview session while Supabase is configured. Sample complaints are shown; real sign-in is unchanged. */
  previewMode: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (input: { fullName: string; email: string; phone?: string; password: string }) => Promise<{ needsEmailConfirmation: boolean }>
  signOut: () => Promise<void>
  enterDemo: (role: 'citizen' | 'admin', profile?: { fullName: string; email: string; phone?: string }) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

async function loadProfile(userId: string, fallbackEmail: string): Promise<SessionUser> {
  if (!supabase) throw new Error('Supabase is not configured.')
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, phone, role')
      .eq('id', userId)
      .maybeSingle()
    if (error) throw new Error(error.message)
    if (data && (data.role === 'citizen' || data.role === 'admin' || data.role === 'officer')) {
      return {
        id: data.id,
        email: data.email || fallbackEmail,
        fullName: data.full_name || fallbackEmail,
        role: data.role,
        phone: data.phone,
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 400))
  }
  throw new Error('Your profile is not ready yet. Try signing in again.')
}

function readStoredSession(): SessionUser | null {
  const saved = sessionStorage.getItem(DEMO_KEY)
  if (!saved) return null
  try {
    return JSON.parse(saved) as SessionUser
  } catch {
    sessionStorage.removeItem(DEMO_KEY)
    return null
  }
}

function isPreviewUser(user: SessionUser | null): boolean {
  return user?.id === demoUsers.admin.id || user?.id === demoUsers.citizen.id
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const demoMode = !isSupabaseConfigured()
  const [user, setUser] = useState<SessionUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (demoMode || !supabase) {
      setUser(readStoredSession())
      setApiToken(null)
      setLoading(false)
      return
    }

    let active = true
    const client = supabase

    const hydrate = async (token: string, userId: string, email: string) => {
      setApiToken(token)
      const profile = await loadProfile(userId, email)
      if (active) setUser(profile)
    }

    client.auth.getSession().then(async ({ data }) => {
      try {
        if (data.session) {
          sessionStorage.removeItem(DEMO_KEY)
          await hydrate(data.session.access_token, data.session.user.id, data.session.user.email ?? '')
        } else if (active) {
          setUser(readStoredSession())
          setApiToken(null)
        }
      } catch (error) {
        console.error(error)
        await client.auth.signOut()
        if (active) setUser(null)
      } finally {
        if (active) setLoading(false)
      }
    })

    const { data: subscription } = client.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setUser(readStoredSession())
        setApiToken(null)
        return
      }
      sessionStorage.removeItem(DEMO_KEY)
      void hydrate(session.access_token, session.user.id, session.user.email ?? '').catch(async (error) => {
        console.error(error)
        await client.auth.signOut()
        setUser(null)
      })
    })

    const onUnauthorized = () => {
      if (readStoredSession()) return
      void client.auth.signOut()
      setUser(null)
      setApiToken(null)
    }
    window.addEventListener('civiceye:unauthorized', onUnauthorized)
    return () => {
      active = false
      subscription.subscription.unsubscribe()
      window.removeEventListener('civiceye:unauthorized', onUnauthorized)
    }
  }, [demoMode])

  const previewMode = !demoMode && isPreviewUser(user)

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      demoMode,
      previewMode,
      async signIn(email, password) {
        if (!supabase) throw new Error('Supabase is not configured.')
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error || !data.session) throw new Error(error?.message === 'Invalid login credentials' ? 'Email or password is incorrect.' : error?.message || 'Sign in failed.')
        sessionStorage.removeItem(DEMO_KEY)
        const profile = await loadProfile(data.session.user.id, data.session.user.email ?? email)
        setApiToken(data.session.access_token)
        setUser(profile)
      },
      async signUp(input) {
        if (!supabase) throw new Error('Supabase is not configured.')
        const { data, error } = await supabase.auth.signUp({
          email: input.email,
          password: input.password,
          options: { data: { full_name: input.fullName, phone: input.phone ?? '' } },
        })
        if (error) throw new Error(error.message)
        if (!data.session || !data.user) return { needsEmailConfirmation: true }
        sessionStorage.removeItem(DEMO_KEY)
        const profile = await loadProfile(data.user.id, data.user.email ?? input.email)
        setApiToken(data.session.access_token)
        setUser(profile)
        return { needsEmailConfirmation: false }
      },
      async signOut() {
        sessionStorage.removeItem(DEMO_KEY)
        setUser(null)
        setApiToken(null)
        if (supabase) await supabase.auth.signOut()
      },
      enterDemo(role, profile) {
        const base = demoUsers[role]
        const next: SessionUser = profile && role === 'citizen'
          ? {
              ...base,
              email: profile.email.trim(),
              fullName: profile.fullName.trim(),
              phone: profile.phone?.trim() || null,
            }
          : base
        sessionStorage.setItem(DEMO_KEY, JSON.stringify(next))
        setApiToken(null)
        setUser(next)
      },
    }),
    [demoMode, loading, previewMode, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used within AuthProvider')
  return value
}
