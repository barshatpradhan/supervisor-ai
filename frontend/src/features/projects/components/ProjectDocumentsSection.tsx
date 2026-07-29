import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { ChangeEvent, DragEvent } from 'react'
import { useRef, useState } from 'react'
import { EmptyState } from '../../../components/shared/EmptyState'
import { ErrorState } from '../../../components/shared/ErrorState'
import { LoadingState } from '../../../components/shared/LoadingState'
import { Button } from '../../../components/ui/Button'
import { queryKeys } from '../../../lib/api/queryKeys'
import { useProjectDocuments } from '../hooks/useProjectDocuments'
import { uploadProjectDocument } from '../services/projectDocumentService'
import { formatProjectDate } from '../utils/projectPresentation'
import {
  formatProjectDocumentFileSize,
  formatProjectDocumentMimeType,
  getProjectDocumentExtractionStatusLabel,
  getProjectDocumentExtractionStatusTone,
  validateProjectDocumentFile,
} from '../utils/projectDocumentPresentation'

interface ProjectDocumentsSectionProps {
  organizationId: string
  projectId: string
}

export function ProjectDocumentsSection({ organizationId, projectId }: ProjectDocumentsSectionProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const queryClient = useQueryClient()
  const documentsQuery = useProjectDocuments(organizationId, projectId)
  const [file, setFile] = useState<File | null>(null)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [progress, setProgress] = useState<number | null>(null)

  const uploadMutation = useMutation({
    mutationFn: (selectedFile: File) => {
      abortRef.current = new AbortController()
      setProgress(0)
      return uploadProjectDocument(projectId, selectedFile, {
        onProgress: setProgress,
        signal: abortRef.current.signal,
      })
    },
    onSuccess: async () => {
      setFile(null)
      setProgress(null)
      await queryClient.invalidateQueries({ queryKey: queryKeys.documents.list(organizationId, projectId) })
    },
    onError: () => setProgress(null),
    onSettled: () => { abortRef.current = null },
  })

  function selectFile(nextFile: File | null) {
    const error = nextFile ? validateProjectDocumentFile(nextFile) : null
    setFile(nextFile)
    setValidationError(error)
    uploadMutation.reset()
  }

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    selectFile(event.target.files?.[0] ?? null)
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    if (!uploadMutation.isPending) selectFile(event.dataTransfer.files?.[0] ?? null)
  }

  function cancelUpload() {
    abortRef.current?.abort()
  }

  const documents = documentsQuery.data ?? []
  const isUploading = uploadMutation.isPending

  return (
    <section aria-labelledby="project-documents-heading" className="space-y-6">
      <div className="flex flex-col gap-2"><p className="text-sm font-medium text-ink-600">Project files</p><h2 id="project-documents-heading" className="text-2xl font-bold text-ink-900">Documents</h2><p className="max-w-2xl text-sm leading-6 text-ink-600">Upload requirement documents for this project. Extraction results are refreshed while a document is pending.</p></div>

      <div
        aria-describedby="document-upload-help"
        className="rounded-xl border border-dashed border-border-subtle bg-surface-card p-6 text-center"
        onDragOver={(event) => event.preventDefault()}
        onDrop={onDrop}
      >
        <input accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain" className="sr-only" disabled={isUploading} onChange={onFileChange} ref={inputRef} type="file" />
        <p className="text-base font-semibold text-ink-900">Drop a document here</p>
        <p id="document-upload-help" className="mt-2 text-sm text-ink-600">PDF, DOCX, or TXT up to 10 MB.</p>
        <Button className="mt-4" disabled={isUploading} onClick={() => inputRef.current?.click()} variant="secondary">Choose file</Button>
        {file ? <p className="mt-4 break-words text-sm font-medium text-ink-800">{file.name} · {formatProjectDocumentFileSize(file.size)}</p> : null}
        {validationError ? <p className="mt-4 text-sm text-danger-700" role="alert">{validationError}</p> : null}
        {uploadMutation.error ? <ErrorState error={uploadMutation.error} title="Upload failed" /> : null}
        {isUploading ? <div aria-live="polite" className="mx-auto mt-5 max-w-md"><div className="flex justify-between text-sm text-ink-700"><span>Uploading document</span><span>{progress === null ? 'Preparing upload' : `${progress}%`}</span></div><div aria-label="Upload progress" aria-valuemax={100} aria-valuemin={0} aria-valuenow={progress ?? undefined} className="mt-2 h-2 overflow-hidden rounded-full bg-surface-muted" role="progressbar"><div className="h-full bg-primary-600 transition-[width] motion-reduce:transition-none" style={{ width: `${progress ?? 0}%` }} /></div></div> : null}
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <Button disabled={!file || Boolean(validationError) || isUploading} onClick={() => file && uploadMutation.mutate(file)}>Upload document</Button>
          {isUploading ? <Button onClick={cancelUpload} variant="secondary">Cancel upload</Button> : null}
          {uploadMutation.isError && file ? <Button onClick={() => uploadMutation.mutate(file)} variant="secondary">Retry upload</Button> : null}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3"><h3 className="text-lg font-semibold text-ink-900">Uploaded documents</h3><Button disabled={documentsQuery.isFetching} onClick={() => { void documentsQuery.refetch() }} variant="ghost">{documentsQuery.isFetching ? 'Refreshing…' : 'Refresh'}</Button></div>
      {documentsQuery.isLoading ? <LoadingState label="Loading project documents" /> : null}
      {documentsQuery.error && documents.length === 0 ? <ErrorState error={documentsQuery.error} onRetry={() => { void documentsQuery.refetch() }} title="Unable to load project documents" /> : null}
      {!documentsQuery.isLoading && !documentsQuery.error && documents.length === 0 ? <EmptyState description="Upload the first requirement document to begin extraction." title="No documents uploaded" /> : null}
      {documents.length > 0 ? <ul aria-label="Uploaded documents" className="grid gap-3">{documents.map(({ document }) => <li key={document.id} className="rounded-xl border border-border-subtle bg-surface-card p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0"><p className="break-words font-semibold text-ink-900">{document.original_filename}</p><p className="mt-1 text-sm text-ink-600">{formatProjectDocumentMimeType(document.mime_type)} · {formatProjectDocumentFileSize(document.size_bytes)} · Uploaded {formatProjectDate(document.created_at)}</p></div><span className={`inline-flex w-fit rounded-full border px-2.5 py-1 text-xs font-semibold ${getProjectDocumentExtractionStatusTone(document.extraction_status)}`}>{getProjectDocumentExtractionStatusLabel(document.extraction_status)}</span></div>{document.extraction_status === 'pending' ? <p className="mt-3 text-sm text-ink-600" role="status">Extraction is in progress. This list refreshes automatically.</p> : null}{document.extraction_status === 'failed' && document.extraction_error ? <p className="mt-3 text-sm text-danger-700" role="alert">Extraction failed: {document.extraction_error}</p> : null}</li>)}</ul> : null}
    </section>
  )
}
