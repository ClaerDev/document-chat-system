/**
 * @swagger
 * /api/v1/opportunities/{id}/contacts:
 *   get:
 *     summary: Get opportunity's linked contacts
 *     description: Retrieve all contacts associated with a specific opportunity
 *     tags: [Opportunities, Contacts]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Opportunity ID
 *     responses:
 *       200:
 *         description: Opportunity contacts retrieved successfully
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
 *                       contact:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           firstName:
 *                             type: string
 *                           lastName:
 *                             type: string
 *                           email:
 *                             type: string
 *                           phone:
 *                             type: string
 *                           title:
 *                             type: string
 *                           organizationInfo:
 *                             type: object
 *                           professionalInfo:
 *                             type: object
 *       404:
 *         description: Opportunity not found
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

// GET /api/v1/opportunities/[id]/contacts - Get opportunity's linked contacts
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Rate limiting
    const rateLimitResponse = await rateLimit(request, 'opportunities:contacts:read', 50, 60000)
    if (rateLimitResponse) return rateLimitResponse

    // Get user's organization
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { organizationId: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Verify opportunity exists and belongs to organization
    const opportunity = await prisma.opportunity.findFirst({
      where: {
        id: params.id,
        organizationId: user.organizationId
      }
    })

    if (!opportunity) {
      return NextResponse.json({
        success: false,
        error: 'Opportunity not found'
      }, { status: 404 })
    }

    // Get opportunity's contacts with full contact details
    const opportunityContacts = await prisma.contactOpportunity.findMany({
      where: {
        opportunityId: params.id,
        organizationId: user.organizationId
      },
      include: {
        contact: {
          where: {
            deletedAt: null // Only include non-deleted contacts
          },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            title: true,
            alternateEmail: true,
            alternatePhone: true,
            organizationInfo: true,
            professionalInfo: true,
            addressInfo: true,
            contactPreferences: true,
            verified: true,
            source: true,
            createdAt: true,
            updatedAt: true
          }
        }
      },
      orderBy: [
        { isPrimary: 'desc' }, // Primary contacts first
        { createdAt: 'desc' }
      ]
    })

    // Filter out relationships where contact was deleted
    const validOpportunityContacts = opportunityContacts.filter(oc => oc.contact !== null)

    return NextResponse.json({
      success: true,
      data: validOpportunityContacts
    })

  } catch (error) {
    console.error('Error fetching opportunity contacts:', error)
    return handleApiError(error)
  }
}