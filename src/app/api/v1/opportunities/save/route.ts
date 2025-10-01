/**
 * Save/Track Opportunities API
 * 
 * Allows users to save/track specific opportunities to their database.
 * This is the ONLY way opportunities get stored in the database.
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { SourceSystem, OpportunityType } from '@prisma/client'
import { samGovClient } from '@/lib/data-providers/sam-gov-realtime-client'
import { withRateLimit, rateLimitConfigs } from '@/lib/rate-limit'
import { UsageTrackingService, UsageType } from '@/lib/usage-tracking'

// Save opportunity request schema
const SaveOpportunitySchema = z.object({
  sourceId: z.string().describe('SAM.gov opportunity ID'),
  sourceSystem: z.nativeEnum(SourceSystem).default(SourceSystem.SAM_GOV).describe('Source system'),
  
  // Optional: if provided, use this data; otherwise fetch from SAM.gov
  opportunityData: z.object({
    title: z.string(),
    description: z.string(),
    solicitation: z.string().optional(),
    agency: z.string(),
    subAgency: z.string().optional(),
    type: z.nativeEnum(OpportunityType),
    setAside: z.array(z.string()).optional(),
    naicsCodes: z.array(z.string()),
    pscCodes: z.array(z.string()).optional(),
    estimatedValue: z.object({
      min: z.number().optional(),
      max: z.number().optional(),
      currency: z.string()
    }).optional(),
    publishDate: z.string().transform(val => new Date(val)),
    responseDeadline: z.string().optional().transform(val => val ? new Date(val) : undefined),
    lastModifiedDate: z.string().transform(val => new Date(val)),
    placeOfPerformance: z.object({
      city: z.string().optional(),
      state: z.string().optional(),
      country: z.string(),
      zipCode: z.string().optional()
    }).optional(),
    contacts: z.array(z.object({
      name: z.string(),
      email: z.string().optional(),
      phone: z.string().optional(),
      role: z.string().optional()
    })).optional(),
    attachments: z.array(z.object({
      name: z.string(),
      url: z.string(),
      type: z.string()
    })).optional(),
    sourceUrl: z.string().optional()
  }).optional().describe('Opportunity data (if not provided, will fetch from SAM.gov)'),
  
  // User tracking preferences
  trackingOptions: z.object({
    watchForUpdates: z.boolean().default(true).describe('Get notified of updates'),
    reminderBeforeDeadline: z.number().optional().describe('Days before deadline to remind'),
    notes: z.string().optional().describe('User notes about this opportunity')
  }).optional().describe('User tracking preferences')
})

/**
 * @swagger
 * /api/v1/opportunities/save:
 *   post:
 *     tags: [Opportunities]
 *     summary: Save/track an opportunity
 *     description: |
 *       Save a specific opportunity to the user's tracked opportunities.
 *       This stores the opportunity in the database for future reference.
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               sourceId:
 *                 type: string
 *                 description: SAM.gov opportunity ID
 *               sourceSystem:
 *                 type: string
 *                 enum: [SAM_GOV, FPDS_NG, USASPENDING, GRANTS_GOV]
 *                 default: SAM_GOV
 *               opportunityData:
 *                 type: object
 *                 description: Optional opportunity data (if not provided, fetched from SAM.gov)
 *               trackingOptions:
 *                 type: object
 *                 properties:
 *                   watchForUpdates:
 *                     type: boolean
 *                     default: true
 *                   reminderBeforeDeadline:
 *                     type: integer
 *                     description: Days before deadline
 *                   notes:
 *                     type: string
 *                     description: User notes
 *     responses:
 *       200:
 *         description: Opportunity saved successfully
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Authentication required
 *       409:
 *         description: Opportunity already saved
 *       500:
 *         description: Internal server error
 */
export async function POST(request: NextRequest) {
  return withRateLimit(rateLimitConfigs.api, 'save-opportunity')(request, async () => {
    try {
      // Authentication
      const { userId } = await auth()
      if (!userId) {
        return NextResponse.json(
          { success: false, error: 'Authentication required' },
          { status: 401 }
        )
      }

      // Get user and organization
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

      // Parse and validate request
      const body = await request.json()
      const validation = SaveOpportunitySchema.safeParse(body)

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

      const { sourceId, sourceSystem, opportunityData, trackingOptions } = validation.data

      console.log(`💾 Saving opportunity ${sourceId} for user ${userId}`)

      // Check if already saved
      const existing = await prisma.opportunity.findUnique({
        where: {
          sourceId_sourceSystem: {
            sourceId,
            sourceSystem
          }
        }
      })

      if (existing) {
        // Check if user already has this opportunity saved
        const userTracking = await prisma.savedOpportunity.findUnique({
          where: {
            userId_externalOpportunityId_sourceSystem: {
              userId: user.id,
              externalOpportunityId: sourceId,
              sourceSystem
            }
          }
        })

        if (userTracking) {
          return NextResponse.json(
            { success: false, error: 'Opportunity already saved' },
            { status: 409 }
          )
        }

        // Add to user's saved opportunities
        await prisma.savedOpportunity.create({
          data: {
            userId: user.id,
            organizationId: user.organizationId,
            opportunityId: existing.id,
            externalOpportunityId: sourceId,
            sourceSystem,
            status: 'SAVED',
            watchForUpdates: trackingOptions?.watchForUpdates ?? true,
            reminderBeforeDeadline: trackingOptions?.reminderBeforeDeadline,
            notes: trackingOptions?.notes
          }
        })

        console.log(`✅ Added existing opportunity ${sourceId} to user's saved list`)

        return NextResponse.json({
          success: true,
          message: 'Opportunity added to your saved list',
          opportunityId: existing.id
        })
      }

      // Get opportunity data (provided or fetch from SAM.gov)
      let oppData = opportunityData
      if (!oppData) {
        console.log(`🔍 Fetching opportunity ${sourceId} from SAM.gov`)
        const realTimeOpp = await samGovClient.getOpportunityById(sourceId, user.organizationId)
        
        if (!realTimeOpp) {
          return NextResponse.json(
            { success: false, error: 'Opportunity not found in SAM.gov' },
            { status: 404 }
          )
        }

        // Convert to our format
        oppData = {
          title: realTimeOpp.title,
          description: realTimeOpp.description,
          solicitation: realTimeOpp.solicitation,
          agency: realTimeOpp.agency,
          subAgency: realTimeOpp.subAgency,
          type: realTimeOpp.type,
          setAside: realTimeOpp.setAside,
          naicsCodes: realTimeOpp.naicsCodes,
          pscCodes: realTimeOpp.pscCodes,
          estimatedValue: realTimeOpp.estimatedValue,
          publishDate: realTimeOpp.publishDate,
          responseDeadline: realTimeOpp.responseDeadline,
          lastModifiedDate: realTimeOpp.lastModifiedDate,
          placeOfPerformance: realTimeOpp.placeOfPerformance,
          contacts: realTimeOpp.contacts,
          attachments: realTimeOpp.attachments,
          sourceUrl: realTimeOpp.sourceUrl
        }
      }

      // Create opportunity in database
      const savedOpportunity = await prisma.opportunity.create({
        data: {
          organizationId: user.organizationId,
          sourceId,
          sourceSystem,
          sourceUrl: oppData.sourceUrl,
          solicitationNumber: oppData.solicitation || `${sourceSystem}-${sourceId}`,
          title: oppData.title,
          description: oppData.description,
          agency: oppData.agency ? { name: oppData.agency, code: 'UNKNOWN' } : { name: 'Unknown Agency', code: 'UNKNOWN' },
          office: oppData.subAgency,
          opportunityType: oppData.type,
          setAsideType: oppData.setAside?.length > 0 ? 'SBA' : 'NONE', // Simplified mapping
          naicsCodes: oppData.naicsCodes,
          pscCodes: oppData.pscCodes || [],
          estimatedValue: oppData.estimatedValue?.max ? new Decimal(oppData.estimatedValue.max) : undefined,
          minimumValue: oppData.estimatedValue?.min ? new Decimal(oppData.estimatedValue.min) : undefined,
          currency: oppData.estimatedValue?.currency || 'USD',
          postedDate: oppData.publishDate,
          responseDeadline: oppData.responseDeadline,
          lastModifiedDate: oppData.lastModifiedDate,
          placeOfPerformance: oppData.placeOfPerformance,
          contractorLocation: oppData.placeOfPerformance,
          pointOfContact: oppData.contacts || [],
          attachments: oppData.attachments || [],
          lastSyncedAt: new Date(),
          status: 'ACTIVE'
        }
      })

      // Add to user's saved opportunities
      const savedOppUser = await prisma.savedOpportunity.create({
        data: {
          userId: user.id,
          organizationId: user.organizationId,
          opportunityId: savedOpportunity.id,
          externalOpportunityId: sourceId,
          sourceSystem,
          status: 'SAVED',
          watchForUpdates: trackingOptions?.watchForUpdates ?? true,
          reminderBeforeDeadline: trackingOptions?.reminderBeforeDeadline,
          notes: trackingOptions?.notes
        }
      })

      // Track usage
      try {
        await UsageTrackingService.trackUsage({
          organizationId: user.organizationId,
          usageType: UsageType.STORAGE,
          quantity: 1,
          resourceType: 'saved_opportunity',
          metadata: {
            sourceId,
            sourceSystem,
            opportunityId: savedOpportunity.id
          }
        })
      } catch (trackingError) {
        console.warn('Failed to track save opportunity usage:', trackingError)
      }

      console.log(`✅ Successfully saved opportunity ${sourceId} to database`)

      return NextResponse.json({
        success: true,
        message: 'Opportunity saved successfully',
        data: {
          opportunityId: savedOpportunity.id,
          savedOpportunityId: savedOppUser.id,
          tracking: {
            watchForUpdates: savedOppUser.watchForUpdates,
            reminderBeforeDeadline: savedOppUser.reminderBeforeDeadline
          }
        }
      })

    } catch (error) {
      console.error('Save opportunity error:', error)
      
      return NextResponse.json(
        { success: false, error: 'Failed to save opportunity' },
        { status: 500 }
      )
    }
  })
}

/**
 * @swagger
 * /api/v1/opportunities/save:
 *   get:
 *     tags: [Opportunities]
 *     summary: Get user's saved opportunities
 *     description: Retrieve all opportunities saved/tracked by the current user
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [SAVED, APPLIED, AWARDED, REJECTED]
 *         description: Filter by tracking status
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *           maximum: 100
 *         description: Number of results per page
 *     responses:
 *       200:
 *         description: Saved opportunities retrieved successfully
 */
export async function GET(request: NextRequest) {
  return withRateLimit(rateLimitConfigs.api, 'get-saved-opportunities')(request, async () => {
    try {
      // Authentication
      const { userId } = await auth()
      if (!userId) {
        return NextResponse.json(
          { success: false, error: 'Authentication required' },
          { status: 401 }
        )
      }

      // Get user
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

      // Parse query parameters
      const { searchParams } = new URL(request.url)
      const status = searchParams.get('status')
      const page = parseInt(searchParams.get('page') || '1')
      const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)
      const offset = (page - 1) * limit

      // Build where clause
      const where: any = {
        userId: user.id,
        organizationId: user.organizationId
      }

      if (status) {
        where.status = status
      }

      // Get saved opportunities with full opportunity data
      const savedOpportunities = await prisma.savedOpportunity.findMany({
        where,
        include: {
          opportunity: true
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit
      })

      // Get total count
      const totalCount = await prisma.savedOpportunity.count({ where })

      console.log(`📋 Retrieved ${savedOpportunities.length} saved opportunities for user ${userId}`)

      return NextResponse.json({
        success: true,
        data: savedOpportunities,
        pagination: {
          page,
          limit,
          total: totalCount,
          hasMore: offset + savedOpportunities.length < totalCount
        }
      })

    } catch (error) {
      console.error('Get saved opportunities error:', error)
      
      return NextResponse.json(
        { success: false, error: 'Failed to retrieve saved opportunities' },
        { status: 500 }
      )
    }
  })
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