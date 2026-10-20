import { useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { KeyRound, LogIn, PartyPopper } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from '../../../components/ui/Button'
import { Card, CardHeader } from '../../../components/ui/Card'
import { fieldInputClass, fieldLabelClass } from '../../../components/ui/fieldStyles'
import { StateBlock } from '../../../components/ui/StateBlock'
import { SupervisorLogo } from '../../../components/ui/SupervisorLogo'
import { useNotifications } from '../../../hooks/useNotifications'
import { ApiError } from '../../../lib/api'
import { useAuth } from '../../auth/hooks/useAuth'
import { useOrganization } from '../../organizations/hooks/useOrganization'
import { getRoleDashboardPath } from '../../organizations/utils/roleRedirect'
import { useInvitationFlow } from '../hooks/useInvitationFlow'
import { InvitationStatusState } from './InvitationStatusState'
import { InvitationSummaryCard } from './InvitationSummaryCard'
import { WrongAccountState } from './WrongAccountState'
import { buildAuthPathWithReturnTo, buildInvitationAcceptPath } from '../utils/invitationNavigation'

const primaryLinkClass =
  'inline-flex min-h-11 items-center justify-center rounded-control bg-primary-600 px-4 text-sm font-semibold text-text-on-primary no-underline hover:bg-primary-700'

function StepIcon({ children }: { children: ReactNode }) {
  return (
    <span aria-hidden="true" className="inline-flex size-8 items-center justify-center rounded-pill bg-primary-100 text-primary-600">
      {children}
    </span>
  )
}

export function InvitationAcceptancePage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const notifications = useNotifications()
  const { isAuthenticated, logout, refreshAuth, registerInvitation, user } = useAuth()
  const { clearOrganization, refreshOrganizations, selectOrganization } = useOrganization()
  const token = searchParams.get('token')
  const returnTo = useMemo(() => (token ? buildInvitationAcceptPath(token) : null), [token])
  const loginPath = buildAuthPathWithReturnTo('/login', returnTo)
  const statusFocusRef = useRef<HTMLDivElement | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isRegistering, setIsRegistering] = useState(false)
  const { accept, error, invitation, isAccepting, isLoading, reload } = useInvitationFlow(token)

  useEffect(() => {
    if (!isLoading) statusFocusRef.current?.focus()
  }, [actionError, error, invitation, isLoading])

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
      notifications.success({ message: 'Your organization membership is now active.', title: 'Invitation accepted' })
      navigate(getRoleDashboardPath(activeOrganization.membership.role), { replace: true })
    } catch (caughtError) {
      setActionError(caughtError instanceof Error ? caughtError.message : 'Unable to accept this invitation.')
      if (caughtError instanceof ApiError && (caughtError.statusCode === 409 || caughtError.statusCode === 410)) void reload().catch(() => undefined)
    }
  }

  async function handleRegisterInvitation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!token || !invitation) return
    if (password.length < 8) return setActionError('Password must be at least 8 characters.')
    if (password !== confirmPassword) return setActionError('Passwords must match before you continue.')

    setActionError(null)
    setIsRegistering(true)
    try {
      await registerInvitation(token, password)
      await refreshAuth()
      const activeOrganization = await activateOrganization(invitation.organization.id)
      notifications.success({ message: 'Your account and organization membership are ready.', title: 'Welcome to Supervisor AI' })
      navigate(getRoleDashboardPath(activeOrganization.membership.role), { replace: true })
    } catch (caughtError) {
      setActionError(caughtError instanceof Error ? caughtError.message : 'Unable to create your account.')
    } finally {
      setIsRegistering(false)
    }
  }

  function handleRetry() { setActionError(null); void reload().catch(() => undefined) }
  function handleLogoutToInvitedEmail() { logout({ redirectTo: loginPath }) }
  const isInvalidInvitation = error instanceof ApiError ? error.statusCode === 404 : !token && error instanceof Error
  const isRecoverableError = error instanceof ApiError ? error.statusCode !== 404 : error !== null && token !== null

  const isPending = invitation?.status === 'pending'

  return (
    <main className="min-h-screen bg-surface-canvas px-4 py-8 text-text-primary sm:px-6">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <Link aria-label="Supervisor AI home" to="/"><SupervisorLogo /></Link>
          {!isAuthenticated ? (
            <span className="body text-text-secondary">
              Already have an account? <Link className="font-semibold text-text-link" to={loginPath}>Sign in</Link>
            </span>
          ) : null}
        </header>

        <div className="flex flex-col gap-6 outline-none" ref={statusFocusRef} tabIndex={-1}>
          {isLoading ? <Card><StateBlock kind="loading" title="Loading invitation details" /></Card> : null}

          {!isLoading && actionError ? (
            <Card padding="sm">
              <StateBlock
                action={<Button onClick={handleRetry} variant="secondary">Try again</Button>}
                compact
                kind="error"
                title="Unable to complete invitation acceptance"
              >
                {actionError}
              </StateBlock>
            </Card>
          ) : null}

          {!isLoading && !token ? <div className="mx-auto w-full max-w-xl"><InvitationStatusState returnTo={null} status="invalid" /></div> : null}
          {!isLoading && token && isInvalidInvitation ? (
            <div className="mx-auto w-full max-w-xl"><InvitationStatusState onRetry={handleRetry} returnTo={returnTo} status="invalid" /></div>
          ) : null}
          {!isLoading && token && isRecoverableError ? (
            <Card className="mx-auto w-full max-w-xl">
              <StateBlock action={<Button onClick={handleRetry} variant="secondary">Try again</Button>} kind="error" title="Invitation details could not be loaded">
                {error?.message ?? 'Unable to load invitation details.'}
              </StateBlock>
            </Card>
          ) : null}

          {!isLoading && invitation ? (
            <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
              <InvitationSummaryCard invitation={invitation} />

              <div className="flex flex-col gap-6">
                {!isPending ? <InvitationStatusState returnTo={returnTo} status={invitation.status} /> : null}

                {isPending && !isAuthenticated && !invitation.account_exists ? (
                  <Card aria-labelledby="create-account-title" className="flex flex-col gap-5">
                    <CardHeader
                      helper="Your invitation details are applied automatically."
                      icon={<StepIcon><KeyRound size={16} /></StepIcon>}
                      id="create-account-title"
                      title={`Create an account to join ${invitation.organization.name}`}
                    />
                    <form className="flex flex-col gap-4" onSubmit={handleRegisterInvitation}>
                      <label className={fieldLabelClass}>
                        Invited email
                        <input className={fieldInputClass} readOnly type="email" value={invitation.invited_email} />
                      </label>
                      <label className={fieldLabelClass}>
                        Password
                        <input autoComplete="new-password" className={fieldInputClass} minLength={8} onChange={(event) => setPassword(event.target.value)} required type="password" value={password} />
                        <span className="helper text-text-tertiary">At least 8 characters.</span>
                      </label>
                      <label className={fieldLabelClass}>
                        Confirm password
                        <input autoComplete="new-password" className={fieldInputClass} minLength={8} onChange={(event) => setConfirmPassword(event.target.value)} required type="password" value={confirmPassword} />
                      </label>
                      <Button className="min-h-11" disabled={isRegistering} type="submit">
                        {isRegistering ? 'Creating account…' : 'Create account & join organization'}
                      </Button>
                    </form>
                  </Card>
                ) : null}

                {isPending && !isAuthenticated && invitation.account_exists ? (
                  <Card aria-labelledby="sign-in-title" className="flex flex-col gap-5">
                    <CardHeader
                      helper="You already have a Supervisor AI account for this email."
                      icon={<StepIcon><LogIn size={16} /></StepIcon>}
                      id="sign-in-title"
                      title="Sign in to accept this invitation"
                    />
                    <Link className={primaryLinkClass} to={loginPath}>Sign in to accept</Link>
                  </Card>
                ) : null}

                {isPending && isAuthenticated && invitation.current_user_email_matches === false ? (
                  <WrongAccountState
                    currentEmail={user?.email ?? null}
                    loginPath={loginPath}
                    logoutToInvitedEmail={handleLogoutToInvitedEmail}
                    maskedInvitedEmail={invitation.invited_email_masked}
                  />
                ) : null}

                {isPending && isAuthenticated && invitation.current_user_email_matches === true ? (
                  <Card aria-labelledby="ready-title" className="flex flex-col gap-5">
                    <CardHeader
                      helper="Accepting activates your membership and opens the workspace."
                      icon={<StepIcon><PartyPopper size={16} /></StepIcon>}
                      id="ready-title"
                      title="Ready to join"
                    />
                    <Button className="min-h-11" disabled={isAccepting} onClick={() => { void handleAcceptInvitation() }}>
                      {isAccepting ? 'Accepting…' : 'Accept invitation'}
                    </Button>
                  </Card>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </main>
  )
}
