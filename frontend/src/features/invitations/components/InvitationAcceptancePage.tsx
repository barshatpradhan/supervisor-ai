import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ErrorState } from '../../../components/shared/ErrorState'
import { LoadingState } from '../../../components/shared/LoadingState'
import { Card } from '../../../components/ui/Card'
import { SupervisorLogo } from '../../../components/ui/SupervisorLogo'
import { useNotifications } from '../../../hooks/useNotifications'
import { useAuth } from '../../auth/hooks/useAuth'
import { useOrganization } from '../../organizations/hooks/useOrganization'
import { InvitationActions } from './InvitationActions'
import { InvitationStatusState } from './InvitationStatusState'
import { InvitationSummaryCard } from './InvitationSummaryCard'
import { WrongAccountState } from './WrongAccountState'
import { useInvitationFlow } from '../hooks/useInvitationFlow'
import { ApiError } from '../../../lib/api'
import {
  buildAuthPathWithReturnTo,
  buildInvitationAcceptPath,
} from '../utils/invitationNavigation'
import { Button } from '../../../components/ui/Button'

export function InvitationAcceptancePage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const notifications = useNotifications()
  const { isAuthenticated, logout, user } = useAuth()
  const { clearOrganization, refreshOrganizations, selectOrganization } = useOrganization()
  const token = searchParams.get('token')
  const returnTo = useMemo(() => (token ? buildInvitationAcceptPath(token) : null), [token])
  const loginPath = buildAuthPathWithReturnTo('/login', returnTo)
  const registerPath = buildAuthPathWithReturnTo('/signup', returnTo)
  const statusFocusRef = useRef<HTMLDivElement | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const {
    accept,
    error,
    invitation,
    isAccepting,
    isLoading,
    reload,
  } = useInvitationFlow(token)

  useEffect(() => {
    if (!isLoading) {
      statusFocusRef.current?.focus()
    }
  }, [actionError, error, invitation, isLoading])

  async function handleAcceptInvitation() {
    setActionError(null)

    try {
      const acceptedInvitation = await accept()
      clearOrganization()
      const organizations = await refreshOrganizations()
      const activatedOrganization = organizations.find(
        (entry) =>
          entry.organization.id === acceptedInvitation.organization.id &&
          entry.membership.status === 'active',
      )

      if (!activatedOrganization) {
        throw new Error('The accepted organization membership could not be activated locally.')
      }

      selectOrganization(activatedOrganization.organization.id)
      notifications.success({
        message: 'Your organization membership is now active.',
        title: 'Invitation accepted',
      })
      navigate('/dashboard', { replace: true })
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : 'Unable to accept this invitation.'

      setActionError(message)

      if (caughtError instanceof ApiError && (caughtError.statusCode === 409 || caughtError.statusCode === 410)) {
        void reload().catch(() => undefined)
      }
    }
  }

  function handleRetry() {
    setActionError(null)
    void reload().catch(() => undefined)
  }

  function handleLogoutToInvitedEmail() {
    logout({ redirectTo: loginPath })
  }

  const isInvalidInvitation =
    error instanceof ApiError ? error.statusCode === 404 : !token && error instanceof Error
  const isRecoverableError =
    error instanceof ApiError
      ? error.statusCode !== 404
      : error !== null && token !== null

  return (
    <main className="min-h-screen bg-surface-page px-4 py-8 text-ink-900 sm:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-4xl flex-col justify-center gap-8">
        <div className="max-w-sm">
          <SupervisorLogo />
        </div>

        <div className="grid gap-6" ref={statusFocusRef} tabIndex={-1}>
          {isLoading ? <LoadingState label="Loading invitation details..." /> : null}

          {!isLoading && actionError ? (
            <ErrorState
              message={actionError}
              onRetry={handleRetry}
              title="Unable to complete invitation acceptance"
            />
          ) : null}

          {!isLoading && !token ? (
            <InvitationStatusState returnTo={null} status="invalid" />
          ) : null}

          {!isLoading && token && isInvalidInvitation ? (
            <InvitationStatusState onRetry={handleRetry} returnTo={returnTo} status="invalid" />
          ) : null}

          {!isLoading && token && isRecoverableError ? (
            <ErrorState
              message={error?.message ?? 'Unable to load invitation details.'}
              onRetry={handleRetry}
              title="Invitation details could not be loaded"
            />
          ) : null}

          {!isLoading && invitation ? (
            <>
              <InvitationSummaryCard invitation={invitation} />

              {invitation.status !== 'pending' ? (
                <InvitationStatusState returnTo={returnTo} status={invitation.status} />
              ) : null}

              {invitation.status === 'pending' && !isAuthenticated ? (
                <Card className="grid gap-5">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-normal text-primary-700">
                      Authentication required
                    </p>
                    <h2 className="mt-2 text-2xl font-bold text-ink-900">
                      Sign in or create an account to continue
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-ink-600">
                      Use the invited email to sign in or create an account identity, then return
                      here to accept the organization invitation.
                    </p>
                  </div>

                  <InvitationActions
                    loginPath={loginPath}
                    registerPath={registerPath}
                    showAuthActions
                  />
                </Card>
              ) : null}

              {invitation.status === 'pending' &&
              isAuthenticated &&
              invitation.current_user_email_matches === false ? (
                <WrongAccountState
                  currentEmail={user?.email ?? null}
                  loginPath={loginPath}
                  logoutToInvitedEmail={handleLogoutToInvitedEmail}
                  maskedInvitedEmail={invitation.invited_email_masked}
                />
              ) : null}

              {invitation.status === 'pending' &&
              isAuthenticated &&
              invitation.current_user_email_matches === true ? (
                <Card className="grid gap-5">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-normal text-primary-700">
                      Ready to join
                    </p>
                    <h2 className="mt-2 text-2xl font-bold text-ink-900">
                      Accept this organization invitation
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-ink-600">
                      Accepting this invitation activates your membership and sends you into the
                      correct organization workspace using your verified membership role.
                    </p>
                  </div>

                  <InvitationActions
                    isAccepting={isAccepting}
                    loginPath={loginPath}
                    onAccept={() => {
                      void handleAcceptInvitation()
                    }}
                    registerPath={registerPath}
                    showAcceptAction
                  />
                </Card>
              ) : null}
            </>
          ) : null}

          <div className="flex flex-wrap items-center gap-3 text-sm text-ink-600">
            <Link
              className="font-semibold text-primary-600 underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-primary-300"
              to={loginPath}
            >
              Sign in
            </Link>
            <span aria-hidden="true">·</span>
            <Link
              className="font-semibold text-primary-600 underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-primary-300"
              to={registerPath}
            >
              Create account
            </Link>
            {isAuthenticated ? (
              <>
                <span aria-hidden="true">·</span>
                <Button onClick={handleLogoutToInvitedEmail} type="button" variant="ghost">
                  Sign out
                </Button>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </main>
  )
}
