import { NextRequest, NextResponse } from 'next/server';
import { AIServiceManager } from '@/lib/ai';
import { auth } from '@clerk/nextjs/server';
import { handleApiError } from '@/lib/api-errors';
import { z } from 'zod';

// Use the singleton instance
function getAIService(): AIServiceManager {
  return AIServiceManager.getInstance();
}

const configUpdateSchema = z.object({
  maxConcurrentRequests: z.number().min(1).max(1000).optional(),
  defaultTimeout: z.number().min(1000).max(120000).optional(),
  enableFallback: z.boolean().optional(),
  enableCircuitBreaker: z.boolean().optional(),
  enableCaching: z.boolean().optional(),
  costLimits: z.object({
    dailyLimit: z.number().min(0).optional(),
    monthlyLimit: z.number().min(0).optional(),
    perRequestLimit: z.number().min(0).optional()
  }).optional()
});

/**
 * @swagger
 * /api/ai/config:
 *   get:
 *     summary: Get AI service configuration
 *     description: Retrieve current AI service configuration, validation status, and capabilities
 *     tags: [AI Services]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Configuration retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 configuration:
 *                   type: object
 *                   properties:
 *                     maxConcurrentRequests:
 *                       type: number
 *                       example: 100
 *                     defaultTimeout:
 *                       type: number
 *                       example: 30000
 *                     enableFallback:
 *                       type: boolean
 *                       example: true
 *                     enableCircuitBreaker:
 *                       type: boolean
 *                       example: true
 *                     enableCaching:
 *                       type: boolean
 *                       example: true
 *                     configuredProviders:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: ["openai", "anthropic", "google"]
 *                 validation:
 *                   type: object
 *                   properties:
 *                     isValid:
 *                       type: boolean
 *                     errors:
 *                       type: array
 *                       items:
 *                         type: string
 *                     warnings:
 *                       type: array
 *                       items:
 *                         type: string
 *                 capabilities:
 *                   type: object
 *                   properties:
 *                     totalProviders:
 *                       type: number
 *                     availableFeatures:
 *                       type: array
 *                       items:
 *                         type: string
 *                 lastUpdated:
 *                   type: string
 *                   format: date-time
 *       401:
 *         description: Unauthorized
 *   put:
 *     summary: Update AI service configuration
 *     description: Update AI service configuration settings with validation
 *     tags: [AI Services]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               maxConcurrentRequests:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 1000
 *                 description: Maximum concurrent AI requests
 *               defaultTimeout:
 *                 type: number
 *                 minimum: 1000
 *                 maximum: 120000
 *                 description: Default timeout in milliseconds
 *               enableFallback:
 *                 type: boolean
 *                 description: Enable provider fallback
 *               enableCircuitBreaker:
 *                 type: boolean
 *                 description: Enable circuit breaker protection
 *               enableCaching:
 *                 type: boolean
 *                 description: Enable response caching
 *               costLimits:
 *                 type: object
 *                 properties:
 *                   dailyLimit:
 *                     type: number
 *                     minimum: 0
 *                   monthlyLimit:
 *                     type: number
 *                     minimum: 0
 *                   perRequestLimit:
 *                     type: number
 *                     minimum: 0
 *     responses:
 *       200:
 *         description: Configuration updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 configuration:
 *                   type: object
 *                 validation:
 *                   type: object
 *                 updatedAt:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: Invalid configuration parameters or validation failed
 *       401:
 *         description: Unauthorized
 *   post:
 *     summary: Perform AI configuration actions
 *     description: Reload, validate, or reset AI service configuration
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
 *                 enum: [reload, validate, reset]
 *                 description: Action to perform on configuration
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
 *                 configuration:
 *                   type: object
 *                 validation:
 *                   type: object
 *                 reloadedAt:
 *                   type: string
 *                   format: date-time
 *                 validatedAt:
 *                   type: string
 *                   format: date-time
 *                 resetAt:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: Invalid action
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
    const configuration = aiService.getConfiguration();
    const validation = aiService.validateConfiguration();
    const configuredProviders = aiService.getConfiguredProviders();

    return NextResponse.json({
      configuration: {
        ...configuration,
        // Remove any sensitive information
        configuredProviders
      },
      validation,
      capabilities: {
        totalProviders: configuredProviders.length,
        availableFeatures: [
          'multi-provider-routing',
          'circuit-breaker',
          'fallback-strategies',
          'cost-optimization',
          'real-time-metrics'
        ]
      },
      lastUpdated: new Date().toISOString()
    });

  } catch (error) {
    console.error('AI configuration fetch failed:', error);
    return handleApiError(error);
  }
}


export async function PUT(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validation = configUpdateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({
        error: 'Invalid configuration parameters',
        details: validation.error.errors
      }, { status: 400 });
    }

    const aiService = getAIService();
    const updates = validation.data;

    // Update the configuration
    aiService.updateConfiguration(updates);

    // Validate the new configuration
    const configValidation = aiService.validateConfiguration();
    
    if (!configValidation.isValid) {
      return NextResponse.json({
        error: 'Configuration validation failed',
        errors: configValidation.errors,
        warnings: configValidation.warnings
      }, { status: 400 });
    }

    const updatedConfig = aiService.getConfiguration();

    return NextResponse.json({
      success: true,
      message: 'Configuration updated successfully',
      configuration: updatedConfig,
      validation: configValidation,
      updatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('AI configuration update failed:', error);
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
    const { action } = body;

    const aiService = getAIService();

    switch (action) {
      case 'check_budget':
        // Budget check action
        const { estimatedCost = 0, currentSpend = 0, organizationId } = body;
        const limit = 5.0; // $5 demo limit
        const remaining = Math.max(0, limit - currentSpend);
        
        return NextResponse.json({
          canProceed: remaining >= estimatedCost,
          estimatedCost,
          currentSpend,
          limit,
          remaining,
          warningThreshold: limit * 0.8,
          routingDecision: body.useVercelOptimized ? 'vercel' : 'default',
          organizationId
        });

      case 'reload':
        aiService.reloadConfiguration();
        const reloadedConfig = aiService.getConfiguration();
        const validation = aiService.validateConfiguration();
        
        return NextResponse.json({
          success: true,
          message: 'Configuration reloaded from environment',
          configuration: reloadedConfig,
          validation,
          reloadedAt: new Date().toISOString()
        });

      case 'validate':
        const validationResult = aiService.validateConfiguration();
        return NextResponse.json({
          validation: validationResult,
          validatedAt: new Date().toISOString()
        });

      case 'reset':
        // Reset to default configuration
        const defaultConfig = {
          enableFallback: true,
          enableCircuitBreaker: true,
          enableCaching: true,
          defaultTimeout: 30000,
          maxConcurrentRequests: 100
        };
        
        aiService.updateConfiguration(defaultConfig);
        const resetConfig = aiService.getConfiguration();
        
        return NextResponse.json({
          success: true,
          message: 'Configuration reset to defaults',
          configuration: resetConfig,
          resetAt: new Date().toISOString()
        });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

  } catch (error) {
    console.error('AI configuration action failed:', error);
    return handleApiError(error);
  }
}