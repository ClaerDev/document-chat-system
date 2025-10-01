import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db'
import { redis } from '@/lib/redis'

/**
 * @swagger
 * /api/v1/saved-searches/prefetch:
 *   get:
 *     summary: Prefetch saved searches with cached match scores
 *     description: Returns saved searches and any cached match scores for faster page load
 *     tags: [Saved Searches]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Prefetched data including saved searches and cached match scores
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     savedSearches:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/SavedSearch'
 *                     defaultSearch:
 *                       type: object
 *                       description: The user's favorite or default search to auto-apply
 *                     cachedMatchScores:
 *                       type: object
 *                       description: Map of opportunity IDs to cached match scores
 *                     recentOpportunityIds:
 *                       type: array
 *                       items:
 *                         type: string
 *                       description: IDs of recently viewed opportunities
 *       401:
 *         description: Unauthorized
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Fetch user and organization
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      include: { 
        organization: true
      }
    })

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    console.log('Prefetch API: Starting data retrieval for user', userId)

    // Use simple caching with graceful fallback
    let savedSearches: any = null
    let cachedMatchScores: any = null
    let recentOpportunityIds: any = null

    // Try Redis cache first, but don't fail if unavailable
    try {
      const savedSearchesKey = `saved_searches:${userId}`
      const matchScoresKey = `match_scores:${userId}:recent`
      const opportunityIdsKey = `opportunities:${userId}:recent_ids`
      
      savedSearches = await redis.get(savedSearchesKey)
      cachedMatchScores = await redis.get(matchScoresKey)
      recentOpportunityIds = await redis.get(opportunityIdsKey)
      
      console.log('Prefetch API: Cache lookup completed', {
        savedSearchesCached: !!savedSearches,
        matchScoresCached: !!cachedMatchScores,
        opportunityIdsCached: !!recentOpportunityIds
      })
    } catch (error) {
      console.warn('Prefetch API: Redis unavailable, using database only:', error)
    }

    // If saved searches not in cache, fetch from DB and cache
    if (!savedSearches) {
      console.log('Prefetch API: Fetching saved searches from database')
      const dbSearches = await prisma.savedSearch.findMany({
        where: {
          OR: [
            { userId: user.id },
            {
              AND: [
                { organizationId: user.organizationId },
                { isShared: true }
              ]
            }
          ]
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true
            }
          }
        },
        orderBy: [
          { isFavorite: 'desc' },
          { isDefault: 'desc' },
          { lastUsedAt: 'desc' },
          { createdAt: 'desc' }
        ],
        take: 50
      })

      savedSearches = dbSearches
      console.log('Prefetch API: Found', dbSearches.length, 'saved searches')
      
      // Cache for 5 minutes with error handling
      try {
        if (redis.setex) {
          await redis.setex(
            `saved_searches:${userId}`,
            300,
            JSON.stringify(savedSearches)
          )
        } else {
          await redis.set(
            `saved_searches:${userId}`,
            JSON.stringify(savedSearches)
          )
        }
        console.log('Prefetch API: Cached saved searches successfully')
      } catch (error) {
        console.warn('Prefetch API: Failed to cache saved searches:', error)
      }
    } else {
      savedSearches = JSON.parse(savedSearches as string)
      console.log('Prefetch API: Using cached saved searches')
    }

    // If match scores not in cache, try to fetch recent ones from DB
    if (!cachedMatchScores) {
      // Find the user's profile
      const profile = await prisma.profile.findFirst({
        where: {
          organizationId: user.organizationId
        }
      })

      if (profile) {
        console.log('Prefetch API: Fetching match scores from database')
        const recentScores = await prisma.matchScore.findMany({
          where: {
            profileId: profile.id,
            createdAt: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days for better coverage
            }
          },
        orderBy: { createdAt: 'desc' },
        take: 200, // Get more scores for better cache coverage
        select: {
          opportunityId: true,
          overallScore: true,
          confidence: true,
          factors: true,
          detailedFactors: true,
          algorithmVersion: true,
          pastPerformanceScore: true,
          technicalCapabilityScore: true,
          strategicFitRelationshipsScore: true,
          credibilityMarketPresenceScore: true,
          semanticAnalysis: true,
          strategicInsights: true,
          recommendations: true
        }
      })
      console.log('Prefetch API: Found', recentScores.length, 'recent match scores')

      // Convert to map format
      const scoresMap: Record<string, any> = {}
      recentScores.forEach(score => {
        scoresMap[score.opportunityId] = {
          score: score.overallScore,
          overallScore: score.overallScore,
          confidence: score.confidence,
          factors: score.factors,
          detailedFactors: score.detailedFactors,
          algorithmVersion: score.algorithmVersion,
          pastPerformanceScore: score.pastPerformanceScore,
          technicalCapabilityScore: score.technicalCapabilityScore,
          strategicFitRelationshipsScore: score.strategicFitRelationshipsScore,
          credibilityMarketPresenceScore: score.credibilityMarketPresenceScore,
          semanticAnalysis: score.semanticAnalysis,
          strategicInsights: score.strategicInsights,
          recommendations: score.recommendations,
          isFromCache: true // Mark as cached for UI
        }
      })

      cachedMatchScores = scoresMap

      // Cache for 30 minutes (matches our standard cache TTL)
      try {
        if (redis.setex) {
          await redis.setex(
            `match_scores:${userId}:recent`,
            1800,
            JSON.stringify(cachedMatchScores)
          )
        } else {
          await redis.set(
            `match_scores:${userId}:recent`,
            JSON.stringify(cachedMatchScores)
          )
        }
        console.log('Prefetch API: Cached match scores successfully')
      } catch (error) {
        console.warn('Prefetch API: Failed to cache match scores:', error)
      }
      }
    } else if (cachedMatchScores) {
      cachedMatchScores = JSON.parse(cachedMatchScores as string)
    }

    // Find the default search to auto-apply
    const searchesArray = Array.isArray(savedSearches) ? savedSearches : []
    const defaultSearch = searchesArray.find((s: any) => s.isFavorite) || 
                         searchesArray.find((s: any) => s.isDefault)
    
    if (defaultSearch) {
      console.log('Prefetch API: Default search found:', {
        name: defaultSearch.name,
        filters: defaultSearch.filters,
        filterType: typeof defaultSearch.filters,
        isJsonb: defaultSearch.filters instanceof Object
      })
    }

    const responseData = {
      savedSearches: searchesArray,
      defaultSearch,
      cachedMatchScores: cachedMatchScores || {},
      recentOpportunityIds: recentOpportunityIds ? JSON.parse(recentOpportunityIds as string) : []
    }

    console.log('Prefetch API: Returning data', {
      savedSearchesCount: searchesArray.length,
      hasDefaultSearch: !!defaultSearch,
      cachedScoresCount: Object.keys(cachedMatchScores || {}).length
    })

    return NextResponse.json({
      success: true,
      data: responseData
    })
  } catch (error) {
    console.error('Error prefetching saved searches:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to prefetch data' },
      { status: 500 }
    )
  }
}