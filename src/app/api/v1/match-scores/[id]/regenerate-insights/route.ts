/**
 * @swagger
 * /api/v1/match-scores/{id}/regenerate-insights:
 *   post:
 *     tags: [Match Scores]
 *     summary: Regenerate strategic insights for match score
 *     description: |
 *       Regenerate LLM-powered strategic insights for an existing match score.
 *       This endpoint allows users to refresh insights when new data becomes 
 *       available or when they want updated analysis with improved models.
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
 *     responses:
 *       200:
 *         description: Insights regenerated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required: [success, data]
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/MatchScore'
 *                 metadata:
 *                   type: object
 *                   properties:
 *                     regeneratedAt:
 *                       type: string
 *                       format: date-time
 *                       example: "2024-01-15T10:30:00Z"
 *                     modelUsed:
 *                       type: string
 *                       example: "deepseek/deepseek-r1"
 *                     processingTimeMs:
 *                       type: number
 *                       example: 3500
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         description: Match score not found
 *       500:
 *         description: Internal server error
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
import { calculateLLMMatchScore } from '@/lib/llm-scoring/llm-scoring-engine';
import { serializeMatchScore } from '@/lib/validations/match-score';
import { withRateLimit, rateLimitConfigs } from '@/lib/rate-limit';
import { withApiTracking } from '@/lib/api-tracking';
import { asyncHandler } from '@/lib/api-errors';
import { UsageTrackingService, UsageType } from '@/lib/usage-tracking';

interface RouteParams {
  params: { id: string };
}

/**
 * Fetch opportunity data for LLM analysis
 */
async function fetchOpportunityForInsights(opportunityId: string) {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/v1/opportunities-mock?query=&limit=50`,
      {
        headers: { 'Content-Type': 'application/json' }
      }
    );
    
    if (!response.ok) {
      throw new Error(`Failed to fetch opportunity: ${response.status}`);
    }
    
    const data = await response.json();
    const opportunity = data?.data?.items?.find((opp: any) => opp.id === opportunityId);
    
    if (!opportunity) {
      throw new Error(`Opportunity ${opportunityId} not found`);
    }
    
    return {
      id: opportunity.id,
      title: opportunity.title,
      agency: opportunity.agency,
      description: opportunity.description,
      naicsCodes: opportunity.naicsCodes || [],
      setAsideType: opportunity.setAsideType,
      estimatedValue: opportunity.estimatedValue || 0,
      performanceState: opportunity.performanceState || opportunity.state,
      securityClearanceRequired: opportunity.securityClearanceRequired,
      requirements: opportunity.requirements || opportunity.description,
      evaluationCriteria: opportunity.evaluationCriteria,
      deadline: opportunity.deadline,
      solicitation: opportunity.solicitation
    };
  } catch (error) {
    console.error(`Error fetching opportunity ${opportunityId}:`, error);
    throw error;
  }
}

/**
 * POST /api/v1/match-scores/[id]/regenerate-insights
 * Regenerate strategic insights for an existing match score
 */
async function handlePOST(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  return withRateLimit(rateLimitConfigs.ai, 'regenerate-insights')(request, async () => {
    const startTime = Date.now();
    
    // Authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 });
    }

    // Get user and organization
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
      // Find match score with organization access control
      const matchScore = await prisma.matchScore.findFirst({
        where: {
          id: params.id,
          organizationId: user.organizationId
        },
        include: {
          profile: true
        }
      });

      if (!matchScore) {
        return NextResponse.json({
          success: false,
          error: 'Match score not found'
        }, { status: 404 });
      }

      // Check usage limits for LLM analysis
      try {
        await UsageTrackingService.enforceUsageLimit(
          user.organizationId,
          UsageType.LLM_ANALYSIS,
          1
        );
      } catch (error: any) {
        return NextResponse.json({
          success: false,
          error: error.message || 'Usage limit exceeded for LLM analysis'
        }, { status: 403 });
      }

      // Fetch opportunity data for context
      const opportunity = await fetchOpportunityForInsights(matchScore.opportunityId);
      
      // Regenerate insights using LLM
      const enhancedResult = await calculateLLMMatchScore(opportunity, matchScore.profile, {
        organizationId: user.organizationId,
        userId: user.id,
        enableSemanticAnalysis: true,
        enableStrategicInsights: true,
        useReasoningModels: true,
        maxTokens: 8000,
        temperature: 0.3
      });

      // Update match score with new insights
      const updatedScore = await prisma.matchScore.update({
        where: { id: params.id },
        data: {
          semanticAnalysis: enhancedResult.semanticAnalysis,
          strategicInsights: enhancedResult.strategicInsights,
          recommendations: enhancedResult.recommendations || [],
          processingTimeMs: enhancedResult.processingTimeMs,
          costUsd: enhancedResult.costUsd,
          algorithmVersion: `${matchScore.algorithmVersion}-insights-v${Date.now()}`,
          updatedAt: new Date()
        }
      });

      // Track usage
      try {
        await UsageTrackingService.trackUsage({
          organizationId: user.organizationId,
          usageType: UsageType.LLM_ANALYSIS,
          quantity: 1,
          resourceType: 'insights_regeneration',
          metadata: {
            matchScoreId: params.id,
            opportunityId: matchScore.opportunityId,
            profileId: matchScore.profileId,
            processingTimeMs: Date.now() - startTime,
            modelUsed: enhancedResult.analysisMetadata?.llmModel || 'unknown'
          }
        });
      } catch (trackingError) {
        console.error('Failed to track insights regeneration usage:', trackingError);
      }

      const processingTime = Date.now() - startTime;

      return NextResponse.json({
        success: true,
        data: serializeMatchScore(updatedScore),
        metadata: {
          regeneratedAt: new Date().toISOString(),
          modelUsed: enhancedResult.analysisMetadata?.llmModel || 'unknown',
          processingTimeMs: processingTime,
          costUsd: enhancedResult.costUsd || 0
        }
      });

    } catch (error) {
      console.error('Error regenerating insights:', error);
      
      return NextResponse.json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to regenerate insights'
      }, { status: 500 });
    }
  });
}

export const POST = withApiTracking(asyncHandler(handlePOST));