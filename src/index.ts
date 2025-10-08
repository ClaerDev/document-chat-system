// Core types for Document Chat System AI

// Import enhanced type-safe interfaces
export * from './profile'
export * from './organization'
export * from './naics'
export * from './contacts'
export { SourceSystem } from './opportunity-enums'

// Re-export ContactAddressInfo as a general Address interface
export type Address = import('./contacts').ContactAddressInfo

export interface User {
  id: string
  clerkId: string
  email: string
  firstName?: string
  lastName?: string
  imageUrl?: string
  role: UserRole
  organizationId: string

  // User preferences
  timezone?: string
  emailOptIn?: boolean
  lastActiveAt?: Date

  createdAt: Date
  updatedAt: Date
  deletedAt?: Date
}

export interface Organization {
  id: string
  name: string
  slug: string
  plan: Plan
  stripeCustomerId?: string
  subscriptionStatus: 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'UNPAID'
  planType?: string
  billingEmail?: string

  // Now properly typed (imported from organization.ts)
  settings: import('./organization').OrganizationSettings
  features: import('./organization').OrganizationFeatures

  createdAt: Date
  updatedAt: Date
  deletedAt?: Date
}

export interface Profile {
  id: string
  organizationId: string
  createdById: string
  updatedById?: string
  createdAt: Date
  updatedAt: Date
  deletedAt?: Date

  // Company Information
  companyName: string
  dbaName?: string
  uei?: string
  duns?: string
  cageCode?: string

  // Business Address
  addressLine1?: string
  addressLine2?: string
  city?: string
  state?: string
  zipCode?: string
  country: string

  // Contact Information
  primaryContactName?: string
  primaryContactEmail?: string
  primaryContactPhone?: string
  website?: string

  // Profile Images
  logoUrl?: string
  bannerUrl?: string
  contactProfileImageUrl?: string

  // Business Classification
  businessType?:
    | 'Corporation'
    | 'LLC'
    | 'Partnership'
    | 'Sole Proprietorship'
    | 'Non-Profit'
    | 'Government Entity'
    | 'Other'
  yearEstablished?: number
  employeeCount?:
    | '1-5'
    | '6-10'
    | '11-25'
    | '26-50'
    | '51-100'
    | '101-250'
    | '251-500'
    | '501-1000'
    | '1000+'
  annualRevenue?:
    | 'Less than $100K'
    | '$100K - $500K'
    | '$500K - $1M'
    | '$1M - $5M'
    | '$5M - $10M'
    | '$10M - $25M'
    | '$25M - $50M'
    | '$50M - $100M'
    | '$100M+'

  // NAICS Codes
  primaryNaics?: string
  secondaryNaics?: string[]

  // Certifications - Now properly typed (imported from profile.ts)
  certifications?: import('./profile').ProfileCertifications

  // Capabilities and Experience
  coreCompetencies?: string[]
  pastPerformance?: import('./profile').ProfilePastPerformance // Now properly typed
  securityClearance?:
    | 'None'
    | 'Public Trust'
    | 'Secret'
    | 'Top Secret'
    | 'TS/SCI'
    | 'Not Required'

  // Brand Voice and Communication
  brandVoice?: import('./profile').BrandVoice // Brand voice using enum
  brandTone?: import('./profile').BrandTone // Communication tone using enum

  // Geographic and Government Level Preferences
  geographicPreferences?: import('./profile').GeographicPreferences // Preferred geographic markets
  organizationLevels?: import('./profile').OrganizationLevel[] // Target government levels using enum

  // System fields
  profileCompleteness: number // Percentage 0-100
  samGovSyncedAt?: Date
  samGovData?: import('./profile').SamGovRegistration // Now properly typed

  // Profile vectorization for AI matching
  profileEmbeddings?: import('./profile').ProfileEmbeddings // Profile embedding vectors

  // Relations (when populated)
  organization?: Organization
  createdBy?: User
  updatedBy?: User
}

// Import global enums and Prisma types
// import type { Opportunity as PrismaOpportunity } from '@prisma/client'
import type {
  SourceSystem,
  OpportunityType,
  ContractType,
  SetAsideType,
  CompetitionType,
  SecurityClearanceLevel,
  ProcurementMethod,
  ContractDuration,
  AwardType,
  AwardStatus,
  OpportunityStatus,
} from './opportunity-enums'

// Agency structure matching agencies.json
export interface AgencyInfo {
  code: string
  name: string
  abbreviation?: string
  type: string
  isActive: boolean
  contractingAuthority: boolean
  website?: string
  businessAreas?: string[]
  commonNaics?: string[]
  alternateNames?: string[]
  
  // Enhanced fields from enriched data
  mission?: string
  congressionalJustification?: string
  iconFilename?: string
  frecCode?: string
  frecDescription?: string
  frecAbbreviation?: string
  isFrec?: boolean
  isTopTier?: boolean
  description?: string
  comments?: string
  
  // Hierarchical structure
  parentCode?: string
  subtiers?: Array<{
    code: string
    name: string
    abbreviation?: string
  }>
  
  // Administrative organization
  adminOrg?: {
    name: string
    code: string
  }
  
  // Metadata
  metadata?: {
    source: string
    userSelectable?: boolean
    frecAssociation?: boolean
    lastUpdated?: string
  }
}

// Comprehensive Opportunity interface that matches Prisma model
export interface Opportunity {
  // Core identifiers
  id: string
  organizationId: string
  solicitationNumber: string
  title: string
  description?: string
  summary?: string

  // Agency Information (structured JSON)
  agency: AgencyInfo
  office?: string
  
  // SAM.gov Organization Hierarchy
  fullParentPathName?: string
  fullParentPathCode?: string
  organizationType?: string

  // Timeline
  postedDate?: Date | string
  responseDeadline?: Date | string // This was previously "deadline" for backward compatibility
  performanceStartDate?: Date | string
  performanceEndDate?: Date | string
  lastModifiedDate?: Date | string

  // Classification using global enums
  opportunityType: OpportunityType
  contractType?: ContractType
  setAsideType: SetAsideType
  competitionType: CompetitionType
  
  // SAM.gov Classification Extensions
  baseType?: string // Original opportunity type before changes
  archiveType?: string // Archive classification
  archiveDate?: Date | string // When opportunity was archived
  setAsideDescription?: string // Human-readable set aside description
  setAsideCode?: string // SAM.gov set aside code
  classificationCode?: string // Additional classification code
  active?: boolean // SAM.gov active status

  // Financial information
  estimatedValue?: number // Converted from Decimal for frontend use
  minimumValue?: number // Converted from Decimal for frontend use
  maximumValue?: number // Converted from Decimal for frontend use
  currency: string
  fundingAmount?: number // For grants
  awardCeiling?: number // Maximum award

  // Award information (for historical data)
  awardType?: AwardType
  awardStatus?: AwardStatus
  awardee?: string
  awardeeUei?: string
  awardDate?: Date | string
  awardAmount?: number

  // Geographic information - structured location objects
  placeOfPerformance?: Address
  contractorLocation?: Address
  
  // Legacy string fields for backward compatibility
  performanceCountry?: string
  performanceState?: string
  performanceCity?: string
  performanceZipCode?: string

  // Classification codes
  naicsCodes: string[]
  pscCodes: string[]
  cfda?: string // For grants

  // Requirements
  securityClearanceRequired: SecurityClearanceLevel
  procurementMethod?: ProcurementMethod
  contractDuration?: ContractDuration
  competencies: string[]

  // Special requirements
  smallBusinessSetAside: boolean
  facilityClearanceReq: boolean
  personnelClearanceReq: number

  // Content
  fullText?: string
  attachments?: any // JSON field
  solicDocument?: string
  qaDocument?: string
  amendments?: any // JSON field
  
  // SAM.gov Links and Resources (using our Link interface)
  links?: import('./external-data').Link[] // All opportunity links
  pointOfContact?: import('./external-data').ExternalContact[] // Points of contact (raw data from external sources)
  
  // Structured Contact Relations (when populated from database)
  contactOpportunities?: import('./contacts').ContactOpportunity[] // Related contacts with relationship types
  
  // Enhanced Links
  descriptionLink?: string // Link to opportunity description
  additionalInfoLink?: string // Additional information links
  uiLink?: string // Direct SAM.gov UI link
  resourceLinks?: string[] // Direct download URLs

  // Data source tracking
  sourceSystem: SourceSystem
  sourceId?: string
  sourceUrl?: string
  lastSyncedAt?: Date | string
  dataHash?: string

  // Status
  status: OpportunityStatus
  isArchived: boolean
  archiveReason?: string

  // Analytics
  viewCount: number
  saveCount: number
  applicationCount: number
  matchCount: number

  // AI enhancements
  confidenceScore?: number
  relevanceScore?: number
  embeddings?: any // JSON field
  tags: string[]

  // Historical data
  historicalAwards?: any // JSON field
  competitorAnalysis?: any // JSON field

  // Enhanced fields from structured data sources
  requiredCertifications?: string[] // Certification IDs from certifications.json
  procurementVehicle?: {
    title: string
    fullName: string
    category: string
    agency: string
  } // Procurement vehicle info from vehicles.json

  // System fields
  createdAt: Date | string
  updatedAt: Date | string
  deletedAt?: Date | string

  // Backward compatibility fields (computed from new structure)
  externalId?: string // Maps to sourceId || solicitationNumber
  deadline?: Date | string // Maps to responseDeadline
  type?: OpportunityType // Maps to opportunityType
  contractValue?: number // Maps to estimatedValue
  contractValueMin?: number // Maps to minimumValue
  contractValueMax?: number // Maps to maximumValue
  location?: string // Maps to placeOfPerformance
  state?: string // Maps to performanceState
  city?: string // Maps to performanceCity
  zipCode?: string // Maps to performanceZipCode
  agencyCode?: string // Maps to agency.code
}

// Similar Contract interface for SAM.gov historical contract data
export interface SimilarContract {
  // Core contract identifiers
  id: string
  internalId?: string // USAspending internal ID
  solicitationNumber: string
  awardNumber?: string
  generatedInternalId?: string // USAspending generated internal ID
  title: string
  description?: string
  
  // Contract details and timeline
  awardedDate?: Date | string
  performanceStartDate?: Date | string
  performanceEndDate?: Date | string
  lastModifiedDate?: Date | string
  baseObligationDate?: Date | string
  awardedValue?: number
  obligatedAmount?: number
  
  // Enhanced agency information
  agency: {
    name: string
    code?: string
    subTier?: string
    subTierCode?: string
    fundingAgency?: string
    fundingAgencyCode?: string
  }
  awardingAgency?: string
  fundingAgency?: string
  agencySlug?: string
  
  // Enhanced classification with descriptions
  naicsCodes?: string[]
  naicsDescription?: string
  pscCodes?: string[]
  pscDescription?: string
  contractType?: string
  setAsideType?: string
  competitionType?: string
  defCodes?: string[] // Defense codes
  
  // Enhanced performance location
  placeOfPerformance: {
    state?: string
    city?: string
    zipCode?: string
    country?: string
    countyCode?: string
    countyName?: string
    congressionalDistrict?: string
  }
  
  // Enhanced vendor information
  vendor?: {
    name: string
    duns?: string
    dunsNumber?: string
    uei?: string
    cageCode?: string
    businessType?: string
    businessSize?: string
    recipientId?: string
    location?: {
      city?: string
      state?: string
      zipCode?: string
      address?: string
      congressionalDistrict?: string
    }
  }
  
  // Direct recipient fields for UI access
  recipientName?: string
  recipientUei?: string
  recipientId?: string
  
  // Special funding categories (USAspending specific)
  covidObligations?: number
  covidOutlays?: number
  infrastructureObligations?: number
  infrastructureOutlays?: number
  
  // Similarity metrics (computed)
  similarityScore?: number
  matchReasons?: string[] // e.g., "Same NAICS Code", "Same State", "Similar Value"
  
  // Enhanced data source tracking
  sourceSystem: SourceSystem
  sourceUrl?: string
  
  // Enhanced internal tracking
  fetchedAt?: Date
  createdAt?: Date
  lastSyncedAt?: Date
}

export interface MatchScore {
  id: string
  opportunityId: string
  profileId: string
  score: number // 0-100
  confidence: number
  factors: ScoreFactor[]
  algorithmVersion: string
  userFeedback?: 'positive' | 'negative'
  feedbackComment?: string
  createdAt: Date
  updatedAt: Date
}

export interface ScoreFactor {
  name: string
  contribution: number
  explanation: string
}

export interface Certification {
  name: string
  code: string
  certifiedDate: string
  expirationDate?: string
  certifyingAgency: string
}

export interface PastPerformance {
  contractNumber: string
  customerName: string
  contractValue: number
  performancePeriod: {
    start: string
    end: string
  }
  description: string
  naicsCode?: string
}

// Enums
export type UserRole = 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER'
export type Plan = 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE'

// Re-export opportunity enums for convenience
export {
  SourceSystem,
  OpportunityType,
  ContractType,
  SetAsideType,
  CompetitionType,
  SecurityClearanceLevel,
  ProcurementMethod,
  ContractDuration,
  AwardType,
  AwardStatus,
  OpportunityStatus,
  OPPORTUNITY_ENUM_VALUES,
  SOURCE_SYSTEM_LABELS,
  OPPORTUNITY_TYPE_LABELS,
  CONTRACT_TYPE_LABELS,
  LEGACY_MAPPINGS,
} from './opportunity-enums'

// API Response types
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  limit: number
  hasMore: boolean
}

// Enhanced Search and filter types using global enums
export interface SearchFilters {
  // Text search
  query?: string

  // Classification filters
  naicsCodes?: string[]
  pscCodes?: string[]
  cfda?: string // For grants

  // Agency and organization filters
  agencies?: string[] // Agency codes or names
  sourceSystem?: SourceSystem[]
  dataSources?: import('./global-enums').DataSourceId[] // Data provider sources

  // Financial filters
  minValue?: number
  maxValue?: number
  fundingAmount?: number // For grants

  // Date filters
  deadline?: string // Response deadline
  postedFrom?: string | Date // Start date for posted date range filtering
  postedTo?: string | Date   // End date for posted date range filtering

  // Geographic filters
  states?: string[] // Performance states
  performanceStates?: string[] // Alias for states
  performanceCountry?: string[]
  performanceCity?: string[]

  // Classification filters using enums
  opportunityTypes?: OpportunityType[]
  contractTypes?: ContractType[]
  setAsideTypes?: SetAsideType[]
  competitionTypes?: CompetitionType[]
  securityClearances?: SecurityClearanceLevel[]
  procurementMethods?: ProcurementMethod[]
  contractDurations?: ContractDuration[]

  // Status and lifecycle filters
  opportunityStatus?: OpportunityStatus[]
  awardStatus?: AwardStatus[]
  awardTypes?: AwardType[]

  // Requirements filters
  competencies?: string[]
  smallBusinessSetAside?: boolean
  facilityClearanceReq?: boolean
  personnelClearanceReq?: number

  // Analytics filters
  minConfidenceScore?: number
  tags?: string[]

  // Backward compatibility
  securityClearanceRequired?: string[] // Legacy field name
}

export interface SearchParams extends SearchFilters {
  sort?: string
  order?: 'asc' | 'desc'
  limit?: number
  offset?: number
  
  // Frontend-specific filters (not sent to external APIs)
  postedFrom?: Date | string
  postedTo?: Date | string
  
  // Data provider filtering
  dataProviders?: string[] // Filter by specific data sources
  excludeProviders?: string[] // Exclude specific data sources
  dataFreshness?: 'realtime' | 'today' | 'week' | 'month'
}
