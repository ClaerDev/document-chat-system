/**
 * @swagger
 * /api/user:
 *   get:
 *     tags: [Users]
 *     summary: Get current user information
 *     description: |
 *       Retrieve the authenticated user's account information including profile details,
 *       organization membership, and role information.
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: User information retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required: [success, data]
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   
 *   patch:
 *     tags: [Users]
 *     summary: Update user account information
 *     description: |
 *       Update the authenticated user's account information such as name,
 *       timezone preferences, and email notification settings.
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *                 minLength: 1
 *                 description: User's first name
 *                 example: "John"
 *               lastName:
 *                 type: string
 *                 minLength: 1
 *                 description: User's last name
 *                 example: "Doe"
 *               timezone:
 *                 type: string
 *                 description: User's preferred timezone
 *                 example: "America/New_York"
 *               emailOptIn:
 *                 type: boolean
 *                 description: Whether user wants to receive email notifications
 *                 example: true
 *           examples:
 *             name_update:
 *               summary: Update name
 *               value:
 *                 firstName: "John"
 *                 lastName: "Doe"
 *             preferences_update:
 *               summary: Update preferences
 *               value:
 *                 timezone: "America/Los_Angeles"
 *                 emailOptIn: false
 *     responses:
 *       200:
 *         description: User updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required: [success, data]
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/User'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { UserUpdateSchema } from '@/lib/validations'
import { handleApiError, asyncHandler, commonErrors } from '@/lib/api-errors'
import { withRateLimit, rateLimitConfigs } from '@/lib/rate-limit'
import { cacheManager } from '@/lib/cache'
import { UsageTrackingService, UsageType } from '@/lib/usage-tracking'

// Extract user data fetching logic for caching
async function fetchUserData(userId: string) {
  // Get user from Clerk
  const clerkUser = await currentUser()
  
  if (!clerkUser) {
    throw commonErrors.notFound('User session')
  }

  // Get user from local database
  const dbUser = await db.user.findUnique({
    where: { clerkId: userId },
    include: { 
      organization: {
        select: {
          id: true,
          name: true,
          slug: true
        }
      }
    }
  })

  // Combine Clerk and database user data
  const userData = {
    id: clerkUser.id,
    email: clerkUser.emailAddresses[0]?.emailAddress,
    firstName: clerkUser.firstName,
    lastName: clerkUser.lastName,
    imageUrl: clerkUser.imageUrl,
    createdAt: clerkUser.createdAt,
    lastSignInAt: clerkUser.lastSignInAt,
    
    // Database user data
    dbId: dbUser?.id,
    role: dbUser?.role,
    organization: dbUser?.organization,
    timezone: dbUser?.timezone,
    emailOptIn: dbUser?.emailOptIn,
    lastActiveAt: dbUser?.lastActiveAt
  }

  return {
    success: true,
    data: userData,
    organizationId: dbUser?.organizationId
  }
}

// GET /api/user - Get current user information
export const GET = asyncHandler(async () => {
  // Check authentication
  const { userId } = await auth()
  
  if (!userId) {
    throw commonErrors.unauthorized()
  }

  // Use cache with 1-hour TTL and smart invalidation
  const result = await cacheManager.withCache(
    `user:${userId}:preferences`,
    () => fetchUserData(userId),
    {
      ttl: 3600, // 1 hour
      userId,
      prefix: 'user:'
    }
  )

  // Track this API call (only for cache misses to avoid double-counting)
  if (!result.cached && result.data.organizationId) {
    try {
      await UsageTrackingService.trackUsage({
        organizationId: result.data.organizationId,
        usageType: UsageType.API_CALL,
        quantity: 1,
        resourceType: 'user',
        metadata: {
          endpoint: '/api/user',
          cached: result.cached
        }
      });
    } catch (trackingError) {
      console.warn('Failed to track user API usage:', trackingError);
      // Don't fail the request if tracking fails
    }
  }

  return NextResponse.json({
    success: result.data.success,
    data: result.data.data
  })
})

// PATCH /api/user - Update user information
export const PATCH = asyncHandler(async (request: NextRequest) => {
  // Check authentication
  const { userId } = await auth()
  
  if (!userId) {
    throw commonErrors.unauthorized()
  }

  // Parse and validate request body
  const body = await request.json()
  const validatedData = UserUpdateSchema.parse(body)

    // Check if user exists in database
    let dbUser = await db.user.findUnique({
      where: { clerkId: userId }
    })

    if (!dbUser) {
      // Create user if doesn't exist (shouldn't happen in normal flow)
      const clerkUser = await currentUser()
      if (!clerkUser) {
        throw commonErrors.notFound('User session')
      }

      // Create organization first if needed
      const organization = await db.organization.create({
        data: {
          name: `${clerkUser.firstName || 'User'} ${clerkUser.lastName || 'Organization'}`,
          slug: `org-${userId.slice(0, 8)}`,
        }
      })

      dbUser = await db.user.create({
        data: {
          clerkId: userId,
          email: clerkUser.emailAddresses[0]?.emailAddress || '',
          firstName: clerkUser.firstName,
          lastName: clerkUser.lastName,
          imageUrl: clerkUser.imageUrl,
          organizationId: organization.id,
          role: 'OWNER',
          lastActiveAt: new Date(),
          ...validatedData
        }
      })
    } else {
      // Update existing user
      dbUser = await db.user.update({
        where: { clerkId: userId },
        data: {
          ...validatedData,
          lastActiveAt: new Date()
        }
      })
    }

    // Update Clerk user if firstName/lastName changed
    if (validatedData.firstName || validatedData.lastName) {
      // Note: In production, you might want to update Clerk user data too
      // This requires the Clerk Backend API
      console.log('Note: Clerk user update would happen here in production')
    }

    // Clear user preferences cache since user data changed
    try {
      await cacheManager.invalidate(`user:${userId}:preferences`)
      console.log('Cleared user preferences cache due to user update')
    } catch (cacheError) {
      console.warn('Failed to clear user preferences cache after user update:', cacheError)
      // Don't fail the request if cache clearing fails
    }

    return NextResponse.json({
      success: true,
      data: {
        id: dbUser.id,
        clerkId: dbUser.clerkId,
        email: dbUser.email,
        firstName: dbUser.firstName,
        lastName: dbUser.lastName,
        timezone: dbUser.timezone,
        emailOptIn: dbUser.emailOptIn,
        role: dbUser.role,
        lastActiveAt: dbUser.lastActiveAt,
        updatedAt: dbUser.updatedAt
      }
    })
})