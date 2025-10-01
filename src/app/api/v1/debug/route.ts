import { NextRequest, NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    // Test database connection
    const dbTest = await db.$queryRaw`SELECT 1 as test`
    
    // Test Clerk auth
    const clerkAuth = await auth()
    const clerkUserData = clerkAuth.userId ? await currentUser() : null
    
    // Test user lookup
    let dbUser = null
    if (clerkAuth.userId) {
      dbUser = await db.user.findUnique({
        where: { clerkId: clerkAuth.userId },
        include: { organization: true }
      })
    }

    return NextResponse.json({
      success: true,
      debug: {
        database: {
          connected: !!dbTest,
          testQuery: dbTest
        },
        clerk: {
          authenticated: !!clerkAuth.userId,
          userId: clerkAuth.userId,
          userEmail: clerkUserData?.emailAddresses[0]?.emailAddress,
          firstName: clerkUserData?.firstName,
          lastName: clerkUserData?.lastName
        },
        database_user: {
          exists: !!dbUser,
          hasOrganization: !!dbUser?.organization,
          userId: dbUser?.id,
          organizationId: dbUser?.organizationId,
          organizationName: dbUser?.organization?.name
        }
      }
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 })
  }
}