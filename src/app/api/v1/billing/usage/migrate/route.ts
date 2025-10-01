import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { UsageTrackingService } from '@/lib/usage-tracking';
import { createErrorResponse, handleApiError } from '@/lib/api-errors';
import { z } from 'zod';

const migrationSchema = z.object({
  oldSubscriptionId: z.string().min(1, 'Old subscription ID is required'),
  newSubscriptionId: z.string().min(1, 'New subscription ID is required'),
  preserveOriginal: z.boolean().default(false),
});

/**
 * @swagger
 * /api/billing/usage/migrate:
 *   post:
 *     summary: Migrate usage data between subscriptions
 *     description: Manually migrate usage data from one subscription to another during plan changes
 *     tags: [Billing, Usage]
 *     security:
 *       - ClerkAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               oldSubscriptionId:
 *                 type: string
 *                 description: The ID of the old subscription to migrate from
 *               newSubscriptionId:
 *                 type: string
 *                 description: The ID of the new subscription to migrate to
 *               preserveOriginal:
 *                 type: boolean
 *                 default: false
 *                 description: Whether to preserve the original usage records
 *             required:
 *               - oldSubscriptionId
 *               - newSubscriptionId
 *     responses:
 *       200:
 *         description: Usage data migrated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 migratedRecords:
 *                   type: number
 *                 migrationId:
 *                   type: string
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Subscription not found
 *       500:
 *         description: Internal server error
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return createErrorResponse('Unauthorized', 401, 'UNAUTHORIZED');
    }

    // Get organization ID from user
    const userOrganization = await db.user.findFirst({
      where: { clerkId: userId },
      include: { organization: true }
    });

    if (!userOrganization) {
      return createErrorResponse('Organization not found', 404, 'ORGANIZATION_NOT_FOUND');
    }

    const organizationId = userOrganization.organization.id;

    // Check if user has permission to manage billing
    if (!['OWNER', 'ADMIN'].includes(userOrganization.role)) {
      return createErrorResponse('Insufficient permissions', 403, 'INSUFFICIENT_PERMISSIONS');
    }

    const body = await request.json();
    const validatedData = migrationSchema.parse(body);

    // Verify both subscriptions belong to the organization
    const [oldSubscription, newSubscription] = await Promise.all([
      db.subscription.findFirst({
        where: { 
          id: validatedData.oldSubscriptionId,
          organizationId 
        }
      }),
      db.subscription.findFirst({
        where: { 
          id: validatedData.newSubscriptionId,
          organizationId 
        }
      })
    ]);

    if (!oldSubscription) {
      return createErrorResponse('Old subscription not found', 404, 'OLD_SUBSCRIPTION_NOT_FOUND');
    }

    if (!newSubscription) {
      return createErrorResponse('New subscription not found', 404, 'NEW_SUBSCRIPTION_NOT_FOUND');
    }

    // Check if migration is needed
    const { periodStart, periodEnd } = await UsageTrackingService.getBillingPeriod(organizationId);
    
    const existingUsage = await db.usageRecord.findMany({
      where: {
        organizationId,
        subscriptionId: validatedData.oldSubscriptionId,
        createdAt: {
          gte: periodStart,
          lte: periodEnd
        }
      }
    });

    if (existingUsage.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No usage data found to migrate',
        migratedRecords: 0,
        migrationId: null
      });
    }

    // Perform migration
    await UsageTrackingService.migrateUsageForPlanSwitch(
      organizationId,
      validatedData.oldSubscriptionId,
      validatedData.newSubscriptionId
    );

    // Create migration audit record
    const migrationRecord = await db.usageMigration.create({
      data: {
        organizationId,
        oldSubscriptionId: validatedData.oldSubscriptionId,
        newSubscriptionId: validatedData.newSubscriptionId,
        recordsMigrated: existingUsage.length,
        periodStart,
        periodEnd,
        preservedOriginal: validatedData.preserveOriginal,
        migratedBy: userId,
        metadata: {
          oldPlan: oldSubscription.planType,
          newPlan: newSubscription.planType,
          migrationReason: 'manual_migration'
        }
      }
    });

    console.log(`✅ Manual usage migration completed: ${existingUsage.length} records migrated from ${validatedData.oldSubscriptionId} to ${validatedData.newSubscriptionId}`);

    return NextResponse.json({
      success: true,
      message: `Successfully migrated ${existingUsage.length} usage records`,
      migratedRecords: existingUsage.length,
      migrationId: migrationRecord.id
    });

  } catch (error) {
    console.error('Error in usage migration:', error);
    return handleApiError(error);
  }
}

/**
 * @swagger
 * /api/billing/usage/migrate:
 *   get:
 *     summary: Get usage migration history
 *     description: Retrieve the history of usage migrations for the organization
 *     tags: [Billing, Usage]
 *     security:
 *       - ClerkAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of migrations to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Number of migrations to skip
 *     responses:
 *       200:
 *         description: Migration history retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 migrations:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       oldSubscriptionId:
 *                         type: string
 *                       newSubscriptionId:
 *                         type: string
 *                       recordsMigrated:
 *                         type: number
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                       metadata:
 *                         type: object
 *                 total:
 *                   type: number
 *                 hasMore:
 *                   type: boolean
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Organization not found
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return createErrorResponse('Unauthorized', 401, 'UNAUTHORIZED');
    }

    // Get organization ID from user
    const userOrganization = await db.user.findFirst({
      where: { clerkId: userId },
      include: { organization: true }
    });

    if (!userOrganization) {
      return createErrorResponse('Organization not found', 404, 'ORGANIZATION_NOT_FOUND');
    }

    const organizationId = userOrganization.organization.id;

    // Get pagination parameters
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Get migration history
    const [migrations, total] = await Promise.all([
      db.usageMigration.findMany({
        where: { organizationId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          oldSubscription: {
            select: { planType: true }
          },
          newSubscription: {
            select: { planType: true }
          }
        }
      }),
      db.usageMigration.count({
        where: { organizationId }
      })
    ]);

    return NextResponse.json({
      migrations,
      total,
      hasMore: offset + limit < total
    });

  } catch (error) {
    console.error('Error fetching migration history:', error);
    return handleApiError(error);
  }
}