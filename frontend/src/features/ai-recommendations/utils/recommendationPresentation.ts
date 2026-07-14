import type { RecommendationAnalysis, RecommendationDocument, RecommendationEmployeeCard } from '../types/recommendation'

export function formatRecommendationPercent(value: number | null | undefined) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return 'Not available'
  }

  return `${Math.round(value)}%`
}

export function formatRecommendationScore(value: number | null | undefined) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return 'Not available'
  }

  const normalizedValue = Number(value)
  return `${normalizedValue.toFixed(normalizedValue % 1 === 0 ? 0 : 1)} / 100`
}

export function formatRecommendationEstimatedHours(value: number) {
  return `${value} hr${value === 1 ? '' : 's'}`
}

export function formatRecommendationEmploymentType(value: 'full_time' | 'part_time' | null | undefined) {
  if (value === 'full_time') {
    return 'Full-time'
  }

  if (value === 'part_time') {
    return 'Part-time'
  }

  return 'Not available'
}

export function findRecommendationAnalysis(
  documents: RecommendationDocument[],
  analysisId: string | null | undefined,
) {
  if (analysisId) {
    const matchedDocument = documents.find((entry) => entry.analysis?.id === analysisId)

    if (matchedDocument?.analysis) {
      return matchedDocument.analysis
    }
  }

  return documents.find((entry) => entry.analysis !== null)?.analysis ?? null
}

export function buildRecommendationEmployeeCards(
  recommendationCards: RecommendationEmployeeCard[],
) {
  return recommendationCards.sort(
    (left, right) => left.recommendation.rank - right.recommendation.rank,
  )
}

export function getRecommendationAnalysisSections(analysis: RecommendationAnalysis) {
  return [
    {
      items: analysis.required_skills,
      label: 'Required skills',
      emptyLabel: 'No required skills identified.',
    },
    {
      items: analysis.preferred_skills,
      label: 'Preferred skills',
      emptyLabel: 'No preferred skills identified.',
    },
    {
      items: analysis.suggested_roles,
      label: 'Suggested roles',
      emptyLabel: 'No suggested roles identified.',
    },
    {
      items: analysis.risks,
      label: 'Risks',
      emptyLabel: 'No risks identified.',
    },
  ] as const
}
