/**
 * Document Analysis Utilities
 * Functions for triggering and managing document analysis
 */

export interface AnalysisOptions {
  includeSecurityAnalysis?: boolean
  includeEntityExtraction?: boolean
  includeQualityScoring?: boolean
  priority?: 'low' | 'normal' | 'high'
}

export interface AnalysisResult {
  success: boolean
  message: string
  documentId: string
  analysisJobId?: string
  estimatedCompletion?: string
  error?: string
}

export interface CancelResult {
  success: boolean
  message: string
  documentId: string
  previousStatus?: string
  newStatus?: string
  error?: string
}

/**
 * Trigger full AI analysis for a document
 */
export async function triggerDocumentAnalysis(
  documentId: string,
  options: AnalysisOptions = {}
): Promise<AnalysisResult> {
  try {
    const response = await fetch(`/api/v1/documents/${documentId}/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ options }),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Failed to trigger analysis')
    }

    return {
      success: true,
      message: data.message,
      documentId: data.documentId,
      analysisJobId: data.analysisJobId,
      estimatedCompletion: data.estimatedCompletion,
    }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
      documentId,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Get document processing status
 */
export async function getDocumentStatus(documentId: string) {
  try {
    const response = await fetch(`/api/v1/documents/${documentId}/status`)
    
    if (!response.ok) {
      throw new Error('Failed to fetch document status')
    }

    return await response.json()
  } catch (error) {
    console.error('Error fetching document status:', error)
    throw error
  }
}

/**
 * Check if a document can be analyzed
 */
export function canAnalyzeDocument(document: { 
  filePath?: string; 
  processing?: any; 
  extractedText?: string;
  content?: { extractedText?: string, sections?: any[] }
}): boolean {
  // Document must not be currently processing
  const processingStatus = (document.processing as any)?.currentStatus;
  if (processingStatus === 'PROCESSING') {
    return false
  }

  // Check if document has analyzable content
  const hasFileContent = document.filePath && document.extractedText;
  const hasEditorContent = (document as any).content?.sections?.length > 0 || (document as any).content?.extractedText;
  
  // Document must have either file content or editor content
  if (!hasFileContent && !hasEditorContent) {
    return false
  }

  return true
}

/**
 * Get analysis capability message for a document
 */
export function getAnalysisCapabilityMessage(document: { 
  filePath?: string; 
  processing?: any; 
  extractedText?: string;
  content?: { extractedText?: string, sections?: any[] }
}): string {
  const processingStatus = (document.processing as any)?.currentStatus;
  
  if (processingStatus === 'PROCESSING') {
    return 'Analysis is already in progress for this document.'
  }

  if (processingStatus === 'FAILED') {
    return 'Previous processing failed. Please try re-uploading the document or adding content.'
  }

  // Check content availability
  const hasFileContent = document.filePath && document.extractedText;
  const hasEditorContent = (document as any).content?.sections?.length > 0 || (document as any).content?.extractedText;
  
  if (!hasFileContent && !hasEditorContent) {
    return 'Document has no analyzable content. Please upload a file or add content in the editor.'
  }

  if (processingStatus === 'PENDING' || processingStatus === 'QUEUED') {
    return 'Document is still being processed. Please wait for basic processing to complete.'
  }

  // Determine content source for user feedback
  if (hasFileContent && hasEditorContent) {
    return 'Document is ready for AI analysis (will analyze both file content and editor content).'
  } else if (hasFileContent) {
    return 'Document is ready for AI analysis (will fetch and analyze file content).'
  } else {
    return 'Document is ready for AI analysis (will analyze editor content).'
  }
}

/**
 * Cancel document processing
 */
export async function cancelDocumentProcessing(documentId: string): Promise<CancelResult> {
  try {
    const response = await fetch(`/api/v1/documents/${documentId}/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Failed to cancel processing')
    }

    return {
      success: true,
      message: data.message,
      documentId: data.documentId,
      previousStatus: data.previousStatus,
      newStatus: data.newStatus,
    }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
      documentId,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Check if a document processing can be cancelled
 */
export function canCancelProcessing(document: { processing?: any }): boolean {
  const processingStatus = (document.processing as any)?.currentStatus;
  return processingStatus === 'PROCESSING' || processingStatus === 'QUEUED'
}