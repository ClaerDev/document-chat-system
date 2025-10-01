/**
 * @swagger
 * /api/v1/contacts/{id}/opportunities/{opportunityId}:
 *   patch:
 *     summary: Update contact-opportunity relationship
 *     description: Update the relationship between a contact and an opportunity
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
 *       - in: path
 *         name: opportunityId
 *         required: true
 *         schema:
 *           type: string
 *         description: Opportunity ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               relationship:
 *                 type: string
 *                 enum: [POINT_OF_CONTACT, CONTRACTING_OFFICER, PROGRAM_MANAGER, TECHNICAL_LEAD]
 *                 description: Type of relationship
 *               isPrimary:
 *                 type: boolean
 *                 description: Whether this is the primary contact for this opportunity
 *               notes:
 *                 type: string
 *                 description: Additional notes about the relationship
 *               confidence:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 1
 *                 description: Confidence level in this relationship
 *     responses:
 *       200:
 *         description: Relationship updated successfully
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
 *                   example: Contact-opportunity relationship updated successfully
 *       400:
 *         description: Invalid request data
 *       404:
 *         description: Relationship not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 *   delete:
 *     summary: Remove contact-opportunity relationship
 *     description: Remove the relationship between a contact and an opportunity
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
 *       - in: path
 *         name: opportunityId
 *         required: true
 *         schema:
 *           type: string
 *         description: Opportunity ID
 *     responses:
 *       200:
 *         description: Relationship removed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Contact-opportunity relationship removed successfully
 *       404:
 *         description: Relationship not found
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

const UpdateContactOpportunitySchema = z.object({
  relationship: z.enum(['POINT_OF_CONTACT', 'CONTRACTING_OFFICER', 'PROGRAM_MANAGER', 'TECHNICAL_LEAD'])
    .optional()
    .describe('Type of relationship between contact and opportunity'),
  isPrimary: z.boolean().optional().describe('Whether this is the primary contact for this opportunity'),
  notes: z.string().optional().describe('Additional notes about the relationship'),
  confidence: z.number().min(0).max(1).optional().describe('Confidence level in this relationship (0-1)')
})

// PATCH /api/v1/contacts/[id]/opportunities/[opportunityId] - Update contact-opportunity relationship
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; opportunityId: string }> }
) {
  try {
    console.log('🔍 PATCH endpoint START')
    
    const { userId } = await auth()
    console.log('🔍 PATCH Auth result - userId:', userId)
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Await params in Next.js 15
    const { id, opportunityId } = await params
    console.log('🔍 PATCH endpoint called with params:', { id, opportunityId })

    // Rate limiting
    const rateLimitResult = await rateLimit(request, { maxRequests: 20, windowMs: 60000 }, 'contacts:opportunities:update')
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
    console.log('🔍 PATCH Debug - Looking up user for clerkId:', userId)
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { organizationId: true }
    })
    console.log('🔍 PATCH Debug - Found user:', user)

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Find the existing relationship
    console.log('🔍 PATCH Debug - Searching for relationship:', {
      contactId: id,
      opportunityId: opportunityId,
      organizationId: user.organizationId
    })
    const existingRelationship = await prisma.contactOpportunity.findFirst({
      where: {
        contactId: id,
        opportunityId: opportunityId,
        organizationId: user.organizationId
      }
    })
    console.log('🔍 PATCH Debug - Found relationship:', existingRelationship)

    if (!existingRelationship) {
      return NextResponse.json({
        success: false,
        error: 'Contact-opportunity relationship not found'
      }, { status: 404 })
    }

    // Parse and validate request body
    const body = await request.json()
    const validatedData = UpdateContactOpportunitySchema.parse(body)

    // If isPrimary is being set to true, unset any existing primary relationships for this opportunity
    if (validatedData.isPrimary === true) {
      await prisma.contactOpportunity.updateMany({
        where: {
          opportunityId: opportunityId,
          organizationId: user.organizationId,
          isPrimary: true,
          NOT: {
            id: existingRelationship.id
          }
        },
        data: {
          isPrimary: false,
          updatedAt: new Date()
        }
      })
    }

    // Update the relationship
    const updatedRelationship = await prisma.contactOpportunity.update({
      where: { id: existingRelationship.id },
      data: {
        ...validatedData,
        updatedAt: new Date()
      }
    })

    return NextResponse.json({
      success: true,
      data: updatedRelationship,
      message: 'Contact-opportunity relationship updated successfully'
    })

  } catch (error) {
    console.error('🔍 PATCH Error updating contact-opportunity relationship:', error)
    console.error('🔍 PATCH Error stack:', error instanceof Error ? error.stack : error)
    
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

// DELETE /api/v1/contacts/[id]/opportunities/[opportunityId] - Remove contact-opportunity relationship
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; opportunityId: string }> }
) {
  try {
    const { userId } = await auth()
    console.log('🔍 Auth result - userId:', userId)
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Await params in Next.js 15
    const { id, opportunityId } = await params
    console.log('🔍 DELETE endpoint called with params:', { id, opportunityId })

    // Rate limiting
    const rateLimitResult = await rateLimit(request, { maxRequests: 10, windowMs: 60000 }, 'contacts:opportunities:delete')
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

    console.log('🔍 DELETE Debug - Searching for relationship:', {
      contactId: id,
      opportunityId: opportunityId,
      organizationId: user.organizationId
    })

    // Find the existing relationship
    const existingRelationship = await prisma.contactOpportunity.findFirst({
      where: {
        contactId: id,
        opportunityId: opportunityId,
        organizationId: user.organizationId
      }
    })

    console.log('🔍 DELETE Debug - Found relationship:', existingRelationship)

    if (!existingRelationship) {
      // Try to find by solicitationNumber as fallback
      const relationships = await prisma.contactOpportunity.findMany({
        where: {
          contactId: id,
          organizationId: user.organizationId
        }
      })
      
      console.log('🔍 DELETE Debug - All relationships for contact:', relationships)
      
      return NextResponse.json({
        success: false,
        error: 'Contact-opportunity relationship not found'
      }, { status: 404 })
    }

    console.log('🔍 DELETE Debug - Deleting relationship with ID:', existingRelationship.id)

    // Delete the relationship
    await prisma.contactOpportunity.delete({
      where: { id: existingRelationship.id }
    })

    console.log('🔍 DELETE Debug - Successfully deleted relationship')

    return NextResponse.json({
      success: true,
      message: 'Contact-opportunity relationship removed successfully'
    })

  } catch (error) {
    console.error('Error removing contact-opportunity relationship:', error)
    
    // Ensure we always return a valid JSON response
    return NextResponse.json({
      success: false,
      error: 'Failed to remove contact-opportunity relationship',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}