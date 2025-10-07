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
    description: 'Perfect for individuals getting started',
    price: 49, // In dollars (will be converted to cents)
    features: [
      '1 seat included',
      'Upload up to 10 documents/month',
      'Basic document processing',
      'AI-powered chat',
      'Email support'
    ],
    limits: {
      seats: 1,
      documentsPerMonth: 10,
      aiCreditsPerMonth: 0,
      aiCredits: 0, // Alias for aiCreditsPerMonth
      storageGB: 1
    }
  },
  PROFESSIONAL: {
    id: 'pro',
    name: 'Pro',
    description: 'Advanced features for professionals',
    price: 149,
    features: [
      '1 seat included',
      'Upload up to 100 documents/month',
      '50 AI credits/month',
      'Advanced document analysis',
      'Export capabilities',
      'Priority support'
    ],
    limits: {
      seats: 1,
      documentsPerMonth: 100,
      aiCreditsPerMonth: 50,
      aiCredits: 50,
      storageGB: 10
    }
  },
  AGENCY: {
    id: 'agency',
    name: 'Team',
    description: 'Team collaboration for growing organizations',
    price: 349,
    features: [
      '5 seats included',
      'Unlimited document uploads',
      '200 AI credits/month',
      'Advanced document analysis',
      'Team folders and sharing',
      'Priority support'
    ],
    limits: {
      seats: 5,
      documentsPerMonth: -1, // Unlimited
      aiCreditsPerMonth: 200,
      aiCredits: 200,
      storageGB: 50
    }
  },
  ENTERPRISE: {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'Custom solution for large organizations',
    price: 0, // Custom pricing
    features: [
      'Unlimited seats',
      'Unlimited documents',
      'Unlimited AI credits',
      'All features included',
      'Custom integrations',
      'SSO/SAML',
      'Dedicated support',
      'SLA guarantee'
    ],
    limits: {
      seats: -1, // Unlimited
      documentsPerMonth: -1,
      aiCreditsPerMonth: -1,
      aiCredits: -1,
      storageGB: -1
    }
  }
} as const

export type DefaultPlanType = keyof typeof DEFAULT_PLANS