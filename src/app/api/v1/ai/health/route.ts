import { NextRequest, NextResponse } from 'next/server';
import { AIServiceManager } from '@/lib/ai';
import { auth } from '@clerk/nextjs/server';
import { handleApiError } from '@/lib/api-errors';

// Global AI service instance (would be properly initialized in production)
let aiServiceInstance: AIServiceManager | null = null;

function getAIService(): AIServiceManager {
  if (!aiServiceInstance) {
    aiServiceInstance = new AIServiceManager();
  }
  return aiServiceInstance;
}

/**
 * @swagger
 * /api/ai/health:
 *   get:
 *     summary: Get AI system health status
 *     description: Comprehensive health check for AI services including provider metrics, circuit breaker status, and system configuration
 *     tags: [AI Services]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: AI system health information retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 system:
 *                   type: object
 *                   properties:
 *                     health:
 *                       type: object
 *                       description: Overall system health metrics
 *                     configuration:
 *                       type: object
 *                       properties:
 *                         maxConcurrentRequests:
 *                           type: number
 *                         defaultTimeout:
 *                           type: number
 *                         enableFallback:
 *                           type: boolean
 *                         enableCircuitBreaker:
 *                           type: boolean
 *                         enableCaching:
 *                           type: boolean
 *                         providers:
 *                           type: array
 *                           items:
 *                             type: string
 *                     validation:
 *                       type: object
 *                       properties:
 *                         isValid:
 *                           type: boolean
 *                         errors:
 *                           type: array
 *                           items:
 *                             type: string
 *                         warnings:
 *                           type: array
 *                           items:
 *                             type: string
 *                 providers:
 *                   type: object
 *                   properties:
 *                     metrics:
 *                       type: object
 *                       description: Provider performance metrics
 *                     circuitBreakers:
 *                       type: object
 *                       description: Circuit breaker status for each provider
 *                     configured:
 *                       type: array
 *                       items:
 *                         type: string
 *                       description: List of configured providers
 *                 capabilities:
 *                   type: object
 *                   properties:
 *                     fallbackEnabled:
 *                       type: boolean
 *                     circuitBreakerEnabled:
 *                       type: boolean
 *                     cachingEnabled:
 *                       type: boolean
 *       401:
 *         description: Unauthorized
 *   post:
 *     summary: Perform AI health management actions
 *     description: Reset providers, force circuit breaker states, or reload configuration
 *     tags: [AI Services]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [action]
 *             properties:
 *               action:
 *                 type: string
 *                 enum: [reset_provider, force_open, force_close, reload_config]
 *                 description: Management action to perform
 *               provider:
 *                 type: string
 *                 description: Provider name (required for provider-specific actions)
 *                 example: "openai"
 *     responses:
 *       200:
 *         description: Action completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid action or missing provider name
 *       401:
 *         description: Unauthorized
 */
export async function GET() {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const aiService = getAIService();
    const systemHealth = aiService.getSystemHealthStatus();
    const providerMetrics = aiService.getProviderMetrics();
    const circuitBreakerStatus = aiService.getCircuitBreakerStatus();
    const configuration = aiService.getConfiguration();
    const configValidation = aiService.validateConfiguration();

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      system: {
        health: systemHealth,
        configuration: {
          ...configuration,
          // Remove sensitive data
          providers: aiService.getConfiguredProviders()
        },
        validation: configValidation
      },
      providers: {
        metrics: providerMetrics,
        circuitBreakers: circuitBreakerStatus,
        configured: aiService.getConfiguredProviders()
      },
      capabilities: {
        fallbackEnabled: configuration.enableFallback,
        circuitBreakerEnabled: configuration.enableCircuitBreaker,
        cachingEnabled: configuration.enableCaching
      }
    });

  } catch (error) {
    console.error('AI health check failed:', error);
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, provider } = body;

    const aiService = getAIService();

    switch (action) {
      case 'reset_provider':
        if (!provider) {
          return NextResponse.json({ error: 'Provider name required' }, { status: 400 });
        }
        const resetResult = aiService.resetProvider(provider);
        return NextResponse.json({ 
          success: resetResult,
          message: resetResult ? `Provider ${provider} reset successfully` : `Failed to reset provider ${provider}`
        });

      case 'force_open':
        if (!provider) {
          return NextResponse.json({ error: 'Provider name required' }, { status: 400 });
        }
        const openResult = aiService.forceProviderStatus(provider, 'open');
        return NextResponse.json({ 
          success: openResult,
          message: openResult ? `Provider ${provider} circuit opened` : `Failed to open circuit for ${provider}`
        });

      case 'force_close':
        if (!provider) {
          return NextResponse.json({ error: 'Provider name required' }, { status: 400 });
        }
        const closeResult = aiService.forceProviderStatus(provider, 'close');
        return NextResponse.json({ 
          success: closeResult,
          message: closeResult ? `Provider ${provider} circuit closed` : `Failed to close circuit for ${provider}`
        });

      case 'reload_config':
        aiService.reloadConfiguration();
        return NextResponse.json({ 
          success: true,
          message: 'Configuration reloaded successfully'
        });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

  } catch (error) {
    console.error('AI management action failed:', error);
    return handleApiError(error);
  }
}