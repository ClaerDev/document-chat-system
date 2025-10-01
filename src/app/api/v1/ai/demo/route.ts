import { NextRequest, NextResponse } from 'next/server';
import { AIServiceManager } from '@/lib/ai';
import { auth } from '@clerk/nextjs/server';
import { handleApiError } from '@/lib/api-errors';
import { z } from 'zod';

// Global AI service instance
let aiServiceInstance: AIServiceManager | null = null;

function getAIService(): AIServiceManager {
  if (!aiServiceInstance) {
    aiServiceInstance = new AIServiceManager();
    // Initialize default providers
    aiServiceInstance.initializeDefaultProviders();
  }
  return aiServiceInstance;
}

const demoRequestSchema = z.object({
  message: z.string().min(1).max(1000),
  provider: z.enum(['openai', 'anthropic', 'google', 'azure']).optional(),
  model: z.string().optional(),
  taskType: z.enum(['simple_qa', 'complex_analysis', 'content_generation', 'summarization']).optional().default('simple_qa')
});

/**
 * @swagger
 * /api/ai/demo:
 *   post:
 *     summary: AI service demonstration
 *     description: Test AI completions with different providers and models for demonstration purposes
 *     tags: [AI Services]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [message]
 *             properties:
 *               message:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 1000
 *                 description: The message/prompt to send to the AI
 *                 example: "What are the benefits of using GovMatch AI for government contracting?"
 *               provider:
 *                 type: string
 *                 enum: [openai, anthropic, google, azure]
 *                 description: Preferred AI provider
 *                 example: "openai"
 *               model:
 *                 type: string
 *                 description: Specific model to use (optional)
 *                 example: "gpt-4o"
 *               taskType:
 *                 type: string
 *                 enum: [simple_qa, complex_analysis, content_generation, summarization]
 *                 default: simple_qa
 *                 description: Type of AI task for optimization
 *     responses:
 *       200:
 *         description: AI completion generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 response:
 *                   type: object
 *                   properties:
 *                     content:
 *                       type: string
 *                       description: AI-generated response content
 *                     model:
 *                       type: string
 *                       description: Model used for generation
 *                     finishReason:
 *                       type: string
 *                       description: Reason completion finished
 *                     usage:
 *                       type: object
 *                       description: Token usage statistics
 *                 metadata:
 *                   type: object
 *                   properties:
 *                     responseTime:
 *                       type: number
 *                       description: Response time in milliseconds
 *                     selectedModel:
 *                       type: string
 *                     requestedProvider:
 *                       type: string
 *                     actualProvider:
 *                       type: string
 *                     taskType:
 *                       type: string
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *                 systemInfo:
 *                   type: object
 *                   properties:
 *                     availableProviders:
 *                       type: array
 *                       items:
 *                         type: string
 *                     systemHealth:
 *                       type: string
 *       400:
 *         description: Invalid request parameters
 *       401:
 *         description: Unauthorized
 *   get:
 *     summary: Get AI demo service status
 *     description: Retrieve AI service capabilities, available providers, and configuration for demo purposes
 *     tags: [AI Services]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: AI demo service status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "AI Service Demo Ready"
 *                 capabilities:
 *                   type: object
 *                   properties:
 *                     multiProviderIntegration:
 *                       type: boolean
 *                     multiProviderSupport:
 *                       type: boolean
 *                     intelligentRouting:
 *                       type: boolean
 *                     circuitBreaker:
 *                       type: boolean
 *                     fallbackStrategy:
 *                       type: boolean
 *                 availableProviders:
 *                   type: array
 *                   items:
 *                     type: string
 *                 systemHealth:
 *                   type: object
 *                   description: Current system health status
 *                 supportedModels:
 *                   type: object
 *                   properties:
 *                     available:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: ["gpt-4o", "claude-3-5-sonnet-20241022", "gemini-1.5-pro-latest"]
 *                 exampleRequest:
 *                   type: object
 *                   description: Example request format for testing
 *       401:
 *         description: Unauthorized
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validation = demoRequestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({
        error: 'Invalid request parameters',
        details: validation.error.errors
      }, { status: 400 });
    }

    const { message, provider, model, taskType } = validation.data;
    const aiService = getAIService();

    // Determine the model based on provider preference
    const selectedModel = model || 'gpt-3.5-turbo';

    const completionRequest = {
      messages: [
        {
          role: 'system' as const,
          content: 'You are a helpful AI assistant for GovMatch AI, a platform that helps government contractors find opportunities and insights.'
        },
        {
          role: 'user' as const,
          content: message
        }
      ],
      model: selectedModel,
      temperature: 0.7,
      maxTokens: 500,
      options: {
        streaming: false,
        jsonMode: false
      }
    };

    const startTime = Date.now();
    const response = await aiService.generateCompletion(completionRequest);
    const responseTime = Date.now() - startTime;

    // Get system status for debugging
    const systemHealth = aiService.getSystemHealthStatus();
    const availableProviders = aiService.getAvailableProviders();

    return NextResponse.json({
      success: true,
      response: {
        content: response.content,
        model: response.model,
        finishReason: response.finishReason,
        usage: response.usage
      },
      metadata: {
        responseTime,
        selectedModel,
        requestedProvider: provider,
        actualProvider: response.metadata?.provider || 'unknown',
        taskType,
        timestamp: new Date().toISOString()
      },
      systemInfo: {
        availableProviders,
        systemHealth: systemHealth?.status || 'unknown'
      }
    });

  } catch (error) {
    console.error('AI demo request failed:', error);
    return handleApiError(error);
  }
}

export async function GET() {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const aiService = getAIService();
    const systemHealth = aiService.getSystemHealthStatus();
    const availableProviders = aiService.getAvailableProviders();
    const configuration = aiService.getConfiguration();

    return NextResponse.json({
      status: 'AI Service Demo Ready',
      capabilities: {
        multiProviderIntegration: availableProviders.length > 1,
        multiProviderSupport: true,
        intelligentRouting: true,
        circuitBreaker: configuration.enableCircuitBreaker,
        fallbackStrategy: configuration.enableFallback
      },
      availableProviders,
      systemHealth,
      supportedModels: {
        available: [
          'gpt-4o',
          'gpt-3.5-turbo',
          'claude-3-5-sonnet-20241022',
          'gemini-1.5-pro-latest'
        ]
      },
      exampleRequest: {
        method: 'POST',
        endpoint: '/api/ai/demo',
        body: {
          message: 'What are the benefits of using GovMatch AI for government contracting?',
          provider: 'openai',
          model: 'gpt-4o',
          taskType: 'content_generation'
        }
      }
    });

  } catch (error) {
    console.error('AI demo status check failed:', error);
    return handleApiError(error);
  }
}