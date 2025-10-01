/**
 * DEFAULT PRICING PLANS - Emergency Fallback Only
 * 
 * This file contains minimal pricing data used ONLY when the database
 * is completely unavailable. These should match the database schema exactly.
 * 
 * ⚠️  DO NOT use this for regular operations - use PricingService instead
 * ⚠️  This data should only be updated to match database changes
 */

export const DEFAULT_PLANS = {
  STARTER: {
    id: 'starter',
    name: 'Starter',
    description: 'Perfect for small contractors getting started',
    price: 49, // In dollars (will be converted to cents)
    features: [
      '1 seat included',
      '1 saved filter',
      'Basic search and MatchScore viewing',
      'Email alerts'
    ],
    limits: {
      seats: 1,
      savedFilters: 1,
      savedSearches: 1, // Alias for savedFilters
      aiCreditsPerMonth: 0,
      aiCredits: 0, // Alias for aiCreditsPerMonth
      matchScoreCalculations: 50
    }
  },
  PROFESSIONAL: {
    id: 'pro',
    name: 'Pro',
    description: 'Advanced features for growing businesses',
    price: 149,
    features: [
      '1 seat included',
      '10 saved searches',
      '10 AI credits/month',
      'Email drafts and capability statements',
      'CSV export'
    ],
    limits: {
      seats: 1,
      savedFilters: 10,
      savedSearches: 10,
      aiCreditsPerMonth: 10,
      aiCredits: 10,
      matchScoreCalculations: 200
    }
  },
  AGENCY: {
    id: 'agency',
    name: 'Agency',
    description: 'Team collaboration for growing agencies',
    price: 349,
    features: [
      '5 seats included',
      'Unlimited saved searches',
      '50 AI credits/month',
      'Chat Q&A functionality',
      'Win-rate dashboard',
      'Role permissions'
    ],
    limits: {
      seats: 5,
      savedFilters: -1, // Unlimited
      savedSearches: -1,
      aiCreditsPerMonth: 50,
      aiCredits: 50,
      matchScoreCalculations: 500
    }
  },
  ENTERPRISE: {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'Custom solution for large organizations',
    price: 0, // Custom pricing
    features: [
      'Custom seats',
      'Custom AI credits',
      'All features included',
      'BI connector',
      'SSO/SAML',
      'GovCloud option'
    ],
    limits: {
      seats: -1, // Unlimited
      savedFilters: -1,
      savedSearches: -1,
      aiCreditsPerMonth: -1,
      aiCredits: -1,
      matchScoreCalculations: -1
    }
  }
} as const

export type DefaultPlanType = keyof typeof DEFAULT_PLANS