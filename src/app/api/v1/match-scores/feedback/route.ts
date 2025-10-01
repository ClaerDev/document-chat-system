/**
 * @swagger
 * /api/v1/match-scores/feedback:
 *   post:
 *     tags: [Match Scores]
 *     summary: Submit user feedback for match score quality
 *     description: |
 *       Allows users to provide feedback on match score accuracy and usefulness.
 *       This helps improve the scoring algorithm through user validation.
 *       
 *       Feedback is stored in the MatchScore table and can be used for:
 *       - Algorithm improvement and validation
 *       - User satisfaction tracking
 *       - Quality assurance metrics
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [feedbackType]
 *             properties:
 *               matchScoreId:
 *                 type: string
 *                 description: ID of the match score record
 *                 example: "clm1234567890"
 *               opportunityId:
 *                 type: string
 *                 description: ID of the opportunity being scored
 *                 example: "opp123"
 *               feedbackType:
 *                 type: string
 *                 enum: [POSITIVE, NEGATIVE]
 *                 description: Type of feedback (positive or negative)
 *                 example: "POSITIVE"
 *               comment:
 *                 type: string
 *                 description: Optional detailed feedback comment
 *                 example: "The score accurately reflected our capabilities"
 *               rating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *                 description: User rating from 1-5
 *                 example: 4
 *               metadata:
 *                 type: object
 *                 description: Additional metadata about the feedback context
 *                 properties:
 *                   score:
 *                     type: number
 *                     description: The match score that was rated
 *                   algorithmVersion:
 *                     type: string
 *                     description: Version of algorithm used
 *                   userAgent:
 *                     type: string
 *                     description: User's browser information
 *                   timestamp:
 *                     type: string
 *                     format: date-time
 *                     description: When feedback was provided
 *           examples:
 *             positive_feedback:
 *               summary: Positive feedback example
 *               value:
 *                 matchScoreId: "clm1234567890"
 *                 opportunityId: "opp123"
 *                 feedbackType: "POSITIVE"
 *                 comment: "Very accurate assessment of our competitiveness"
 *                 rating: 5
 *                 metadata:
 *                   score: 87
 *                   algorithmVersion: "v5.0-llm"
 *             negative_feedback:
 *               summary: Negative feedback example
 *               value:
 *                 feedbackType: "NEGATIVE"
 *                 comment: "Score seems too low given our qualifications"
 *                 rating: 2
 *     responses:
 *       200:
 *         description: Feedback submitted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required: [success, message]
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Feedback submitted successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     feedbackId:
 *                       type: string
 *                       description: ID of the created/updated feedback record
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         description: Match score record not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db'
import { handleApiError, asyncHandler, commonErrors } from '@/lib/api-errors'
import { withRateLimit, rateLimitConfigs } from '@/lib/rate-limit'
import { withApiTracking } from '@/lib/api-tracking'
import { crudAuditLogger } from '@/lib/audit/crud-audit-logger'

// Validation schema for feedback submission
const FeedbackSchema = z.object({
  matchScoreId: z.string().optional().describe("ID of the specific match score record"),
  opportunityId: z.string().optional().describe("ID of the opportunity that was scored"),
  feedbackType: z.enum(['POSITIVE', 'NEGATIVE']).describe("Type of user feedback"),
  comment: z.string().optional().describe("Optional detailed feedback comment"),
  rating: z.number().int().min(1).max(5).optional().describe("User rating from 1-5"),
  metadata: z.object({
    score: z.number().optional().describe("The match score that was rated"),
    algorithmVersion: z.string().optional().describe("Algorithm version used"),
    userAgent: z.string().optional().describe("User's browser information"),
    timestamp: z.string().optional().describe("Timestamp when feedback was provided")
  }).optional().describe("Additional context metadata")
})

// POST /api/v1/match-scores/feedback - Submit feedback for match score quality
async function handlePOST(request: NextRequest) {
  return withRateLimit(rateLimitConfigs.api, 'match-score-feedback')(request, async () => {
    // Check authentication
    const { userId } = await auth()
    
    if (!userId) {
      throw commonErrors.unauthorized()
    }

    // Get user and organization
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      include: { organization: true }
    })

    if (!user) {
      throw commonErrors.notFound('User')
    }

    // Parse and validate request body
    const body = await request.json()
    const validatedData = FeedbackSchema.parse(body)

    console.log('📝 Match score feedback submission:', {
      userId: user.id,
      organizationId: user.organizationId,
      feedbackType: validatedData.feedbackType,
      hasComment: !!validatedData.comment,
      rating: validatedData.rating,
      matchScoreId: validatedData.matchScoreId,
      opportunityId: validatedData.opportunityId
    })

    let matchScore = null
    let feedbackId = null

    // Try to find the specific match score record to update
    if (validatedData.matchScoreId) {
      matchScore = await prisma.matchScore.findFirst({
        where: {
          id: validatedData.matchScoreId,
          organizationId: user.organizationId
        }
      })
    } else if (validatedData.opportunityId) {
      // Find the most recent match score for this opportunity
      matchScore = await prisma.matchScore.findFirst({
        where: {
          opportunityId: validatedData.opportunityId,
          organizationId: user.organizationId
        },
        orderBy: { createdAt: 'desc' }
      })
    }

    if (matchScore) {
      // Update existing match score record with feedback
      const updatedMatchScore = await prisma.matchScore.update({
        where: { id: matchScore.id },
        data: {
          userFeedback: validatedData.feedbackType.toLowerCase(),
          feedbackComment: validatedData.comment || null,
          userRating: validatedData.rating || null,
          updatedAt: new Date()
        }
      })
      
      feedbackId = updatedMatchScore.id
      console.log('✅ Updated match score record with feedback:', feedbackId)
    } else {
      console.log('⚠️ No match score record found to update, feedback will be logged for analytics')
    }

    // Log the feedback for analytics and algorithm improvement
    try {
      await crudAuditLogger.logAIOperation(
        'CREATE',
        feedbackId || 'unknown',
        `Match Score Feedback: ${validatedData.feedbackType}`,
        user.name || user.email,
        validatedData.metadata?.score || 0,
        validatedData.metadata?.algorithmVersion || 'user-feedback',
        {
          feedbackType: validatedData.feedbackType,
          comment: validatedData.comment,
          rating: validatedData.rating,
          matchScoreId: validatedData.matchScoreId,
          opportunityId: validatedData.opportunityId,
          endpoint: '/api/v1/match-scores/feedback',
          method: 'POST',
          userAgent: validatedData.metadata?.userAgent,
          isAIDecision: false, // This is user feedback, not AI decision
          model: 'user-feedback',
          opportunityTitle: `Feedback for opportunity ${validatedData.opportunityId || 'unknown'}`,
          metadata: validatedData.metadata
        }
      )
    } catch (auditError) {
      console.error('Failed to log feedback audit trail:', auditError)
      // Don't fail the request if audit logging fails
    }

    return NextResponse.json({
      success: true,
      message: 'Feedback submitted successfully',
      data: {
        feedbackId: feedbackId || 'logged',
        acknowledged: true
      }
    })
  })
}

export const POST = withApiTracking(asyncHandler(handlePOST))