/**
 * @swagger
 * /api/opportunities/{id}:
 *   get:
 *     tags: [Opportunities]
 *     summary: Get opportunity details by ID
 *     description: |
 *       Retrieve detailed information about a specific government contracting opportunity
 *       by its unique identifier. Returns comprehensive opportunity data including
 *       description, requirements, deadlines, and contact information.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Unique opportunity identifier
 *         example: "1"
 *     responses:
 *       200:
 *         description: Opportunity details retrieved successfully
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
 *                   $ref: '#/components/schemas/Opportunity'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { z } from 'zod'

// Mock opportunities data (same as opportunities-mock)
const mockOpportunities: Record<string, any> = {
  '1': {
    id: '1',
    externalId: 'W91CRB-24-R-0001',
    title: 'IT Support Services for Defense Installation',
    description: 'The U.S. Army Corps of Engineers seeks qualified contractors to provide comprehensive IT support services including help desk, network administration, cybersecurity monitoring, and software maintenance for a major defense installation. Services must comply with NIST cybersecurity framework and support 24/7 operations.',
    agency: 'U.S. Army Corps of Engineers',
    agencyCode: 'USACE',
    solicitationNumber: 'W91CRB-24-R-0001',
    type: 'SOLICITATION',
    setAsideType: 'Small Business',
    postedDate: new Date('2024-06-15T08:00:00Z'),
    deadline: new Date('2024-07-30T17:00:00Z'),
    contractValue: 2500000,
    contractValueMin: 2000000,
    contractValueMax: 3000000,
    naicsCodes: ['541511', '541512'],
    pscCodes: ['D302', 'D316'],
    location: 'Fort Belvoir, VA',
    state: 'VA',
    sourceData: {
      sourceSystem: 'SAM.gov',
      sourceId: 'SAM-123456',
      sourceUrl: 'https://sam.gov/opp/W91CRB-24-R-0001'
    },
    createdAt: new Date('2024-06-15T08:00:00Z'),
    updatedAt: new Date('2024-06-16T10:30:00Z')
  },
  '2': {
    id: '2',
    externalId: 'GSA-24-CLOUD-001',
    title: 'Cloud Infrastructure Migration and Management',
    description: 'GSA requires a comprehensive cloud migration strategy and ongoing management services for multiple federal agencies. This includes assessment of current infrastructure, migration planning, implementation of cloud-native solutions, and 24/7 managed services. Must have FedRAMP certification and experience with AWS, Azure, and Google Cloud platforms.',
    agency: 'General Services Administration',
    agencyCode: 'GSA',
    solicitationNumber: 'GSA-24-CLOUD-001',
    type: 'RFP',
    setAsideType: 'WOSB',
    postedDate: new Date('2024-06-10T14:30:00Z'),
    deadline: new Date('2024-08-15T16:00:00Z'),
    contractValue: 15000000,
    contractValueMin: 12000000,
    contractValueMax: 18000000,
    naicsCodes: ['541511', '518210'],
    pscCodes: ['D302', 'D399'],
    location: 'Washington, DC',
    state: 'DC',
    sourceData: {
      sourceSystem: 'SAM.gov',
      sourceId: 'SAM-789012',
      sourceUrl: 'https://sam.gov/opp/GSA-24-CLOUD-001'
    },
    createdAt: new Date('2024-06-10T14:30:00Z'),
    updatedAt: new Date('2024-06-12T09:15:00Z')
  },
  '3': {
    id: '3',
    externalId: 'VA-24-HEALTH-IT-003',
    title: 'Electronic Health Records Integration Services',
    description: 'Department of Veterans Affairs seeks contractors for EHR integration services to connect legacy systems with modern healthcare platforms. Project involves data migration, API development, interoperability testing, and staff training. Must comply with HIPAA, HITECH, and VA security requirements.',
    agency: 'Department of Veterans Affairs',
    agencyCode: 'VA',
    solicitationNumber: 'VA-24-HEALTH-IT-003',
    type: 'RFI',
    setAsideType: 'SDVOSB',
    postedDate: new Date('2024-06-20T10:00:00Z'),
    deadline: new Date('2024-07-25T23:59:00Z'),
    contractValue: 8500000,
    contractValueMin: 7000000,
    contractValueMax: 10000000,
    naicsCodes: ['541511', '541618'],
    pscCodes: ['D302', 'R408'],
    location: 'Multiple Locations',
    state: 'Nationwide',
    sourceData: {
      sourceSystem: 'SAM.gov',
      sourceId: 'SAM-345678',
      sourceUrl: 'https://sam.gov/opp/VA-24-HEALTH-IT-003'
    },
    createdAt: new Date('2024-06-20T10:00:00Z'),
    updatedAt: new Date('2024-06-21T14:20:00Z')
  },
  '4': {
    id: '4',
    externalId: 'NASA-24-SPACE-DATA-007',
    title: 'Satellite Data Processing and Analytics Platform',
    description: 'NASA Goddard Space Flight Center requires development of advanced satellite data processing capabilities including real-time analytics, machine learning algorithms for pattern recognition, and cloud-based storage solutions. Platform must handle petabyte-scale datasets and provide APIs for research community access.',
    agency: 'National Aeronautics and Space Administration',
    agencyCode: 'NASA',
    solicitationNumber: 'NASA-24-SPACE-DATA-007',
    type: 'SOLICITATION',
    postedDate: new Date('2024-06-12T09:30:00Z'),
    deadline: new Date('2024-08-20T18:00:00Z'),
    contractValue: 12000000,
    contractValueMin: 10000000,
    contractValueMax: 15000000,
    naicsCodes: ['541511', '541712'],
    pscCodes: ['D302', 'D317'],
    location: 'Greenbelt, MD',
    state: 'MD',
    sourceData: {
      sourceSystem: 'SAM.gov',
      sourceId: 'SAM-901234',
      sourceUrl: 'https://sam.gov/opp/NASA-24-SPACE-DATA-007'
    },
    createdAt: new Date('2024-06-12T09:30:00Z'),
    updatedAt: new Date('2024-06-14T11:45:00Z')
  },
  '5': {
    id: '5',
    externalId: 'DHS-24-CYBER-SEC-015',
    title: 'Cybersecurity Monitoring and Incident Response',
    description: 'Department of Homeland Security seeks comprehensive cybersecurity services including 24/7 security operations center (SOC) monitoring, threat hunting, incident response, and vulnerability assessments for critical infrastructure. Must have Top Secret clearance and experience with NIST Cybersecurity Framework.',
    agency: 'Department of Homeland Security',
    agencyCode: 'DHS',
    solicitationNumber: 'DHS-24-CYBER-SEC-015',
    type: 'RFP',
    setAsideType: 'HUBZone',
    postedDate: new Date('2024-06-18T13:15:00Z'),
    deadline: new Date('2024-08-05T17:00:00Z'),
    contractValue: 25000000,
    contractValueMin: 20000000,
    contractValueMax: 30000000,
    naicsCodes: ['541511', '561621'],
    pscCodes: ['D302', 'D320'],
    location: 'Washington, DC Metro Area',
    state: 'DC',
    sourceData: {
      sourceSystem: 'SAM.gov',
      sourceId: 'SAM-567890',
      sourceUrl: 'https://sam.gov/opp/DHS-24-CYBER-SEC-015'
    },
    createdAt: new Date('2024-06-18T13:15:00Z'),
    updatedAt: new Date('2024-06-19T16:00:00Z')
  }
}

// Route parameter validation
const ParamsSchema = z.object({
  id: z.string().min(1, 'Opportunity ID is required')
})

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Unauthorized. Please sign in to view opportunity details.' 
      }, { status: 401 })
    }

    // Validate route parameters
    let validatedParams
    try {
      validatedParams = ParamsSchema.parse(params)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json({
          success: false,
          error: 'Invalid opportunity ID',
          details: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        }, { status: 400 })
      }
      throw error
    }

    // Find opportunity in mock data
    const opportunity = mockOpportunities[validatedParams.id]
    
    if (!opportunity) {
      return NextResponse.json({
        success: false,
        error: 'Opportunity not found',
        message: `No opportunity found with ID: ${validatedParams.id}`
      }, { status: 404 })
    }

    // Return opportunity details
    return NextResponse.json({
      success: true,
      data: opportunity
    })

  } catch (error) {
    console.error('Error fetching opportunity details:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}