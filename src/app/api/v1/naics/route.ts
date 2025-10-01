/**
 * @swagger
 * /api/v1/naics:
 *   get:
 *     summary: Search and retrieve NAICS codes
 *     description: |
 *       Comprehensive NAICS (North American Industry Classification System) codes API with advanced search and filtering capabilities.
 *       Supports searching by code, title, description, sector, and classification level.
 *     tags: [NAICS Codes]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search query for code, title, or description
 *         example: "software development"
 *       - in: query
 *         name: code
 *         schema:
 *           type: string
 *         description: Exact NAICS code to retrieve
 *         example: "541511"
 *       - in: query
 *         name: sector
 *         schema:
 *           type: string
 *         description: Comma-separated list of sector numbers (11-99)
 *         example: "51,54,72"
 *       - in: query
 *         name: level
 *         schema:
 *           type: string
 *           enum: [sector, subsector, industryGroup, industry, nationalIndustry]
 *         description: Filter by classification level
 *         example: "industry"
 *       - in: query
 *         name: levels
 *         schema:
 *           type: string
 *         description: Comma-separated list of classification levels
 *         example: "industry,nationalIndustry"
 *       - in: query
 *         name: parent
 *         schema:
 *           type: string
 *         description: Parent code to filter child codes
 *         example: "5415"
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 1000
 *           default: 100
 *         description: Maximum number of results to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           minimum: 0
 *           default: 0
 *         description: Number of results to skip for pagination
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [code, title, relevance, level]
 *           default: relevance
 *         description: Sort order for results
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: asc
 *         description: Sort direction
 *       - in: query
 *         name: includeHierarchy
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Include full hierarchy information
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [json, csv]
 *           default: json
 *         description: Response format
 *     responses:
 *       200:
 *         description: NAICS codes retrieved successfully
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
 *                     codes:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           code:
 *                             type: string
 *                             example: "541511"
 *                           title:
 *                             type: string
 *                             example: "Custom Computer Programming Services"
 *                           description:
 *                             type: string
 *                             example: "This industry comprises establishments primarily engaged in writing, modifying, testing, and supporting software to meet the needs of a particular customer."
 *                           level:
 *                             type: string
 *                             enum: [sector, subsector, industryGroup, industry, nationalIndustry]
 *                             example: "nationalIndustry"
 *                           sectorNumber:
 *                             type: integer
 *                             example: 54
 *                           parentCode:
 *                             type: string
 *                             example: "54151"
 *                           hierarchy:
 *                             type: object
 *                             properties:
 *                               sector:
 *                                 type: string
 *                                 example: "54"
 *                               subsector:
 *                                 type: string
 *                                 example: "541"
 *                               industryGroup:
 *                                 type: string
 *                                 example: "5415"
 *                               industry:
 *                                 type: string
 *                                 example: "54151"
 *                           matchType:
 *                             type: string
 *                             enum: [code, title, description]
 *                             example: "title"
 *                           relevanceScore:
 *                             type: number
 *                             example: 0.95
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                           example: 1057
 *                         limit:
 *                           type: integer
 *                           example: 100
 *                         offset:
 *                           type: integer
 *                           example: 0
 *                         hasMore:
 *                           type: boolean
 *                           example: true
 *                     meta:
 *                       type: object
 *                       properties:
 *                         totalSectors:
 *                           type: integer
 *                           example: 20
 *                         availableLevels:
 *                           type: array
 *                           items:
 *                             type: string
 *                           example: ["sector", "subsector", "industryGroup", "industry", "nationalIndustry"]
 *                         searchPerformed:
 *                           type: boolean
 *                           example: true
 *                         processingTimeMs:
 *                           type: number
 *                           example: 45.2
 *           text/csv:
 *             schema:
 *               type: string
 *               example: |
 *                 code,title,description,level,sectorNumber,parentCode
 *                 "541511","Custom Computer Programming Services","This industry comprises establishments primarily engaged in writing, modifying, testing, and supporting software to meet the needs of a particular customer.","nationalIndustry",54,"54151"
 *       400:
 *         description: Bad request - Invalid parameters
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "Invalid sector number. Must be between 11 and 99."
 *                 details:
 *                   type: object
 *                   properties:
 *                     code:
 *                       type: string
 *                       example: "INVALID_PARAMETERS"
 *                     validSectors:
 *                       type: array
 *                       items:
 *                         type: integer
 *                       example: [11, 21, 22, 23, 31, 42, 44, 48, 51, 52, 53, 54, 55, 56, 61, 62, 71, 72, 81, 92]
 *       404:
 *         description: No NAICS codes found matching criteria
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "No NAICS codes found matching the specified criteria"
 *                 data:
 *                   type: object
 *                   properties:
 *                     searchCriteria:
 *                       type: object
 *                     suggestions:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: ["Try broader search terms", "Check sector numbers", "Use partial codes"]
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: "Internal server error while processing NAICS data"
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSearchableNAICSCodes, searchNAICSCodes } from '@/lib/naics'
import type { NAICSSearchFilters, NAICSCode } from '@/types/naics'

// Valid NAICS sectors (2022)
const VALID_SECTORS = [11, 21, 22, 23, 31, 42, 44, 48, 51, 52, 53, 54, 55, 56, 61, 62, 71, 72, 81, 92]

// Valid classification levels
const VALID_LEVELS = ['sector', 'subsector', 'industryGroup', 'industry', 'nationalIndustry'] as const

// Valid sort options
const VALID_SORT_OPTIONS = ['code', 'title', 'relevance', 'level'] as const

// Rate limiting and caching headers
const CACHE_DURATION = 60 * 60 * 24 // 24 hours in seconds

export async function GET(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    const { searchParams } = new URL(request.url)
    
    // Parse query parameters
    const rawParams = {
      search: searchParams.get('search'),
      code: searchParams.get('code'),
      sector: searchParams.get('sector'),
      level: searchParams.get('level'),
      levels: searchParams.get('levels'),
      parent: searchParams.get('parent'),
      limit: searchParams.get('limit'),
      offset: searchParams.get('offset'),
      sort: searchParams.get('sort'),
      order: searchParams.get('order'),
      includeHierarchy: searchParams.get('includeHierarchy'),
      format: searchParams.get('format')
    }

    // Validate and parse parameters
    const validationResult = validateQueryParameters(rawParams)
    if (!validationResult.isValid) {
      return NextResponse.json({
        success: false,
        error: validationResult.error,
        details: validationResult.details
      }, { status: 400 })
    }

    const params = validationResult.params!

    // Get all NAICS codes
    const allCodes = getSearchableNAICSCodes()
    
    if (!allCodes || allCodes.length === 0) {
      return NextResponse.json({
        success: false,
        error: "NAICS data not available"
      }, { status: 500 })
    }

    // Apply filters and search
    let filteredCodes = allCodes
    let searchPerformed = false

    // Exact code lookup
    if (params.code) {
      filteredCodes = allCodes.filter(naics => naics.code === params.code)
      if (filteredCodes.length === 0) {
        return NextResponse.json({
          success: false,
          error: `NAICS code '${params.code}' not found`,
          data: {
            searchCriteria: { code: params.code },
            suggestions: [
              "Verify the code format (e.g., '541511' not '54-1511')",
              "Try searching by title or description",
              "Use parent code to find related codes"
            ]
          }
        }, { status: 404 })
      }
    }
    // Parent code filter
    else if (params.parent) {
      filteredCodes = allCodes.filter(naics => 
        naics.code.startsWith(params.parent) && naics.code !== params.parent
      )
    }
    // Search functionality
    else if (params.search) {
      const searchFilters: NAICSSearchFilters = {
        sectorNumbers: params.sectors,
        levels: params.levels,
        includeDescriptions: true
      }
      
      const searchResults = searchNAICSCodes(params.search, searchFilters)
      filteredCodes = searchResults.map(result => ({
        ...allCodes.find(code => code.code === result.code)!,
        matchType: result.matchType,
        relevanceScore: result.relevanceScore
      }))
      searchPerformed = true
    }

    // Apply additional filters
    if (params.sectors && params.sectors.length > 0) {
      filteredCodes = filteredCodes.filter(naics => 
        naics.sectorNumber && params.sectors!.includes(naics.sectorNumber)
      )
    }

    if (params.levels && params.levels.length > 0) {
      filteredCodes = filteredCodes.filter(naics => 
        params.levels!.includes(naics.level)
      )
    }

    // Sort results
    if (params.sort) {
      filteredCodes.sort((a, b) => {
        let comparison = 0
        
        switch (params.sort) {
          case 'code':
            comparison = a.code.localeCompare(b.code)
            break
          case 'title':
            comparison = a.title.localeCompare(b.title)
            break
          case 'level':
            const levelOrder = { sector: 1, subsector: 2, industryGroup: 3, industry: 4, nationalIndustry: 5 }
            comparison = levelOrder[a.level] - levelOrder[b.level]
            break
          case 'relevance':
            const scoreA = (a as any).relevanceScore || 1
            const scoreB = (b as any).relevanceScore || 1
            comparison = scoreB - scoreA // Higher scores first
            break
        }
        
        return params.order === 'desc' ? -comparison : comparison
      })
    }

    // Handle empty results
    if (filteredCodes.length === 0) {
      return NextResponse.json({
        success: false,
        error: "No NAICS codes found matching the specified criteria",
        data: {
          searchCriteria: rawParams,
          suggestions: generateSearchSuggestions(rawParams)
        }
      }, { status: 404 })
    }

    // Apply pagination
    const total = filteredCodes.length
    const paginatedCodes = filteredCodes.slice(params.offset, params.offset + params.limit)

    // Prepare response data
    const responseData = {
      codes: paginatedCodes.map(code => formatNAICSCode(code, params.includeHierarchy)),
      pagination: {
        total,
        limit: params.limit,
        offset: params.offset,
        hasMore: params.offset + params.limit < total
      },
      meta: {
        totalSectors: new Set(allCodes.map(c => c.sectorNumber)).size,
        availableLevels: VALID_LEVELS,
        searchPerformed,
        processingTimeMs: Date.now() - startTime
      }
    }

    // Handle CSV format
    if (params.format === 'csv') {
      const csv = generateCSV(responseData.codes)
      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="naics-codes.csv"',
          'Cache-Control': `public, max-age=${CACHE_DURATION}`,
        }
      })
    }

    // Return JSON response
    const response = NextResponse.json({
      success: true,
      data: responseData
    })

    // Add caching headers
    response.headers.set('Cache-Control', `public, max-age=${CACHE_DURATION}`)
    response.headers.set('X-Processing-Time', `${Date.now() - startTime}ms`)

    return response

  } catch (error) {
    console.error('[NAICS API] Error:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Internal server error while processing NAICS data',
      details: process.env.NODE_ENV === 'development' ? {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      } : undefined
    }, { status: 500 })
  }
}

// Validation function
function validateQueryParameters(rawParams: Record<string, string | null>) {
  const errors: string[] = []
  const details: Record<string, any> = {}

  // Parse and validate limit
  let limit = 100
  if (rawParams.limit) {
    const parsedLimit = parseInt(rawParams.limit)
    if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 1000) {
      errors.push("Limit must be between 1 and 1000")
    } else {
      limit = parsedLimit
    }
  }

  // Parse and validate offset
  let offset = 0
  if (rawParams.offset) {
    const parsedOffset = parseInt(rawParams.offset)
    if (isNaN(parsedOffset) || parsedOffset < 0) {
      errors.push("Offset must be 0 or greater")
    } else {
      offset = parsedOffset
    }
  }

  // Parse and validate sectors
  let sectors: number[] | undefined
  if (rawParams.sector) {
    const sectorStrings = rawParams.sector.split(',').map(s => s.trim())
    sectors = []
    for (const sectorStr of sectorStrings) {
      const sector = parseInt(sectorStr)
      if (isNaN(sector) || !VALID_SECTORS.includes(sector)) {
        errors.push(`Invalid sector: ${sectorStr}. Valid sectors: ${VALID_SECTORS.join(', ')}`)
        details.validSectors = VALID_SECTORS
        break
      }
      sectors.push(sector)
    }
  }

  // Parse and validate levels
  let levels: typeof VALID_LEVELS[number][] | undefined
  if (rawParams.levels || rawParams.level) {
    const levelStrings = (rawParams.levels || rawParams.level)!.split(',').map(l => l.trim())
    levels = []
    for (const levelStr of levelStrings) {
      if (!VALID_LEVELS.includes(levelStr as any)) {
        errors.push(`Invalid level: ${levelStr}. Valid levels: ${VALID_LEVELS.join(', ')}`)
        details.validLevels = VALID_LEVELS
        break
      }
      levels.push(levelStr as any)
    }
  }

  // Validate sort
  const sort = rawParams.sort as typeof VALID_SORT_OPTIONS[number] || 'relevance'
  if (rawParams.sort && !VALID_SORT_OPTIONS.includes(rawParams.sort as any)) {
    errors.push(`Invalid sort option: ${rawParams.sort}. Valid options: ${VALID_SORT_OPTIONS.join(', ')}`)
    details.validSortOptions = VALID_SORT_OPTIONS
  }

  // Validate order
  const order = (rawParams.order === 'desc' ? 'desc' : 'asc') as 'asc' | 'desc'

  // Validate format
  const format = (rawParams.format === 'csv' ? 'csv' : 'json') as 'json' | 'csv'

  // Parse boolean parameters
  const includeHierarchy = rawParams.includeHierarchy === 'true'

  if (errors.length > 0) {
    return {
      isValid: false,
      error: errors.join('. '),
      details: { code: 'INVALID_PARAMETERS', ...details }
    }
  }

  return {
    isValid: true,
    params: {
      search: rawParams.search || undefined,
      code: rawParams.code || undefined,
      parent: rawParams.parent || undefined,
      sectors,
      levels,
      limit,
      offset,
      sort,
      order,
      includeHierarchy,
      format
    }
  }
}

// Format NAICS code for response
function formatNAICSCode(code: NAICSCode & { matchType?: string; relevanceScore?: number }, includeHierarchy: boolean) {
  const formatted: any = {
    code: code.code,
    title: code.title,
    description: code.description,
    level: code.level,
    sectorNumber: code.sectorNumber,
    parentCode: code.parentCode
  }

  if (includeHierarchy) {
    formatted.hierarchy = code.hierarchy
  }

  if (code.matchType) {
    formatted.matchType = code.matchType
  }

  if (code.relevanceScore !== undefined) {
    formatted.relevanceScore = code.relevanceScore
  }

  return formatted
}

// Generate CSV output
function generateCSV(codes: any[]): string {
  if (codes.length === 0) return 'No data'

  // CSV headers
  const headers = ['code', 'title', 'description', 'level', 'sectorNumber', 'parentCode']
  
  // CSV rows
  const rows = codes.map(code => 
    headers.map(header => {
      const value = code[header] || ''
      // Escape quotes and wrap in quotes if contains comma/quote/newline
      const escaped = String(value).replace(/"/g, '""')
      return /[",\n]/.test(escaped) ? `"${escaped}"` : escaped
    }).join(',')
  )

  return [headers.join(','), ...rows].join('\n')
}

// Generate search suggestions
function generateSearchSuggestions(params: Record<string, string | null>): string[] {
  const suggestions: string[] = []
  
  if (params.search) {
    suggestions.push("Try using broader or more specific search terms")
    suggestions.push("Search by industry keywords (e.g., 'software', 'construction', 'retail')")
  }
  
  if (params.sector) {
    suggestions.push("Try different sector numbers or remove sector filter")
  }
  
  if (params.level || params.levels) {
    suggestions.push("Try different classification levels or remove level filter")
  }
  
  suggestions.push("Use partial codes for broader results")
  suggestions.push("Check the NAICS manual for official classifications")
  
  return suggestions
}