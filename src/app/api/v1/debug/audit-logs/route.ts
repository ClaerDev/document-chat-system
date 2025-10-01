/**
 * Debug endpoint to view recent audit logs
 * Helps troubleshoot audit logging visibility issues
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get user info
    const user = await db.user.findUnique({
      where: { clerkId: userId },
      select: { id: true, organizationId: true, firstName: true, lastName: true }
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get('entityType') || undefined;
    const operation = searchParams.get('operation') || undefined;
    const limit = parseInt(searchParams.get('limit') || '20');

    // Get recent audit logs for this organization
    const whereClause: any = {
      organizationId: user.organizationId
    };

    if (entityType) {
      whereClause.entityType = entityType;
    }

    if (operation) {
      whereClause.action = operation;
    }

    const auditLogs = await db.auditLog.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    });

    // Get counts by entity type
    const entityTypeCounts = await db.auditLog.groupBy({
      by: ['entityType'],
      where: {
        organizationId: user.organizationId,
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
        }
      },
      _count: {
        entityType: true
      }
    });

    // Get counts by action
    const actionCounts = await db.auditLog.groupBy({
      by: ['action'],
      where: {
        organizationId: user.organizationId,
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
        }
      },
      _count: {
        action: true
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        logs: auditLogs,
        summary: {
          totalLogs: auditLogs.length,
          organizationId: user.organizationId,
          timeWindow: '24 hours',
          entityTypeCounts: entityTypeCounts.reduce((acc, item) => {
            acc[item.entityType] = item._count.entityType;
            return acc;
          }, {} as Record<string, number>),
          actionCounts: actionCounts.reduce((acc, item) => {
            acc[item.action] = item._count.action;
            return acc;
          }, {} as Record<string, number>)
        },
        filters: {
          entityType,
          operation,
          limit
        }
      }
    });

  } catch (error) {
    console.error('🚨 Debug audit logs endpoint error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to retrieve audit logs',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}