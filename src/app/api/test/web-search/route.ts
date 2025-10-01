import { NextRequest, NextResponse } from 'next/server';
import { CleanOpenRouterAdapter } from '@/lib/ai/providers/clean-openrouter-adapter';

/**
 * Test endpoint for verifying OpenRouter :online web search functionality
 * This endpoint bypasses authentication and other checks to directly test the adapter
 */
export async function POST(request: NextRequest) {
  try {
    const { message } = await request.json();

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Check if API key is configured
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ 
        error: 'OpenRouter API key not configured',
        instruction: 'Add OPENROUTER_API_KEY to your .env.local file'
      }, { status: 500 });
    }

    console.log('🧪 Testing web search with message:', message);

    // Initialize adapter
    const adapter = new CleanOpenRouterAdapter({
      apiKey,
      appName: process.env.OPENROUTER_APP_NAME || 'GovMatch-AI-Test',
      siteUrl: process.env.OPENROUTER_SITE_URL || 'https://govmatch.ai',
      smartRouting: true,
      costOptimization: 'balanced'
    });

    // Create a simple completion request with web search enabled
    const response = await adapter.generateCompletion({
      model: 'openai/gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: message
        }
      ],
      temperature: 0.7,
      maxTokens: 1000,
      options: {
        webSearch: {
          enabled: true,
          max_results: 5,
          search_depth: 'basic'
        }
      }
    });

    console.log('✅ Response received:', {
      content: response.content.substring(0, 100) + '...',
      citationsCount: response.citations?.length || 0,
      usage: response.usage
    });

    return NextResponse.json({
      success: true,
      response: {
        content: response.content,
        citations: response.citations || [],
        usage: response.usage,
        model: response.model,
        debug: {
          webSearchEnabled: true,
          modelUsed: response.model,
          isOnlineModel: response.model.includes(':online')
        }
      }
    });

  } catch (error: any) {
    console.error('❌ Test failed:', error);
    
    return NextResponse.json({ 
      error: 'Test failed',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}

// Simple GET endpoint to check if the test is available
export async function GET() {
  const apiKeyConfigured = !!process.env.OPENROUTER_API_KEY;
  
  return NextResponse.json({
    available: true,
    apiKeyConfigured,
    instructions: {
      usage: 'POST /api/test/web-search with { "message": "your search query" }',
      example: {
        message: "Search for the latest government IT contracts in 2025"
      },
      requirements: [
        apiKeyConfigured ? '✅ OpenRouter API key is configured' : '❌ Add OPENROUTER_API_KEY to .env.local'
      ]
    }
  });
}