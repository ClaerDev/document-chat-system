/**
 * @swagger
 * /api/v1/contacts/{id}/opportunities:
 *   get:
 *     summary: Get contact's linked opportunities
 *     description: Retrieve all opportunities associated with a specific contact
 *     tags: [Contacts, Opportunities]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Contact ID
 *     responses:
 *       200:
 *         description: Contact opportunities retrieved successfully
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
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       relationship:
 *                         type: string
 *                         enum: [POINT_OF_CONTACT, CONTRACTING_OFFICER, PROGRAM_MANAGER, TECHNICAL_LEAD]
 *                       isPrimary:
 *                         type: boolean
 *                       notes:
 *                         type: string
 *                       confidence:
 *                         type: number
 *                       opportunity:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           title:
 *                             type: string
 *                           solicitationNumber:
 *                             type: string
 *                           agency:
 *                             type: string
 *                           responseDeadline:
 *                             type: string
 *                             format: date-time
 *                           estimatedValue:
 *                             type: number
 *       404:
 *         description: Contact not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 *   post:
 *     summary: Link contact to opportunity
 *     description: Create a relationship between a contact and an opportunity
 *     tags: [Contacts, Opportunities]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Contact ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               opportunityId:
 *                 type: string
 *                 description: Opportunity ID to link to contact
 *               relationship:
 *                 type: string
 *                 enum: [POINT_OF_CONTACT, CONTRACTING_OFFICER, PROGRAM_MANAGER, TECHNICAL_LEAD]
 *                 default: POINT_OF_CONTACT
 *                 description: Type of relationship
 *               isPrimary:
 *                 type: boolean
 *                 default: false
 *                 description: Whether this is the primary contact for this opportunity
 *               notes:
 *                 type: string
 *                 description: Additional notes about the relationship
 *               confidence:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 1
 *                 default: 0.8
 *                 description: Confidence level in this relationship
 *             required:
 *               - opportunityId
 *     responses:
 *       201:
 *         description: Contact-opportunity relationship created successfully
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
 *                     id:
 *                       type: string
 *                     relationship:
 *                       type: string
 *                     isPrimary:
 *                       type: boolean
 *                     confidence:
 *                       type: number
 *                 message:
 *                   type: string
 *                   example: Contact linked to opportunity successfully
 *       400:
 *         description: Invalid request data
 *       404:
 *         description: Contact or opportunity not found
 *       409:
 *         description: Relationship already exists
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { handleApiError } from '@/lib/api-errors'
import { rateLimit } from '@/lib/rate-limit'
import { z } from 'zod'

const CreateContactOpportunitySchema = z.object({
  solicitationNumber: z.string().describe('Solicitation number to link to contact (primary identifier)'),
  opportunityId: z.string().optional().describe('Opportunity ID as fallback identifier'),
  opportunityTitle: z.string().optional().describe('Opportunity title for caching'),
  opportunityAgency: z.string().optional().describe('Opportunity agency for caching'),
  opportunityStatus: z.string().optional().describe('Opportunity status for caching'),
  estimatedValue: z.number().nullable().optional().describe('Estimated value of the opportunity for caching'),
  responseDeadline: z.string().optional().describe('Response deadline for caching (ISO date string)'),
  sourceSystem: z.string().optional().describe('Source system (MANUAL, SAM_GOV, etc.)'),
  sourceUrl: z.string().optional().describe('URL to external opportunity'),
  externalId: z.string().optional().describe('Original opportunity ID from external source'),
  relationship: z.enum(['POINT_OF_CONTACT', 'CONTRACTING_OFFICER', 'PROGRAM_MANAGER', 'TECHNICAL_LEAD'])
    .default('POINT_OF_CONTACT')
    .describe('Type of relationship between contact and opportunity'),
  isPrimary: z.boolean().default(false).describe('Whether this is the primary contact for this opportunity'),
  notes: z.string().optional().describe('Additional notes about the relationship'),
  confidence: z.number().min(0).max(1).default(0.8).describe('Confidence level in this relationship (0-1)')
})

// GET /api/v1/contacts/[id]/opportunities - Get contact's linked opportunities
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await auth()
    const userId = authResult?.userId
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Await params in Next.js 15
    const { id } = await params

    // Rate limiting
    const rateLimitResult = await rateLimit(request, { maxRequests: 50, windowMs: 60000 }, 'contacts:opportunities:read')
    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error: rateLimitResult.error || 'Rate limit exceeded',
          message: 'Too many requests. Please try again later.'
        },
        { status: 429 }
      )
    }

    // Get user's organization
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { organizationId: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Verify contact exists and belongs to organization
    const contact = await prisma.contact.findFirst({
      where: {
        id: id,
        organizationId: user.organizationId,
        deletedAt: null
      }
    })

    if (!contact) {
      return NextResponse.json({
        success: false,
        error: 'Contact not found'
      }, { status: 404 })
    }

    // Get contact's opportunities with cached metadata
    const contactOpportunities = await prisma.contactOpportunity.findMany({
      where: {
        contactId: id,
        organizationId: user.organizationId
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json({
      success: true,
      data: contactOpportunities
    })

  } catch (error) {
    console.error('Error fetching contact opportunities:', error)
    return handleApiError(error)
  }
}

// POST /api/v1/contacts/[id]/opportunities - Link contact to opportunity
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await auth()
    const userId = authResult?.userId
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Await params in Next.js 15
    const { id } = await params

    // Rate limiting
    const rateLimitResult = await rateLimit(request, { maxRequests: 20, windowMs: 60000 }, 'contacts:opportunities:create')
    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error: rateLimitResult.error || 'Rate limit exceeded',
          message: 'Too many requests. Please try again later.'
        },
        { status: 429 }
      )
    }

    // Get user's organization and ID
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { 
        id: true,
        organizationId: true 
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Verify contact exists and belongs to organization
    const contact = await prisma.contact.findFirst({
      where: {
        id: id,
        organizationId: user.organizationId,
        deletedAt: null
      }
    })

    if (!contact) {
      return NextResponse.json({
        success: false,
        error: 'Contact not found'
      }, { status: 404 })
    }

    // Parse and validate request body
    const body = await request.json()
    
    console.log('🔍 API Debug - Request body received:', JSON.stringify(body, null, 2))
    console.log('🔍 API Debug - opportunityId:', body.opportunityId)
    console.log('🔍 API Debug - CUID regex test:', /^c[^\s-]{8,}$/i.test(body.opportunityId || ''))
    
    let validatedData
    try {
      validatedData = CreateContactOpportunitySchema.parse(body)
      console.log('✅ Validation successful')
    } catch (validationError) {
      console.error('❌ Validation failed:', validationError.errors)
      throw validationError
    }

    // No need to verify opportunity exists in database since we're using solicitationNumber
    console.log('✅ Using solicitation number for contact-opportunity linking:', validatedData.solicitationNumber)

    // Check if relationship already exists
    const existingRelationship = await prisma.contactOpportunity.findUnique({
      where: {
        contactId_solicitationNumber: {
          contactId: id,
          solicitationNumber: validatedData.solicitationNumber
        }
      }
    })

    if (existingRelationship) {
      return NextResponse.json({
        success: false,
        error: 'Contact is already linked to this opportunity'
      }, { status: 409 })
    }

    // If this is set as primary, unset any existing primary relationships for this solicitation
    if (validatedData.isPrimary) {
      await prisma.contactOpportunity.updateMany({
        where: {
          solicitationNumber: validatedData.solicitationNumber,
          organizationId: user.organizationId,
          isPrimary: true
        },
        data: {
          isPrimary: false,
          updatedAt: new Date()
        }
      })
    }

    // Create the contact-opportunity relationship
    const contactOpportunity = await prisma.contactOpportunity.create({
      data: {
        contactId: id,
        solicitationNumber: validatedData.solicitationNumber,
        opportunityId: validatedData.opportunityId,
        organizationId: user.organizationId,
        opportunityTitle: validatedData.opportunityTitle,
        opportunityAgency: validatedData.opportunityAgency,
        opportunityStatus: validatedData.opportunityStatus,
        estimatedValue: validatedData.estimatedValue,
        responseDeadline: validatedData.responseDeadline ? new Date(validatedData.responseDeadline) : null,
        sourceSystem: validatedData.sourceSystem || 'MANUAL',
        sourceUrl: validatedData.sourceUrl,
        externalId: validatedData.externalId || validatedData.opportunityId,
        relationship: validatedData.relationship,
        isPrimary: validatedData.isPrimary,
        notes: validatedData.notes,
        confidence: validatedData.confidence,
        addedBy: user.id
      }
    })

    return NextResponse.json({
      success: true,
      data: contactOpportunity,
      message: `Contact linked to opportunity ${validatedData.solicitationNumber} successfully`
    }, { status: 201 })

  } catch (error) {
    console.error('Error creating contact-opportunity relationship:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Invalid request data',
        details: error.errors
      }, { status: 400 })
    }
    
    return handleApiError(error)
  }
}