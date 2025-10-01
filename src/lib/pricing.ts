import { prisma } from '@/lib/prisma'
import { PricingPlan } from '@prisma/client'
import { cache } from '@/lib/config/env';

/**
 * Cache for active pricing plans to avoid frequent DB queries
 */
let plansCache: { data: PricingPlan[], timestamp: number } | null = null

/**
 * Get all active pricing plans from the database
 */
export async function getActivePricingPlans(): Promise<PricingPlan[]> {
  // Check cache first
  if (plansCache && Date.now() - plansCache.timestamp < cache.pricingTtl) {
    return plansCache.data
  }

  const plans = await prisma.pricingPlan.findMany({
    where: { isActive: true },
    orderBy: { displayOrder: 'asc' }
  })

  // Update cache
  plansCache = { data: plans, timestamp: Date.now() }
  
  return plans
}

/**
 * Validate if a plan type exists and is active
 */
export async function isValidPlanType(planType: string): Promise<boolean> {
  const plans = await getActivePricingPlans()
  return plans.some(plan => 
    plan.planType.toLowerCase() === planType.toLowerCase()
  )
}

/**
 * Get a specific pricing plan by type
 */
export async function getPricingPlanByType(planType: string): Promise<PricingPlan | null> {
  const plans = await getActivePricingPlans()
  return plans.find(plan => 
    plan.planType.toLowerCase() === planType.toLowerCase()
  ) || null
}

/**
 * Clear the pricing plans cache
 */
export function clearPricingCache(): void {
  plansCache = null
}

/**
 * Get valid plan types for validation
 */
export async function getValidPlanTypes(): Promise<string[]> {
  const plans = await getActivePricingPlans()
  return plans.map(plan => plan.planType.toLowerCase())
}

/**
 * Check if a plan has a specific feature or limit
 */
export async function checkPlanFeature(
  planType: string, 
  feature: string
): Promise<boolean | number | null> {
  const plan = await getPricingPlanByType(planType)
  if (!plan) return null

  const limits = plan.limits as any
  const features = plan.features as any

  // Check in limits first
  if (limits && feature in limits) {
    return limits[feature]
  }

  // Check in features
  if (features && features.list) {
    return features.list.some((f: string) => 
      f.toLowerCase().includes(feature.toLowerCase())
    )
  }

  return null
}