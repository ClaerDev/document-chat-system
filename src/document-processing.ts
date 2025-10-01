import { z } from 'zod'

// Import and extend the existing Document schema from test.schema.tsx
// This ensures compatibility with the existing document interface

// Document Processing Status (extends AIProcessingStatus from existing schema)
export const DocumentProcessingStatus = z.enum([
  'pending',
  'processing',
  'completed',
  'failed',
  'cancelled',
  'partial'  // Added to match existing AIProcessingStatus
])

export type DocumentProcessingStatusType = z.infer<typeof DocumentProcessingStatus>

// Document Types (extends documentType from existing DocumentMetadata)
export const DocumentType = z.enum([
  'PROPOSAL',
  'CONTRACT', 
  'CERTIFICATION',
  'COMPLIANCE',
  'TEMPLATE',
  'OTHER',
  'SOLICITATION',         // Legacy values from database
  'AMENDMENT',
  'CAPABILITY_STATEMENT',
  'PAST_PERFORMANCE'
])

export type DocumentTypeType = z.infer<typeof DocumentType>

// Enhanced Scoring Criteria (builds on existing qualityScore concept)
export const ScoringCriteria = z.object({
  relevance: z.number().min(0).max(100).describe('Document relevance score (0-100)'),
  compliance: z.number().min(0).max(100).describe('Compliance requirement score (0-100)'),
  completeness: z.number().min(0).max(100).describe('Document completeness score (0-100)'),
  technicalMerit: z.number().min(0).max(100).describe('Technical merit and quality score (0-100)'),
  riskAssessment: z.number().min(0).max(100).describe('Risk assessment score (0-100, lower is better)')
})

export type ScoringCriteriaType = z.infer<typeof ScoringCriteria>

// Document Score Result (enhances existing qualityScore)
export const DocumentScore = z.object({
  overallScore: z.number().min(0).max(100).describe('Overall weighted document score (0-100)'),
  criteria: ScoringCriteria.describe('Individual scoring criteria breakdown'),
  weights: z.object({
    relevance: z.number().min(0).max(1).describe('Weight for relevance criteria (0-1)'),
    compliance: z.number().min(0).max(1).describe('Weight for compliance criteria (0-1)'),
    completeness: z.number().min(0).max(1).describe('Weight for completeness criteria (0-1)'),
    technicalMerit: z.number().min(0).max(1).describe('Weight for technical merit criteria (0-1)'),
    riskAssessment: z.number().min(0).max(1).describe('Weight for risk assessment criteria (0-1)')
  }).describe('Scoring weights configuration'),
  confidence: z.number().min(0).max(1).describe('AI confidence level in scoring (0-1)'),
  scoredAt: z.date().describe('Timestamp when document was scored'),
  scoringModel: z.string().describe('AI model used for scoring analysis'),
  processingTimeMs: z.number().positive().describe('Processing time in milliseconds')
})

export type DocumentScoreType = z.infer<typeof DocumentScore>

// Enhanced Document Analysis (extends AIAnalysisResults)
export const DocumentAnalysis = z.object({
  // Core analysis
  keyTerms: z.array(z.string()).describe('Important terms and phrases extracted'),
  requirements: z.array(z.string()).describe('Key requirements identified'),
  deadlines: z.array(z.object({
    type: z.string().describe('Type of deadline (submission, question, etc.)'),
    date: z.string().describe('Deadline date as string'),
    description: z.string().describe('Description of the deadline requirement')
  })).describe('Critical deadlines found in document'),
  opportunities: z.array(z.string()).describe('Business opportunities identified'),
  risks: z.array(z.string()).describe('Potential risks and challenges identified'),
  summary: z.string().describe('AI-generated executive summary of the document'),
  recommendations: z.array(z.string()).describe('AI-generated recommendations for action'),
  
  // Contract-specific analysis (extends ContractAnalysis)
  contractAnalysis: z.object({
    contractType: z.string().describe('Type of contract identified'),
    estimatedValue: z.string().optional().describe('Estimated contract value'),
    timeline: z.string().optional().describe('Contract timeline'),
    requirements: z.array(z.string()).describe('Contract requirements'),
    risks: z.array(z.string()).describe('Contract risks'),
    opportunities: z.array(z.string()).describe('Contract opportunities')
  }).optional().describe('Government contract specific analysis'),
  
  // Compliance check (extends ComplianceCheck)
  complianceCheck: z.object({
    status: z.enum(['compliant', 'non-compliant', 'partial']).describe('Overall compliance status'),
    issues: z.array(z.string()).describe('Compliance issues found'),
    recommendations: z.array(z.string()).describe('Compliance recommendations'),
    lastCheckedAt: z.string().describe('When compliance was last checked')
  }).optional().describe('Compliance analysis results'),
  
  // Entity extraction (extends ExtractedEntity)
  entities: z.array(z.object({
    type: z.enum(['person', 'organization', 'location', 'date', 'money', 'percentage']).describe('Type of entity'),
    value: z.string().describe('Entity value')
  })).describe('Extracted entities from document')
})

export type DocumentAnalysisType = z.infer<typeof DocumentAnalysis>

// File Processing Result (enhances OCR and extraction capabilities)
export const FileProcessingResult = z.object({
  success: z.boolean().describe('Whether file processing succeeded'),
  content: z.string().describe('Extracted text content from the file'),
  metadata: z.object({
    fileName: z.string().describe('Original file name'),
    fileSize: z.number().describe('File size in bytes'),
    mimeType: z.string().describe('MIME type of the processed file'),
    pageCount: z.number().optional().describe('Number of pages (for PDF documents)'),
    wordCount: z.number().describe('Estimated word count in the document'),
    language: z.string().optional().describe('Detected document language'),
    extractedAt: z.date().describe('Timestamp when content was extracted')
  }).describe('File processing metadata'),
  
  // Enhanced extraction results (compatible with AIGeneratedContent)
  extractedContent: z.object({
    sections: z.array(z.object({
      title: z.string().describe('Section title'),
      content: z.string().describe('Section content'),
      pageNumber: z.number().optional().describe('Page number where section appears')
    })).describe('Document sections extracted'),
    
    tables: z.array(z.object({
      headers: z.array(z.string()).describe('Table headers'),
      rows: z.array(z.array(z.string())).describe('Table rows'),
      pageNumber: z.number().optional().describe('Page number where table appears')
    })).describe('Tables extracted from document'),
    
    images: z.array(z.object({
      description: z.string().describe('Image description'),
      altText: z.string().describe('Alternative text for image'),
      pageNumber: z.number().optional().describe('Page number where image appears')
    })).describe('Images found in document'),
    
    ocrResults: z.array(z.object({
      text: z.string().describe('OCR extracted text'),
      pageNumber: z.number().describe('Page number of OCR text')
    })).optional().describe('OCR results for images/scanned content')
  }).optional().describe('Detailed extraction results'),
  
  error: z.string().optional().describe('Error message if processing failed')
})

export type FileProcessingResultType = z.infer<typeof FileProcessingResult>

// Document Processing Request
export const DocumentProcessingRequest = z.object({
  documentId: z.string().describe('Unique identifier for the document'),
  file: z.instanceof(File).optional().describe('File object for upload processing'),
  filePath: z.string().optional().describe('Path to existing file for processing'),
  options: z.object({
    performScoring: z.boolean().default(true).describe('Whether to perform AI scoring'),
    performAnalysis: z.boolean().default(true).describe('Whether to perform content analysis'),
    performVectorization: z.boolean().default(false).describe('Whether to create vector embeddings'),
    scoringWeights: z.object({
      relevance: z.number().min(0).max(1).default(0.3).describe('Weight for relevance'),
      compliance: z.number().min(0).max(1).default(0.25).describe('Weight for compliance'),
      completeness: z.number().min(0).max(1).default(0.2).describe('Weight for completeness'),
      technicalMerit: z.number().min(0).max(1).default(0.15).describe('Weight for technical merit'),
      riskAssessment: z.number().min(0).max(1).default(0.1).describe('Weight for risk assessment')
    }).optional().describe('Custom scoring weights (must sum to 1.0)'),
    aiProvider: z.string().optional().describe('Specific AI provider to use for processing'),
    priority: z.enum(['low', 'normal', 'high']).default('normal').describe('Processing priority level')
  }).describe('Processing configuration options')
})

export type DocumentProcessingRequestType = z.infer<typeof DocumentProcessingRequest>

// Complete Document Processing Result (compatible with existing Document interface)
export const DocumentProcessingResult = z.object({
  documentId: z.string().describe('Processed document identifier'),
  status: DocumentProcessingStatus.describe('Current processing status'),
  
  // File processing results
  fileProcessing: FileProcessingResult.optional().describe('File extraction results'),
  
  // AI analysis results (compatible with existing aiAnalysis)
  score: DocumentScore.optional().describe('AI scoring results'),
  analysis: DocumentAnalysis.optional().describe('Content analysis results'),
  
  // Processing metadata
  processedAt: z.date().describe('Timestamp when processing completed'),
  processingTimeMs: z.number().positive().describe('Total processing time in milliseconds'),
  error: z.string().optional().describe('Error message if processing failed'),
  warnings: z.array(z.string()).default([]).describe('Non-fatal warnings during processing'),
  
  // Compatible with existing Document interface fields
  aiProcessingStatus: z.object({
    status: z.enum(['pending', 'processing', 'completed', 'failed', 'partial']).describe('Processing status'),
    progress: z.number().min(0).max(100).describe('Progress percentage'),
    startedAt: z.string().optional().describe('When processing started'),
    completedAt: z.string().optional().describe('When processing completed'),
    errorMessage: z.string().optional().describe('Error message if failed'),
    retryCount: z.number().describe('Number of retry attempts')
  }).describe('AI processing status tracking')
})

export type DocumentProcessingResultType = z.infer<typeof DocumentProcessingResult>

// Batch Processing Request
export const BatchProcessingRequest = z.object({
  documentIds: z.array(z.string()).min(1).max(100).describe('List of document IDs to process (max 100)'),
  options: z.object({
    performScoring: z.boolean().default(true).describe('Whether to perform AI scoring'),
    performAnalysis: z.boolean().default(true).describe('Whether to perform content analysis'),
    performVectorization: z.boolean().default(false).describe('Whether to create vector embeddings'),
    scoringWeights: z.object({
      relevance: z.number().min(0).max(1).default(0.3),
      compliance: z.number().min(0).max(1).default(0.25),
      completeness: z.number().min(0).max(1).default(0.2),
      technicalMerit: z.number().min(0).max(1).default(0.15),
      riskAssessment: z.number().min(0).max(1).default(0.1)
    }).optional(),
    concurrency: z.number().min(1).max(10).default(3).describe('Number of documents to process concurrently'),
    priority: z.enum(['low', 'normal', 'high']).default('normal').describe('Batch processing priority')
  }).describe('Batch processing configuration')
})

export type BatchProcessingRequestType = z.infer<typeof BatchProcessingRequest>

// Batch Processing Result
export const BatchProcessingResult = z.object({
  batchId: z.string().describe('Unique identifier for the batch operation'),
  status: DocumentProcessingStatus.describe('Overall batch processing status'),
  totalDocuments: z.number().describe('Total number of documents in the batch'),
  completedDocuments: z.number().describe('Number of successfully processed documents'),
  failedDocuments: z.number().describe('Number of failed document processings'),
  results: z.array(DocumentProcessingResult).describe('Individual document processing results'),
  startedAt: z.date().describe('Timestamp when batch processing started'),
  completedAt: z.date().optional().describe('Timestamp when batch processing completed'),
  totalProcessingTimeMs: z.number().positive().describe('Total batch processing time in milliseconds'),
  averageProcessingTimeMs: z.number().positive().describe('Average processing time per document')
})

export type BatchProcessingResultType = z.infer<typeof BatchProcessingResult>

// Document Creation Request (for creating documents from scratch)
export const DocumentCreationRequest = z.object({
  name: z.string().min(1).max(255).describe('Document name'),
  type: DocumentType.describe('Type of document being created'),
  content: z.string().default('').describe('Initial document content (HTML/Markdown)'),
  organizationId: z.string().describe('Organization ID for multi-tenant isolation'),
  createdBy: z.string().describe('User ID of the document creator'),
  // Direct fields (no metadata wrapper)
  tags: z.array(z.string()).default([]).describe('Document tags'),
  urgencyLevel: z.enum(['low', 'medium', 'high', 'critical']).default('medium').describe('Document urgency'),
  complexityScore: z.number().min(1).max(10).default(5).describe('Expected complexity score'),
  isEditable: z.boolean().default(true).describe('Whether document can be edited (true for created docs)')
})

export type DocumentCreationRequestType = z.infer<typeof DocumentCreationRequest>

// Export interfaces for easier importing
export interface DocumentProcessing {
  Status: DocumentProcessingStatusType
  Type: DocumentTypeType
  Score: DocumentScoreType
  Analysis: DocumentAnalysisType
  FileResult: FileProcessingResultType
  ProcessingRequest: DocumentProcessingRequestType
  ProcessingResult: DocumentProcessingResultType
  BatchRequest: BatchProcessingRequestType
  BatchResult: BatchProcessingResultType
  CreationRequest: DocumentCreationRequestType
}

// Utility type for updating existing Document interface with processing results
export type DocumentWithProcessing = {
  // Enhanced AI properties that integrate with existing schema
  enhancedScore?: DocumentScoreType
  enhancedAnalysis?: DocumentAnalysisType
  processingHistory: Array<{
    timestamp: string
    event: string
    success: boolean
    error?: string
    processingTimeMs?: number
  }>
}