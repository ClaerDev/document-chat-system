/**
 * Comprehensive TypeScript interfaces for Organization-related data structures
 * Provides type safety for organization settings, features, and analytics
 */

// =============================================
// ORGANIZATION SETTINGS
// =============================================

export interface AIFeaturesSettings {
  // AI Provider Preferences
  preferredProvider?: 'openai' | 'anthropic' | 'google' | 'azure'
  fallbackProviders?: string[]
  
  // Cost Controls
  monthlyBudget?: number
  costAlerts?: {
    enabled: boolean
    thresholds: number[] // Alert at these percentages of budget
    recipients: string[] // Email addresses
  }
  
  // Quality Settings
  preferredModels?: {
    chat: string
    analysis: string
    embedding: string
  }
  
  // Feature Toggles
  enableSmartRouting?: boolean
  enableCaching?: boolean
  enableAnalytics?: boolean
  enableA11yFeatures?: boolean
}

export interface NotificationSettings {
  // Email Notifications
  emailNotifications?: {
    enabled: boolean
    frequency: 'immediate' | 'hourly' | 'daily' | 'weekly'
    types: string[] // Types of notifications to send
  }
  
  // In-App Notifications
  inAppNotifications?: {
    enabled: boolean
    showToasts: boolean
    playSounds: boolean
  }
  
  // Digest Settings
  digestSettings?: {
    enabled: boolean
    frequency: 'daily' | 'weekly' | 'monthly'
    time: string // HH:MM format
    timezone: string
  }
}

export interface SecuritySettings {
  // Access Controls
  requireMFA?: boolean
  sessionTimeout?: number // Minutes
  allowedIPs?: string[] // IP whitelist
  
  // Data Protection
  encryptSensitiveData?: boolean
  dataRetentionDays?: number
  autoDeleteInactive?: boolean
  
  // Audit Settings
  auditLogging?: {
    enabled: boolean
    logLevel: 'basic' | 'detailed' | 'verbose'
    retentionDays: number
  }
}

export interface BillingSettings {
  // Payment Information
  defaultPaymentMethod?: string
  billingEmail?: string
  invoiceDelivery?: 'email' | 'portal' | 'both'
  
  // Billing Preferences
  billingCycle?: 'monthly' | 'yearly'
  autoRenew?: boolean
  
  // Usage Alerts
  usageAlerts?: {
    enabled: boolean
    thresholds: Array<{
      metric: string
      percentage: number
      action: 'notify' | 'throttle' | 'block'
    }>
  }
}

export interface IntegrationSettings {
  // External Systems
  samGovSync?: {
    enabled: boolean
    autoSync: boolean
    syncFrequency: 'daily' | 'weekly' | 'monthly'
    lastSyncAt?: string
  }
  
  // CRM Integration
  crmIntegration?: {
    provider: 'salesforce' | 'hubspot' | 'pipedrive' | 'custom'
    enabled: boolean
    syncBidirectional: boolean
    fieldMappings: Record<string, string>
  }
  
  // Email Integration
  emailIntegration?: {
    provider: 'gmail' | 'outlook' | 'custom'
    enabled: boolean
    autoClassify: boolean
  }
}

export interface OrganizationSettings {
  aiFeatures?: AIFeaturesSettings
  notifications?: NotificationSettings
  security?: SecuritySettings
  billing?: BillingSettings
  integrations?: IntegrationSettings
  
  // General Settings
  timezone?: string
  dateFormat?: 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD'
  currency?: 'USD' | 'EUR' | 'GBP' | 'CAD'
  
  // UI/UX Preferences
  theme?: 'light' | 'dark' | 'auto'
  sidebarCollapsed?: boolean
  defaultDashboard?: string
  
  // Advanced Settings
  customFields?: Array<{
    name: string
    type: 'text' | 'number' | 'date' | 'boolean' | 'select'
    options?: string[]
    required?: boolean
  }>
}

// =============================================
// ORGANIZATION FEATURES
// =============================================

export interface PlanFeatures {
  // Core Features
  maxUsers: number
  maxProfiles: number
  maxOpportunities: number
  maxDocuments: number
  storageGB: number
  
  // AI Features
  aiRequests: number // Per month
  advancedAI: boolean
  customModels: boolean
  
  // Analysis Features
  opportunityMatching: boolean
  advancedAnalytics: boolean
  customReports: boolean
  competitiveAnalysis: boolean
  
  // Integration Features
  apiAccess: boolean
  webhooks: boolean
  samGovSync: boolean
  crmIntegration: boolean
  
  // Support Features
  supportLevel: 'community' | 'email' | 'priority' | 'dedicated'
  sla: string // e.g., "99.9% uptime"
}

export interface FeatureFlags {
  // Beta Features
  betaOpportunityPrediction?: boolean
  betaAIProposalReview?: boolean
  betaCompetitorAnalysis?: boolean
  
  // A/B Test Features
  newDashboardDesign?: boolean
  enhancedFiltering?: boolean
  improvedMatching?: boolean
  
  // Organization-specific Features
  customBranding?: boolean
  whiteLabeling?: boolean
  apiRateLimitBypass?: boolean
  
  // Experimental Features
  experimentalAI?: boolean
  experimentalIntegrations?: boolean
  experimentalReporting?: boolean
}

export interface OrganizationFeatures {
  plan: PlanFeatures
  flags: FeatureFlags
  customizations?: {
    logo?: string
    primaryColor?: string
    secondaryColor?: string
    customCSS?: string
  }
}

// =============================================
// ORGANIZATION ANALYTICS
// =============================================

export interface UsageMetrics {
  // User Activity
  activeUsers: {
    daily: number
    weekly: number
    monthly: number
  }
  
  // Feature Usage
  featureUsage: Record<string, {
    usageCount: number
    uniqueUsers: number
    lastUsed: string
  }>
  
  // API Usage
  apiCalls: {
    total: number
    successful: number
    failed: number
    averageResponseTime: number
  }
  
  // Storage Usage
  storage: {
    used: number // GB
    limit: number // GB
    documents: number
    profiles: number
  }
}

export interface BillingMetrics {
  // Current Period
  currentPeriod: {
    start: string
    end: string
    usage: Record<string, number>
    cost: number
    projectedCost: number
  }
  
  // Historical Data
  historicalUsage: Array<{
    period: string
    usage: Record<string, number>
    cost: number
  }>
  
  // Cost Breakdown
  costBreakdown: Array<{
    category: string
    amount: number
    percentage: number
  }>
}

export interface PerformanceMetrics {
  // Success Rates
  opportunityMatchAccuracy: number
  proposalSuccessRate: number
  userSatisfactionScore: number
  
  // Response Times
  avgResponseTime: number
  p95ResponseTime: number
  uptime: number
  
  // Error Rates
  errorRate: number
  timeoutRate: number
  retryRate: number
}

export interface OrganizationAnalytics {
  usage: UsageMetrics
  billing: BillingMetrics
  performance: PerformanceMetrics
  
  // Insights
  insights: Array<{
    type: 'opportunity' | 'cost' | 'performance' | 'usage'
    priority: 'high' | 'medium' | 'low'
    title: string
    description: string
    recommendation?: string
    metric?: {
      current: number
      target: number
      trend: 'up' | 'down' | 'stable'
    }
  }>
  
  // Benchmarks
  benchmarks?: {
    industryAverage: Record<string, number>
    percentile: number
    rank?: number
  }
}

// =============================================
// SUBSCRIPTION DETAILS
// =============================================

export interface SubscriptionDetails {
  id: string
  stripeSubscriptionId: string
  stripePriceId: string
  stripeCustomerId: string
  
  // Plan Information
  planType: 'STARTER' | 'PROFESSIONAL' | 'AGENCY' | 'ENTERPRISE'
  status: 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'UNPAID'
  
  // Billing Cycle
  currentPeriodStart: Date
  currentPeriodEnd: Date
  cancelAtPeriodEnd: boolean
  canceledAt?: Date
  
  // Trial Information
  trialStart?: Date
  trialEnd?: Date
  
  // Pricing
  amount: number // in cents
  currency: string
  interval: 'month' | 'year'
  
  // Features and Limits
  features: PlanFeatures
  limits: Record<string, number>
  
  // Usage Tracking
  currentUsage: Record<string, number>
  usageHistory: Array<{
    period: string
    usage: Record<string, number>
  }>
}

// =============================================
// ENHANCED ORGANIZATION INTERFACE
// =============================================

export interface EnhancedOrganization {
  id: string
  name: string
  slug: string
  createdAt: Date
  updatedAt: Date
  deletedAt?: Date

  // Billing Information
  stripeCustomerId?: string
  subscriptionStatus: 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'UNPAID'
  planType?: string
  billingEmail?: string

  // Properly typed settings and features
  settings: OrganizationSettings
  features: OrganizationFeatures
  
  // Enhanced data (when populated)
  subscription?: SubscriptionDetails
  analytics?: OrganizationAnalytics
  
  // Usage and Limits
  currentUsage?: Record<string, number>
  usageLimits?: Record<string, number>
  
  // Relations count (when needed)
  userCount?: number
  profileCount?: number
  documentCount?: number
  opportunityCount?: number
}

// =============================================
// TYPE GUARDS
// =============================================

export function isOrganizationSettings(obj: any): obj is OrganizationSettings {
  return obj && typeof obj === 'object'
}

export function isAIFeaturesSettings(obj: any): obj is AIFeaturesSettings {
  return obj && typeof obj === 'object'
}

export function isPlanFeatures(obj: any): obj is PlanFeatures {
  return obj && 
         typeof obj === 'object' && 
         typeof obj.maxUsers === 'number' &&
         typeof obj.opportunityMatching === 'boolean'
}

export function isSubscriptionDetails(obj: any): obj is SubscriptionDetails {
  return obj && 
         typeof obj === 'object' && 
         typeof obj.id === 'string' &&
         typeof obj.planType === 'string'
}

// =============================================
// HELPER FUNCTIONS
// =============================================

export function getFeatureLimit(
  organization: EnhancedOrganization, 
  feature: string
): number | undefined {
  return organization.features?.plan?.[feature as keyof PlanFeatures] as number
}

export function isFeatureEnabled(
  organization: EnhancedOrganization, 
  feature: string
): boolean {
  const planFeature = organization.features?.plan?.[feature as keyof PlanFeatures]
  const flagFeature = organization.features?.flags?.[feature as keyof FeatureFlags]
  
  return Boolean(planFeature || flagFeature)
}

export function getCurrentUsage(
  organization: EnhancedOrganization, 
  metric: string
): number {
  return organization.currentUsage?.[metric] || 0
}

export function getUsagePercentage(
  organization: EnhancedOrganization, 
  metric: string
): number {
  const current = getCurrentUsage(organization, metric)
  const limit = getFeatureLimit(organization, metric)
  
  if (!limit || limit === 0) return 0
  return Math.min(100, (current / limit) * 100)
}

export function isApproachingLimit(
  organization: EnhancedOrganization, 
  metric: string, 
  threshold: number = 80
): boolean {
  return getUsagePercentage(organization, metric) >= threshold
}

export function getRecommendedUpgrade(
  organization: EnhancedOrganization
): string | null {
  const currentPlan = organization.subscription?.planType
  
  // Check if approaching limits
  const criticalMetrics = ['maxUsers', 'maxDocuments', 'aiRequests']
  const approachingLimits = criticalMetrics.some(metric => 
    isApproachingLimit(organization, metric, 90)
  )
  
  if (approachingLimits) {
    switch (currentPlan) {
      case 'STARTER':
        return 'PROFESSIONAL'
      case 'PROFESSIONAL':
        return 'AGENCY'
      case 'AGENCY':
        return 'ENTERPRISE'
      default:
        return null
    }
  }
  
  return null
}