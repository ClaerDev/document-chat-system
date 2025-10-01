/**
 * Hard Deletion Cron Job
 * 
 * Processes scheduled hard deletions after the grace period.
 * This endpoint should be called by a cron service (Vercel Cron, GitHub Actions, etc.)
 */

import { NextRequest, NextResponse } from 'next/server';
import { accountDeletionService } from '@/lib/account-deletion';
import { createErrorResponse } from '@/lib/api-errors';
import { auth } from '@/lib/config/env';

/**
 * @swagger
 * /api/cron/hard-delete:
 *   post:
 *     summary: Process scheduled hard deletions
 *     description: |
 *       Cron job endpoint that processes accounts scheduled for hard deletion.
 *       Should be called daily by an external cron service.
 *       Requires CRON_SECRET environment variable for authentication.
 *     tags: [Cron Jobs]
 *     security:
 *       - CronSecret: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               secret:
 *                 type: string
 *                 description: Cron secret for authentication
 *               dryRun:
 *                 type: boolean
 *                 description: If true, only reports what would be deleted
 *     responses:
 *       200:
 *         description: Hard deletion process completed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 processed:
 *                   type: number
 *                 failed:
 *                   type: number
 *                 results:
 *                   type: array
 *                   items:
 *                     type: object
 *       401:
 *         description: Unauthorized - invalid cron secret
 *       500:
 *         description: Internal server error
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate cron request
    const authHeader = request.headers.get('Authorization');
    const providedSecret = authHeader?.replace('Bearer ', '');
    
    // Also check body for secret (for flexibility)
    let bodySecret: string | undefined;
    try {
      const body = await request.json();
      bodySecret = body.secret;
    } catch {
      // Body is not JSON or doesn't exist, that's ok
    }

    const cronSecret = auth.cronSecret;
    const secret = providedSecret || bodySecret;

    if (!cronSecret) {
      console.warn('CRON_SECRET not configured - skipping hard deletion');
      return NextResponse.json({
        success: false,
        error: 'Cron secret not configured',
        processed: 0,
        failed: 0
      });
    }

    if (!secret || secret !== cronSecret) {
      return createErrorResponse('Unauthorized', 401, 'INVALID_CRON_SECRET');
    }

    console.log('🕐 Starting hard deletion cron job...');

    // Get accounts pending hard deletion
    const pendingDeletions = await accountDeletionService.getPendingHardDeletions();
    
    console.log(`📋 Found ${pendingDeletions.length} accounts pending hard deletion`);

    if (pendingDeletions.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No accounts pending hard deletion',
        processed: 0,
        failed: 0,
        results: []
      });
    }

    const results = [];
    let processed = 0;
    let failed = 0;

    // Process each pending deletion
    for (const deletion of pendingDeletions) {
      try {
        console.log(`🗑️ Processing hard deletion for account: ${deletion.id} (org: ${deletion.organizationId})`);
        
        await accountDeletionService.performHardDeletion(deletion.id);
        
        processed++;
        results.push({
          accountDeletionId: deletion.id,
          organizationId: deletion.organizationId,
          status: 'success',
          processedAt: new Date().toISOString()
        });

        console.log(`✅ Successfully hard deleted account: ${deletion.id}`);

      } catch (error) {
        failed++;
        const errorMessage = error instanceof Error ? error.message : String(error);
        
        results.push({
          accountDeletionId: deletion.id,
          organizationId: deletion.organizationId,
          status: 'failed',
          error: errorMessage,
          failedAt: new Date().toISOString()
        });

        console.error(`❌ Failed to hard delete account ${deletion.id}:`, error);
      }
    }

    console.log(`🏁 Hard deletion cron job completed. Processed: ${processed}, Failed: ${failed}`);

    // Log summary for monitoring
    if (failed > 0) {
      console.error(`⚠️ Hard deletion failures detected: ${failed}/${pendingDeletions.length} failed`);
    }

    return NextResponse.json({
      success: true,
      message: `Hard deletion process completed. ${processed} successful, ${failed} failed.`,
      processed,
      failed,
      results
    });

  } catch (error) {
    console.error('❌ Hard deletion cron job failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      processed: 0,
      failed: 0
    }, { status: 500 });
  }
}

/**
 * @swagger
 * /api/cron/hard-delete:
 *   get:
 *     summary: Get pending hard deletions
 *     description: |
 *       Returns information about accounts pending hard deletion.
 *       Requires CRON_SECRET for authentication.
 *     tags: [Cron Jobs]
 *     security:
 *       - CronSecret: []
 *     parameters:
 *       - name: secret
 *         in: query
 *         required: true
 *         schema:
 *           type: string
 *         description: Cron secret for authentication
 *     responses:
 *       200:
 *         description: Pending deletions retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 pending:
 *                   type: number
 *                 deletions:
 *                   type: array
 *                   items:
 *                     type: object
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate request
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get('secret');
    const cronSecret = auth.cronSecret;

    if (!cronSecret || !secret || secret !== cronSecret) {
      return createErrorResponse('Unauthorized', 401, 'INVALID_CRON_SECRET');
    }

    // Get pending deletions
    const pendingDeletions = await accountDeletionService.getPendingHardDeletions();

    return NextResponse.json({
      pending: pendingDeletions.length,
      deletions: pendingDeletions.map(deletion => ({
        accountDeletionId: deletion.id,
        organizationId: deletion.organizationId,
        scheduledHardDeleteAt: deletion.scheduledHardDeleteAt,
        daysOverdue: Math.floor(
          (new Date().getTime() - deletion.scheduledHardDeleteAt.getTime()) / (1000 * 60 * 60 * 24)
        )
      }))
    });

  } catch (error) {
    console.error('Error fetching pending hard deletions:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}