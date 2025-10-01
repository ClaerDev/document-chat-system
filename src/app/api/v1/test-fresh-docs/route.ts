/**
 * Test endpoint to verify API documentation is updating in development
 * 
 * This endpoint was created to test if new endpoints appear in the API docs
 * in development mode without caching issues.
 */

import { NextResponse } from 'next/server'

/**
 * @swagger
 * /api/test-fresh-docs:
 *   get:
 *     summary: Test endpoint for fresh API documentation
 *     description: This endpoint was created to verify that new endpoints appear in API docs immediately during development
 *     tags: [Testing]
 *     security: []
 *     responses:
 *       200:
 *         description: Success response with timestamp
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Fresh docs test endpoint working"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   example: "2024-01-07T12:00:00.000Z"
 *                 environment:
 *                   type: string
 *                   example: "development"
 */
export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'Fresh docs test endpoint working! If you can see this in the API docs, then caching is disabled correctly.',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    note: 'This endpoint can be deleted after testing'
  })
}