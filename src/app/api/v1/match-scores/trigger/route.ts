/**
 * @swagger
 * /api/v1/match-scores/trigger:
 *   post:
 *     tags: [Match Scores]
 *     summary: Trigger background match score calculation via Inngest
 *     description: |\
 *       Queue match score calculations for background processing to prevent credit waste
 *       and improve user experience. Uses Inngest for reliable background processing.
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [opportunityIds]
 *             properties:
 *               opportunityIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 minItems: 1
 *                 maxItems: 50
 *                 description: Array of opportunity IDs to calculate match scores for
 *                 example: ["rt_1", "rt_2", "rt_3"]
 *               opportunities:
 *                 type: object
 *                 description: Optional map of opportunity ID to opportunity data for real-time opportunities
 *               profileId:
 *                 type: string
 *                 description: Optional profile ID to use for scoring
 *               method:
 *                 type: string
 *                 enum: [calculation, llm, hybrid]
 *                 default: llm
 *                 description: Scoring method to use
 *               useAdvancedAnalysis:
 *                 type: boolean
 *                 default: true
 *                 description: Enable advanced LLM analysis
 *     responses:
 *       200:
 *         description: Match score calculation queued successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Match score calculations queued for background processing"
 *                 data:
 *                   type: object
 *                   properties:
 *                     batchId:
 *                       type: string
 *                     queuedCount:
 *                       type: integer
 *                     estimatedCompletionTime:
 *                       type: string
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { inngest } from '@/lib/inngest/client'
import { withRateLimit, rateLimitConfigs } from '@/lib/rate-limit'
import { withApiTracking } from '@/lib/api-tracking'
import { asyncHandler } from '@/lib/api-errors'
import { v4 as uuidv4 } from 'uuid'

const TriggerMatchScoreSchema = z.object({
  opportunityIds: z.array(z.string()).min(1).max(50).describe("Array of opportunity IDs to score"),
  opportunities: z.record(z.any()).optional().describe("Opportunity data for real-time opportunities"),
  profileId: z.string().optional().describe("Profile ID to use for scoring"),
  method: z.enum(['calculation', 'llm', 'hybrid']).default('llm').describe("Scoring method"),
  useAdvancedAnalysis: z.boolean().default(true).describe("Enable advanced analysis"),
})

// POST /api/v1/match-scores/trigger - Queue match score calculations
async function handlePOST(request: NextRequest) {
  return withRateLimit(rateLimitConfigs.api, 'match-scores-trigger')(request, async () => {
    // Check authentication
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Unauthorized. Please sign in to trigger match score calculations.' 
      }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = TriggerMatchScoreSchema.parse(body)
    
    console.log(`🚀 [Trigger] Match score calculation request:`, {
      userId,
      opportunityCount: validatedData.opportunityIds.length,
      method: validatedData.method,
      useAdvancedAnalysis: validatedData.useAdvancedAnalysis
    })

    // Get the authenticated user's organization
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      include: { organization: true }
    })

    if (!user) {
      return NextResponse.json({ 
        success: false, 
        error: 'User not found. Please complete your account setup.' 
      }, { status: 404 })
    }

    // Get the user's organization profile
    const profile = await prisma.profile.findFirst({
      where: {
        organizationId: user.organizationId,
        deletedAt: null
      }
    })

    if (!profile) {
      return NextResponse.json({ 
        success: false, 
        error: 'Profile not found. Please create a profile first.',
        message: 'A company profile is required to calculate match scores. Please complete your profile setup in the Profile section.'
      }, { status: 404 })
    }

    try {
      // Generate batch ID for tracking
      const batchId = uuidv4()
      
      // Trigger batch processing via Inngest
      const result = await inngest.send({
        name: "match-score/batch.requested",
        data: {
          batchId,
          opportunityIds: validatedData.opportunityIds,
          organizationId: user.organizationId,
          userId: userId, // Pass the Clerk ID, not the database ID
          profileId: validatedData.profileId || profile.id,
          opportunities: validatedData.opportunities || {},
          method: validatedData.method,
          useAdvancedAnalysis: validatedData.useAdvancedAnalysis
        }
      })

      console.log(`✅ [Trigger] Batch scoring queued:`, {
        batchId,
        eventId: result.ids[0],
        opportunityCount: validatedData.opportunityIds.length
      })

      // Estimate completion time based on opportunity count and method
      const baseTimePerOpportunity = validatedData.method === 'llm' ? 10 : 3 // seconds
      const estimatedSeconds = validatedData.opportunityIds.length * baseTimePerOpportunity
      const estimatedCompletion = new Date(Date.now() + estimatedSeconds * 1000).toISOString()

      return NextResponse.json({
        success: true,
        message: `Match score calculations queued for background processing`,
        data: {
          batchId,
          eventId: result.ids[0],
          queuedCount: validatedData.opportunityIds.length,
          estimatedCompletionTime: estimatedCompletion,
          method: validatedData.method,
          useAdvancedAnalysis: validatedData.useAdvancedAnalysis
        }
      })

    } catch (error) {
      console.error('❌ [Trigger] Failed to queue match score calculations:', error)
      
      return NextResponse.json({
        success: false,
        error: 'Failed to queue match score calculations',
        details: error.message
      }, { status: 500 })
    }
  })
}

export const POST = withApiTracking(asyncHandler(handlePOST))