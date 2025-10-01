import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json(
        {
          error: 'No userId from auth',
          auth: { userId: null },
        },
        { status: 401 }
      )
    }

    // Get user with organization
    const user = await db.user.findUnique({
      where: { clerkId: userId },
      include: { organization: true },
    })

    return NextResponse.json({
      debug: {
        clerkUserId: userId,
        userFound: !!user,
        userData: user
          ? {
              id: user.id,
              clerkId: user.clerkId,
              email: user.email,
              organizationId: user.organizationId,
              organization: user.organization
                ? {
                    id: user.organization.id,
                    name: user.organization.name,
                    slug: user.organization.slug,
                  }
                : null,
            }
          : null,
      },
    })
  } catch (error) {
    console.error('Debug endpoint error:', error)
    return NextResponse.json(
      {
        error: 'Debug endpoint failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
