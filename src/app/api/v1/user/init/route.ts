import { NextRequest, NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'
import { db } from '@/lib/db'

/**
 * Initialize user and organization in database
 * This endpoint creates the user and organization if they don't exist
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Check if user already exists
    let user = await db.user.findUnique({
      where: { clerkId: userId },
      include: { organization: true }
    })

    if (user && user.organization) {
      return NextResponse.json({
        success: true,
        message: 'User already initialized',
        data: {
          userId: user.id,
          organizationId: user.organizationId,
          organizationName: user.organization.name
        }
      })
    }

    // Get user data from Clerk
    const clerkUser = await currentUser()
    if (!clerkUser) {
      return NextResponse.json(
        { success: false, error: 'User not found in Clerk' },
        { status: 404 }
      )
    }

    // Create organization if user doesn't have one
    let organization = user?.organization
    if (!organization) {
      organization = await db.organization.create({
        data: {
          name: `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}'s Organization`.trim() || 'My Organization',
          slug: `org-${clerkUser.id.slice(0, 8)}`,
        }
      })
    }

    // Create or update user
    if (!user) {
      user = await db.user.create({
        data: {
          clerkId: clerkUser.id,
          email: clerkUser.emailAddresses[0]?.emailAddress || '',
          firstName: clerkUser.firstName,
          lastName: clerkUser.lastName,
          imageUrl: clerkUser.imageUrl,
          organizationId: organization.id,
          role: 'OWNER',
          lastActiveAt: new Date(),
        },
        include: { organization: true }
      })
    } else if (!user.organizationId) {
      user = await db.user.update({
        where: { id: user.id },
        data: { organizationId: organization.id },
        include: { organization: true }
      })
    }

    return NextResponse.json({
      success: true,
      message: 'User initialized successfully',
      data: {
        userId: user.id,
        organizationId: user.organizationId,
        organizationName: user.organization?.name
      }
    })

  } catch (error) {
    console.error('User initialization error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to initialize user',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}