'use client'

import React, { useEffect } from 'react'
import { useParams } from 'next/navigation'
import DocumentsPage from '@/components/documents/documents-page'
import { useDocumentChatStore } from '@/stores/document-chat-store'

export default function FolderPage() {
  const params = useParams()
  const folderId = params.folderId as string

  // Set folder state without navigation (since we're already at the URL)
  const setCurrentFolderId = useDocumentChatStore((state) => state.documents.setCurrentFolderId)
  
  useEffect(() => {
    if (folderId) {
      // Just set the folder state without triggering navigation
      setCurrentFolderId(folderId)
    }
  }, [folderId, setCurrentFolderId])

  return <DocumentsPage />
}