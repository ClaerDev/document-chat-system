'use client'

import React, { useState } from 'react'
import { useParams } from 'next/navigation'
import { DocumentDetailsView } from '@/components/documents/document-details-view'
import { DocumentChatInterface, ChatToggleButton } from '@/components/documents/document-chat-interface'
import { useDocumentChatStore } from '@/stores/document-chat-store'
import { FileManagerProvider } from '@/lib/providers/file-manager-provider'

export default function DocumentDetailsPage() {
  const params = useParams()
  const documentId = params.id as string
  const [isChatOpen, setIsChatOpen] = useState(false)

  // Get document from store using findDocument method
  const findDocument = useDocumentChatStore((state) => state.findDocument)
  const document = findDocument(documentId)

  const toggleChat = () => {
    setIsChatOpen(!isChatOpen)
  }

  return (
    <FileManagerProvider>
      <div className="min-h-screen bg-background">
        {/* Main Content - shifts left when chat is open */}
        <div className={`transition-all duration-300 ${isChatOpen ? 'mr-96' : 'mr-0'} relative`}>
          <DocumentDetailsView 
            documentId={documentId}
          />
        </div>

      {/* Chat Interface - Only show if document has been vectorized */}
      {document && document.embeddings && Object.keys(document.embeddings).length > 0 && (
        <>
          <DocumentChatInterface 
            document={document}
            isOpen={isChatOpen} 
            onToggle={toggleChat} 
          />
          <ChatToggleButton 
            onClick={toggleChat} 
            isOpen={isChatOpen} 
          />
        </>
      )}
      </div>
    </FileManagerProvider>
  )
}