import { auth, currentUser } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createErrorResponse, handleApiError } from '@/lib/api-errors';

/**
 * @swagger
 * /api/billing/usage/analytics:
 *   get:
 *     summary: Get usage analytics
 *     description: Retrieves detailed usage analytics and trends for the authenticated organization
 *     tags: [Billing]
 *     security:
 *       - ClerkAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [day, week, month, year]
 *           default: month
 *         description: Time period for analytics
 *       - in: query
 *         name: groupBy
 *         schema:
 *           type: string
 *           enum: [day, week, month, type]
 *           default: type
 *         description: How to group the analytics data
 *     responses:
 *       200:
 *         description: Usage analytics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 period:
 *                   type: object
 *                   properties:
 *                     start:
 *                       type: string
 *                       format: date-time
 *                     end:
 *                       type: string
 *                       format: date-time
 *                 totalEvents:
 *                   type: integer
 *                   description: Total number of usage events
 *                 usageByType:
 *                   type: object
 *                   description: Usage counts grouped by type
 *                 usageTrend:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       date:
 *                         type: string
 *                         format: date
 *                       count:
 *                         type: integer
 *                 topResources:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       resourceId:
 *                         type: string
 *                       resourceType:
 *                         type: string
 *                       count:
 *                         type: integer
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

    // Get user's organization
    const dbUser = await db.user.findUnique({
      where: { clerkId: user.id },
      select: { organizationId: true }
    });
    
    if (!dbUser?.organizationId) {
      return createErrorResponse('Organization not found', 404, 'ORGANIZATION_NOT_FOUND');
    }

    const searchParams = request.nextUrl.searchParams;
    const period = searchParams.get('period') || 'month';
    const groupBy = searchParams.get('groupBy') || 'type';

    // Calculate date range
    const now = new Date();
    let startDate: Date;
    
    switch (period) {
      case 'day':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    // Get all usage records for the period
    const usageRecords = await db.usageRecord.findMany({
      where: {
        organizationId: dbUser.organizationId,
        createdAt: {
          gte: startDate,
          lte: now,
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    // Aggregate usage by type
    const usageByType = usageRecords.reduce((acc, record) => {
      acc[record.usageType] = (acc[record.usageType] || 0) + record.quantity;
      return acc;
    }, {} as Record<string, number>);

    // Calculate daily usage trend
    const usageTrend: Array<{ date: string; count: number }> = [];
    const dailyUsage = usageRecords.reduce((acc, record) => {
      const date = record.createdAt.toISOString().split('T')[0];
      acc[date] = (acc[date] || 0) + record.quantity;
      return acc;
    }, {} as Record<string, number>);

    // Fill in missing dates with zeros
    const currentDate = new Date(startDate);
    while (currentDate <= now) {
      const dateStr = currentDate.toISOString().split('T')[0];
      usageTrend.push({
        date: dateStr,
        count: dailyUsage[dateStr] || 0,
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Get top resources
    const resourceUsage = usageRecords.reduce((acc, record) => {
      if (record.resourceId && record.resourceType) {
        const key = `${record.resourceType}:${record.resourceId}`;
        acc[key] = (acc[key] || 0) + record.quantity;
      }
      return acc;
    }, {} as Record<string, number>);

    const topResources = Object.entries(resourceUsage)
      .map(([key, count]) => {
        const [resourceType, ...resourceIdParts] = key.split(':');
        return {
          resourceId: resourceIdParts.join(':'),
          resourceType,
          count,
        };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Calculate daily averages
    const daysInPeriod = Math.ceil((now.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000));
    const dailyAverages = Object.entries(usageByType).reduce((acc, [type, total]) => {
      acc[type] = Math.round(total / daysInPeriod * 100) / 100;
      return acc;
    }, {} as Record<string, number>);

    return NextResponse.json({
      period: {
        start: startDate.toISOString(),
        end: now.toISOString(),
      },
      totalEvents: usageRecords.length,
      totalQuantity: usageRecords.reduce((sum, record) => sum + record.quantity, 0),
      usageByType,
      dailyAverages,
      usageTrend: groupBy === 'day' ? usageTrend : undefined,
      topResources,
      groupBy,
    });

  } catch (error) {
    console.error('Error fetching usage analytics:', error);
    return handleApiError(error);
  }
}