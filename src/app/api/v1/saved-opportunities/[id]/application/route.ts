/**
 * @swagger
 * /api/v1/saved-opportunities/{id}/application:
 *   post:
 *     summary: Create opportunity application
 *     description: Create an application for a saved opportunity, transitioning it to the application phase
 *     tags: [Opportunity Applications]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Saved opportunity ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               proposalValue:
 *                 type: number
 *                 description: Proposed contract value
 *               winProbability:
 *                 type: integer
 *                 minimum: 0
 *                 maximum: 100
 *                 description: Estimated win probability percentage
 *               competitorCount:
 *                 type: integer
 *                 description: Number of known competitors
 *               responseDeadline:
 *                 type: string
 *                 format: date-time
 *                 description: Application submission deadline
 *               expectedDecision:
 *                 type: string
 *                 format: date-time
 *                 description: Expected decision date
 *               strategy:
 *                 type: string
 *                 description: Application strategy notes
 *               teamMembers:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Team member IDs or names
 *     responses:
 *       201:
 *         description: Application created successfully
 *       400:
 *         description: Invalid request data
 *       404:
 *         description: Saved opportunity not found
 *       409:
 *         description: Application already exists
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 *   patch:
 *     summary: Update opportunity application
 *     description: Update application status, proposal details, or other fields
 *     tags: [Opportunity Applications]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Saved opportunity ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [PREPARING, SUBMITTED, UNDER_REVIEW, AWARDED, REJECTED]
 *                 description: Application status
 *               submissionDate:
 *                 type: string
 *                 format: date-time
 *                 description: Actual submission date
 *               proposalDocument:
 *                 type: string
 *                 description: File path or URL to proposal document
 *               proposalValue:
 *                 type: number
 *                 description: Updated proposed contract value
 *               winProbability:
 *                 type: integer
 *                 minimum: 0
 *                 maximum: 100
 *                 description: Updated win probability percentage
 *               competitorCount:
 *                 type: integer
 *                 description: Updated competitor count
 *               strategy:
 *                 type: string
 *                 description: Updated strategy notes
 *               teamMembers:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Updated team member list
 *     responses:
 *       200:
 *         description: Application updated successfully
 *       400:
 *         description: Invalid request data
 *       404:
 *         description: Application not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { z } from 'zod';
import { crudAuditLogger } from '@/lib/audit/crud-audit-logger';

const CreateApplicationSchema = z.object({
  proposalValue: z.number().positive().optional()
    .describe("Proposed contract value in USD"),
  winProbability: z.number().int().min(0).max(100).optional()
    .describe("Estimated win probability as percentage (0-100)"),
  competitorCount: z.number().int().min(0).optional()
    .describe("Number of known competitors in the process"),
  responseDeadline: z.string().datetime().optional()
    .describe("Application submission deadline in ISO format"),
  expectedDecision: z.string().datetime().optional()
    .describe("Expected decision date in ISO format"),
  strategy: z.string().optional()
    .describe("Application strategy and approach notes"),
  teamMembers: z.array(z.string()).default([])
    .describe("Team member IDs or names assigned to this application")
});

const UpdateApplicationSchema = z.object({
  status: z.enum(['PREPARING', 'SUBMITTED', 'UNDER_REVIEW', 'AWARDED', 'REJECTED']).optional()
    .describe("Current application status in the lifecycle"),
  submissionDate: z.string().datetime().optional()
    .describe("Actual submission date in ISO format"),
  proposalDocument: z.string().optional()
    .describe("File path or URL to the proposal document"),
  proposalValue: z.number().positive().optional()
    .describe("Updated proposed contract value in USD"),
  winProbability: z.number().int().min(0).max(100).optional()
    .describe("Updated win probability percentage (0-100)"),
  competitorCount: z.number().int().min(0).optional()
    .describe("Updated number of known competitors"),
  strategy: z.string().optional()
    .describe("Updated application strategy notes"),
  teamMembers: z.array(z.string()).optional()
    .describe("Updated team member assignments")
});

interface RouteParams {
  params: {
    id: string;
  };
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get user and organization
    const user = await db.user.findUnique({
      where: { clerkId: userId },
      select: { id: true, organizationId: true }
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    const { id: savedOpportunityId } = params;

    // Check if saved opportunity exists and user has access
    const savedOpportunity = await db.savedOpportunity.findFirst({
      where: {
        id: savedOpportunityId,
        organizationId: user.organizationId
      },
      include: {
        application: true
      }
    });

    if (!savedOpportunity) {
      return NextResponse.json(
        { success: false, error: 'Saved opportunity not found' },
        { status: 404 }
      );
    }

    // Check if application already exists
    if (savedOpportunity.application) {
      return NextResponse.json(
        { success: false, error: 'Application already exists for this opportunity' },
        { status: 409 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = CreateApplicationSchema.parse(body);

    // Create application and update saved opportunity status
    const [application] = await db.$transaction([
      // Create the application
      db.opportunityApplication.create({
        data: {
          organizationId: user.organizationId,
          userId: user.id,
          savedOpportunityId,
          status: 'PREPARING',
          proposalValue: validatedData.proposalValue,
          winProbability: validatedData.winProbability,
          competitorCount: validatedData.competitorCount,
          responseDeadline: validatedData.responseDeadline ? new Date(validatedData.responseDeadline) : null,
          expectedDecision: validatedData.expectedDecision ? new Date(validatedData.expectedDecision) : null,
          strategy: validatedData.strategy,
          teamMembers: validatedData.teamMembers
        },
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true
            }
          }
        }
      }),
      // Update saved opportunity status to PURSUING
      db.savedOpportunity.update({
        where: { id: savedOpportunityId },
        data: { 
          status: 'PURSUING',
          updatedAt: new Date()
        }
      })
    ]);

    // Log audit trail for application creation
    try {
      await crudAuditLogger.logOpportunityOperation(
        'CREATE',
        application.id,
        savedOpportunity.title,
        'APPLY',
        null,
        application,
        {
          endpoint: `/api/v1/saved-opportunities/${savedOpportunityId}/application`,
          method: 'POST',
          organizationId: user.organizationId,
          userAgent: request.headers.get('user-agent'),
          ipAddress: request.headers.get('x-forwarded-for') || 
                    request.headers.get('x-real-ip') || 
                    'unknown',
          lifecycleAction: 'APPLICATION_CREATED',
          savedOpportunityId,
          proposalValue: validatedData.proposalValue,
          winProbability: validatedData.winProbability
        }
      );
    } catch (auditError) {
      console.error('Failed to create application creation audit log:', auditError);
    }

    return NextResponse.json({
      success: true,
      data: application,
      message: 'Application created successfully'
    }, { status: 201 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid request data', 
          details: error.errors 
        },
        { status: 400 }
      );
    }

    console.error('Error creating application:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create application' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get user and organization
    const user = await db.user.findUnique({
      where: { clerkId: userId },
      select: { id: true, organizationId: true }
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    const { id: savedOpportunityId } = params;

    // Check if saved opportunity and application exist
    const savedOpportunity = await db.savedOpportunity.findFirst({
      where: {
        id: savedOpportunityId,
        organizationId: user.organizationId
      },
      include: {
        application: true
      }
    });

    if (!savedOpportunity || !savedOpportunity.application) {
      return NextResponse.json(
        { success: false, error: 'Application not found' },
        { status: 404 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = UpdateApplicationSchema.parse(body);

    // Update application
    const updatedApplication = await db.opportunityApplication.update({
      where: { id: savedOpportunity.application.id },
      data: {
        ...validatedData,
        submissionDate: validatedData.submissionDate ? new Date(validatedData.submissionDate) : undefined,
        updatedAt: new Date()
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });

    // Update saved opportunity status based on application status
    let opportunityStatus = savedOpportunity.status;
    if (validatedData.status) {
      switch (validatedData.status) {
        case 'SUBMITTED':
        case 'UNDER_REVIEW':
          opportunityStatus = 'APPLIED';
          break;
        case 'AWARDED':
          opportunityStatus = 'AWARDED';
          break;
        case 'REJECTED':
          opportunityStatus = 'LOST';
          break;
      }

      if (opportunityStatus !== savedOpportunity.status) {
        await db.savedOpportunity.update({
          where: { id: savedOpportunityId },
          data: { 
            status: opportunityStatus,
            updatedAt: new Date()
          }
        });
      }
    }

    // Determine lifecycle action
    let lifecycleAction = 'APPLICATION_UPDATED';
    if (validatedData.status && validatedData.status !== savedOpportunity.application.status) {
      lifecycleAction = `APPLICATION_STATUS_CHANGED_TO_${validatedData.status}`;
    }

    // Log audit trail for application update
    try {
      await crudAuditLogger.logOpportunityOperation(
        'UPDATE',
        updatedApplication.id,
        savedOpportunity.title,
        'APPLY',
        savedOpportunity.application,
        updatedApplication,
        {
          endpoint: `/api/v1/saved-opportunities/${savedOpportunityId}/application`,
          method: 'PATCH',
          organizationId: user.organizationId,
          userAgent: request.headers.get('user-agent'),
          ipAddress: request.headers.get('x-forwarded-for') || 
                    request.headers.get('x-real-ip') || 
                    'unknown',
          lifecycleAction,
          changedFields: Object.keys(validatedData),
          statusChange: validatedData.status ? {
            from: savedOpportunity.application.status,
            to: validatedData.status
          } : null,
          opportunityStatusChange: opportunityStatus !== savedOpportunity.status ? {
            from: savedOpportunity.status,
            to: opportunityStatus
          } : null
        }
      );
    } catch (auditError) {
      console.error('Failed to create application update audit log:', auditError);
    }

    return NextResponse.json({
      success: true,
      data: updatedApplication,
      message: 'Application updated successfully'
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid request data', 
          details: error.errors 
        },
        { status: 400 }
      );
    }

    console.error('Error updating application:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update application' },
      { status: 500 }
    );
  }
}