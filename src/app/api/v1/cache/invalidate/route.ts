import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { cacheManager } from '@/lib/cache';
import { z } from 'zod';

// Validation schema for cache invalidation requests
const invalidateSchema = z.object({
  keys: z.array(z.string()).optional(),
  patterns: z.array(z.string()).optional(),
  organizationId: z.string().optional(),
  immediate: z.boolean().default(true),
});

/**
 * POST /api/cache/invalidate
 * 
 * Immediately invalidates specific cache keys or patterns.
 * Used for real-time cache updates when subscriptions change.
 * 
 * @example
 * POST /api/cache/invalidate
 * {
 *   "organizationId": "org_123",
 *   "immediate": true
 * }
 * 
 * // Invalidates all subscription-related cache for the organization
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = invalidateSchema.parse(body);

    console.log('🗑️ Cache invalidation request:', validatedData);

    const invalidationResults: Record<string, boolean> = {};
    
    // If organizationId is provided, invalidate all subscription-related cache
    if (validatedData.organizationId) {
      const orgCacheKeys = [
        `subscription:${validatedData.organizationId}`,
        `billing:${validatedData.organizationId}`,
        `usage:${validatedData.organizationId}`,
        `organization:${validatedData.organizationId}`,
      ];

      for (const key of orgCacheKeys) {
        try {
          await cacheManager.invalidate(key);
          invalidationResults[key] = true;
          console.log(`✅ Invalidated cache key: ${key}`);
        } catch (error) {
          invalidationResults[key] = false;
          console.warn(`⚠️ Failed to invalidate cache key ${key}:`, error);
        }
      }
    }

    // Invalidate specific keys if provided
    if (validatedData.keys) {
      for (const key of validatedData.keys) {
        try {
          await cacheManager.invalidate(key);
          invalidationResults[key] = true;
          console.log(`✅ Invalidated specific cache key: ${key}`);
        } catch (error) {
          invalidationResults[key] = false;
          console.warn(`⚠️ Failed to invalidate specific cache key ${key}:`, error);
        }
      }
    }

    // Invalidate patterns if provided
    if (validatedData.patterns) {
      for (const pattern of validatedData.patterns) {
        try {
          await cacheManager.invalidatePattern(pattern);
          invalidationResults[`pattern:${pattern}`] = true;
          console.log(`✅ Invalidated cache pattern: ${pattern}`);
        } catch (error) {
          invalidationResults[`pattern:${pattern}`] = false;
          console.warn(`⚠️ Failed to invalidate cache pattern ${pattern}:`, error);
        }
      }
    }

    // Also invalidate global pricing cache if this might affect pricing
    if (validatedData.organizationId) {
      try {
        await cacheManager.invalidate('pricing:plans');
        invalidationResults['pricing:plans'] = true;
        console.log('✅ Invalidated pricing plans cache');
      } catch (error) {
        invalidationResults['pricing:plans'] = false;
        console.warn('⚠️ Failed to invalidate pricing plans cache:', error);
      }
    }

    const successCount = Object.values(invalidationResults).filter(Boolean).length;
    const totalCount = Object.keys(invalidationResults).length;

    console.log(`🎯 Cache invalidation completed: ${successCount}/${totalCount} successful`);

    return NextResponse.json({
      success: true,
      invalidated: invalidationResults,
      summary: {
        successful: successCount,
        total: totalCount,
        immediate: validatedData.immediate,
      },
    });

  } catch (error) {
    console.error('❌ Cache invalidation error:', error);
    
    return NextResponse.json({
      error: 'Cache invalidation failed',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

/**
 * DELETE /api/cache/invalidate
 * 
 * Emergency cache flush - clears all cache.
 * Should be used sparingly.
 */
export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🚨 Emergency cache flush requested by user:', userId);

    // Full cache flush
    await cacheManager.flush();

    console.log('🧹 Emergency cache flush completed');

    return NextResponse.json({
      success: true,
      message: 'All cache cleared successfully',
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('❌ Emergency cache flush error:', error);
    
    return NextResponse.json({
      error: 'Cache flush failed',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}