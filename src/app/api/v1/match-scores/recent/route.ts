/**
 * @swagger
 * /api/v1/match-scores/recent:
 *   get:
 *     tags: [Match Scores]
 *     summary: Get recent match scores for fallback polling
 *     description: Returns recently calculated match scores for the authenticated user's organization
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Recent match scores retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       opportunityId:
 *                         type: string
 *                       score:
 *                         type: number
 *                       factors:
 *                         type: object
 *                       detailedFactors:
 *                         type: object
 *                       algorithmVersion:
 *                         type: string
 *                       confidence:
 *                         type: number
 *       401:
 *         description: Unauthorized
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db'
import { withRateLimit, rateLimitConfigs } from '@/lib/rate-limit'
import { withApiTracking } from '@/lib/api-tracking'
import { asyncHandler } from '@/lib/api-errors'

// GET /api/v1/match-scores/recent - Get recent match scores
async function handleGET(request: NextRequest) {
  return withRateLimit(rateLimitConfigs.api, 'match-scores-recent')(request, async () => {
    // Check authentication
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Unauthorized. Please sign in to access recent match scores.' 
      }, { status: 401 })
    }

    // Get the authenticated user's organization
    const user = await prisma.user.findUnique({
      where: { clerkId: userId }
    })

    if (!user) {
      return NextResponse.json({ 
        success: false, 
        error: 'User not found. Please complete your account setup.' 
      }, { status: 404 })
    }

    try {
      console.log(`🔍 [Recent] Checking recent scores for organization: ${user.organizationId}`)
      
      // Get all recent match scores (last 24 hours to load existing scores)
      const recentScores = await prisma.matchScore.findMany({
        where: {
          organizationId: user.organizationId,
          createdAt: {
            gte: new Date(Date.now() - 86400000) // Last 24 hours
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 500 // Get more scores for larger datasets
      })

      console.log(`📊 [Recent] Found ${recentScores.length} recent scores`)

      const scoresData = recentScores.map(score => ({
        opportunityId: score.opportunityId,
        score: Number(score.overallScore),
        confidence: Number(score.confidence),
        algorithmVersion: score.algorithmVersion,
        factors: score.factors,
        detailedFactors: score.detailedFactors
      }))

      return NextResponse.json({
        success: true,
        data: scoresData
      })

    } catch (error) {
      console.error('❌ [Recent] Failed to fetch recent match scores:', error)
      
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch recent match scores'
      }, { status: 500 })
    }
  })
}

export const GET = withApiTracking(asyncHandler(handleGET))