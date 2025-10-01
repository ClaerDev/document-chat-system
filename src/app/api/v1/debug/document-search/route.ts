/**
 * Debug API for analyzing document content and search pipeline
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { defaultVectorSearch } from '@/lib/ai/services/vector-search'

const DebugSearchSchema = z.object({
  documentId: z.string().describe('Document ID to debug'),
  query: z.string().describe('Search query to test'),
  minScore: z.number().min(0).max(1).default(0.1).describe('Minimum similarity score'),
  topK: z.number().min(1).max(50).default(20).describe('Number of results to return'),
})

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { documentId, query, minScore, topK } = DebugSearchSchema.parse(body)

    // Get user's organization
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { organizationId: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get document with full details
    const document = await prisma.document.findFirst({
      where: {
        id: documentId,
        organizationId: user.organizationId,
        deletedAt: null
      }
    })

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    console.log('🔍 [DEBUG] Document analysis starting...')
    console.log('📄 [DEBUG] Document metadata:', {
      id: document.id,
      name: document.name,
      documentType: document.documentType,
      tags: document.tags,
      naicsCodes: document.naicsCodes,
      extractedTextLength: document.extractedText?.length || 0,
      hasEmbeddings: !!document.embeddings
    })

    // Analyze extracted text content
    const textAnalysis = analyzeTextContent(document.extractedText, query)
    
    // Analyze document embeddings
    const embeddingsAnalysis = analyzeEmbeddings(document.embeddings)

    // Perform actual search
    const searchResults = await defaultVectorSearch.searchSimilar(
      query,
      {
        organizationId: user.organizationId,
        documentId: documentId
      },
      {
        topK: topK,
        minScore: minScore,
        includeMetadata: true,
        rerank: false
      }
    )

    console.log('🔍 [DEBUG] Search results:', searchResults.length, 'matches found')

    // Perform search with very low threshold to see what's available
    const lowThresholdResults = await defaultVectorSearch.searchSimilar(
      query,
      {
        organizationId: user.organizationId,
        documentId: documentId
      },
      {
        topK: topK,
        minScore: 0.05, // Very low threshold
        includeMetadata: true,
        rerank: false
      }
    )

    console.log('🔍 [DEBUG] Low threshold results:', lowThresholdResults.length, 'matches found')

    return NextResponse.json({
      success: true,
      debug: {
        document: {
          id: document.id,
          name: document.name,
          documentType: document.documentType,
          tags: document.tags,
          naicsCodes: document.naicsCodes,
          extractedTextLength: document.extractedText?.length || 0,
          hasEmbeddings: !!document.embeddings
        },
        textAnalysis,
        embeddingsAnalysis,
        searchAnalysis: {
          query: query,
          minScore: minScore,
          topK: topK,
          standardResults: searchResults.length,
          lowThresholdResults: lowThresholdResults.length,
          standardMatches: searchResults.slice(0, 5).map(r => ({
            chunkIndex: r.chunkIndex,
            score: r.score,
            preview: r.chunkText.substring(0, 200) + '...',
            keywords: r.metadata.keywords
          })),
          lowThresholdMatches: lowThresholdResults.slice(0, 10).map(r => ({
            chunkIndex: r.chunkIndex,
            score: r.score,
            preview: r.chunkText.substring(0, 200) + '...',
            keywords: r.metadata.keywords
          }))
        }
      }
    })

  } catch (error) {
    console.error('Debug endpoint error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

function analyzeTextContent(extractedText: string | null, query: string) {
  if (!extractedText) {
    return {
      hasText: false,
      length: 0,
      containsQuery: false,
      relatedTerms: []
    }
  }

  const queryLower = query.toLowerCase()
  const textLower = extractedText.toLowerCase()
  
  // Look for query terms
  const containsQuery = textLower.includes(queryLower)
  
  // Look for related government contracting terms
  const govTerms = [
    'far', 'far provision', 'federal acquisition regulation',
    'clause', 'provision', 'requirements', 'solicitation',
    'contract', 'contractor', 'government', 'federal',
    'cfr', 'code of federal regulations',
    'name', 'email', 'phone', 'contact', 'point of contact',
    'poc', 'contracting officer', 'co', 'cor',
    'address', 'telephone', 'fax'
  ]
  
  const foundTerms = govTerms.filter(term => textLower.includes(term))
  
  // Look for specific patterns
  const patterns = {
    farClause: /far\s+\d+\.\d+/gi,
    farProvision: /far\s+provision\s+\d+\.\d+/gi,
    emailPattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi,
    phonePattern: /\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/gi,
    clausePattern: /clause\s+\d+\.\d+/gi
  }
  
  const patternMatches: any = {}
  Object.entries(patterns).forEach(([key, pattern]) => {
    const matches = extractedText.match(pattern)
    patternMatches[key] = matches || []
  })
  
  return {
    hasText: true,
    length: extractedText.length,
    containsQuery: containsQuery,
    relatedTerms: foundTerms,
    patternMatches: patternMatches,
    preview: extractedText.substring(0, 1000) + (extractedText.length > 1000 ? '...' : '')
  }
}

function analyzeEmbeddings(embeddings: any) {
  if (!embeddings) {
    return {
      hasEmbeddings: false,
      chunksCount: 0
    }
  }

  const chunks = embeddings.chunks || []
  
  return {
    hasEmbeddings: true,
    chunksCount: chunks.length,
    model: embeddings.model,
    dimensions: embeddings.dimensions,
    lastProcessed: embeddings.lastProcessed,
    sampleChunks: chunks.slice(0, 3).map((chunk: any) => ({
      id: chunk.id,
      chunkIndex: chunk.chunkIndex,
      keywords: chunk.keywords
    }))
  }
}