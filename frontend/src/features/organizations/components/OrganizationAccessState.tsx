import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { ErrorState } from '../../../components/shared/ErrorState'
import { EmptyState } from '../../../components/shared/EmptyState'
import { Button } from '../../../components/ui/Button'
import { Card } from '../../../components/ui/Card'
import { useNotifications } from '../../../hooks/useNotifications'
import { acceptOrganizationInvitation, createOrganization } from '../services/organizationService'
import type { CurrentUserOrganizationListItem } from '../types/organization'
import {
  formatOrganizationRole,
  getActiveOrganizations,
  getInvitedOrganizations,
  getSuspendedOrganizations,
  slugifyOrganizationName,
} from '../utils/organizationPresentation'

const inputClassName =
  'min-h-11 rounded-md border border-border-subtle bg-surface-card px-3 text-sm text-ink-900 outline-none transition placeholder:text-ink-400 focus:border-primary-600 focus:ring-3 focus:ring-primary-200'

interface OrganizationAccessStateProps {
  activeOrganizationId: string | null
  organizations: CurrentUserOrganizationListItem[]
  onRefresh: () => Promise<CurrentUserOrganizationListItem[]>
  onSelectOrganization: (organizationId: string | null) => void
}

interface OrganizationCreationDraft {
  name: string
  slug: string
}

function formatDateTime(value: string | null) {
  if (!value) {
    return null
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

export function OrganizationAccessState({
  activeOrganizationId,
  organizations,
  onRefresh,
  onSelectOrganization,
}: OrganizationAccessStateProps) {
  const notifications = useNotifications()
  const [creationDraft, setCreationDraft] = useState<OrganizationCreationDraft>({
    name: '',
    slug: '',
  })
  const [didEditSlug, setDidEditSlug] = useState(false)
  const [creationError, setCreationError] = useState<string | null>(null)
  const [isCreatingOrganization, setIsCreatingOrganization] = useState(false)
  const [acceptingOrganizationId, setAcceptingOrganizationId] = useState<string | null>(null)

  const activeOrganizations = useMemo(
    () => getActiveOrganizations(organizations),
    [organizations],
  )
  const invitedOrganizations = useMemo(
    () => getInvitedOrganizations(organizations),
    [organizations],
  )
  const suspendedOrganizations = useMemo(
    () => getSuspendedOrganizations(organizations),
    [organizations],
  )
  const needsSelection = activeOrganizations.length > 1 && !activeOrganizationId

  function updateOrganizationName(value: string) {
    setCreationDraft((current) => ({
      name: value,
      slug: didEditSlug ? current.slug : slugifyOrganizationName(value),
    }))
  }

  function updateOrganizationSlug(value: string) {
    setDidEditSlug(true)
    setCreationDraft((current) => ({
      ...current,
      slug: slugifyOrganizationName(value),
    }))
  }

  async function handleCreateOrganization(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!creationDraft.name.trim() || !creationDraft.slug.trim()) {
      setCreationError('Organization name and slug are required.')
      return
    }

    setIsCreatingOrganization(true)
    setCreationError(null)

    try {
      const createdOrganization = await createOrganization({
        name: creationDraft.name.trim(),
        slug: creationDraft.slug.trim(),
      })

      onSelectOrganization(createdOrganization.organization.id)
      await onRefresh()
      notifications.success({
        message: 'Your organization is ready and has been selected for this session.',
        title: 'Organization created',
      })
      setCreationDraft({ name: '', slug: '' })
      setDidEditSlug(false)
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : 'Unable to create the organization.'

      setCreationError(message)
      notifications.error({
        message,
        title: 'Organization creation failed',
      })
    } finally {
      setIsCreatingOrganization(false)
    }
  }

  async function handleAcceptInvitation(organizationId: string) {
    setAcceptingOrganizationId(organizationId)

    try {
      await acceptOrganizationInvitation(organizationId)
      onSelectOrganization(organizationId)
      await onRefresh()
      notifications.success({
        message: 'Your membership is now active for this organization.',
        title: 'Invitation accepted',
      })
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : 'Unable to accept the invitation.'

      notifications.error({
        message,
        title: 'Invitation acceptance failed',
      })
    } finally {
      setAcceptingOrganizationId(null)
    }
  }

  return (
    <div className="grid gap-6">
      {needsSelection ? (
        <Card>
          <div className="grid gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-normal text-primary-700">
                Organization selection
              </p>
              <h2 className="mt-2 text-2xl font-bold text-ink-900">
                Choose an organization to continue
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-ink-600">
                Your account belongs to more than one active organization. Select the
                workspace you want to use for this session.
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {activeOrganizations.map((entry) => (
                <button
                  key={entry.organization.id}
                  className="rounded-lg border border-border-subtle bg-surface-card-alt p-4 text-left transition hover:border-primary-300 hover:bg-primary-50 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-primary-300"
                  onClick={() => onSelectOrganization(entry.organization.id)}
                  type="button"
                >
                  <p className="text-lg font-semibold text-ink-900">{entry.organization.name}</p>
                  <p className="mt-1 text-sm text-ink-600">
                    {formatOrganizationRole(entry.membership.role)}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </Card>
      ) : null}

      {invitedOrganizations.length > 0 ? (
        <Card>
          <div className="grid gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-normal text-warning-text">
                Invitation pending
              </p>
              <h2 className="mt-2 text-2xl font-bold text-ink-900">
                Invitations waiting for your acceptance
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-ink-600">
                Accept an invitation to activate that organization in your workspace.
              </p>
            </div>

            <div className="grid gap-3">
              {invitedOrganizations.map((entry) => (
                <div
                  key={entry.membership.id}
                  className="rounded-lg border border-warning-fg/30 bg-warning-bg/50 p-4"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-lg font-semibold text-ink-900">
                        {entry.organization.name}
                      </p>
                      <p className="mt-1 text-sm text-ink-700">
                        {formatOrganizationRole(entry.membership.role)}
                        {entry.invitation?.expires_at
                          ? ` · Expires ${formatDateTime(entry.invitation.expires_at)}`
                          : ''}
                      </p>
                    </div>
                    <Button
                      disabled={acceptingOrganizationId === entry.organization.id}
                      onClick={() => {
                        void handleAcceptInvitation(entry.organization.id)
                      }}
                    >
                      {acceptingOrganizationId === entry.organization.id
                        ? 'Accepting...'
                        : 'Accept invitation'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      ) : null}

      {suspendedOrganizations.length > 0 ? (
        <Card>
          <div className="grid gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-normal text-danger-700">
                Membership suspended
              </p>
              <h2 className="mt-2 text-2xl font-bold text-ink-900">
                Some organizations are not currently available
              </h2>
            </div>
            <div className="grid gap-3">
              {suspendedOrganizations.map((entry) => (
                <div
                  key={entry.membership.id}
                  className="rounded-lg border border-danger-100 bg-danger-50 p-4"
                >
                  <p className="text-lg font-semibold text-ink-900">{entry.organization.name}</p>
                  <p className="mt-1 text-sm text-danger-700">
                    {formatOrganizationRole(entry.membership.role)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </Card>
      ) : null}

      {!needsSelection && activeOrganizations.length === 0 && organizations.length > 0 ? (
        <EmptyState
          description="This account does not currently have an active organization membership. Accept an invitation, create a new organization if eligible, or contact an organization administrator."
          title="No active organization access"
        />
      ) : null}

      {activeOrganizations.length === 0 ? (
        <Card>
          <div className="grid gap-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-normal text-primary-700">
                Create organization
              </p>
              <h2 className="mt-2 text-2xl font-bold text-ink-900">
                Start a new organization
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-ink-600">
                Users without an active organization can create their first company
                workspace here.
              </p>
            </div>

            {creationError ? (
              <ErrorState message={creationError} title="Unable to create organization" />
            ) : null}

            <form className="grid gap-4 md:grid-cols-2" onSubmit={handleCreateOrganization}>
              <label className="grid gap-2 text-sm font-semibold text-ink-800">
                Organization name
                <input
                  className={inputClassName}
                  onChange={(event) => updateOrganizationName(event.target.value)}
                  placeholder="Acme Corporation"
                  type="text"
                  value={creationDraft.name}
                />
              </label>

              <label className="grid gap-2 text-sm font-semibold text-ink-800">
                Slug
                <input
                  className={inputClassName}
                  onChange={(event) => updateOrganizationSlug(event.target.value)}
                  placeholder="acme-corporation"
                  type="text"
                  value={creationDraft.slug}
                />
              </label>

              <div className="md:col-span-2">
                <Button disabled={isCreatingOrganization} type="submit">
                  {isCreatingOrganization ? 'Creating...' : 'Create organization'}
                </Button>
              </div>
            </form>
          </div>
        </Card>
      ) : null}
    </div>
  )
}
