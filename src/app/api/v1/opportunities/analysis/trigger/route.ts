/**
 * Opportunity Analysis Trigger API
 * 
 * Client-side endpoint to trigger Inngest analysis functions.
 * This avoids importing Inngest client-side which causes Node.js module errors.
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { inngest } from '@/lib/inngest/client';
import { z } from 'zod';

const TriggerSchema = z.object({
  opportunityId: z.string().min(1).describe("Opportunity ID to analyze"),
  organizationId: z.string().min(1).describe("Organization ID"),
  userId: z.string().min(1).describe("User ID who triggered the analysis"),
  opportunity: z.any().describe("Opportunity data object"),
  analysisType: z.enum(['overview', 'requirements', 'complete']).default('complete').describe("Type of analysis to perform"),
  priority: z.enum(['low', 'normal', 'high']).default('normal').describe("Analysis priority level")
});

/**
 * @swagger
 * /api/v1/opportunities/analysis/trigger:
 *   post:
 *     summary: Trigger comprehensive opportunity analysis
 *     description: Initiates background analysis for AI insights, competitors, and similar contracts
 *     tags: [AI Services]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [opportunityId, organizationId, userId, opportunity]
 *             properties:
 *               opportunityId:
 *                 type: string
 *                 description: Opportunity ID to analyze
 *               organizationId:
 *                 type: string
 *                 description: Organization ID
 *               userId:
 *                 type: string
 *                 description: User ID who triggered the analysis
 *               opportunity:
 *                 type: object
 *                 description: Opportunity data object
 *               analysisType:
 *                 type: string
 *                 enum: [overview, requirements, complete]
 *                 default: complete
 *                 description: Type of analysis to perform
 *               priority:
 *                 type: string
 *                 enum: [low, normal, high]
 *                 default: normal
 *                 description: Analysis priority level
 *     responses:
 *       200:
 *         description: Analysis triggered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 jobId:
 *                   type: string
 *       400:
 *         description: Bad request - validation failed
 *       401:
 *         description: Unauthorized - authentication required
 *       500:
 *         description: Internal server error
 */
export async function POST(request: NextRequest) {
  try {
    const { userId, orgId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!orgId) {
      return NextResponse.json(
        { success: false, error: 'Organization required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validatedData = TriggerSchema.parse(body);

    // Ensure the authenticated user/org matches the request
    if (validatedData.userId !== userId || validatedData.organizationId !== orgId) {
      return NextResponse.json(
        { success: false, error: 'Forbidden - user/org mismatch' },
        { status: 403 }
      );
    }

    // Trigger Inngest function
    console.log('🔄 Sending Inngest event:', {
      eventName: 'ai-analysis/opportunity.requested',
      opportunityId: validatedData.opportunityId,
      organizationId: validatedData.organizationId,
      userId: validatedData.userId,
      analysisType: validatedData.analysisType
    });

    const result = await inngest.send({
      name: 'ai-analysis/opportunity.requested',
      data: {
        opportunityId: validatedData.opportunityId,
        organizationId: validatedData.organizationId,
        userId: validatedData.userId,
        opportunity: validatedData.opportunity,
        analysisType: validatedData.analysisType,
        priority: validatedData.priority
      }
    });

    console.log('✅ Inngest event sent successfully:', {
      opportunityId: validatedData.opportunityId,
      organizationId: validatedData.organizationId,
      userId: validatedData.userId,
      analysisType: validatedData.analysisType,
      result: result,
      jobIds: result.ids
    });

    return NextResponse.json({
      success: true,
      message: 'Analysis triggered successfully',
      jobId: result.ids?.[0],
      opportunityId: validatedData.opportunityId,
      analysisType: validatedData.analysisType
    });

  } catch (error) {
    console.error('Analysis trigger error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Validation failed',
          details: error.errors
        },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}