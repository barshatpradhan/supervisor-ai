import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { z } from 'zod'
import { ErrorState } from '../../../components/shared/ErrorState'
import { LoadingState } from '../../../components/shared/LoadingState'
import { Button } from '../../../components/ui/Button'
import { Card } from '../../../components/ui/Card'
import { SupervisorLogo } from '../../../components/ui/SupervisorLogo'
import { useNotifications } from '../../../hooks/useNotifications'
import { ApiError } from '../../../lib/api'
import { useAuth } from '../../auth/hooks/useAuth'
import { useOrganization } from '../../organizations/hooks/useOrganization'
import { getRoleDashboardPath } from '../../organizations/utils/roleRedirect'
import { useInvitationFlow } from '../hooks/useInvitationFlow'
import { InvitationActions } from './InvitationActions'
import { InvitationStatusState } from './InvitationStatusState'
import { InvitationSummaryCard } from './InvitationSummaryCard'
import { WrongAccountState } from './WrongAccountState'
import { buildAuthPathWithReturnTo, buildInvitationAcceptPath } from '../utils/invitationNavigation'

const inputClassName = 'min-h-11 rounded-md border border-border-subtle bg-surface-card px-3 text-sm text-ink-900 outline-none transition focus:border-primary-600 focus:ring-3 focus:ring-primary-200'

const invitationRegistrationSchema = z
  .object({
    password: z.string().min(8, 'Password must be at least 8 characters.').max(72),
    confirmPassword: z.string(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords must match before you continue.',
  })

type InvitationRegistrationValues = z.infer<typeof invitationRegistrationSchema>

export function InvitationAcceptancePage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const notifications = useNotifications()
  const queryClient = useQueryClient()
  const { isAuthenticated, logout, refreshAuth, registerInvitation, user } = useAuth()
  const { clearOrganization, refreshOrganizations, selectOrganization } = useOrganization()
  const token = searchParams.get('token')
  const returnTo = useMemo(() => (token ? buildInvitationAcceptPath(token) : null), [token])
  const loginPath = buildAuthPathWithReturnTo('/login', returnTo)
  const statusFocusRef = useRef<HTMLDivElement | null>(null)
  const previousAuthenticationRef = useRef(isAuthenticated)
  const [actionError, setActionError] = useState<string | null>(null)
  const { accept, error, invitation, isAccepting, isLoading, reload } = useInvitationFlow(token)
  const {
    handleSubmit,
    register: registerField,
    formState: { errors: registrationErrors, isSubmitting: isRegistering },
  } = useForm<InvitationRegistrationValues>({
    defaultValues: { password: '', confirmPassword: '' },
    mode: 'onBlur',
    resolver: zodResolver(invitationRegistrationSchema),
  })

  useEffect(() => {
    if (!isLoading) statusFocusRef.current?.focus()
  }, [actionError, error, invitation, isLoading])

  useEffect(() => {
    const wasAuthenticated = previousAuthenticationRef.current
    previousAuthenticationRef.current = isAuthenticated

    if (wasAuthenticated && !isAuthenticated && token) {
      void reload().catch(() => undefined)
    }
  }, [isAuthenticated, reload, token])

  async function activateOrganization(organizationId: string) {
    clearOrganization()
    const organizations = await refreshOrganizations()
    const activatedOrganization = organizations.find(
      (entry) => entry.organization.id === organizationId && entry.membership.status === 'active',
    )
    if (!activatedOrganization) throw new Error('The organization membership could not be activated locally.')
    selectOrganization(activatedOrganization.organization.id)
    return activatedOrganization
  }

  async function handleAcceptInvitation() {
    setActionError(null)
    try {
      const acceptedInvitation = await accept()
      const activeOrganization = await activateOrganization(acceptedInvitation.organization.id)
      await queryClient.invalidateQueries()
      notifications.success({ message: 'Your organization membership is now active.', title: 'Invitation accepted' })
      navigate(getRoleDashboardPath(activeOrganization.membership.role), { replace: true })
    } catch (caughtError) {
      setActionError(caughtError instanceof Error ? caughtError.message : 'Unable to accept this invitation.')
      if (caughtError instanceof ApiError && (caughtError.statusCode === 409 || caughtError.statusCode === 410)) void reload().catch(() => undefined)
    }
  }

  async function handleRegisterInvitation({ password }: InvitationRegistrationValues) {
    if (!token || !invitation) return

    setActionError(null)
    try {
      await registerInvitation(token, password)
      await refreshAuth()
      const activeOrganization = await activateOrganization(invitation.organization.id)
      await queryClient.invalidateQueries()
      notifications.success({ message: 'Your account and organization membership are ready.', title: 'Welcome to Supervisor AI' })
      navigate(getRoleDashboardPath(activeOrganization.membership.role), { replace: true })
    } catch (caughtError) {
      setActionError(caughtError instanceof Error ? caughtError.message : 'Unable to create your account.')
      if (caughtError instanceof ApiError && caughtError.statusCode === 409) void reload().catch(() => undefined)
    }
  }

  function handleRetry() { setActionError(null); void reload().catch(() => undefined) }
  function handleLogoutToInvitedEmail() { logout({ redirectTo: returnTo ?? '/invitations/accept' }) }
  const isInvalidInvitation = error instanceof ApiError ? error.statusCode === 404 : !token && error instanceof Error
  const isRecoverableError = error instanceof ApiError ? error.statusCode !== 404 : error !== null && token !== null

  return <main className="min-h-screen bg-surface-page px-4 py-8 text-ink-900 sm:px-6">
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-4xl flex-col justify-center gap-8">
      <div className="max-w-sm"><SupervisorLogo /></div>
      <div className="grid gap-6" ref={statusFocusRef} tabIndex={-1}>
        {isLoading ? <LoadingState label="Loading invitation details..." /> : null}
        {!isLoading && actionError ? <ErrorState message={actionError} onRetry={handleRetry} title="Unable to complete invitation acceptance" /> : null}
        {!isLoading && !token ? <InvitationStatusState returnTo={null} status="invalid" /> : null}
        {!isLoading && token && isInvalidInvitation ? <InvitationStatusState onRetry={handleRetry} returnTo={returnTo} status="invalid" /> : null}
        {!isLoading && token && isRecoverableError ? <ErrorState message={error?.message ?? 'Unable to load invitation details.'} onRetry={handleRetry} title="Invitation details could not be loaded" /> : null}
        {!isLoading && invitation ? <>
          <InvitationSummaryCard invitation={invitation} />
          {invitation.status !== 'pending' ? <InvitationStatusState returnTo={returnTo} status={invitation.status} /> : null}
          {invitation.status === 'pending' && !isAuthenticated && !invitation.account_exists ? <Card className="grid gap-5">
            <div><p className="text-xs font-semibold uppercase tracking-normal text-primary-700">Create your account</p><h2 className="mt-2 text-2xl font-bold text-ink-900">Create an account to join {invitation.organization.name}</h2><p className="mt-2 text-sm leading-6 text-ink-600">Your invitation details will be applied automatically.</p></div>
            <form className="grid gap-4" noValidate onSubmit={handleSubmit(handleRegisterInvitation)}>
              <label className="grid gap-2 text-sm font-semibold text-ink-800">Invited email<input className={inputClassName} readOnly type="email" value={invitation.invited_email} /></label>
              <label className="grid gap-2 text-sm font-semibold text-ink-800">Password<input autoComplete="new-password" className={inputClassName} type="password" {...registerField('password')} />{registrationErrors.password ? <span className="text-sm font-normal text-danger-700">{registrationErrors.password.message}</span> : null}</label>
              <label className="grid gap-2 text-sm font-semibold text-ink-800">Confirm password<input autoComplete="new-password" className={inputClassName} type="password" {...registerField('confirmPassword')} />{registrationErrors.confirmPassword ? <span className="text-sm font-normal text-danger-700">{registrationErrors.confirmPassword.message}</span> : null}</label>
              <Button disabled={isRegistering} type="submit">{isRegistering ? 'Creating account...' : 'Create Account & Join Organization'}</Button>
            </form>
          </Card> : null}
          {invitation.status === 'pending' && !isAuthenticated && invitation.account_exists ? <Card className="grid gap-5">
            <div><p className="text-xs font-semibold uppercase tracking-normal text-primary-700">Account found</p><h2 className="mt-2 text-2xl font-bold text-ink-900">Sign in to accept this invitation</h2><p className="mt-2 text-sm leading-6 text-ink-600">You already have a Supervisor AI account for this email.</p></div>
            <Link className="inline-flex min-h-10 items-center justify-center rounded-md bg-primary-600 px-4 py-2 text-sm font-semibold text-[var(--text-on-primary)] shadow-sm transition hover:bg-primary-700" to={loginPath}>Sign In to Accept</Link>
          </Card> : null}
          {invitation.status === 'pending' && isAuthenticated && invitation.current_user_email_matches === false ? <WrongAccountState currentEmail={user?.email ?? null} loginPath={loginPath} logoutToInvitedEmail={handleLogoutToInvitedEmail} maskedInvitedEmail={invitation.invited_email_masked} /> : null}
          {invitation.status === 'pending' && isAuthenticated && invitation.current_user_email_matches === true ? <Card className="grid gap-5"><div><p className="text-xs font-semibold uppercase tracking-normal text-primary-700">Ready to join</p><h2 className="mt-2 text-2xl font-bold text-ink-900">Accept this organization invitation</h2><p className="mt-2 text-sm leading-6 text-ink-600">Accepting activates your membership and opens the correct workspace.</p></div><InvitationActions isAccepting={isAccepting} loginPath={loginPath} onAccept={() => { void handleAcceptInvitation() }} registerPath="/signup" showAcceptAction /></Card> : null}
        </> : null}
      </div>
    </div>
  </main>
}
