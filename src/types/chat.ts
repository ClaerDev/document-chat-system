export interface ChatState {
  documentChatEnabled: boolean
  documentScope?: DocumentChatScope
  provider: 'openrouter' | 'openai'
}

export interface DocumentChatScope {
  mode: 'all-documents' | 'current-folder' | 'selected-documents'
  folderId?: string
  folderName?: string
  documentIds?: string[]
  documentCount?: number
}

export interface Citation {
  id: string
  title: string
  content: string
  url?: string
  source: string
  relevance?: number
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  provider?: 'openrouter' | 'openai' | 'system'
  sources?: SearchResult[]
  citations?: Citation[]
}

export interface SearchResult {
  documentId: string
  documentTitle: string
  chunkId: string
  chunkIndex: number
  chunkText: string
  score: number
  highlights?: string[]
}

// Default states
export const DEFAULT_GENERAL_STATE: ChatState = {
  documentChatEnabled: false,
  provider: 'openrouter'
}

export const DEFAULT_DOCUMENT_STATE: ChatState = {
  documentChatEnabled: true,
  documentScope: { mode: 'all-documents' },
  provider: 'openai'
}