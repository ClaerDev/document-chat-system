import { auth, currentUser } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createErrorResponse, handleApiError } from '@/lib/api-errors';
import { UsageTrackingService, UsageType } from '@/lib/usage-tracking';
import { cacheManager } from '@/lib/cache';

/**
 * @swagger
 * /api/billing/usage/check:
 *   get:
 *     summary: Check usage limits
 *     description: Checks if a specific usage type is within limits for the authenticated organization
 *     tags: [Billing]
 *     security:
 *       - ClerkAuth: []
 *     parameters:
 *       - in: query
 *         name: usageType
 *         required: true
 *         schema:
 *           type: string
 *           enum: [OPPORTUNITY_MATCH, AI_QUERY, DOCUMENT_PROCESSING, API_CALL, EXPORT, USER_SEAT, MATCH_SCORE_CALCULATION, SAVED_FILTER]
 *         description: The type of usage to check
 *       - in: query
 *         name: quantity
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Optional quantity to check if adding this amount would exceed limits
 *     responses:
 *       200:
 *         description: Usage limit check successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 allowed:
 *                   type: boolean
 *                   description: Whether the usage is allowed
 *                 currentUsage:
 *                   type: integer
 *                   description: Current usage count for this type
 *                 limit:
 *                   type: integer
 *                   description: Maximum allowed usage for this type
 *                 remainingUsage:
 *                   type: integer
 *                   description: Remaining usage available
 *                 percentUsed:
 *                   type: number
 *                   description: Percentage of limit used (0-100)
 *                 willExceedLimit:
 *                   type: boolean
 *                   description: Whether the requested quantity would exceed the limit
 *       400:
 *         description: Invalid request parameters
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Organization not found
 *       500:
 *         description: Internal server error
 *   post:
 *     summary: Check usage limits with detailed information
 *     description: Checks if a specific usage type is within limits with detailed information for UI display, including developer bypass handling
 *     tags: [Billing]
 *     security:
 *       - ClerkAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               usageType:
 *                 type: string
 *                 enum: [OPPORTUNITY_MATCH, AI_QUERY, DOCUMENT_PROCESSING, API_CALL, EXPORT, USER_SEAT, MATCH_SCORE_CALCULATION, SAVED_FILTER]
 *                 description: The type of usage to check
 *               quantity:
 *                 type: integer
 *                 minimum: 1
 *                 description: Optional quantity to check if adding this amount would exceed limits
 *             required:
 *               - usageType
 *     responses:
 *       200:
 *         description: Usage limit check successful with detailed information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 allowed:
 *                   type: boolean
 *                   description: Whether the usage is allowed
 *                 currentUsage:
 *                   type: integer
 *                   description: Current usage count for this type
 *                 limit:
 *                   type: integer
 *                   description: Maximum allowed usage for this type
 *                 remainingUsage:
 *                   type: integer
 *                   description: Remaining usage available
 *                 percentUsed:
 *                   type: number
 *                   description: Percentage of limit used (0-100)
 *                 willExceedLimit:
 *                   type: boolean
 *                   description: Whether the requested quantity would exceed the limit
 *                 canProceed:
 *                   type: boolean
 *                   description: Whether the user can proceed with the action
 *                 warningMessage:
 *                   type: string
 *                   description: Warning message to display to the user
 *                 upgradeMessage:
 *                   type: string
 *                   description: Message encouraging plan upgrade
 *                 isDeveloperOverride:
 *                   type: boolean
 *                   description: Whether this is a developer override allowing the action
 *       400:
 *         description: Invalid request parameters
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Organization not found
 *       500:
 *         description: Internal server error
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return createErrorResponse('Unauthorized', 401, 'UNAUTHORIZED');
    }

    const user = await currentUser();
    if (!user) {
      return createErrorResponse('User not found', 404, 'USER_NOT_FOUND');
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const usageType = searchParams.get('usageType');
    const requestedQuantity = parseInt(searchParams.get('quantity') || '0');

    if (!usageType) {
      return createErrorResponse('Usage type is required', 400, 'INVALID_PARAMETERS');
    }

    // Validate usage type
    const validUsageTypes = [
      'OPPORTUNITY_MATCH',
      'AI_QUERY',
      'DOCUMENT_PROCESSING',
      'API_CALL',
      'EXPORT',
      'USER_SEAT',
      'MATCH_SCORE_CALCULATION',
      'SAVED_FILTER'
    ];

    if (!validUsageTypes.includes(usageType)) {
      return createErrorResponse('Invalid usage type', 400, 'INVALID_USAGE_TYPE');
    }

    // Get user's organization
    const dbUser = await db.user.findUnique({
      where: { clerkId: user.id },
      select: { organizationId: true }
    });
    
    if (!dbUser?.organizationId) {
      return createErrorResponse('Organization not found', 404, 'ORGANIZATION_NOT_FOUND');
    }

    // Check usage using the service
    const usageCheck = await UsageTrackingService.checkUsageLimit(
      dbUser.organizationId,
      usageType as UsageType,
      requestedQuantity || 1
    );

    return NextResponse.json(usageCheck);

  } catch (error) {
    console.error('Error checking usage:', error);
    return handleApiError(error);
  }
}

/**
 * POST /api/billing/usage/check
 * Check usage limits with detailed information for UI display
 */
// Extract usage check logic for caching
async function fetchUsageCheck(organizationId: string, usageType: UsageType, quantity: number) {
  return await UsageTrackingService.checkUsageLimitWithDetails(
    organizationId,
    usageType,
    quantity
  );
}

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

    // Parse request body
    const body = await request.json();
    const { usageType, quantity = 1 } = body;

    if (!usageType) {
      return createErrorResponse('Usage type is required', 400, 'INVALID_PARAMETERS');
    }

    // Validate usage type
    const validUsageTypes = [
      'OPPORTUNITY_MATCH',
      'AI_QUERY',
      'DOCUMENT_PROCESSING',
      'API_CALL',
      'EXPORT',
      'USER_SEAT',
      'MATCH_SCORE_CALCULATION',
      'SAVED_FILTER'
    ];

    if (!validUsageTypes.includes(usageType)) {
      return createErrorResponse('Invalid usage type', 400, 'INVALID_USAGE_TYPE');
    }

    // Get user's organization
    const dbUser = await db.user.findUnique({
      where: { clerkId: user.id },
      select: { organizationId: true }
    });
    
    if (!dbUser?.organizationId) {
      return createErrorResponse('Organization not found', 404, 'ORGANIZATION_NOT_FOUND');
    }

    // Use cache with 60-second TTL for usage limit checks
    const result = await cacheManager.withCache(
      `usage_check:${dbUser.organizationId}:${usageType}:${quantity}`,
      () => fetchUsageCheck(dbUser.organizationId, usageType as UsageType, quantity),
      {
        ttl: 60, // 60 seconds
        organizationId: dbUser.organizationId,
        prefix: 'usage_check:'
      }
    );

    const usageData = result.data;
    
    // Transform response to match frontend expectations
    const response = {
      ...usageData,
      // Add frontend-expected fields if not present
      warningMessage: usageData.warningMessage || undefined,
      upgradeMessage: usageData.upgradeMessage || undefined,
      isDeveloperOverride: usageData.isDeveloperOverride || false
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error checking usage:', error);
    return handleApiError(error);
  }
}