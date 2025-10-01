/**
 * @swagger
 * /api/v1/contacts/bulk-delete:
 *   post:
 *     summary: Bulk delete contacts
 *     description: Soft delete multiple contacts at once
 *     tags: [Contacts]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               contactIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of contact IDs to delete
 *                 maxItems: 50
 *             required:
 *               - contactIds
 *     responses:
 *       200:
 *         description: Contacts deleted successfully
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
 *                   example: 5 contacts deleted successfully
 *                 deletedCount:
 *                   type: integer
 *                   example: 5
 *       400:
 *         description: Invalid request data
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

const BulkDeleteSchema = z.object({
  contactIds: z.array(z.string())
    .min(1, 'At least one contact ID is required')
    .max(50, 'Cannot delete more than 50 contacts at once')
    .describe('Array of contact IDs to delete')
})

// POST /api/v1/contacts/bulk-delete - Bulk delete contacts
export async function POST(request: NextRequest) {
  try {
    const authResult = await auth()
    const userId = authResult?.userId
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Rate limiting
    const rateLimitResult = await rateLimit(request, { maxRequests: 5, windowMs: 60000 }, 'contacts:bulk-delete')
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

    // Parse and validate request body
    const body = await request.json()
    const { contactIds } = BulkDeleteSchema.parse(body)

    // Verify all contacts exist and belong to user's organization
    const existingContacts = await prisma.contact.findMany({
      where: {
        id: { in: contactIds },
        organizationId: user.organizationId,
        deletedAt: null
      },
      select: { id: true }
    })

    const existingContactIds = existingContacts.map(c => c.id)
    const notFoundIds = contactIds.filter(id => !existingContactIds.includes(id))

    if (notFoundIds.length > 0) {
      return NextResponse.json({
        success: false,
        error: `Contacts not found: ${notFoundIds.join(', ')}`
      }, { status: 404 })
    }

    // Perform bulk soft delete
    const result = await prisma.contact.updateMany({
      where: {
        id: { in: contactIds },
        organizationId: user.organizationId,
        deletedAt: null
      },
      data: {
        deletedAt: new Date(),
        updatedAt: new Date()
      }
    })

    return NextResponse.json({
      success: true,
      message: `${result.count} contacts deleted successfully`,
      deletedCount: result.count
    })

  } catch (error) {
    console.error('Error bulk deleting contacts:', error)
    
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