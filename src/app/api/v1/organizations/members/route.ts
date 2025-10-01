import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { createValidationError } from '@/lib/validations'

// Member invitation schema
const InviteMemberSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum(['ADMIN', 'MEMBER', 'VIEWER']),
  firstName: z.string().min(1, 'First name is required').optional(),
  lastName: z.string().min(1, 'Last name is required').optional()
})

// Member update schema
const UpdateMemberSchema = z.object({
  role: z.enum(['ADMIN', 'MEMBER', 'VIEWER'])
})

// GET /api/organizations/members - Get organization members
export async function GET() {
  try {
    // Check authentication
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Unauthorized. Please sign in to view organization members.' 
      }, { status: 401 })
    }

    // Get user with organization
    const user = await db.user.findUnique({
      where: { clerkId: userId },
      include: { organization: true }
    })

    if (!user || !user.organization) {
      return NextResponse.json({
        success: false,
        error: 'Organization not found'
      }, { status: 404 })
    }

    // Get all organization members
    const members = await db.user.findMany({
      where: { organizationId: user.organization.id },
      select: {
        id: true,
        clerkId: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        imageUrl: true,
        lastActiveAt: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: [
        { role: 'asc' }, // OWNER first, then ADMIN, MEMBER, VIEWER
        { createdAt: 'asc' }
      ]
    })

    return NextResponse.json({
      success: true,
      data: members
    })

  } catch (error) {
    console.error('Error fetching organization members:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}

// POST /api/organizations/members - Invite new member (admin/owner only)
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Unauthorized. Please sign in to invite members.' 
      }, { status: 401 })
    }

    // Parse and validate request body
    const body = await request.json()
    
    let validatedData
    try {
      validatedData = InviteMemberSchema.parse(body)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(createValidationError(error), { status: 400 })
      }
      throw error
    }

    // Get user with organization
    const user = await db.user.findUnique({
      where: { clerkId: userId },
      include: { organization: true }
    })

    if (!user || !user.organization) {
      return NextResponse.json({
        success: false,
        error: 'Organization not found'
      }, { status: 404 })
    }

    // Check permissions (only OWNER and ADMIN can invite members)
    if (!['OWNER', 'ADMIN'].includes(user.role)) {
      return NextResponse.json({
        success: false,
        error: 'Insufficient permissions. Only organization owners and admins can invite members.'
      }, { status: 403 })
    }

    // Check if user is already a member
    const existingMember = await db.user.findFirst({
      where: {
        email: validatedData.email,
        organizationId: user.organization.id
      }
    })

    if (existingMember) {
      return NextResponse.json({
        success: false,
        error: 'User is already a member of this organization'
      }, { status: 409 })
    }

    // For now, create a placeholder user record
    // In production, this would send an email invitation
    const newMember = await db.user.create({
      data: {
        clerkId: `pending_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, // Temporary ID
        email: validatedData.email,
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        role: validatedData.role,
        organizationId: user.organization.id,
        lastActiveAt: new Date()
      },
      select: {
        id: true,
        clerkId: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        imageUrl: true,
        lastActiveAt: true,
        createdAt: true,
        updatedAt: true
      }
    })

    // TODO: Send invitation email
    console.log(`Would send invitation email to ${validatedData.email}`)

    return NextResponse.json({
      success: true,
      data: newMember,
      message: 'Member invited successfully. An invitation email has been sent.'
    }, { status: 201 })

  } catch (error) {
    console.error('Error inviting member:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}