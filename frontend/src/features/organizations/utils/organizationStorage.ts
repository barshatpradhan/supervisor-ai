const activeOrganizationStorageKey = 'supervisor_ai_active_organization_id'

export function getStoredOrganizationId() {
  return window.localStorage.getItem(activeOrganizationStorageKey)
}

export function storeOrganizationId(organizationId: string) {
  window.localStorage.setItem(activeOrganizationStorageKey, organizationId)
}

export function clearStoredOrganizationId() {
  window.localStorage.removeItem(activeOrganizationStorageKey)
}
