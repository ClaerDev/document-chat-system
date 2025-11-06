import { auth, currentUser } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createErrorResponse, handleApiError } from '@/lib/api-errors';
import { UsageTrackingService, UsageType } from '@/lib/usage-tracking';
import { cacheManager } from '@/lib/cache';
import { cacheInvalidator } from '@/lib/cache/invalidation';
import { z } from 'zod';

/**
 * @swagger
 * /api/billing/usage:
 *   get:
 *     summary: Get current usage statistics
 *     description: Retrieves current billing period usage for the authenticated organization
 *     tags: [Billing]
 *     security:
 *       - ClerkAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [current, last, all]
 *           default: current
 *         description: Which period to retrieve usage for
 *     responses:
 *       200:
 *         description: Usage statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 usage:
 *                   type: object
 *                   properties:
 *                     period:
 *                       type: object
 *                       properties:
 *                         start:
 *                           type: string
 *                           format: date-time
 *                         end:
 *                           type: string
 *                           format: date-time
 *                     totals:
 *                       type: object
 *                       properties:
 *                         OPPORTUNITY_MATCH:
 *                           type: number
 *                         AI_QUERY:
 *                           type: number
 *                         DOCUMENT_PROCESSING:
 *                           type: number
 *                         API_CALL:
 *                           type: number
 *                         EXPORT:
 *                           type: number
 *                     limits:
 *                       type: object
 *                       properties:
 *                         matchesPerMonth:
 *                           type: number
 *                         aiQueriesPerMonth:
 *                           type: number
 *                         documentsPerMonth:
 *                           type: number
 *                     percentUsed:
 *                       type: object
 *                       properties:
 *                         matches:
 *                           type: number
 *                         aiQueries:
 *                           type: number
 *                         documents:
 *                           type: number
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Organization not found
 *       500:
 *         description: Internal server error
 */
// Extract usage data fetching logic for caching
async function fetchUsageData(organizationId: string, period: string) {

    // Get current subscription to determine limits
    const subscription = await db.subscription.findFirst({
      where: {
        organizationId,
        status: {
          in: ['ACTIVE', 'TRIALING', 'PAST_DUE']
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Calculate period dates using enhanced billing period calculation that preserves usage across plan switches
    let periodStart: Date;
    let periodEnd: Date;

    if (period === 'current') {
      // Use enhanced billing period calculation from UsageTrackingService
      const billingPeriod = await UsageTrackingService.getBillingPeriod(organizationId);
      periodStart = billingPeriod.periodStart;
      periodEnd = billingPeriod.periodEnd;
    } else if (period === 'last') {
      // For last period, we need to calculate based on current enhanced period
      const currentPeriod = await UsageTrackingService.getBillingPeriod(organizationId);
      const cycleLength = currentPeriod.periodEnd.getTime() - currentPeriod.periodStart.getTime();
      periodEnd = new Date(currentPeriod.periodStart.getTime() - 1);
      periodStart = new Date(periodEnd.getTime() - cycleLength + 1);
    } else {
      // All time
      periodStart = new Date(0);
      periodEnd = new Date();
    }

    // Get usage records for the period
    const usageRecords = await db.usageRecord.findMany({
      where: {
        organizationId,
        createdAt: {
          gte: periodStart,
          lte: periodEnd
        }
      },
      select: {
        usageType: true,
        quantity: true,
        createdAt: true,
        resourceType: true,
      }
    });

    // Aggregate usage by type
    const usageTotals = usageRecords.reduce((acc, record) => {
      acc[record.usageType] = (acc[record.usageType] || 0) + record.quantity;
      return acc;
    }, {} as Record<string, number>);

    // Note: SavedSearch model has been removed from schema
    // Using usage tracking data for SAVED_SEARCH count instead
    // If you need to re-enable this feature, add SavedSearch model to prisma/schema.prisma
    // For now, SAVED_SEARCH count comes from usage tracking or defaults to 0
    usageTotals.SAVED_SEARCH = usageTotals.SAVED_SEARCH || 0;

    // Get limits from subscription
    const limits = subscription?.limits as any || {
      matchesPerMonth: 100,
      aiQueriesPerMonth: 50,
      documentsPerMonth: 10,
    };

    // Calculate percentage used
    const percentUsed = {
      matches: limits.matchesPerMonth > 0 
        ? Math.round(((usageTotals.OPPORTUNITY_MATCH || 0) / limits.matchesPerMonth) * 100)
        : 0,
      aiQueries: limits.aiQueriesPerMonth > 0
        ? Math.round(((usageTotals.AI_QUERY || 0) / limits.aiQueriesPerMonth) * 100)
        : 0,
      documents: limits.documentsPerMonth > 0
        ? Math.round(((usageTotals.DOCUMENT_PROCESSING || 0) / limits.documentsPerMonth) * 100)
        : 0,
      matchScoreCalculations: limits.matchScoreCalculations > 0
        ? Math.round(((usageTotals.MATCH_SCORE_CALCULATION || 0) / limits.matchScoreCalculations) * 100)
        : 0,
      savedSearches: limits.savedSearches > 0
        ? Math.round(((usageTotals.SAVED_SEARCH || 0) / limits.savedSearches) * 100)
        : 0,
    };

  return {
    usage: {
      period: {
        start: periodStart.toISOString(),
        end: periodEnd.toISOString()
      },
      totals: {
        OPPORTUNITY_MATCH: usageTotals.OPPORTUNITY_MATCH || 0,
        AI_QUERY: usageTotals.AI_QUERY || 0,
        DOCUMENT_PROCESSING: usageTotals.DOCUMENT_PROCESSING || 0,
        API_CALL: usageTotals.API_CALL || 0,
        EXPORT: usageTotals.EXPORT || 0,
        MATCH_SCORE_CALCULATION: usageTotals.MATCH_SCORE_CALCULATION || 0,
        SAVED_SEARCH: usageTotals.SAVED_SEARCH || 0,
      },
      limits,
      percentUsed,
      recordCount: usageRecords.length,
    }
  };
}

export async function GET(request: NextRequest) {
  try {
    console.log('[USAGE API] Starting GET request');

    const { userId } = await auth();
    if (!userId) {
      console.log('[USAGE API] No userId from auth');
      return createErrorResponse('Unauthorized', 401, 'UNAUTHORIZED');
    }

    console.log('[USAGE API] Got userId:', userId);

    const user = await currentUser();
    if (!user) {
      console.log('[USAGE API] No user from currentUser()');
      return createErrorResponse('User not found', 404, 'USER_NOT_FOUND');
    }

    console.log('[USAGE API] Got current user');

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'current';
    console.log('[USAGE API] Period:', period);

    // Get user's organization from database
    console.log('[USAGE API] Fetching user from database...');
    const dbUser = await db.user.findUnique({
      where: { clerkId: user.id },
      select: { organizationId: true }
    });

    if (!dbUser) {
      console.log('[USAGE API] User not found in database');
      return createErrorResponse('User not found in database', 404, 'USER_NOT_FOUND');
    }

    let organizationId = dbUser.organizationId;
    console.log('[USAGE API] Organization ID:', organizationId);

    // **AUTO-FIX**: If user doesn't have organization, create one automatically
    if (!organizationId) {
      console.log('[USAGE API] No organization ID for user, creating one...');

      try {
        // First check if an organization was created by another concurrent request
        const refreshedUser = await db.user.findUnique({
          where: { clerkId: user.id },
          select: { organizationId: true }
        });

        if (refreshedUser?.organizationId) {
          console.log('[USAGE API] Organization created by concurrent request:', refreshedUser.organizationId);
          organizationId = refreshedUser.organizationId;
        } else {
          // Create organization with unique slug
          const organization = await db.organization.create({
            data: {
              name: `${user.firstName || 'User'} ${user.lastName || 'Organization'}`,
              slug: `org-${userId.slice(0, 12)}-${Date.now()}`,
            }
          });

          console.log('[USAGE API] Created organization:', organization.id);

          // Update user with organization
          await db.user.update({
            where: { clerkId: user.id },
            data: { organizationId: organization.id }
          });

          organizationId = organization.id;
          console.log('[USAGE API] Updated user with organization');
        }
      } catch (orgError: any) {
        console.error('[USAGE API] Failed to create organization:', orgError);

        // Check if it's a unique constraint error - another request might have created it
        if (orgError.code === 'P2002') {
          console.log('[USAGE API] Unique constraint error, re-fetching user...');
          const refreshedUser = await db.user.findUnique({
            where: { clerkId: user.id },
            select: { organizationId: true }
          });

          if (refreshedUser?.organizationId) {
            organizationId = refreshedUser.organizationId;
            console.log('[USAGE API] Found organization after constraint error:', organizationId);
          } else {
            return createErrorResponse('Failed to create organization', 500, 'ORGANIZATION_CREATION_FAILED');
          }
        } else {
          return createErrorResponse('Failed to create organization', 500, 'ORGANIZATION_CREATION_FAILED');
        }
      }
    }

    // Use cache with 60-second TTL for usage data
    console.log('[USAGE API] Fetching usage data with cache...');
    const result = await cacheManager.withCache(
      `usage:${organizationId}:${period}`,
      () => fetchUsageData(organizationId, period),
      {
        ttl: 60, // 60 seconds
        organizationId,
        prefix: 'usage:'
      }
    );

    console.log('[USAGE API] Got usage data, cached:', result.cached);

    // Track this API call (only for cache misses to avoid double-counting)
    if (!result.cached) {
      try {
        await UsageTrackingService.trackUsage({
          organizationId,
          usageType: UsageType.API_CALL,
          quantity: 1,
          resourceType: 'billing_usage',
          metadata: {
            endpoint: '/api/billing/usage',
            period: period,
            cached: result.cached
          }
        });
      } catch (trackingError) {
        console.warn('[USAGE API] Failed to track billing API usage:', trackingError);
        // Don't fail the request if tracking fails
      }
    }

    console.log('[USAGE API] Returning success response');
    return NextResponse.json(result.data);

  } catch (error) {
    console.error('[USAGE API] Error fetching usage:', error);
    console.error('[USAGE API] Error stack:', error instanceof Error ? error.stack : 'No stack');
    console.error('[USAGE API] Error name:', error instanceof Error ? error.name : 'Unknown');
    console.error('[USAGE API] Error message:', error instanceof Error ? error.message : 'Unknown');

    // Return empty usage data as fallback instead of failing
    return NextResponse.json({
      usage: {
        period: {
          start: new Date().toISOString(),
          end: new Date().toISOString()
        },
        totals: {
          OPPORTUNITY_MATCH: 0,
          AI_QUERY: 0,
          DOCUMENT_PROCESSING: 0,
          API_CALL: 0,
          EXPORT: 0,
          MATCH_SCORE_CALCULATION: 0,
          SAVED_SEARCH: 0,
        },
        limits: {
          matchesPerMonth: 100,
          aiQueriesPerMonth: 50,
          documentsPerMonth: 10,
          matchScoreCalculations: 1000,
          savedSearches: 10,
        },
        percentUsed: {
          matches: 0,
          aiQueries: 0,
          documents: 0,
          matchScoreCalculations: 0,
          savedSearches: 0,
        },
        recordCount: 0,
      },
      error: 'Failed to fetch usage data, showing defaults'
    });
  }
}

const recordUsageSchema = z.object({
  usageType: z.enum(['OPPORTUNITY_MATCH', 'AI_QUERY', 'DOCUMENT_PROCESSING', 'API_CALL', 'EXPORT', 'USER_SEAT', 'MATCH_SCORE_CALCULATION', 'SAVED_SEARCH']),
  quantity: z.number().int().positive().default(1),
  resourceId: z.string().optional(),
  resourceType: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});

/**
 * @swagger
 * /api/billing/usage:
 *   post:
 *     summary: Record usage event
 *     description: Records a usage event for billing tracking
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
 *               - usageType
 *             properties:
 *               usageType:
 *                 type: string
 *                 enum: [OPPORTUNITY_MATCH, AI_QUERY, DOCUMENT_PROCESSING, API_CALL, EXPORT, USER_SEAT]
 *               quantity:
 *                 type: number
 *                 minimum: 1
 *                 default: 1
 *               resourceId:
 *                 type: string
 *                 description: ID of the resource being tracked
 *               resourceType:
 *                 type: string
 *                 description: Type of resource (opportunity, document, etc.)
 *               metadata:
 *                 type: object
 *                 description: Additional context for the usage event
 *     responses:
 *       201:
 *         description: Usage recorded successfully
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Usage limit exceeded
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
    const validatedData = recordUsageSchema.parse(body);

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

    // Get current subscription
    const subscription = await db.subscription.findFirst({
      where: {
        organizationId,
        status: {
          in: ['ACTIVE', 'TRIALING', 'PAST_DUE']
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Check usage limits if subscription exists
    if (subscription) {
      const limits = subscription.limits as any;
      
      // Use subscription billing period for limit checking
      let periodStart: Date;
      if (subscription.currentPeriodStart) {
        periodStart = new Date(subscription.currentPeriodStart);
      } else {
        // Fallback to calendar month
        const now = new Date();
        periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      }
      
      // Get current billing period usage
      const currentUsage = await db.usageRecord.aggregate({
        where: {
          organizationId,
          usageType: validatedData.usageType,
          createdAt: {
            gte: periodStart
          }
        },
        _sum: {
          quantity: true
        }
      });

      const currentTotal = (currentUsage._sum.quantity || 0) + validatedData.quantity;
      
      // Check specific limits
      let limitExceeded = false;
      if (validatedData.usageType === 'OPPORTUNITY_MATCH' && limits.matchesPerMonth > 0) {
        limitExceeded = currentTotal > limits.matchesPerMonth;
      } else if (validatedData.usageType === 'AI_QUERY' && limits.aiQueriesPerMonth > 0) {
        limitExceeded = currentTotal > limits.aiQueriesPerMonth;
      } else if (validatedData.usageType === 'DOCUMENT_PROCESSING' && limits.documentsPerMonth > 0) {
        limitExceeded = currentTotal > limits.documentsPerMonth;
      }

      if (limitExceeded) {
        return createErrorResponse('Usage limit exceeded for this billing period', 403, 'USAGE_LIMIT_EXCEEDED');
      }
    }

    // Record the usage with correct billing period
    let usagePeriodStart: Date;
    let usagePeriodEnd: Date;
    
    if (subscription?.currentPeriodStart && subscription?.currentPeriodEnd) {
      usagePeriodStart = new Date(subscription.currentPeriodStart);
      usagePeriodEnd = new Date(subscription.currentPeriodEnd);
    } else {
      // Fallback to calendar month
      const now = new Date();
      usagePeriodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      usagePeriodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    }

    const usageRecord = await db.usageRecord.create({
      data: {
        organizationId,
        subscriptionId: subscription?.id,
        usageType: validatedData.usageType,
        quantity: validatedData.quantity,
        periodStart: usagePeriodStart,
        periodEnd: usagePeriodEnd,
        resourceId: validatedData.resourceId,
        resourceType: validatedData.resourceType,
        metadata: validatedData.metadata,
      }
    });

    // Clear usage cache and usage check cache since new usage was recorded
    try {
      await cacheInvalidator.invalidateByPattern(`usage:${organizationId}:*`);
      await cacheInvalidator.invalidateByPattern(`usage_check:${organizationId}:*`);
      console.log('Cleared usage and usage check cache due to new usage record');
    } catch (cacheError) {
      console.warn('Failed to clear usage cache:', cacheError);
    }

    return NextResponse.json(
      {
        usageRecord: {
          id: usageRecord.id,
          usageType: usageRecord.usageType,
          quantity: usageRecord.quantity,
          createdAt: usageRecord.createdAt,
        }
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('Error recording usage:', error);
    return handleApiError(error);
  }
}