import { useCallback } from 'react'
import { useApiResource } from './useApiResource'
import { getSupervisorProfile } from '../services/supervisors/supervisorService'

export function useSupervisorProfile() {
  const fetchProfile = useCallback(() => getSupervisorProfile(), [])
  return useApiResource(fetchProfile)
}
