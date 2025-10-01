/**
 * API Documentation Endpoint
 * 
 * Serves interactive Swagger UI for API documentation at /api/docs
 */

import { NextRequest, NextResponse } from 'next/server'

/**
 * @swagger
 * /api/docs:
 *   get:
 *     summary: API Documentation
 *     description: Returns the OpenAPI specification for the Document Chat System AI API
 *     tags: [Documentation]
 *     security: []
 *     responses:
 *       200:
 *         description: OpenAPI specification
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 */
export async function GET() {
  try {
    // Determine cache policy based on environment
    const isDevelopment = process.env.NODE_ENV === 'development'
    
    // Import swagger spec dynamically to avoid build issues
    // In development, clear the module cache to ensure fresh imports
    if (isDevelopment) {
      // Clear the require cache for the swagger module in development
      try {
        const swaggerPath = require.resolve('@/lib/swagger')
        delete require.cache[swaggerPath]
        
        // Also clear any related cache entries
        Object.keys(require.cache).forEach(key => {
          if (key.includes('swagger') || key.includes('lib/swagger') || key.includes('swagger-jsdoc')) {
            delete require.cache[key]
          }
        })
        
        // Clear Next.js module cache if available
        if (typeof globalThis !== 'undefined' && (globalThis as any).__NEXT_PRIVATE_PREBUNDLED_REACT) {
          // Clear any Next.js caches
          console.log('Development mode: Cleared module caches for fresh API docs')
        }
      } catch (error) {
        console.log('Could not clear require cache, proceeding with normal import')
      }
    }
    
    const { default: swaggerSpec } = await import('@/lib/swagger')
    
    const cacheControl = isDevelopment 
      ? 'no-cache, no-store, must-revalidate' // No caching in development
      : 'public, max-age=3600' // 1 hour cache in production
    
    // Return the OpenAPI specification as JSON
    return NextResponse.json(swaggerSpec, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': cacheControl,
        ...(isDevelopment && {
          'Pragma': 'no-cache',
          'Expires': '0'
        })
      },
    })
  } catch (error) {
    console.error('Error generating API documentation:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate API documentation',
        code: 'DOCUMENTATION_ERROR'
      },
      { status: 500 }
    )
  }
}