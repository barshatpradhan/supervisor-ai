import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ErrorState } from '../../../components/shared/ErrorState'
import { LoadingState } from '../../../components/shared/LoadingState'
import { Button } from '../../../components/ui/Button'
import { Card } from '../../../components/ui/Card'
import type { ProjectDocumentWithAnalysis } from '../types/projectDocument'
import { useProjectDocuments } from '../hooks/useProjectDocuments'
import { formatProjectDate } from '../utils/projectPresentation'
import {
  getProjectDocumentExtractionStatusLabel,
} from '../utils/projectDocumentPresentation'

interface ProjectAnalysisSectionProps {
  onDocumentChange?: (documentId: string) => void
  organizationId: string
  projectId: string
  selectedDocumentId: string | null
}

const complexityClasses = {
  high: 'border-danger-600/20 bg-danger-50 text-danger-700',
  low: 'border-success-fg/30 bg-success-bg/60 text-success-text',
  medium: 'border-warning-fg/30 bg-warning-bg/70 text-warning-text',
} as const

function SkillGroup({ emptyCopy, label, skills }: { emptyCopy: string; label: string; skills: string[] }) {
  return <Card aria-label={label}><h3 className="text-base font-semibold text-ink-900">{label}</h3>{skills.length ? <ul className="mt-3 flex flex-wrap gap-2">{skills.map((skill) => <li key={skill} className="rounded-md border border-border-subtle bg-surface-card-alt px-3 py-1.5 text-sm font-medium text-ink-700">{skill}</li>)}</ul> : <p className="mt-3 text-sm text-ink-600">{emptyCopy}</p>}</Card>
}

function selectDefaultDocument(documents: ProjectDocumentWithAnalysis[]) {
  return documents.find((entry) => entry.analysis)?.document.id ?? documents[0]?.document.id ?? null
}

export function ProjectAnalysisSection({ onDocumentChange, organizationId, projectId, selectedDocumentId }: ProjectAnalysisSectionProps) {
  const documentsQuery = useProjectDocuments(organizationId, projectId)
  const documents = documentsQuery.data ?? []
  const defaultDocumentId = selectDefaultDocument(documents)
  const selectedEntry = documents.find((entry) => entry.document.id === selectedDocumentId) ?? documents.find((entry) => entry.document.id === defaultDocumentId) ?? null

  useEffect(() => {
    if (selectedEntry && selectedEntry.document.id !== selectedDocumentId) onDocumentChange?.(selectedEntry.document.id)
  }, [onDocumentChange, selectedDocumentId, selectedEntry])

  if (documentsQuery.isLoading) return <LoadingState label="Loading AI analysis" />
  if (documentsQuery.error) return <ErrorState error={documentsQuery.error} onRetry={() => { void documentsQuery.refetch() }} title="Unable to load AI analysis" />
  if (!documents.length) return <Card className="text-center"><h2 className="text-lg font-semibold text-ink-900">No documents available</h2><p className="mt-2 text-sm text-ink-600">Upload and process a project document before viewing AI analysis.</p><Link className="mt-4 inline-flex min-h-10 items-center justify-center rounded-md bg-primary-600 px-4 py-2 text-sm font-semibold text-[var(--text-on-primary)] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-primary-300" to={`/projects/${projectId}?tab=documents`}>Open Documents</Link></Card>
  if (!selectedEntry) return <Card className="text-center"><h2 className="text-lg font-semibold text-ink-900">Document unavailable</h2><p className="mt-2 text-sm text-ink-600">The selected document is not available in this project.</p></Card>

  const { analysis, document } = selectedEntry
  return <section aria-labelledby="ai-analysis-heading" className="space-y-6">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-sm font-medium text-ink-600">Decision support</p><h2 id="ai-analysis-heading" className="text-2xl font-bold text-ink-900">AI Analysis</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-ink-600">Review the persisted analysis for an uploaded project document before making planning decisions.</p></div><Button aria-label="Refresh AI analysis" disabled={documentsQuery.isFetching} onClick={() => { void documentsQuery.refetch() }} variant="secondary">{documentsQuery.isFetching ? 'Refreshing…' : 'Refresh'}</Button></div>

    <label className="grid max-w-xl gap-2 text-sm font-semibold text-ink-800">Source document<select className="min-h-11 rounded-md border border-border-subtle bg-surface-card px-3 py-2 text-sm text-ink-800 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-primary-300" onChange={(event) => onDocumentChange?.(event.target.value)} value={document.id}>{documents.map((entry) => <option key={entry.document.id} value={entry.document.id}>{entry.document.original_filename} — {getProjectDocumentExtractionStatusLabel(entry.document.extraction_status)}{entry.analysis ? ' — analysis available' : ''}</option>)}</select></label>

    {document.extraction_status === 'pending' ? <Card><h3 className="text-lg font-semibold text-ink-900">Extraction in progress</h3><p className="mt-2 text-sm text-ink-600">This document is still being extracted. Analysis will be available after extraction completes.</p></Card> : null}
    {document.extraction_status === 'failed' ? <ErrorState message={document.extraction_error ?? 'This document could not be extracted, so no analysis is available.'} title="Document extraction failed" /> : null}
    {document.extraction_status === 'extracted' && !analysis ? <Card><h3 className="text-lg font-semibold text-ink-900">Analysis unavailable</h3><p className="mt-2 text-sm text-ink-600">The document was extracted, but no persisted AI analysis is available.</p></Card> : null}
    {analysis ? <ProjectAnalysisContent document={document} entry={selectedEntry} /> : null}
  </section>
}

export function ProjectAnalysisContent({ document, entry }: { document: ProjectDocumentWithAnalysis['document']; entry: ProjectDocumentWithAnalysis }) {
  const analysis = entry.analysis
  if (!analysis) return null
  return <div className="space-y-6"><Card aria-labelledby="analysis-summary-heading"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0"><p className="text-sm text-ink-600">Source: <span className="font-medium text-ink-800">{document.original_filename}</span></p><h3 id="analysis-summary-heading" className="mt-2 text-lg font-semibold text-ink-900">Analysis summary</h3></div><span className={`inline-flex w-fit rounded-full border px-2.5 py-1 text-xs font-semibold ${complexityClasses[analysis.complexity]}`}>Complexity: {analysis.complexity}</span></div><p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-ink-700">{analysis.summary}</p><p className="mt-4 text-xs text-ink-500">Generated {formatProjectDate(analysis.created_at)}</p></Card>
    <div className="grid gap-4 sm:grid-cols-2"><Card><h3 className="text-base font-semibold text-ink-900">Estimated hours</h3><p className="mt-3 text-3xl font-bold tabular-nums text-ink-900">{analysis.estimated_hours}</p><p className="mt-2 text-sm leading-6 text-ink-600">AI-generated estimate based on the uploaded requirements.</p></Card><Card><h3 className="text-base font-semibold text-ink-900">Analysis state</h3><span className="mt-3 inline-flex rounded-full border border-success-fg/30 bg-success-bg/60 px-2.5 py-1 text-xs font-semibold text-success-text">Completed</span><p className="mt-2 text-sm text-ink-600">Persisted document analysis</p></Card></div>
    <div className="grid gap-4 lg:grid-cols-2"><SkillGroup emptyCopy="No required skills were identified." label="Required skills" skills={analysis.required_skills} /><SkillGroup emptyCopy="No preferred skills were identified." label="Preferred skills" skills={analysis.preferred_skills} /></div>
    <Card aria-labelledby="suggested-roles-heading"><h3 id="suggested-roles-heading" className="text-base font-semibold text-ink-900">Suggested roles</h3>{analysis.suggested_roles.length ? <ul className="mt-3 flex flex-wrap gap-2">{analysis.suggested_roles.map((role) => <li key={role} className="rounded-md border border-border-subtle bg-surface-card-alt px-3 py-1.5 text-sm font-medium text-ink-700">{role}</li>)}</ul> : <p className="mt-3 text-sm text-ink-600">No suggested roles were returned.</p>}</Card>
    <details className="rounded-xl border border-border-subtle bg-surface-card p-5"><summary className="cursor-pointer text-sm font-semibold text-ink-900">Analysis details</summary><dl className="mt-4 grid gap-3 sm:grid-cols-3"><div><dt className="text-xs font-semibold uppercase text-ink-500">Source document</dt><dd className="mt-1 break-words text-sm text-ink-800">{document.original_filename}</dd></div><div><dt className="text-xs font-semibold uppercase text-ink-500">Provider</dt><dd className="mt-1 text-sm text-ink-800">{analysis.provider}</dd></div><div><dt className="text-xs font-semibold uppercase text-ink-500">Model</dt><dd className="mt-1 text-sm text-ink-800">{analysis.model ?? 'Not specified'}</dd></div></dl></details>
  </div>
}
