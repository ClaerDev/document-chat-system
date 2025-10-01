/**
 * CSRF Token API Endpoint
 * 
 * GET /api/csrf - Generate and return CSRF token
 * 
 * This endpoint generates a new CSRF token, sets it as an HTTP-only cookie,
 * and returns it to the client for use in subsequent requests.
 */

import { NextRequest, NextResponse } from 'next/server';
import { generateCSRFToken, setCSRFCookie } from '@/lib/csrf';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { UsageTrackingService, UsageType } from '@/lib/usage-tracking';

/**
 * @swagger
 * /api/csrf:
 *   get:
 *     summary: Generate CSRF token
 *     description: Generates a new CSRF token for client-side use in form submissions and API requests
 *     tags:
 *       - Security
 *     responses:
 *       200:
 *         description: CSRF token generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                   description: Base64-encoded CSRF token
 *                   example: "eyJ0b2tlbiI6IjEyMzQ1Njc4OTBhYmNkZWYiLCJ0aW1lc3RhbXAiOjE2MjM0NTY3ODkwMDB9"
 *                 expiresAt:
 *                   type: string
 *                   format: date-time
 *                   description: Token expiration timestamp
 *                 usage:
 *                   type: object
 *                   properties:
 *                     instructions:
 *                       type: array
 *                       items:
 *                         type: string
 *                       description: Instructions for using the token
 *       429:
 *         $ref: '#/components/responses/RateLimitError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
export async function GET(request: NextRequest) {
  try {
    // Generate new CSRF token
    const token = generateCSRFToken();
    
    // Set token in HTTP-only cookie
    await setCSRFCookie(token);
    
    // Calculate expiration time (1 hour from now)
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    
    // Track usage if user is authenticated (async to not block CSRF generation)
    setImmediate(async () => {
      try {
        const { userId } = await auth();
        if (userId) {
          const user = await db.user.findUnique({
            where: { clerkId: userId },
            select: { organizationId: true }
          });
          
          if (user?.organizationId) {
            await UsageTrackingService.trackUsage({
              organizationId: user.organizationId,
              usageType: UsageType.API_CALL,
              quantity: 1,
              resourceType: 'csrf_token',
              metadata: {
                endpoint: '/api/csrf'
              }
            });
          }
        }
      } catch (error) {
        // Don't fail CSRF generation if usage tracking fails
        console.warn('Failed to track CSRF token generation:', error);
      }
    });
    
    return NextResponse.json({
      token,
      expiresAt,
      usage: {
        instructions: [
          'Include this token in the "x-csrf-token" header for all non-GET requests',
          'Token expires in 1 hour and must be refreshed',
          'Token is also automatically set as an HTTP-only cookie',
          'Use the useCSRF hook in React components for automatic handling'
        ]
      }
    });
    
  } catch (error) {
    console.error('Failed to generate CSRF token:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to generate CSRF token',
        details: process.env.NODE_ENV === 'development' 
          ? (error as Error).message 
          : undefined
      },
      { status: 500 }
    );
  }
}

/**
 * POST method not allowed - CSRF tokens should only be generated via GET
 */
export async function POST() {
  return NextResponse.json(
    { error: 'Method not allowed. Use GET to retrieve CSRF token.' },
    { status: 405 }
  );
}

/**
 * PUT/PATCH/DELETE methods not allowed
 */
export async function PUT() {
  return POST();
}

export async function PATCH() {
  return POST();
}

export async function DELETE() {
  return POST();
}