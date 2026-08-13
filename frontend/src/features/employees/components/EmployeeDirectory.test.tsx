import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { EmployeeDirectory } from './EmployeeDirectory'

const useAssignableEmployeesMock = vi.fn()

vi.mock('../../tasks/hooks/useAssignableEmployees', () => ({
  useAssignableEmployees: () => useAssignableEmployeesMock(),
}))

describe('EmployeeDirectory', () => {
  beforeEach(() => {
    useAssignableEmployeesMock.mockReturnValue({
      data: [{ id: 'employee-1', full_name: 'Avery Chen', employment_type: 'full_time', availability_percentage: 75, workload_percentage: 25, weekly_capacity_hours: 40, performance_score: 4.7, skills: [{ name: 'React', proficiency_level: 4, years_of_experience: 3 }] }],
      error: null,
      filters: { search: '', skill: '', availabilityMin: '', employmentType: '' },
      hasActiveFilters: false,
      isLoading: false,
      isRefreshing: false,
      refetch: vi.fn(),
      resetFilters: vi.fn(),
      setAvailabilityMin: vi.fn(),
      setEmploymentType: vi.fn(),
      setSearch: vi.fn(),
      setSkill: vi.fn(),
    })
  })

  it('shows the organization employee directory from the supported API', () => {
    render(<EmployeeDirectory />)

    expect(screen.getByRole('heading', { name: 'Employees' })).toBeInTheDocument()
    expect(screen.getByText('Avery Chen')).toBeInTheDocument()
    expect(screen.getByText(/75% available/i)).toBeInTheDocument()
    expect(screen.getByText(/React · 4\/5/i)).toBeInTheDocument()
    expect(screen.queryByText(/later phase/i)).not.toBeInTheDocument()
  })
})
