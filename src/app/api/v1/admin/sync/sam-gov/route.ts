/**
 * SAM.gov Sync Management API
 * 
 * Administrative endpoint to trigger and monitor SAM.gov opportunities synchronization
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { inngest } from '@/lib/inngest/client'
import { rateLimit } from '@/lib/rate-limit'

// Request schema for triggering sync
const TriggerSyncSchema = z.object({
  fullSync: z.boolean().default(false).describe('Whether to perform full sync or incremental'),
  organizationId: z.string().optional().describe('Specific organization to sync for (optional)'),
  priority: z.enum(['low', 'normal', 'high']).default('normal').describe('Job priority level'),
  filters: z.record(z.any()).optional().describe('Additional filters for sync')
})

/**
 * @swagger
 * /api/v1/admin/sync/sam-gov:
 *   post:
 *     tags: [Admin, Data Sync]
 *     summary: Trigger SAM.gov opportunities synchronization
 *     description: |
 *       Manually trigger a SAM.gov opportunities sync job. This will fetch real opportunities
 *       from SAM.gov and store them in the database for matching and scoring.
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fullSync:
 *                 type: boolean
 *                 default: false
 *                 description: Whether to perform full sync or incremental
 *               organizationId:
 *                 type: string
 *                 description: Specific organization to sync for (optional)
 *               priority:
 *                 type: string
 *                 enum: [low, normal, high]
 *                 default: normal
 *                 description: Job priority level
 *               filters:
 *                 type: object
 *                 description: Additional filters for sync
 *     responses:
 *       200:
 *         description: Sync job triggered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "SAM.gov sync job triggered successfully"
 *                 jobId:
 *                   type: string
 *                   description: Background job identifier
 *                 estimatedDuration:
 *                   type: string
 *                   example: "5-15 minutes"
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Insufficient permissions (admin required)
 *       429:
 *         description: Rate limit exceeded
 *       500:
 *         description: Internal server error
 */
export async function POST(request: NextRequest) {
  try {
    // Authentication check
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      include: { organization: true }
    })

    if (!user || !user.organization) {
      return NextResponse.json(
        { success: false, error: 'User or organization not found' },
        { status: 404 }
      )
    }

    // Only organization owners/admins can trigger sync
    if (user.role !== 'OWNER' && user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions. Admin access required.' },
        { status: 403 }
      )
    }

    // Rate limiting for sync operations
    const rateLimitResult = await rateLimit(
      `sam-sync-trigger:${user.organizationId}`,
      3, // 3 requests
      60 * 60 * 1000 // per hour
    )

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { success: false, error: 'Rate limit exceeded. Maximum 3 sync triggers per hour.' },
        { status: 429 }
      )
    }

    // Parse and validate request body
    const body = await request.json().catch(() => ({}))
    const validation = TriggerSyncSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid request data',
          details: validation.error.errors 
        },
        { status: 400 }
      )
    }

    const { fullSync, organizationId, priority, filters } = validation.data

    // Check for existing running sync
    const existingSync = await prisma.syncLog.findFirst({
      where: {
        provider: 'SAM_GOV',
        status: 'IN_PROGRESS'
      },
      orderBy: { startedAt: 'desc' }
    })

    if (existingSync) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'SAM.gov sync already in progress',
          syncId: existingSync.id,
          startedAt: existingSync.startedAt
        },
        { status: 409 }
      )
    }

    // Trigger the sync job
    const syncJobResult = await inngest.send({
      name: 'sync/sam-gov-opportunities',
      data: {
        fullSync,
        organizationId: organizationId || user.organizationId,
        priority,
        filters
      }
    })

    // Create a sync log entry for tracking
    const syncLog = await prisma.syncLog.create({
      data: {
        provider: 'SAM_GOV',
        providerName: 'SAM.gov',
        status: 'IN_PROGRESS',
        fullSync,
        syncType: 'opportunities',
        startedAt: new Date(),
        metadata: {
          triggeredBy: userId,
          organizationId: organizationId || user.organizationId,
          priority,
          filters,
          jobId: syncJobResult.ids?.[0]
        }
      }
    })

    console.log('SAM.gov sync triggered', {
      syncLogId: syncLog.id,
      jobId: syncJobResult.ids?.[0],
      fullSync,
      organizationId: organizationId || user.organizationId,
      triggeredBy: userId
    })

    return NextResponse.json({
      success: true,
      message: 'SAM.gov sync job triggered successfully',
      syncId: syncLog.id,
      jobId: syncJobResult.ids?.[0],
      estimatedDuration: fullSync ? '15-30 minutes' : '5-15 minutes',
      syncType: fullSync ? 'full' : 'incremental'
    })

  } catch (error) {
    console.error('Failed to trigger SAM.gov sync:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to trigger sync job' },
      { status: 500 }
    )
  }
}

/**
 * @swagger
 * /api/v1/admin/sync/sam-gov:
 *   get:
 *     tags: [Admin, Data Sync]
 *     summary: Get SAM.gov sync status and history
 *     description: |
 *       Retrieve the current status and recent history of SAM.gov synchronization jobs.
 *       Shows running jobs, recent completions, and sync statistics.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *           minimum: 1
 *           maximum: 50
 *         description: Number of sync records to return
 *     responses:
 *       200:
 *         description: Sync status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 currentSync:
 *                   type: object
 *                   nullable: true
 *                   description: Currently running sync job
 *                 recentSyncs:
 *                   type: array
 *                   description: Recent sync history
 *                 stats:
 *                   type: object
 *                   properties:
 *                     totalOpportunities:
 *                       type: integer
 *                       description: Total opportunities in database
 *                     lastSuccessfulSync:
 *                       type: string
 *                       format: date-time
 *                       description: Last successful sync timestamp
 *                     nextScheduledSync:
 *                       type: string
 *                       format: date-time
 *                       description: Next scheduled sync timestamp
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Insufficient permissions
 *       500:
 *         description: Internal server error
 */
export async function GET(request: NextRequest) {
  try {
    // Authentication check
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      include: { organization: true }
    })

    if (!user || !user.organization) {
      return NextResponse.json(
        { success: false, error: 'User or organization not found' },
        { status: 404 }
      )
    }

    // Only organization owners/admins can view sync status
    if (user.role !== 'OWNER' && user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions. Admin access required.' },
        { status: 403 }
      )
    }

    // Parse query parameters
    const url = new URL(request.url)
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '10'), 50)

    // Get current running sync
    const currentSync = await prisma.syncLog.findFirst({
      where: {
        provider: 'SAM_GOV',
        status: 'IN_PROGRESS'
      },
      orderBy: { startedAt: 'desc' }
    })

    // Get recent sync history
    const recentSyncs = await prisma.syncLog.findMany({
      where: {
        provider: 'SAM_GOV'
      },
      orderBy: { startedAt: 'desc' },
      take: limit
    })

    // Get database statistics
    const totalOpportunities = await prisma.opportunity.count({
      where: {
        sourceSystem: 'SAM_GOV'
      }
    })

    const lastSuccessfulSync = await prisma.syncLog.findFirst({
      where: {
        provider: 'SAM_GOV',
        status: 'SUCCESS'
      },
      orderBy: { completedAt: 'desc' },
      select: { completedAt: true }
    })

    // Calculate next scheduled sync (every 4 hours from last sync)
    const nextScheduledSync = lastSuccessfulSync?.completedAt
      ? new Date(lastSuccessfulSync.completedAt.getTime() + 4 * 60 * 60 * 1000)
      : new Date(Date.now() + 4 * 60 * 60 * 1000)

    return NextResponse.json({
      success: true,
      currentSync,
      recentSyncs,
      stats: {
        totalOpportunities,
        lastSuccessfulSync: lastSuccessfulSync?.completedAt,
        nextScheduledSync,
        provider: 'SAM.gov',
        syncFrequency: '4 hours'
      }
    })

  } catch (error) {
    console.error('Failed to get SAM.gov sync status:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve sync status' },
      { status: 500 }
    )
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}