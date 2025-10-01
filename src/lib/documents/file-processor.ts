import { FileProcessingAdapter } from '@/lib/file-processing/file-processing-adapter'
import { FileProcessingOptions } from '@/lib/file-processing/types'
import { 
  FileProcessingResult, 
  DocumentProcessingRequest,
  DocumentProcessingResult,
  DocumentScore,
  DocumentAnalysis,
  type FileProcessingResultType,
  type DocumentProcessingRequestType,
  type DocumentProcessingResultType
} from '@/types/document-processing'
import { 
  Document, 
  AIProcessingStatus, 
  AIProcessingData,
  DocumentSection,
  TableData,
  ImageData
} from '@/types/documents'
import { DocumentScoringService } from '@/lib/ai/document-scoring'

export interface DocumentFileProcessorOptions {
  fileProcessingOptions?: Partial<FileProcessingOptions>
  performScoring?: boolean
  performAnalysis?: boolean
  scoringWeights?: {
    relevance?: number
    compliance?: number
    completeness?: number
    technicalMerit?: number
    riskAssessment?: number
  }
  aiProvider?: string
  organizationId?: string
  userId?: string
}

export class DocumentFileProcessor {
  private static instance: DocumentFileProcessor
  private fileProcessor: FileProcessingAdapter
  private scoringService: DocumentScoringService

  private constructor() {
    this.fileProcessor = new FileProcessingAdapter()
    this.scoringService = DocumentScoringService.getInstance()
  }

  public static getInstance(): DocumentFileProcessor {
    if (!DocumentFileProcessor.instance) {
      DocumentFileProcessor.instance = new DocumentFileProcessor()
    }
    return DocumentFileProcessor.instance
  }

  /**
   * Process a file and optionally perform AI scoring and analysis
   */
  public async processFile(
    file: File,
    options: DocumentFileProcessorOptions = {}
  ): Promise<FileProcessingResultType> {
    const startTime = Date.now()

    try {
      // Convert File to Buffer for processing
      const buffer = Buffer.from(await file.arrayBuffer())
      
      // Set up file processing options with sensible defaults
      const fileProcessingOptions: FileProcessingOptions = {
        maxFileSize: 50 * 1024 * 1024, // 50MB default
        ocrLanguage: 'eng',
        extractMetadata: true,
        preserveFormatting: false,
        maxTextLength: 5 * 1024 * 1024, // 5MB text limit
        timeout: 30000,
        processEmbeddedFiles: false,
        ...options.fileProcessingOptions
      }

      // Process the file to extract text and metadata
      const processingResult = await this.fileProcessor.extractText(
        buffer, 
        fileProcessingOptions
      )

      if (!processingResult.success) {
        return FileProcessingResult.parse({
          success: false,
          content: '',
          metadata: {
            fileName: file.name,
            fileSize: file.size,
            mimeType: file.type,
            pageCount: processingResult.metadata?.document?.pages,
            wordCount: processingResult.metadata?.document?.words || 0,
            language: 'en', // Default language
            extractedAt: new Date()
          },
          error: processingResult.error?.message || 'File processing failed'
        })
      }

      // Enhanced extraction results (compatible with our document processing types)
      const extractedContent = {
        sections: this.extractSections(processingResult.text),
        tables: this.extractTables(processingResult.text),
        images: this.extractImageReferences(processingResult.text),
        ocrResults: processingResult.metadata?.image ? [{
          text: processingResult.text,
          pageNumber: 1
        }] : undefined
      }

      // Create successful file processing result
      const result = FileProcessingResult.parse({
        success: true,
        content: processingResult.text,
        metadata: {
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type,
          pageCount: processingResult.metadata?.document?.pages,
          wordCount: processingResult.metadata?.document?.words || this.estimateWordCount(processingResult.text),
          language: this.detectLanguage(processingResult.text),
          extractedAt: new Date()
        },
        extractedContent
      })

      return result

    } catch (error) {
      console.error('Document file processing failed:', error)
      return FileProcessingResult.parse({
        success: false,
        content: '',
        metadata: {
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type,
          wordCount: 0,
          extractedAt: new Date()
        },
        error: `File processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      })
    }
  }

  /**
   * Process a file and perform comprehensive document processing including scoring
   */
  public async processDocument(
    request: DocumentProcessingRequestType
  ): Promise<DocumentProcessingResultType> {
    const startTime = Date.now()

    try {
      let fileProcessingResult: FileProcessingResultType | undefined
      let documentContent = ''

      // Process file if provided
      if (request.file) {
        fileProcessingResult = await this.processFile(request.file, {
          fileProcessingOptions: request.options as any,
          organizationId: request.options.aiProvider, // Temporary mapping
          userId: request.options.aiProvider // Temporary mapping
        })

        if (!fileProcessingResult.success) {
          throw new Error(fileProcessingResult.error || 'File processing failed')
        }

        documentContent = fileProcessingResult.content
      } else if (request.filePath) {
        // Handle file path processing (would need file system access)
        throw new Error('File path processing not implemented in browser environment')
      } else {
        throw new Error('Either file or filePath must be provided')
      }

      // Prepare scoring input
      const scoringInput = {
        content: documentContent,
        title: request.file?.name,
        documentType: this.detectDocumentType(documentContent, request.file?.name),
        metadata: fileProcessingResult ? {
          fileName: fileProcessingResult.metadata.fileName,
          fileSize: fileProcessingResult.metadata.fileSize,
          pageCount: fileProcessingResult.metadata.pageCount,
          wordCount: fileProcessingResult.metadata.wordCount
        } : undefined
      }

      let score: typeof DocumentScore._type | undefined
      let analysis: typeof DocumentAnalysis._type | undefined

      // Perform AI scoring if requested
      if (request.options.performScoring) {
        score = await this.scoringService.scoreDocument(scoringInput, {
          weights: request.options.scoringWeights,
          aiProvider: request.options.aiProvider,
          documentType: scoringInput.documentType,
          organizationId: 'default', // Would come from auth context
          userId: 'default' // Would come from auth context
        })
      }

      // Perform AI analysis if requested
      if (request.options.performAnalysis) {
        analysis = await this.scoringService.analyzeDocument(scoringInput, {
          aiProvider: request.options.aiProvider,
          documentType: scoringInput.documentType,
          organizationId: 'default',
          userId: 'default'
        })
      }

      // Create AI processing status
      const aiProcessingStatus = {
        status: 'completed' as const,
        progress: 100,
        startedAt: new Date(startTime).toISOString(),
        completedAt: new Date().toISOString(),
        errorMessage: undefined,
        retryCount: 0
      }

      // Create comprehensive document processing result
      const result = DocumentProcessingResult.parse({
        documentId: request.documentId,
        status: 'completed',
        fileProcessing: fileProcessingResult,
        score,
        analysis,
        processedAt: new Date(),
        processingTimeMs: Date.now() - startTime,
        aiProcessingStatus
      })

      return result

    } catch (error) {
      console.error('Document processing failed:', error)
      
      const aiProcessingStatus = {
        status: 'failed' as const,
        progress: 0,
        startedAt: new Date(startTime).toISOString(),
        completedAt: new Date().toISOString(),
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        retryCount: 0
      }

      return DocumentProcessingResult.parse({
        documentId: request.documentId,
        status: 'failed',
        processedAt: new Date(),
        processingTimeMs: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Document processing failed',
        aiProcessingStatus
      })
    }
  }

  /**
   * Check if a file type is supported for document processing
   */
  public isSupportedFileType(mimeType: string): boolean {
    // Document types that are valuable for government contracting
    const supportedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
      'application/msword', // .doc
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'text/csv',
      'text/plain',
      'text/markdown',
      'text/html',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
      'application/vnd.ms-powerpoint', // .ppt
      'application/json',
      'application/xml',
      'text/xml'
    ]

    return supportedTypes.includes(mimeType)
  }

  /**
   * Get maximum file size for processing
   */
  public getMaxFileSize(): number {
    return 50 * 1024 * 1024 // 50MB
  }

  /**
   * Extract document sections from text content
   */
  private extractSections(text: string) {
    const sections = []
    const lines = text.split('\n')
    let currentSection = { title: 'Introduction', content: '', pageNumber: 1 }
    
    for (const line of lines) {
      // Simple heuristic for section headers (all caps or numbered sections)
      if (line.match(/^[A-Z\s]+:$/) || line.match(/^\d+\.\s+[A-Z]/)) {
        if (currentSection.content.trim()) {
          sections.push(currentSection)
        }
        currentSection = {
          title: line.replace(/^[\d.]+\s*/, '').replace(/:$/, '').trim(),
          content: '',
          pageNumber: Math.floor(sections.length / 10) + 1
        }
      } else {
        currentSection.content += line + '\n'
      }
    }
    
    // Add the last section
    if (currentSection.content.trim()) {
      sections.push(currentSection)
    }
    
    return sections.slice(0, 20) // Limit to 20 sections
  }

  /**
   * Extract table references from text content
   */
  private extractTables(text: string) {
    const tables = []
    const lines = text.split('\n')
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      // Simple heuristic for table detection (multiple tabs or pipes)
      if (line.includes('\t') || line.includes('|')) {
        const headers = line.split(/[\t|]/).map(h => h.trim()).filter(Boolean)
        if (headers.length > 1) {
          tables.push({
            headers,
            rows: [headers], // Just include header as first row for now
            pageNumber: Math.floor(i / 50) + 1
          })
        }
      }
    }
    
    return tables.slice(0, 10) // Limit to 10 tables
  }

  /**
   * Extract image references from text content
   */
  private extractImageReferences(text: string) {
    const images = []
    const imageMatches = text.match(/\b(figure|image|chart|diagram|graph)\s+\d+/gi) || []
    
    imageMatches.forEach((match, index) => {
      images.push({
        description: match,
        altText: `${match} from document`,
        pageNumber: Math.floor(index / 5) + 1
      })
    })
    
    return images.slice(0, 10) // Limit to 10 image references
  }

  /**
   * Estimate word count from text content
   */
  private estimateWordCount(text: string): number {
    return text.trim().split(/\s+/).length
  }

  /**
   * Detect document language (simple implementation)
   */
  private detectLanguage(text: string): string {
    // Simple heuristic - could be enhanced with proper language detection
    const englishWords = ['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'day']
    const sampleText = text.toLowerCase().substring(0, 1000)
    const englishWordCount = englishWords.filter(word => sampleText.includes(word)).length
    
    return englishWordCount > 3 ? 'en' : 'unknown'
  }

  /**
   * Detect document type based on content and filename
   */
  private detectDocumentType(content: string, filename?: string): string {
    const contentLower = content.toLowerCase()
    const filenameLower = filename?.toLowerCase() || ''
    
    // Government contracting document type detection
    if (contentLower.includes('request for proposal') || contentLower.includes('rfp') || filenameLower.includes('rfp')) {
      return 'rfp'
    }
    if (contentLower.includes('request for quote') || contentLower.includes('rfq') || filenameLower.includes('rfq')) {
      return 'rfq'
    }
    if (contentLower.includes('request for information') || contentLower.includes('rfi') || filenameLower.includes('rfi')) {
      return 'rfi'
    }
    if (contentLower.includes('solicitation') || filenameLower.includes('sol')) {
      return 'sol'
    }
    if (contentLower.includes('contract') && !contentLower.includes('request')) {
      return 'contract'
    }
    if (contentLower.includes('proposal') && !contentLower.includes('request')) {
      return 'proposal'
    }
    if (contentLower.includes('compliance') || contentLower.includes('certification')) {
      return 'compliance'
    }
    if (contentLower.includes('technical specification') || contentLower.includes('technical requirements')) {
      return 'technical'
    }
    
    return 'other'
  }
}