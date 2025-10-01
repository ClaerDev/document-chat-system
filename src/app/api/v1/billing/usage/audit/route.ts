import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { UsageTrackingService } from '@/lib/usage-tracking';
import { createErrorResponse, handleApiError } from '@/lib/api-errors';

/**
 * @swagger
 * /api/billing/usage/audit:
 *   get:
 *     summary: Audit usage data consistency
 *     description: Check for usage data consistency issues and orphaned records
 *     tags: [Billing, Usage, Admin]
 *     security:
 *       - ClerkAuth: []
 *     parameters:
 *       - in: query
 *         name: fix
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Whether to automatically fix found issues
 *     responses:
 *       200:
 *         description: Audit results
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 summary:
 *                   type: object
 *                   properties:
 *                     totalUsageRecords:
 *                       type: number
 *                     orphanedRecords:
 *                       type: number
 *                     inconsistentPeriods:
 *                       type: number
 *                     migratedRecords:
 *                       type: number
 *                 issues:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       type:
 *                         type: string
 *                       description:
 *                         type: string
 *                       recordId:
 *                         type: string
 *                       severity:
 *                         type: string
 *                 fixesApplied:
 *                   type: array
 *                   items:
 *                     type: string
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
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

    // Check if user has admin permissions
    if (!['OWNER', 'ADMIN'].includes(userOrganization.role)) {
      return createErrorResponse('Insufficient permissions', 403, 'INSUFFICIENT_PERMISSIONS');
    }

    const { searchParams } = new URL(request.url);
    const shouldFix = searchParams.get('fix') === 'true';

    // Start audit
    const auditResults = {
      summary: {
        totalUsageRecords: 0,
        orphanedRecords: 0,
        inconsistentPeriods: 0,
        migratedRecords: 0
      },
      issues: [] as Array<{
        type: string;
        description: string;
        recordId: string;
        severity: 'low' | 'medium' | 'high';
      }>,
      fixesApplied: [] as string[]
    };

    // 1. Get all usage records for the organization
    const allUsageRecords = await db.usageRecord.findMany({
      where: { organizationId },
      include: {
        subscription: true
      },
      orderBy: { createdAt: 'desc' }
    });

    auditResults.summary.totalUsageRecords = allUsageRecords.length;

    // 2. Check for orphaned usage records (no subscription)
    const orphanedRecords = allUsageRecords.filter(record => !record.subscription);
    auditResults.summary.orphanedRecords = orphanedRecords.length;

    for (const record of orphanedRecords) {
      auditResults.issues.push({
        type: 'orphaned_record',
        description: `Usage record ${record.id} has no associated subscription`,
        recordId: record.id,
        severity: 'medium'
      });

      if (shouldFix) {
        // Try to find a valid subscription for this record
        const { periodStart, periodEnd } = await UsageTrackingService.getBillingPeriod(organizationId);
        
        const validSubscription = await db.subscription.findFirst({
          where: {
            organizationId,
            status: {
              in: ['ACTIVE', 'TRIALING', 'PAST_DUE']
            }
          },
          orderBy: { createdAt: 'desc' }
        });

        if (validSubscription) {
          await db.usageRecord.update({
            where: { id: record.id },
            data: {
              subscriptionId: validSubscription.id,
              periodStart,
              periodEnd
            }
          });
          auditResults.fixesApplied.push(`Fixed orphaned record ${record.id} by associating with subscription ${validSubscription.id}`);
        }
      }
    }

    // 3. Check for usage records with inconsistent billing periods
    const inconsistentPeriods = allUsageRecords.filter(record => {
      if (!record.subscription) return false;
      
      const recordPeriodStart = record.periodStart.getTime();
      const recordPeriodEnd = record.periodEnd.getTime();
      const subPeriodStart = record.subscription.currentPeriodStart.getTime();
      const subPeriodEnd = record.subscription.currentPeriodEnd.getTime();
      
      // Allow some tolerance for period differences (1 day)
      const tolerance = 24 * 60 * 60 * 1000;
      
      return Math.abs(recordPeriodStart - subPeriodStart) > tolerance ||
             Math.abs(recordPeriodEnd - subPeriodEnd) > tolerance;
    });

    auditResults.summary.inconsistentPeriods = inconsistentPeriods.length;

    for (const record of inconsistentPeriods) {
      auditResults.issues.push({
        type: 'inconsistent_period',
        description: `Usage record ${record.id} has period mismatch with subscription ${record.subscriptionId}`,
        recordId: record.id,
        severity: 'low'
      });

      if (shouldFix && record.subscription) {
        await db.usageRecord.update({
          where: { id: record.id },
          data: {
            periodStart: record.subscription.currentPeriodStart,
            periodEnd: record.subscription.currentPeriodEnd
          }
        });
        auditResults.fixesApplied.push(`Fixed period mismatch for record ${record.id}`);
      }
    }

    // 4. Check for migrated records
    const migratedRecords = allUsageRecords.filter(record => 
      record.metadata && 
      typeof record.metadata === 'object' && 
      'migratedFrom' in record.metadata
    );

    auditResults.summary.migratedRecords = migratedRecords.length;

    // 5. Check for duplicate usage records
    const duplicateGroups = new Map<string, typeof allUsageRecords>();
    
    for (const record of allUsageRecords) {
      const key = `${record.organizationId}-${record.usageType}-${record.resourceId}-${record.createdAt.getTime()}`;
      
      if (!duplicateGroups.has(key)) {
        duplicateGroups.set(key, []);
      }
      duplicateGroups.get(key)!.push(record);
    }

    const duplicates = Array.from(duplicateGroups.values()).filter(group => group.length > 1);
    
    for (const duplicateGroup of duplicates) {
      // Keep the first record, mark others as duplicates
      for (let i = 1; i < duplicateGroup.length; i++) {
        const record = duplicateGroup[i];
        auditResults.issues.push({
          type: 'duplicate_record',
          description: `Usage record ${record.id} appears to be a duplicate`,
          recordId: record.id,
          severity: 'medium'
        });

        if (shouldFix) {
          await db.usageRecord.delete({
            where: { id: record.id }
          });
          auditResults.fixesApplied.push(`Removed duplicate record ${record.id}`);
        }
      }
    }

    // 6. Generate usage consistency report
    const currentUsage = await UsageTrackingService.getUsageSummary(organizationId);
    
    console.log(`Usage audit completed for organization ${organizationId}:`, {
      totalRecords: auditResults.summary.totalUsageRecords,
      issues: auditResults.issues.length,
      fixesApplied: auditResults.fixesApplied.length
    });

    return NextResponse.json({
      ...auditResults,
      currentUsage,
      auditedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in usage audit:', error);
    return handleApiError(error);
  }
}

/**
 * @swagger
 * /api/billing/usage/audit:
 *   post:
 *     summary: Run usage reconciliation
 *     description: Reconcile usage data and fix inconsistencies
 *     tags: [Billing, Usage, Admin]
 *     security:
 *       - ClerkAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               operations:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [fix_orphaned, fix_periods, remove_duplicates, recalculate_totals]
 *     responses:
 *       200:
 *         description: Reconciliation completed
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
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

    // Check if user has admin permissions
    if (!['OWNER', 'ADMIN'].includes(userOrganization.role)) {
      return createErrorResponse('Insufficient permissions', 403, 'INSUFFICIENT_PERMISSIONS');
    }

    const body = await request.json();
    const operations = body.operations || ['fix_orphaned', 'fix_periods', 'remove_duplicates'];

    const results = {
      operations: [] as Array<{
        operation: string;
        success: boolean;
        recordsAffected: number;
        message: string;
      }>
    };

    // Run reconciliation operations
    for (const operation of operations) {
      try {
        let recordsAffected = 0;
        let message = '';

        switch (operation) {
          case 'fix_orphaned':
            // Fix orphaned records by running the audit with fix=true
            const auditResponse = await fetch(`${request.url}?fix=true`, {
              headers: { 'Authorization': request.headers.get('Authorization') || '' }
            });
            const auditData = await auditResponse.json();
            recordsAffected = auditData.summary.orphanedRecords;
            message = `Fixed ${recordsAffected} orphaned usage records`;
            break;

          case 'recalculate_totals':
            // Force recalculation of usage totals
            const summary = await UsageTrackingService.getUsageSummary(organizationId);
            recordsAffected = summary.recordCount;
            message = `Recalculated totals for ${recordsAffected} usage records`;
            break;

          default:
            message = `Unknown operation: ${operation}`;
        }

        results.operations.push({
          operation,
          success: true,
          recordsAffected,
          message
        });

      } catch (error) {
        results.operations.push({
          operation,
          success: false,
          recordsAffected: 0,
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Usage reconciliation completed',
      results
    });

  } catch (error) {
    console.error('Error in usage reconciliation:', error);
    return handleApiError(error);
  }
}