import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { z } from 'zod';
import { AIFeatureFlagManager, AIFeatureFlags } from '@/lib/ai/config/feature-flags';
import { prisma } from '@/lib/db';

const updateFlagsSchema = z.object({
  organizationId: z.string()
    .describe("Organization identifier for applying AI feature flag settings. These flags control which AI features and providers are available to users within this organization."),
  
  flags: z.object({
    useVercelForStreaming: z.boolean().optional()
      .describe("Enable Vercel AI SDK for streaming operations. When true, uses Vercel's optimized streaming for real-time AI responses in chat and content generation, providing better user experience."),
    
    useVercelForChat: z.boolean().optional()
      .describe("Enable Vercel AI SDK for chat completions. When true, chat operations use Vercel's providers instead of the traditional multi-provider system, potentially improving performance and features."),
    
    useVercelForNewFeatures: z.boolean().optional()
      .describe("Enable Vercel AI SDK for newly developed features. Allows organizations to opt into using Vercel AI for future AI capabilities while maintaining traditional providers for existing features."),
    
    fallbackToVercel: z.boolean().optional()
      .describe("Enable automatic fallback to Vercel AI SDK when traditional providers fail. Provides additional resilience by using Vercel as a backup when primary AI providers experience issues."),
    
    enableDocumentChat: z.boolean().optional()
      .describe("Enable document-based chat functionality. When true, users can upload documents and have AI-powered conversations about government solicitations, RFPs, and contract documents with RAG capabilities."),
    
    enableContentGeneration: z.boolean().optional()
      .describe("Enable AI-powered content generation features. Allows users to generate proposals, strategies, analyses, and summaries for government contracting opportunities with configurable parameters."),
    
    enableAdvancedAnalytics: z.boolean().optional()
      .describe("Enable advanced AI analytics and insights. Provides detailed performance metrics, cost analysis, usage patterns, and AI effectiveness measurements for organization optimization."),
    
    enableA11Testing: z.boolean().optional()
      .describe("Enable A/B testing framework for AI operations. Allows the organization to participate in performance comparisons between different AI providers to optimize cost and quality."),
    
    enableCostOptimization: z.boolean().optional()
      .describe("Enable intelligent cost optimization for AI operations. When true, the system automatically routes requests to cost-effective providers while maintaining quality thresholds."),
    
    enablePerformanceAnalytics: z.boolean().optional()
      .describe("Enable detailed performance analytics for AI operations. Tracks response times, token usage, success rates, and provider performance to optimize AI service selection."),
    
    maxCostPerRequest: z.number().min(0).max(10).optional()
      .describe("Maximum cost limit per individual AI request in USD. Prevents expensive operations from exceeding budget. Requests exceeding this limit are blocked or routed to cheaper alternatives."),
    
    maxDailyCost: z.number().min(0).max(1000).optional()
      .describe("Maximum daily cost limit for all AI operations in USD. Provides budget control at the organization level. Once reached, AI features may be disabled or limited until the next day."),
    
    enableExperimentalFeatures: z.boolean().optional()
      .describe("Enable access to experimental AI features and capabilities. These are cutting-edge features that may not be fully stable but provide access to the latest AI innovations."),
    
    enableBetaFeatures: z.boolean().optional()
      .describe("Enable access to beta AI features that are more stable than experimental but not yet in general availability. Provides early access to upcoming capabilities.")
  }).partial()
    .describe("AI feature flag configuration object. All fields are optional, allowing selective enabling/disabling of specific AI capabilities based on organization needs and preferences.")
});

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organization ID required' },
        { status: 400 }
      );
    }

    // Verify user has access to organization
    const userOrg = await prisma.user.findFirst({
      where: {
        clerkId: userId,
        organizationId
      }
    });

    if (!userOrg) {
      return NextResponse.json(
        { error: 'Access denied to organization' },
        { status: 403 }
      );
    }

    // Get feature flags for organization
    const flagManager = new AIFeatureFlagManager(organizationId);
    const flags = await flagManager.getFlags();

    return NextResponse.json({
      organizationId,
      flags,
      metadata: {
        canUseVercelAI: await flagManager.canUseVercelAI(),
        costLimits: await flagManager.getCostLimits(),
        routingPreferences: await flagManager.getRoutingPreferences()
      }
    });

  } catch (error) {
    console.error('Feature flags GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validation = updateFlagsSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validation.error.format() },
        { status: 400 }
      );
    }

    const { organizationId, flags } = validation.data;

    // Verify user has admin access to organization
    const userOrg = await prisma.user.findFirst({
      where: {
        clerkId: userId,
        organizationId,
        role: {
          in: ['OWNER', 'ADMIN']
        }
      }
    });

    if (!userOrg) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    // Update feature flags
    const flagManager = new AIFeatureFlagManager(organizationId);
    await flagManager.updateFlags(flags, userId);

    // Get updated flags
    const updatedFlags = await flagManager.getFlags();

    return NextResponse.json({
      organizationId,
      flags: updatedFlags,
      updatedBy: userId,
      updatedAt: new Date().toISOString(),
      metadata: {
        canUseVercelAI: await flagManager.canUseVercelAI(),
        costLimits: await flagManager.getCostLimits(),
        routingPreferences: await flagManager.getRoutingPreferences()
      }
    });

  } catch (error) {
    console.error('Feature flags PUT error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { organizationId, operation } = body;

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organization ID required' },
        { status: 400 }
      );
    }

    // Verify user access
    const userOrg = await prisma.user.findFirst({
      where: {
        clerkId: userId,
        organizationId
      }
    });

    if (!userOrg) {
      return NextResponse.json(
        { error: 'Access denied to organization' },
        { status: 403 }
      );
    }

    const flagManager = new AIFeatureFlagManager(organizationId);

    switch (operation) {
      case 'check_vercel_ai':
        const canUseVercelAI = await flagManager.canUseVercelAI();
        return NextResponse.json({ canUseVercelAI });

      case 'check_operation':
        const { operationType } = body;
        if (!operationType) {
          return NextResponse.json(
            { error: 'Operation type required' },
            { status: 400 }
          );
        }
        const shouldUseVercel = await flagManager.shouldUseVercelForOperation(operationType);
        return NextResponse.json({ shouldUseVercel, operationType });

      case 'get_routing_preferences':
        const routingPrefs = await flagManager.getRoutingPreferences();
        return NextResponse.json(routingPrefs);

      case 'reset_to_defaults':
        if (userOrg.role !== 'OWNER' && userOrg.role !== 'ADMIN') {
          return NextResponse.json(
            { error: 'Admin access required' },
            { status: 403 }
          );
        }
        
        // Reset to default flags by deleting custom settings
        await prisma.organizationSettings.deleteMany({
          where: {
            organizationId,
            category: 'AI_FEATURES'
          }
        });

        const defaultFlags = await flagManager.getFlags();
        return NextResponse.json({
          organizationId,
          flags: defaultFlags,
          message: 'Feature flags reset to defaults'
        });

      default:
        return NextResponse.json(
          { error: 'Invalid operation' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Feature flags POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}