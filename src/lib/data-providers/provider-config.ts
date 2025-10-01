/**
 * Data Provider Configuration Management
 * 
 * Utilities for managing data provider configurations with research-based defaults
 * and intelligent routing based on provider capabilities and reliability.
 * 
 * This module provides:
 * - Default configurations for each provider based on their documented capabilities
 * - Intelligent provider selection based on use case
 * - Configuration validation and optimization
 * - Provider health monitoring and circuit breaker logic
 */

import type { DataProviderConfiguration } from '@/types/external-data'
import { SourceSystem, OpportunityType } from '@/types/opportunity-enums'
import { CACHE_TTL } from '@/lib/cache/config'
import { 
  DATA_PROVIDERS, 
  PROVIDER_RELIABILITY_TIERS,
  getProviderMetadata,
  getProvidersByOpportunityType 
} from './provider-metadata'

// =============================================
// DEFAULT CONFIGURATIONS
// =============================================

/**
 * Research-based default configurations for each provider
 * Based on documented capabilities, rate limits, and best practices
 */
export const DEFAULT_PROVIDER_CONFIGS: Record<SourceSystem, Partial<DataProviderConfiguration>> = {
  [SourceSystem.SAM_GOV]: {
    syncSchedule: {
      enabled: true,
      frequency: 'hourly', // Real-time capable but hourly is efficient
      batchSize: 100, // Reasonable batch size for API limits
    },
    caching: {
      enabled: true,
      ttl: CACHE_TTL.OPPORTUNITIES, // Use global opportunity cache TTL
      maxCacheSize: 5000,
      invalidateOnUpdate: true,
    },
    processing: {
      autoNormalize: true,
      validateData: true,
      deduplication: true,
      enrichWithAI: true, // High-quality data suitable for AI enhancement
      mergeStrategy: 'merge', // Merge with existing data
    },
    errorHandling: {
      maxRetries: 3,
      retryDelayMs: 5000,
      exponentialBackoff: true,
      timeoutMs: 10000, // 10 second timeout for government APIs
      fallbackBehavior: 'cache',
      circuitBreakerThreshold: 5,
    },
    notifications: {
      syncSuccess: false, // Don't spam on successful syncs
      syncFailure: true,
      dataQualityIssues: true,
      rateLimitWarnings: true,
      channels: ['EMAIL'], // Default to email notifications
    },
  },

  [SourceSystem.GRANTS_GOV]: {
    syncSchedule: {
      enabled: true,
      frequency: 'daily', // Daily updates align with their data refresh
      batchSize: 50, // More conservative batch size due to API key requirements
    },
    caching: {
      enabled: true,
      ttl: CACHE_TTL.OPPORTUNITIES,
      maxCacheSize: 2000,
      invalidateOnUpdate: true,
    },
    processing: {
      autoNormalize: true,
      validateData: true,
      deduplication: true,
      enrichWithAI: false, // Grant data might need special handling
      mergeStrategy: 'merge',
    },
    errorHandling: {
      maxRetries: 2, // Lower retries due to API key limits
      retryDelayMs: 10000,
      exponentialBackoff: true,
      timeoutMs: 15000, // Longer timeout for grants API
      fallbackBehavior: 'cache',
      circuitBreakerThreshold: 3,
    },
    notifications: {
      syncSuccess: false,
      syncFailure: true,
      dataQualityIssues: true,
      rateLimitWarnings: true,
      channels: ['EMAIL'],
    },
  },

  [SourceSystem.FPDS_NG]: {
    syncSchedule: {
      enabled: true,
      frequency: 'daily', // 3-day reporting requirement, daily sync is sufficient
      batchSize: 25, // Conservative due to SOAP/XML overhead
    },
    caching: {
      enabled: true,
      ttl: CACHE_TTL.AWARDS, // Use awards cache TTL for historical data
      maxCacheSize: 10000, // Large cache for historical contract data
      invalidateOnUpdate: false, // Historical data doesn't change frequently
    },
    processing: {
      autoNormalize: true,
      validateData: true,
      deduplication: true,
      enrichWithAI: false, // Complex contract data might need custom processing
      mergeStrategy: 'overwrite', // FPDS is authoritative for contract awards
    },
    errorHandling: {
      maxRetries: 2, // SOAP services can be unreliable
      retryDelayMs: 15000,
      exponentialBackoff: true,
      timeoutMs: 30000, // Long timeout for SOAP/XML services
      fallbackBehavior: 'skip',
      circuitBreakerThreshold: 3,
    },
    notifications: {
      syncSuccess: false,
      syncFailure: true,
      dataQualityIssues: true,
      rateLimitWarnings: false, // Enterprise system, less likely to hit limits
      channels: ['EMAIL'],
    },
  },

  [SourceSystem.USA_SPENDING]: {
    syncSchedule: {
      enabled: true,
      frequency: 'daily', // Daily updates, comprehensive historical data
      batchSize: 200, // Higher batch size due to generous API limits
    },
    caching: {
      enabled: true,
      ttl: CACHE_TTL.AWARDS,
      maxCacheSize: 20000, // Large cache for spending data
      invalidateOnUpdate: false, // Historical spending data is stable
    },
    processing: {
      autoNormalize: true,
      validateData: true,
      deduplication: true,
      enrichWithAI: false, // Large datasets, might need selective AI enhancement
      mergeStrategy: 'merge',
    },
    errorHandling: {
      maxRetries: 3,
      retryDelayMs: 3000,
      exponentialBackoff: true,
      timeoutMs: 20000,
      fallbackBehavior: 'cache',
      circuitBreakerThreshold: 5,
    },
    notifications: {
      syncSuccess: false,
      syncFailure: true,
      dataQualityIssues: false, // Large datasets, expect some quality issues
      rateLimitWarnings: false, // Generous limits
      channels: ['EMAIL'],
    },
  },

  [SourceSystem.HIGHERGOV]: {
    syncSchedule: {
      enabled: true,
      frequency: 'real-time', // Real-time capable premium service
      batchSize: 500, // High batch size for premium API
    },
    caching: {
      enabled: true,
      ttl: CACHE_TTL.OPPORTUNITIES,
      maxCacheSize: 15000,
      invalidateOnUpdate: true,
    },
    processing: {
      autoNormalize: true,
      validateData: true,
      deduplication: true,
      enrichWithAI: true, // Premium service with high-quality data
      mergeStrategy: 'merge',
    },
    errorHandling: {
      maxRetries: 5, // Premium service should be reliable
      retryDelayMs: 2000,
      exponentialBackoff: true,
      timeoutMs: 8000,
      fallbackBehavior: 'cache',
      circuitBreakerThreshold: 7,
    },
    notifications: {
      syncSuccess: false,
      syncFailure: true,
      dataQualityIssues: true,
      rateLimitWarnings: true,
      channels: ['EMAIL', 'SLACK'], // Multiple channels for premium service
    },
  },
}

// =============================================
// INTELLIGENT PROVIDER SELECTION
// =============================================

/**
 * Provider selection strategies based on use case
 */
export enum ProviderSelectionStrategy {
  FASTEST = 'fastest',           // Prioritize fastest response times
  MOST_RELIABLE = 'most_reliable', // Prioritize highest reliability scores
  MOST_RECENT = 'most_recent',   // Prioritize most recent data
  COMPREHENSIVE = 'comprehensive', // Include all relevant providers
  COST_OPTIMIZED = 'cost_optimized', // Minimize API costs
}

/**
 * Select optimal providers for a given opportunity type and strategy
 */
export function selectOptimalProviders(
  opportunityType: OpportunityType,
  strategy: ProviderSelectionStrategy = ProviderSelectionStrategy.MOST_RELIABLE,
  maxProviders: number = 3
): SourceSystem[] {
  const eligibleProviders = getProvidersByOpportunityType(opportunityType)
    .map(provider => ({
      sourceSystem: Object.keys(DATA_PROVIDERS).find(
        key => DATA_PROVIDERS[key as SourceSystem] === provider
      ) as SourceSystem,
      provider,
    }))
    .filter(({ sourceSystem }) => sourceSystem)

  switch (strategy) {
    case ProviderSelectionStrategy.FASTEST:
      return eligibleProviders
        .sort((a, b) => a.provider.averageResponseTime - b.provider.averageResponseTime)
        .slice(0, maxProviders)
        .map(({ sourceSystem }) => sourceSystem)

    case ProviderSelectionStrategy.MOST_RELIABLE:
      return eligibleProviders
        .sort((a, b) => b.provider.reliability - a.provider.reliability)
        .slice(0, maxProviders)
        .map(({ sourceSystem }) => sourceSystem)

    case ProviderSelectionStrategy.MOST_RECENT:
      return eligibleProviders
        .filter(({ provider }) => provider.isRealTime)
        .sort((a, b) => b.provider.reliability - a.provider.reliability)
        .slice(0, maxProviders)
        .map(({ sourceSystem }) => sourceSystem)

    case ProviderSelectionStrategy.COMPREHENSIVE:
      return eligibleProviders
        .map(({ sourceSystem }) => sourceSystem)
        .slice(0, maxProviders)

    case ProviderSelectionStrategy.COST_OPTIMIZED:
      return eligibleProviders
        .filter(({ provider }) => !provider.rateLimit?.costPerRequest || provider.rateLimit.costPerRequest === 0)
        .sort((a, b) => b.provider.reliability - a.provider.reliability)
        .slice(0, maxProviders)
        .map(({ sourceSystem }) => sourceSystem)

    default:
      return eligibleProviders
        .slice(0, maxProviders)
        .map(({ sourceSystem }) => sourceSystem)
  }
}

// =============================================
// CONFIGURATION VALIDATION
// =============================================

/**
 * Validate provider configuration against provider capabilities
 */
export function validateProviderConfiguration(
  sourceSystem: SourceSystem,
  config: Partial<DataProviderConfiguration>
): { isValid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = []
  const warnings: string[] = []
  const provider = getProviderMetadata(sourceSystem)

  if (!provider) {
    errors.push(`Unknown provider: ${sourceSystem}`)
    return { isValid: false, errors, warnings }
  }

  // Validate sync frequency against provider capabilities
  if (config.syncSchedule?.frequency === 'real-time' && !provider.isRealTime) {
    errors.push(`Provider ${provider.name} does not support real-time updates`)
  }

  // Validate authentication requirements
  if (provider.features.requiresApiKey && !config.authentication?.apiKey) {
    warnings.push(`Provider ${provider.name} requires an API key for full functionality`)
  }

  // Validate batch sizes against rate limits
  if (config.syncSchedule?.batchSize && provider.rateLimit) {
    const batchSize = config.syncSchedule.batchSize
    const hourlyLimit = provider.rateLimit.requestsPerHour
    const batchesPerHour = hourlyLimit / batchSize

    if (batchesPerHour < 1) {
      warnings.push(`Batch size ${batchSize} may exceed hourly rate limit of ${hourlyLimit} requests`)
    }
  }

  // Validate timeout settings
  if (config.errorHandling?.timeoutMs) {
    const timeout = config.errorHandling.timeoutMs
    if (timeout < provider.averageResponseTime * 2) {
      warnings.push(`Timeout ${timeout}ms may be too short for average response time ${provider.averageResponseTime}ms`)
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  }
}

// =============================================
// CONFIGURATION OPTIMIZATION
// =============================================

/**
 * Optimize configuration based on provider characteristics and organizational needs
 */
export function optimizeProviderConfiguration(
  sourceSystem: SourceSystem,
  baseConfig: Partial<DataProviderConfiguration>,
  optimizationGoals: {
    prioritizeSpeed?: boolean
    minimizeCosts?: boolean
    maximizeReliability?: boolean
    minimizeApiCalls?: boolean
  } = {}
): Partial<DataProviderConfiguration> {
  const provider = getProviderMetadata(sourceSystem)
  const defaultConfig = DEFAULT_PROVIDER_CONFIGS[sourceSystem]
  
  if (!provider || !defaultConfig) {
    return baseConfig
  }

  const optimizedConfig = { ...defaultConfig, ...baseConfig }

  // Speed optimization
  if (optimizationGoals.prioritizeSpeed) {
    if (provider.isRealTime) {
      optimizedConfig.syncSchedule = {
        ...optimizedConfig.syncSchedule!,
        frequency: 'real-time',
      }
    }
    optimizedConfig.caching = {
      ...optimizedConfig.caching!,
      ttl: CACHE_TTL.SHORT, // Shorter cache for fresher data
    }
  }

  // Cost optimization
  if (optimizationGoals.minimizeCosts && provider.rateLimit?.costPerRequest) {
    optimizedConfig.syncSchedule = {
      ...optimizedConfig.syncSchedule!,
      frequency: 'daily', // Reduce sync frequency
      batchSize: Math.max(optimizedConfig.syncSchedule?.batchSize || 50, 100), // Larger batches
    }
  }

  // Reliability optimization
  if (optimizationGoals.maximizeReliability) {
    optimizedConfig.errorHandling = {
      ...optimizedConfig.errorHandling!,
      maxRetries: 5,
      exponentialBackoff: true,
      circuitBreakerThreshold: Math.max(optimizedConfig.errorHandling?.circuitBreakerThreshold || 3, 5),
    }
    optimizedConfig.caching = {
      ...optimizedConfig.caching!,
      ttl: CACHE_TTL.LONG, // Longer cache as fallback
    }
  }

  // API call minimization
  if (optimizationGoals.minimizeApiCalls) {
    optimizedConfig.syncSchedule = {
      ...optimizedConfig.syncSchedule!,
      frequency: 'weekly', // Reduce frequency
    }
    optimizedConfig.caching = {
      ...optimizedConfig.caching!,
      ttl: CACHE_TTL.LONG,
      maxCacheSize: (optimizedConfig.caching?.maxCacheSize || 1000) * 2, // Larger cache
    }
  }

  return optimizedConfig
}

// =============================================
// PROVIDER HEALTH MONITORING
// =============================================

/**
 * Provider health status
 */
export interface ProviderHealth {
  sourceSystem: SourceSystem
  isHealthy: boolean
  lastCheckAt: Date
  responseTime: number
  errorRate: number
  consecutiveFailures: number
  circuitBreakerOpen: boolean
  nextRetryAt?: Date
}

/**
 * Check if a provider should be used based on circuit breaker logic
 */
export function isProviderAvailable(health: ProviderHealth): boolean {
  if (health.circuitBreakerOpen) {
    // Circuit breaker is open, check if we should try again
    if (health.nextRetryAt && health.nextRetryAt <= new Date()) {
      return true // Time to retry
    }
    return false // Circuit still open
  }
  
  return health.isHealthy
}

/**
 * Calculate next retry time using exponential backoff
 */
export function calculateNextRetryTime(
  consecutiveFailures: number,
  baseDelayMs: number = 60000 // 1 minute base delay
): Date {
  const maxDelayMs = 30 * 60 * 1000 // 30 minutes max
  const delayMs = Math.min(baseDelayMs * Math.pow(2, consecutiveFailures), maxDelayMs)
  return new Date(Date.now() + delayMs)
}

// =============================================
// PROVIDER SELECTION RECOMMENDATIONS
// =============================================

/**
 * Get recommended providers for different use cases
 */
export const PROVIDER_RECOMMENDATIONS = {
  // Real-time opportunity monitoring
  REAL_TIME_MONITORING: {
    primary: [SourceSystem.SAM_GOV, SourceSystem.HIGHERGOV],
    fallback: [SourceSystem.GRANTS_GOV],
    strategy: ProviderSelectionStrategy.MOST_RECENT,
  },

  // Historical research and analysis
  HISTORICAL_RESEARCH: {
    primary: [SourceSystem.FPDS_NG, SourceSystem.USA_SPENDING],
    fallback: [SourceSystem.SAM_GOV],
    strategy: ProviderSelectionStrategy.COMPREHENSIVE,
  },

  // Grant opportunity discovery
  GRANT_DISCOVERY: {
    primary: [SourceSystem.GRANTS_GOV],
    fallback: [SourceSystem.USA_SPENDING, SourceSystem.HIGHERGOV],
    strategy: ProviderSelectionStrategy.MOST_RELIABLE,
  },

  // Contract opportunity discovery
  CONTRACT_DISCOVERY: {
    primary: [SourceSystem.SAM_GOV, SourceSystem.HIGHERGOV],
    fallback: [SourceSystem.USA_SPENDING],
    strategy: ProviderSelectionStrategy.MOST_RELIABLE,
  },

  // Cost-conscious monitoring
  BUDGET_CONSCIOUS: {
    primary: [SourceSystem.SAM_GOV, SourceSystem.GRANTS_GOV, SourceSystem.USA_SPENDING],
    fallback: [SourceSystem.FPDS_NG],
    strategy: ProviderSelectionStrategy.COST_OPTIMIZED,
  },
} as const

export type RecommendationType = keyof typeof PROVIDER_RECOMMENDATIONS