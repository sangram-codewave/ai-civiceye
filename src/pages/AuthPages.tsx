import { zodResolver } from '@hookform/resolvers/zod'
import { Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Field } from '@/components/ui/feedback'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/contexts/AuthContext'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

const email = z.string().trim().regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Enter a valid email.')

const loginSchema = z.object({
  email,
  password: z.string().min(8, 'Use at least 8 characters.'),
})

const registerSchema = loginSchema
  .extend({
    fullName: z.string().trim().min(2, 'Enter your name.'),
    phone: z.string().trim().max(20).optional(),
    confirm: z.string(),
  })
  .refine((value) => value.password === value.confirm, { path: ['confirm'], message: 'Passwords do not match.' })

function destinationFor(role: 'citizen' | 'admin' | 'officer', next: string | null) {
  if (role === 'admin') return next?.startsWith('/admin') ? next : '/admin'
  if (role === 'citizen') return next?.startsWith('/app') ? next : '/app'
  return '/'
}

export function LoginPage() {
  useDocumentTitle('Sign in')
  const { signIn, enterDemo, demoMode, user } = useAuth()
  const [params] = useSearchParams()
  const [formError, setFormError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  if (user) return <Navigate to={destinationFor(user.role, params.get('next'))} replace />

  return (
    <div className="mx-auto grid max-w-md px-4 py-16">
      <Card>
        <CardContent className="space-y-5">
          <div>
            <h1 className="text-2xl font-bold text-navy">Sign in</h1>
            <p className="mt-1 text-sm text-slate-600">Citizens and municipal administrators use the same page. The server decides the role.</p>
          </div>
          <form
            className="space-y-4"
            onSubmit={form.handleSubmit(async (values) => {
              setFormError('')
              try {
                await signIn(values.email, values.password)
              } catch (error) {
                setFormError(error instanceof Error ? error.message : 'Sign in failed.')
              }
            })}
          >
            <Field label="Email" error={form.formState.errors.email?.message}>
              <Input type="email" autoComplete="email" {...form.register('email')} />
            </Field>
            <Field label="Password" error={form.formState.errors.password?.message}>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  className="pr-10"
                  {...form.register('password')}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-10 w-10 text-slate-500 hover:bg-transparent"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPassword((visible) => !visible)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
                </Button>
              </div>
            </Field>
            {formError ? <p className="text-sm text-red-600">{formError}</p> : null}
            <Button type="submit" className="w-full" disabled={form.formState.isSubmitting || demoMode}>
              {demoMode ? 'Sign in needs Supabase' : form.formState.isSubmitting ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>
          {demoMode ? (
            <div className="space-y-2 rounded-xl bg-amber-50 p-3">
              <p className="text-sm text-amber-900">Demo sign-in is local only. It does not create an account or save complaints.</p>
              <div className="grid gap-2 sm:grid-cols-2">
                <Button type="button" variant="outline" onClick={() => enterDemo('citizen')}>
                  Preview as citizen
                </Button>
                <Button type="button" variant="secondary" onClick={() => enterDemo('admin')}>
                  Preview as admin
                </Button>
              </div>
            </div>
          ) : null}
          <p className="text-sm text-slate-600">
            New here? <Link className="font-semibold text-blue-700" to="/register">Create a citizen account</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

export function RegisterPage() {
  useDocumentTitle('Create account')
  const { signUp, enterDemo, demoMode } = useAuth()
  const navigate = useNavigate()
  const [formError, setFormError] = useState('')
  const [notice, setNotice] = useState('')
  const form = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: { fullName: '', email: '', phone: '', password: '', confirm: '' },
  })

  return (
    <div className="mx-auto grid max-w-md px-4 py-16">
      <Card>
        <CardContent className="space-y-5">
          <div>
            <h1 className="text-2xl font-bold text-navy">Create a citizen account</h1>
            <p className="mt-1 text-sm text-slate-600">New accounts are citizens. Administrator access is granted in the database, not from this form.</p>
          </div>
          {demoMode ? (
            <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
              Supabase is not configured, so this creates a local preview only. Nothing is saved to a database.
            </p>
          ) : null}
          <form
            className="space-y-4"
            onSubmit={form.handleSubmit(async (values) => {
              setFormError('')
              setNotice('')
              try {
                if (demoMode) {
                  enterDemo('citizen', values)
                  navigate('/app')
                  return
                }
                const result = await signUp({
                  fullName: values.fullName,
                  email: values.email,
                  phone: values.phone,
                  password: values.password,
                })
                if (result.needsEmailConfirmation) {
                  setNotice('Check your email to confirm the account, then sign in.')
                  return
                }
                navigate('/app')
              } catch (error) {
                setFormError(error instanceof Error ? error.message : 'Registration failed.')
              }
            })}
          >
            <Field label="Full name" error={form.formState.errors.fullName?.message}>
              <Input autoComplete="name" {...form.register('fullName')} />
            </Field>
            <Field label="Email" error={form.formState.errors.email?.message}>
              <Input type="email" autoComplete="email" {...form.register('email')} />
            </Field>
            <Field label="Phone (optional)" error={form.formState.errors.phone?.message}>
              <Input autoComplete="tel" {...form.register('phone')} />
            </Field>
            <Field label="Password" error={form.formState.errors.password?.message}>
              <Input type="password" autoComplete="new-password" {...form.register('password')} />
            </Field>
            <Field label="Confirm password" error={form.formState.errors.confirm?.message}>
              <Input type="password" autoComplete="new-password" {...form.register('confirm')} />
            </Field>
            {formError ? <p className="text-sm text-red-600">{formError}</p> : null}
            {notice ? <p className="text-sm text-emerald-700">{notice}</p> : null}
            <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Creating account…' : 'Create account'}
            </Button>
          </form>
          <p className="text-sm text-slate-600">
            Already registered? <Link className="font-semibold text-blue-700" to="/login">Sign in</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
