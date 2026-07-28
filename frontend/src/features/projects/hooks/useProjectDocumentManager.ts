import { useState } from 'react'
import { useNotifications } from '../../../hooks/useNotifications'
import { useOrganization } from '../../organizations/hooks/useOrganization'
import { uploadProjectDocument } from '../services/projectDocumentService'
import type { ProjectDocumentUploadState } from '../types/projectDocument'
import { validateProjectDocumentFile } from '../utils/projectDocumentPresentation'
import { useProjectDocument } from './useProjectDocument'
import { useProjectDocuments } from './useProjectDocuments'

function createInitialUploadState(): ProjectDocumentUploadState {
  return {
    error: null,
    file: null,
    isUploading: false,
  }
}

interface ProjectScopedUploadState extends ProjectDocumentUploadState {
  projectId: string | undefined
  successMessage: string | null
}

interface ProjectScopedDocumentSelectionState {
  documentId: string | null
  projectId: string | undefined
}

export function useProjectDocumentManager(projectId: string | undefined) {
  const { activeMembershipRole } = useOrganization()
  const notifications = useNotifications()
  const listQuery = useProjectDocuments(projectId)
  const [selectionState, setSelectionState] = useState<ProjectScopedDocumentSelectionState>({
    documentId: null,
    projectId,
  })
  const [uploadStateInternal, setUploadStateInternal] = useState<ProjectScopedUploadState>({
    ...createInitialUploadState(),
    projectId,
    successMessage: null,
  })
  const canUploadDocuments =
    activeMembershipRole === 'organization_admin' ||
    activeMembershipRole === 'supervisor'
  const documents = listQuery.data ?? []
  const selectedDocumentId =
    selectionState.projectId === projectId &&
    selectionState.documentId &&
    documents.some((entry) => entry.document.id === selectionState.documentId)
      ? selectionState.documentId
      : documents[0]?.document.id ?? null
  const detailQuery = useProjectDocument(projectId, selectedDocumentId)
  const uploadState =
    uploadStateInternal.projectId === projectId
      ? uploadStateInternal
      : {
          ...createInitialUploadState(),
          projectId,
          successMessage: null,
        }
  const selectedDocument =
    detailQuery.data ??
    (selectedDocumentId ? documents.find((entry) => entry.document.id === selectedDocumentId) ?? null : null)

  function selectFile(file: File | null) {
    if (!file) {
      setUploadStateInternal({
        ...createInitialUploadState(),
        projectId,
        successMessage: null,
      })
      return
    }

    const validationError = validateProjectDocumentFile(file)
    setUploadStateInternal({
      error: validationError,
      file,
      isUploading: false,
      projectId,
      successMessage: null,
    })
  }

  function clearSelectedFile() {
    setUploadStateInternal({
      ...createInitialUploadState(),
      projectId,
      successMessage: null,
    })
  }

  function selectDocument(documentId: string) {
    setSelectionState({
      documentId,
      projectId,
    })
  }

  async function retryDocuments() {
    await listQuery.refetch()
  }

  async function retrySelectedDocument() {
    await detailQuery.refetch()
  }

  async function submitUpload() {
    if (!projectId || !uploadState.file || uploadState.error || !canUploadDocuments) {
      return
    }

    setUploadStateInternal((currentState) => ({
      ...currentState,
      error: null,
      isUploading: true,
      projectId,
      successMessage: null,
    }))

    try {
      const uploadedDocument = await uploadProjectDocument(projectId, uploadState.file)
      await listQuery.refetch()
      setSelectionState({
        documentId: uploadedDocument.document.id,
        projectId,
      })
      notifications.success({
        message: 'The project document is now available for review.',
        title: 'Document uploaded',
      })
      setUploadStateInternal({
        ...createInitialUploadState(),
        projectId,
        successMessage: `Uploaded ${uploadedDocument.document.original_filename}.`,
      })
    } catch (caughtError) {
      const message =
        caughtError instanceof Error ? caughtError.message : 'Unable to upload the project document.'

      setUploadStateInternal((currentState) => ({
        ...currentState,
        error: message,
        isUploading: false,
        projectId,
      }))
      notifications.error({
        message,
        title: 'Document upload failed',
      })
    }
  }

  return {
    canUploadDocuments,
    clearSelectedFile,
    documents,
    documentDetailError: detailQuery.error,
    documentListError: listQuery.error,
    isDocumentDetailLoading: Boolean(selectedDocumentId) && detailQuery.isLoading && !detailQuery.data,
    isDocumentDetailRefreshing: detailQuery.isRefreshing,
    isDocumentListLoading: listQuery.isLoading,
    isDocumentListRefreshing: listQuery.isRefreshing,
    retryDocuments,
    retrySelectedDocument,
    selectDocument,
    selectFile,
    selectedDocument,
    selectedDocumentId,
    submitUpload,
    uploadSuccessMessage: uploadState.successMessage,
    uploadState,
  }
}
