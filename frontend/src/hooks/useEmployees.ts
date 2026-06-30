import { useCallback, useMemo } from 'react'
import type { BackendAdminUser } from '../types/backend'
import { useApiResource } from './useApiResource'
import { listEmployeeUsers } from '../services/employees/employeeService'

export function useEmployees() {
  const fetchEmployees = useCallback(() => listEmployeeUsers(), [])
  const query = useApiResource(fetchEmployees)

  const employees = useMemo<BackendAdminUser[] | null>(() => {
    if (query.data === null) {
      return null
    }

    return query.data.filter((user) => user.role === 'employee')
  }, [query.data])

  return {
    ...query,
    data: employees,
  }
}
