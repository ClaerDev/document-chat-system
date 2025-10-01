/**
 * @swagger
 * /api/v1/contacts/{id}:
 *   get:
 *     summary: Get a specific contact
 *     description: Retrieve detailed information about a specific contact
 *     tags: [Contacts]
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
 *         description: Contact details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Contact'
 *       404:
 *         description: Contact not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 *   patch:
 *     summary: Update a contact
 *     description: Update an existing contact's information
 *     tags: [Contacts]
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
 *             $ref: '#/components/schemas/UpdateContact'
 *     responses:
 *       200:
 *         description: Contact updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Contact'
 *                 message:
 *                   type: string
 *                   example: Contact updated successfully
 *       400:
 *         description: Invalid contact data
 *       404:
 *         description: Contact not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 *   delete:
 *     summary: Delete a contact
 *     description: Soft delete a contact (marks as deleted but preserves data)
 *     tags: [Contacts]
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
 *         description: Contact deleted successfully
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
 *                   example: Contact deleted successfully
 *       404:
 *         description: Contact not found
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
import { UpdateContactSchema } from '@/types/contacts'
import { z } from 'zod'

// GET /api/v1/contacts/[id] - Get specific contact
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const authResult = await auth()
    const userId = authResult?.userId
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Rate limiting
    const rateLimitResult = await rateLimit(request, { maxRequests: 100, windowMs: 60000, message: 'Too many contact read requests' }, 'contacts:read')
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

    // Find the contact
    const contact = await prisma.contact.findFirst({
      where: {
        id: id,
        organizationId: user.organizationId,
        deletedAt: null
      },
      include: {
        createdBy: {
          select: {
            firstName: true,
            lastName: true,
            email: true
          }
        },
        updatedBy: {
          select: {
            firstName: true,
            lastName: true,
            email: true
          }
        },
        opportunities: {
          select: {
            id: true,
            solicitationNumber: true,
            opportunityId: true,
            opportunityTitle: true,
            opportunityAgency: true,
            opportunityStatus: true,
            estimatedValue: true,
            responseDeadline: true,
            sourceSystem: true,
            createdAt: true,
            updatedAt: true
          }
        },
        interactions: {
          orderBy: {
            createdAt: 'desc'
          },
          take: 10, // Latest 10 interactions
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true
              }
            }
          }
        },
        communications: {
          orderBy: {
            createdAt: 'desc'
          },
          take: 10, // Latest 10 communications
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true
              }
            }
          }
        }
      }
    })

    if (!contact) {
      return NextResponse.json({
        success: false,
        error: 'Contact not found'
      }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      data: contact
    })

  } catch (error) {
    console.error('Error fetching contact:', error)
    return handleApiError(error)
  }
}

// PATCH /api/v1/contacts/[id] - Update contact
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const authResult = await auth()
    const userId = authResult?.userId
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Rate limiting
    const rateLimitResult = await rateLimit(request, { maxRequests: 20, windowMs: 60000, message: 'Too many contact update requests' }, 'contacts:update')
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

    // Check if contact exists and belongs to user's organization
    const existingContact = await prisma.contact.findFirst({
      where: {
        id: id,
        organizationId: user.organizationId,
        deletedAt: null
      }
    })

    if (!existingContact) {
      return NextResponse.json({
        success: false,
        error: 'Contact not found'
      }, { status: 404 })
    }

    // Parse and validate request body
    let body
    try {
      body = await request.json()
      console.log('PATCH /api/v1/contacts/[id] - Request body:', JSON.stringify(body, null, 2))
    } catch (error) {
      console.error('PATCH /api/v1/contacts/[id] - JSON parsing error:', error)
      return NextResponse.json({
        success: false,
        error: 'Invalid JSON in request body'
      }, { status: 400 })
    }
    
    const dataToValidate = {
      ...body,
      updatedById: user.id
    }
    console.log('PATCH /api/v1/contacts/[id] - Data to validate:', JSON.stringify(dataToValidate, null, 2))
    
    const validatedData = UpdateContactSchema.parse(dataToValidate)

    // Check for duplicate email if email is being updated
    if (validatedData.email && validatedData.email !== existingContact.email) {
      const duplicateContact = await prisma.contact.findFirst({
        where: {
          organizationId: user.organizationId,
          email: validatedData.email,
          deletedAt: null,
          NOT: {
            id: id
          }
        }
      })

      if (duplicateContact) {
        return NextResponse.json({
          success: false,
          error: 'A contact with this email address already exists'
        }, { status: 409 })
      }
    }

    // Prepare update data - be explicit about what fields to update
    const updateData = {
      firstName: validatedData.firstName,
      lastName: validatedData.lastName,
      email: validatedData.email,
      phone: validatedData.phone,
      title: validatedData.title,
      alternateEmail: validatedData.alternateEmail,
      alternatePhone: validatedData.alternatePhone,
      profilePhoto: validatedData.profilePhoto,
      agencyInfo: validatedData.agencyInfo,
      addressInfo: validatedData.addressInfo,
      professionalInfo: validatedData.professionalInfo,
      contactPreferences: validatedData.contactPreferences,
      professionalBackground: validatedData.professionalBackground,
      socialNetworks: validatedData.socialNetworks,
      aiEnhancements: validatedData.aiEnhancements,
      activityTracking: validatedData.activityTracking,
      notesAndTags: validatedData.notesAndTags,
      source: validatedData.source,
      sourceUrl: validatedData.sourceUrl,
      sourceDocument: validatedData.sourceDocument,
      verified: validatedData.verified,
      verifiedAt: validatedData.verifiedAt,
      verifiedBy: validatedData.verifiedBy,
      updatedById: user.id,
      updatedAt: new Date()
    }

    // Remove undefined values to avoid Prisma issues
    const cleanedUpdateData = Object.fromEntries(
      Object.entries(updateData).filter(([_, v]) => v !== undefined)
    )

    // Update the contact
    const updatedContact = await prisma.contact.update({
      where: { id: id },
      data: cleanedUpdateData,
      include: {
        createdBy: {
          select: {
            firstName: true,
            lastName: true,
            email: true
          }
        },
        updatedBy: {
          select: {
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: updatedContact,
      message: 'Contact updated successfully'
    })

  } catch (error) {
    console.error('Error updating contact:', error)
    
    if (error instanceof z.ZodError) {
      console.error('PATCH /api/v1/contacts/[id] - Zod validation error:', error.errors)
      return NextResponse.json({
        success: false,
        error: 'Invalid contact data',
        details: error.errors
      }, { status: 400 })
    }
    
    const errorResponse = handleApiError(error)
    if (!errorResponse) {
      return NextResponse.json({
        success: false,
        error: 'An unexpected error occurred'
      }, { status: 500 })
    }
    
    return errorResponse
  }
}

// DELETE /api/v1/contacts/[id] - Soft delete contact
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const authResult = await auth()
    const userId = authResult?.userId
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Rate limiting
    const rateLimitResult = await rateLimit(request, { maxRequests: 10, windowMs: 60000, message: 'Too many contact delete requests' }, 'contacts:delete')
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

    // Check if contact exists and belongs to user's organization
    const existingContact = await prisma.contact.findFirst({
      where: {
        id: id,
        organizationId: user.organizationId,
        deletedAt: null
      }
    })

    if (!existingContact) {
      return NextResponse.json({
        success: false,
        error: 'Contact not found'
      }, { status: 404 })
    }

    // Soft delete the contact
    await prisma.contact.update({
      where: { id: id },
      data: {
        deletedAt: new Date(),
        updatedAt: new Date()
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Contact deleted successfully'
    })

  } catch (error) {
    console.error('Error deleting contact:', error)
    return handleApiError(error)
  }
}