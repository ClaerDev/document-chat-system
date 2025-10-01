/**
 * @swagger
 * /api/v1/vectors/test/hybrid:
 *   post:
 *     summary: Test hybrid search functionality
 *     description: |
 *       Comprehensive test of hybrid search with different weight configurations
 *       and comparison between vector-only, keyword-only, and hybrid results.
 *       Includes detailed scoring explanations for debugging.
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
 *                 description: Test query
 *                 example: "cybersecurity compliance requirements"
 *               keywords:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Test keywords
 *                 example: ["cybersecurity", "compliance"]
 *               organizationId:
 *                 type: string
 *                 description: Organization ID for testing
 *               topK:
 *                 type: number
 *                 default: 5
 *     responses:
 *       200:
 *         description: Hybrid search test results with comparisons
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 testQuery:
 *                   type: string
 *                 testKeywords:
 *                   type: array
 *                   items:
 *                     type: string
 *                 comparisons:
 *                   type: object
 *                   properties:
 *                     vectorOnly:
 *                       type: object
 *                       properties:
 *                         results:
 *                           type: array
 *                         stats:
 *                           type: object
 *                     hybridBalanced:
 *                       type: object
 *                       properties:
 *                         results:
 *                           type: array
 *                         stats:
 *                           type: object
 *                     hybridKeywordFocused:
 *                       type: object
 *                       properties:
 *                         results:
 *                           type: array
 *                         stats:
 *                           type: object
 *                 scoringExplanations:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       documentTitle:
 *                         type: string
 *                       vectorComponent:
 *                         type: number
 *                       keywordComponent:
 *                         type: number
 *                       finalScore:
 *                         type: number
 *                       explanation:
 *                         type: array
 *                         items:
 *                           type: string
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

const testSchema = z.object({
  query: z.string().min(1, 'Query is required'),
  keywords: z.array(z.string()).default([]),
  organizationId: z.string().min(1, 'Organization ID is required'),
  topK: z.number().min(1).max(20).default(5),
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
    const validatedData = testSchema.parse(body)

    console.log('🧪 [API] Hybrid search test request:', {
      query: validatedData.query,
      keywords: validatedData.keywords,
      organizationId: validatedData.organizationId,
      topK: validatedData.topK
    })

    const searchFilters = {
      organizationId: validatedData.organizationId,
    }

    // Test 1: Vector-only search (traditional semantic search)
    console.log('🔍 Testing vector-only search...')
    const vectorOnlyResults = await defaultVectorSearch.searchSimilar(
      validatedData.query,
      searchFilters,
      {
        topK: validatedData.topK,
        hybridSearch: false
      }
    )

    // Test 2: Balanced hybrid search (70% vector, 30% keyword)
    console.log('⚖️ Testing balanced hybrid search...')
    const hybridBalancedResults = await defaultVectorSearch.hybridSearch(
      validatedData.query,
      validatedData.keywords,
      searchFilters,
      {
        topK: validatedData.topK,
        vectorWeight: 0.7,
        keywordWeight: 0.3,
      }
    )

    // Test 3: Keyword-focused hybrid search (50% vector, 50% keyword)
    console.log('🔑 Testing keyword-focused hybrid search...')
    const hybridKeywordFocusedResults = await defaultVectorSearch.hybridSearch(
      validatedData.query,
      validatedData.keywords,
      searchFilters,
      {
        topK: validatedData.topK,
        vectorWeight: 0.5,
        keywordWeight: 0.5,
      }
    )

    // Generate statistics for each approach
    const vectorOnlyStats = {
      totalResults: vectorOnlyResults.length,
      avgScore: vectorOnlyResults.length > 0 
        ? vectorOnlyResults.reduce((sum, r) => sum + r.score, 0) / vectorOnlyResults.length 
        : 0,
      topScore: vectorOnlyResults.length > 0 ? vectorOnlyResults[0].score : 0,
    }

    const hybridBalancedStats = defaultHybridSearchService.getSearchStats(hybridBalancedResults)
    const hybridKeywordFocusedStats = defaultHybridSearchService.getSearchStats(hybridKeywordFocusedResults)

    // Generate detailed scoring explanations for top results
    const scoringExplanations = hybridBalancedResults.slice(0, 3).map(result => {
      const explanation = defaultHybridSearchService.explainScoring(result, {
        vectorWeight: 0.7,
        keywordWeight: 0.3,
      })
      
      return {
        documentTitle: result.documentTitle,
        chunkIndex: result.chunkIndex,
        vectorComponent: explanation.vectorComponent,
        keywordComponent: explanation.keywordComponent,
        finalScore: explanation.finalScore,
        matchedKeywords: result.matchedKeywords,
        explanation: explanation.explanation,
      }
    })

    const response = {
      success: true,
      testQuery: validatedData.query,
      testKeywords: validatedData.keywords,
      comparisons: {
        vectorOnly: {
          results: vectorOnlyResults.map(r => ({
            documentTitle: r.documentTitle,
            chunkIndex: r.chunkIndex,
            score: r.score,
            highlights: r.highlights,
          })),
          stats: vectorOnlyStats,
        },
        hybridBalanced: {
          results: hybridBalancedResults.map(r => ({
            documentTitle: r.documentTitle,
            chunkIndex: r.chunkIndex,
            vectorScore: r.vectorScore,
            keywordScore: r.keywordScore,
            hybridScore: r.hybridScore,
            matchedKeywords: r.matchedKeywords,
            highlights: r.highlights,
          })),
          stats: hybridBalancedStats,
        },
        hybridKeywordFocused: {
          results: hybridKeywordFocusedResults.map(r => ({
            documentTitle: r.documentTitle,
            chunkIndex: r.chunkIndex,
            vectorScore: r.vectorScore,
            keywordScore: r.keywordScore,
            hybridScore: r.hybridScore,
            matchedKeywords: r.matchedKeywords,
            highlights: r.highlights,
          })),
          stats: hybridKeywordFocusedStats,
        },
      },
      scoringExplanations,
      processingTimeMs: Date.now() - startTime,
    }

    console.log('✅ [API] Hybrid search test completed:', {
      vectorOnlyResults: vectorOnlyResults.length,
      balancedResults: hybridBalancedResults.length,
      keywordFocusedResults: hybridKeywordFocusedResults.length,
      processingTime: `${Date.now() - startTime}ms`
    })

    console.log('📊 Test comparison summary:', {
      vectorOnly: {
        avgScore: vectorOnlyStats.avgScore.toFixed(3),
        topScore: vectorOnlyStats.topScore.toFixed(3),
      },
      hybridBalanced: {
        avgHybrid: hybridBalancedStats.avgHybridScore.toFixed(3),
        keywordCoverage: `${hybridBalancedStats.keywordCoverage.toFixed(1)}%`,
      },
      hybridKeywordFocused: {
        avgHybrid: hybridKeywordFocusedStats.avgHybridScore.toFixed(3),
        keywordCoverage: `${hybridKeywordFocusedStats.keywordCoverage.toFixed(1)}%`,
      },
    })

    return NextResponse.json(response)
  } catch (error) {
    console.error('❌ [API] Hybrid search test error:', error)
    
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
        error: 'Failed to perform hybrid search test',
        details: process.env.NODE_ENV === 'development' ? error instanceof Error ? error.message : 'Unknown error' : undefined
      },
      { status: 500 }
    )
  }
}