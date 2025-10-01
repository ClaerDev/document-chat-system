/**
 * @swagger
 * /api/v1/vectors/indexes:
 *   get:
 *     summary: Get vector index statistics
 *     description: Returns comprehensive statistics for both Pinecone and pgvector indexes
 *     tags: [Vectors]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Vector index statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 stats:
 *                   type: object
 *                   properties:
 *                     pinecone:
 *                       type: object
 *                       properties:
 *                         totalVectors:
 *                           type: number
 *                         organizations:
 *                           type: number
 *                         documents:
 *                           type: number
 *                         orphanedVectors:
 *                           type: number
 *                         health:
 *                           type: string
 *                           enum: [healthy, warning, critical]
 *                     pgvector:
 *                       type: object
 *                       properties:
 *                         totalVectors:
 *                           type: number
 *                         organizations:
 *                           type: number
 *                         documents:
 *                           type: number
 *                         orphanedVectors:
 *                           type: number
 *                         storageSize:
 *                           type: string
 *                         health:
 *                           type: string
 *                           enum: [healthy, warning, critical]
 *                     combined:
 *                       type: object
 *                       properties:
 *                         totalVectors:
 *                           type: number
 *                         organizations:
 *                           type: number
 *                         documents:
 *                           type: number
 *                         orphanedVectors:
 *                           type: number
 *                         health:
 *                           type: string
 *                           enum: [healthy, warning, critical]
 *                 processingTimeMs:
 *                   type: number
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { defaultVectorIndexManager } from '@/lib/ai/services/vector-index-manager'

export async function GET(request: NextRequest) {
  try {
    const startTime = Date.now()
    
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    console.log('📊 [API] Getting vector index statistics...')

    // Get comprehensive index statistics
    const stats = await defaultVectorIndexManager.getIndexStats()

    const response = {
      success: true,
      stats,
      processingTimeMs: Date.now() - startTime,
    }

    console.log('✅ [API] Index statistics retrieved:', {
      combinedVectors: stats.combined.totalVectors,
      combinedHealth: stats.combined.health,
    })

    return NextResponse.json(response)
  } catch (error) {
    console.error('❌ [API] Vector index statistics error:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to get vector index statistics',
        details: process.env.NODE_ENV === 'development' ? error instanceof Error ? error.message : 'Unknown error' : undefined
      },
      { status: 500 }
    )
  }
}

/**
 * @swagger
 * /api/v1/vectors/indexes:
 *   post:
 *     summary: Perform index management operations
 *     description: Cleanup orphaned vectors or optimize indexes
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
 *               - operation
 *             properties:
 *               operation:
 *                 type: string
 *                 enum: [cleanup, optimize, stats]
 *                 description: Operation to perform on indexes
 *     responses:
 *       200:
 *         description: Operation completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 operation:
 *                   type: string
 *                 result:
 *                   type: object
 *                 processingTimeMs:
 *                   type: number
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */

export async function POST(request: NextRequest) {
  try {
    const startTime = Date.now()
    
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { operation } = body

    if (!operation || !['cleanup', 'optimize', 'stats'].includes(operation)) {
      return NextResponse.json(
        { error: 'Invalid operation. Must be cleanup, optimize, or stats' },
        { status: 400 }
      )
    }

    console.log(`🔧 [API] Vector index operation requested: ${operation}`)

    let result: any

    switch (operation) {
      case 'cleanup':
        result = await defaultVectorIndexManager.cleanupOrphanedVectors()
        console.log(`✅ [API] Cleanup completed: ${result.combined.orphanedVectorsRemoved} vectors removed`)
        break
      
      case 'optimize':
        result = await defaultVectorIndexManager.optimizeIndexes()
        console.log(`✅ [API] Optimization completed: ${result.combined.indexesOptimized} indexes optimized`)
        break
      
      case 'stats':
        result = await defaultVectorIndexManager.getIndexStats()
        console.log(`✅ [API] Stats retrieved: ${result.combined.totalVectors} total vectors`)
        break
    }

    return NextResponse.json({
      success: true,
      operation,
      result,
      processingTimeMs: Date.now() - startTime,
    })
  } catch (error) {
    console.error('❌ [API] Vector index operation error:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to perform vector index operation',
        details: process.env.NODE_ENV === 'development' ? error instanceof Error ? error.message : 'Unknown error' : undefined
      },
      { status: 500 }
    )
  }
}