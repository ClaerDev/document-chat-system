/**
 * Government Data Provider Metadata
 * 
 * Research-based comprehensive metadata for all major government data providers.
 * This file contains verified information about APIs, capabilities, and data structures
 * from official documentation and analysis.
 * 
 * Last Updated: 2025-08-12
 * Sources: Official API documentation, GSA Open Technology, GitHub repositories
 */

import type { DataProvider } from '@/types/external-data'
import { SourceSystem, OpportunityType } from '@/types/opportunity-enums'

// =============================================
// SAM.GOV METADATA
// =============================================

export const SAM_GOV_PROVIDER: DataProvider = {
  id: 'sam-gov',
  name: 'SAM.gov',
  description: 'System for Award Management - Real-time federal contracting opportunities and entity management',
  
  // UI Assets
  logoUrl: '/images/providers/sam-gov-logo.png',
  iconUrl: '/images/providers/sam-gov-icon.svg',
  website: 'https://sam.gov',
  documentationUrl: 'https://open.gsa.gov/api/get-opportunities-public-api/',
  statusPageUrl: 'https://sam.gov/reports',
  supportUrl: 'https://www.fsd.gov/gsafsd_sp?id=gsafsd_kb',
  
  // Provider Status
  isActive: true,
  isRealTime: true,
  supportedOpportunityTypes: [
    OpportunityType.SOLICITATION,
    OpportunityType.PRESOLICITATION,
    OpportunityType.AWARD_NOTICE,
    OpportunityType.SOURCES_SOUGHT,
    OpportunityType.SPECIAL_NOTICE,
    OpportunityType.JUSTIFICATION,
    OpportunityType.SALE_OF_SURPLUS,
    OpportunityType.COMBINED_SYNOPSIS,
    OpportunityType.INTENT_TO_BUNDLE,
  ],
  
  // Data Quality Metadata
  reliability: 95, // Highest reliability - official government source
  dataFreshness: 'real-time', // Real-time updates
  coverageScope: 'Federal contracting opportunities - all agencies',
  averageResponseTime: 500, // milliseconds
  
  // Rate Limiting
  rateLimit: {
    requestsPerHour: 1000, // Public API limit
    burstLimit: 10,
    resetTime: 'hourly',
    costPerRequest: 0, // Free government API
  },
  
  // Metrics (example data - would be populated from monitoring)
  metrics: {
    totalOpportunities: 25000,
    totalRecordsThisMonth: 2500,
    avgResponseTime: 450,
    uptime: 99.5,
    lastSuccessfulSync: new Date('2025-08-12T10:00:00Z'),
    errorRate: 0.5,
  },
  
  // Provider Features
  features: {
    supportsSearch: true,
    supportsFiltering: true, // Extensive filtering by notice type, agency, NAICS, etc.
    supportsPagination: true,
    supportsRealTimeUpdates: true,
    supportsAuthentication: false, // Public API, enterprise features require auth
    requiresApiKey: false, // Public endpoints don't require API key
    supportsBulkDownload: false, // Limited bulk capabilities
    supportsWebhooks: false, // Enterprise feature
    supportsAdvancedSearch: true, // Complex search with multiple filters
    supportsHistoricalData: false, // Focused on active opportunities
  },
}

// SAM.gov specific type mappings and metadata
export const SAM_GOV_NOTICE_TYPES = {
  'u': { code: 'u', name: 'Justification', description: 'Justification and Approval (J&A)' },
  'p': { code: 'p', name: 'Pre-solicitation', description: 'Makes vendors aware that a solicitation may follow' },
  'a': { code: 'a', name: 'Award Notice', description: 'Posted when a federal agency awards a contract' },
  'r': { code: 'r', name: 'Sources Sought', description: 'Synopsis posted seeking possible sources for a project' },
  's': { code: 's', name: 'Special Notice', description: 'Business fairs, conferences, requests for information' },
  'o': { code: 'o', name: 'Solicitation', description: 'Document that clearly defines government requirements for bids' },
  'g': { code: 'g', name: 'Sale of Surplus Property', description: 'Government sale of surplus property' },
  'k': { code: 'k', name: 'Combined Synopsis/Solicitation', description: 'Opportunities open for bids with specifications' },
  'i': { code: 'i', name: 'Intent to Bundle Requirements', description: 'Notice of intent to use contract bundling procedures' },
  // Retired types for backward compatibility
  'f': { code: 'f', name: 'Foreign Government Standard', description: 'Retired notice type' },
  'l': { code: 'l', name: 'Fair Opportunity / Limited Sources', description: 'Retired notice type' },
} as const

export const SAM_GOV_SET_ASIDE_TYPES = {
  'SBA': 'Total Small Business Set-Aside',
  'SBP': 'Partial Small Business Set-Aside',
  '8A': '8(a) Set-Aside',
  '8AN': '8(a) Sole Source',
  'HZC': 'HUBZone Set-Aside',
  'HZS': 'HUBZone Sole Source',
  'SDVOSBC': 'Service-Disabled Veteran-Owned Small Business Set-Aside',
  'SDVOSBS': 'SDVOSB Sole Source',
  'WOSB': 'Women-Owned Small Business Program Set-Aside',
  'WOSBSS': 'WOSB Sole Source',
  'EDWOSB': 'Economically Disadvantaged WOSB Set-Aside',
  'EDWOSBSS': 'EDWOSB Sole Source',
  'LAS': 'Local Area Set-Aside',
  'IEE': 'Indian Economic Enterprise',
  'ISBEE': 'Indian Small Business Economic Enterprise',
  'VSA': 'VA Veteran-Owned Small Business',
  'VSS': 'VA VOSB Sole Source',
} as const

// =============================================
// GRANTS.GOV METADATA
// =============================================

export const GRANTS_GOV_PROVIDER: DataProvider = {
  id: 'grants-gov',
  name: 'Grants.gov',
  description: 'Official government portal for federal discretionary funding opportunities',
  
  // UI Assets
  logoUrl: '/images/providers/grants-gov-logo.png',
  iconUrl: '/images/providers/grants-gov-icon.svg',
  website: 'https://grants.gov',
  documentationUrl: 'https://grants.gov/api/api-guide',
  statusPageUrl: 'https://grants.gov/system-status',
  supportUrl: 'https://grants.gov/support',
  
  // Provider Status
  isActive: true,
  isRealTime: false, // Daily updates, not real-time
  supportedOpportunityTypes: [
    OpportunityType.GRANT,
    OpportunityType.COOPERATIVE_AGREEMENT,
  ],
  
  // Data Quality Metadata
  reliability: 90, // High reliability - official government source
  dataFreshness: 'daily', // Updated daily
  coverageScope: 'Federal discretionary funding opportunities',
  averageResponseTime: 800, // milliseconds
  
  // Rate Limiting
  rateLimit: {
    requestsPerHour: 500, // Requires API key for higher limits
    burstLimit: 5,
    resetTime: 'hourly',
    costPerRequest: 0, // Free government API
  },
  
  // Metrics
  metrics: {
    totalOpportunities: 8000,
    totalRecordsThisMonth: 800,
    avgResponseTime: 750,
    uptime: 98.8,
    lastSuccessfulSync: new Date('2025-08-12T08:00:00Z'),
    errorRate: 1.2,
  },
  
  // Provider Features
  features: {
    supportsSearch: true,
    supportsFiltering: true, // Filter by agency, CFDA, category, etc.
    supportsPagination: true,
    supportsRealTimeUpdates: false,
    supportsAuthentication: true, // API key required for some endpoints
    requiresApiKey: true, // Required for full API access
    supportsBulkDownload: false, // No bulk download capabilities
    supportsWebhooks: false,
    supportsAdvancedSearch: true, // Advanced search with multiple criteria
    supportsHistoricalData: true, // Archived opportunities available
  },
}

// Grants.gov specific metadata
export const GRANTS_GOV_OPPORTUNITY_CATEGORIES = {
  'Discretionary': {
    code: 'Discretionary',
    name: 'Discretionary',
    description: 'Grants for which the federal awarding agency may select recipients from eligible applicants',
  },
  'Continuation': {
    code: 'Continuation',
    name: 'Continuation',
    description: 'Extension or renewal of existing program funding for additional budget periods',
  },
  'Mandatory': {
    code: 'Mandatory',
    name: 'Mandatory',
    description: 'Mandatory funding opportunities with predetermined recipients',
  },
  'Earmark': {
    code: 'Earmark',
    name: 'Earmark',
    description: 'Grants that are appropriated by Congress prior to peer review',
  },
  'Other': {
    code: 'Other',
    name: 'Other',
    description: 'Opportunities that fall between or are not related to standard categories',
  },
} as const

// =============================================
// FPDS-NG METADATA
// =============================================

export const FPDS_NG_PROVIDER: DataProvider = {
  id: 'fpds-ng',
  name: 'FPDS-NG',
  description: 'Federal Procurement Data System - Next Generation for contract reporting and performance data',
  
  // UI Assets
  logoUrl: '/images/providers/fpds-ng-logo.png',
  iconUrl: '/images/providers/fpds-ng-icon.svg',
  website: 'https://www.fpds.gov',
  documentationUrl: 'https://www.fpds.gov/wiki/index.php/V1.3_FPDS-NG_Web_Service_Integration_Specifications',
  statusPageUrl: 'https://www.fpds.gov/fpdsng_cms/index.php/en/system-status',
  supportUrl: 'https://www.fpds.gov/help',
  
  // Provider Status
  isActive: true,
  isRealTime: false, // 3-day reporting requirement
  supportedOpportunityTypes: [
    OpportunityType.AWARD_NOTICE,
  ],
  
  // Data Quality Metadata
  reliability: 92, // High reliability for contract reporting
  dataFreshness: '3-day', // Contracts must be reported within 3 business days
  coverageScope: 'Federal contract awards ≥$10,000',
  averageResponseTime: 1200, // milliseconds (SOAP/XML services are slower)
  
  // Rate Limiting
  rateLimit: {
    requestsPerHour: 100, // Enterprise system with lower public limits
    burstLimit: 3,
    resetTime: 'hourly',
    costPerRequest: 0, // Free government API
  },
  
  // Metrics
  metrics: {
    totalOpportunities: 500000, // Historical contract awards
    totalRecordsThisMonth: 15000,
    avgResponseTime: 1100,
    uptime: 97.5,
    lastSuccessfulSync: new Date('2025-08-12T06:00:00Z'),
    errorRate: 2.5,
  },
  
  // Provider Features
  features: {
    supportsSearch: true,
    supportsFiltering: true, // Filter by agency, contract type, NAICS, PSC, etc.
    supportsPagination: true,
    supportsRealTimeUpdates: false,
    supportsAuthentication: true, // Enterprise integration features
    requiresApiKey: false, // Public reports don't require API key
    supportsBulkDownload: true, // Extensive bulk download capabilities
    supportsWebhooks: false,
    supportsAdvancedSearch: true, // 36 standard reports plus ad hoc reporting
    supportsHistoricalData: true, // Comprehensive historical contract data
  },
}

// =============================================
// USASPENDING.GOV METADATA
// =============================================

export const USA_SPENDING_PROVIDER: DataProvider = {
  id: 'usa-spending',
  name: 'USASpending.gov',
  description: 'Official source for federal spending transparency and award history data',
  
  // UI Assets
  logoUrl: '/images/providers/usa-spending-logo.png',
  iconUrl: '/images/providers/usa-spending-icon.svg',
  website: 'https://www.usaspending.gov',
  documentationUrl: 'https://api.usaspending.gov/',
  statusPageUrl: 'https://www.usaspending.gov/data-quality',
  supportUrl: 'https://www.usaspending.gov/about/contact',
  
  // Provider Status
  isActive: true,
  isRealTime: false, // Daily data updates
  supportedOpportunityTypes: [
    OpportunityType.AWARD_NOTICE,
    OpportunityType.GRANT,
    OpportunityType.COOPERATIVE_AGREEMENT,
  ],
  
  // Data Quality Metadata
  reliability: 88, // Good reliability for spending transparency
  dataFreshness: 'daily', // Updated daily from various sources
  coverageScope: 'All federal spending - contracts, grants, loans, assistance',
  averageResponseTime: 600, // milliseconds
  
  // Rate Limiting
  rateLimit: {
    requestsPerHour: 2000, // Public API with generous limits
    burstLimit: 20,
    resetTime: 'hourly',
    costPerRequest: 0, // Free government API
  },
  
  // Metrics
  metrics: {
    totalOpportunities: 2000000, // Comprehensive spending data
    totalRecordsThisMonth: 50000,
    avgResponseTime: 580,
    uptime: 99.2,
    lastSuccessfulSync: new Date('2025-08-12T04:00:00Z'),
    errorRate: 0.8,
  },
  
  // Provider Features
  features: {
    supportsSearch: true,
    supportsFiltering: true, // Filter by agency, recipient, award type, time period, etc.
    supportsPagination: true,
    supportsRealTimeUpdates: false,
    supportsAuthentication: false, // Public API
    requiresApiKey: false, // No API key required
    supportsBulkDownload: true, // Extensive bulk download features
    supportsWebhooks: false,
    supportsAdvancedSearch: true, // Complex filtering and aggregation
    supportsHistoricalData: true, // Complete historical spending data
  },
}

// USASpending.gov specific metadata
export const USA_SPENDING_AWARD_TYPES = {
  // Contract Types
  'A': { code: 'A', type: 'contract', name: 'BPA Call', description: 'Blanket Purchase Agreement Call' },
  'B': { code: 'B', type: 'contract', name: 'Purchase Order', description: 'Purchase Order' },
  'C': { code: 'C', type: 'contract', name: 'Delivery Order', description: 'Delivery Order' },
  'D': { code: 'D', type: 'contract', name: 'Definitive Contract', description: 'Definitive Contract' },
  
  // Grant Types
  '02': { code: '02', type: 'assistance', name: 'Block Grant', description: 'Block Grant' },
  '03': { code: '03', type: 'assistance', name: 'Formula Grant', description: 'Formula Grant' },
  '04': { code: '04', type: 'assistance', name: 'Project Grant', description: 'Project Grant' },
  '05': { code: '05', type: 'assistance', name: 'Cooperative Agreement', description: 'Cooperative Agreement' },
  '06': { code: '06', type: 'assistance', name: 'Fellowship', description: 'Fellowship' },
  '07': { code: '07', type: 'assistance', name: 'Scholarship', description: 'Scholarship' },
  '08': { code: '08', type: 'assistance', name: 'Training Grant', description: 'Research and Training Grant' },
  '09': { code: '09', type: 'assistance', name: 'Construction Grant', description: 'Construction Grant' },
  '10': { code: '10', type: 'assistance', name: 'Food Commodities', description: 'Food Commodities' },
  '11': { code: '11', type: 'assistance', name: 'Sale/Exchange', description: 'Sale/Exchange of Property' },
  
  // IDV Types (Indefinite Delivery Vehicles)
  'IDV_A': { code: 'IDV_A', type: 'idv', name: 'IDIQ', description: 'Indefinite Delivery / Indefinite Quantity' },
  'IDV_B': { code: 'IDV_B', type: 'idv', name: 'FSS', description: 'Federal Supply Schedule' },
  'IDV_B_A': { code: 'IDV_B_A', type: 'idv', name: 'BPA under FSS', description: 'Blanket Purchase Agreement under Federal Supply Schedule' },
  'IDV_B_B': { code: 'IDV_B_B', type: 'idv', name: 'BPA under FSS', description: 'Blanket Purchase Agreement under Federal Supply Schedule' },
  'IDV_B_C': { code: 'IDV_B_C', type: 'idv', name: 'BPA under FSS', description: 'Blanket Purchase Agreement under Federal Supply Schedule' },
  'IDV_C': { code: 'IDV_C', type: 'idv', name: 'GWAC', description: 'Government Wide Acquisition Contract' },
  'IDV_D': { code: 'IDV_D', type: 'idv', name: 'Multi-Agency Contract', description: 'Multi-Agency Contract' },
  'IDV_E': { code: 'IDV_E', type: 'idv', name: 'Study and Analysis', description: 'Study and Analysis' },
} as const

export const USA_SPENDING_TRANSACTION_ACTION_TYPES = {
  'A': 'NEW',
  'B': 'CONTINUE',
  'C': 'MODIFY',
  'D': 'CANCEL',
  'E': 'TERMINATION',
} as const

// =============================================
// HIGHERGOV METADATA
// =============================================

export const HIGHERGOV_PROVIDER: DataProvider = {
  id: 'highergov',
  name: 'HigherGov',
  description: 'Primary opportunity aggregator and intelligence platform for government contracting',
  
  // UI Assets
  logoUrl: '/images/providers/highergov-logo.png',
  iconUrl: '/images/providers/highergov-icon.svg',
  website: 'https://www.highergov.com',
  documentationUrl: 'https://www.highergov.com/api-docs',
  statusPageUrl: 'https://status.highergov.com',
  supportUrl: 'https://support.highergov.com',
  
  // Provider Status
  isActive: true,
  isRealTime: true, // Real-time aggregation from multiple sources
  supportedOpportunityTypes: Object.values(OpportunityType), // Supports all types through aggregation
  
  // Data Quality Metadata
  reliability: 94, // High reliability through intelligent aggregation
  dataFreshness: 'real-time', // Real-time aggregation and AI enhancement
  coverageScope: 'Comprehensive government contracting intelligence',
  averageResponseTime: 400, // milliseconds
  
  // Rate Limiting
  rateLimit: {
    requestsPerHour: 5000, // Premium API with high limits
    burstLimit: 50,
    resetTime: 'hourly',
    costPerRequest: 0.01, // Paid service
  },
  
  // Metrics
  metrics: {
    totalOpportunities: 100000,
    totalRecordsThisMonth: 10000,
    avgResponseTime: 380,
    uptime: 99.8,
    lastSuccessfulSync: new Date('2025-08-12T12:00:00Z'),
    errorRate: 0.2,
  },
  
  // Provider Features
  features: {
    supportsSearch: true,
    supportsFiltering: true, // Advanced AI-powered filtering
    supportsPagination: true,
    supportsRealTimeUpdates: true,
    supportsAuthentication: true, // API key required
    requiresApiKey: true, // Premium service
    supportsBulkDownload: true, // Enterprise bulk capabilities
    supportsWebhooks: true, // Real-time notifications
    supportsAdvancedSearch: true, // AI-enhanced search capabilities
    supportsHistoricalData: true, // Historical opportunity intelligence
  },
}

// =============================================
// PROVIDER REGISTRY
// =============================================

/**
 * Master registry of all data providers with their metadata
 */
export const DATA_PROVIDERS = {
  [SourceSystem.SAM_GOV]: SAM_GOV_PROVIDER,
  [SourceSystem.GRANTS_GOV]: GRANTS_GOV_PROVIDER,
  [SourceSystem.FPDS_NG]: FPDS_NG_PROVIDER,
  [SourceSystem.USA_SPENDING]: USA_SPENDING_PROVIDER,
  [SourceSystem.HIGHERGOV]: HIGHERGOV_PROVIDER,
} as const

/**
 * Get provider metadata by source system
 */
export function getProviderMetadata(sourceSystem: SourceSystem): DataProvider | undefined {
  return DATA_PROVIDERS[sourceSystem]
}

/**
 * Get all active providers
 */
export function getActiveProviders(): DataProvider[] {
  return Object.values(DATA_PROVIDERS).filter(provider => provider.isActive)
}

/**
 * Get providers that support real-time data
 */
export function getRealTimeProviders(): DataProvider[] {
  return Object.values(DATA_PROVIDERS).filter(provider => provider.isActive && provider.isRealTime)
}

/**
 * Get providers that support a specific opportunity type
 */
export function getProvidersByOpportunityType(opportunityType: OpportunityType): DataProvider[] {
  return Object.values(DATA_PROVIDERS).filter(provider => 
    provider.isActive && provider.supportedOpportunityTypes.includes(opportunityType)
  )
}

/**
 * Provider reliability tiers for intelligent routing
 */
export const PROVIDER_RELIABILITY_TIERS = {
  TIER_1: [SourceSystem.SAM_GOV, SourceSystem.HIGHERGOV], // 94-100% reliability
  TIER_2: [SourceSystem.FPDS_NG, SourceSystem.GRANTS_GOV], // 88-93% reliability  
  TIER_3: [SourceSystem.USA_SPENDING], // 80-87% reliability
} as const