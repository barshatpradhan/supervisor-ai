import type { RecommendationDocument, RecommendationEmployeeCard } from '../types/recommendation'

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

