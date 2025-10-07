/**
 * Pricing Configuration
 *
 * Environment-configurable pricing plans for the Document Chat System platform.
 * This replaces hardcoded pricing in constants.ts to enable:
 * - Environment-specific pricing (development, staging, production)
 * - A/B testing of pricing strategies
 * - Market-specific pricing adjustments
 * - Easy promotional pricing updates
 */

import { pricing } from '@/lib/config/env';

export interface PricingPlan {
  name: string;
  price: number;
  interval: 'month';
  features: string[];
  limits: {
    seats: number;
    documentsPerMonth: number;
    aiCredits: number;
  };
}

export interface PricingPlans {
  STARTER: PricingPlan;
  PROFESSIONAL: PricingPlan;
  ENTERPRISE: PricingPlan;
}

/**
 * Dynamic pricing plans based on environment configuration
 * This allows pricing to be configured per environment without code changes
 */
export const PLANS: PricingPlans = {
  STARTER: {
    name: 'Starter',
    price: pricing.starter.monthly,
    interval: 'month' as const,
    features: [
      '1 seat included',
      '1 saved filter',
      'Basic search and MatchScore™ viewing',
      'Email alerts',
    ],
    limits: {
      seats: pricing.starter.seats,
      documentsPerMonth: pricing.starter.documentsPerMonth,
      aiCredits: pricing.starter.aiCredits,
    },
  },
  PROFESSIONAL: {
    name: 'Pro',
    price: pricing.professional.monthly,
    interval: 'month' as const,
    features: [
      '1 seat included',
      '10 saved filters',
      '10 AI credits/month',
      'Email drafts and capability statements',
      'CSV export',
    ],
    limits: {
      seats: pricing.professional.seats,
      documentsPerMonth: pricing.professional.documentsPerMonth,
      aiCredits: pricing.professional.aiCredits,
    },
  },
  ENTERPRISE: {
    name: 'Agency',
    price: pricing.enterprise.monthly,
    interval: 'month' as const,
    features: [
      '5 seats included',
      'Unlimited saved filters',
      '50 AI credits/month',
      'Chat Q&A functionality',
      'Win-rate dashboard',
      'Role permissions',
    ],
    limits: {
      seats: pricing.enterprise.seats,
      documentsPerMonth: pricing.enterprise.documentsPerMonth, // -1 for unlimited
      aiCredits: pricing.enterprise.aiCredits,
    },
  },
} as const

/**
 * Helper functions for pricing operations
 */
export const PricingUtils = {
  /**
   * Get plan by name
   */
  getPlan: (planName: keyof PricingPlans): PricingPlan => {
    return PLANS[planName]
  },

  /**
   * Get all plans as array
   */
  getAllPlans: (): PricingPlan[] => {
    return Object.values(PLANS)
  },

  /**
   * Check if plan has unlimited feature
   */
  isUnlimited: (planName: keyof PricingPlans, feature: keyof PricingPlan['limits']): boolean => {
    return PLANS[planName].limits[feature] === -1
  },

  /**
   * Format price for display
   */
  formatPrice: (price: number): string => {
    return `$${price}`
  },

  /**
   * Get plan by price (for reverse lookup)
   */
  getPlanByPrice: (price: number): PricingPlan | undefined => {
    return Object.values(PLANS).find(plan => plan.price === price)
  },
} as const

// Export individual plans for backward compatibility
export const { STARTER, PROFESSIONAL, ENTERPRISE } = PLANS