import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'

const createPermissionSchema = z.object({
  userId: z.string().min(1)
    .describe("User ID to grant permission to. Must be a valid user within the organization."),
  
  permission: z.enum(['READ', 'WRITE', 'DELETE', 'SHARE', 'COMMENT'])
    .describe("Type of permission to grant: 'READ' allows viewing, 'WRITE' allows editing, 'DELETE' allows deletion, 'SHARE' allows sharing, 'COMMENT' allows adding comments."),
  
  expiresAt: z.string().datetime().optional()
    .describe("Optional expiration timestamp for the permission. If not provided, permission does not expire.")
})

/**
 * @swagger
 * /api/v1/documents/{id}/permissions:
 *   get:
 *     summary: Get document permissions
 *     description: Retrieve all permissions for a specific document from the sharing JSON field
 *     tags:
 *       - Document Sharing
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
 *         description: Document permissions retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 permissions:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         example: "perm_123"
 *                       userId:
 *                         type: string
 *                         example: "user_456"
 *                       userName:
 *                         type: string
 *                         example: "John Doe"
 *                       userEmail:
 *                         type: string
 *                         example: "john@example.com"
 *                       permission:
 *                         type: string
 *                         enum: [READ, WRITE, DELETE, SHARE, COMMENT]
 *                         example: "READ"
 *                       grantedBy:
 *                         type: string
 *                         example: "user_789"
 *                       grantedAt:
 *                         type: string
 *                         format: date-time
 *                       expiresAt:
 *                         type: string
 *                         format: date-time
 *                         nullable: true
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied to document
 *       404:
 *         description: Document not found
 *       500:
 *         description: Internal server error
 *   post:
 *     summary: Grant document permission
 *     description: Grant a permission to a user for a specific document
 *     tags:
 *       - Document Sharing
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
 *             required:
 *               - userId
 *               - permission
 *             properties:
 *               userId:
 *                 type: string
 *                 description: User ID to grant permission to
 *                 example: "user_456def"
 *               permission:
 *                 type: string
 *                 enum: [READ, WRITE, DELETE, SHARE, COMMENT]
 *                 description: Type of permission to grant
 *                 example: "READ"
 *               expiresAt:
 *                 type: string
 *                 format: date-time
 *                 description: Optional expiration timestamp
 *                 example: "2024-12-31T23:59:59Z"
 *     responses:
 *       201:
 *         description: Permission granted successfully
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       404:
 *         description: Document or user not found
 *       409:
 *         description: Permission already exists
 *       500:
 *         description: Internal server error
 *   delete:
 *     summary: Remove document permission
 *     description: Remove a specific permission from a document
 *     tags:
 *       - Document Sharing
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Document ID
 *       - name: permissionId
 *         in: query
 *         required: true
 *         schema:
 *           type: string
 *         description: Permission ID to remove
 *     responses:
 *       200:
 *         description: Permission removed successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied
 *       404:
 *         description: Document or permission not found
 *       500:
 *         description: Internal server error
 */

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = await params
    const documentId = resolvedParams.id

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
      },
      select: {
        id: true,
        uploadedById: true,
        sharing: true
      }
    })

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // Check if user has permission to view permissions (must have SHARE or be owner)
    const sharing = (document.sharing as any) || { permissions: [], share: null, shareViews: [], comments: [] }
    const canViewPermissions = document.uploadedById === user.id || 
      sharing.permissions?.some((p: any) => 
        p.userId === user.id && p.permission === 'SHARE' && 
        (!p.expiresAt || new Date(p.expiresAt) > new Date())
      )

    if (!canViewPermissions) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Get user details for each permission
    const userIds = sharing.permissions?.map((p: any) => p.userId) || []
    const users = await prisma.user.findMany({
      where: { 
        id: { in: userIds },
        organizationId: user.organizationId
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true
      }
    })

    const userMap = new Map(users.map(u => [u.id, u]))

    const formattedPermissions = sharing.permissions?.map((perm: any) => {
      const permUser = userMap.get(perm.userId)
      return {
        id: perm.id,
        userId: perm.userId,
        userName: permUser ? 
          `${permUser.firstName || ''} ${permUser.lastName || ''}`.trim() || permUser.email :
          'Unknown User',
        userEmail: permUser?.email || 'unknown@example.com',
        permission: perm.permission,
        grantedBy: perm.grantedBy,
        grantedAt: perm.grantedAt,
        expiresAt: perm.expiresAt || null
      }
    }) || []

    return NextResponse.json({
      success: true,
      permissions: formattedPermissions
    })

  } catch (error) {
    console.error('Error fetching document permissions:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = await params
    const documentId = resolvedParams.id
    const body = await request.json()
    const validation = createPermissionSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validation.error.format() },
        { status: 400 }
      )
    }

    const { userId: targetUserId, permission, expiresAt } = validation.data

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
      },
      select: {
        id: true,
        uploadedById: true,
        sharing: true
      }
    })

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // Check if user has permission to grant permissions (must have SHARE or be owner)
    const sharing = (document.sharing as any) || { permissions: [], share: null, shareViews: [], comments: [] }
    const canGrantPermissions = document.uploadedById === user.id || 
      sharing.permissions?.some((p: any) => 
        p.userId === user.id && p.permission === 'SHARE' && 
        (!p.expiresAt || new Date(p.expiresAt) > new Date())
      )

    if (!canGrantPermissions) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Verify target user exists and is in same organization
    const targetUser = await prisma.user.findFirst({
      where: {
        id: targetUserId,
        organizationId: user.organizationId
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true
      }
    })

    if (!targetUser) {
      return NextResponse.json({ error: 'Target user not found' }, { status: 404 })
    }

    // Check if permission already exists
    const existingPermission = sharing.permissions?.find((p: any) => 
      p.userId === targetUserId && p.permission === permission
    )

    if (existingPermission) {
      return NextResponse.json({ error: 'Permission already exists' }, { status: 409 })
    }

    // Create new permission
    const newPermission = {
      id: `perm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: targetUserId,
      permission,
      grantedBy: user.id,
      grantedAt: new Date().toISOString(),
      expiresAt: expiresAt || null
    }

    // Update sharing with new permission
    const updatedSharing = {
      ...sharing,
      permissions: [...(sharing.permissions || []), newPermission]
    }

    await prisma.document.update({
      where: { id: documentId },
      data: { 
        sharing: updatedSharing,
        updatedAt: new Date()
      }
    })

    return NextResponse.json({
      success: true,
      permission: {
        id: newPermission.id,
        userId: newPermission.userId,
        userName: `${targetUser.firstName || ''} ${targetUser.lastName || ''}`.trim() || targetUser.email,
        userEmail: targetUser.email,
        permission: newPermission.permission,
        grantedBy: newPermission.grantedBy,
        grantedAt: newPermission.grantedAt,
        expiresAt: newPermission.expiresAt
      }
    }, { status: 201 })

  } catch (error) {
    console.error('Error creating document permission:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = await params
    const documentId = resolvedParams.id
    const url = new URL(request.url)
    const permissionId = url.searchParams.get('permissionId')

    if (!permissionId) {
      return NextResponse.json({ error: 'Permission ID required' }, { status: 400 })
    }

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
      },
      select: {
        id: true,
        uploadedById: true,
        sharing: true
      }
    })

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    const sharing = (document.sharing as any) || { permissions: [], share: null, shareViews: [], comments: [] }

    // Check if user has permission to remove permissions (must have SHARE or be owner)
    const canRemovePermissions = document.uploadedById === user.id || 
      sharing.permissions?.some((p: any) => 
        p.userId === user.id && p.permission === 'SHARE' && 
        (!p.expiresAt || new Date(p.expiresAt) > new Date())
      )

    if (!canRemovePermissions) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Find and remove the permission
    const permissionIndex = sharing.permissions?.findIndex((p: any) => p.id === permissionId)
    
    if (permissionIndex === -1) {
      return NextResponse.json({ error: 'Permission not found' }, { status: 404 })
    }

    // Remove permission from array
    const updatedPermissions = sharing.permissions.filter((p: any) => p.id !== permissionId)
    const updatedSharing = {
      ...sharing,
      permissions: updatedPermissions
    }

    await prisma.document.update({
      where: { id: documentId },
      data: { 
        sharing: updatedSharing,
        updatedAt: new Date()
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Permission removed successfully'
    })

  } catch (error) {
    console.error('Error removing document permission:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}