import { NextRequest, NextResponse } from 'next/server';
import { simpleAIClient } from '@/lib/ai/services/simple-ai-client';

/**
 * @swagger
 * /api/v1/test-ai:
 *   get:
 *     summary: Test AI service directly
 *     description: Direct test of AI service to verify it's working
 *     tags:
 *       - Testing
 *     responses:
 *       200:
 *         description: AI test completed
 *       500:
 *         description: AI test failed
 */
export async function GET(request: NextRequest) {
  try {
    console.log('🧪 [AI TEST] Starting direct AI service test...');
    
    const startTime = Date.now();
    
    const result = await simpleAIClient.generateCompletion({
      model: 'openai/gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant. Respond briefly and clearly.'
        },
        {
          role: 'user',
          content: 'Hello! Please respond with exactly: "AI service is working correctly"'
        }
      ],
      maxTokens: 50,
      temperature: 0.1
    });

    const duration = Date.now() - startTime;
    console.log(`✅ [AI TEST] AI service responded in ${duration}ms`);

    return NextResponse.json({
      success: true,
      message: 'AI service test completed',
      result: {
        content: result.content,
        model: result.model,
        duration: `${duration}ms`,
        usage: result.usage
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ [AI TEST] AI service test failed:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'AI service test failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}