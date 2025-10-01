import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { z } from 'zod'
import type { ApiResponse } from '@/types'

/**
 * @swagger
 * /api/v1/sam-gov/fetch:
 *   post:
 *     summary: Fetch entity data from SAM.gov
 *     description: Fetches business information from SAM.gov using UEI (server-side with API key)
 *     tags: [SAM.gov Integration]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - uei
 *             properties:
 *               uei:
 *                 type: string
 *                 pattern: '^[A-Z0-9]{12}$'
 *                 description: 12-character Unique Entity Identifier from SAM.gov
 *                 example: 'ABC123DEF456'
 *     responses:
 *       200:
 *         description: Successfully fetched SAM.gov data
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
 *                   description: Raw SAM.gov API response
 *       400:
 *         description: Invalid UEI format or validation error
 *       401:
 *         description: Unauthorized - user not authenticated
 *       404:
 *         description: Entity not found in SAM.gov
 *       500:
 *         description: Internal server error or SAM.gov API error
 */

const fetchRequestSchema = z.object({
  uei: z.string()
    .min(12, 'UEI must be exactly 12 characters')
    .max(12, 'UEI must be exactly 12 characters')
    .regex(/^[A-Z0-9]{12}$/, 'UEI must contain only uppercase letters and numbers')
    .describe('Unique Entity Identifier from SAM.gov registration')
})

type FetchRequest = z.infer<typeof fetchRequestSchema>

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const { userId } = await auth()
    if (!userId) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Unauthorized'
      }
      return NextResponse.json(response, { status: 401 })
    }

    // Parse and validate request body
    const body = await request.json()
    let validatedData: FetchRequest

    try {
      validatedData = fetchRequestSchema.parse(body)
    } catch (error) {
      if (error instanceof z.ZodError) {
        const response: ApiResponse<null> = {
          success: false,
          error: 'Invalid request data',
          message: error.errors.map(e => e.message).join(', ')
        }
        return NextResponse.json(response, { status: 400 })
      }
      throw error
    }

    // Get SAM.gov API key from environment
    const apiKey = process.env.SAM_API_KEY
    if (!apiKey) {
      console.error('SAM.gov API key not configured')
      const response: ApiResponse<null> = {
        success: false,
        error: 'SAM.gov integration not configured',
        message: 'Please contact support for SAM.gov integration setup.'
      }
      return NextResponse.json(response, { status: 500 })
    }

    // Get API base URL from environment (defaults to production)
    const baseUrl = process.env.SAM_API_BASE_URL || 'https://api.sam.gov'
    
    // Use v4 endpoint with includeSections parameter - request all relevant sections
    // UEI needs to be in array format [UEI]
    const samGovUrl = `${baseUrl}/entity-information/v4/entities?api_key=${apiKey}&ueiSAM=[${validatedData.uei}]&includeSections=entityRegistration,coreData,repsAndCerts,pointsOfContact`
    
    console.log(`Making SAM.gov API call to: ${baseUrl}/entity-information/v4/entities?api_key=***&ueiSAM=[${validatedData.uei}]&includeSections=entityRegistration,coreData,repsAndCerts,pointsOfContact`)
    
    const samGovResponse = await fetch(samGovUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'GovMatch-AI/1.0',
      },
    })

    if (!samGovResponse.ok) {
      console.error(`SAM.gov API error: ${samGovResponse.status} ${samGovResponse.statusText}`)
      
      // Try to get more detailed error information
      try {
        const errorText = await samGovResponse.text()
        console.error('SAM.gov API error response:', errorText)
      } catch (e) {
        console.error('Could not read error response')
      }
      
      if (samGovResponse.status === 404) {
        const response: ApiResponse<null> = {
          success: false,
          error: `No entity found with UEI: ${validatedData.uei}`,
          message: 'Please verify your UEI is correct and your registration is active.'
        }
        return NextResponse.json(response, { status: 404 })
      }
      
      if (samGovResponse.status === 401) {
        const response: ApiResponse<null> = {
          success: false,
          error: 'Invalid SAM.gov API credentials',
          message: 'Please contact support for assistance.'
        }
        return NextResponse.json(response, { status: 401 })
      }
      
      if (samGovResponse.status === 429) {
        const response: ApiResponse<null> = {
          success: false,
          error: 'SAM.gov rate limit exceeded',
          message: 'Too many requests. Please try again in a few minutes.'
        }
        return NextResponse.json(response, { status: 429 })
      }
      
      const response: ApiResponse<null> = {
        success: false,
        error: `Failed to fetch from SAM.gov: ${samGovResponse.statusText}`,
        message: 'An error occurred while contacting SAM.gov. Please try again later.'
      }
      return NextResponse.json(response, { status: 500 })
    }

    const samGovData = await samGovResponse.json()
    
    console.log('SAM.gov API response received:', JSON.stringify(samGovData, null, 2))
    
    // Validate that we got entity data
    if (!samGovData.entityData || !samGovData.entityData.length) {
      console.error('No entity data in response:', samGovData)
      const response: ApiResponse<null> = {
        success: false,
        error: 'No registration data found for this UEI',
        message: 'The entity was found but no registration data is available.'
      }
      return NextResponse.json(response, { status: 404 })
    }

    const response: ApiResponse<any> = {
      success: true,
      data: samGovData,
      message: 'Successfully fetched data from SAM.gov'
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('SAM.gov fetch error:', error)
    
    const response: ApiResponse<null> = {
      success: false,
      error: 'Internal server error',
      message: 'Failed to fetch data from SAM.gov. Please try again later.'
    }
    
    return NextResponse.json(response, { status: 500 })
  }
}