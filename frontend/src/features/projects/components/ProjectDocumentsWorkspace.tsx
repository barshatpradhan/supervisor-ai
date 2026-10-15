import { useMutation, useQueryClient } from '@tanstack/react-query'
import { FileText, Sparkles, Upload } from 'lucide-react'
import type { ChangeEvent, DragEvent } from 'react'
import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AiNote } from '../../../components/ui/AiNote'
import { Button } from '../../../components/ui/Button'
import { Card, CardHeader } from '../../../components/ui/Card'
import { Chip } from '../../../components/ui/Chip'
import { ProgressBar } from '../../../components/ui/ProgressBar'
import { StateBlock } from '../../../components/ui/StateBlock'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import { getFriendlyApiErrorMessage } from '../../../lib/api'
import { queryKeys } from '../../../lib/api/queryKeys'
import { useProjectDocuments } from '../hooks/useProjectDocuments'
import { uploadProjectDocument } from '../services/projectDocumentService'
import type { ProjectDocumentWithAnalysis } from '../types/projectDocument'
import { formatProjectDocumentFileSize, validateProjectDocumentFile } from '../utils/projectDocumentPresentation'

interface ProjectDocumentsWorkspaceProps {
  onSelectDocument: (documentId: string) => void
  organizationId: string
  projectId: string
  selectedDocumentId: string | null
}

const acceptedTypes = '.pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain'

function formatUploadDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short' }).format(new Date(value))
}

function getDocumentBadge(entry: ProjectDocumentWithAnalysis) {
  if (entry.document.extraction_status === 'pending') return { label: 'Analyzing', status: 'pending' }
  if (entry.document.extraction_status === 'failed') return { label: 'Failed', status: 'failed' }
  return entry.analysis ? { label: 'Analyzed', status: 'completed' } : { label: 'Extracted', status: 'extracted' }
}

const complexityLabels = { high: 'High complexity', low: 'Low complexity', medium: 'Medium complexity' } as const

function AnalysisPanel({ entry, projectId }: { entry: ProjectDocumentWithAnalysis; projectId: string }) {
  const { analysis, document } = entry

  if (document.extraction_status === 'pending') {
    return (
      <Card aria-labelledby="analysis-pending-title" className="flex flex-col gap-3" variant="ai">
        <CardHeader helper="Reading the document. This refreshes automatically." id="analysis-pending-title" title={`Analyzing ${document.original_filename}`} />
        <StateBlock kind="loading" title="Analysis in progress" />
      </Card>
    )
  }

  if (document.extraction_status === 'failed') {
    return (
      <Card>
        <StateBlock kind="error" title={`We couldn't read ${document.original_filename}`}>
          {document.extraction_error ?? 'The file may contain scanned images only. Upload a text-based PDF, DOCX or TXT file.'}
        </StateBlock>
      </Card>
    )
  }

  if (!analysis) {
    return (
      <Card>
        <StateBlock title="No analysis for this document">
          The text was extracted, but no AI analysis was saved for it.
        </StateBlock>
      </Card>
    )
  }

  return (
    <Card aria-labelledby="analysis-title" className="flex flex-col gap-4" variant="ai">
      <CardHeader
        action={<span className="stat-md text-text-primary">{analysis.estimated_hours}h</span>}
        helper={`From ${document.original_filename}`}
        icon={
          <span aria-hidden="true" className="inline-flex size-7 items-center justify-center rounded-pill bg-ai-bg text-ai-fg">
            <Sparkles size={16} />
          </span>
        }
        id="analysis-title"
        title="AI analysis"
      />
      <p className="body m-0 whitespace-pre-wrap text-text-primary">{analysis.summary}</p>
      <dl className="m-0 grid gap-4">
        <div className="flex flex-col gap-2">
          <dt className="label text-text-secondary">Estimate and complexity</dt>
          <dd className="m-0 flex flex-wrap gap-2">
            <Chip tone="ai">{analysis.estimated_hours}h estimated</Chip>
            <Chip tone="ai">{complexityLabels[analysis.complexity]}</Chip>
          </dd>
        </div>
        {[
          { items: analysis.required_skills, label: 'Required skills', tone: 'ai' as const },
          { items: analysis.preferred_skills, label: 'Preferred skills', tone: 'neutral' as const },
          { items: analysis.suggested_roles, label: 'Suggested roles', tone: 'neutral' as const },
        ].map((group) =>
          group.items.length > 0 ? (
            <div className="flex flex-col gap-2" key={group.label}>
              <dt className="label text-text-secondary">{group.label}</dt>
              <dd className="m-0 flex flex-wrap gap-2">
                {group.items.map((item) => <Chip key={item} tone={group.tone}>{item}</Chip>)}
              </dd>
            </div>
          ) : null,
        )}
        {analysis.risks.length > 0 ? (
          <div className="flex flex-col gap-2">
            <dt className="label text-text-secondary">Risks</dt>
            <dd className="m-0">
              <ul className="body m-0 flex flex-col gap-1 pl-5 text-text-primary">
                {analysis.risks.map((risk) => <li key={risk}>{risk}</li>)}
              </ul>
            </dd>
          </div>
        ) : null}
      </dl>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-chart-grid pt-4">
        <AiNote />
        <Link
          className="inline-flex min-h-11 items-center rounded-control bg-primary-600 px-4 text-sm font-semibold text-text-on-primary no-underline hover:bg-primary-700"
          to={`/projects/${projectId}?tab=recommendations`}
        >
          See suggested owners
        </Link>
      </div>
      <p className="helper m-0 text-text-tertiary">
        {analysis.provider}{analysis.model ? ` · ${analysis.model}` : ''} · {formatUploadDate(analysis.created_at)}
      </p>
    </Card>
  )
}

/** Upload requirement documents and read each one's AI analysis side by side. */
export function ProjectDocumentsWorkspace({ onSelectDocument, organizationId, projectId, selectedDocumentId }: ProjectDocumentsWorkspaceProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const queryClient = useQueryClient()
  const documentsQuery = useProjectDocuments(organizationId, projectId)
  const [file, setFile] = useState<File | null>(null)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [progress, setProgress] = useState<number | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  const upload = useMutation({
    mutationFn: (selectedFile: File) => {
      abortRef.current = new AbortController()
      setProgress(0)
      return uploadProjectDocument(projectId, selectedFile, { onProgress: setProgress, signal: abortRef.current.signal })
    },
    onError: () => setProgress(null),
    onSettled: () => { abortRef.current = null },
    onSuccess: async (result) => {
      setFile(null)
      setProgress(null)
      await queryClient.invalidateQueries({ queryKey: queryKeys.documents.list(organizationId, projectId) })
      onSelectDocument(result.document.id)
    },
  })

  function selectFile(nextFile: File | null) {
    const error = nextFile ? validateProjectDocumentFile(nextFile) : null
    setValidationError(error)
    setFile(nextFile)
    upload.reset()
    if (nextFile && !error) upload.mutate(nextFile)
  }

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    selectFile(event.target.files?.[0] ?? null)
    event.target.value = ''
  }

  function onDrop(event: DragEvent<HTMLElement>) {
    event.preventDefault()
    setIsDragging(false)
    if (!upload.isPending) selectFile(event.dataTransfer.files?.[0] ?? null)
  }

  const documents = documentsQuery.data ?? []
  const selected =
    documents.find((entry) => entry.document.id === selectedDocumentId) ??
    documents.find((entry) => entry.analysis) ??
    documents[0] ??
    null

  return (
    <div className="flex flex-wrap items-start gap-6">
      <div className="flex min-w-0 flex-[2_1_340px] flex-col gap-6">
        <section
          aria-label="Upload a document"
          className={[
            'flex flex-col items-center gap-3 rounded-card border border-dashed bg-surface-card px-5 py-8 text-center transition',
            isDragging ? 'border-primary-600 bg-primary-50' : 'border-border-strong',
          ].join(' ')}
          onDragLeave={() => setIsDragging(false)}
          onDragOver={(event) => { event.preventDefault(); setIsDragging(true) }}
          onDrop={onDrop}
        >
          <span aria-hidden="true" className="inline-flex size-10 items-center justify-center rounded-pill bg-primary-100 text-primary-600">
            <Upload size={18} />
          </span>
          <p className="body m-0 text-text-primary">Upload a requirements document to start the analysis.</p>
          <input accept={acceptedTypes} className="sr-only" disabled={upload.isPending} id="project-document-input" onChange={onFileChange} ref={inputRef} type="file" />
          <Button disabled={upload.isPending} onClick={() => inputRef.current?.click()}>Upload document</Button>
          <span className="helper text-text-tertiary">PDF, DOCX or TXT, up to 10 MB. You can also drop a file here.</span>
          {validationError ? <p className="helper m-0 text-danger-fg" role="alert">{validationError}</p> : null}
          {upload.isPending && file ? (
            <div aria-live="polite" className="flex w-full max-w-sm flex-col gap-2 text-left">
              <span className="helper text-text-secondary">Uploading {file.name} · {formatProjectDocumentFileSize(file.size)}</span>
              <ProgressBar label="Upload progress" value={progress ?? 0} />
              <Button className="self-center" onClick={() => abortRef.current?.abort()} variant="ghost">Cancel upload</Button>
            </div>
          ) : null}
          {upload.error ? (
            <div className="flex flex-col items-center gap-2" role="alert">
              <p className="helper m-0 text-danger-fg">{getFriendlyApiErrorMessage(upload.error)}</p>
              {file ? <Button onClick={() => upload.mutate(file)} variant="secondary">Retry upload</Button> : null}
            </div>
          ) : null}
        </section>

        <Card aria-labelledby="recent-uploads-title" className="flex flex-col" padding="flush">
          <div className="flex items-center justify-between gap-3 px-5 pb-2 pt-4">
            <h2 className="section-title m-0 text-text-primary" id="recent-uploads-title">Recent uploads</h2>
            <Button className="min-h-8 px-2.5" disabled={documentsQuery.isFetching} onClick={() => { void documentsQuery.refetch() }} variant="ghost">
              {documentsQuery.isFetching ? 'Refreshing…' : 'Refresh'}
            </Button>
          </div>
          {documentsQuery.isLoading ? <div className="px-5 pb-5"><StateBlock compact kind="loading" title="Loading documents" /></div> : null}
          {documentsQuery.error && documents.length === 0 ? (
            <StateBlock action={<Button onClick={() => { void documentsQuery.refetch() }} variant="secondary">Retry</Button>} compact kind="error">
              Documents could not be loaded.
            </StateBlock>
          ) : null}
          {!documentsQuery.isLoading && !documentsQuery.error && documents.length === 0 ? (
            <StateBlock compact>No documents yet. Upload the first one above.</StateBlock>
          ) : null}
          <ul className="m-0 list-none p-0">
            {documents.map((entry) => {
              const badge = getDocumentBadge(entry)
              const isSelected = selected?.document.id === entry.document.id
              return (
                <li className="border-t border-chart-grid" key={entry.document.id}>
                  <button
                    aria-pressed={isSelected}
                    className={[
                      'flex min-h-[60px] w-full items-center gap-3 px-5 py-2.5 text-left transition',
                      isSelected ? 'bg-primary-50' : 'bg-surface-card hover:bg-surface-inset',
                    ].join(' ')}
                    onClick={() => onSelectDocument(entry.document.id)}
                    type="button"
                  >
                    <FileText aria-hidden="true" className="shrink-0 text-text-secondary" size={18} />
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="body-strong truncate text-text-primary">{entry.document.original_filename}</span>
                      <span className="helper text-text-tertiary">
                        Uploaded {formatUploadDate(entry.document.created_at)} · {formatProjectDocumentFileSize(entry.document.size_bytes)}
                      </span>
                    </span>
                    <StatusBadge label={badge.label} status={badge.status} />
                  </button>
                </li>
              )
            })}
          </ul>
        </Card>
      </div>

      <div className="flex min-w-0 flex-[3_1_440px] flex-col gap-6">
        {selected ? (
          <AnalysisPanel entry={selected} projectId={projectId} />
        ) : !documentsQuery.isLoading ? (
          <Card>
            <StateBlock title="No analysis yet">Upload a requirements document. Its AI analysis will appear here.</StateBlock>
          </Card>
        ) : null}
      </div>
    </div>
  )
}
