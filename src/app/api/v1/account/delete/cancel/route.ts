/**
 * Cancel Account Deletion API
 * 
 * Allows users to cancel account deletion during the grace period
 */

import { auth, currentUser } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { accountDeletionService } from '@/lib/account-deletion';
import { createErrorResponse, handleApiError } from '@/lib/api-errors';
import { z } from 'zod';

const cancelDeletionSchema = z.object({
  accountDeletionId: z.string().min(1),
  reason: z.string().optional()
});

/**
 * @swagger
 * /api/account/delete/cancel:
 *   post:
 *     summary: Cancel account deletion
 *     description: |
 *       Cancels a pending account deletion during the grace period.
 *       This action is only available before hard deletion occurs.
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
 *               - accountDeletionId
 *             properties:
 *               accountDeletionId:
 *                 type: string
 *                 description: ID of the account deletion to cancel
 *               reason:
 *                 type: string
 *                 description: Optional reason for cancellation
 *     responses:
 *       200:
 *         description: Account deletion cancelled successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 cancelledAt:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: Invalid request or cannot cancel
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: Deletion request not found
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
    const validatedData = cancelDeletionSchema.parse(body);

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

    // Check if user has permission to cancel deletion
    if (dbUser.role !== 'OWNER') {
      return createErrorResponse(
        'Only organization owners can cancel account deletion',
        403,
        'INSUFFICIENT_PERMISSIONS'
      );
    }

    // Get the deletion request
    const accountDeletion = await db.accountDeletion.findUnique({
      where: { id: validatedData.accountDeletionId }
    });

    if (!accountDeletion) {
      return createErrorResponse(
        'Account deletion request not found',
        404,
        'DELETION_NOT_FOUND'
      );
    }

    // Verify it belongs to this organization
    if (accountDeletion.organizationId !== dbUser.organizationId) {
      return createErrorResponse(
        'Account deletion request not found',
        404,
        'DELETION_NOT_FOUND'
      );
    }

    // Check if cancellation is allowed
    if (accountDeletion.status === 'HARD_DELETED') {
      return createErrorResponse(
        'Cannot cancel: account has already been permanently deleted',
        400,
        'ALREADY_HARD_DELETED'
      );
    }

    if (accountDeletion.status === 'CANCELLED') {
      return createErrorResponse(
        'Account deletion has already been cancelled',
        400,
        'ALREADY_CANCELLED'
      );
    }

    // Cancel the deletion
    await accountDeletionService.cancelAccountDeletion(
      validatedData.accountDeletionId,
      dbUser.id
    );

    const cancelledAt = new Date();

    return NextResponse.json({
      success: true,
      message: 'Account deletion has been cancelled successfully. Your account and data remain active.',
      cancelledAt: cancelledAt.toISOString()
    });

  } catch (error) {
    console.error('Error cancelling account deletion:', error);
    
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