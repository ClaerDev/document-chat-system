/**
 * Comprehensive Zod Validation Schemas for Certifications
 * 
 * Provides type-safe validation for all certification-related data
 * with detailed descriptions and security measures.
 */

import { z } from 'zod'
import DOMPurify from 'isomorphic-dompurify'
import type {
  TimeUnit,
  OrganizationLevel,
  CertificationPriority,
  CertificationStatus,
  VerificationStatus,
  GovCertificationDefinition,
  GovCertificationCategory,
  UserCertification,
  UserCertificationsProfile,
  CertificationFormData,
  CertificationSearchFilters,
  CertificationBulkAction,
} from '@/types/certifications'

// =============================================
// SECURITY VALIDATION HELPERS
// =============================================

const sanitizeString = (str: string) => {
  return DOMPurify.sanitize(str, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] })
}

const createSafeString = (minLength: number = 0, maxLength: number = 255) => {
  return z
    .string()
    .min(minLength)
    .max(maxLength)
    .describe(
      `Sanitized string field with length between ${minLength} and ${maxLength} characters. Automatically sanitized for XSS prevention and validated against malicious patterns.`
    )
    .transform(sanitizeString)
    .refine((val) => {
      const xssPattern =
        /<script[^>]*>|javascript:|on\w+\s*=|<iframe|<object|<embed/i
      return !xssPattern.test(val)
    }, 'Invalid characters detected')
}

const createSafeOptionalString = (maxLength: number = 255) => {
  return z
    .string()
    .max(maxLength)
    .optional()
    .describe(
      `Optional sanitized string field with maximum length of ${maxLength} characters. Automatically sanitized for XSS prevention when provided.`
    )
    .transform((val) => (val ? sanitizeString(val) : val))
    .refine((val) => {
      if (!val) return true
      const xssPattern =
        /<script[^>]*>|javascript:|on\w+\s*=|<iframe|<object|<embed/i
      return !xssPattern.test(val)
    }, 'Invalid characters detected')
}

const createSafeUrl = () => {
  return z
    .string()
    .url('Invalid URL format')
    .max(2048)
    .describe(
      'Validated URL field with maximum length of 2048 characters. Only HTTP/HTTPS protocols are allowed. Automatically validated against suspicious protocols for security.'
    )
    .refine((val) => {
      return /^https?:\/\//i.test(val)
    }, 'Only HTTP/HTTPS URLs are allowed')
    .refine((val) => {
      const suspiciousPattern = /javascript:|data:|vbscript:|file:|ftp:/i
      return !suspiciousPattern.test(val)
    }, 'Suspicious URL detected')
}

// =============================================
// ENUM VALIDATION SCHEMAS
// =============================================

export const TimeUnitSchema = z
  .enum(['days', 'months', 'years', 'lifetime'])
  .describe(
    'Time unit for certification validity periods. Used for expiration and renewal timing calculations.'
  )

export const OrganizationLevelSchema = z
  .enum(['federal', 'state', 'local', 'international', 'private'])
  .describe(
    'Government level that issues or recognizes the certification. Used for filtering and matching opportunities at appropriate government levels.'
  )

export const CertificationPrioritySchema = z
  .enum(['low', 'medium', 'high', 'critical'])
  .describe(
    'Priority level indicating importance of the certification for government contracting. Critical certifications are often required for specific opportunities.'
  )

export const CertificationStatusSchema = z
  .enum(['active', 'pending', 'expired', 'suspended', 'revoked'])
  .describe(
    'Current status of a user certification. Active certifications are used for opportunity matching. Expired/revoked certifications need renewal or replacement.'
  )

export const VerificationStatusSchema = z
  .enum(['pending', 'verified', 'rejected', 'not_required'])
  .describe(
    'Verification status for uploaded certification documents. Verified certifications have higher matching confidence and eligibility for restricted opportunities.'
  )

// =============================================
// GOVERNMENT CERTIFICATION DEFINITION SCHEMAS
// =============================================

export const GovCertificationDefinitionSchema = z
  .object({
    id: z
      .string()
      .min(1)
      .max(100)
      .regex(/^[a-z0-9_]+$/, 'ID must contain only lowercase letters, numbers, and underscores')
      .describe(
        'Unique identifier for the certification definition. Used to reference specific certifications in the government database. Format: lowercase_with_underscores.'
      ),
    
    name: createSafeString(1, 200).describe(
      'Short display name of the certification. Used in UI lists and selection dropdowns. Maximum 200 characters for display compatibility.'
    ),
    
    fullName: createSafeString(1, 300).describe(
      'Complete official name of the certification. Used for formal documentation and detailed displays. Maximum 300 characters for full official titles.'
    ),
    
    description: createSafeString(1, 1000).describe(
      'Detailed description of the certification, its purpose, and requirements. Used for user understanding and decision-making. Maximum 1000 characters for comprehensive information.'
    ),
    
    issuingAgency: createSafeString(1, 100).describe(
      'Government agency or organization that issues this certification. Used for credibility and verification purposes. Examples: SBA, GSA, DoD, etc.'
    ),
    
    expirationPeriod: z
      .number()
      .positive('Expiration period must be positive')
      .max(50, 'Expiration period too long')
      .nullable()
      .describe(
        'Number of time units until certification expires. Null for certifications that do not expire. Maximum 50 units to prevent unrealistic values.'
      ),
    
    expirationUnit: TimeUnitSchema
      .nullable()
      .describe(
        'Time unit for the expiration period (days, months, years, lifetime). Must be provided if expirationPeriod is specified.'
      ),
    
    expirationNotes: createSafeOptionalString(500).describe(
      'Additional notes about expiration, renewal requirements, or special conditions. Maximum 500 characters for detailed explanations.'
    ),
    
    renewalRequired: z
      .boolean()
      .describe(
        'Whether the certification requires active renewal. True for certifications that must be renewed before expiration to remain valid.'
      ),
    
    renewalPeriod: z
      .number()
      .positive('Renewal period must be positive')
      .max(50, 'Renewal period too long')
      .nullable()
      .describe(
        'Number of time units for renewal frequency. Null for certifications that do not require renewal.'
      ),
    
    renewalUnit: TimeUnitSchema
      .nullable()
      .describe(
        'Time unit for the renewal period. Must be provided if renewalPeriod is specified.'
      ),
    
    governmentLevel: z
      .array(OrganizationLevelSchema)
      .min(1, 'At least one government level required')
      .max(5, 'Too many government levels')
      .describe(
        'Array of government levels where this certification is recognized. Used for filtering opportunities by government level.'
      ),
    
    applicableIndustries: z
      .array(createSafeString(1, 100))
      .min(1, 'At least one industry required')
      .max(50, 'Too many industries specified')
      .describe(
        'Array of industries where this certification is applicable. Used for industry-specific filtering and relevance scoring.'
      ),
    
    requiresDocumentation: z
      .boolean()
      .describe(
        'Whether this certification requires supporting documentation for verification. Used to guide users on upload requirements.'
      ),
    
    isActive: z
      .boolean()
      .describe(
        'Whether this certification is currently active and available for selection. Inactive certifications are hidden from user selection.'
      ),
    
    priority: CertificationPrioritySchema.describe(
      'Priority level of this certification for government contracting success. Higher priority certifications are promoted in recommendations.'
    ),
    
    tags: z
      .array(createSafeString(1, 50))
      .max(20, 'Too many tags')
      .describe(
        'Array of searchable tags for categorization and filtering. Maximum 20 tags, each up to 50 characters for comprehensive categorization.'
      ),
  })
  .refine(
    (data) => {
      // If expiration period is provided, expiration unit must also be provided
      if (data.expirationPeriod !== null && data.expirationUnit === null) {
        return false
      }
      if (data.expirationPeriod === null && data.expirationUnit !== null) {
        return false
      }
      return true
    },
    {
      message: 'Expiration period and unit must both be provided or both be null',
      path: ['expirationPeriod'],
    }
  )
  .refine(
    (data) => {
      // If renewal period is provided, renewal unit must also be provided
      if (data.renewalPeriod !== null && data.renewalUnit === null) {
        return false
      }
      if (data.renewalPeriod === null && data.renewalUnit !== null) {
        return false
      }
      return true
    },
    {
      message: 'Renewal period and unit must both be provided or both be null',
      path: ['renewalPeriod'],
    }
  )
  .describe(
    'Government certification definition schema with comprehensive validation. Defines all properties of a certification type available in the government database.'
  )

export const GovCertificationCategorySchema = z
  .object({
    id: z
      .string()
      .min(1)
      .max(100)
      .regex(/^[a-z0-9_]+$/, 'Category ID must contain only lowercase letters, numbers, and underscores')
      .describe(
        'Unique identifier for the certification category. Used for organizing and filtering certifications by type.'
      ),
    
    name: createSafeString(1, 200).describe(
      'Display name of the certification category. Used in UI navigation and grouping.'
    ),
    
    description: createSafeString(1, 500).describe(
      'Description of the certification category and what types of certifications it contains.'
    ),
    
    governmentLevel: z
      .array(OrganizationLevelSchema)
      .min(1, 'At least one government level required')
      .max(5, 'Too many government levels')
      .describe(
        'Government levels that typically issue certifications in this category.'
      ),
    
    certifications: z
      .array(GovCertificationDefinitionSchema)
      .min(1, 'Category must contain at least one certification')
      .max(100, 'Too many certifications in category')
      .describe(
        'Array of certification definitions that belong to this category.'
      ),
  })
  .describe(
    'Certification category schema for organizing related certifications. Used for navigation and logical grouping in the UI.'
  )

// =============================================
// USER CERTIFICATION SCHEMAS
// =============================================

export const UserCertificationSchema = z
  .object({
    id: z
      .string()
      .optional()
      .describe(
        'Unique identifier for the user certification record. Auto-generated for new certifications.'
      ),
    
    certificationId: z
      .string()
      .min(1, 'Certification ID is required')
      .max(100)
      .describe(
        'References the certification definition ID from the government database. Used to link user certification to official definition.'
      ),
    
    certificationNumber: createSafeOptionalString(100).describe(
      'User-specific certification number or identifier issued by the certifying agency. Optional but recommended for verification.'
    ),
    
    obtainedDate: z
      .string()
      .datetime('Invalid date format')
      .describe(
        'ISO 8601 date when the certification was obtained. Used for tracking certification age and renewal scheduling.'
      ),
    
    expirationDate: z
      .string()
      .datetime('Invalid date format')
      .optional()
      .describe(
        'ISO 8601 date when the certification expires. Optional for lifetime certifications. Used for expiration tracking and renewal reminders.'
      ),
    
    status: CertificationStatusSchema.describe(
      'Current status of the certification. Used for filtering and matching eligibility.'
    ),
    
    verificationStatus: VerificationStatusSchema.describe(
      'Verification status of uploaded documentation. Affects matching confidence and eligibility for restricted opportunities.'
    ),
    
    documentUrl: createSafeUrl()
      .optional()
      .describe(
        'URL to uploaded certification document. Used for verification and audit purposes.'
      ),
    
    issuingOffice: createSafeOptionalString(200).describe(
      'Specific office or location that issued the certification. Optional additional detail for verification.'
    ),
    
    notes: createSafeOptionalString(1000).describe(
      'Additional notes about this certification. User-provided context or special conditions.'
    ),
    
    isActivated: z
      .boolean()
      .default(true)
      .describe(
        'Whether this certification is activated for opportunity matching. Allows users to control which certifications are used in scoring.'
      ),
    
    reminderSettings: z
      .object({
        enabled: z
          .boolean()
          .describe(
            'Whether expiration reminders are enabled for this certification.'
          ),
        reminderDays: z
          .array(
            z
              .number()
              .positive('Reminder days must be positive')
              .max(365, 'Reminder days too far in advance')
          )
          .min(1, 'At least one reminder day required if enabled')
          .max(10, 'Too many reminder days')
          .describe(
            'Array of days before expiration to send reminders. Example: [30, 60, 90] for reminders at 30, 60, and 90 days before expiration.'
          ),
      })
      .optional()
      .describe(
        'Reminder settings for expiration notifications. Helps users maintain certification currency.'
      ),
    
    createdAt: z
      .string()
      .datetime('Invalid date format')
      .describe(
        'ISO 8601 timestamp when this certification record was created.'
      ),
    
    updatedAt: z
      .string()
      .datetime('Invalid date format')
      .describe(
        'ISO 8601 timestamp when this certification record was last updated.'
      ),
  })
  .refine(
    (data) => {
      // If expiration date is provided, it must be after obtained date
      if (data.expirationDate && data.obtainedDate) {
        const obtained = new Date(data.obtainedDate)
        const expiration = new Date(data.expirationDate)
        return expiration > obtained
      }
      return true
    },
    {
      message: 'Expiration date must be after obtained date',
      path: ['expirationDate'],
    }
  )
  .refine(
    (data) => {
      // If reminder settings are provided, they must be valid
      if (data.reminderSettings?.enabled && !data.expirationDate) {
        return false
      }
      return true
    },
    {
      message: 'Cannot enable reminders for certifications without expiration date',
      path: ['reminderSettings'],
    }
  )
  .describe(
    'User certification schema with comprehensive validation. Represents a certification that a user has obtained with all tracking and management data.'
  )

export const UserCertificationsProfileSchema = z
  .object({
    certifications: z
      .array(UserCertificationSchema)
      .max(100, 'Too many certifications')
      .describe(
        'Array of all certifications the user has obtained. Maximum 100 certifications per user for performance.'
      ),
    
    lastUpdated: z
      .string()
      .datetime('Invalid date format')
      .describe(
        'ISO 8601 timestamp when the certification profile was last updated.'
      ),
    
    completenessScore: z
      .number()
      .min(0)
      .max(100)
      .describe(
        'Calculated completeness score (0-100) based on certification coverage and quality. Higher scores indicate more comprehensive certification profiles.'
      ),
    
    stats: z
      .object({
        total: z
          .number()
          .min(0)
          .describe(
            'Total number of certifications in the profile.'
          ),
        active: z
          .number()
          .min(0)
          .describe(
            'Number of active certifications available for matching.'
          ),
        expiringSoon: z
          .number()
          .min(0)
          .describe(
            'Number of certifications expiring within 90 days.'
          ),
        expired: z
          .number()
          .min(0)
          .describe(
            'Number of expired certifications that need renewal.'
          ),
        pending: z
          .number()
          .min(0)
          .describe(
            'Number of pending certifications awaiting processing.'
          ),
        verified: z
          .number()
          .min(0)
          .describe(
            'Number of certifications with verified documentation.'
          ),
      })
      .describe(
        'Statistical summary of the user certification profile for quick insights.'
      ),
  })
  .describe(
    'Complete user certifications profile with all certifications and analytics. Used for comprehensive certification management and insights.'
  )

// =============================================
// FORM AND INPUT VALIDATION SCHEMAS
// =============================================

export const CertificationFormDataSchema = z
  .object({
    certificationId: z
      .string()
      .min(1, 'Certification selection is required')
      .max(100)
      .describe(
        'Selected certification definition ID from the government database.'
      ),
    
    name: createSafeString(1, 200).describe(
      'Display name of the certification (e.g., "Small Business (SB)"). Used for UI display and must match the government database definition.'
    ),
    
    certificationNumber: createSafeOptionalString(100).describe(
      'Optional certification number issued by the certifying agency.'
    ),
    
    obtainedDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
      .refine((date) => {
        const parsed = new Date(date)
        const today = new Date()
        return parsed <= today
      }, 'Obtained date cannot be in the future')
      .describe(
        'Date when the certification was obtained in YYYY-MM-DD format.'
      ),
    
    expirationDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
      .optional()
      .refine((date) => {
        if (!date) return true
        const parsed = new Date(date)
        const today = new Date()
        return parsed > today
      }, 'Expiration date must be in the future')
      .describe(
        'Optional expiration date in YYYY-MM-DD format. Required for certifications that expire.'
      ),
    
    status: CertificationStatusSchema
      .default('active')
      .describe(
        'Status of the certification. Defaults to active for new certifications.'
      ),
    
    verificationStatus: VerificationStatusSchema
      .default('not_required')
      .describe(
        'Verification status for the certification documentation. Defaults to not_required.'
      ),
    
    documentUrl: createSafeUrl()
      .optional()
      .describe(
        'Optional URL to uploaded certification document for verification.'
      ),
    
    issuingOffice: createSafeOptionalString(200).describe(
      'Optional specific office that issued the certification.'
    ),
    
    notes: createSafeOptionalString(1000).describe(
      'Optional additional notes about the certification.'
    ),
    
    isActivated: z
      .boolean()
      .default(true)
      .describe(
        'Whether the certification is activated for opportunity matching. Defaults to true.'
      ),
    
    reminderSettings: z
      .object({
        enabled: z
          .boolean()
          .default(false)
          .describe(
            'Whether to enable expiration reminders. Defaults to false.'
          ),
        reminderDays: z
          .array(
            z
              .number()
              .positive('Reminder days must be positive')
              .max(365, 'Reminder days too far in advance')
          )
          .min(1, 'At least one reminder day required if enabled')
          .max(10, 'Too many reminder days')
          .default([30, 60, 90])
          .describe(
            'Days before expiration to send reminders. Defaults to [30, 60, 90].'
          ),
      })
      .optional()
      .describe(
        'Optional reminder settings for expiration notifications.'
      ),
  })
  .refine(
    (data) => {
      // If expiration date is provided, it must be after obtained date
      if (data.expirationDate && data.obtainedDate) {
        const obtained = new Date(data.obtainedDate)
        const expiration = new Date(data.expirationDate)
        return expiration > obtained
      }
      return true
    },
    {
      message: 'Expiration date must be after obtained date',
      path: ['expirationDate'],
    }
  )
  .describe(
    'Form data schema for creating or editing user certifications. Used in UI forms with client-side validation.'
  )

// =============================================
// SEARCH AND FILTERING SCHEMAS
// =============================================

export const CertificationSearchFiltersSchema = z
  .object({
    industries: z
      .array(createSafeString(1, 100))
      .max(20, 'Too many industries selected')
      .optional()
      .describe(
        'Filter certifications by applicable industries. Maximum 20 industries for performance.'
      ),
    
    organizationLevels: z
      .array(OrganizationLevelSchema)
      .max(5, 'Too many government levels selected')
      .optional()
      .describe(
        'Filter certifications by government level. Maximum 5 levels.'
      ),
    
    priorities: z
      .array(CertificationPrioritySchema)
      .max(4, 'Too many priorities selected')
      .optional()
      .describe(
        'Filter certifications by priority level. Maximum 4 priorities.'
      ),
    
    agencies: z
      .array(createSafeString(1, 100))
      .max(50, 'Too many agencies selected')
      .optional()
      .describe(
        'Filter certifications by issuing agency. Maximum 50 agencies.'
      ),
    
    tags: z
      .array(createSafeString(1, 50))
      .max(20, 'Too many tags selected')
      .optional()
      .describe(
        'Filter certifications by tags. Maximum 20 tags for performance.'
      ),
    
    hasExpiration: z
      .boolean()
      .optional()
      .describe(
        'Filter by whether certifications have expiration dates. True for expiring certifications, false for lifetime.'
      ),
    
    requiresRenewal: z
      .boolean()
      .optional()
      .describe(
        'Filter by whether certifications require renewal. True for certifications that must be renewed.'
      ),
    
    query: createSafeOptionalString(500).describe(
      'Search query for certification names and descriptions. Maximum 500 characters.'
    ),
  })
  .describe(
    'Search filters for finding relevant certifications. Used in certification discovery and recommendation systems.'
  )

// =============================================
// BULK OPERATIONS SCHEMAS
// =============================================

export const CertificationBulkActionSchema = z
  .object({
    action: z
      .enum(['activate', 'deactivate', 'delete', 'update_status', 'set_reminders'])
      .describe(
        'Bulk action to perform on selected certifications. Each action type has specific requirements and effects.'
      ),
    
    certificationIds: z
      .array(z.string().min(1).max(100))
      .min(1, 'At least one certification must be selected')
      .max(50, 'Too many certifications selected for bulk action')
      .describe(
        'Array of certification IDs to perform the action on. Maximum 50 certifications per bulk operation.'
      ),
    
    data: z
      .record(z.any())
      .optional()
      .describe(
        'Additional data required for specific actions. For example, new status for update_status action or reminder settings for set_reminders action.'
      ),
  })
  .refine(
    (data) => {
      // Validate required data for specific actions
      if (data.action === 'update_status' && !data.data?.status) {
        return false
      }
      if (data.action === 'set_reminders' && !data.data?.reminderSettings) {
        return false
      }
      return true
    },
    {
      message: 'Required data missing for the selected action',
      path: ['data'],
    }
  )
  .describe(
    'Bulk action schema for performing operations on multiple certifications simultaneously. Includes validation for action-specific requirements.'
  )

// =============================================
// VALIDATION HELPER FUNCTIONS
// =============================================

/**
 * Validates certification form data with detailed error reporting
 */
export function validateCertificationForm(data: unknown) {
  const result = CertificationFormDataSchema.safeParse(data)
  
  if (!result.success) {
    return {
      success: false as const,
      error: 'Validation failed',
      details: result.error.errors.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
        code: err.code,
      })),
    }
  }
  
  return {
    success: true as const,
    data: result.data,
  }
}

/**
 * Validates user certification data
 */
export function validateUserCertification(data: unknown) {
  const result = UserCertificationSchema.safeParse(data)
  
  if (!result.success) {
    return {
      success: false as const,
      error: 'Validation failed',
      details: result.error.errors.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
        code: err.code,
      })),
    }
  }
  
  return {
    success: true as const,
    data: result.data,
  }
}

/**
 * Validates search filters
 */
export function validateSearchFilters(data: unknown) {
  return CertificationSearchFiltersSchema.safeParse(data)
}

/**
 * Validates bulk action data
 */
export function validateBulkAction(data: unknown) {
  return CertificationBulkActionSchema.safeParse(data)
}

// All schemas are exported individually above where they are defined