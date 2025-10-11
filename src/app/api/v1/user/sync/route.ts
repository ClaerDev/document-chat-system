import { NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'
import { db } from '@/lib/db'

export async function POST() {
  try {
    console.log('User sync: Starting request')
    const { userId } = await auth()
    console.log('User sync: userId =', userId)
    
    if (!userId) {
      console.log('User sync: No userId, returning 401')
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user already exists
    console.log('User sync: Checking if user exists')
    const existingUser = await db.user.findUnique({
      where: { clerkId: userId },
      include: { organization: true }
    })

    if (existingUser) {
      console.log('User sync: User already exists')

      // **FIX**: Check if user has an organization, create one if missing
      if (!existingUser.organizationId || !existingUser.organization) {
        console.log('User sync: User missing organization, creating one...')

        // Get user data from Clerk for organization name
        const clerkUser = await currentUser()
        if (!clerkUser) {
          console.log('User sync: No Clerk user found')
          return NextResponse.json({ success: false, error: 'Clerk user not found' }, { status: 404 })
        }

        // Create organization
        const organization = await db.organization.create({
          data: {
            name: `${clerkUser.firstName || 'User'} ${clerkUser.lastName || 'Organization'}`,
            slug: `org-${userId.slice(0, 8)}`,
          }
        })
        console.log('User sync: Created organization with id =', organization.id)

        // Update user with organization
        const updatedUser = await db.user.update({
          where: { clerkId: userId },
          data: { organizationId: organization.id },
          include: { organization: true }
        })
        console.log('User sync: Updated user with organization')

        return NextResponse.json({
          success: true,
          data: updatedUser,
          message: 'User updated with new organization'
        })
      }

      return NextResponse.json({
        success: true,
        data: existingUser,
        message: 'User already exists'
      })
    }

    // Get user data from Clerk
    console.log('User sync: Getting Clerk user data')
    const clerkUser = await currentUser()
    
    if (!clerkUser) {
      console.log('User sync: No Clerk user found')
      return NextResponse.json({ success: false, error: 'Clerk user not found' }, { status: 404 })
    }

    console.log('User sync: Creating organization')
    // Create organization first
    const organization = await db.organization.create({
      data: {
        name: `${clerkUser.firstName || 'User'} ${clerkUser.lastName || 'Organization'}`,
        slug: `org-${userId.slice(0, 8)}`,
      }
    })
    console.log('User sync: Created organization with id =', organization.id)

    console.log('User sync: Creating user')
    // Create user
    const user = await db.user.create({
      data: {
        clerkId: userId,
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
    console.log('User sync: Created user with id =', user.id)

    return NextResponse.json({
      success: true,
      data: user,
      message: 'User created successfully'
    })

  } catch (error) {
    console.error('Error syncing user:', error)
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}