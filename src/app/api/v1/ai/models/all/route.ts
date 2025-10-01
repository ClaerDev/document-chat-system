import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

/**
 * @swagger
 * /api/v1/ai/models/all:
 *   get:
 *     summary: Get all available models from all providers in parallel
 *     description: Fetches models from OpenRouter and ImageRouter simultaneously for faster loading
 *     tags: [AI Services]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: force
 *         schema:
 *           type: boolean
 *         description: Force refresh cache
 *     responses:
 *       200:
 *         description: All models retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 openrouter:
 *                   type: array
 *                   description: OpenRouter models for text generation
 *                   items:
 *                     $ref: '#/components/schemas/ModelInfo'
 *                 imagerouter:
 *                   type: array
 *                   description: ImageRouter models for media generation
 *                   items:
 *                     $ref: '#/components/schemas/ModelInfo'
 *                 totalModels:
 *                   type: number
 *                   description: Total number of models loaded
 *                 loadingTime:
 *                   type: number
 *                   description: Total loading time in milliseconds
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const forceRefresh = searchParams.get('force') === 'true';
    const startTime = Date.now();

    console.log('🚀 Loading all AI models in parallel...');

    // Helper function to fetch with timeout
    const fetchWithTimeout = (url: string, options: any, timeoutMs: number = 3000) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      
      return fetch(url, { ...options, signal: controller.signal })
        .finally(() => clearTimeout(timeoutId))
        .then(res => res.ok ? res.json() : [])
        .catch((error) => {
          console.warn(`⚠️ Fetch timeout or error for ${url}:`, error.message);
          return []; // Return empty array on timeout/error
        });
    };

    // Load both providers in parallel for maximum performance with timeouts
    const [openrouterResult, imagerouterResult] = await Promise.allSettled([
      // OpenRouter models (text generation) with timeout
      fetchWithTimeout(`${request.nextUrl.origin}/api/v1/ai/providers/openrouter/models${forceRefresh ? '?force=true' : ''}`, {
        headers: {
          'Authorization': request.headers.get('Authorization') || '',
          'Cookie': request.headers.get('Cookie') || ''
        }
      }),
      
      // ImageRouter models (media generation) with timeout
      fetchWithTimeout(`${request.nextUrl.origin}/api/v1/ai/providers/imagerouter/models${forceRefresh ? '?force=true' : ''}`, {
        headers: {
          'Authorization': request.headers.get('Authorization') || '',
          'Cookie': request.headers.get('Cookie') || '',
          'X-Internal-Call': 'true',
          'Content-Type': 'application/json'
        }
      })
    ]);

    // Process results
    const openrouterModels = openrouterResult.status === 'fulfilled' ? openrouterResult.value : [];
    const imagerouterModels = imagerouterResult.status === 'fulfilled' ? imagerouterResult.value : [];

    // Enhanced debugging for ImageRouter
    console.log('🔍 All Models API - OpenRouter result status:', openrouterResult.status);
    console.log('🔍 All Models API - ImageRouter result status:', imagerouterResult.status);
    console.log('🔍 All Models API - OpenRouter models count:', openrouterModels.length);
    console.log('🔍 All Models API - ImageRouter models count:', imagerouterModels.length);
    console.log('🔍 All Models API - ImageRouter models data:', imagerouterModels);

    // Log any failures
    if (openrouterResult.status === 'rejected') {
      console.error('Failed to load OpenRouter models:', openrouterResult.reason);
    }
    if (imagerouterResult.status === 'rejected') {
      console.error('Failed to load ImageRouter models:', imagerouterResult.reason);
      console.error('ImageRouter failure details:', imagerouterResult.reason);
    }

    const loadingTime = Date.now() - startTime;
    const totalModels = openrouterModels.length + imagerouterModels.length;

    console.log(`✅ Loaded ${totalModels} models in ${loadingTime}ms (OpenRouter: ${openrouterModels.length}, ImageRouter: ${imagerouterModels.length})`);

    return NextResponse.json({
      openrouter: openrouterModels,
      imagerouter: imagerouterModels,
      totalModels,
      loadingTime
    });

  } catch (error) {
    console.error('Error loading all models:', error);
    return NextResponse.json(
      { error: 'Failed to load models' },
      { status: 500 }
    );
  }
}

/**
 * @swagger
 * /api/v1/ai/models/all:
 *   post:
 *     summary: Refresh all models from all providers
 *     description: Forces a refresh of cached models from all providers simultaneously
 *     tags: [AI Services]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: All models refreshed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 totalModels:
 *                   type: number
 *                 loadingTime:
 *                   type: number
 *                 providers:
 *                   type: object
 *                   properties:
 *                     openrouter:
 *                       type: number
 *                     imagerouter:
 *                       type: number
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const startTime = Date.now();
    console.log('🔄 Force refreshing all AI models...');

    // Helper function to fetch with timeout (same as GET route)
    const fetchWithTimeout = (url: string, options: any, timeoutMs: number = 3000) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      
      return fetch(url, { ...options, signal: controller.signal })
        .finally(() => clearTimeout(timeoutId))
        .then(res => res.ok ? res.json() : { modelsCount: 0 })
        .catch((error) => {
          console.warn(`⚠️ Fetch timeout or error for ${url}:`, error.message);
          return { modelsCount: 0 }; // Return default response on timeout/error
        });
    };

    // Force refresh both providers in parallel with timeouts
    const [openrouterResult, imagerouterResult] = await Promise.allSettled([
      fetchWithTimeout(`${request.nextUrl.origin}/api/v1/ai/providers/openrouter/models`, {
        method: 'POST',
        headers: {
          'Authorization': request.headers.get('Authorization') || '',
          'Cookie': request.headers.get('Cookie') || ''
        }
      }),
      
      // ImageRouter refresh with timeout
      fetchWithTimeout(`${request.nextUrl.origin}/api/v1/ai/providers/imagerouter/models`, {
        method: 'POST',
        headers: {
          'Authorization': request.headers.get('Authorization') || '',
          'Cookie': request.headers.get('Cookie') || ''
        }
      })
    ]);

    const openrouterCount = openrouterResult.status === 'fulfilled' ? openrouterResult.value.modelsCount || 0 : 0;
    const imagerouterCount = imagerouterResult.status === 'fulfilled' ? imagerouterResult.value.modelsCount || 0 : 0;

    const loadingTime = Date.now() - startTime;
    const totalModels = openrouterCount + imagerouterCount;

    return NextResponse.json({
      success: true,
      message: `All models refreshed in ${loadingTime}ms`,
      totalModels,
      loadingTime,
      providers: {
        openrouter: openrouterCount,
        imagerouter: imagerouterCount
      }
    });

  } catch (error) {
    console.error('Error refreshing all models:', error);
    return NextResponse.json(
      { error: 'Failed to refresh models' },
      { status: 500 }
    );
  }
}