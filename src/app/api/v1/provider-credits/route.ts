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
      imagerouter: await getImageRouterCredits(),
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
 * https://platform.openai.com/docs/api-reference/usage
 */
async function getOpenAICredits() {
  const apiKey = process.env.OPENAI_API_KEY

  if (!apiKey) {
    return { available: false, message: 'API key not configured' }
  }

  try {
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    }

    // Fetch credit grants (for free trial credits)
    const creditGrantsResponse = await fetch(
      'https://api.openai.com/dashboard/billing/credit_grants',
      { headers }
    )

    // Fetch subscription details
    const subscriptionResponse = await fetch(
      'https://api.openai.com/v1/dashboard/billing/subscription',
      { headers }
    )

    // Get usage for current month
    const now = new Date()
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString()
      .split('T')[0]
    const endDate = now.toISOString().split('T')[0]

    const usageResponse = await fetch(
      `https://api.openai.com/dashboard/billing/usage?start_date=${startDate}&end_date=${endDate}`,
      { headers }
    )

    let creditGrants = null
    let subscription = null
    let usage = null

    if (creditGrantsResponse.ok) {
      creditGrants = await creditGrantsResponse.json()
    }

    if (subscriptionResponse.ok) {
      subscription = await subscriptionResponse.json()
    }

    if (usageResponse.ok) {
      usage = await usageResponse.json()
    }

    // Calculate remaining credits
    let balance = 'Unknown'
    let used = 'Unknown'
    let limit = 'Unknown'

    // Check for credit grants (free trial)
    if (creditGrants && creditGrants.total_granted) {
      const totalGranted = creditGrants.total_granted / 100 // Convert cents to dollars
      const totalUsed = creditGrants.total_used / 100
      const remaining = totalGranted - totalUsed

      balance = `$${remaining.toFixed(2)}`
      used = `$${totalUsed.toFixed(2)}`
      limit = `$${totalGranted.toFixed(2)}`
    }

    // Check subscription (paid accounts)
    if (subscription && subscription.hard_limit_usd) {
      limit = `$${subscription.hard_limit_usd.toFixed(2)}`
    }

    // Get current month usage
    if (usage && usage.total_usage) {
      const monthUsage = usage.total_usage / 100
      used = `$${monthUsage.toFixed(2)}`
    }

    return {
      available: true,
      provider: 'OpenAI',
      balance,
      used,
      limit,
      status: 'active',
      link: 'https://platform.openai.com/account/billing/overview'
    }
  } catch (error) {
    console.error('Error fetching OpenAI credits:', error)
    return {
      available: true,
      provider: 'OpenAI',
      status: 'unknown',
      message: 'Unable to fetch usage - check billing dashboard',
      link: 'https://platform.openai.com/account/billing/overview'
    }
  }
}

/**
 * OpenRouter Credits - Fetch from API
 * https://openrouter.ai/docs/api-reference/credits/get-credits
 */
async function getOpenRouterCredits() {
  const apiKey = process.env.OPENROUTER_API_KEY

  if (!apiKey) {
    return { available: false, message: 'API key not configured' }
  }

  try {
    // Use the correct endpoint for credit balance
    const response = await fetch('https://openrouter.ai/api/v1/credits', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    })

    if (!response.ok) {
      throw new Error(`OpenRouter API returned ${response.status}`)
    }

    const result = await response.json()

    // Response format: { data: { total_credits: number, total_usage: number } }
    const totalCredits = result.data?.total_credits || 0
    const totalUsage = result.data?.total_usage || 0
    const remainingCredits = totalCredits - totalUsage

    console.log('OpenRouter credits fetched:', {
      total_credits: totalCredits,
      total_usage: totalUsage,
      remaining: remainingCredits
    })

    return {
      available: true,
      provider: 'OpenRouter',
      balance: totalCredits > 0 ? `$${remainingCredits.toFixed(2)}` : 'Pay-as-you-go',
      used: `$${totalUsage.toFixed(2)}`,
      limit: totalCredits > 0 ? `$${totalCredits.toFixed(2)}` : 'Unlimited',
      status: 'active',
      link: 'https://openrouter.ai/credits'
    }
  } catch (error) {
    console.error('Error fetching OpenRouter credits:', error)
    return {
      available: true,
      provider: 'OpenRouter',
      status: 'unknown',
      message: 'Unable to fetch credits - check dashboard',
      link: 'https://openrouter.ai/credits'
    }
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
    console.error('Error fetching ImageRouter credits:', error)
    return {
      available: true,
      provider: 'ImageRouter',
      status: 'unknown',
      message: 'Unable to fetch credits - check dashboard',
      link: 'https://imagerouter.io/dashboard'
    }
  }
}
