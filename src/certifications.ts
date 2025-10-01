/**
 * Comprehensive Certification Types and Interfaces
 * 
 * Based on the government certifications database with full type safety
 * and support for the certification management system.
 */

// =============================================
// CORE CERTIFICATION ENUMS
// =============================================

export type TimeUnit = 'days' | 'months' | 'years' | 'lifetime'

export type GovernmentLevel = 'federal' | 'state' | 'local' | 'international' | 'private'

export type CertificationPriority = 'low' | 'medium' | 'high' | 'critical'

export type CertificationStatus = 'active' | 'pending' | 'expired' | 'suspended' | 'revoked'

export type VerificationStatus = 'pending' | 'verified' | 'rejected' | 'not_required'

// =============================================
// GOVERNMENT CERTIFICATION DEFINITION
// =============================================

/**
 * Base certification definition from the government database
 */
export interface GovCertificationDefinition {
  id: string
  name: string
  fullName: string
  description: string
  issuingAgency: string
  expirationPeriod: number | null
  expirationUnit: TimeUnit | null
  expirationNotes: string | null
  renewalRequired: boolean
  renewalPeriod: number | null
  renewalUnit: TimeUnit | null
  governmentLevel: GovernmentLevel[]
  applicableIndustries: string[]
  requiresDocumentation: boolean
  isActive: boolean
  priority: CertificationPriority
  tags: string[]
}

/**
 * Certification category grouping related certifications
 */
export interface GovCertificationCategory {
  id: string
  name: string
  description: string
  governmentLevel: GovernmentLevel[]
  certifications: GovCertificationDefinition[]
}

/**
 * Complete certification database structure
 */
export interface GovCertificationDatabase {
  certificationCategories: GovCertificationCategory[]
  metadata: {
    version: string
    lastUpdated: string
    totalCertifications: number
    totalCategories: number
    dataSource: string
    updateFrequency: string
    notes: string
  }
  enums: {
    timeUnits: TimeUnit[]
    governmentLevels: GovernmentLevel[]
    priorities: CertificationPriority[]
    industries: string[]
    agencies: string[]
    certificationStatuses: CertificationStatus[]
    verificationStatuses: VerificationStatus[]
  }
}

// =============================================
// USER CERTIFICATION DATA
// =============================================

/**
 * User's certification with all relevant tracking data
 */
export interface UserCertification {
  /** Unique identifier for the user's certification record */
  id?: string
  
  /** References the certification definition ID from government database */
  certificationId: string
  
  /** Display name of the certification (e.g., "Small Business (SB)") */
  name: string
  
  /** User's specific certification number/identifier (optional) */
  certificationNumber?: string
  
  /** Date when the certification was obtained */
  obtainedDate: string // ISO 8601 date string
  
  /** Date when the certification expires (if applicable) */
  expirationDate?: string // ISO 8601 date string
  
  /** Current status of the certification */
  status: CertificationStatus
  
  /** Verification status for the certification */
  verificationStatus: VerificationStatus
  
  /** URL to uploaded certification document */
  documentUrl?: string
  
  /** Specific issuing office/location (optional) */
  issuingOffice?: string
  
  /** Additional notes about this certification */
  notes?: string
  
  /** Whether this certification is activated for matching */
  isActivated: boolean
  
  /** Reminder settings for expiration notifications */
  reminderSettings?: {
    enabled: boolean
    reminderDays: number[] // Days before expiration to send reminders (e.g., [30, 60, 90])
  }
  
  /** Metadata for tracking */
  createdAt: string
  updatedAt: string
}


// =============================================
// CERTIFICATION SEARCH AND FILTERING
// =============================================

/**
 * Search filters for finding relevant certifications
 */
export interface CertificationSearchFilters {
  /** Filter by applicable industry */
  industries?: string[]
  
  /** Filter by government level */
  governmentLevels?: GovernmentLevel[]
  
  /** Filter by priority level */
  priorities?: CertificationPriority[]
  
  /** Filter by issuing agency */
  agencies?: string[]
  
  /** Filter by tags */
  tags?: string[]
  
  /** Filter by whether certification expires */
  hasExpiration?: boolean
  
  /** Filter by whether renewal is required */
  requiresRenewal?: boolean
  
  /** Search query for name/description */
  query?: string
}

/**
 * Certification search result with relevance scoring
 */
export interface CertificationSearchResult {
  certification: GovCertificationDefinition
  category: GovCertificationCategory
  relevanceScore: number // 0-100
  matchReasons: string[]
}

// =============================================
// CERTIFICATION MANAGEMENT ACTIONS
// =============================================

/**
 * Form data for adding/editing a user certification
 */
export interface CertificationFormData {
  certificationId: string
  certificationNumber?: string
  obtainedDate: string
  expirationDate?: string
  status: CertificationStatus
  verificationStatus?: VerificationStatus
  documentUrl?: string
  issuingOffice?: string
  notes?: string
  isActivated: boolean
  reminderSettings?: {
    enabled: boolean
    reminderDays: number[]
  }
}

/**
 * Bulk certification operations
 */
export interface CertificationBulkAction {
  action: 'activate' | 'deactivate' | 'delete' | 'update_status' | 'set_reminders'
  certificationIds: string[]
  data?: Record<string, any>
}

// =============================================
// CERTIFICATION ANALYTICS AND INSIGHTS
// =============================================

/**
 * Analytics for certification performance and recommendations
 */
export interface CertificationAnalytics {
  /** Opportunity matching insights */
  matching: {
    opportunitiesMatched: number
    averageMatchScore: number
    topMatchingCertifications: Array<{
      certificationId: string
      opportunityCount: number
      averageScore: number
    }>
  }
  
  /** Competitive positioning */
  competitive: {
    industryBenchmark: number // Average certifications in user's industry
    percentileRank: number // User's ranking (0-100)
    gapAnalysis: Array<{
      certificationId: string
      importance: number
      competitorAdoption: number
    }>
  }
  
  /** Recommendations for new certifications */
  recommendations: Array<{
    certificationId: string
    priority: CertificationPriority
    reasoning: string
    estimatedImpact: number // 0-100
    estimatedCost?: number
    estimatedTimeframe?: string
  }>
  
  /** Expiration tracking */
  expiration: {
    expiringSoon: UserCertification[] // Within 90 days
    expired: UserCertification[]
    renewalReminders: Array<{
      certificationId: string
      daysUntilExpiration: number
      remindersSent: number
    }>
  }
}

// =============================================
// CERTIFICATION VALIDATION AND ERRORS
// =============================================

/**
 * Validation error for certification data
 */
export interface CertificationValidationError {
  field: string
  message: string
  code: string
  severity: 'error' | 'warning' | 'info'
}

/**
 * Validation result for certification operations
 */
export interface CertificationValidationResult {
  isValid: boolean
  errors: CertificationValidationError[]
  warnings: CertificationValidationError[]
  suggestions: CertificationValidationError[]
}

// =============================================
// TYPE GUARDS AND UTILITIES
// =============================================

/**
 * Type guard for checking if an object is a valid UserCertification
 */
export function isUserCertification(obj: any): obj is UserCertification {
  return (
    obj &&
    typeof obj === 'object' &&
    typeof obj.certificationId === 'string' &&
    typeof obj.obtainedDate === 'string' &&
    typeof obj.status === 'string' &&
    typeof obj.isActivated === 'boolean'
  )
}

/**
 * Type guard for checking if an object is a valid GovCertificationDefinition
 */
export function isGovCertificationDefinition(obj: any): obj is GovCertificationDefinition {
  return (
    obj &&
    typeof obj === 'object' &&
    typeof obj.id === 'string' &&
    typeof obj.name === 'string' &&
    typeof obj.issuingAgency === 'string' &&
    typeof obj.priority === 'string' &&
    Array.isArray(obj.governmentLevel) &&
    Array.isArray(obj.applicableIndustries)
  )
}

// =============================================
// UTILITY FUNCTIONS
// =============================================

/**
 * Calculate days until certification expiration
 */
export function getDaysUntilExpiration(expirationDate: string): number {
  const expiration = new Date(expirationDate)
  const today = new Date()
  const diffTime = expiration.getTime() - today.getTime()
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

/**
 * Check if certification is expiring soon (within specified days)
 */
export function isExpiringSoon(certification: UserCertification, days: number = 90): boolean {
  if (!certification.expirationDate) return false
  const daysUntil = getDaysUntilExpiration(certification.expirationDate)
  return daysUntil <= days && daysUntil > 0
}

/**
 * Check if certification is expired
 */
export function isExpired(certification: UserCertification): boolean {
  if (!certification.expirationDate) return false
  return getDaysUntilExpiration(certification.expirationDate) < 0
}

/**
 * Get certification status badge color
 */
export function getCertificationStatusColor(status: CertificationStatus): string {
  switch (status) {
    case 'active':
      return 'green'
    case 'pending':
      return 'yellow'
    case 'expired':
      return 'red'
    case 'suspended':
      return 'orange'
    case 'revoked':
      return 'red'
    default:
      return 'gray'
  }
}

/**
 * Get priority badge color
 */
export function getPriorityColor(priority: CertificationPriority): string {
  switch (priority) {
    case 'critical':
      return 'red'
    case 'high':
      return 'orange'
    case 'medium':
      return 'yellow'
    case 'low':
      return 'gray'
    default:
      return 'gray'
  }
}

/**
 * Format certification name for display
 */
export function formatCertificationName(
  definition: GovCertificationDefinition,
  showAgency?: boolean
): string
export function formatCertificationName(
  name: string
): string
export function formatCertificationName(
  definitionOrName: GovCertificationDefinition | string,
  showAgency: boolean = true
): string {
  if (typeof definitionOrName === 'string') {
    // Simple string formatting - just return the name as-is
    return definitionOrName
  }
  
  const name = definitionOrName.name
  const agency = showAgency && definitionOrName.issuingAgency !== 'Various' 
    ? ` (${definitionOrName.issuingAgency})` 
    : ''
  return `${name}${agency}`
}

/**
 * Calculate certification completeness score
 */
export function calculateCertificationCompleteness(
  userCertifications: UserCertification[]
): number {
  if (userCertifications.length === 0) return 0
  
  let totalScore = 0
  let maxScore = 0
  
  userCertifications.forEach((cert) => {
    maxScore += 100 // Each certification can contribute 100 points when complete
    
    let score = 30 // Base score for having the certification
    
    if (cert.certificationNumber) score += 10
    if (cert.documentUrl) score += 20
    if (cert.verificationStatus === 'verified') score += 20
    if (cert.isActivated) score += 10
    if (cert.status === 'active') score += 10
    
    totalScore += score
  })
  
  return Math.round((totalScore / maxScore) * 100)
}