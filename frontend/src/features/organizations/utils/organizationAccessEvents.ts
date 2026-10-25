/**
 * Signals that the server refused an organization-scoped request (403), which can mean the user's
 * role changed since their memberships were loaded. OrganizationProvider reloads them, so menus and
 * routes follow the new role without a full page reload.
 */
export const organizationAccessChangedEvent = 'supervisor-ai:organization-access-changed'

export function notifyOrganizationAccessChanged() {
  window.dispatchEvent(new Event(organizationAccessChangedEvent))
}
