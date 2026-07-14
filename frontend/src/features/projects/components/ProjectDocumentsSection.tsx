import { useState } from 'react'
import { EmptyState } from '../../../components/shared/EmptyState'
import { ErrorState } from '../../../components/shared/ErrorState'
import { LoadingState } from '../../../components/shared/LoadingState'
import { Button } from '../../../components/ui/Button'
import type { useProjectDocumentManager } from '../hooks/useProjectDocumentManager'
import { formatProjectDate } from '../utils/projectPresentation'
import {
  formatProjectDocumentEstimatedHours,
  formatProjectDocumentFileSize,
  formatProjectDocumentMimeType,
  getProjectDocumentExtractionStatusLabel,
  getProjectDocumentExtractionStatusTone,
} from '../utils/projectDocumentPresentation'

interface ProjectDocumentsSectionProps {
  manager: ReturnType<typeof useProjectDocumentManager>
}

function DocumentField({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="min-w-0 rounded-lg border border-border-subtle bg-surface-card-alt p-4">
      <dt className="text-xs font-semibold uppercase tracking-normal text-ink-500">{label}</dt>
      <dd className="mt-2 break-words text-sm font-medium text-ink-800">{value}</dd>
    </div>
  )
}

function ExtractedTextPanel({ text }: { text: string }) {
  const [isTextExpanded, setIsTextExpanded] = useState(false)

  return (
    <div className="rounded-lg border border-border-subtle bg-surface-card-alt p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-ink-900">Extracted text</p>
          <p className="mt-1 text-sm text-ink-600">
            Review the extracted content used for downstream analysis.
          </p>
        </div>
        {text ? (
          <Button
            onClick={() => {
              setIsTextExpanded((currentValue) => !currentValue)
            }}
            variant="ghost"
          >
            {isTextExpanded ? 'Collapse text' : 'Expand text'}
          </Button>
        ) : null}
      </div>

      {text ? (
        <div className="mt-4 rounded-lg border border-border-subtle bg-surface-card p-4">
          <pre
            className={[
              'whitespace-pre-wrap break-words text-sm leading-6 text-ink-700',
              isTextExpanded ? '' : 'max-h-48 overflow-hidden',
            ].join(' ')}
          >
            {text}
          </pre>
        </div>
      ) : (
        <p className="mt-4 text-sm leading-6 text-ink-600">
          No extracted text is available for this document.
        </p>
      )}
    </div>
  )
}

export function ProjectDocumentsSection({ manager }: ProjectDocumentsSectionProps) {
  const selectedDocument = manager.selectedDocument
  const analysis = selectedDocument?.analysis ?? null
  const extractedText = selectedDocument?.document.extracted_text?.trim() ?? ''

  return (
    <section className="space-y-6 rounded-lg border border-border-subtle bg-surface-card p-5">
      <div className="space-y-4">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-normal text-primary-700">
            Project documents
          </p>
          <h3 className="text-xl font-bold text-ink-900">Upload and inspect project files</h3>
          <p className="max-w-3xl text-sm leading-6 text-ink-600">
            Review uploaded project files, extraction results, and generated analysis for planning
            context.
          </p>
        </div>

        {manager.canUploadDocuments ? (
          <div className="rounded-lg border border-border-subtle bg-surface-card-alt p-4">
            <label className="grid gap-2 text-sm font-semibold text-ink-800">
              Upload document
              <input
                accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                className="min-h-11 rounded-md border border-border-subtle bg-surface-card px-3 py-2 text-sm text-ink-800 file:mr-3 file:rounded-md file:border-0 file:bg-primary-100 file:px-3 file:py-2 file:font-semibold file:text-primary-700"
                disabled={manager.uploadState.isUploading}
                onChange={(event) => {
                  manager.selectFile(event.target.files?.[0] ?? null)
                }}
                type="file"
              />
            </label>
            <p className="mt-2 text-xs text-ink-500">Supported: PDF, DOCX, TXT. Maximum size: 10 MB.</p>

            {manager.uploadState.file ? (
              <div className="mt-4 rounded-lg border border-border-subtle bg-surface-card p-3 text-sm text-ink-700">
                <p className="font-semibold text-ink-900">{manager.uploadState.file.name}</p>
                <p className="mt-1 text-ink-600">
                  {formatProjectDocumentFileSize(manager.uploadState.file.size)}
                </p>
              </div>
            ) : null}

            {manager.uploadState.error ? (
              <div
                className="mt-4 rounded-lg border border-danger-100 bg-danger-50 p-3 text-sm text-danger-700"
                role="alert"
              >
                {manager.uploadState.error}
              </div>
            ) : null}

            {manager.uploadSuccessMessage ? (
              <div
                className="mt-4 rounded-lg border border-success-fg/30 bg-success-bg p-3 text-sm text-success-text"
                role="status"
              >
                {manager.uploadSuccessMessage}
              </div>
            ) : null}

            <div className="mt-4 flex flex-wrap gap-3">
              <Button
                disabled={
                  !manager.uploadState.file ||
                  Boolean(manager.uploadState.error) ||
                  manager.uploadState.isUploading
                }
                onClick={() => {
                  void manager.submitUpload()
                }}
              >
                {manager.uploadState.isUploading ? 'Uploading document...' : 'Upload document'}
              </Button>
              {manager.uploadState.file ? (
                <Button
                  disabled={manager.uploadState.isUploading}
                  onClick={manager.clearSelectedFile}
                  variant="ghost"
                >
                  Clear selection
                </Button>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>

      <div className="grid gap-6">
        <div className="min-w-0 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h4 className="text-base font-semibold text-ink-900">Document library</h4>
            {manager.isDocumentListRefreshing ? (
              <span className="text-sm text-ink-500">Refreshing library...</span>
            ) : null}
          </div>

          {manager.isDocumentListLoading ? <LoadingState label="Loading project documents" /> : null}

          {!manager.isDocumentListLoading && manager.documentListError && manager.documents.length === 0 ? (
            <ErrorState
              error={manager.documentListError}
              onRetry={() => {
                void manager.retryDocuments()
              }}
              title="Unable to load project documents"
            />
          ) : null}

          {!manager.isDocumentListLoading &&
          !manager.documentListError &&
          manager.documents.length === 0 ? (
            <EmptyState
              description={
                manager.canUploadDocuments
                  ? 'Upload the first project document to start building shared delivery context.'
                  : 'No project documents are available for this project yet.'
              }
              title="No project documents yet"
            />
          ) : null}

          {!manager.isDocumentListLoading && manager.documents.length > 0 ? (
            <div className="grid gap-3">
              {manager.documents.map((entry) => {
                const isSelected = entry.document.id === manager.selectedDocumentId

                return (
                  <button
                    key={entry.document.id}
                    className={[
                      'grid gap-3 rounded-lg border p-4 text-left transition focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-primary-300',
                      isSelected
                        ? 'border-primary-600 bg-primary-50'
                        : 'border-border-subtle bg-surface-card-alt hover:border-primary-300',
                    ].join(' ')}
                    onClick={() => {
                      manager.selectDocument(entry.document.id)
                    }}
                    type="button"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-ink-900">
                          {entry.document.original_filename}
                        </p>
                        <p className="mt-1 text-sm text-ink-600">
                          {formatProjectDocumentMimeType(entry.document.mime_type)} •{' '}
                          {formatProjectDocumentFileSize(entry.document.size_bytes)}
                        </p>
                      </div>
                      <span
                        className={[
                          'inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold',
                          getProjectDocumentExtractionStatusTone(entry.document.extraction_status),
                        ].join(' ')}
                      >
                        {getProjectDocumentExtractionStatusLabel(entry.document.extraction_status)}
                      </span>
                    </div>
                    <p className="text-xs text-ink-500">
                      Uploaded {formatProjectDate(entry.document.created_at)}
                    </p>
                  </button>
                )
              })}
            </div>
          ) : null}
        </div>

        <div className="min-w-0 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h4 className="text-base font-semibold text-ink-900">Document inspection</h4>
            {manager.isDocumentDetailRefreshing ? (
              <span className="text-sm text-ink-500">Refreshing details...</span>
            ) : null}
          </div>

          {manager.isDocumentDetailLoading && !selectedDocument ? (
            <LoadingState label="Loading document details" />
          ) : null}

          {!manager.isDocumentDetailLoading && manager.documentDetailError && !selectedDocument ? (
            <ErrorState
              error={manager.documentDetailError}
              onRetry={() => {
                void manager.retrySelectedDocument()
              }}
              title="Unable to load this document"
            />
          ) : null}

          {!selectedDocument &&
          !manager.isDocumentDetailLoading &&
          !manager.documentDetailError &&
          manager.documents.length > 0 ? (
            <EmptyState
              description="Select a document from the library to inspect its extracted content and analysis."
              title="No document selected"
            />
          ) : null}

          {selectedDocument ? (
            <div className="min-w-0 space-y-5">
              {manager.documentDetailError ? (
                <ErrorState
                  error={manager.documentDetailError}
                  onRetry={() => {
                    void manager.retrySelectedDocument()
                  }}
                  title="Document detail refresh failed"
                />
              ) : null}

              <div className="rounded-lg border border-border-subtle bg-surface-card-alt p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 space-y-2">
                    <p className="break-words text-lg font-semibold text-ink-900">
                      {selectedDocument.document.original_filename}
                    </p>
                    <p className="break-words text-sm text-ink-600">
                      {formatProjectDocumentMimeType(selectedDocument.document.mime_type)} •{' '}
                      {formatProjectDocumentFileSize(selectedDocument.document.size_bytes)}
                    </p>
                  </div>
                  <span
                    className={[
                      'inline-flex rounded-full border px-3 py-1 text-xs font-semibold',
                      getProjectDocumentExtractionStatusTone(
                        selectedDocument.document.extraction_status,
                      ),
                    ].join(' ')}
                  >
                    {getProjectDocumentExtractionStatusLabel(
                      selectedDocument.document.extraction_status,
                    )}
                  </span>
                </div>

                <dl className="mt-4 grid gap-3 2xl:grid-cols-2">
                  <DocumentField
                    label="Created"
                    value={formatProjectDate(selectedDocument.document.created_at)}
                  />
                  <DocumentField
                    label="Last updated"
                    value={formatProjectDate(selectedDocument.document.updated_at)}
                  />
                </dl>

                {selectedDocument.document.extraction_error ? (
                  <div
                    className="mt-4 rounded-lg border border-danger-100 bg-danger-50 p-4 text-sm text-danger-700"
                    role="alert"
                  >
                    <p className="font-semibold">Extraction error</p>
                    <p className="mt-1 break-words">{selectedDocument.document.extraction_error}</p>
                  </div>
                ) : null}
              </div>

              <ExtractedTextPanel
                key={manager.selectedDocumentId ?? 'no-document-selected'}
                text={extractedText}
              />

              <div className="rounded-lg border border-border-subtle bg-surface-card-alt p-4">
                <p className="text-sm font-semibold text-ink-900">Document analysis</p>
                {analysis ? (
                  <div className="mt-4 space-y-5">
                    <div className="rounded-lg border border-border-subtle bg-surface-card p-4">
                      <p className="text-sm font-semibold text-ink-900">Summary</p>
                      <p className="mt-2 break-words text-sm leading-6 text-ink-700">
                        {analysis.summary}
                      </p>
                    </div>

                    <dl className="grid gap-3 2xl:grid-cols-2">
                      <DocumentField label="Complexity" value={analysis.complexity} />
                      <DocumentField
                        label="Estimated hours"
                        value={formatProjectDocumentEstimatedHours(analysis.estimated_hours)}
                      />
                      <DocumentField label="Provider" value={analysis.provider} />
                      <DocumentField label="Model" value={analysis.model ?? 'Not specified'} />
                      <DocumentField label="Created" value={formatProjectDate(analysis.created_at)} />
                    </dl>

                    <div className="grid gap-4 2xl:grid-cols-2">
                      <div className="min-w-0 rounded-lg border border-border-subtle bg-surface-card p-4">
                        <p className="text-sm font-semibold text-ink-900">Required skills</p>
                        {analysis.required_skills.length > 0 ? (
                          <ul className="mt-3 flex flex-wrap gap-2">
                            {analysis.required_skills.map((skill) => (
                              <li
                                key={skill}
                                className="rounded-full border border-border-subtle bg-surface-card-alt px-3 py-1 text-sm font-medium text-ink-700"
                              >
                                {skill}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="mt-2 text-sm text-ink-600">No required skills identified.</p>
                        )}
                      </div>

                      <div className="min-w-0 rounded-lg border border-border-subtle bg-surface-card p-4">
                        <p className="text-sm font-semibold text-ink-900">Preferred skills</p>
                        {analysis.preferred_skills.length > 0 ? (
                          <ul className="mt-3 flex flex-wrap gap-2">
                            {analysis.preferred_skills.map((skill) => (
                              <li
                                key={skill}
                                className="rounded-full border border-border-subtle bg-surface-card-alt px-3 py-1 text-sm font-medium text-ink-700"
                              >
                                {skill}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="mt-2 text-sm text-ink-600">No preferred skills identified.</p>
                        )}
                      </div>

                      <div className="min-w-0 rounded-lg border border-border-subtle bg-surface-card p-4">
                        <p className="text-sm font-semibold text-ink-900">Suggested roles</p>
                        {analysis.suggested_roles.length > 0 ? (
                          <ul className="mt-3 flex flex-wrap gap-2">
                            {analysis.suggested_roles.map((role) => (
                              <li
                                key={role}
                                className="rounded-full border border-border-subtle bg-surface-card-alt px-3 py-1 text-sm font-medium text-ink-700"
                              >
                                {role}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="mt-2 text-sm text-ink-600">No suggested roles identified.</p>
                        )}
                      </div>

                      <div className="min-w-0 rounded-lg border border-border-subtle bg-surface-card p-4">
                        <p className="text-sm font-semibold text-ink-900">Risks</p>
                        {analysis.risks.length > 0 ? (
                          <ul className="mt-3 grid gap-2">
                            {analysis.risks.map((risk) => (
                              <li key={risk} className="break-words text-sm leading-6 text-ink-700">
                                {risk}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="mt-2 text-sm text-ink-600">No risks were identified.</p>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="mt-3 text-sm leading-6 text-ink-600">
                    No analysis data is available for this document.
                  </p>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  )
}
