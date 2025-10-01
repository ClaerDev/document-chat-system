import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { randomBytes } from 'crypto'

const createShareSchema = z.object({
  expiresAt: z.string().datetime().optional()
    .describe("Optional expiration timestamp for the share link. If not provided, link does not expire."),
  
  password: z.string().optional()
    .describe("Optional password protection for the share link."),
  
  allowDownload: z.boolean().default(true)
    .describe("Whether to allow downloading the shared document. Default: true."),
  
  allowPreview: z.boolean().default(true)
    .describe("Whether to allow previewing the shared document. Default: true."),
  
  trackViews: z.boolean().default(true)
    .describe("Whether to track views of the shared document. Default: true.")
})

const updateShareSchema = z.object({
  isShared: z.boolean().optional()
    .describe("Enable or disable the share link."),
  
  expiresAt: z.string().datetime().optional()
    .describe("Updated expiration timestamp for the share link."),
  
  password: z.string().optional()
    .describe("Updated password protection for the share link."),
  
  allowDownload: z.boolean().optional()
    .describe("Updated download permission."),
  
  allowPreview: z.boolean().optional()
    .describe("Updated preview permission."),
  
  trackViews: z.boolean().optional()
    .describe("Updated view tracking setting.")
})

/**
 * @swagger
 * /api/v1/documents/{id}/share:
 *   get:
 *     summary: Get document share information
 *     description: Retrieve sharing configuration and analytics for a specific document
 *     tags:
 *       - Documents
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Document ID
 *         example: "doc_123abc"
 *     responses:
 *       200:
 *         description: Document share information retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 share:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     shareUrl:
 *                       type: string
 *                     shareToken:
 *                       type: string
 *                     isShared:
 *                       type: boolean
 *                     expiresAt:
 *                       type: string
 *                       format: date-time
 *                       nullable: true
 *                     allowDownload:
 *                       type: boolean
 *                     allowPreview:
 *                       type: boolean
 *                     trackViews:
 *                       type: boolean
 *                     viewCount:
 *                       type: number
 *                     lastViewedAt:
 *                       type: string
 *                       format: date-time
 *                       nullable: true
 *                     sharedBy:
 *                       type: string
 *                     sharedAt:
 *                       type: string
 *                       format: date-time
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied to document
 *       404:
 *         description: Document not found or not shared
 *       500:
 *         description: Internal server error
 *   post:
 *     summary: Create document share link
 *     description: Create a public share link for a document
 *     tags:
 *       - Documents
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Document ID
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               expiresAt:
 *                 type: string
 *                 format: date-time
 *                 description: Optional expiration timestamp
 *                 example: "2024-12-31T23:59:59Z"
 *               password:
 *                 type: string
 *                 description: Optional password protection
 *                 example: "secretpassword"
 *               allowDownload:
 *                 type: boolean
 *                 default: true
 *                 description: Allow downloading
 *               allowPreview:
 *                 type: boolean
 *                 default: true
 *                 description: Allow previewing
 *               trackViews:
 *                 type: boolean
 *                 default: true
 *                 description: Track view analytics
 *     responses:
 *       201:
 *         description: Share link created successfully
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       404:
 *         description: Document not found
 *       409:
 *         description: Share link already exists
 *       500:
 *         description: Internal server error
 *   patch:
 *     summary: Update document share settings
 *     description: Update sharing configuration for a document
 *     tags:
 *       - Documents
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Document ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               isShared:
 *                 type: boolean
 *                 description: Enable or disable sharing
 *               expiresAt:
 *                 type: string
 *                 format: date-time
 *                 description: Updated expiration timestamp
 *               password:
 *                 type: string
 *                 description: Updated password protection
 *               allowDownload:
 *                 type: boolean
 *                 description: Updated download permission
 *               allowPreview:
 *                 type: boolean
 *                 description: Updated preview permission
 *               trackViews:
 *                 type: boolean
 *                 description: Updated view tracking
 *     responses:
 *       200:
 *         description: Share settings updated successfully
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       404:
 *         description: Document or share not found
 *       500:
 *         description: Internal server error
 *   delete:
 *     summary: Delete document share link
 *     description: Remove the public share link for a document
 *     tags:
 *       - Documents
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Document ID
 *     responses:
 *       200:
 *         description: Share link deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       404:
 *         description: Document or share not found
 *       500:
 *         description: Internal server error
 */

function generateShareToken(): string {
  return randomBytes(32).toString('hex')
}

function generateShareUrl(token: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  return `${baseUrl}/shared/${token}`
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: documentId } = params

    // Get user's organization
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { id: true, organizationId: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Verify document exists and user has access
    const document = await prisma.document.findFirst({
      where: {
        id: documentId,
        organizationId: user.organizationId
      }
    })

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // Check if user has permission to view sharing (must have SHARE or be owner)
    const canViewSharing = document.uploadedById === user.id || 
      await prisma.documentPermission.findFirst({
        where: {
          documentId,
          userId: user.id,
          permission: 'SHARE'
        }
      })

    if (!canViewSharing) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Get share information
    const share = await prisma.documentShare.findUnique({
      where: { documentId },
      include: {
        sharedByUser: {
          select: {
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    })

    if (!share) {
      return NextResponse.json({ error: 'Document not shared' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      share: {
        id: share.id,
        shareUrl: share.shareUrl,
        shareToken: share.shareToken,
        isShared: share.isShared,
        expiresAt: share.expiresAt?.toISOString() || null,
        allowDownload: share.allowDownload,
        allowPreview: share.allowPreview,
        trackViews: share.trackViews,
        viewCount: share.viewCount,
        lastViewedAt: share.lastViewedAt?.toISOString() || null,
        sharedBy: share.sharedBy,
        sharedByName: `${share.sharedByUser.firstName || ''} ${share.sharedByUser.lastName || ''}`.trim() || share.sharedByUser.email,
        sharedAt: share.sharedAt.toISOString()
      }
    })

  } catch (error) {
    console.error('Error fetching document share:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: documentId } = params
    const body = await request.json().catch(() => ({}))
    const validation = createShareSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validation.error.format() },
        { status: 400 }
      )
    }

    const { expiresAt, password, allowDownload, allowPreview, trackViews } = validation.data

    // Get user's organization
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { id: true, organizationId: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Verify document exists and user has access
    const document = await prisma.document.findFirst({
      where: {
        id: documentId,
        organizationId: user.organizationId
      }
    })

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // Check if user has permission to create shares (must have SHARE or be owner)
    const canCreateShares = document.uploadedById === user.id || 
      await prisma.documentPermission.findFirst({
        where: {
          documentId,
          userId: user.id,
          permission: 'SHARE'
        }
      })

    if (!canCreateShares) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Check if share already exists
    const existingShare = await prisma.documentShare.findUnique({
      where: { documentId }
    })

    if (existingShare) {
      return NextResponse.json({ error: 'Share link already exists' }, { status: 409 })
    }

    // Generate share token and URL
    const shareToken = generateShareToken()
    const shareUrl = generateShareUrl(shareToken)

    // Create the share
    const newShare = await prisma.documentShare.create({
      data: {
        documentId,
        organizationId: user.organizationId,
        shareUrl,
        shareToken,
        isShared: true,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        password: password || null,
        allowDownload,
        allowPreview,
        trackViews,
        sharedBy: user.id
      }
    })

    return NextResponse.json({
      success: true,
      share: {
        id: newShare.id,
        shareUrl: newShare.shareUrl,
        shareToken: newShare.shareToken,
        isShared: newShare.isShared,
        expiresAt: newShare.expiresAt?.toISOString() || null,
        allowDownload: newShare.allowDownload,
        allowPreview: newShare.allowPreview,
        trackViews: newShare.trackViews,
        viewCount: newShare.viewCount,
        lastViewedAt: null,
        sharedBy: newShare.sharedBy,
        sharedAt: newShare.sharedAt.toISOString()
      }
    }, { status: 201 })

  } catch (error) {
    console.error('Error creating document share:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: documentId } = params
    const body = await request.json()
    const validation = updateShareSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validation.error.format() },
        { status: 400 }
      )
    }

    const updateData = validation.data

    // Get user's organization
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { id: true, organizationId: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Verify document exists and user has access
    const document = await prisma.document.findFirst({
      where: {
        id: documentId,
        organizationId: user.organizationId
      }
    })

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // Check if user has permission to update shares
    const canUpdateShares = document.uploadedById === user.id || 
      await prisma.documentPermission.findFirst({
        where: {
          documentId,
          userId: user.id,
          permission: 'SHARE'
        }
      })

    if (!canUpdateShares) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Update the share
    const updatedShare = await prisma.documentShare.update({
      where: { documentId },
      data: {
        ...updateData,
        expiresAt: updateData.expiresAt ? new Date(updateData.expiresAt) : undefined
      }
    })

    return NextResponse.json({
      success: true,
      share: {
        id: updatedShare.id,
        shareUrl: updatedShare.shareUrl,
        shareToken: updatedShare.shareToken,
        isShared: updatedShare.isShared,
        expiresAt: updatedShare.expiresAt?.toISOString() || null,
        allowDownload: updatedShare.allowDownload,
        allowPreview: updatedShare.allowPreview,
        trackViews: updatedShare.trackViews,
        viewCount: updatedShare.viewCount,
        lastViewedAt: updatedShare.lastViewedAt?.toISOString() || null,
        sharedBy: updatedShare.sharedBy,
        sharedAt: updatedShare.sharedAt.toISOString()
      }
    })

  } catch (error) {
    console.error('Error updating document share:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: documentId } = params

    // Get user's organization
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { id: true, organizationId: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Verify document exists and user has access
    const document = await prisma.document.findFirst({
      where: {
        id: documentId,
        organizationId: user.organizationId
      }
    })

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // Check if user has permission to delete shares
    const canDeleteShares = document.uploadedById === user.id || 
      await prisma.documentPermission.findFirst({
        where: {
          documentId,
          userId: user.id,
          permission: 'SHARE'
        }
      })

    if (!canDeleteShares) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Delete the share
    await prisma.documentShare.delete({
      where: { documentId }
    })

    return NextResponse.json({
      success: true,
      message: 'Share link deleted successfully'
    })

  } catch (error) {
    console.error('Error deleting document share:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}