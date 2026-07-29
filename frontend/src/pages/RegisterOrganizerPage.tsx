import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { cloneElement } from 'react'
import type { ReactElement } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { ErrorState } from '../components/shared/ErrorState'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { SupervisorLogo } from '../components/ui/SupervisorLogo'
import { useAuth } from '../features/auth/hooks/useAuth'
import { useOrganization } from '../features/organizations/hooks/useOrganization'
import { createOrganization } from '../features/organizations/services/organizationService'

const schema = z.object({
  email: z.string().trim().email('Enter a valid work email.').max(320),
  password: z.string().min(8, 'Password must be at least 8 characters.').max(72),
  confirmPassword: z.string(),
  organizationName: z.string().trim().min(1, 'Organization name is required.').max(120, 'Organization name is too long.'),
}).refine((values) => values.password === values.confirmPassword, { path: ['confirmPassword'], message: 'Passwords must match.' })
type FormValues = z.infer<typeof schema>

function slugify(value: string) { return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80) }

export function RegisterOrganizerPage() {
  const { isAuthenticated, isLoading, register } = useAuth()
  const { refreshOrganizations, selectOrganization } = useOrganization()
  const navigate = useNavigate()
  const [serverError, setServerError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const { register: field, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({ resolver: zodResolver(schema), mode: 'onBlur', defaultValues: { email: '', password: '', confirmPassword: '', organizationName: '' } })

  if (!isLoading && isAuthenticated) return <main className="grid min-h-screen place-items-center bg-surface-page px-4"><Card className="max-w-md p-8 text-center"><h1 className="text-2xl font-bold">You are already signed in</h1><p className="mt-3 text-sm text-ink-600">Use your current session to continue to the workspace.</p><Link className="mt-6 inline-flex min-h-10 items-center rounded-md bg-primary-600 px-4 py-2 text-sm font-semibold text-white" to="/dashboard">Go to dashboard</Link></Card></main>

  async function onSubmit(values: FormValues) {
    setServerError(null)
    try {
      await register({ email: values.email.trim().toLowerCase(), password: values.password })
      const created = await createOrganization({ name: values.organizationName.trim(), slug: slugify(values.organizationName) })
      selectOrganization(created.organization.id)
      await refreshOrganizations()
      setSuccess(true)
      navigate('/dashboard', { replace: true })
    } catch (error) { setServerError(error instanceof Error ? error.message : 'Unable to create your organization.') }
  }

  return <main className="min-h-screen bg-surface-page px-4 py-8 text-ink-900 sm:px-6"><div className="mx-auto w-full max-w-lg"><Link aria-label="Supervisor AI home" to="/"><SupervisorLogo /></Link><Card className="mt-8 p-6 sm:p-8"><p className="text-sm font-bold uppercase tracking-[.14em] text-primary-700">Get started</p><h1 className="mt-3 text-3xl font-bold">Create an organization administrator account</h1><p className="mt-3 text-sm leading-6 text-ink-600">Create your account first, then we’ll create your organization workspace and make you its administrator.</p>{serverError ? <div className="mt-5"><ErrorState message={serverError} title="Registration failed" /></div> : null}{success ? <p aria-live="polite" className="mt-5 rounded-md bg-primary-50 p-3 text-sm text-primary-800">Your organization is ready. Opening your workspace…</p> : null}<form className="mt-7 grid gap-4" noValidate onSubmit={handleSubmit(onSubmit)}><Field label="Work email" error={errors.email?.message}><input autoComplete="email" type="email" {...field('email')} /></Field><Field label="Organization name" error={errors.organizationName?.message}><input autoComplete="organization" {...field('organizationName')} /></Field><Field label="Password" error={errors.password?.message}><input autoComplete="new-password" type="password" {...field('password')} /></Field><Field label="Confirm password" error={errors.confirmPassword?.message}><input autoComplete="new-password" type="password" {...field('confirmPassword')} /></Field><Button className="mt-2 w-full" disabled={isSubmitting || success} type="submit">{isSubmitting ? 'Creating your workspace…' : 'Create organization'}</Button></form></Card><p className="mt-5 text-center text-sm text-ink-600">Already have an account? <Link className="font-semibold text-primary-700 hover:underline" to="/login">Sign in</Link></p></div></main>
}

function Field({ label, error, children }: { label: string; error?: string; children: ReactElement<{ id?: string; 'aria-describedby'?: string; className?: string }> }) { const id = label.toLowerCase().replaceAll(' ', '-'); return <label className="grid gap-2 text-sm font-semibold" htmlFor={id}>{label}{cloneElement(children, { id, 'aria-describedby': error ? `${id}-error` : undefined, className: 'min-h-11 rounded-md border border-border-subtle bg-surface-card px-3 text-sm font-normal outline-none focus:border-primary-600 focus:ring-3 focus:ring-primary-200' })}{error ? <span className="text-sm font-normal text-danger-700" id={`${id}-error`}>{error}</span> : null}</label> }
