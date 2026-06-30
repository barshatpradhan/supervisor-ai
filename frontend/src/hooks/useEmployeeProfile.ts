import { useCallback } from 'react'
import { useApiResource } from './useApiResource'
import { getEmployeeProfile } from '../services/employees/employeeService'

export function useEmployeeProfile() {
  const fetchProfile = useCallback(() => getEmployeeProfile(), [])
  return useApiResource(fetchProfile)
}
