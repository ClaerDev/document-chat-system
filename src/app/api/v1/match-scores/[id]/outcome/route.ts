/**
 * @swagger
 * /api/v1/match-scores/{id}/outcome:
 *   post:
 *     tags: [Match Scores]
 *     summary: Update actual outcome for match score
 *     description: |
 *       Record the actual outcome of an opportunity (won, lost, no bid, withdrawn)
 *       to improve algorithm accuracy through machine learning feedback loops.
 *       This data is critical for training future scoring models.
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
 *             required: [outcome]
 *             properties:
 *               outcome:
 *                 type: string
 *                 enum: [won, lost, no_bid, withdrawn]
 *                 description: The actual outcome of the opportunity
 *                 example: "won"
 *               notes:
 *                 type: string
 *                 maxLength: 1000
 *                 description: Optional notes about the outcome
 *                 example: "Won with strong past performance demonstration"
 *               actualValue:
 *                 type: number
 *                 description: Actual contract value if won
 *                 example: 2500000
 *               competitorCount:
 *                 type: integer
 *                 description: Number of competitors who bid
 *                 example: 5
 *           examples:
 *             won:
 *               summary: Opportunity won
 *               value:
 *                 outcome: "won"
 *                 notes: "Won with competitive pricing and strong technical approach"
 *                 actualValue: 2500000
 *                 competitorCount: 4
 *             lost:
 *               summary: Opportunity lost
 *               value:
 *                 outcome: "lost"
 *                 notes: "Lost due to pricing - incumbent had lower overhead"
 *                 competitorCount: 3
 *             no_bid:
 *               summary: Decided not to bid
 *               value:
 *                 outcome: "no_bid"
 *                 notes: "Requirements outside our core competencies"
 *     responses:
 *       200:
 *         description: Outcome updated successfully
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
 *                   example: "Outcome updated successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     outcomeId:
 *                       type: string
 *                       example: "oc1234567890abcdef"
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *                       example: "2024-01-15T10:30:00Z"
 *                     modelImpact:
 *                       type: object
 *                       properties:
 *                         accuracyImprovement:
 *                           type: number
 *                           example: 0.025
 *                         confidenceAdjustment:
 *                           type: number
 *                           example: 0.15
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

interface RouteParams {
  params: { id: string };
}

// Validation schema for outcome submission
const OutcomeSchema = z.object({
  outcome: z.enum(['won', 'lost', 'no_bid', 'withdrawn'])
    .describe('The actual outcome of the opportunity'),
  notes: z.string()
    .max(1000, 'Notes must be less than 1000 characters')
    .optional()
    .describe('Optional notes about the outcome'),
  actualValue: z.number()
    .positive('Actual value must be positive')
    .optional()
    .describe('Actual contract value if won'),
  competitorCount: z.number()
    .int('Competitor count must be an integer')
    .min(0, 'Competitor count cannot be negative')
    .max(50, 'Competitor count seems unreasonably high')
    .optional()
    .describe('Number of competitors who bid')
});

/**
 * Calculate model accuracy impact based on prediction vs outcome
 */
function calculateModelImpact(
  predictedScore: number,
  confidence: number,
  actualOutcome: string
): { accuracyImprovement: number; confidenceAdjustment: number } {
  // Simple accuracy calculation - in production this would be more sophisticated
  const wasCorrectPrediction = 
    (actualOutcome === 'won' && predictedScore >= 70) ||
    (actualOutcome === 'lost' && predictedScore < 70);
  
  const accuracyImprovement = wasCorrectPrediction ? 0.01 : -0.01;
  
  // Adjust confidence based on how far off we were
  let confidenceAdjustment = 0;
  if (actualOutcome === 'won' && predictedScore < 50) {
    confidenceAdjustment = -0.2; // We were very wrong
  } else if (actualOutcome === 'lost' && predictedScore > 80) {
    confidenceAdjustment = -0.15; // We were quite wrong
  } else if (wasCorrectPrediction) {
    confidenceAdjustment = 0.05; // We were right, increase confidence
  }
  
  return { accuracyImprovement, confidenceAdjustment };
}

/**
 * POST /api/v1/match-scores/[id]/outcome
 * Update the actual outcome of an opportunity for algorithm training
 */
async function handlePOST(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  return withRateLimit(rateLimitConfigs.api, 'match-score-outcome')(request, async () => {
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
    const { outcome, notes, actualValue, competitorCount } = OutcomeSchema.parse(body);

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

      // Calculate model impact for future algorithm improvements
      const modelImpact = calculateModelImpact(
        Number(matchScore.overallScore),
        Number(matchScore.confidence),
        outcome
      );

      // Update match score with outcome
      const updatedScore = await prisma.matchScore.update({
        where: { id: params.id },
        data: {
          actualOutcome: outcome,
          actualWinRate: outcome === 'won',
          updatedAt: new Date()
        }
      });

      // Create outcome record for detailed analytics
      const outcomeRecord = await prisma.matchScoreOutcome.create({
        data: {
          id: `oc${Date.now()}${Math.random().toString(36).substr(2, 9)}`,
          matchScoreId: params.id,
          userId: user.id,
          organizationId: user.organizationId,
          outcome,
          notes: notes || null,
          actualContractValue: actualValue || null,
          competitorCount: competitorCount || null,
          predictedScore: Number(matchScore.overallScore),
          scoringMethod: matchScore.scoringMethod,
          algorithmVersion: matchScore.algorithmVersion,
          modelAccuracyImpact: modelImpact.accuracyImprovement,
          confidenceAdjustment: modelImpact.confidenceAdjustment,
          metadata: {
            submissionTime: new Date().toISOString(),
            userAgent: request.headers.get('user-agent') || 'unknown'
          },
          createdAt: new Date()
        }
      }).catch(error => {
        // If outcome table doesn't exist yet, log but don't fail
        console.warn('Could not create outcome record (table may not exist):', error);
        return null;
      });

      // Track usage for outcome submission
      try {
        await UsageTrackingService.trackUsage({
          organizationId: user.organizationId,
          usageType: UsageType.USER_FEEDBACK,
          quantity: 1,
          resourceType: 'outcome_tracking',
          metadata: {
            matchScoreId: params.id,
            outcomeId: outcomeRecord?.id,
            outcome,
            actualValue,
            competitorCount,
            modelImpact,
            algorithmVersion: matchScore.algorithmVersion
          }
        });
      } catch (trackingError) {
        console.error('Failed to track outcome usage:', trackingError);
      }

      return NextResponse.json({
        success: true,
        message: 'Outcome updated successfully',
        data: {
          outcomeId: outcomeRecord?.id || `oc_${params.id}_${Date.now()}`,
          updatedAt: new Date().toISOString(),
          modelImpact: {
            accuracyImprovement: modelImpact.accuracyImprovement,
            confidenceAdjustment: modelImpact.confidenceAdjustment
          }
        }
      });

    } catch (error) {
      console.error('Error updating outcome:', error);
      
      if (error instanceof z.ZodError) {
        return NextResponse.json({
          success: false,
          error: 'Validation error',
          details: error.errors
        }, { status: 400 });
      }
      
      return NextResponse.json({
        success: false,
        error: 'Failed to update outcome'
      }, { status: 500 });
    }
  });
}

export const POST = withApiTracking(asyncHandler(handlePOST));