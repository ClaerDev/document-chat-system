import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { z } from 'zod'
import { samGovClient, SamGovApiError } from '@/lib/sam-gov/client'
import { prisma } from '@/lib/prisma'
import type { ApiResponse } from '@/types'
import type { SamGovRegistration } from '@/types/profile'

/**
 * @swagger
 * /api/v1/sam-gov/import:
 *   post:
 *     summary: Import company profile data from SAM.gov
 *     description: Fetches and imports business information from SAM.gov using UEI
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
 *         description: Successfully imported SAM.gov data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/SamGovRegistration'
 *                 message:
 *                   type: string
 *                   example: 'Profile successfully imported from SAM.gov'
 *       400:
 *         description: Invalid UEI format or validation error
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
 *                   example: 'Invalid UEI format'
 *       401:
 *         description: Unauthorized - user not authenticated
 *       404:
 *         description: Entity not found in SAM.gov
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
 *                   example: 'Entity with UEI ABC123DEF456 not found in SAM.gov'
 *       500:
 *         description: Internal server error or SAM.gov API error
 */

const importRequestSchema = z.object({
  uei: z.string()
    .min(12, 'UEI must be exactly 12 characters')
    .max(12, 'UEI must be exactly 12 characters')
    .regex(/^[A-Z0-9]{12}$/, 'UEI must contain only uppercase letters and numbers')
    .describe('Unique Entity Identifier from SAM.gov registration'),
  samGovData: z.any().optional().describe('Pre-fetched SAM.gov data from alpha API')
})

type ImportRequest = z.infer<typeof importRequestSchema>

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
    let validatedData: ImportRequest

    try {
      validatedData = importRequestSchema.parse(body)
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

    // Use pre-fetched data or fetch from SAM.gov
    let samGovData: any
    
    if (validatedData.samGovData) {
      // Use pre-fetched data from the modal
      samGovData = validatedData.samGovData
    } else {
      // Fallback to fetching from SAM.gov directly
      try {
        samGovData = await samGovClient.getEntityByUei(validatedData.uei)
      } catch (error) {
        if (error instanceof SamGovApiError) {
          const response: ApiResponse<null> = {
            success: false,
            error: error.message,
            message: error.statusCode === 404 ? 
              'The UEI was not found in SAM.gov. Please verify your UEI is correct and your registration is active.' :
              'Failed to fetch data from SAM.gov. Please try again later.'
          }
          return NextResponse.json(response, { 
            status: error.statusCode === 404 ? 404 : 500 
          })
        }
        
        console.error('Unexpected SAM.gov API error:', error)
        const response: ApiResponse<null> = {
          success: false,
          error: 'Failed to import from SAM.gov',
          message: 'An unexpected error occurred while fetching data from SAM.gov. Please try again later.'
        }
        return NextResponse.json(response, { status: 500 })
      }
    }

    // Get or create user's organization and profile
    let user = await prisma.user.findUnique({
      where: { clerkId: userId },
      include: { organization: true }
    })

    if (!user) {
      // Create user if doesn't exist (shouldn't happen with proper flow)
      console.warn(`User ${userId} not found, creating...`)
      
      // This should be handled by the user sync endpoint first
      const response: ApiResponse<null> = {
        success: false,
        error: 'User profile not found',
        message: 'Please complete account setup first'
      }
      return NextResponse.json(response, { status: 400 })
    }

    // Get or create profile
    let profile = await prisma.profile.findFirst({
      where: { organizationId: user.organizationId }
    })

    // Extract entity data from raw SAM.gov API response (v4 structure)
    const entity = samGovData.entityData?.[0]
    const entityRegistration = entity?.entityRegistration
    const coreData = entity?.coreData
    const repsAndCerts = entity?.repsAndCerts
    const pointsOfContact = entity?.pointsOfContact || []
    const address = coreData?.physicalAddress || coreData?.mailingAddress || {}
    const naicsData = repsAndCerts?.goodsAndServices?.naics || []
    const primaryContact = pointsOfContact.find((poc: any) => poc.pointOfContactType === 'Government Business') || pointsOfContact[0]
    
    console.log('Processing SAM.gov import data:', { 
      entityRegistration, 
      coreData, 
      repsAndCerts,
      pointsOfContact,
      naicsCount: naicsData.length,
      primaryContact: primaryContact
    })
    
    // Prepare profile data from SAM.gov
    const profileUpdateData = {
      companyName: entityRegistration?.legalBusinessName || 'Unknown Company',
      dbaName: entityRegistration?.dbaName || null,
      uei: validatedData.uei,
      cageCode: entityRegistration?.cageCode || null,
      addressLine1: address?.addressLine1 || null,
      addressLine2: address?.addressLine2 || null,
      city: address?.city || null,
      state: address?.stateOrProvinceCode || null,
      zipCode: address?.zipCode || null,
      country: address?.countryCode || 'USA',
      phone: primaryContact?.phoneNumber || null,
      email: primaryContact?.email || null,
      website: coreData?.generalInformation?.websiteURL || null,
      businessStartDate: coreData?.generalInformation?.entityStartDate || null,
      fiscalYearEnd: coreData?.generalInformation?.fiscalYearEndCloseDate || null,
      registrationStatus: entityRegistration?.registrationStatus || null,
      registrationDate: entityRegistration?.registrationDate || null,
      expirationDate: entityRegistration?.registrationExpirationDate || null,
      samGovData: samGovData as any, // Store complete SAM.gov data
      samGovSyncedAt: new Date(),
      updatedById: user.id
    }

    // Extract NAICS codes from repsAndCerts.goodsAndServices.naics
    if (naicsData && naicsData.length > 0) {
      const primaryNaics = naicsData.find((n: any) => n.isPrimary)
      const secondaryNaics = naicsData.filter((n: any) => !n.isPrimary)
      
      if (primaryNaics) {
        profileUpdateData.primaryNaics = primaryNaics.naicsCode
      }
      
      if (secondaryNaics.length > 0) {
        profileUpdateData.secondaryNaics = secondaryNaics.map((n: any) => n.naicsCode)
      }
      
      console.log(`Extracted NAICS codes: Primary=${primaryNaics?.naicsCode}, Secondary=[${secondaryNaics.map((n: any) => n.naicsCode).join(', ')}]`)
    }
    
    // Extract certifications from repsAndCerts.certifications
    const certifications = repsAndCerts?.certifications || []
    if (certifications.length > 0) {
      console.log(`Extracted ${certifications.length} certifications:`, certifications)
      // Store certifications in samGovData for later processing
      profileUpdateData.samGovCertifications = certifications
    }

    // Update or create profile
    if (profile) {
      profile = await prisma.profile.update({
        where: { id: profile.id },
        data: profileUpdateData
      })
    } else {
      profile = await prisma.profile.create({
        data: {
          ...profileUpdateData,
          organizationId: user.organizationId,
          createdById: user.id,
          profileCompleteness: 0 // Will be calculated by profile completeness logic
        }
      })
    }

    // Recalculate profile completeness
    const completenessScore = calculateProfileCompleteness(profile)
    
    console.log(`Profile completeness calculation: ${profile.profileCompleteness} -> ${completenessScore}`)
    
    if (completenessScore !== profile.profileCompleteness) {
      await prisma.profile.update({
        where: { id: profile.id },
        data: { profileCompleteness: completenessScore }
      })
      profile.profileCompleteness = completenessScore
    }

    // Prepare response data that matches what the modal expects
    const responseData = {
      uei: validatedData.uei,
      entityName: entityRegistration?.legalBusinessName || 'Unknown Company',
      dbaName: entityRegistration?.dbaName || null,
      cageCode: entityRegistration?.cageCode || null,
      registrationStatus: entityRegistration?.registrationStatus || 'Unknown',
      address: address,
      naicsCodes: naicsData || [],
      businessTypes: coreData?.businessTypes?.businessTypeList || [],
      certifications: repsAndCerts?.certifications || [],
      pointOfContact: primaryContact || {},
      registrationDates: {
        registrationDate: entityRegistration?.registrationDate,
        lastUpdateDate: entityRegistration?.lastUpdateDate,
        registrationExpirationDate: entityRegistration?.registrationExpirationDate
      },
      profileCompleteness: profile.profileCompleteness
    }

    const response: ApiResponse<any> = {
      success: true,
      data: responseData,
      message: 'Profile successfully imported from SAM.gov'
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('SAM.gov import error:', error)
    
    const response: ApiResponse<null> = {
      success: false,
      error: 'Internal server error',
      message: 'Failed to import data from SAM.gov. Please try again later.'
    }
    
    return NextResponse.json(response, { status: 500 })
  }
}

/**
 * Calculate profile completeness based on filled fields
 */
function calculateProfileCompleteness(profile: any): number {
  const basicFields = [
    'companyName',
    'addressLine1', 
    'city',
    'state',
    'zipCode',
    'uei',
    'cageCode'
  ]
  
  const contactFields = [
    'phone',
    'email'
  ]
  
  const businessFields = [
    'primaryNaics',
    'businessStartDate',
    'website'
  ]
  
  const filledBasicFields = basicFields.filter(field => {
    const value = profile[field]
    return value !== null && value !== undefined && value !== ''
  })
  
  const filledContactFields = contactFields.filter(field => {
    const value = profile[field]
    return value !== null && value !== undefined && value !== ''
  })
  
  const filledBusinessFields = businessFields.filter(field => {
    const value = profile[field]
    return value !== null && value !== undefined && value !== ''
  })
  
  // Base score for basic company info (40%)
  const basicScore = Math.round((filledBasicFields.length / basicFields.length) * 40)
  
  // Contact information score (15%)
  const contactScore = Math.round((filledContactFields.length / contactFields.length) * 15)
  
  // Business information score (15%)
  const businessScore = Math.round((filledBusinessFields.length / businessFields.length) * 15)
  
  // Add bonus for SAM.gov sync (15%)
  const samGovBonus = profile.samGovSyncedAt ? 15 : 0
  
  // Add bonus for secondary NAICS (10%)
  const secondaryNaicsBonus = (profile.secondaryNaics && profile.secondaryNaics.length > 0) ? 10 : 0
  
  // Add bonus for certifications (5%)
  const certificationsBonus = profile.samGovCertifications ? 5 : 0
  
  return Math.min(100, basicScore + contactScore + businessScore + samGovBonus + secondaryNaicsBonus + certificationsBonus)
}