import { useCallback, useMemo, useState } from 'react'
import { useApiResource } from '../../../hooks/useApiResource'
import { listPublicApprovedSkills } from '../../../services/skills/skillService'
import type { SkillSelectionItem } from '../types/accountCreation'

export function useApprovedSkillCatalog(selectedSkills: SkillSelectionItem[]) {
  const [searchValue, setSearchValue] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const fetchApprovedSkills = useCallback(() => listPublicApprovedSkills(), [])
  const { data, error, isLoading, refetch } = useApiResource(fetchApprovedSkills)

  const skills = useMemo(() => data ?? [], [data])
  const selectedSkillNames = useMemo(
    () => new Set(selectedSkills.map((skill) => skill.normalizedName)),
    [selectedSkills],
  )

  const categories = useMemo(
    () =>
      [...new Set(skills.map((skill) => skill.category).filter((category): category is string => Boolean(category)))].sort((left, right) =>
        left.localeCompare(right),
      ),
    [skills],
  )

  const normalizedSearch = searchValue.trim().toLowerCase()

  const filteredSkills = useMemo(
    () =>
      skills.filter((skill) => {
        if (selectedSkillNames.has(skill.normalizedName)) {
          return false
        }

        if (selectedCategory && skill.category !== selectedCategory) {
          return false
        }

        if (normalizedSearch.length === 0) {
          return true
        }

        const searchTarget = [skill.name, skill.normalizedName, skill.category ?? '']
          .join(' ')
          .toLowerCase()

        return searchTarget.includes(normalizedSearch)
      }),
    [normalizedSearch, selectedCategory, selectedSkillNames, skills],
  )

  return {
    categories,
    error: error?.message ?? null,
    filteredSkills,
    isLoading,
    retry: refetch,
    searchValue,
    selectedCategory,
    setSearchValue,
    setSelectedCategory,
    skills,
  }
}
