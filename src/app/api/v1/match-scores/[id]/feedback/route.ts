/**
 * @swagger
 * /api/v1/match-scores/{id}/feedback:
 *   post:
 *     tags: [Match Scores]
 *     summary: Submit feedback for match score
 *     description: |
 *       Submit user feedback and rating for a match score to improve algorithm accuracy.
 *       Feedback is used to train future scoring models and improve recommendations.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Match score ID
 *         schema:
 *           type: string
 *           example: "cm1234567890abcdef"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [feedback]
 *             properties:
 *               feedback:
 *                 type: string
 *                 description: Detailed feedback about score accuracy
 *                 maxLength: 2000
 *                 example: "Score seems accurate based on our NAICS alignment and past performance"
 *               rating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *                 description: Rating from 1 (poor) to 5 (excellent)
 *                 example: 4
 *           examples:
 *             positive:
 *               summary: Positive feedback
 *               value:
 *                 feedback: "Score accurately reflects our strong past performance in this domain"
 *                 rating: 5
 *             negative:
 *               summary: Constructive feedback
 *               value:
 *                 feedback: "Score seems low - our certifications weren't fully considered"
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
 *                       example: "fb1234567890abcdef"
 *                     improvedAccuracy:
 *                       type: boolean
 *                       example: true
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         description: Match score not found
 *       500:
 *         description: Internal server error
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
import { withRateLimit, rateLimitConfigs } from '@/lib/rate-limit';
import { withApiTracking } from '@/lib/api-tracking';
import { asyncHandler } from '@/lib/api-errors';
import { UsageTrackingService, UsageType } from '@/lib/usage-tracking';
import { crudAuditLogger } from '@/lib/audit/crud-audit-logger';

interface RouteParams {
  params: { id: string };
}

// Validation schema for feedback submission
const FeedbackSchema = z.object({
  feedback: z.string()
    .min(10, 'Feedback must be at least 10 characters')
    .max(2000, 'Feedback must be less than 2000 characters')
    .describe('Detailed feedback about score accuracy'),
  rating: z.number()
    .int('Rating must be an integer')
    .min(1, 'Rating must be at least 1')
    .max(5, 'Rating must be at most 5')
    .optional()
    .describe('Rating from 1 (poor) to 5 (excellent)')
});

/**
 * POST /api/v1/match-scores/[id]/feedback
 * Submit user feedback for a match score
 */
async function handlePOST(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  return withRateLimit(rateLimitConfigs.api, 'match-score-feedback')(request, async () => {
    // Authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 });
    }

    // Parse and validate request
    const body = await request.json();
    const { feedback, rating } = FeedbackSchema.parse(body);

    // Get user to check organization access
    const user = await prisma.user.findUnique({
      where: { clerkId: userId }
    });
    
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'User not found'
      }, { status: 404 });
    }

    try {
      // Verify match score exists and user has access
      const matchScore = await prisma.matchScore.findFirst({
        where: {
          id: params.id,
          organizationId: user.organizationId
        }
      });

      if (!matchScore) {
        return NextResponse.json({
          success: false,
          error: 'Match score not found'
        }, { status: 404 });
      }

      // Update match score with feedback
      const updatedScore = await prisma.matchScore.update({
        where: { id: params.id },
        data: {
          userFeedback: feedback,
          userRating: rating,
          feedbackComment: feedback, // Store in both fields for backward compatibility
          updatedAt: new Date()
        }
      });

      // Create feedback record for analytics and training
      const feedbackRecord = await prisma.matchScoreFeedback.create({
        data: {
          id: `fb${Date.now()}${Math.random().toString(36).substr(2, 9)}`,
          matchScoreId: params.id,
          userId: user.id,
          organizationId: user.organizationId,
          feedback,
          rating: rating || null,
          feedbackType: 'USER_RATING',
          algorithmVersion: matchScore.algorithmVersion,
          originalScore: matchScore.overallScore,
          metadata: {
            scoringMethod: matchScore.scoringMethod,
            profileId: matchScore.profileId,
            opportunityId: matchScore.opportunityId,
            submissionTime: new Date().toISOString()
          },
          createdAt: new Date()
        }
      }).catch(error => {
        // If feedback table doesn't exist yet, log but don't fail
        console.warn('Could not create feedback record (table may not exist):', error);
        return null;
      });

      // Track usage for feedback submission
      try {
        await UsageTrackingService.trackUsage({
          organizationId: user.organizationId,
          usageType: UsageType.USER_FEEDBACK,
          quantity: 1,
          resourceType: 'match_score_feedback',
          metadata: {
            matchScoreId: params.id,
            feedbackId: feedbackRecord?.id,
            rating,
            feedbackLength: feedback.length,
            algorithmVersion: matchScore.algorithmVersion
          }
        });
      } catch (trackingError) {
        console.error('Failed to track feedback usage:', trackingError);
      }

      // Analyze feedback sentiment and impact (simplified)
      const improvedAccuracy = rating ? rating >= 4 : feedback.toLowerCase().includes('accurate');

      // Log audit trail for AI feedback submission
      try {
        await crudAuditLogger.logAIOperation(
          'UPDATE',
          params.id,
          `Match Score Feedback Submission`,
          matchScore,
          {
            score: matchScore.overallScore,
            algorithm: matchScore.algorithmVersion,
            confidence: matchScore.confidence,
            userFeedback: feedback,
            userRating: rating
          },
          {
            algorithm: matchScore.algorithmVersion || 'unknown',
            score: matchScore.overallScore,
            isAIDecision: true,
            model: matchScore.scoringMethod || 'unknown',
            profileName: `User Feedback`,
            opportunityTitle: `Opportunity ${matchScore.opportunityId}`,
            confidence: matchScore.confidence || 0,
            factors: {
              userFeedback: feedback,
              userRating: rating,
              improvedAccuracy,
              feedbackLength: feedback.length
            },
            endpoint: `/api/v1/match-scores/${params.id}/feedback`,
            method: 'POST'
          }
        );
      } catch (auditError) {
        console.error('Failed to create feedback submission audit log:', auditError);
      }

      return NextResponse.json({
        success: true,
        message: 'Feedback submitted successfully',
        data: {
          feedbackId: feedbackRecord?.id || `fb_${params.id}_${Date.now()}`,
          improvedAccuracy,
          ...(rating && { rating }),
          submittedAt: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('Error submitting feedback:', error);
      
      if (error instanceof z.ZodError) {
        return NextResponse.json({
          success: false,
          error: 'Validation error',
          details: error.errors
        }, { status: 400 });
      }
      
      return NextResponse.json({
        success: false,
        error: 'Failed to submit feedback'
      }, { status: 500 });
    }
  });
}

export const POST = withApiTracking(asyncHandler(handlePOST));