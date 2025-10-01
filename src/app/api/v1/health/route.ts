import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * @swagger
 * /api/v1/health:
 *   get:
 *     tags: [Health]
 *     summary: Basic health check
 *     description: Simple health check endpoint for monitoring service availability
 *     responses:
 *       200:
 *         description: Service is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   enum: [healthy]
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 uptime:
 *                   type: number
 *                   description: Process uptime in seconds
 *   head:
 *     tags: [Health]
 *     summary: Basic health check (HEAD)
 *     description: Simple health check endpoint for monitoring service availability (HEAD request)
 *     responses:
 *       200:
 *         description: Service is healthy
 */

interface HealthStatus {
  status: 'healthy'
  timestamp: string
  uptime: number
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const healthStatus: HealthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    }

    return NextResponse.json(healthStatus, { 
      status: 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Health-Check': 'basic'
      }
    })
  } catch (error) {
    return NextResponse.json(
      { 
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Health check failed'
      },
      { status: 500 }
    )
  }
}

export async function HEAD(request: NextRequest): Promise<NextResponse> {
  try {
    return new NextResponse(null, { 
      status: 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Health-Check': 'basic'
      }
    })
  } catch (error) {
    return new NextResponse(null, { status: 500 })
  }
}