/**
 * @swagger
 * /api/v1/vectors/search/hybrid:
 *   post:
 *     summary: Perform hybrid vector and keyword search
 *     description: |
 *       Combines vector similarity search with BM25-style keyword relevance scoring
 *       for optimal search results. Uses weighted score fusion to balance semantic
 *       similarity with exact keyword matches.
 *     tags: [Vectors]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - query
 *               - organizationId
 *             properties:
 *               query:
 *                 type: string
 *                 description: Search query text
 *                 example: "cybersecurity requirements for government contracts"
 *               keywords:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Additional keywords to boost relevance
 *                 example: ["cybersecurity", "compliance", "NIST"]
 *               organizationId:
 *                 type: string
 *                 description: Organization ID to filter results
 *               documentId:
 *                 type: string
 *                 description: Optional document ID to search within
 *               documentTypes:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Filter by document types
 *                 example: ["SOLICITATION", "CONTRACT"]
 *               topK:
 *                 type: number
 *                 description: Maximum number of results to return
 *                 default: 10
 *                 minimum: 1
 *                 maximum: 100
 *               minScore:
 *                 type: number
 *                 description: Minimum similarity score threshold
 *                 default: 0.1
 *                 minimum: 0
 *                 maximum: 1
 *               vectorWeight:
 *                 type: number
 *                 description: Weight for vector similarity score (0-1)
 *                 default: 0.7
 *                 minimum: 0
 *                 maximum: 1
 *               keywordWeight:
 *                 type: number
 *                 description: Weight for keyword relevance score (0-1)
 *                 default: 0.3
 *                 minimum: 0
 *                 maximum: 1
 *     responses:
 *       200:
 *         description: Hybrid search results with fused scores
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 query:
 *                   type: string
 *                 keywords:
 *                   type: array
 *                   items:
 *                     type: string
 *                 results:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       documentId:
 *                         type: string
 *                       documentTitle:
 *                         type: string
 *                       chunkId:
 *                         type: string
 *                       chunkIndex:
 *                         type: number
 *                       chunkText:
 *                         type: string
 *                       score:
 *                         type: number
 *                         description: Final hybrid score
 *                       vectorScore:
 *                         type: number
 *                         description: Original vector similarity score
 *                       keywordScore:
 *                         type: number
 *                         description: BM25 keyword relevance score
 *                       hybridScore:
 *                         type: number
 *                         description: Weighted combination of vector and keyword scores
 *                       matchedKeywords:
 *                         type: array
 *                         items:
 *                           type: string
 *                         description: Keywords that matched in this result
 *                       highlights:
 *                         type: array
 *                         items:
 *                           type: string
 *                         description: Highlighted matching phrases
 *                 stats:
 *                   type: object
 *                   properties:
 *                     totalResults:
 *                       type: number
 *                     avgVectorScore:
 *                       type: number
 *                     avgKeywordScore:
 *                       type: number
 *                     avgHybridScore:
 *                       type: number
 *                     keywordCoverage:
 *                       type: number
 *                       description: Percentage of results with keyword matches
 *                 processingTimeMs:
 *                   type: number
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { defaultVectorSearch } from '@/lib/ai/services/vector-search'
import { defaultHybridSearchService } from '@/lib/ai/services/hybrid-search'
import { z } from 'zod'

const hybridSearchSchema = z.object({
  query: z.string().min(1, 'Query is required'),
  keywords: z.array(z.string()).default([]),
  organizationId: z.string().min(1, 'Organization ID is required'),
  documentId: z.string().optional(),
  documentTypes: z.array(z.string()).optional(),
  topK: z.number().min(1).max(100).default(10),
  minScore: z.number().min(0).max(1).default(0.1),
  vectorWeight: z.number().min(0).max(1).default(0.7),
  keywordWeight: z.number().min(0).max(1).default(0.3),
})

export async function POST(request: NextRequest) {
  try {
    const startTime = Date.now()
    
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const validatedData = hybridSearchSchema.parse(body)

    // Validate weights sum to 1.0
    const weightSum = validatedData.vectorWeight + validatedData.keywordWeight
    if (Math.abs(weightSum - 1.0) > 0.01) {
      return NextResponse.json(
        { error: `Vector and keyword weights must sum to 1.0, got ${weightSum}` },
        { status: 400 }
      )
    }

    console.log('🔀 [API] Hybrid search request:', {
      query: validatedData.query.substring(0, 50) + '...',
      keywords: validatedData.keywords,
      organizationId: validatedData.organizationId,
      weights: `${validatedData.vectorWeight}/${validatedData.keywordWeight}`,
      topK: validatedData.topK
    })

    // Perform hybrid search
    const hybridResults = await defaultVectorSearch.hybridSearch(
      validatedData.query,
      validatedData.keywords,
      {
        organizationId: validatedData.organizationId,
        documentId: validatedData.documentId,
        documentTypes: validatedData.documentTypes,
      },
      {
        topK: validatedData.topK,
        minScore: validatedData.minScore,
        vectorWeight: validatedData.vectorWeight,
        keywordWeight: validatedData.keywordWeight,
      }
    )

    // Get search statistics
    const stats = defaultHybridSearchService.getSearchStats(hybridResults)

    const response = {
      success: true,
      query: validatedData.query,
      keywords: validatedData.keywords,
      results: hybridResults,
      stats,
      processingTimeMs: Date.now() - startTime,
    }

    console.log('✅ [API] Hybrid search completed:', {
      results: hybridResults.length,
      keywordCoverage: `${stats.keywordCoverage.toFixed(1)}%`,
      avgScores: {
        vector: stats.avgVectorScore.toFixed(3),
        keyword: stats.avgKeywordScore.toFixed(3),
        hybrid: stats.avgHybridScore.toFixed(3)
      },
      processingTime: `${Date.now() - startTime}ms`
    })

    return NextResponse.json(response)
  } catch (error) {
    console.error('❌ [API] Hybrid search error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Invalid request data',
          details: error.errors
        },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to perform hybrid search',
        details: process.env.NODE_ENV === 'development' ? error instanceof Error ? error.message : 'Unknown error' : undefined
      },
      { status: 500 }
    )
  }
}