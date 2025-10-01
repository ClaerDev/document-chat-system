import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createRealisticOpportunities } from '@/lib/test-data/realistic-opportunities'

/**
 * @swagger
 * /api/opportunities/public:
 *   get:
 *     summary: Get public opportunities (no authentication required)
 *     description: Returns basic opportunity data without premium features like match scores, full descriptions, or contact info. Perfect for showcasing platform capabilities.
 *     tags: [Opportunities]
 *     parameters:
 *       - in: query
 *         name: query
 *         schema:
 *           type: string
 *         description: Search query for title, agency, or solicitation number
 *       - in: query
 *         name: agencies
 *         schema:
 *           type: string
 *         description: Filter by agency names (comma-separated)
 *       - in: query
 *         name: naicsCodes
 *         schema:
 *           type: string
 *         description: Filter by NAICS codes (comma-separated)
 *       - in: query
 *         name: setAsideTypes
 *         schema:
 *           type: string
 *         description: Filter by set-aside types (comma-separated)
 *       - in: query
 *         name: minValue
 *         schema:
 *           type: string
 *         description: Minimum contract value
 *       - in: query
 *         name: maxValue
 *         schema:
 *           type: string
 *         description: Maximum contract value
 *       - in: query
 *         name: limit
 *         schema:
 *           type: string
 *           default: "10"
 *         description: Number of results (max 20)
 *       - in: query
 *         name: offset
 *         schema:
 *           type: string
 *           default: "0"
 *         description: Pagination offset
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           default: "postedDate"
 *         description: Sort field (postedDate, deadline, contractValue)
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: "desc"
 *         description: Sort order
 *     responses:
 *       200:
 *         description: Public opportunities retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     items:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           title:
 *                             type: string
 *                           agency:
 *                             type: string
 *                           deadline:
 *                             type: string
 *                             format: date-time
 *                           contractValue:
 *                             type: number
 *                           solicitationNumber:
 *                             type: string
 *                           location:
 *                             type: string
 *                           setAsideType:
 *                             type: string
 *                           type:
 *                             type: string
 *                           naicsCodes:
 *                             type: array
 *                             items:
 *                               type: string
 *                           postedDate:
 *                             type: string
 *                             format: date-time
 *                           status:
 *                             type: string
 *                     total:
 *                       type: number
 *                       example: 50
 *                     page:
 *                       type: number
 *                       example: 1
 *                     limit:
 *                       type: number
 *                       example: 10
 *                     hasMore:
 *                       type: boolean
 *                       example: true
 *                     preview:
 *                       type: boolean
 *                       example: true
 *                     upgradeMessage:
 *                       type: string
 *                       example: "Sign up to see AI match scores, full descriptions, and contact information"
 *       500:
 *         description: Server error
 */

// Public opportunities endpoint - no authentication required
// Returns basic opportunity data without premium features (match scores, full descriptions, etc.)
// Uses centralized test data factory for consistency with dashboard

const searchParamsSchema = z.object({
  query: z.string().optional(),
  agencies: z.string().optional(),
  naicsCodes: z.string().optional(),
  states: z.string().optional(),
  setAsideTypes: z.string().optional(),
  minValue: z.string().optional(),
  maxValue: z.string().optional(),
  deadline: z.string().optional(),
  sort: z.string().default('postedDate'),
  order: z.enum(['asc', 'desc']).default('desc'),
  limit: z.string().default('10'),
  offset: z.string().default('0'),
})

// Generate consistent mock opportunities using realistic factory
const MOCK_OPPORTUNITIES = createRealisticOpportunities(50) // Generate 50 realistic opportunities

// Transform opportunities to public format (limited data)
const MOCK_PUBLIC_OPPORTUNITIES = MOCK_OPPORTUNITIES.map(opp => ({
  id: opp.id,
  title: opp.title,
  agency: opp.agency,
  deadline: typeof opp.deadline === 'string' ? opp.deadline : opp.deadline.toISOString(),
  contractValue: opp.contractValue || 100000,
  solicitationNumber: opp.solicitationNumber,
  location: opp.location || 'Washington, DC',
  setAsideType: opp.setAsideType || 'NONE',
  type: opp.type,
  naicsCodes: opp.naicsCodes || [],
  postedDate: typeof opp.postedDate === 'string' ? opp.postedDate : opp.postedDate.toISOString(),
  status: 'Open',
  // No description, match scores, or contact info in public data
}))

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const params = searchParamsSchema.parse(Object.fromEntries(searchParams))

    // Parse parameters
    const limit = Math.min(parseInt(params.limit), 20) // Cap at 20 for public API
    const offset = parseInt(params.offset)
    
    // Simple filtering for demo purposes
    let filteredOpportunities = MOCK_PUBLIC_OPPORTUNITIES

    // Filter by query (title search)
    if (params.query) {
      const query = params.query.toLowerCase()
      filteredOpportunities = filteredOpportunities.filter(opp => {
        const agencyName = typeof opp.agency === 'string' ? opp.agency : opp.agency?.name || '';
        return opp.title.toLowerCase().includes(query) ||
          agencyName.toLowerCase().includes(query) ||
          opp.solicitationNumber.toLowerCase().includes(query);
      })
    }

    // Filter by agencies
    if (params.agencies) {
      const agencies = params.agencies.split(',')
      filteredOpportunities = filteredOpportunities.filter(opp =>
        agencies.includes(opp.agency)
      )
    }

    // Filter by NAICS codes
    if (params.naicsCodes) {
      const naicsCodes = params.naicsCodes.split(',')
      filteredOpportunities = filteredOpportunities.filter(opp =>
        opp.naicsCodes.some(code => naicsCodes.includes(code))
      )
    }

    // Filter by set-aside types
    if (params.setAsideTypes) {
      const setAsideTypes = params.setAsideTypes.split(',')
      filteredOpportunities = filteredOpportunities.filter(opp =>
        setAsideTypes.includes(opp.setAsideType)
      )
    }

    // Filter by contract value
    if (params.minValue) {
      const minValue = parseInt(params.minValue)
      filteredOpportunities = filteredOpportunities.filter(opp =>
        opp.contractValue >= minValue
      )
    }

    if (params.maxValue) {
      const maxValue = parseInt(params.maxValue)
      filteredOpportunities = filteredOpportunities.filter(opp =>
        opp.contractValue <= maxValue
      )
    }

    // Filter by deadline
    if (params.deadline) {
      const deadlineDate = new Date(params.deadline)
      filteredOpportunities = filteredOpportunities.filter(opp =>
        new Date(opp.deadline) >= deadlineDate
      )
    }

    // Simple sorting
    filteredOpportunities.sort((a, b) => {
      let aVal: any, bVal: any
      
      switch (params.sort) {
        case 'deadline':
          aVal = new Date(a.deadline)
          bVal = new Date(b.deadline)
          break
        case 'contractValue':
          aVal = a.contractValue
          bVal = b.contractValue
          break
        case 'postedDate':
        default:
          aVal = new Date(a.postedDate)
          bVal = new Date(b.postedDate)
          break
      }

      if (params.order === 'desc') {
        return bVal > aVal ? 1 : -1
      } else {
        return aVal > bVal ? 1 : -1
      }
    })

    // Pagination
    const total = filteredOpportunities.length
    const paginatedOpportunities = filteredOpportunities.slice(offset, offset + limit)
    const hasMore = offset + limit < total

    return NextResponse.json({
      success: true,
      data: {
        items: paginatedOpportunities,
        total,
        page: Math.floor(offset / limit) + 1,
        limit,
        hasMore,
        preview: true, // Indicates this is public/limited data
        upgradeMessage: "Sign up to see AI match scores, full descriptions, and contact information",
        lastUpdated: new Date().toISOString(),
        nextRefresh: new Date(Date.now() + 300000).toISOString() // 5 minutes from now
      }
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        'CDN-Cache-Control': 'public, s-maxage=300',
      }
    })

  } catch (error) {
    console.error('Public opportunities API error:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch opportunities'
    }, { status: 500 })
  }
}