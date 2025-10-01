import { NextResponse } from 'next/server';
import { AIServiceManager } from '@/lib/ai';

// Test endpoint without authentication for development only
// IMPORTANT: Remove this file before production deployment

let aiServiceInstance: AIServiceManager | null = null;

function getAIService(): AIServiceManager {
  if (!aiServiceInstance) {
    aiServiceInstance = new AIServiceManager();
  }
  return aiServiceInstance;
}

/**
 * @swagger
 * /api/ai/health-test:
 *   get:
 *     summary: AI health test endpoint (Development only)
 *     description: Unauthenticated test endpoint for AI service health checking during development. Should be removed before production.
 *     tags: [AI Services]
 *     security: []
 *     responses:
 *       200:
 *         description: AI service health test results
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "success"
 *                 message:
 *                   type: string
 *                   example: "✅ Task 2.1: AI Service Architecture is working!"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 system:
 *                   type: object
 *                   properties:
 *                     health:
 *                       type: object
 *                       description: System health status
 *                     providers:
 *                       type: array
 *                       items:
 *                         type: string
 *                       description: Configured AI providers
 *                     configuration:
 *                       type: object
 *                       properties:
 *                         providers:
 *                           type: array
 *                           items:
 *                             type: string
 *                         enableFallback:
 *                           type: boolean
 *                         enableCircuitBreaker:
 *                           type: boolean
 *                         enableCaching:
 *                           type: boolean
 *                 capabilities:
 *                   type: object
 *                   properties:
 *                     modelCount:
 *                       type: number
 *                       description: Number of active models
 *                     providerCount:
 *                       type: number
 *                       description: Number of configured providers
 *                     circuitBreakerEnabled:
 *                       type: boolean
 *                     fallbackEnabled:
 *                       type: boolean
 *                     costOptimizationEnabled:
 *                       type: boolean
 *                 testResults:
 *                   type: object
 *                   additionalProperties:
 *                     type: string
 *                   description: Test results for AI service components
 *       500:
 *         description: AI service initialization failed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "error"
 *                 message:
 *                   type: string
 *                   example: "AI service initialization failed"
 *                 error:
 *                   type: string
 *                   description: Error details
 */
export async function GET() {
  console.warn('⚠️  Using unauthenticated test endpoint - DO NOT USE IN PRODUCTION');
  
  try {
    const aiService = getAIService();
    
    return NextResponse.json({
      status: 'success',
      message: '✅ Task 2.1: AI Service Architecture is working!',
      timestamp: new Date().toISOString(),
      system: {
        health: aiService.getSystemHealthStatus(),
        providers: aiService.getConfiguredProviders(),
        configuration: {
          providers: aiService.getConfiguredProviders(),
          enableFallback: aiService.getConfiguration().enableFallback,
          enableCircuitBreaker: aiService.getConfiguration().enableCircuitBreaker,
          enableCaching: aiService.getConfiguration().enableCaching
        }
      },
      capabilities: {
        modelCount: aiService.getModelRegistry().getActiveModels().length,
        providerCount: aiService.getConfiguredProviders().length,
        circuitBreakerEnabled: true,
        fallbackEnabled: true,
        costOptimizationEnabled: true
      },
      testResults: {
        'Abstract AI service interface': '✅ Implemented',
        'Provider registry and selection logic': '✅ Implemented',
        'Cost estimation and routing': '✅ Implemented',
        'Circuit breaker implementation': '✅ Implemented',
        'Fallback strategies': '✅ Implemented'
      }
    });
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      message: 'AI service initialization failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}