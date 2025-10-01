/**
 * @swagger
 * /api/v1/saved-opportunities/{id}:
 *   get:
 *     summary: Get specific saved opportunity
 *     description: Retrieve detailed information about a specific saved opportunity
 *     tags: [Saved Opportunities]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Saved opportunity ID
 *     responses:
 *       200:
 *         description: Successfully retrieved saved opportunity
 *       404:
 *         description: Saved opportunity not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 *   patch:
 *     summary: Update saved opportunity
 *     description: Update saved opportunity status, priority, notes, or other fields
 *     tags: [Saved Opportunities]
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
 *                 enum: [SAVED, REVIEWING, PURSUING, APPLIED, AWARDED, LOST]
 *               priority:
 *                 type: string
 *                 enum: [HIGH, MEDIUM, LOW]
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Successfully updated saved opportunity
 *       400:
 *         description: Invalid request data
 *       404:
 *         description: Saved opportunity not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 *   delete:
 *     summary: Remove saved opportunity
 *     description: Remove opportunity from saved list
 *     tags: [Saved Opportunities]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Saved opportunity ID
 *     responses:
 *       200:
 *         description: Successfully removed saved opportunity
 *       404:
 *         description: Saved opportunity not found
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

const UpdateSavedOpportunitySchema = z.object({
  status: z.enum(['SAVED', 'REVIEWING', 'PURSUING', 'APPLIED', 'AWARDED', 'LOST']).optional()
    .describe("Current lifecycle status of the opportunity"),
  priority: z.enum(['HIGH', 'MEDIUM', 'LOW']).optional()
    .describe("Priority level for tracking and management"),
  tags: z.array(z.string()).optional()
    .describe("User-defined tags for categorization"),
  notes: z.string().optional()
    .describe("Updated notes about the opportunity")
});

interface RouteParams {
  params: {
    id: string;
  };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
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

    const { id } = params;

    // Fetch saved opportunity with full details
    const savedOpportunity = await db.savedOpportunity.findFirst({
      where: {
        id,
        organizationId: user.organizationId
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        application: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true
              }
            }
          }
        },
        notes: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!savedOpportunity) {
      return NextResponse.json(
        { success: false, error: 'Saved opportunity not found' },
        { status: 404 }
      );
    }

    // Log audit trail for opportunity access
    try {
      await crudAuditLogger.logOpportunityOperation(
        'READ',
        savedOpportunity.id,
        savedOpportunity.title,
        'SAVE',
        null,
        { 
          status: savedOpportunity.status,
          priority: savedOpportunity.priority 
        },
        {
          endpoint: `/api/v1/saved-opportunities/${id}`,
          method: 'GET',
          organizationId: user.organizationId,
          userAgent: request.headers.get('user-agent'),
          ipAddress: request.headers.get('x-forwarded-for') || 
                    request.headers.get('x-real-ip') || 
                    'unknown',
          lifecycleAction: 'OPPORTUNITY_ACCESSED'
        }
      );
    } catch (auditError) {
      console.error('Failed to create opportunity access audit log:', auditError);
    }

    return NextResponse.json({
      success: true,
      data: savedOpportunity
    });

  } catch (error) {
    console.error('Error fetching saved opportunity:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch saved opportunity' },
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

    const { id } = params;

    // Check if saved opportunity exists and user has access
    const existingSavedOpportunity = await db.savedOpportunity.findFirst({
      where: {
        id,
        organizationId: user.organizationId
      }
    });

    if (!existingSavedOpportunity) {
      return NextResponse.json(
        { success: false, error: 'Saved opportunity not found' },
        { status: 404 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = UpdateSavedOpportunitySchema.parse(body);

    // Update saved opportunity
    const updatedSavedOpportunity = await db.savedOpportunity.update({
      where: { id },
      data: {
        ...validatedData,
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

    // Determine lifecycle action based on status change
    let lifecycleAction = 'OPPORTUNITY_UPDATED';
    if (validatedData.status && validatedData.status !== existingSavedOpportunity.status) {
      lifecycleAction = `STATUS_CHANGED_TO_${validatedData.status}`;
    }

    // Log audit trail for opportunity update
    try {
      await crudAuditLogger.logOpportunityOperation(
        'UPDATE',
        updatedSavedOpportunity.id,
        updatedSavedOpportunity.title,
        'SAVE',
        existingSavedOpportunity,
        updatedSavedOpportunity,
        {
          endpoint: `/api/v1/saved-opportunities/${id}`,
          method: 'PATCH',
          organizationId: user.organizationId,
          userAgent: request.headers.get('user-agent'),
          ipAddress: request.headers.get('x-forwarded-for') || 
                    request.headers.get('x-real-ip') || 
                    'unknown',
          lifecycleAction,
          changedFields: Object.keys(validatedData),
          statusChange: validatedData.status ? {
            from: existingSavedOpportunity.status,
            to: validatedData.status
          } : null
        }
      );
    } catch (auditError) {
      console.error('Failed to create opportunity update audit log:', auditError);
    }

    return NextResponse.json({
      success: true,
      data: updatedSavedOpportunity,
      message: 'Saved opportunity updated successfully'
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

    console.error('Error updating saved opportunity:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update saved opportunity' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
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

    const { id } = params;

    // Check if saved opportunity exists and user has access
    const existingSavedOpportunity = await db.savedOpportunity.findFirst({
      where: {
        id,
        organizationId: user.organizationId
      }
    });

    if (!existingSavedOpportunity) {
      return NextResponse.json(
        { success: false, error: 'Saved opportunity not found' },
        { status: 404 }
      );
    }

    // Delete saved opportunity (cascade will handle related records)
    await db.savedOpportunity.delete({
      where: { id }
    });

    // Log audit trail for opportunity removal
    try {
      await crudAuditLogger.logOpportunityOperation(
        'DELETE',
        existingSavedOpportunity.id,
        existingSavedOpportunity.title,
        'SAVE',
        existingSavedOpportunity,
        null,
        {
          endpoint: `/api/v1/saved-opportunities/${id}`,
          method: 'DELETE',
          organizationId: user.organizationId,
          userAgent: request.headers.get('user-agent'),
          ipAddress: request.headers.get('x-forwarded-for') || 
                    request.headers.get('x-real-ip') || 
                    'unknown',
          lifecycleAction: 'OPPORTUNITY_REMOVED',
          deletedStatus: existingSavedOpportunity.status
        }
      );
    } catch (auditError) {
      console.error('Failed to create opportunity removal audit log:', auditError);
    }

    return NextResponse.json({
      success: true,
      message: 'Saved opportunity removed successfully'
    });

  } catch (error) {
    console.error('Error removing saved opportunity:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to remove saved opportunity' },
      { status: 500 }
    );
  }
}