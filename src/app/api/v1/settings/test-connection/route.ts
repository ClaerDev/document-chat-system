/**
 * Test API Connection Endpoint
 *
 * Validates API keys by making test requests to providers
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

/**
 * POST /api/v1/settings/test-connection
 * Test connection to various API providers
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { provider, credentials } = body;

    if (!provider || !credentials) {
      return NextResponse.json(
        { error: 'Provider and credentials are required' },
        { status: 400 }
      );
    }

    let testResult;

    switch (provider.toLowerCase()) {
      case 'openai':
        testResult = await testOpenAI(credentials);
        break;

      case 'openrouter':
        testResult = await testOpenRouter(credentials);
        break;

      case 'imagerouter':
        testResult = await testImageRouter(credentials);
        break;

      case 'supabase':
        testResult = await testSupabase(credentials);
        break;

      case 'pinecone':
        testResult = await testPinecone(credentials);
        break;

      case 'redis':
        testResult = await testRedis(credentials);
        break;

      case 'stripe':
        testResult = await testStripe(credentials);
        break;

      default:
        return NextResponse.json(
          { error: 'Unsupported provider' },
          { status: 400 }
        );
    }

    return NextResponse.json(testResult);
  } catch (error) {
    console.error('Error testing connection:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Test OpenAI API connection
 */
async function testOpenAI(credentials: { apiKey: string }) {
  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${credentials.apiKey}`,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    if (!response.ok) {
      const error = await response.json();
      return {
        success: false,
        error: error.error?.message || 'API key validation failed',
      };
    }

    const data = await response.json();
    return {
      success: true,
      message: 'OpenAI connection successful',
      details: {
        modelsAvailable: data.data?.length || 0,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Connection failed',
    };
  }
}

/**
 * Test OpenRouter API connection
 */
async function testOpenRouter(credentials: { apiKey: string }) {
  try {
    const response = await fetch('https://openrouter.ai/api/v1/models', {
      headers: {
        'Authorization': `Bearer ${credentials.apiKey}`,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      const error = await response.json();
      return {
        success: false,
        error: error.error?.message || 'API key validation failed',
      };
    }

    const data = await response.json();
    return {
      success: true,
      message: 'OpenRouter connection successful',
      details: {
        modelsAvailable: data.data?.length || 0,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Connection failed',
    };
  }
}

/**
 * Test ImageRouter API connection
 */
async function testImageRouter(credentials: { apiKey: string }) {
  try {
    const response = await fetch('https://api.imagerouter.io/v1/models', {
      headers: {
        'Authorization': `Bearer ${credentials.apiKey}`,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      const error = await response.json();
      return {
        success: false,
        error: error.error?.message || 'API key validation failed',
      };
    }

    const data = await response.json();
    return {
      success: true,
      message: 'ImageRouter connection successful',
      details: {
        modelsAvailable: data.data?.length || 0,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Connection failed',
    };
  }
}

/**
 * Test Supabase connection
 */
async function testSupabase(credentials: { url: string; anonKey: string }) {
  try {
    const response = await fetch(`${credentials.url}/rest/v1/`, {
      headers: {
        'apikey': credentials.anonKey,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok && response.status !== 404) {
      return {
        success: false,
        error: 'Supabase connection failed',
      };
    }

    return {
      success: true,
      message: 'Supabase connection successful',
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Connection failed',
    };
  }
}

/**
 * Test Pinecone connection
 */
async function testPinecone(credentials: { apiKey: string; environment: string }) {
  try {
    // Pinecone now uses a single API endpoint: https://api.pinecone.io
    const response = await fetch('https://api.pinecone.io/indexes', {
      headers: {
        'Api-Key': credentials.apiKey,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Pinecone API error:', response.status, errorText);
      return {
        success: false,
        error: `Pinecone API key validation failed (${response.status})`,
      };
    }

    const data = await response.json();
    return {
      success: true,
      message: 'Pinecone connection successful',
      details: {
        indexesAvailable: data.indexes?.length || 0,
      },
    };
  } catch (error) {
    console.error('Pinecone connection error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Connection failed',
    };
  }
}

/**
 * Test Redis connection
 */
async function testRedis(credentials: { url: string; token: string }) {
  try {
    // Upstash Redis REST API test
    const response = await fetch(`${credentials.url}/ping`, {
      headers: {
        'Authorization': `Bearer ${credentials.token}`,
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      return {
        success: false,
        error: 'Redis connection failed',
      };
    }

    const data = await response.json();
    return {
      success: true,
      message: 'Redis connection successful',
      details: {
        response: data.result,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Connection failed',
    };
  }
}

/**
 * Test Stripe connection
 */
async function testStripe(credentials: { secretKey: string }) {
  try {
    // Test Stripe API by fetching account info
    const response = await fetch('https://api.stripe.com/v1/account', {
      headers: {
        'Authorization': `Bearer ${credentials.secretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      const error = await response.json();
      return {
        success: false,
        error: error.error?.message || 'Stripe API key validation failed',
      };
    }

    const data = await response.json();
    return {
      success: true,
      message: 'Stripe connection successful',
      details: {
        accountId: data.id,
        country: data.country,
        currency: data.default_currency,
        chargesEnabled: data.charges_enabled,
        payoutsEnabled: data.payouts_enabled,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Connection failed',
    };
  }
}
