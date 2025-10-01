import { auth, currentUser } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createErrorResponse, handleApiError } from '@/lib/api-errors';
import { SubscriptionManager } from '@/lib/subscription-manager';
import { z } from 'zod';

const validateSubscriptionSchema = z.object({
  planType: z.enum(['STARTER', 'PROFESSIONAL', 'AGENCY', 'ENTERPRISE']),
});

/**
 * @swagger
 * /api/billing/subscription/validate:
 *   post:
 *     summary: Validate subscription creation
 *     description: Validates if an organization can create a new subscription for the specified plan
 *     tags: [Billing]
 *     security:
 *       - ClerkAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - planType
 *             properties:
 *               planType:
 *                 type: string
 *                 enum: [STARTER, PROFESSIONAL, AGENCY, ENTERPRISE]
 *     responses:
 *       200:
 *         description: Validation result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 canCreateSubscription:
 *                   type: boolean
 *                 hasActiveSubscription:
 *                   type: boolean
 *                 existingPlan:
 *                   type: string
 *                 activeSubscriptions:
 *                   type: array
 *                   items:
 *                     type: object
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
export async function POST(request: NextRequest) {
  try {
    console.log('POST /api/billing/subscription/validate - Starting validation');

    const { userId } = await auth();
    if (!userId) {
      return createErrorResponse('Unauthorized', 401, 'UNAUTHORIZED');
    }

    const user = await currentUser();
    if (!user) {
      return createErrorResponse('User not found', 404, 'USER_NOT_FOUND');
    }

    const body = await request.json();
    const validatedData = validateSubscriptionSchema.parse(body);

    console.log('Subscription validation request:', { planType: validatedData.planType, userId: user.id });

    // Get user's organization from database
    const dbUser = await db.user.findUnique({
      where: { clerkId: user.id },
      select: { organizationId: true }
    });
    
    if (!dbUser) {
      return createErrorResponse('User not found in database', 404, 'USER_NOT_FOUND');
    }
    
    const organizationId = dbUser.organizationId;

    if (!organizationId) {
      return createErrorResponse('Organization not found', 404, 'ORGANIZATION_NOT_FOUND');
    }

    console.log(`Validating subscription for organization: ${organizationId}`);

    // Use SubscriptionManager to validate subscription creation
    const validationResult = await SubscriptionManager.validateSubscriptionCreation(
      organizationId,
      validatedData.planType
    );

    console.log('Validation result:', validationResult);

    return NextResponse.json({
      canCreateSubscription: validationResult.canCreateNewSubscription,
      hasActiveSubscription: validationResult.hasActiveSubscription,
      existingPlan: validationResult.existingPlan,
      activeSubscriptions: validationResult.activeSubscriptions.map(sub => ({
        id: sub.id,
        planType: sub.planType,
        status: sub.status,
        cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
        currentPeriodEnd: sub.currentPeriodEnd
      })),
      message: validationResult.message
    });

  } catch (error) {
    console.error('Error validating subscription:', error);
    return handleApiError(error);
  }
}

/**
 * @swagger
 * /api/billing/subscription/validate:
 *   get:
 *     summary: Get current subscription status
 *     description: Returns the current subscription status and validation info for the organization
 *     tags: [Billing]
 *     security:
 *       - ClerkAuth: []
 *     responses:
 *       200:
 *         description: Current subscription status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 hasActiveSubscription:
 *                   type: boolean
 *                 currentSubscription:
 *                   type: object
 *                   nullable: true
 *                 activeSubscriptions:
 *                   type: array
 *                   items:
 *                     type: object
 *                 duplicateSubscriptions:
 *                   type: boolean
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
export async function GET() {
  try {
    console.log('GET /api/billing/subscription/validate - Getting subscription status');

    const { userId } = await auth();
    if (!userId) {
      return createErrorResponse('Unauthorized', 401, 'UNAUTHORIZED');
    }

    const user = await currentUser();
    if (!user) {
      return createErrorResponse('User not found', 404, 'USER_NOT_FOUND');
    }

    // Get user's organization from database
    const dbUser = await db.user.findUnique({
      where: { clerkId: user.id },
      select: { organizationId: true }
    });
    
    if (!dbUser) {
      return createErrorResponse('User not found in database', 404, 'USER_NOT_FOUND');
    }
    
    const organizationId = dbUser.organizationId;

    if (!organizationId) {
      return createErrorResponse('Organization not found', 404, 'ORGANIZATION_NOT_FOUND');
    }

    console.log(`Getting subscription status for organization: ${organizationId}`);

    // Get current subscription
    const currentSubscription = await SubscriptionManager.getCurrentSubscription(organizationId);

    // Get all active subscriptions to check for duplicates
    const allActiveSubscriptions = await db.subscription.findMany({
      where: {
        organizationId,
        status: {
          in: ['ACTIVE', 'TRIALING', 'PAST_DUE']
        }
      },
      orderBy: [
        { updatedAt: 'desc' },
        { createdAt: 'desc' }
      ]
    });

    const hasDuplicates = allActiveSubscriptions.length > 1;

    if (hasDuplicates) {
      console.warn(`Organization has ${allActiveSubscriptions.length} active subscriptions - duplicates detected`);
    }

    return NextResponse.json({
      hasActiveSubscription: !!currentSubscription,
      currentSubscription: currentSubscription ? {
        id: currentSubscription.id,
        planType: currentSubscription.planType,
        status: currentSubscription.status,
        cancelAtPeriodEnd: currentSubscription.cancelAtPeriodEnd,
        currentPeriodEnd: currentSubscription.currentPeriodEnd,
        stripeSubscriptionId: currentSubscription.stripeSubscriptionId
      } : null,
      activeSubscriptions: allActiveSubscriptions.map(sub => ({
        id: sub.id,
        planType: sub.planType,
        status: sub.status,
        cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
        currentPeriodEnd: sub.currentPeriodEnd,
        stripeSubscriptionId: sub.stripeSubscriptionId
      })),
      duplicateSubscriptions: hasDuplicates,
      subscriptionCount: allActiveSubscriptions.length
    });

  } catch (error) {
    console.error('Error getting subscription status:', error);
    return handleApiError(error);
  }
}