import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { rateLimit } from '@/lib/rate-limit'

// Mock SAM.gov validation endpoint
// In a real implementation, this would call the actual SAM.gov API
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

    // Rate limiting
    const rateLimitResult = await rateLimit(
      `sam-validate:${userId}`,
      5, // 5 requests
      60 * 1000 // per minute
    )

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { success: false, error: 'Too many validation attempts. Please try again later.' },
        { status: 429 }
      )
    }

    const { uei } = await request.json()

    if (!uei || typeof uei !== 'string') {
      return NextResponse.json(
        { success: false, error: 'UEI number is required' },
        { status: 400 }
      )
    }

    // Validate UEI format (12 characters, alphanumeric)
    const ueiRegex = /^[A-Z0-9]{12}$/
    if (!ueiRegex.test(uei)) {
      return NextResponse.json(
        { success: false, error: 'Invalid UEI format. UEI must be 12 alphanumeric characters.' },
        { status: 400 }
      )
    }

    // Simulate SAM.gov API call
    // In production, this would call the actual SAM.gov Entity Management API
    const mockSAMData = await validateUEIWithSAM(uei)

    if (mockSAMData.isValid) {
      return NextResponse.json({
        success: true,
        data: mockSAMData
      })
    } else {
      return NextResponse.json({
        success: false,
        data: mockSAMData
      })
    }
  } catch (error) {
    console.error('SAM validation error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to validate UEI with SAM.gov' },
      { status: 500 }
    )
  }
}

// Mock function to simulate SAM.gov API validation
// In production, this would make actual API calls to SAM.gov
async function validateUEIWithSAM(uei: string) {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1000))

  // Mock validation logic - in production this would call SAM.gov API
  if (uei === 'TESTGOV123456') {
    return {
      isValid: true,
      entity: {
        entityName: 'Test Government Contractor LLC',
        ueiSAM: uei,
        registrationStatus: 'ACTIVE',
        registrationDate: '2023-01-15',
        expirationDate: '2024-01-15',
        addressLine1: '123 Contractor Way',
        city: 'Arlington',
        stateOrProvince: 'VA',
        zipCode: '22201',
        cageCode: 'ABC12',
        entityType: 'LIMITED LIABILITY COMPANY',
        businessTypes: [
          'Small Business',
          'Woman-Owned Small Business (WOSB)',
          'Service-Disabled Veteran-Owned Small Business'
        ],
        naicsCodes: [
          { naicsCode: '541511', isPrimary: true },
          { naicsCode: '541512', isPrimary: false },
          { naicsCode: '541519', isPrimary: false }
        ]
      }
    }
  } else if (uei === 'DEMOGOV789012') {
    return {
      isValid: true,
      entity: {
        entityName: 'Demo Systems Integration Corp',
        ueiSAM: uei,
        registrationStatus: 'ACTIVE',
        registrationDate: '2022-06-01',
        expirationDate: '2025-06-01',
        addressLine1: '456 Technology Drive',
        city: 'Reston',
        stateOrProvince: 'VA',
        zipCode: '20190',
        cageCode: 'DEF34',
        entityType: 'CORPORATION',
        businessTypes: [
          'Small Business',
          '8(a) Program Participant',
          'Minority-Owned Business'
        ],
        naicsCodes: [
          { naicsCode: '541330', isPrimary: true },
          { naicsCode: '541511', isPrimary: false },
          { naicsCode: '541690', isPrimary: false },
          { naicsCode: '561210', isPrimary: false }
        ]
      }
    }
  } else {
    // For any other UEI, return validation failure
    return {
      isValid: false,
      error: 'UEI not found in SAM.gov database or registration is not active. Please verify the UEI number and ensure your entity is registered and active in SAM.gov.'
    }
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}