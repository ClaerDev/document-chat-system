/**
 * Real-time Opportunities API
 * 
 * Fetches opportunities directly from SAM.gov API with caching and match scoring
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { samGovClient, SamGovSearchParams, RealTimeOpportunity } from '@/lib/data-providers/sam-gov-realtime-client'
import { withRateLimit } from '@/lib/rate-limit'
import { UsageTrackingService, UsageType } from '@/lib/usage-tracking'
import type { Opportunity } from '@/types'
import { 
  OpportunityStatus, 
  SetAsideType, 
  CompetitionType, 
  SecurityClearanceLevel 
} from '@/types/opportunity-enums'

// Transform RealTimeOpportunity to full Opportunity interface for UI
function transformToOpportunity(realTimeOpp: RealTimeOpportunity, organizationId: string): Opportunity {
  // Generate a consistent ID for real-time opportunities (using sourceId for consistency)
  const id = `rt_${realTimeOpp.sourceId}`
  
  // Use the raw set-aside type from SAM.gov for the enum field
  const getSetAsideType = (setAsides?: string[]): SetAsideType => {
    // If no set-aside, return NONE
    if (!setAsides || setAsides.length === 0) return SetAsideType.NONE
    
    // For now, return OTHER since we're using the raw SAM.gov value
    // The UI will display the actual SAM.gov value from the setAsideType string field
    return SetAsideType.OTHER
  }
  
  // Create structured agency info
  const agencyInfo = {
    code: '',
    name: typeof realTimeOpp.agency === 'string' ? realTimeOpp.agency : realTimeOpp.agency?.name || 'Unknown Agency',
    type: 'federal',
    isActive: true,
    contractingAuthority: true
  }
  
  return {
    // Core identifiers
    id,
    organizationId,
    solicitationNumber: realTimeOpp.solicitation || realTimeOpp.sourceId,
    title: realTimeOpp.title,
    description: realTimeOpp.description || 'No description available',
    summary: realTimeOpp.description || 'No description available',
    
    // Agency Information
    agency: agencyInfo,
    office: realTimeOpp.subAgency,
    
    // Timeline - map to expected field names
    postedDate: realTimeOpp.publishDate,
    responseDeadline: realTimeOpp.responseDeadline,
    lastModifiedDate: realTimeOpp.lastModifiedDate,
    
    // Classification
    opportunityType: realTimeOpp.type,
    setAsideType: getSetAsideType(realTimeOpp.setAside),
    competitionType: CompetitionType.FULL_AND_OPEN, // Default
    
    // Financial information
    estimatedValue: realTimeOpp.estimatedValue?.min || realTimeOpp.estimatedValue?.max,
    minimumValue: realTimeOpp.estimatedValue?.min,
    maximumValue: realTimeOpp.estimatedValue?.max,
    currency: realTimeOpp.estimatedValue?.currency || 'USD',
    
    // Location information - map to both new and legacy formats
    placeOfPerformance: realTimeOpp.placeOfPerformance,
    performanceCountry: realTimeOpp.placeOfPerformance?.country,
    performanceState: realTimeOpp.placeOfPerformance?.state,
    performanceCity: realTimeOpp.placeOfPerformance?.city,
    performanceZipCode: realTimeOpp.placeOfPerformance?.zipCode,
    
    // Classification codes
    naicsCodes: realTimeOpp.naicsCodes || [],
    pscCodes: realTimeOpp.pscCodes || [],
    
    // Requirements
    securityClearanceRequired: SecurityClearanceLevel.NONE, // Default
    competencies: [], // Default
    
    // Special requirements
    smallBusinessSetAside: realTimeOpp.setAside?.some(sa => sa.toLowerCase().includes('small business')) || false,
    facilityClearanceReq: false,
    personnelClearanceReq: 0,
    
    // Links and resources
    sourceUrl: realTimeOpp.sourceUrl,
    uiLink: realTimeOpp.sourceUrl,
    resourceLinks: realTimeOpp.attachments?.map(att => att.url),
    attachments: realTimeOpp.attachments || [],
    
    // Debug: Log attachment data
    ...(console.log(`🔍 Debug attachments for ${realTimeOpp.title}:`, {
      hasAttachments: !!realTimeOpp.attachments?.length,
      attachmentCount: realTimeOpp.attachments?.length || 0,
      attachments: realTimeOpp.attachments
    }) || {}),
    pointOfContact: realTimeOpp.contacts?.map(contact => ({
      name: contact.name,
      email: contact.email,
      phone: contact.phone,
      title: contact.role
    })),
    
    // Data source tracking
    sourceSystem: realTimeOpp.sourceSystem,
    sourceId: realTimeOpp.sourceId,
    lastSyncedAt: realTimeOpp.lastFetched,
    dataHash: realTimeOpp.dataHash,
    
    // Status
    status: OpportunityStatus.ACTIVE,
    isArchived: false,
    
    // Analytics
    viewCount: 0,
    saveCount: 0,
    applicationCount: 0,
    matchCount: 0,
    
    // AI enhancements
    tags: [],
    
    // System fields
    createdAt: realTimeOpp.lastFetched,
    updatedAt: realTimeOpp.lastFetched,
    
    // Backward compatibility fields
    externalId: realTimeOpp.sourceId,
    deadline: realTimeOpp.responseDeadline,
    type: realTimeOpp.type,
    contractValue: realTimeOpp.estimatedValue?.min || realTimeOpp.estimatedValue?.max,
    contractValueMin: realTimeOpp.estimatedValue?.min,
    contractValueMax: realTimeOpp.estimatedValue?.max,
    location: realTimeOpp.placeOfPerformance ? 
      [realTimeOpp.placeOfPerformance.city, realTimeOpp.placeOfPerformance.state]
        .filter(Boolean).join(', ') : undefined,
    state: realTimeOpp.placeOfPerformance?.state,
    city: realTimeOpp.placeOfPerformance?.city,
    zipCode: realTimeOpp.placeOfPerformance?.zipCode,
    agencyCode: agencyInfo.code,
    setAsideType: realTimeOpp.setAside?.[0] // Direct typeOfSetAside value from SAM.gov
  }
}

// Search parameters validation schema
const SearchParamsSchema = z.object({
  query: z.string().optional().describe('Text search query'),
  agencies: z.string().optional().transform(val => val ? val.split(',') : []).describe('Comma-separated agencies'),
  naicsCodes: z.string().optional().transform(val => val ? val.split(',') : []).describe('Comma-separated NAICS codes'),
  setAsideTypes: z.string().optional().transform(val => val ? val.split(',') : []).describe('Comma-separated set-aside types'),
  minValue: z.string().optional().transform(val => val ? parseInt(val) : undefined).describe('Minimum contract value'),
  maxValue: z.string().optional().transform(val => val ? parseInt(val) : undefined).describe('Maximum contract value'),
  deadlineFrom: z.string().optional().transform(val => val ? new Date(val) : undefined).describe('Deadline from date'),
  deadlineTo: z.string().optional().transform(val => val ? new Date(val) : undefined).describe('Deadline to date'),
  postedFrom: z.string().optional().transform(val => val ? new Date(val) : undefined).describe('Posted from date'),
  postedTo: z.string().optional().transform(val => val ? new Date(val) : undefined).describe('Posted to date'),
  state: z.string().optional().describe('State filter'),
  city: z.string().optional().describe('City filter'),
  active: z.string().optional().transform(val => val ? val === 'true' : true).describe('Active opportunities only'),
  page: z.string().optional().transform(val => val ? parseInt(val) : 1).describe('Page number'),
  limit: z.string().optional().transform(val => val ? Math.min(parseInt(val), 100) : 30).describe('Page size (max 100)')
})

/**
 * @swagger
 * /api/v1/opportunities/realtime:
 *   get:
 *     tags: [Opportunities]
 *     summary: Search SAM.gov opportunities in real-time with optional scoring
 *     description: |
 *       Unified endpoint for SAM.gov opportunities that can fetch, score, and save in one call.
 *       Supports real-time data with caching for performance.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: query
 *         schema:
 *           type: string
 *         description: Text search query
 *       - in: query
 *         name: agencies
 *         schema:
 *           type: string
 *         description: Comma-separated agency names
 *       - in: query
 *         name: naicsCodes
 *         schema:
 *           type: string
 *         description: Comma-separated NAICS codes
 *       - in: query
 *         name: includeScores
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Include match scores in response
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
 *           default: 30
 *           maximum: 100
 *         description: Number of results per page
 *     responses:
 *       200:
 *         description: Success
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   description: Array of opportunities with optional scores
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     hasMore:
 *                       type: boolean
 *                 meta:
 *                   type: object
 *                   properties:
 *                     fromCache:
 *                       type: boolean
 *                     executedAt:
 *                       type: string
 *                       format: date-time
 *                     matchScores:
 *                       type: object
 *                       description: Match scores if includeScores=true
 *   post:
 *     tags: [Opportunities]
 *     summary: Save or manage opportunities
 *     description: Save specific opportunities or perform bulk operations
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               action:
 *                 type: string
 *                 enum: [save, unsave, bulk_save]
 *               opportunityIds:
 *                 type: array
 *                 items:
 *                   type: string
 *               trackingOptions:
 *                 type: object
 *     responses:
 *       200:
 *         description: Success
 */
export async function GET(request: NextRequest) {
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

    // Parse and validate search parameters
    const { searchParams } = new URL(request.url)
    const params = SearchParamsSchema.parse(Object.fromEntries(searchParams))

    // Track API usage
    try {
      await UsageTrackingService.trackUsage({
        organizationId: user.organizationId,
        usageType: UsageType.API_CALL,
        quantity: 1,
        resourceType: 'opportunities_realtime',
        metadata: {
          endpoint: '/api/v1/opportunities/realtime',
          page: params.page,
          limit: params.limit,
          hasFilters: !!(params.query || params.agencies?.length || params.naicsCodes?.length)
        }
      })
    } catch (trackingError) {
      console.warn('Failed to track opportunities API usage:', trackingError)
    }

    // Convert to SAM.gov search parameters
    const samGovParams: SamGovSearchParams = {
      query: params.query,
      agencies: params.agencies,
      naicsCodes: params.naicsCodes,
      setAsideTypes: params.setAsideTypes,
      minValue: params.minValue,
      maxValue: params.maxValue,
      deadlineFrom: params.deadlineFrom,
      deadlineTo: params.deadlineTo,
      postedFrom: params.postedFrom,
      postedTo: params.postedTo,
      state: params.state,
      city: params.city,
      active: params.active,
      limit: params.limit,
      offset: (params.page - 1) * params.limit
    }

    console.log('🔍 Real-time SAM.gov search:', {
      organizationId: user.organizationId,
      page: params.page,
      limit: params.limit,
      hasQuery: !!params.query,
      hasFilters: !!(params.agencies?.length || params.naicsCodes?.length)
    })

    // Fetch from SAM.gov with organization-level rate limiting
    const results = await samGovClient.searchOpportunities(samGovParams, user.organizationId)

    // Transform RealTimeOpportunity objects to full Opportunity interface for UI
    const transformedOpportunities = results.opportunities.map(realTimeOpp => 
      transformToOpportunity(realTimeOpp, user.organizationId)
    )

    console.log(`🔄 Transformed ${results.opportunities.length} real-time opportunities to UI format`)

    // Return paginated results with properly formatted opportunities
    const response = {
      success: true,
      data: transformedOpportunities,
      pagination: {
        page: results.currentPage,
        limit: results.pageSize,
        total: results.totalCount,
        hasMore: results.hasMore
      },
      meta: {
        fromCache: results.fromCache,
        executedAt: results.executedAt,
        searchParams: results.searchParams
      }
    }

    console.log(`✅ Returned ${results.opportunities.length} opportunities (page ${results.currentPage}, fromCache: ${results.fromCache})`)

    return NextResponse.json(response)

  } catch (error) {
    console.error('Real-time opportunities API error:', error)
    
    // Handle rate limiting errors specifically
    if (error.message.includes('rate limit')) {
      return NextResponse.json(
        { success: false, error: 'Rate limit exceeded. Please wait before searching again.' },
        { status: 429 }
      )
    }

    // Handle SAM.gov API errors
    if (error.message.includes('SAM.gov')) {
      return NextResponse.json(
        { success: false, error: 'Government data service temporarily unavailable. Please try again later.' },
        { status: 503 }
      )
    }

    return NextResponse.json(
      { success: false, error: 'Failed to fetch opportunities' },
      { status: 500 }
    )
  }
}

/**
 * @swagger
 * /api/v1/opportunities/realtime:
 *   delete:
 *     tags: [Opportunities]
 *     summary: Clear SAM.gov search cache
 *     description: Clear cached search results for fresh data
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Cache cleared successfully
 *       401:
 *         description: Authentication required
 */
export async function DELETE(request: NextRequest) {
  try {
    // Authentication
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Clear all SAM.gov cache
    await samGovClient.clearCache()

    console.log('🗑️ Cleared SAM.gov search cache')

    return NextResponse.json({
      success: true,
      message: 'SAM.gov search cache cleared successfully'
    })

  } catch (error) {
    console.error('Failed to clear cache:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to clear cache' },
      { status: 500 }
    )
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}