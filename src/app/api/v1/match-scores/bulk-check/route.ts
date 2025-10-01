import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db'
import { redis } from '@/lib/redis'
import { z } from 'zod'

/**
 * @swagger
 * /api/v1/match-scores/bulk-check:
 *   post:
 *     summary: Check which opportunities already have cached match scores
 *     description: Returns existing match scores for opportunities to avoid recalculation
 *     tags: [Match Scores]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               opportunityIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of opportunity IDs to check for existing scores
 *     responses:
 *       200:
 *         description: Existing match scores found
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
 *                     existingScores:
 *                       type: object
 *                       description: Map of opportunity IDs to match score data
 *                     missingIds:
 *                       type: array
 *                       items:
 *                         type: string
 *                       description: Opportunity IDs that need score calculation
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const schema = z.object({
      opportunityIds: z.array(z.string()).min(1).max(100)
    })

    const { opportunityIds } = schema.parse(body)

    // Get user and profile
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      include: { profile: true }
    })

    if (!user?.profile) {
      return NextResponse.json(
        { success: false, error: 'User profile not found' },
        { status: 404 }
      )
    }

    const existingScores: Record<string, any> = {}
    const missingIds: string[] = []

    // Check Redis cache first for faster responses (simplified)
    const cachePromises = opportunityIds.map(async (oppId) => {
      try {
        // Try a simplified cache key approach
        const cacheKey = `match_score:${user.profile!.id}:simple:${oppId}`
        const cachedScore = await redis.get(cacheKey)
        
        if (cachedScore) {
          const scoreData = JSON.parse(cachedScore)
          existingScores[oppId] = {
            ...scoreData,
            isFromCache: true
          }
          return true // Found in cache
        }
      } catch (error) {
        console.warn(`Cache lookup failed for opportunity ${oppId}:`, error)
      }
      
      return false // Not found in cache
    })

    let cacheResults: boolean[] = []
    try {
      cacheResults = await Promise.all(cachePromises)
    } catch (error) {
      console.warn('Cache lookup failed, using database only:', error)
      cacheResults = opportunityIds.map(() => false)
    }

    // For opportunities not found in cache, check database
    const notInCache = opportunityIds.filter((_, index) => !cacheResults[index])
    
    if (notInCache.length > 0) {
      const dbScores = await prisma.matchScore.findMany({
        where: {
          profileId: user.profile.id,
          opportunityId: { in: notInCache },
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Only recent scores
          }
        },
        orderBy: { createdAt: 'desc' },
        distinct: ['opportunityId'], // Get latest score per opportunity
        select: {
          opportunityId: true,
          score: true,
          overallScore: true,
          factors: true,
          detailedFactors: true,
          algorithmVersion: true,
          breakdown: true,
          explanation: true
        }
      })

      // Add database scores to results
      dbScores.forEach(score => {
        existingScores[score.opportunityId] = {
          score: score.overallScore || score.score,
          factors: score.factors,
          detailedFactors: score.detailedFactors,
          algorithmVersion: score.algorithmVersion,
          breakdown: score.breakdown,
          explanation: score.explanation,
          isFromCache: false
        }
      })

      // Identify truly missing IDs
      const foundInDb = dbScores.map(s => s.opportunityId)
      notInCache.forEach(oppId => {
        if (!foundInDb.includes(oppId)) {
          missingIds.push(oppId)
        }
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        existingScores,
        missingIds,
        cacheHitCount: Object.keys(existingScores).length - missingIds.length,
        totalRequested: opportunityIds.length
      }
    })
  } catch (error) {
    console.error('Error checking bulk match scores:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to check match scores' },
      { status: 500 }
    )
  }
}