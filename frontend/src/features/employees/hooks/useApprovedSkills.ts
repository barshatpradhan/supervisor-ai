import { useCallback } from 'react'
import { useApiResource } from '../../../hooks/useApiResource'
import { getApprovedSkills } from '../../../services/employees/employeeService'

export function useApprovedSkills() {
  const fetchApprovedSkills = useCallback(() => getApprovedSkills(), [])
  return useApiResource(fetchApprovedSkills)
}
