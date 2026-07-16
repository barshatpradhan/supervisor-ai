import type {
  BackendCreateManagedUserRequest,
  BackendProvisionedAdminUserResponse,
} from '../../types/backend'
import { postJson } from '../../lib/api'

export function createManagedUser(request: BackendCreateManagedUserRequest) {
  return postJson<BackendProvisionedAdminUserResponse, BackendCreateManagedUserRequest>(
    '/admin/users',
    request,
  )
}
