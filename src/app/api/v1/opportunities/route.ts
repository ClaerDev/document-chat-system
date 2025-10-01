/**
 * @swagger
 * /api/opportunities:
 *   get:
 *     tags: [Opportunities]
 *     summary: Search government contracting opportunities
 *     description: |
 *       Search and filter government contracting opportunities with advanced filtering capabilities.
 *       Results are cached for 5 minutes to improve performance.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: query
 *         schema:
 *           type: string
 *         description: Text search query for opportunity title and description
 *         example: "cloud computing"
 *       - in: query
 *         name: agencies
 *         schema:
 *           type: string
 *         description: Comma-separated list of government agencies
 *         example: "Department of Defense,General Services Administration"
 *       - in: query
 *         name: naicsCodes
 *         schema:
 *           type: string
 *         description: Comma-separated list of NAICS codes
 *         example: "541511,541512"
 *       - in: query
 *         name: minValue
 *         schema:
 *           type: number
 *         description: Minimum contract value in USD cents
 *         example: 100000
 *       - in: query
 *         name: maxValue
 *         schema:
 *           type: number
 *         description: Maximum contract value in USD cents
 *         example: 10000000
 *       - in: query
 *         name: deadline
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter by deadline (ISO 8601 format)
 *       - in: query
 *         name: postedFrom
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Start date for posted date range filter (ISO 8601 format)
 *         example: "2024-01-01T00:00:00Z"
 *       - in: query
 *         name: postedTo
 *         schema:
 *           type: string
 *           format: date-time
 *         description: End date for posted date range filter (ISO 8601 format)
 *         example: "2024-12-31T23:59:59Z"
 *       - in: query
 *         name: states
 *         schema:
 *           type: string
 *         description: Comma-separated list of state codes
 *         example: "CA,NY,TX"
 *       - in: query
 *         name: setAsideTypes
 *         schema:
 *           type: string
 *         description: Comma-separated list of set-aside types
 *         example: "8a,HUBZone,SDVOSB"
 *       - in: query
 *         name: securityClearances
 *         schema:
 *           type: string
 *         description: Comma-separated list of security clearance requirements
 *         example: "Secret,Top Secret"
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [postedDate, deadline, contractValue, title, matchScore]
 *           default: postedDate
 *         description: Field to sort by
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *           minimum: 1
 *           maximum: 50
 *           default: 10
 *         description: Number of results per page
 *       - in: query
 *         name: offset
 *         schema:
 *           type: number
 *           minimum: 0
 *           default: 0
 *         description: Number of results to skip
 *     responses:
 *       200:
 *         description: Opportunities retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required: [success, data]
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   required: [opportunities, pagination]
 *                   properties:
 *                     opportunities:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Opportunity'
 *                     pagination:
 *                       type: object
 *                       required: [total, limit, offset, hasMore]
 *                       properties:
 *                         total:
 *                           type: number
 *                           description: Total number of opportunities matching criteria
 *                         limit:
 *                           type: number
 *                           description: Number of results per page
 *                         offset:
 *                           type: number
 *                           description: Number of results skipped
 *                         hasMore:
 *                           type: boolean
 *                           description: Whether there are more results available
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       429:
 *         $ref: '#/components/responses/RateLimit'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { ApiResponse, PaginatedResponse, Opportunity, SearchParams, OpportunityType } from '@/types'
import { redis } from '@/lib/redis'
import { validateSearchParams } from '@/lib/validations'
import { handleApiError, asyncHandler, commonErrors } from '@/lib/api-errors'
import { withRateLimit, rateLimitConfigs } from '@/lib/rate-limit'
import { withApiTracking } from '@/lib/api-tracking'
import { UsageTrackingService, UsageType } from '@/lib/usage-tracking'
import { withAuth, AuthContext } from '@/lib/api-auth-middleware'

async function handleGET(request: NextRequest, authContext: AuthContext) {
  return withRateLimit(rateLimitConfigs.search, 'opportunities')(request, async () => {
    // Get user from auth context - for session auth, this will auto-create if needed
    let user
    if (authContext.type === 'session') {
      // Use getCurrentUser which handles auto-creation from Clerk
      const { getCurrentUser } = await import('@/lib/auth')
      user = await getCurrentUser()
    } else {
      // For API key auth, get user by ID
      user = await db.user.findUnique({
        where: { id: authContext.userId },
        include: { organization: true }
      })
    }

    if (!user || !user.organization) {
      throw commonErrors.notFound('Organization')
    }

    // Track this API call
    try {
      await UsageTrackingService.trackUsage({
        organizationId: user.organizationId,
        usageType: UsageType.API_CALL,
        quantity: 1,
        resourceType: 'opportunities',
        metadata: {
          endpoint: '/api/opportunities'
        }
      });
    } catch (trackingError) {
      console.warn('Failed to track opportunities API usage:', trackingError);
      // Don't fail the request if tracking fails
    }

    const { searchParams } = new URL(request.url)
    
    // Parse and validate search parameters
    const params = validateSearchParams(searchParams)

    // Generate cache key based on search parameters and organization
    const cacheKey = `opportunities:${user.organization.id}:${Buffer.from(JSON.stringify(params)).toString('base64')}`
    
    // Try to get cached result first
    try {
      const cachedResult = await redis.get(cacheKey)
      if (cachedResult) {
        console.log('Cache hit for opportunities query')
        return NextResponse.json(JSON.parse(cachedResult))
      }
    } catch (cacheError) {
      console.warn('Cache read error for opportunities:', cacheError)
      // Continue without cache
    }

    // Build Prisma where clause with organization scoping
    const where: any = {
      organizationId: user.organization.id // Ensure tenant isolation
    }

    // Text search in title and description
    if (params.query) {
      where.OR = [
        { title: { contains: params.query, mode: 'insensitive' } },
        { description: { contains: params.query, mode: 'insensitive' } },
        { solicitationNumber: { contains: params.query, mode: 'insensitive' } }
      ]
    }

    // Filter by agencies
    if (params.agencies && params.agencies.length > 0) {
      where.agency = { in: params.agencies }
    }

    // Filter by NAICS codes
    if (params.naicsCodes && params.naicsCodes.length > 0) {
      where.naicsCodes = {
        hasSome: params.naicsCodes
      }
    }

    // Filter by contractor states (location constraint)
    if (params.states && params.states.length > 0) {
      where.contractorLocation = { in: params.states }
    }

    // Filter by performance states (place of performance)
    if (params.performanceStates && params.performanceStates.length > 0) {
      where.placeOfPerformance = { in: params.performanceStates }
    }

    // Filter by set-aside types
    if (params.setAsideTypes && params.setAsideTypes.length > 0) {
      where.setAsideType = { in: params.setAsideTypes }
    }

    // Filter by security clearance requirements
    if (params.securityClearances && params.securityClearances.length > 0) {
      where.securityClearanceRequired = { in: params.securityClearances }
    }

    // Filter by procurement methods/vehicles
    if (params.procurementMethods && params.procurementMethods.length > 0) {
      where.procurementMethod = { in: params.procurementMethods }
    }

    // Filter by competencies
    if (params.competencies && params.competencies.length > 0) {
      where.competencies = {
        hasSome: params.competencies
      }
    }

    // Collect all OR conditions that need to be handled properly
    const orConditions: any[] = []

    // Filter by opportunity status
    if (params.opportunityStatus && params.opportunityStatus.length > 0) {
      const now = new Date()
      const statusConditions: any[] = []
      
      params.opportunityStatus.forEach(status => {
        switch (status) {
          case 'Active':
            statusConditions.push({
              AND: [
                { responseDeadline: { gte: now } },
                { NOT: { status: 'CANCELLED' } },
                { NOT: { status: 'AWARDED' } }
              ]
            })
            break
          case 'Closing Soon':
            const closingSoonDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
            statusConditions.push({
              AND: [
                { responseDeadline: { lte: closingSoonDate } },
                { responseDeadline: { gte: now } },
                { NOT: { status: 'CANCELLED' } },
                { NOT: { status: 'AWARDED' } }
              ]
            })
            break
          case 'Recently Posted':
            const recentDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) // 7 days ago
            statusConditions.push({
              postedDate: { gte: recentDate }
            })
            break
          case 'Cancelled':
            statusConditions.push({ status: 'CANCELLED' })
            break
          case 'Awarded':
            statusConditions.push({ status: 'AWARDED' })
            break
        }
      })
      
      if (statusConditions.length > 0) {
        orConditions.push(...statusConditions)
      }
    }

    // Filter by contract duration
    if (params.contractDuration && params.contractDuration.length > 0) {
      where.contractDuration = { in: params.contractDuration }
    }

    // Filter by contract value range
    if (params.minValue !== undefined || params.maxValue !== undefined) {
      const valueConditions: any[] = []
      
      // Handle single estimatedValue field
      if (params.minValue !== undefined && params.maxValue !== undefined) {
        valueConditions.push({
          estimatedValue: {
            gte: params.minValue,
            lte: params.maxValue
          }
        })
      } else if (params.minValue !== undefined) {
        valueConditions.push({
          estimatedValue: { gte: params.minValue }
        })
      } else if (params.maxValue !== undefined) {
        valueConditions.push({
          estimatedValue: { lte: params.maxValue }
        })
      }

      // Handle range fields (minimumValue/maximumValue)
      if (params.minValue !== undefined || params.maxValue !== undefined) {
        const rangeCondition: any = {}
        if (params.minValue !== undefined) {
          rangeCondition.maximumValue = { gte: params.minValue }
        }
        if (params.maxValue !== undefined) {
          rangeCondition.minimumValue = { lte: params.maxValue }
        }
        valueConditions.push(rangeCondition)
      }

      orConditions.push(...valueConditions)
    }

    // Apply OR conditions if any exist
    if (orConditions.length > 0) {
      // If we already have text search OR conditions, combine them properly
      if (where.OR) {
        where.AND = [
          { OR: where.OR }, // Text search conditions
          { OR: orConditions } // Status and value conditions
        ]
        delete where.OR
      } else {
        where.OR = orConditions
      }
    }

    // Filter by deadline
    if (params.deadline) {
      const deadlineDate = new Date(params.deadline)
      where.responseDeadline = { gte: deadlineDate }
    }

    // Build order by clause
    const orderBy: any = {}
    if (params.sort === 'postedDate') {
      orderBy.postedDate = params.order
    } else if (params.sort === 'deadline') {
      orderBy.responseDeadline = params.order
    } else if (params.sort === 'contractValue') {
      orderBy.estimatedValue = params.order
    } else if (params.sort === 'title') {
      orderBy.title = params.order
    } else if (params.sort === 'matchScore') {
      // Sort by highest match score from MatchScore relation
      orderBy.matchScores = {
        overallScore: params.order
      }
    } else {
      orderBy.postedDate = 'desc' // Default sort
    }

    // Handle match score sorting differently - need to get user's profile first
    let opportunities: any[]
    let total: number

    if (params.sort === 'matchScore') {
      // TODO: Get user's profile when authentication is set up
      // For now, use first available profile for development
      const userProfile = await db.profile.findFirst()

      if (!userProfile) {
        // If no profile, fall back to default sorting
        const [opps, count] = await Promise.all([
          db.opportunity.findMany({
            where,
            orderBy: { postedDate: 'desc' },
            skip: params.offset || 0,
            take: params.limit || 10,
          }),
          db.opportunity.count({ where })
        ])
        opportunities = opps
        total = count
      } else {
        // Get opportunities with their match scores for this profile
        // First get all matching opportunities (without pagination)
        const allOpportunities = await db.opportunity.findMany({
          where,
          include: {
            matchScores: {
              where: { profileId: userProfile.id },
              select: { overallScore: true }
            }
          }
        })

        // Sort by match score
        const sortedOpportunities = allOpportunities.sort((a: any, b: any) => {
          const aScore = a.matchScores?.[0]?.overallScore || 0
          const bScore = b.matchScores?.[0]?.overallScore || 0
          
          if (params.order === 'asc') {
            return Number(aScore) - Number(bScore)
          } else {
            return Number(bScore) - Number(aScore)
          }
        })

        // Apply pagination after sorting
        const startIndex = params.offset || 0
        const endIndex = startIndex + (params.limit || 10)
        opportunities = sortedOpportunities.slice(startIndex, endIndex)
        total = allOpportunities.length
      }
    } else {
      // Regular sorting for non-match-score fields
      const [opps, count] = await Promise.all([
        db.opportunity.findMany({
          where,
          orderBy,
          skip: params.offset || 0,
          take: params.limit || 10,
        }),
        db.opportunity.count({ where })
      ])
      opportunities = opps
      total = count
    }

    // Map Prisma results to Opportunity interface
    const mappedOpportunities: Opportunity[] = opportunities.map((opp: any) => ({
      id: opp.id,
      externalId: opp.sourceId || opp.solicitationNumber,
      title: opp.title,
      description: opp.description || '',
      agency: opp.agency,
      agencyCode: '', // Not in schema yet
      solicitationNumber: opp.solicitationNumber,
      type: (opp.opportunityType || 'SOLICITATION') as OpportunityType,
      setAsideType: opp.setAsideType || undefined,
      postedDate: opp.postedDate || opp.createdAt,
      deadline: opp.responseDeadline || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Default 30 days from now
      contractValue: opp.estimatedValue ? Number(opp.estimatedValue) : undefined,
      contractValueMin: opp.minimumValue ? Number(opp.minimumValue) : undefined,
      contractValueMax: opp.maximumValue ? Number(opp.maximumValue) : undefined,
      naicsCodes: opp.naicsCodes,
      pscCodes: opp.pscCodes,
      location: opp.location || undefined,
      state: opp.placeOfPerformance || undefined,
      titleEmbedding: undefined, // Not implemented yet
      descriptionEmbedding: undefined, // Not implemented yet
      processedAt: opp.lastSyncedAt,
      sourceData: {
        sourceSystem: opp.sourceSystem,
        sourceId: opp.sourceId,
        sourceUrl: opp.sourceUrl
      },
      createdAt: opp.createdAt,
      updatedAt: opp.updatedAt
    }))

    const response: ApiResponse<PaginatedResponse<Opportunity>> = {
      success: true,
      data: {
        items: mappedOpportunities,
        total,
        page: Math.floor((params.offset || 0) / (params.limit || 10)) + 1,
        limit: params.limit || 10,
        hasMore: (params.offset || 0) + (params.limit || 10) < total
      }
    }

    // Cache the result for 5 minutes (300 seconds)
    try {
      await redis.setex(cacheKey, 300, JSON.stringify(response))
      console.log('Cached opportunities query result')
    } catch (cacheError) {
      console.warn('Cache write error for opportunities:', cacheError)
      // Continue without caching
    }

    return NextResponse.json(response)
  })
}

// Wrapper to handle authentication and error handling
const authenticatedGET = async (request: NextRequest) => {
  try {
    return await withAuth(handleGET, 'read:opportunities')(request)
  } catch (error) {
    return handleApiError(error)
  }
}

export const GET = withApiTracking(authenticatedGET)

// DELETE /api/opportunities - Clear opportunities cache
async function handleDELETE(request: NextRequest) {
  return withRateLimit(rateLimitConfigs.api, 'cache-clear')(request, async () => {
    // Check authentication when implemented
    // const { userId } = await auth()
    
    // Clear all cached opportunities
    const pattern = 'opportunities:*'
    const keys = await redis.keys(pattern)
    
    if (keys.length > 0) {
      await redis.del(...keys)
      console.log(`Cleared ${keys.length} cached opportunity queries`)
    }

    return NextResponse.json({
      success: true,
      message: `Cleared ${keys.length} cached opportunity queries`
    })
  })
}

export const DELETE = withApiTracking(asyncHandler(handleDELETE))