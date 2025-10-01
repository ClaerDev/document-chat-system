/**
 * @swagger
 * /api/v1/match-scores/{id}:
 *   get:
 *     tags: [Match Scores]
 *     summary: Get match score by ID
 *     description: Retrieve a specific match score with all details including LLM analysis and strategic insights
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
 *         description: Match score retrieved successfully
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
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         description: Match score not found
 *       500:
 *         description: Internal server error
 *   patch:
 *     tags: [Match Scores]
 *     summary: Update match score
 *     description: Update specific fields of a match score (user feedback, ratings, etc.)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Match score ID
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateMatchScoreInput'
 *     responses:
 *       200:
 *         description: Match score updated successfully
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         description: Match score not found
 *       500:
 *         description: Internal server error
 *   delete:
 *     tags: [Match Scores]
 *     summary: Delete match score
 *     description: Delete a match score (soft delete with audit trail)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Match score ID
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Match score deleted successfully
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
import { 
  validateUpdateMatchScore, 
  serializeMatchScore,
  type MatchScoreResponse 
} from '@/lib/validations/match-score';
import { withRateLimit, rateLimitConfigs } from '@/lib/rate-limit';
import { withApiTracking } from '@/lib/api-tracking';
import { asyncHandler } from '@/lib/api-errors';
import { crudAuditLogger } from '@/lib/audit/crud-audit-logger';

interface RouteParams {
  params: { id: string };
}

/**
 * GET /api/v1/match-scores/[id]
 * Retrieve a specific match score by ID
 */
async function handleGET(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  return withRateLimit(rateLimitConfigs.api, 'match-score-get')(request, async () => {
    // Authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 });
    }

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
      // Find match score with organization access control
      const matchScore = await prisma.matchScore.findFirst({
        where: {
          id: params.id,
          organizationId: user.organizationId
        },
        include: {
          profile: {
            select: {
              id: true,
              companyName: true,
              primaryNaics: true
            }
          }
        }
      });

      if (!matchScore) {
        return NextResponse.json({
          success: false,
          error: 'Match score not found'
        }, { status: 404 });
      }

      // Log audit trail for match score access
      try {
        await crudAuditLogger.logAIOperation(
          'READ',
          matchScore.id,
          `Match Score Access`,
          null,
          {
            score: matchScore.overallScore,
            algorithm: matchScore.algorithmVersion,
            confidence: matchScore.confidence,
            opportunityId: matchScore.opportunityId
          },
          {
            algorithm: matchScore.algorithmVersion || 'unknown',
            score: matchScore.overallScore,
            isAIDecision: true,
            model: matchScore.scoringMethod || 'unknown',
            profileName: matchScore.profile?.companyName || 'Unknown Company',
            opportunityTitle: `Opportunity ${matchScore.opportunityId}`,
            confidence: matchScore.confidence || 0,
            endpoint: `/api/v1/match-scores/${params.id}`,
            method: 'GET'
          }
        );
      } catch (auditError) {
        console.error('Failed to create match score access audit log:', auditError);
      }

      return NextResponse.json({
        success: true,
        data: serializeMatchScore(matchScore)
      });

    } catch (error) {
      console.error('Error retrieving match score:', error);
      
      return NextResponse.json({
        success: false,
        error: 'Failed to retrieve match score'
      }, { status: 500 });
    }
  });
}

/**
 * PATCH /api/v1/match-scores/[id]
 * Update a match score (user feedback, ratings, etc.)
 */
async function handlePATCH(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  return withRateLimit(rateLimitConfigs.api, 'match-score-update')(request, async () => {
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
    const updateData = validateUpdateMatchScore({
      ...body,
      id: params.id
    });

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
      const existingScore = await prisma.matchScore.findFirst({
        where: {
          id: params.id,
          organizationId: user.organizationId
        }
      });

      if (!existingScore) {
        return NextResponse.json({
          success: false,
          error: 'Match score not found'
        }, { status: 404 });
      }

      // Update match score
      const updatedScore = await prisma.matchScore.update({
        where: { id: params.id },
        data: {
          ...updateData,
          id: undefined, // Don't update ID
          updatedAt: new Date()
        },
        include: {
          profile: {
            select: {
              id: true,
              companyName: true,
              primaryNaics: true
            }
          }
        }
      });

      // Log audit trail for match score update
      try {
        await crudAuditLogger.logAIOperation(
          'UPDATE',
          updatedScore.id,
          `Match Score Update`,
          existingScore,
          {
            score: updatedScore.overallScore,
            algorithm: updatedScore.algorithmVersion,
            confidence: updatedScore.confidence,
            opportunityId: updatedScore.opportunityId
          },
          {
            algorithm: updatedScore.algorithmVersion || 'unknown',
            score: updatedScore.overallScore,
            isAIDecision: true,
            model: updatedScore.scoringMethod || 'unknown',
            profileName: updatedScore.profile?.companyName || 'Unknown Company',
            opportunityTitle: `Opportunity ${updatedScore.opportunityId}`,
            confidence: updatedScore.confidence || 0,
            factors: updatedScore.factors || {},
            endpoint: `/api/v1/match-scores/${params.id}`,
            method: 'PATCH'
          }
        );
      } catch (auditError) {
        console.error('Failed to create match score update audit log:', auditError);
      }

      return NextResponse.json({
        success: true,
        data: serializeMatchScore(updatedScore)
      });

    } catch (error) {
      console.error('Error updating match score:', error);
      
      return NextResponse.json({
        success: false,
        error: 'Failed to update match score'
      }, { status: 500 });
    }
  });
}

/**
 * DELETE /api/v1/match-scores/[id]
 * Delete a match score (soft delete)
 */
async function handleDELETE(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  return withRateLimit(rateLimitConfigs.api, 'match-score-delete')(request, async () => {
    // Authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 });
    }

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
      const existingScore = await prisma.matchScore.findFirst({
        where: {
          id: params.id,
          organizationId: user.organizationId
        },
        include: {
          profile: {
            select: {
              id: true,
              companyName: true,
              primaryNaics: true
            }
          }
        }
      });

      if (!existingScore) {
        return NextResponse.json({
          success: false,
          error: 'Match score not found'
        }, { status: 404 });
      }

      // Soft delete the match score
      await prisma.matchScore.delete({
        where: { id: params.id }
      });

      // Log audit trail for match score deletion
      try {
        await crudAuditLogger.logAIOperation(
          'DELETE',
          existingScore.id,
          `Match Score Deletion`,
          existingScore,
          null,
          {
            algorithm: existingScore.algorithmVersion || 'unknown',
            score: existingScore.overallScore,
            isAIDecision: true,
            model: existingScore.scoringMethod || 'unknown',
            profileName: existingScore.profile?.companyName || 'Unknown Company',
            opportunityTitle: `Opportunity ${existingScore.opportunityId}`,
            confidence: existingScore.confidence || 0,
            endpoint: `/api/v1/match-scores/${params.id}`,
            method: 'DELETE'
          }
        );
      } catch (auditError) {
        console.error('Failed to create match score deletion audit log:', auditError);
      }

      return NextResponse.json({
        success: true,
        message: 'Match score deleted successfully'
      });

    } catch (error) {
      console.error('Error deleting match score:', error);
      
      return NextResponse.json({
        success: false,
        error: 'Failed to delete match score'
      }, { status: 500 });
    }
  });
}

export const GET = withApiTracking(asyncHandler(handleGET));
export const PATCH = withApiTracking(asyncHandler(handlePATCH));
export const DELETE = withApiTracking(asyncHandler(handleDELETE));