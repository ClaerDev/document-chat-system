import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe-server'
import { SUBSCRIPTION_PLANS } from '@/lib/stripe'
import { cacheManager } from '@/lib/cache'
import { prisma } from '@/lib/prisma'

/**
 * @swagger
 * /api/pricing:
 *   get:
 *     summary: Get current pricing plans
 *     description: Retrieve all active pricing plans with current pricing from Stripe and database
 *     tags: [Billing]
 *     responses:
 *       200:
 *         description: Pricing plans retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         example: "professional"
 *                       name:
 *                         type: string
 *                         example: "Professional"
 *                       description:
 *                         type: string
 *                         example: "Perfect for growing businesses"
 *                       price:
 *                         type: number
 *                         example: 49.99
 *                       priceId:
 *                         type: string
 *                         example: "price_123"
 *                       interval:
 *                         type: string
 *                         example: "month"
 *                       features:
 *                         type: array
 *                         items:
 *                           type: string
 *                         example: ["Advanced search", "Priority support"]
 *                       limits:
 *                         type: object
 *                         properties:
 *                           apiRequests:
 *                             type: number
 *                           aiQueries:
 *                             type: number
 *                       popular:
 *                         type: boolean
 *                         example: true
 *                       cta:
 *                         type: string
 *                         example: "Get Started"
 *                 cached:
 *                   type: boolean
 *                   example: true
 *   delete:
 *     summary: Clear pricing cache
 *     description: Admin endpoint to invalidate pricing cache when pricing changes
 *     tags: [Billing]
 *     responses:
 *       200:
 *         description: Pricing cache cleared successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Pricing cache cleared successfully"
 *       500:
 *         description: Failed to clear cache
 */

async function fetchPricingData() {
  // Get active plans from database (this is now our source of truth for which plans to show)
  let dbPlans: any[] = []
  try {
    dbPlans = await prisma.pricingPlan.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: 'asc' }
    })

    if (dbPlans.length === 0) {
      console.warn('No active pricing plans found in database')
      // Fall back to hardcoded plans if DB is empty
      throw new Error('No active plans in database')
    }
  } catch (dbError) {
    console.error('Error fetching pricing plans from database:', dbError)
    // Fallback to hardcoded plans
    return Object.entries(SUBSCRIPTION_PLANS).map(([key, plan]) => ({
      id: plan.id,
      name: plan.name,
      description: plan.description,
      price: plan.price,
      priceId: plan.priceId,
      interval: plan.interval,
      features: plan.features,
      limits: plan.limits,
      popular: plan.id === 'pro',
      displayOrder: 999,
      cta: plan.priceId ? 'Get Started' : 'Contact Sales',
      stripePriceData: null,
      yearlyPrice: null,
      yearlyPriceId: null,
      metadata: null
    }))
  }

  // Fetch current prices from Stripe for active plans
  const stripePrices: Record<string, any> = {}
  try {
    const prices = await stripe.prices.list({
      active: true,
      limit: 100,
    })

    // Create a map of price IDs to price data
    prices.data.forEach(price => {
      stripePrices[price.id] = price
    })
  } catch (stripeError) {
    console.error('Error fetching prices from Stripe:', stripeError)
  }

  // Build pricing data from database plans
  const pricingData = dbPlans.map(dbPlan => {
    // Get current price from Stripe if available
    const stripePrice = dbPlan.stripeMonthlyPriceId ? stripePrices[dbPlan.stripeMonthlyPriceId] : null
    
    // Use Stripe price if available, otherwise use database price
    const currentPrice = stripePrice?.unit_amount 
      ? stripePrice.unit_amount / 100 
      : dbPlan.monthlyPrice / 100

    return {
      id: dbPlan.planType.toLowerCase(),
      name: dbPlan.displayName,
      description: dbPlan.description,
      price: currentPrice,
      priceId: dbPlan.stripeMonthlyPriceId,
      interval: 'month',
      features: (dbPlan.features as any).list || [],
      limits: dbPlan.limits as any,
      popular: dbPlan.isPopular,
      displayOrder: dbPlan.displayOrder,
      cta: dbPlan.planType === 'ENTERPRISE' ? 'Contact Sales' : 'Get Started',
      stripePriceData: stripePrice ? {
        currency: stripePrice.currency,
        interval: stripePrice.recurring?.interval,
        intervalCount: stripePrice.recurring?.interval_count,
      } : null,
      yearlyPrice: dbPlan.yearlyPrice ? dbPlan.yearlyPrice / 100 : null,
      yearlyPriceId: dbPlan.stripeYearlyPriceId,
      metadata: dbPlan.metadata
    }
  })

  return pricingData
}

export async function GET() {
  try {
    // Use cache with 24-hour TTL and smart invalidation
    const result = await cacheManager.withCache(
      'pricing:plans',
      fetchPricingData,
      {
        ttl: 86400, // 24 hours
        prefix: 'pricing:'
      }
    )

    return NextResponse.json({
      success: true,
      data: result.data,
      cached: result.cached
    })

  } catch (error) {
    console.error('Error fetching pricing data:', error)
    
    // Fallback to static data if Stripe fails
    const fallbackPricing = Object.entries(SUBSCRIPTION_PLANS).map(([key, plan]) => ({
      id: plan.id,
      name: plan.name,
      description: plan.description,
      price: plan.price,
      priceId: plan.priceId,
      interval: plan.interval,
      features: plan.features,
      limits: plan.limits,
      popular: plan.id === 'pro',
      cta: plan.priceId ? 'Get Started' : 'Contact Sales',
      stripePriceData: null
    }))

    return NextResponse.json({
      success: true,
      data: fallbackPricing,
      fallback: true
    })
  }
}

// Admin endpoint to invalidate pricing cache (for when pricing changes)
export async function DELETE() {
  try {
    await cacheManager.invalidate('pricing:plans')
    
    return NextResponse.json({
      success: true,
      message: 'Pricing cache cleared successfully'
    })
  } catch (error) {
    console.error('Error clearing pricing cache:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Failed to clear pricing cache'
    }, { status: 500 })
  }
}