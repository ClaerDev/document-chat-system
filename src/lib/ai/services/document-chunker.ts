/**
 * Document Chunking Service
 *
 * Intelligent text chunking optimized for government contracting documents
 * with semantic boundary detection and overlap management.
 */

import { z } from 'zod'

export const ChunkingConfigSchema = z.object({
  chunkSize: z
    .number()
    .min(100)
    .max(6000)
    .default(1500)
    .describe('Target chunk size in tokens - safe limit for OpenAI embeddings (max 8192)'),
  overlap: z
    .number()
    .min(0)
    .max(1000)
    .default(200)
    .describe(
      'Overlap between chunks in tokens - increased for better context'
    ),
  minChunkSize: z
    .number()
    .min(50)
    .default(500)
    .describe('Minimum chunk size - increased to avoid tiny chunks'),
  preserveBoundaries: z
    .boolean()
    .default(true)
    .describe('Preserve sentence/paragraph boundaries'),
  semanticChunking: z
    .boolean()
    .default(true)
    .describe(
      'Use semantic boundaries for better context - enabled by default'
    ),
})

export type ChunkingConfig = z.infer<typeof ChunkingConfigSchema>

export interface DocumentChunk {
  id: string // e.g., "doc123_chunk_0"
  chunkIndex: number
  content: string
  startChar: number
  endChar: number
  tokenCount: number
  keywords: string[] // Key terms extracted from chunk
}

export interface ChunkingResult {
  chunks: DocumentChunk[]
  totalTokens: number
  config: ChunkingConfig
}

export class DocumentChunker {
  private config: ChunkingConfig

  constructor(config: Partial<ChunkingConfig> = {}) {
    this.config = ChunkingConfigSchema.parse(config)
  }

  /**
   * Chunk a document for government contracting context with improved semantic chunking
   */
  async chunkDocument(
    text: string,
    documentId: string
  ): Promise<ChunkingResult> {
    console.log(
      `🔧 Starting semantic chunking for document ${documentId}, text length: ${text.length}`
    )

    if (this.config.semanticChunking) {
      console.log(`🧠 Using semantic chunking...`)
      return this.semanticChunkDocument(text, documentId)
    } else {
      console.log(`📏 Using traditional character-based chunking...`)
      return this.characterBasedChunking(text, documentId)
    }
  }

  /**
   * Semantic chunking that respects document structure and meaning
   */
  private semanticChunkDocument(
    text: string,
    documentId: string
  ): ChunkingResult {
    const chunks: DocumentChunk[] = []
    let chunkIndex = 0

    // First, split by major structural boundaries
    const sections = this.splitIntoSections(text)
    console.log(`📚 Split document into ${sections.length} sections`)

    for (const section of sections) {
      const sectionChunks = this.chunkSection(section, documentId, chunkIndex)
      chunks.push(...sectionChunks)
      chunkIndex += sectionChunks.length
    }

    // Post-process to handle overlaps and ensure good chunk sizes
    const finalChunks = this.optimizeChunks(chunks, documentId)
    const totalTokens = finalChunks.reduce(
      (sum, chunk) => sum + chunk.tokenCount,
      0
    )

    console.log(
      `✅ Semantic chunking complete: ${finalChunks.length} chunks, ${totalTokens} total tokens`
    )
    finalChunks.forEach((chunk, idx) => {
      console.log(
        `  Chunk ${idx + 1}: "${chunk.content.substring(0, 80)}..." (${chunk.tokenCount} tokens, ${chunk.keywords.length} keywords)`
      )
    })

    return {
      chunks: finalChunks,
      totalTokens,
      config: this.config,
    }
  }

  /**
   * Split text into major sections based on structure
   */
  private splitIntoSections(text: string): string[] {
    const sections: string[] = []

    // Split by double newlines first (paragraph boundaries)
    const paragraphs = text.split(/\n\s*\n/)

    let currentSection = ''

    for (const paragraph of paragraphs) {
      const trimmed = paragraph.trim()
      if (!trimmed) continue

      // Check if this looks like a section header
      const isHeader = this.isSectionHeader(trimmed)

      if (isHeader && currentSection.length > 200) {
        // Start new section
        sections.push(currentSection.trim())
        currentSection = trimmed
      } else {
        // Add to current section
        if (currentSection) currentSection += '\n\n'
        currentSection += trimmed
      }
    }

    // Add final section
    if (currentSection.trim()) {
      sections.push(currentSection.trim())
    }

    return sections.filter((s) => s.length > 50) // Filter out very short sections
  }

  /**
   * Check if text looks like a section header
   */
  private isSectionHeader(text: string): boolean {
    // Remove leading/trailing whitespace and check patterns
    const clean = text.trim()

    // Common header patterns in government docs
    const headerPatterns = [
      /^\d+\.\s+/, // "1. Introduction"
      /^[A-Z][A-Z\s]{5,}$/, // "TECHNICAL REQUIREMENTS"
      /^(SECTION|Part|Chapter)\s+\d+/i, // "SECTION 1", "Part A"
      /^[A-Z]\.\s+/, // "A. Overview"
      /^\([a-z]\)\s+/, // "(a) Requirements"
      /^(Requirements|Scope|Purpose|Objective|Deliverable|Timeline|Background)/i,
    ]

    return (
      headerPatterns.some((pattern) => pattern.test(clean)) &&
      clean.length < 200
    )
  }

  /**
   * Chunk a section into appropriate sized pieces
   */
  private chunkSection(
    section: string,
    documentId: string,
    startIndex: number
  ): DocumentChunk[] {
    const chunks: DocumentChunk[] = []
    const sentences = this.splitIntoSentences(section)

    let currentChunk = ''
    let currentTokens = 0
    let chunkIndex = startIndex
    let startChar = 0

    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i]
      const sentenceTokens = this.estimateTokens(sentence)

      // If adding this sentence would exceed chunk size, finalize current chunk
      if (
        currentTokens + sentenceTokens > this.config.chunkSize &&
        currentChunk.length > 0
      ) {
        chunks.push(
          this.createChunk(
            currentChunk.trim(),
            documentId,
            chunkIndex,
            startChar,
            startChar + currentChunk.length
          )
        )

        // Start new chunk with overlap
        const overlapText = this.getOverlapText(
          currentChunk,
          this.config.overlap
        )
        currentChunk = overlapText + (overlapText ? ' ' : '') + sentence
        currentTokens = this.estimateTokens(currentChunk)
        startChar +=
          currentChunk.length - overlapText.length - (overlapText ? 1 : 0)
        chunkIndex++
      } else {
        // Add sentence to current chunk with proper spacing
        if (currentChunk) currentChunk += ' '
        currentChunk += sentence.trim()
        currentTokens += sentenceTokens
      }
    }

    // Add final chunk if it has content
    if (currentChunk.trim() && currentTokens >= this.config.minChunkSize) {
      chunks.push(
        this.createChunk(
          currentChunk.trim(),
          documentId,
          chunkIndex,
          startChar,
          startChar + currentChunk.length
        )
      )
    }

    return chunks
  }

  /**
   * Split text into sentences more intelligently
   */
  private splitIntoSentences(text: string): string[] {
    // Optimized cleaning for better embeddings while preserving meaning
    const cleanText = text
      .replace(/([a-z])([A-Z])/g, '$1 $2') // Add space between camelCase words
      .replace(/([.,:;!?])([A-Za-z])/g, '$1 $2') // Add space after punctuation if missing
      .replace(/\t+/g, ' ') // Convert tabs to single spaces
      .replace(/[ \t]{3,}/g, '  ') // Reduce excessive spaces but preserve intentional formatting
      .replace(/\n{3,}/g, '\n\n') // Normalize excessive line breaks
      .replace(/\r\n/g, '\n') // Normalize line endings
      .trim()

    // Handle common abbreviations that shouldn't split sentences
    const processedText = cleanText
      .replace(/\bU\.S\.A?\./g, 'U.S.')
      .replace(/\be\.g\./g, 'e.g.')
      .replace(/\bi\.e\./g, 'i.e.')
      .replace(/\bvs\./g, 'vs.')
      .replace(/\bMr\./g, 'Mr.')
      .replace(/\bMs\./g, 'Ms.')
      .replace(/\bDr\./g, 'Dr.')

    // More sophisticated sentence splitting
    const sentences = []
    const parts = processedText.split(/([.!?]+\s+)/)

    let currentSentence = ''
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]
      if (/[.!?]+\s+/.test(part)) {
        // This is a sentence ending
        currentSentence += part.replace(/\s+$/, '') // Remove trailing space
        if (currentSentence.trim().length > 15) {
          sentences.push(currentSentence.trim())
        }
        currentSentence = ''
      } else {
        currentSentence += part
      }
    }

    // Add any remaining text as final sentence
    if (currentSentence.trim().length > 15) {
      sentences.push(currentSentence.trim())
    }

    return sentences.filter((s) => s.length > 10)
  }

  /**
   * Get overlap text from end of chunk
   */
  private getOverlapText(text: string, targetTokens: number): string {
    if (targetTokens <= 0) return ''

    const sentences = this.splitIntoSentences(text)
    let overlap = ''
    let tokens = 0

    // Take sentences from the end until we reach target overlap
    for (let i = sentences.length - 1; i >= 0; i--) {
      const sentence = sentences[i]
      const sentenceTokens = this.estimateTokens(sentence)

      if (tokens + sentenceTokens <= targetTokens) {
        overlap = sentence + (overlap ? ' ' + overlap : '')
        tokens += sentenceTokens
      } else {
        break
      }
    }

    return overlap
  }

  /**
   * Create a document chunk with proper metadata
   */
  private createChunk(
    content: string,
    documentId: string,
    chunkIndex: number,
    startChar: number,
    endChar: number
  ): DocumentChunk {
    const tokenCount = this.estimateTokens(content)
    const keywords = this.extractKeywords(content)

    return {
      id: `${documentId}_chunk_${chunkIndex}`,
      chunkIndex,
      content,
      startChar,
      endChar,
      tokenCount,
      keywords,
    }
  }

  /**
   * Better token estimation using more realistic model
   */
  private estimateTokens(text: string): number {
    // More accurate token estimation for English text
    // GPT-style tokenizers typically have ~3.5 chars per token on average for English
    const words = text.split(/\s+/).length
    const chars = text.length

    // Use word count as primary indicator, adjusted by character density
    const tokenEstimate = Math.max(
      Math.ceil(words * 1.3), // Words * 1.3 (accounts for subword tokens)
      Math.ceil(chars / 3.5) // Character-based fallback
    )

    return tokenEstimate
  }

  /**
   * Optimize chunks by merging small ones and splitting large ones
   */
  private optimizeChunks(
    chunks: DocumentChunk[],
    documentId: string
  ): DocumentChunk[] {
    const optimized: DocumentChunk[] = []

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i]

      // If chunk is too small, try to merge with next
      if (
        chunk.tokenCount < this.config.minChunkSize &&
        i < chunks.length - 1
      ) {
        const nextChunk = chunks[i + 1]
        const combinedTokens = chunk.tokenCount + nextChunk.tokenCount

        if (combinedTokens <= this.config.chunkSize * 1.2) {
          // Merge chunks
          const mergedChunk = this.createChunk(
            chunk.content + '\n\n' + nextChunk.content,
            documentId,
            optimized.length,
            chunk.startChar,
            nextChunk.endChar
          )
          optimized.push(mergedChunk)
          i++ // Skip next chunk since we merged it
          continue
        }
      }

      // If chunk is too large, split it
      if (chunk.tokenCount > this.config.chunkSize * 1.5) {
        const splitChunks = this.splitLargeChunk(
          chunk,
          documentId,
          optimized.length
        )
        optimized.push(...splitChunks)
      } else {
        // Update chunk index
        optimized.push({
          ...chunk,
          id: `${documentId}_chunk_${optimized.length}`,
          chunkIndex: optimized.length,
        })
      }
    }

    return optimized
  }

  /**
   * Split a large chunk into smaller ones
   */
  private splitLargeChunk(
    chunk: DocumentChunk,
    documentId: string,
    startIndex: number
  ): DocumentChunk[] {
    const sentences = this.splitIntoSentences(chunk.content)
    const targetSize = this.config.chunkSize

    const subChunks: DocumentChunk[] = []
    let currentContent = ''
    let currentTokens = 0
    let chunkIndex = startIndex

    for (const sentence of sentences) {
      const sentenceTokens = this.estimateTokens(sentence)

      if (currentTokens + sentenceTokens > targetSize && currentContent) {
        subChunks.push(
          this.createChunk(
            currentContent.trim(),
            documentId,
            chunkIndex,
            chunk.startChar,
            chunk.startChar + currentContent.length
          )
        )

        currentContent = sentence
        currentTokens = sentenceTokens
        chunkIndex++
      } else {
        if (currentContent) currentContent += ' '
        currentContent += sentence
        currentTokens += sentenceTokens
      }
    }

    // Add final sub-chunk
    if (currentContent.trim()) {
      subChunks.push(
        this.createChunk(
          currentContent.trim(),
          documentId,
          chunkIndex,
          chunk.startChar,
          chunk.endChar
        )
      )
    }

    return subChunks
  }

  /**
   * Improved character-based chunking with better text formatting
   */
  private characterBasedChunking(
    text: string,
    documentId: string
  ): ChunkingResult {
    const chunks: DocumentChunk[] = []

    // Optimized cleaning for better embeddings while preserving structure
    const cleanText = text
      .replace(/([a-z])([A-Z])/g, '$1 $2') // Add space between camelCase
      .replace(/([.,:;!?])([A-Za-z])/g, '$1 $2') // Add space after punctuation if missing
      .replace(/\t+/g, ' ') // Convert tabs to single spaces
      .replace(/[ \t]{3,}/g, '  ') // Reduce excessive spaces but preserve intentional double spaces
      .replace(/\n{3,}/g, '\n\n') // Normalize excessive line breaks but preserve paragraph structure
      .replace(/\r\n/g, '\n') // Normalize line endings
      .trim()

    const chunkSize = this.config.chunkSize * 3.5 // Better chars per token estimate
    const overlapSize = this.config.overlap * 3.5
    const minSize = this.config.minChunkSize * 3.5

    let startIndex = 0
    let chunkIndex = 0

    console.log(
      `📏 Character-based chunking: textLength=${cleanText.length}, chunkSize=${chunkSize}, overlap=${overlapSize}`
    )

    while (startIndex < cleanText.length) {
      let endIndex = Math.min(startIndex + chunkSize, cleanText.length)

      // Adjust to paragraph boundary first (better than sentence)
      if (this.config.preserveBoundaries && endIndex < cleanText.length) {
        // Look for paragraph break first
        const paragraphBreak = cleanText.lastIndexOf('\n\n', endIndex)
        if (paragraphBreak > startIndex) {
          endIndex = paragraphBreak + 2
        } else {
          // Fall back to sentence boundary
          const sentenceEnd = cleanText.lastIndexOf('. ', endIndex)
          if (sentenceEnd > startIndex) {
            endIndex = sentenceEnd + 2
          } else {
            // Last resort: word boundary
            const wordBreak = cleanText.lastIndexOf(' ', endIndex)
            if (wordBreak > startIndex) {
              endIndex = wordBreak
            }
          }
        }
      }

      let chunkContent = cleanText.slice(startIndex, endIndex).trim()

      // Ensure minimum quality content
      if (
        chunkContent.length >= minSize &&
        chunkContent.split(' ').length >= 10
      ) {
        // Minimal cleanup - preserve original formatting
        chunkContent = chunkContent.trim()

        chunks.push(
          this.createChunk(
            chunkContent,
            documentId,
            chunkIndex,
            startIndex,
            endIndex
          )
        )

        console.log(
          `📝 Created chunk ${chunkIndex}: ${chunkContent.substring(0, 100)}... (${this.estimateTokens(chunkContent)} tokens)`
        )
        chunkIndex++
      }

      // Move forward with overlap, ensuring progress
      const nextStart = Math.max(
        endIndex - overlapSize,
        startIndex + Math.floor(chunkSize / 2)
      )
      startIndex = nextStart

      // Safety check to prevent infinite loops
      if (startIndex >= cleanText.length - minSize) {
        break
      }
    }

    const totalTokens = chunks.reduce((sum, chunk) => sum + chunk.tokenCount, 0)

    console.log(
      `✅ Character chunking complete: ${chunks.length} chunks, ${totalTokens} total tokens`
    )

    return {
      chunks,
      totalTokens,
      config: this.config,
    }
  }

  /**
   * Extract key terms relevant to government contracting
   */
  private extractKeywords(text: string): string[] {
    const keywords: string[] = []

    // Extract NAICS codes
    const naicsPattern = /\b\d{6}\b/g
    const naicsMatches = text.match(naicsPattern) || []
    keywords.push(...naicsMatches)

    // Extract FAR clauses and provisions (e.g., "FAR 52.212-1")
    const farPattern = /far\s+\d+\.\d+/gi
    const farMatches = text.match(farPattern) || []
    keywords.push(...farMatches.map((match) => match.toLowerCase()))

    // Extract email addresses as keywords
    const emailPattern = /@[\w.-]+\.[a-zA-Z]{2,}/g
    const emailMatches = text.match(emailPattern) || []
    keywords.push(...emailMatches.map((email) => email.toLowerCase()))

    // Extract common gov contracting terms
    const govTerms = [
      'solicitation',
      'rfp',
      'rfi',
      'rfq',
      'contract',
      'task order',
      'idiq',
      'gsa',
      'sewp',
      'cio-sp3',
      'oasis',
      'requirement',
      'deliverable',
      'performance',
      'compliance',
      'far',
      'dfars',
      'provision',
      'clause',
      'federal acquisition regulation',
      'contact',
      'point of contact',
      'poc',
      'contracting officer',
      'co',
      'cor',
      'email',
      'phone',
      'telephone',
      'address',
    ]

    const lowerText = text.toLowerCase()
    govTerms.forEach((term) => {
      if (lowerText.includes(term)) {
        keywords.push(term)
      }
    })

    // Remove duplicates and limit to 15 for better keyword coverage
    return [...new Set(keywords)].slice(0, 15)
  }
}

// Default chunker instance
export const defaultChunker = new DocumentChunker()
