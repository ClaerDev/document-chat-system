/**
 * @swagger
 * /api/v1/vectors/health:
 *   get:
 *     summary: Check vector search services health
 *     description: Returns health status and statistics for Pinecone and pgvector services
 *     tags: [Vectors]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Vector services health status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 services:
 *                   type: object
 *                   properties:
 *                     pinecone:
 *                       type: object
 *                       properties:
 *                         available:
 *                           type: boolean
 *                         error:
 *                           type: string
 *                         stats:
 *                           type: object
 *                     pgvector:
 *                       type: object
 *                       properties:
 *                         available:
 *                           type: boolean
 *                         error:
 *                           type: string
 *                         stats:
 *                           type: object
 *                     fallbackEnabled:
 *                       type: boolean
 *                     primaryService:
 *                       type: string
 *                     fallbackService:
 *                       type: string
 *                 processingTimeMs:
 *                   type: number
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { defaultVectorSearch } from '@/lib/ai/services/vector-search'

export async function GET(_request: NextRequest) {
  try {
    const startTime = Date.now()
    
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    console.log('🔍 [API] Checking vector search services health...')

    // Get health status of all vector services
    const healthStatus = await defaultVectorSearch.checkServiceHealth()
    const serviceInfo = defaultVectorSearch.getServiceInfo()

    const response = {
      success: true,
      services: {
        ...healthStatus,
        ...serviceInfo,
      },
      processingTimeMs: Date.now() - startTime,
    }

    console.log('✅ [API] Vector search health check completed:', {
      pineconeAvailable: healthStatus.pinecone.available,
      pgvectorAvailable: healthStatus.pgvector.available,
      fallbackEnabled: healthStatus.fallbackEnabled,
    })

    return NextResponse.json(response)
  } catch (error) {
    console.error('❌ [API] Vector search health check error:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to check vector search health',
        details: process.env.NODE_ENV === 'development' ? error instanceof Error ? error.message : 'Unknown error' : undefined
      },
      { status: 500 }
    )
  }
}

/**
 * @swagger
 * /api/v1/vectors/health:
 *   post:
 *     summary: Force vector search fallback mode
 *     description: Enable or disable pgvector fallback for testing
 *     tags: [Vectors]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - action
 *             properties:
 *               action:
 *                 type: string
 *                 enum: [enable_fallback, disable_fallback, test_fallback]
 *                 description: Action to perform on fallback system
 *     responses:
 *       200:
 *         description: Fallback mode updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 fallbackEnabled:
 *                   type: boolean
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { action } = body

    if (!action || !['enable_fallback', 'disable_fallback', 'test_fallback'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be enable_fallback, disable_fallback, or test_fallback' },
        { status: 400 }
      )
    }

    console.log(`🔧 [API] Vector search action requested: ${action}`)

    let message = ''
    let fallbackEnabled = false

    switch (action) {
      case 'enable_fallback':
        await defaultVectorSearch.forceFallbackMode(true)
        fallbackEnabled = true
        message = 'pgvector fallback enabled'
        break
      
      case 'disable_fallback':
        await defaultVectorSearch.forceFallbackMode(false)
        fallbackEnabled = false
        message = 'pgvector fallback disabled'
        break
      
      case 'test_fallback':
        // Perform a test search to validate fallback functionality
        const testResult = await defaultVectorSearch.checkServiceHealth()
        message = `Fallback test completed. Pinecone: ${testResult.pinecone.available ? 'healthy' : 'unhealthy'}, pgvector: ${testResult.pgvector.available ? 'healthy' : 'unhealthy'}`
        fallbackEnabled = testResult.fallbackEnabled
        break
    }

    return NextResponse.json({
      success: true,
      message,
      fallbackEnabled,
    })
  } catch (error) {
    console.error('❌ [API] Vector search action error:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to perform vector search action',
        details: process.env.NODE_ENV === 'development' ? error instanceof Error ? error.message : 'Unknown error' : undefined
      },
      { status: 500 }
    )
  }
}