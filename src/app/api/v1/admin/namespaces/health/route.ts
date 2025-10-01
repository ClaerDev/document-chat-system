/**
 * Namespace Health Check API
 *
 * Provides health check endpoints for Pinecone namespace management
 * and multi-tenant vector storage systems.
 *
 * @swagger
 * tags:
 *   - name: Admin - Namespace Health
 *     description: Namespace management health check endpoints
 */

import { NextRequest, NextResponse } from 'next/server'
import { defaultNamespaceManager } from '@/lib/ai/services/pinecone-namespace-manager'
import { defaultVectorSearch } from '@/lib/ai/services/vector-search'
import { getAuth } from '@clerk/nextjs/server'

/**
 * @swagger
 * /api/v1/admin/namespaces/health:
 *   get:
 *     summary: Check namespace management system health
 *     description: Perform comprehensive health check of namespace management and vector services
 *     tags: [Admin - Namespace Health]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Health check completed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 status:
 *                   type: string
 *                   enum: [healthy, degraded, unhealthy]
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 services:
 *                   type: object
 *                   properties:
 *                     namespaceManager:
 *                       type: object
 *                       properties:
 *                         status:
 *                           type: string
 *                         pineconeConnected:
 *                           type: boolean
 *                         databaseConnected:
 *                           type: boolean
 *                         cacheSize:
 *                           type: integer
 *                         errors:
 *                           type: array
 *                           items:
 *                             type: string
 *                     vectorSearch:
 *                       type: object
 *                       properties:
 *                         pinecone:
 *                           type: object
 *                           properties:
 *                             available:
 *                               type: boolean
 *                             error:
 *                               type: string
 *                             stats:
 *                               type: object
 *                         pgvector:
 *                           type: object
 *                           properties:
 *                             available:
 *                               type: boolean
 *                             error:
 *                               type: string
 *                             stats:
 *                               type: object
 *                         fallbackEnabled:
 *                           type: boolean
 *                 summary:
 *                   type: object
 *                   properties:
 *                     totalErrors:
 *                       type: integer
 *                     criticalIssues:
 *                       type: array
 *                       items:
 *                         type: string
 *                     recommendations:
 *                       type: array
 *                       items:
 *                         type: string
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Health check failed
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    // Check authentication (basic check, can be made more strict)
    const { userId } = getAuth(request)
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    console.log('🏥 Starting namespace management health check...')

    // Check namespace manager health
    console.log('Checking namespace manager health...')
    const namespaceHealth = await defaultNamespaceManager.healthCheck()
    
    // Check vector search service health
    console.log('Checking vector search service health...')
    const vectorSearchHealth = await defaultVectorSearch.checkServiceHealth()

    // Determine overall status
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy'
    const criticalIssues: string[] = []
    const recommendations: string[] = []

    // Analyze namespace manager health
    if (namespaceHealth.status === 'unhealthy') {
      overallStatus = 'unhealthy'
      criticalIssues.push('Namespace manager is unhealthy')
    } else if (namespaceHealth.status === 'degraded') {
      overallStatus = overallStatus === 'healthy' ? 'degraded' : overallStatus
      recommendations.push('Namespace manager has degraded performance')
    }

    if (!namespaceHealth.pineconeConnected) {
      overallStatus = 'unhealthy'
      criticalIssues.push('Pinecone connection failed')
      recommendations.push('Check Pinecone API key and network connectivity')
    }

    if (!namespaceHealth.databaseConnected) {
      overallStatus = 'unhealthy'
      criticalIssues.push('Database connection failed')
      recommendations.push('Check database connection and credentials')
    }

    // Analyze vector search health
    if (!vectorSearchHealth.pinecone.available) {
      if (!vectorSearchHealth.fallbackEnabled) {
        overallStatus = 'unhealthy'
        criticalIssues.push('Primary vector search (Pinecone) unavailable and no fallback enabled')
        recommendations.push('Enable pgvector fallback or fix Pinecone connectivity')
      } else if (!vectorSearchHealth.pgvector.available) {
        overallStatus = 'unhealthy'
        criticalIssues.push('Both Pinecone and pgvector are unavailable')
        recommendations.push('Fix vector search services immediately')
      } else {
        overallStatus = overallStatus === 'healthy' ? 'degraded' : overallStatus
        recommendations.push('Running on pgvector fallback - restore Pinecone when possible')
      }
    }

    // Performance recommendations
    if (namespaceHealth.cacheSize > 1000) {
      recommendations.push('Large namespace cache detected - consider cache cleanup')
    }

    const totalErrors = namespaceHealth.errors.length + 
                       (vectorSearchHealth.pinecone.error ? 1 : 0) + 
                       (vectorSearchHealth.pgvector.error ? 1 : 0)

    const healthCheckDuration = Date.now() - startTime

    const response = {
      success: true,
      status: overallStatus,
      timestamp: new Date().toISOString(),
      duration: `${healthCheckDuration}ms`,
      services: {
        namespaceManager: namespaceHealth,
        vectorSearch: vectorSearchHealth
      },
      summary: {
        totalErrors,
        criticalIssues,
        recommendations: recommendations.slice(0, 5) // Limit to top 5 recommendations
      }
    }

    console.log(`🏥 Health check completed in ${healthCheckDuration}ms - Status: ${overallStatus}`)

    return NextResponse.json(response, {
      status: overallStatus === 'unhealthy' ? 503 : 200
    })

  } catch (error) {
    const healthCheckDuration = Date.now() - startTime
    console.error('❌ Health check failed:', error)

    return NextResponse.json({
      success: false,
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      duration: `${healthCheckDuration}ms`,
      error: 'Health check failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      services: {
        namespaceManager: {
          status: 'error',
          error: 'Health check failed'
        },
        vectorSearch: {
          status: 'error', 
          error: 'Health check failed'
        }
      },
      summary: {
        totalErrors: 1,
        criticalIssues: ['Health check system failure'],
        recommendations: ['Contact system administrator']
      }
    }, { status: 500 })
  }
}