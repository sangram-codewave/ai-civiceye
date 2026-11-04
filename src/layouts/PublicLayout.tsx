import { Link, Navigate, Outlet, useLocation } from 'react-router-dom'
import { ServiceBanner } from '@/components/ServiceBanner'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/AuthContext'

export function PublicLayout() {
  const { user } = useAuth()
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <Link to="/" className="text-lg font-extrabold tracking-tight text-navy">
            AI CivicEye
          </Link>
          <div className="flex items-center gap-2">
            {user ? (
              <Button asChild>
                <Link to={user.role === 'admin' ? '/admin' : '/app'}>Open dashboard</Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost">
                  <Link to="/login">Sign in</Link>
                </Button>
                <Button asChild>
                  <Link to="/login">Report an issue</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>
      <ServiceBanner />
      <Outlet />
    </div>
  )
}

export function RequireAuth({ role }: { role: 'citizen' | 'admin' }) {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) {
    return <div className="grid min-h-screen place-items-center text-sm text-slate-500">Loading your session…</div>
  }
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(location.pathname)}`} replace />
  if (user.role === 'officer') {
    return (
      <div className="mx-auto max-w-lg px-6 py-20 text-center">
        <h1 className="text-2xl font-bold text-navy">Officer account</h1>
        <p className="mt-3 text-slate-600">
          Officer accounts are used for assignment records. Sign in as a municipal administrator to manage complaints.
        </p>
      </div>
    )
  }
  if (role === 'admin' && user.role !== 'admin') return <Navigate to="/app" replace />
  if (role === 'citizen' && user.role === 'admin') return <Navigate to="/admin" replace />
  return <Outlet />
}
