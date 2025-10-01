/**
 * External Data Integration Types
 * 
 * Universal interfaces for processing data from external sources with comprehensive
 * government data provider support:
 * 
 * - SAM.gov: Real-time federal contracting opportunities and entity management
 * - Grants.gov: Federal discretionary funding opportunities (5 main categories)
 * - FPDS-NG: Federal procurement data system with contract reporting (web services)
 * - USASpending.gov: Federal spending transparency and award history (RESTful API)
 * - HigherGov: Primary opportunity aggregator and intelligence platform
 * 
 * Uses global enums and leverages existing systems for consistency.
 * Enhanced with research-based metadata for all major government data providers.
 */

import { z } from 'zod'
import type {
  AwardType,
  AwardStatus,
  SourceSystem,
  OpportunityType,
} from './opportunity-enums'
import type {
  DataSourceId,
  LinkTypeId,
  NotificationChannelId,
} from './global-enums'
import type { SearchFilters } from './index'
import { CACHE_TTL } from '@/lib/cache/config'

// =============================================
// EXTERNAL CONTACT INTERFACE
// =============================================

/**
 * ExternalContact - Universal interface for contacts from external data sources
 * 
 * Designed for processing contacts from any external source without the mandatory
 * internal fields (id, organizationId, createdById) that might fail validation.
 * Used during data ingestion and transformation.
 */
export interface ExternalContact {
  // Basic Contact Information
  firstName?: string
  lastName?: string
  fullName?: string // Some sources provide complete name
  email?: string
  phone?: string
  fax?: string
  title?: string
  type?: string // Contact type/role (varies by source)

  // Additional Information
  additionalInfo?: {
    content?: string
  }[]

  // Address Information (from existing contacts.ts Address type)
  address?: {
    addressLine1?: string
    addressLine2?: string
    city?: string
    state?: string
    zipCode?: string
    country?: string
    mailStop?: string
    building?: string
    room?: string
    poBox?: string
  }
  
  // Office Address (SAM.gov format)
  officeAddress?: {
    zipcode?: string
    city?: string
    countryCode?: string
    state?: string
  }

  // Contact Source and Validation (using global DATA_SOURCE)
  source?: DataSourceId
  sourceId?: string // Original ID from source system
  confidence?: number // Data quality confidence (0-100)
  lastValidated?: Date | string
  validationNotes?: string

  // Computed fields (not stored in DB, used during processing)
  displayName?: string // Computed full name for display
  isValidated?: boolean // Whether contact info has been validated
  contactScore?: number // Internal scoring for contact quality
}

// =============================================
// LINK INTERFACE
// =============================================

/**
 * Link interface for various types of links from external sources
 * 
 * Handles attachments, resources, additional info links, and API links
 * from multiple data providers with a unified structure.
 * Uses global LINK_TYPE enum for consistency.
 */
export interface Link {
  title?: string
  type: LinkTypeId // Using global enum
  url: string
  description?: string
  icon?: string // Icon name or emoji for UI display
  
  // API-specific fields (for self-referential links, etc.)
  rel?: string // Relationship type (e.g., "self")
  hreflang?: string | null
  media?: string | null
  deprecation?: string | null
  
  // File metadata (for attachments)
  fileSize?: number
  fileType?: string
  lastModified?: Date | string
}

// =============================================
// AWARD INTERFACE
// =============================================

/**
 * Enhanced Award interface using our existing enums and ExternalContact
 * 
 * Comprehensive award information that can handle both historical
 * awards and current award data from multiple sources.
 */
export interface Award {
  // Award Identification
  number?: string // Award number
  
  // Award Classification (using our existing enums)
  type?: AwardType
  status?: AwardStatus
  
  // Award Details
  date?: Date | string // Award date
  amount?: number // Award amount
  
  // Awardee Information (using ExternalContact for flexibility)
  awardee?: ExternalContact & {
    name?: string // Company/organization name
    uei?: string // Unique Entity Identifier (for SAM.gov compatibility)
    duns?: string // Legacy DUNS number
    cageCode?: string // CAGE code
    
    // Enhanced location (for sources that provide structured location data)
    location?: {
      streetAddress?: string
      streetAddress2?: string
      city?: {
        code?: string
        name?: string
      }
      state?: {
        code?: string
        name?: string
      }
      country?: {
        code?: string
        name?: string
      }
      zip?: string
    }
  }
  
  // Award Performance
  performanceStartDate?: Date | string
  performanceEndDate?: Date | string
  
  // Additional Award Context
  contractNumber?: string // Associated contract number
  modificationNumber?: string // If this is a modification
  competitionType?: string
  procurementMethod?: string
  
  // Source Information (using our global SourceSystem)
  sourceSystem?: SourceSystem
  sourceId?: string
  lastSyncedAt?: Date | string
}

// =============================================
// DATA PROVIDER SYSTEM
// =============================================

/**
 * DataProvider interface for managing external data sources
 * 
 * Provides metadata and configuration for each major government data provider:
 * 
 * SAM.gov Features:
 * - Notice types: u(Justification), p(Pre-solicitation), a(Award), r(Sources Sought),
 *   s(Special Notice), o(Solicitation), g(Sale of Surplus), k(Combined Synopsis), i(Intent to Bundle)
 * - Set-aside types: SBA, SBP, 8A, 8AN, HZC, HZS, SDVOSBC, WOSB, EDWOSB, etc.
 * - Real-time opportunity feeds with comprehensive filtering
 * 
 * Grants.gov Features:
 * - 5 opportunity categories: Discretionary, Continuation, Mandatory, Earmark, Other
 * - RESTful APIs with modern search capabilities
 * - CFDA-based opportunity totals and status tracking
 * 
 * FPDS-NG Features:
 * - Contract reporting for awards ≥$10,000
 * - Web services (SOAP/XML) for procurement system integration
 * - Real-time federal enterprise information system
 * 
 * USASpending.gov Features:
 * - Award types: A/B/C/D (contracts), 02-11 (assistance), IDV types
 * - Transaction types with comprehensive spending categorization
 * - NAICS/PSC codes for detailed classification
 * 
 * Uses our existing OpportunityType enum for supportedOpportunityTypes.
 */
export interface DataProvider {
  // Basic Information
  id: string // Unique identifier (e.g., 'sam-gov', 'grants-gov')
  name: string // Display name
  description: string // Brief description
  
  // UI Assets
  logoUrl?: string // Provider logo
  iconUrl?: string // Small icon
  website?: string // Provider website
  documentationUrl?: string // API documentation
  statusPageUrl?: string // Status page URL
  supportUrl?: string // Support/help URL
  
  // Provider Status
  isActive: boolean // Whether provider is currently enabled
  isRealTime: boolean // Whether provider supports real-time data
  supportedOpportunityTypes: OpportunityType[] // Using our existing enum
  
  // Data Quality Metadata (research-based)
  reliability: number // Reliability score (0-100) - SAM.gov: 95, Grants.gov: 90, FPDS-NG: 92, USASpending: 88
  dataFreshness: string // How often data is updated - SAM.gov: 'real-time', Grants.gov: 'daily', FPDS-NG: '3-day', USASpending: 'daily'
  coverageScope: string // Geographic or sector coverage - All: 'Federal', SAM.gov: 'Active opportunities', Grants.gov: 'Discretionary funding'
  averageResponseTime: number // Average API response time in ms - SAM.gov: 500, Grants.gov: 800, FPDS-NG: 1200, USASpending: 600
  
  // Rate Limiting and API Info (provider-specific)
  rateLimit?: {
    requestsPerHour: number // SAM.gov: varies, Grants.gov: requires API key, FPDS-NG: enterprise, USASpending: public
    burstLimit?: number
    resetTime?: string // When rate limit resets
    costPerRequest?: number // Cost per API request (if applicable) - All government APIs: free
  }
  
  // Data Source Metrics
  metrics?: {
    totalOpportunities: number
    totalRecordsThisMonth: number
    avgResponseTime: number // milliseconds
    uptime: number // percentage
    lastSuccessfulSync?: Date | string
    errorRate: number // percentage of failed requests
  }
  
  // Provider Features (research-verified capabilities)
  features: {
    supportsSearch: boolean // All: true
    supportsFiltering: boolean // All: true (varying complexity)
    supportsPagination: boolean // All: true
    supportsRealTimeUpdates: boolean // SAM.gov: true, others: false
    supportsAuthentication: boolean // SAM.gov/FPDS-NG: enterprise, Grants.gov: API key, USASpending: public
    requiresApiKey: boolean // Grants.gov: true (for some endpoints), others: optional/enterprise
    supportsBulkDownload?: boolean // USASpending/FPDS-NG: true, SAM.gov: limited, Grants.gov: false
    supportsWebhooks?: boolean // SAM.gov: enterprise, others: false
    supportsAdvancedSearch?: boolean // All: true (varying capabilities)
    supportsHistoricalData?: boolean // USASpending/FPDS-NG: extensive, SAM.gov: limited, Grants.gov: archived
  }
}

/**
 * DataProviderConfiguration for managing sync behavior
 * 
 * Controls when and how we fetch data from each provider,
 * including caching, synchronization schedules, and data processing rules.
 * Leverages our existing global cache policy and notification systems.
 */
export interface DataProviderConfiguration {
  // Provider Reference
  providerId: string // References DataProvider.id
  organizationId: string // Organization-specific configuration
  
  // Synchronization Settings
  syncSchedule: {
    enabled: boolean
    frequency: 'real-time' | 'hourly' | 'daily' | 'weekly' | 'manual'
    cronExpression?: string // For custom schedules
    timezone?: string
    batchSize?: number // Number of records to process at once
  }
  
  // Caching Configuration (leverages global CACHE_TTL)
  caching: {
    enabled: boolean
    ttl: keyof typeof CACHE_TTL | number // Use global cache constants or custom value
    maxCacheSize?: number // Max items to cache
    cacheKey?: string // Custom cache key pattern
    invalidateOnUpdate?: boolean // Auto-invalidate when data changes
  }
  
  // Data Processing Rules
  processing: {
    autoNormalize: boolean // Auto-transform to internal format
    validateData: boolean // Run validation on incoming data
    deduplication: boolean // Remove duplicates
    enrichWithAI?: boolean // Enhance with AI analysis
    mergeStrategy: 'overwrite' | 'merge' | 'skip' // How to handle duplicate data
  }
  
  // Filtering and Transformation (extends our existing SearchFilters)
  filters?: SearchFilters & {
    // Additional provider-specific filters
    excludeArchived?: boolean
    minDataQuality?: number // 0-100
    customFilters?: Record<string, any> // Provider-specific filters
  }
  
  // Error Handling
  errorHandling: {
    maxRetries: number
    retryDelayMs: number
    exponentialBackoff: boolean
    timeoutMs: number
    fallbackBehavior: 'skip' | 'cache' | 'manual' // What to do on failure
    circuitBreakerThreshold: number // Failures before circuit breaker trips
  }
  
  // Notifications (uses global NOTIFICATION_CHANNEL)
  notifications: {
    syncSuccess: boolean // Notify on successful sync
    syncFailure: boolean // Notify on sync failure
    dataQualityIssues: boolean // Notify on data quality problems
    rateLimitWarnings: boolean // Notify when approaching rate limits
    channels: NotificationChannelId[] // Using global enum
    customWebhookUrl?: string // Custom webhook for notifications
  }
  
  // Security and Authentication
  authentication?: {
    apiKey?: string // Encrypted API key
    clientId?: string // OAuth client ID
    clientSecret?: string // Encrypted OAuth client secret
    tokenUrl?: string // OAuth token endpoint
    refreshToken?: string // Encrypted refresh token
    tokenExpiresAt?: Date
  }
  
  // System Metadata
  createdAt: Date | string
  updatedAt: Date | string
  lastSyncAttempt?: Date | string
  lastSuccessfulSync?: Date | string
  isEnabled: boolean
  createdBy: string // User ID who created this configuration
  updatedBy?: string // User ID who last updated this configuration
}

// =============================================
// DATA TRANSFORMATION INTERFACES
// =============================================

/**
 * Interface for data transformation results
 */
export interface DataTransformationResult<T> {
  success: boolean
  data?: T
  errors?: string[]
  warnings?: string[]
  skippedRecords?: number
  duplicatesFound?: number
  metadata?: {
    source: SourceSystem
    transformedAt: Date
    originalFormat: string
    dataQuality: number // 0-100 score
    processingTime: number // milliseconds
    recordsProcessed: number
  }
}

/**
 * Generic external opportunity data before transformation
 */
export interface ExternalOpportunityData {
  // Source metadata
  sourceSystem: SourceSystem
  sourceId: string
  sourceUrl?: string
  lastSyncedAt: Date | string
  dataHash?: string // For detecting changes
  
  // Raw data (varies by provider)
  rawData: Record<string, any>
  
  // Normalized fields (post-transformation)
  title?: string
  description?: string
  solicitationNumber?: string
  
  // Data quality indicators
  confidence?: number // 0-100 confidence in data accuracy
  completeness?: number // 0-100 percentage of required fields present
  
  // Provider-specific fields will be transformed to our standard format
}

// =============================================
// SEARCH AND FILTERING
// =============================================

/**
 * Enhanced search filters with data provider support
 * Extends our existing SearchFilters interface
 */
export interface EnhancedSearchFilters extends SearchFilters {
  // Data Provider Filtering
  dataProviders?: string[] // Filter by specific providers
  excludeProviders?: string[] // Exclude specific providers
  dataFreshness?: 'realtime' | 'today' | 'week' | 'month' // How recent the data should be
  
  // Data Quality Filtering
  minDataQuality?: number // Minimum data quality score (0-100)
  minCompleteness?: number // Minimum data completeness score (0-100)
  verifiedOnly?: boolean // Only show verified/validated opportunities
  
  // Source-specific filtering
  sourceReliability?: number // Minimum source reliability score (0-100)
  excludeTestData?: boolean // Exclude test/demo data
  
  // Frontend-specific filters (not sent to external APIs)
  postedFrom?: Date | string
  postedTo?: Date | string
}

// =============================================
// SYNC MANAGEMENT
// =============================================

/**
 * Sync job status and management
 */
export interface SyncJob {
  id: string
  organizationId: string
  providerId: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  
  // Job Details
  startedAt?: Date
  completedAt?: Date
  recordsProcessed: number
  recordsSuccess: number
  recordsFailed: number
  recordsSkipped: number
  
  // Error Information
  errors?: string[]
  warnings?: string[]
  
  // Progress Tracking
  progress?: {
    currentStep: string
    totalSteps: number
    currentStepProgress: number // 0-100
  }
  
  // Metadata
  triggeredBy: 'manual' | 'scheduled' | 'webhook' | 'api'
  triggeredByUserId?: string
  configurationSnapshot?: Partial<DataProviderConfiguration>
}

// =============================================
// ZOD VALIDATION SCHEMAS
// =============================================

/**
 * Zod schemas for validation
 */

export const ExternalContactSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  fullName: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  fax: z.string().optional(),
  title: z.string().optional(),
  type: z.string().optional(),
  
  additionalInfo: z.array(z.object({
    content: z.string().optional(),
  })).optional(),
  
  address: z.object({
    addressLine1: z.string().optional(),
    addressLine2: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zipCode: z.string().optional(),
    country: z.string().optional(),
    mailStop: z.string().optional(),
    building: z.string().optional(),
    room: z.string().optional(),
    poBox: z.string().optional(),
  }).optional(),
  
  source: z.string().optional(),
  sourceId: z.string().optional(),
  confidence: z.number().min(0).max(100).optional(),
  lastValidated: z.union([z.date(), z.string()]).optional(),
  validationNotes: z.string().optional(),
  
  // Computed fields
  displayName: z.string().optional(),
  isValidated: z.boolean().optional(),
  contactScore: z.number().min(0).max(100).optional(),
})

export const LinkSchema = z.object({
  title: z.string().optional(),
  type: z.string(),
  url: z.string().url(),
  description: z.string().optional(),
  icon: z.string().optional(),
  
  rel: z.string().optional(),
  hreflang: z.string().nullable().optional(),
  media: z.string().nullable().optional(),
  deprecation: z.string().nullable().optional(),
  
  fileSize: z.number().optional(),
  fileType: z.string().optional(),
  lastModified: z.union([z.date(), z.string()]).optional(),
})

export const DataProviderConfigurationSchema = z.object({
  providerId: z.string(),
  organizationId: z.string(),
  
  syncSchedule: z.object({
    enabled: z.boolean(),
    frequency: z.enum(['real-time', 'hourly', 'daily', 'weekly', 'manual']),
    cronExpression: z.string().optional(),
    timezone: z.string().optional(),
    batchSize: z.number().positive().optional(),
  }),
  
  caching: z.object({
    enabled: z.boolean(),
    ttl: z.union([z.string(), z.number().positive()]),
    maxCacheSize: z.number().positive().optional(),
    cacheKey: z.string().optional(),
    invalidateOnUpdate: z.boolean().optional(),
  }),
  
  processing: z.object({
    autoNormalize: z.boolean(),
    validateData: z.boolean(),
    deduplication: z.boolean(),
    enrichWithAI: z.boolean().optional(),
    mergeStrategy: z.enum(['overwrite', 'merge', 'skip']),
  }),
  
  errorHandling: z.object({
    maxRetries: z.number().min(0).max(10),
    retryDelayMs: z.number().positive(),
    exponentialBackoff: z.boolean(),
    timeoutMs: z.number().positive(),
    fallbackBehavior: z.enum(['skip', 'cache', 'manual']),
    circuitBreakerThreshold: z.number().min(1),
  }),
  
  notifications: z.object({
    syncSuccess: z.boolean(),
    syncFailure: z.boolean(),
    dataQualityIssues: z.boolean(),
    rateLimitWarnings: z.boolean(),
    channels: z.array(z.string()),
    customWebhookUrl: z.string().url().optional(),
  }),
  
  isEnabled: z.boolean(),
  createdBy: z.string(),
  updatedBy: z.string().optional(),
})

// =============================================
// EXPORT ALL TYPES
// =============================================

// All interfaces are already exported by their declarations above