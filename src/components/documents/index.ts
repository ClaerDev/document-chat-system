// Document management components barrel export
export { default as DocumentsPage } from './documents-page'
export { FilePreview } from './file-preview'
export { FolderCard } from './folder-card'
export { DocumentCard } from './document-card'
export { BreadcrumbNavigation } from './breadcrumb-navigation'
export { DocumentsToolbar } from './documents-toolbar'
export { DocumentModal } from './document-modal'
export { CreateDocumentModal } from './create-document-modal'
export { DocumentDetailsView } from './document-details-view'
export { DocumentChatInterface, ChatToggleButton } from './document-chat-interface'
export { DeleteConfirmationModal } from './delete-confirmation-modal'
export { FolderDeleteConfirmationModal } from './folder-delete-confirmation-modal'
export { FolderDeleteInfoModal } from './folder-delete-info-modal'
// Real store hooks (no more mock data)
export {
  useTree,
  useTreeNavigation,
  useFolderOperations,
  useDocumentOperations,
  useDocumentChatStore
} from '@/stores/document-chat-store'
export * from './file-type-utils'
