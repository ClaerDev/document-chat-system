/**
 * Account Deletion API
 * 
 * Handles account deletion requests following industry best practices:
 * - Immediate soft delete with PII anonymization
 * - Subscription cancellation and cleanup
 * - Scheduled hard deletion after grace period
 * - GDPR and financial compliance
 */

import { auth, currentUser } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { accountDeletionService } from '@/lib/account-deletion';
import { createErrorResponse, handleApiError } from '@/lib/api-errors';
import { z } from 'zod';

const deletionRequestSchema = z.object({
  reason: z.string().optional(),
  confirmText: z.string().min(1, 'Confirmation text is required'),
  gracePeriodDays: z.number().min(1).max(90).optional()
});

/**
 * @swagger
 * /api/account/delete:
 *   post:
 *     summary: Request account deletion
 *     description: |
 *       Initiates account deletion process following industry best practices.
 *       - Immediately cancels active subscriptions
 *       - Soft deletes and anonymizes PII data
 *       - Schedules hard deletion after grace period (default 30 days)
 *       - Retains billing/compliance data as required by law
 *     tags: [Account Management]
 *     security:
 *       - ClerkAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - confirmText
 *             properties:
 *               reason:
 *                 type: string
 *                 description: Optional reason for account deletion
 *               confirmText:
 *                 type: string
 *                 description: Confirmation text (must match requirements)
 *               gracePeriodDays:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 90
 *                 default: 30
 *                 description: Days before permanent deletion (1-90)
 *     responses:
 *       200:
 *         description: Account deletion initiated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 accountDeletionId:
 *                   type: string
 *                 status:
 *                   type: string
 *                   enum: [SOFT_DELETED]
 *                 softDeletedAt:
 *                   type: string
 *                   format: date-time
 *                 scheduledHardDeleteAt:
 *                   type: string
 *                   format: date-time
 *                 message:
 *                   type: string
 *                 auditTrail:
 *                   type: array
 *                   items:
 *                     type: string
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User or organization not found
 *       409:
 *         description: Deletion already in progress
 *       500:
 *         description: Internal server error
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return createErrorResponse('Unauthorized', 401, 'UNAUTHORIZED');
    }

    const user = await currentUser();
    if (!user) {
      return createErrorResponse('User not found', 404, 'USER_NOT_FOUND');
    }

    const body = await request.json();
    const validatedData = deletionRequestSchema.parse(body);

    // Validate confirmation text
    const expectedConfirmText = 'DELETE MY ACCOUNT';
    if (validatedData.confirmText !== expectedConfirmText) {
      return createErrorResponse(
        `Confirmation text must be exactly: "${expectedConfirmText}"`,
        400,
        'INVALID_CONFIRMATION'
      );
    }

    // Get user's organization
    const dbUser = await db.user.findUnique({
      where: { clerkId: user.id },
      select: { 
        id: true,
        organizationId: true,
        role: true
      }
    });

    if (!dbUser) {
      return createErrorResponse('User not found in database', 404, 'USER_NOT_FOUND');
    }

    // Check if user has permission to delete account
    if (dbUser.role !== 'OWNER') {
      return createErrorResponse(
        'Only organization owners can delete accounts',
        403,
        'INSUFFICIENT_PERMISSIONS'
      );
    }

    // Check if deletion already in progress
    const existingDeletion = await db.accountDeletion.findFirst({
      where: {
        organizationId: dbUser.organizationId,
        status: { in: ['REQUESTED', 'SOFT_DELETED', 'SCHEDULED'] }
      }
    });

    if (existingDeletion) {
      return createErrorResponse(
        'Account deletion is already in progress',
        409,
        'DELETION_IN_PROGRESS',
        { 
          accountDeletionId: existingDeletion.id,
          status: existingDeletion.status,
          requestedAt: existingDeletion.requestedAt
        }
      );
    }

    // Get user email for audit
    const userEmail = user.emailAddresses[0]?.emailAddress;

    // Initiate account deletion
    const deletionResult = await accountDeletionService.initiateAccountDeletion({
      organizationId: dbUser.organizationId,
      userId: user.id,
      requestedBy: dbUser.id,
      requestedByEmail: userEmail,
      reason: validatedData.reason,
      gracePeriodDays: validatedData.gracePeriodDays
    });

    return NextResponse.json({
      success: true,
      ...deletionResult
    });

  } catch (error) {
    console.error('Error processing account deletion:', error);
    
    if (error instanceof z.ZodError) {
      return createErrorResponse(
        'Invalid request data',
        400,
        'VALIDATION_ERROR',
        { errors: error.errors }
      );
    }

    return handleApiError(error);
  }
}

/**
 * @swagger
 * /api/account/delete:
 *   get:
 *     summary: Get account deletion status
 *     description: Retrieves the current status of account deletion for the organization
 *     tags: [Account Management]
 *     security:
 *       - ClerkAuth: []
 *     responses:
 *       200:
 *         description: Account deletion status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 hasPendingDeletion:
 *                   type: boolean
 *                 deletion:
 *                   type: object
 *                   nullable: true
 *                   properties:
 *                     id:
 *                       type: string
 *                     status:
 *                       type: string
 *                     requestedAt:
 *                       type: string
 *                       format: date-time
 *                     softDeletedAt:
 *                       type: string
 *                       format: date-time
 *                       nullable: true
 *                     scheduledHardDeleteAt:
 *                       type: string
 *                       format: date-time
 *                       nullable: true
 *                     daysUntilHardDelete:
 *                       type: number
 *                       nullable: true
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return createErrorResponse('Unauthorized', 401, 'UNAUTHORIZED');
    }

    const user = await currentUser();
    if (!user) {
      return createErrorResponse('User not found', 404, 'USER_NOT_FOUND');
    }

    // Get user's organization
    const dbUser = await db.user.findUnique({
      where: { clerkId: user.id },
      select: { organizationId: true }
    });

    if (!dbUser) {
      return createErrorResponse('User not found in database', 404, 'USER_NOT_FOUND');
    }

    // Get current deletion status
    const accountDeletion = await db.accountDeletion.findFirst({
      where: {
        organizationId: dbUser.organizationId,
        status: { in: ['REQUESTED', 'SOFT_DELETED', 'SCHEDULED'] }
      },
      orderBy: { requestedAt: 'desc' }
    });

    if (!accountDeletion) {
      return NextResponse.json({
        hasPendingDeletion: false,
        deletion: null
      });
    }

    // Calculate days until hard delete
    let daysUntilHardDelete = null;
    if (accountDeletion.scheduledHardDeleteAt) {
      const now = new Date();
      const hardDeleteDate = accountDeletion.scheduledHardDeleteAt;
      const diffTime = hardDeleteDate.getTime() - now.getTime();
      daysUntilHardDelete = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    return NextResponse.json({
      hasPendingDeletion: true,
      deletion: {
        id: accountDeletion.id,
        status: accountDeletion.status,
        requestedAt: accountDeletion.requestedAt,
        softDeletedAt: accountDeletion.softDeletedAt,
        scheduledHardDeleteAt: accountDeletion.scheduledHardDeleteAt,
        daysUntilHardDelete
      }
    });

  } catch (error) {
    console.error('Error fetching account deletion status:', error);
    return handleApiError(error);
  }
}