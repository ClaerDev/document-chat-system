import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { z } from 'zod'

// Search parameters validation schema
const SearchParamsSchema = z.object({
  query: z.string().optional()
    .describe("Search query text for keyword-based opportunity discovery. Optional field for finding opportunities containing specific terms in title, description, or requirements."),
  agencies: z.string().optional()
    .describe("Comma-separated list of government agencies to filter by. Optional field for targeting specific departments or organizations posting opportunities."),
  naicsCodes: z.string().optional()
    .describe("Comma-separated list of 6-digit NAICS codes for industry-specific filtering. Optional field for finding opportunities in specific industries or business sectors."),
  states: z.string().optional()
    .describe("Comma-separated list of 2-letter state codes for geographic filtering. Optional field for finding opportunities in specific states or regions."),
  performanceStates: z.string().optional()
    .describe("Comma-separated list of 2-letter state codes for work performance location filtering. Optional field for finding opportunities requiring work in specific locations."),
  setAsideTypes: z.string().optional()
    .describe("Comma-separated list of set-aside types for small business filtering. Optional field for finding opportunities reserved for specific business types (8a, HUBZone, SDVOSB, etc.)."),
  securityClearances: z.string().optional()
    .describe("Comma-separated list of security clearance levels for filtering. Optional field for finding opportunities matching available clearance levels."),
  procurementMethods: z.string().optional()
    .describe("Comma-separated list of procurement methods for filtering. Optional field for finding opportunities using specific procurement approaches."),
  itSubcategories: z.string().optional()
    .describe("Comma-separated list of IT subcategories for technology-specific filtering. Optional field for finding IT-related opportunities."),
  opportunityStatus: z.string().optional()
    .describe("Comma-separated list of opportunity status values for filtering. Optional field for finding opportunities in specific states (active, closing soon, etc.)."),
  contractDuration: z.string().optional()
    .describe("Comma-separated list of contract duration ranges for filtering. Optional field for finding opportunities with specific contract lengths."),
  minValue: z.string().regex(/^\d+$/).optional().transform(val => val ? Number(val) : undefined)
    .describe("Minimum contract value filter in US dollars. Optional numeric string (digits only) automatically converted to number. Used for finding opportunities above a certain value threshold."),
  maxValue: z.string().regex(/^\d+$/).optional().transform(val => val ? Number(val) : undefined)
    .describe("Maximum contract value filter in US dollars. Optional numeric string (digits only) automatically converted to number. Used for finding opportunities below a certain value threshold."),
  deadline: z.string().optional()
    .describe("Deadline filter for finding opportunities with specific submission deadlines. Optional field supporting various date formats."),
  sort: z.enum(['postedDate', 'deadline', 'contractValue', 'title', 'matchScore']).optional().default('postedDate')
    .describe("Sort field for ordering search results. Default: 'postedDate'. Options: postedDate for newest first, deadline for urgent opportunities, contractValue for highest value, title for alphabetical, matchScore for best matches."),
  order: z.enum(['asc', 'desc']).optional().default('desc')
    .describe("Sort order for search results. Default: 'desc' (descending). 'asc' for ascending order, 'desc' for descending order."),
  limit: z.string().regex(/^\d+$/).optional().default('10').transform(val => Math.min(Number(val), 50))
    .describe("Maximum number of results to return. Default: 10, maximum: 50. Numeric string automatically converted to number and capped at 50 for performance."),
  offset: z.string().regex(/^\d+$/).optional().default('0').transform(Number)
    .describe("Number of results to skip for pagination. Default: 0. Numeric string automatically converted to number. Used for pagination through large result sets.")
})
  .describe("Schema for validating opportunity search parameters. Supports comprehensive filtering by industry, location, value, agencies, and other criteria with automatic type conversion and validation.")

/**
 * Opportunity search parameter validation for government contracting opportunities.
 * 
 * Features:
 * - Comprehensive search filtering (keywords, agencies, industries, locations)
 * - Value range filtering for contract sizing
 * - Set-aside type filtering for small business opportunities
 * - Security clearance matching
 * - Flexible sorting and pagination
 * - Automatic type conversion and validation
 * 
 * Used for:
 * - Advanced opportunity discovery
 * - Targeted opportunity searches
 * - Filter-based opportunity matching
 * - Paginated search results
 * - API parameter validation
 */

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Unauthorized. Please sign in to search opportunities.' 
      }, { status: 401 })
    }

    // Parse and validate search parameters
    const { searchParams } = new URL(request.url)
    const params = Object.fromEntries(searchParams.entries())
    
    let validatedParams
    try {
      validatedParams = SearchParamsSchema.parse(params)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json({
          success: false,
          error: 'Invalid search parameters',
          details: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        }, { status: 400 })
      }
      throw error
    }

    // For now, redirect to the existing opportunities-mock endpoint
    // This maintains compatibility while we transition to the formal search endpoint
    const mockParams = new URLSearchParams()
    
    if (validatedParams.query) mockParams.set('query', validatedParams.query)
    if (validatedParams.agencies) mockParams.set('agencies', validatedParams.agencies)
    if (validatedParams.naicsCodes) mockParams.set('naicsCodes', validatedParams.naicsCodes)
    if (validatedParams.states) mockParams.set('states', validatedParams.states)
    if (validatedParams.setAsideTypes) mockParams.set('setAsideTypes', validatedParams.setAsideTypes)
    if (validatedParams.minValue) mockParams.set('minValue', validatedParams.minValue.toString())
    if (validatedParams.maxValue) mockParams.set('maxValue', validatedParams.maxValue.toString())
    mockParams.set('sort', validatedParams.sort)
    mockParams.set('order', validatedParams.order)
    mockParams.set('limit', validatedParams.limit.toString())
    mockParams.set('offset', validatedParams.offset.toString())

    // Make internal request to mock endpoint
    const baseUrl = process.env.NODE_ENV === 'development' 
      ? 'http://localhost:3000'
      : `https://${request.headers.get('host')}`
    
    const mockResponse = await fetch(`${baseUrl}/api/opportunities-mock?${mockParams.toString()}`)
    const mockResult = await mockResponse.json()

    if (!mockResult.success) {
      return NextResponse.json({
        success: false,
        error: 'Search service temporarily unavailable'
      }, { status: 503 })
    }

    // Return standardized response
    return NextResponse.json({
      success: true,
      data: {
        ...mockResult.data,
        searchParams: validatedParams
      }
    })

  } catch (error) {
    console.error('Error in opportunities search:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}