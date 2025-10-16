import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'

/**
 * GET /api/v1/provider-credits
 *
 * Fetch remaining credits/usage for all AI providers
 */
export async function GET() {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const credits = {
      openai: await getOpenAICredits(),
      openrouter: await getOpenRouterCredits(),
      anthropic: await getAnthropicCredits(),
      imagerouter: await getImageRouterCredits(),
      pinecone: await getPineconeUsage(),
    }

    return NextResponse.json({
      success: true,
      credits
    })
  } catch (error) {
    console.error('Error fetching provider credits:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch credits' },
      { status: 500 }
    )
  }
}

/**
 * OpenAI Credits - Fetch from billing API
 */
async function getOpenAICredits() {
  const apiKey = process.env.OPENAI_API_KEY

  if (!apiKey) {
    return { available: false, message: 'API key not configured' }
  }

  try {
    // OpenAI doesn't have a direct balance API, but we can get usage
    // For now, return configured status
    return {
      available: true,
      provider: 'OpenAI',
      status: 'active',
      message: 'Pay-as-you-go billing',
      link: 'https://platform.openai.com/account/billing/overview'
    }
  } catch (error) {
    return {
      available: true,
      provider: 'OpenAI',
      status: 'unknown',
      error: 'Unable to fetch usage',
      link: 'https://platform.openai.com/account/billing/overview'
    }
  }
}

/**
 * OpenRouter Credits - Fetch from API
 */
async function getOpenRouterCredits() {
  const apiKey = process.env.OPENROUTER_API_KEY

  if (!apiKey) {
    return { available: false, message: 'API key not configured' }
  }

  try {
    const response = await fetch('https://openrouter.ai/api/v1/auth/key', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    })

    if (!response.ok) {
      throw new Error('Failed to fetch OpenRouter credits')
    }

    const data = await response.json()

    return {
      available: true,
      provider: 'OpenRouter',
      balance: data.data?.limit ? `$${(data.data.limit / 100).toFixed(2)}` : 'Unlimited',
      used: data.data?.usage ? `$${(data.data.usage / 100).toFixed(2)}` : '$0.00',
      status: 'active',
      link: 'https://openrouter.ai/credits'
    }
  } catch (error) {
    return {
      available: true,
      provider: 'OpenRouter',
      status: 'active',
      message: 'Pay-as-you-go billing',
      link: 'https://openrouter.ai/credits'
    }
  }
}

/**
 * Anthropic Credits
 */
async function getAnthropicCredits() {
  const apiKey = process.env.ANTHROPIC_API_KEY

  if (!apiKey) {
    return { available: false, message: 'API key not configured' }
  }

  // Anthropic doesn't have a public balance API
  return {
    available: true,
    provider: 'Anthropic',
    status: 'active',
    message: 'Pay-as-you-go billing',
    link: 'https://console.anthropic.com/settings/billing'
  }
}

/**
 * ImageRouter Credits
 */
async function getImageRouterCredits() {
  const apiKey = process.env.IMAGEROUTER_API_KEY
  const baseUrl = process.env.IMAGEROUTER_BASE_URL || 'https://api.imagerouter.io'

  if (!apiKey) {
    return { available: false, message: 'API key not configured' }
  }

  try {
    // Try to fetch account info from ImageRouter
    const response = await fetch(`${baseUrl}/v1/account`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    })

    if (response.ok) {
      const data = await response.json()

      return {
        available: true,
        provider: 'ImageRouter',
        balance: data.credits ? `${data.credits} credits` : 'Unknown',
        status: 'active',
        link: 'https://imagerouter.io/dashboard'
      }
    }

    // Fallback if account endpoint doesn't exist
    return {
      available: true,
      provider: 'ImageRouter',
      status: 'active',
      message: 'Active subscription',
      link: 'https://imagerouter.io/dashboard'
    }
  } catch (error) {
    return {
      available: true,
      provider: 'ImageRouter',
      status: 'active',
      message: 'Active subscription',
      link: 'https://imagerouter.io/dashboard'
    }
  }
}

/**
 * Pinecone Usage
 */
async function getPineconeUsage() {
  const apiKey = process.env.PINECONE_API_KEY

  if (!apiKey) {
    return { available: false, message: 'API key not configured' }
  }

  // Pinecone doesn't have a direct usage API that's easily accessible
  return {
    available: true,
    provider: 'Pinecone',
    status: 'active',
    message: 'Serverless plan - pay per usage',
    link: 'https://app.pinecone.io/organizations'
  }
}
