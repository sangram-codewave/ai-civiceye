import * as Dialog from '@radix-ui/react-dialog'
import { ChartColumn, LayoutDashboard, List, LogOut, Map, Menu, Plus, X } from 'lucide-react'
import { useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { ServiceBanner } from '@/components/ServiceBanner'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/lib/utils'

const citizenNav = [
  { to: '/app', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/app/complaints/new', label: 'Report an issue', icon: Plus, end: false },
  { to: '/app/complaints', label: 'My complaints', icon: List, end: false },
]

const adminNav = [
  { to: '/admin', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/admin/complaints', label: 'Complaints', icon: List, end: false },
  { to: '/admin/map', label: 'Map', icon: Map, end: false },
  { to: '/admin/analytics', label: 'Analytics', icon: ChartColumn, end: false },
]

function isItemActive(to: string, pathname: string, end: boolean) {
  if (to === '/app/complaints') {
    return pathname === '/app/complaints' || /^\/app\/complaints\/(?!new$).+/.test(pathname)
  }
  if (end) return pathname === to
  return pathname === to || pathname.startsWith(`${to}/`)
}

function NavItems({ items, onNavigate }: { items: typeof citizenNav; onNavigate?: () => void }) {
  const { pathname } = useLocation()
  return (
    <nav className="space-y-1">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          onClick={onNavigate}
          className={cn(
            'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-200 hover:bg-white/10',
            isItemActive(item.to, pathname, item.end) && 'bg-white/15 text-white',
          )}
        >
          <item.icon className="h-4 w-4" aria-hidden="true" />
          {item.label}
        </NavLink>
      ))}
    </nav>
  )
}

export function AppShell({ variant }: { variant: 'citizen' | 'admin' }) {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const items = variant === 'admin' ? adminNav : citizenNav

  async function logout() {
    await signOut()
    navigate('/')
  }

  const sidebar = (
    <div className="flex h-full flex-col bg-navy px-4 py-5 text-white">
      <NavLink to="/" className="px-2 text-lg font-extrabold tracking-tight">
        AI CivicEye
      </NavLink>
      <p className="mt-1 px-2 text-xs text-slate-300">{variant === 'admin' ? 'Municipal desk' : 'Citizen portal'}</p>
      <div className="mt-8 flex-1">
        <NavItems items={items} onNavigate={() => setOpen(false)} />
      </div>
      <div className="border-t border-white/10 pt-4">
        <p className="truncate px-2 text-sm font-semibold">{user?.fullName}</p>
        <p className="truncate px-2 text-xs text-slate-300">{user?.email}</p>
        <button type="button" onClick={() => void logout()} className="mt-3 flex w-full items-center gap-2 rounded-xl px-2 py-2 text-sm text-slate-200 hover:bg-white/10">
          <LogOut className="h-4 w-4" aria-hidden="true" />
          Sign out
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="hidden lg:block">{sidebar}</aside>
      <div className="min-w-0">
        <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
          <p className="font-extrabold text-navy">AI CivicEye</p>
          <Dialog.Root open={open} onOpenChange={setOpen}>
            <Dialog.Trigger asChild>
              <Button type="button" variant="outline" size="icon" aria-label="Open menu">
                <Menu className="h-4 w-4" />
              </Button>
            </Dialog.Trigger>
            <Dialog.Portal>
              <Dialog.Overlay className="fixed inset-0 z-40 bg-slate-900/40" />
              <Dialog.Content className="fixed inset-y-0 left-0 z-50 w-72 outline-none">
                <Dialog.Title className="sr-only">Navigation</Dialog.Title>
                <button type="button" className="absolute right-3 top-3 z-10 text-white" onClick={() => setOpen(false)} aria-label="Close menu">
                  <X className="h-5 w-5" />
                </button>
                {sidebar}
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        </div>
        <ServiceBanner />
        <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
