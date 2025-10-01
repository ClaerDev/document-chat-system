import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    // Get counts of main entities
    const userCount = await db.user.count()
    const orgCount = await db.organization.count()
    const profileCount = await db.profile.count()
    
    // Get the most recent profile if any exist
    const latestProfile = await db.profile.findFirst({
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        companyName: true,
        organizationId: true,
        certifications: true,
        createdAt: true,
        updatedAt: true
      }
    })
    
    // Get the most recent user
    const latestUser = await db.user.findFirst({
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        clerkId: true,
        email: true,
        organizationId: true
      }
    })
    
    return NextResponse.json({
      success: true,
      counts: {
        users: userCount,
        organizations: orgCount,
        profiles: profileCount
      },
      latestProfile,
      latestUser,
      timestamp: new Date().toISOString(),
      message: profileCount === 0 ? 'No profiles exist - will be created on first GET /api/v1/profile' : 'Profiles exist'
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Database query failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}