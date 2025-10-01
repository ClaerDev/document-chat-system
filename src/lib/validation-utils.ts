/**
 * Enhanced Validation Utilities
 *
 * Comprehensive validation system with:
 * - Real-time field validation
 * - Consolidated validation logic
 * - Enhanced error handling and messaging
 * - Validation state management
 */

// import { z } from 'zod'
import type { Profile, Organization } from '@/types'
// import {
//   ProfileUpdateSchema,
//   OrganizationUpdateSchema,
//   UserUpdateSchema,
//   CertificationFormSchema
// } from '@/lib/validations'

// =============================================
// VALIDATION TYPES
// =============================================

export interface ValidationError {
  field: string
  message: string
  severity: 'error' | 'warning' | 'info'
  code: string
  context?: Record<string, unknown>
}

export interface FieldValidationResult {
  isValid: boolean
  errors: ValidationError[]
  warnings: ValidationError[]
  suggestions: ValidationError[]
  score: number // 0-100 for field completeness
}

export interface FormValidationResult {
  isValid: boolean
  overallScore: number // 0-100
  fieldResults: Record<string, FieldValidationResult>
  errors: ValidationError[]
  warnings: ValidationError[]
  suggestions: ValidationError[]
  nextSteps: string[]
}

export interface ValidationConfig {
  realTimeValidation: boolean
  strictMode: boolean
  showSuggestions: boolean
  debounceMs: number
  requiredFields: string[]
  customRules: Record<string, (value: unknown) => ValidationError[]>
}

export interface ValidationContext {
  userId?: string
  organizationId?: string
  profileId?: string
  locale?: string
  timezone?: string
  businessRules?: Record<string, unknown>
}

// =============================================
// VALIDATION ERROR CODES
// =============================================

export const VALIDATION_CODES = {
  // Field validation
  REQUIRED_FIELD: 'REQUIRED_FIELD',
  INVALID_FORMAT: 'INVALID_FORMAT',
  INVALID_LENGTH: 'INVALID_LENGTH',
  INVALID_RANGE: 'INVALID_RANGE',
  DUPLICATE_VALUE: 'DUPLICATE_VALUE',

  // Business rules
  BUSINESS_RULE_VIOLATION: 'BUSINESS_RULE_VIOLATION',
  CERTIFICATION_EXPIRED: 'CERTIFICATION_EXPIRED',
  NAICS_MISMATCH: 'NAICS_MISMATCH',

  // Security
  SUSPICIOUS_CONTENT: 'SUSPICIOUS_CONTENT',
  XSS_DETECTED: 'XSS_DETECTED',
  SQL_INJECTION: 'SQL_INJECTION',

  // Data integrity
  DATA_INCONSISTENCY: 'DATA_INCONSISTENCY',
  REFERENCE_NOT_FOUND: 'REFERENCE_NOT_FOUND',
  CIRCULAR_REFERENCE: 'CIRCULAR_REFERENCE',
} as const

// =============================================
// FIELD VALIDATORS
// =============================================

export class FieldValidator {
  private static instance: FieldValidator
  private config: ValidationConfig
  private context: ValidationContext

  constructor(
    config: Partial<ValidationConfig> = {},
    context: ValidationContext = {}
  ) {
    this.config = {
      realTimeValidation: true,
      strictMode: false,
      showSuggestions: true,
      debounceMs: 300,
      requiredFields: [],
      customRules: {},
      ...config,
    }
    this.context = context
  }

  static getInstance(
    config?: Partial<ValidationConfig>,
    context?: ValidationContext
  ): FieldValidator {
    if (!FieldValidator.instance) {
      FieldValidator.instance = new FieldValidator(config, context)
    }
    return FieldValidator.instance
  }

  // Company name validation
  validateCompanyName(value: string): FieldValidationResult {
    const errors: ValidationError[] = []
    const warnings: ValidationError[] = []
    const suggestions: ValidationError[] = []

    if (!value || value.trim().length === 0) {
      errors.push({
        field: 'companyName',
        message: 'Company name is required',
        severity: 'error',
        code: VALIDATION_CODES.REQUIRED_FIELD,
      })
    } else {
      // Length validation
      if (value.length < 2) {
        errors.push({
          field: 'companyName',
          message: 'Company name must be at least 2 characters',
          severity: 'error',
          code: VALIDATION_CODES.INVALID_LENGTH,
        })
      } else if (value.length > 300) {
        errors.push({
          field: 'companyName',
          message: 'Company name cannot exceed 300 characters',
          severity: 'error',
          code: VALIDATION_CODES.INVALID_LENGTH,
        })
      }

      // Format validation
      if (!/^[a-zA-Z0-9\s\-\.,&()]+$/.test(value)) {
        warnings.push({
          field: 'companyName',
          message: 'Company name contains unusual characters',
          severity: 'warning',
          code: VALIDATION_CODES.INVALID_FORMAT,
        })
      }

      // Security validation
      if (this.containsSuspiciousContent(value)) {
        errors.push({
          field: 'companyName',
          message: 'Company name contains invalid characters',
          severity: 'error',
          code: VALIDATION_CODES.SUSPICIOUS_CONTENT,
        })
      }

      // Suggestions
      if (
        value.toLowerCase().includes('llc') ||
        value.toLowerCase().includes('inc')
      ) {
        suggestions.push({
          field: 'companyName',
          message:
            'Consider adding the full legal entity type (LLC, Inc., Corp.)',
          severity: 'info',
          code: 'ENTITY_TYPE_SUGGESTION',
        })
      }
    }

    const score = this.calculateFieldScore(
      'companyName',
      value,
      errors.length,
      warnings.length
    )

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions,
      score,
    }
  }

  // Email validation
  validateEmail(value: string): FieldValidationResult {
    const errors: ValidationError[] = []
    const warnings: ValidationError[] = []
    const suggestions: ValidationError[] = []

    if (!value || value.trim().length === 0) {
      if (this.config.requiredFields.includes('primaryContactEmail')) {
        errors.push({
          field: 'primaryContactEmail',
          message: 'Email address is required',
          severity: 'error',
          code: VALIDATION_CODES.REQUIRED_FIELD,
        })
      }
    } else {
      // Format validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(value)) {
        errors.push({
          field: 'primaryContactEmail',
          message: 'Please enter a valid email address',
          severity: 'error',
          code: VALIDATION_CODES.INVALID_FORMAT,
        })
      } else {
        // Domain validation
        const domain = value.split('@')[1]
        if (domain && this.isDisposableEmailDomain(domain)) {
          warnings.push({
            field: 'primaryContactEmail',
            message: 'Consider using a business email address',
            severity: 'warning',
            code: 'DISPOSABLE_EMAIL',
          })
        }

        // Business email suggestion
        if (!this.isBusinessEmail(value)) {
          suggestions.push({
            field: 'primaryContactEmail',
            message:
              'Business email addresses (matching your domain) improve credibility',
            severity: 'info',
            code: 'BUSINESS_EMAIL_SUGGESTION',
          })
        }
      }

      // Length validation
      if (value.length > 320) {
        errors.push({
          field: 'primaryContactEmail',
          message: 'Email address is too long',
          severity: 'error',
          code: VALIDATION_CODES.INVALID_LENGTH,
        })
      }
    }

    const score = this.calculateFieldScore(
      'primaryContactEmail',
      value,
      errors.length,
      warnings.length
    )

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions,
      score,
    }
  }

  // NAICS code validation
  validateNaicsCode(value: string, isSecondary = false): FieldValidationResult {
    const errors: ValidationError[] = []
    const warnings: ValidationError[] = []
    const suggestions: ValidationError[] = []
    const fieldName = isSecondary ? 'secondaryNaics' : 'primaryNaics'

    if (!value || value.trim().length === 0) {
      if (!isSecondary && this.config.requiredFields.includes('primaryNaics')) {
        errors.push({
          field: fieldName,
          message: 'Primary NAICS code is required',
          severity: 'error',
          code: VALIDATION_CODES.REQUIRED_FIELD,
        })
      }
    } else {
      // Format validation
      if (!/^\d{6}$/.test(value)) {
        errors.push({
          field: fieldName,
          message: 'NAICS code must be exactly 6 digits',
          severity: 'error',
          code: VALIDATION_CODES.INVALID_FORMAT,
        })
      } else {
        // Valid NAICS range check
        const naicsInt = parseInt(value)
        if (naicsInt < 111110 || naicsInt > 999999) {
          warnings.push({
            field: fieldName,
            message: 'NAICS code appears to be outside valid range',
            severity: 'warning',
            code: VALIDATION_CODES.INVALID_RANGE,
          })
        }

        // Industry suggestions
        const industryInfo = this.getNaicsIndustryInfo(value)
        if (industryInfo) {
          suggestions.push({
            field: fieldName,
            message: `This code represents: ${industryInfo.title}`,
            severity: 'info',
            code: 'NAICS_INFO',
            context: { industryInfo },
          })
        }
      }
    }

    const score = this.calculateFieldScore(
      fieldName,
      value,
      errors.length,
      warnings.length
    )

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions,
      score,
    }
  }

  // UEI validation
  validateUEI(value: string): FieldValidationResult {
    const errors: ValidationError[] = []
    const warnings: ValidationError[] = []
    const suggestions: ValidationError[] = []

    if (value && value.trim().length > 0) {
      // Format validation
      if (!/^[A-Z0-9]{12}$/.test(value)) {
        errors.push({
          field: 'uei',
          message: 'UEI must be exactly 12 alphanumeric characters',
          severity: 'error',
          code: VALIDATION_CODES.INVALID_FORMAT,
        })
      } else {
        // UEI format pattern validation
        if (!this.isValidUEIPattern(value)) {
          warnings.push({
            field: 'uei',
            message: 'UEI format appears unusual, please verify',
            severity: 'warning',
            code: 'UEI_FORMAT_WARNING',
          })
        }

        suggestions.push({
          field: 'uei',
          message:
            'UEI has replaced DUNS numbers for government contracting since April 2022',
          severity: 'info',
          code: 'UEI_INFO',
        })
      }
    } else if (this.config.strictMode) {
      warnings.push({
        field: 'uei',
        message: 'UEI is required for government contracting',
        severity: 'warning',
        code: 'UEI_RECOMMENDED',
      })
    }

    const score = this.calculateFieldScore(
      'uei',
      value,
      errors.length,
      warnings.length
    )

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions,
      score,
    }
  }

  // Phone number validation
  validatePhoneNumber(value: string): FieldValidationResult {
    const errors: ValidationError[] = []
    const warnings: ValidationError[] = []
    const suggestions: ValidationError[] = []

    if (value && value.trim().length > 0) {
      // Basic format validation
      if (!/^[\+]?[\d\s\-\(\)\.]{7,20}$/.test(value)) {
        errors.push({
          field: 'primaryContactPhone',
          message: 'Invalid phone number format',
          severity: 'error',
          code: VALIDATION_CODES.INVALID_FORMAT,
        })
      } else {
        // Digit count validation
        const digitsOnly = value.replace(/[^\d]/g, '')
        if (digitsOnly.length < 10) {
          errors.push({
            field: 'primaryContactPhone',
            message: 'Phone number must contain at least 10 digits',
            severity: 'error',
            code: VALIDATION_CODES.INVALID_LENGTH,
          })
        } else if (digitsOnly.length > 15) {
          errors.push({
            field: 'primaryContactPhone',
            message: 'Phone number cannot exceed 15 digits',
            severity: 'error',
            code: VALIDATION_CODES.INVALID_LENGTH,
          })
        }

        // US phone number formatting suggestion
        if (digitsOnly.length === 10 && !value.includes('(')) {
          suggestions.push({
            field: 'primaryContactPhone',
            message: 'Consider formatting as (555) 123-4567 for clarity',
            severity: 'info',
            code: 'PHONE_FORMAT_SUGGESTION',
          })
        }
      }
    }

    const score = this.calculateFieldScore(
      'primaryContactPhone',
      value,
      errors.length,
      warnings.length
    )

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions,
      score,
    }
  }

  // State code validation
  validateStateCode(value: string): FieldValidationResult {
    const errors: ValidationError[] = []
    const warnings: ValidationError[] = []
    const suggestions: ValidationError[] = []

    const validStates = [
      'AL',
      'AK',
      'AZ',
      'AR',
      'CA',
      'CO',
      'CT',
      'DE',
      'FL',
      'GA',
      'HI',
      'ID',
      'IL',
      'IN',
      'IA',
      'KS',
      'KY',
      'LA',
      'ME',
      'MD',
      'MA',
      'MI',
      'MN',
      'MS',
      'MO',
      'MT',
      'NE',
      'NV',
      'NH',
      'NJ',
      'NM',
      'NY',
      'NC',
      'ND',
      'OH',
      'OK',
      'OR',
      'PA',
      'RI',
      'SC',
      'SD',
      'TN',
      'TX',
      'UT',
      'VT',
      'VA',
      'WA',
      'WV',
      'WI',
      'WY',
      'DC',
    ]

    if (value && value.trim().length > 0) {
      if (value.length !== 2) {
        errors.push({
          field: 'state',
          message: 'State code must be 2 characters',
          severity: 'error',
          code: VALIDATION_CODES.INVALID_LENGTH,
        })
      } else if (!validStates.includes(value.toUpperCase())) {
        errors.push({
          field: 'state',
          message: 'Invalid state code',
          severity: 'error',
          code: VALIDATION_CODES.INVALID_FORMAT,
        })
      }
    }

    const score = this.calculateFieldScore(
      'state',
      value,
      errors.length,
      warnings.length
    )

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions,
      score,
    }
  }

  // ZIP code validation
  validateZipCode(value: string): FieldValidationResult {
    const errors: ValidationError[] = []
    const warnings: ValidationError[] = []
    const suggestions: ValidationError[] = []

    if (value && value.trim().length > 0) {
      if (!/^\d{5}(-\d{4})?$/.test(value)) {
        errors.push({
          field: 'zipCode',
          message: 'ZIP code must be in format 12345 or 12345-6789',
          severity: 'error',
          code: VALIDATION_CODES.INVALID_FORMAT,
        })
      } else if (value.length === 5) {
        suggestions.push({
          field: 'zipCode',
          message:
            'Consider using ZIP+4 format (12345-6789) for more precise location',
          severity: 'info',
          code: 'ZIP_PLUS4_SUGGESTION',
        })
      }
    }

    const score = this.calculateFieldScore(
      'zipCode',
      value,
      errors.length,
      warnings.length
    )

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions,
      score,
    }
  }

  // Certification date validation
  validateCertificationDate(
    value: string,
    certificationType: string
  ): FieldValidationResult {
    const errors: ValidationError[] = []
    const warnings: ValidationError[] = []
    const suggestions: ValidationError[] = []
    const fieldName = `${certificationType}ExpirationDate`

    if (value && value.trim().length > 0) {
      const date = new Date(value)
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      if (isNaN(date.getTime())) {
        errors.push({
          field: fieldName,
          message: 'Invalid date format',
          severity: 'error',
          code: VALIDATION_CODES.INVALID_FORMAT,
        })
      } else if (date <= today) {
        errors.push({
          field: fieldName,
          message: 'Certification expiration date must be in the future',
          severity: 'error',
          code: VALIDATION_CODES.CERTIFICATION_EXPIRED,
        })
      } else {
        // Warning for certificates expiring soon
        const warningDate = new Date()
        warningDate.setMonth(warningDate.getMonth() + 3)

        if (date <= warningDate) {
          warnings.push({
            field: fieldName,
            message: 'Certification expires within 3 months',
            severity: 'warning',
            code: 'CERTIFICATION_EXPIRING_SOON',
          })
        }

        // Suggestion for renewal planning
        const renewalDate = new Date(date)
        renewalDate.setMonth(renewalDate.getMonth() - 6)

        if (new Date() >= renewalDate) {
          suggestions.push({
            field: fieldName,
            message:
              'Consider starting renewal process 6 months before expiration',
            severity: 'info',
            code: 'RENEWAL_PLANNING_SUGGESTION',
          })
        }
      }
    }

    const score = this.calculateFieldScore(
      fieldName,
      value,
      errors.length,
      warnings.length
    )

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions,
      score,
    }
  }

  // ==========================================
  // HELPER METHODS
  // ==========================================

  private calculateFieldScore(
    fieldName: string,
    value: unknown,
    errorCount: number,
    warningCount: number
  ): number {
    if (errorCount > 0) return 0

    let score = 60 // Base score for having a value

    if (!value || value.toString().trim() === '') {
      return this.config.requiredFields.includes(fieldName) ? 0 : 20
    }

    score += 40 // Bonus for having valid content

    // Deduct for warnings
    score -= warningCount * 10

    // Field-specific scoring
    switch (fieldName) {
      case 'companyName':
        if (value.length > 10) score += 10
        break
      case 'primaryContactEmail':
        if (this.isBusinessEmail(value)) score += 10
        break
      case 'primaryNaics':
        score += 10 // NAICS is important
        break
    }

    return Math.max(0, Math.min(100, score))
  }

  private containsSuspiciousContent(value: string): boolean {
    const suspiciousPatterns = [
      /<script[^>]*>/i,
      /javascript:/i,
      /on\w+\s*=/i,
      /<iframe/i,
      /<object/i,
      /<embed/i,
      /union.*select/i,
      /drop.*table/i,
    ]

    return suspiciousPatterns.some((pattern) => pattern.test(value))
  }

  private isDisposableEmailDomain(domain: string): boolean {
    const disposableDomains = [
      'tempmail.org',
      '10minutemail.com',
      'guerrillamail.com',
      'mailinator.com',
      'yopmail.com',
      'temp-mail.org',
    ]
    return disposableDomains.includes(domain.toLowerCase())
  }

  private isBusinessEmail(email: string): boolean {
    const freeEmailDomains = [
      'gmail.com',
      'yahoo.com',
      'hotmail.com',
      'outlook.com',
      'aol.com',
      'icloud.com',
      'mail.com',
    ]
    const domain = email.split('@')[1]
    return domain && !freeEmailDomains.includes(domain.toLowerCase())
  }

  private isValidUEIPattern(uei: string): boolean {
    // Basic UEI pattern validation (simplified)
    // Real UEI validation would require checking against SAM.gov
    return /^[A-Z0-9]{12}$/.test(uei) && !uei.includes('000000')
  }

  private getNaicsIndustryInfo(
    naicsCode: string
  ): { title: string; sector: string } | null {
    // This would typically come from a NAICS database
    // Simplified version for demo
    const naicsMap: Record<string, { title: string; sector: string }> = {
      '541511': {
        title: 'Custom Computer Programming Services',
        sector: 'Professional, Scientific, and Technical Services',
      },
      '541512': {
        title: 'Computer Systems Design Services',
        sector: 'Professional, Scientific, and Technical Services',
      },
      '541519': {
        title: 'Other Computer Related Services',
        sector: 'Professional, Scientific, and Technical Services',
      },
      '541611': {
        title:
          'Administrative Management and General Management Consulting Services',
        sector: 'Professional, Scientific, and Technical Services',
      },
      '541990': {
        title: 'All Other Professional, Scientific, and Technical Services',
        sector: 'Professional, Scientific, and Technical Services',
      },
    }

    return naicsMap[naicsCode] || null
  }
}

// =============================================
// FORM VALIDATORS
// =============================================

export class FormValidator {
  private fieldValidator: FieldValidator

  constructor(
    config: Partial<ValidationConfig> = {},
    context: ValidationContext = {}
  ) {
    this.fieldValidator = new FieldValidator(config, context)
  }

  // Validate entire profile form
  async validateProfileForm(
    profile: Partial<Profile>
  ): Promise<FormValidationResult> {
    const fieldResults: Record<string, FieldValidationResult> = {}
    const allErrors: ValidationError[] = []
    const allWarnings: ValidationError[] = []
    const allSuggestions: ValidationError[] = []

    // Validate individual fields
    if (profile.companyName !== undefined) {
      fieldResults.companyName = this.fieldValidator.validateCompanyName(
        profile.companyName
      )
    }

    if (profile.primaryContactEmail !== undefined) {
      fieldResults.primaryContactEmail = this.fieldValidator.validateEmail(
        profile.primaryContactEmail
      )
    }

    if (profile.primaryNaics !== undefined) {
      fieldResults.primaryNaics = this.fieldValidator.validateNaicsCode(
        profile.primaryNaics
      )
    }

    if (profile.uei !== undefined) {
      fieldResults.uei = this.fieldValidator.validateUEI(profile.uei)
    }

    if (profile.primaryContactPhone !== undefined) {
      fieldResults.primaryContactPhone =
        this.fieldValidator.validatePhoneNumber(profile.primaryContactPhone)
    }

    if (profile.state !== undefined) {
      fieldResults.state = this.fieldValidator.validateStateCode(profile.state)
    }

    if (profile.zipCode !== undefined) {
      fieldResults.zipCode = this.fieldValidator.validateZipCode(
        profile.zipCode
      )
    }

    // Validate certifications if present
    if (profile.certifications) {
      const certResults = await this.validateCertifications(
        profile.certifications
      )
      Object.assign(fieldResults, certResults)
    }

    // Collect all validation results
    Object.values(fieldResults).forEach((result) => {
      allErrors.push(...result.errors)
      allWarnings.push(...result.warnings)
      allSuggestions.push(...result.suggestions)
    })

    // Cross-field validations
    const crossFieldResults = this.performCrossFieldValidation(profile)
    allErrors.push(...crossFieldResults.errors)
    allWarnings.push(...crossFieldResults.warnings)
    allSuggestions.push(...crossFieldResults.suggestions)

    // Calculate overall score
    const fieldScores = Object.values(fieldResults).map((r) => r.score)
    const overallScore =
      fieldScores.length > 0
        ? Math.round(
            fieldScores.reduce((sum, score) => sum + score, 0) /
              fieldScores.length
          )
        : 0

    // Generate next steps
    const nextSteps = this.generateNextSteps(profile, fieldResults, allErrors)

    return {
      isValid: allErrors.length === 0,
      overallScore,
      fieldResults,
      errors: allErrors,
      warnings: allWarnings,
      suggestions: allSuggestions,
      nextSteps,
    }
  }

  // Validate organization form
  async validateOrganizationForm(
    organization: Partial<Organization>
  ): Promise<FormValidationResult> {
    const fieldResults: Record<string, FieldValidationResult> = {}
    const allErrors: ValidationError[] = []
    const allWarnings: ValidationError[] = []
    const allSuggestions: ValidationError[] = []

    // Organization name validation
    if (organization.name !== undefined) {
      fieldResults.name = this.fieldValidator.validateCompanyName(
        organization.name
      )
    }

    // Slug validation
    if (organization.slug !== undefined) {
      fieldResults.slug = this.validateOrganizationSlug(organization.slug)
    }

    // Collect results
    Object.values(fieldResults).forEach((result) => {
      allErrors.push(...result.errors)
      allWarnings.push(...result.warnings)
      allSuggestions.push(...result.suggestions)
    })

    const fieldScores = Object.values(fieldResults).map((r) => r.score)
    const overallScore =
      fieldScores.length > 0
        ? Math.round(
            fieldScores.reduce((sum, score) => sum + score, 0) /
              fieldScores.length
          )
        : 0

    return {
      isValid: allErrors.length === 0,
      overallScore,
      fieldResults,
      errors: allErrors,
      warnings: allWarnings,
      suggestions: allSuggestions,
      nextSteps: [],
    }
  }

  // ==========================================
  // HELPER METHODS
  // ==========================================

  private async validateCertifications(
    certifications: Record<string, unknown>
  ): Promise<Record<string, FieldValidationResult>> {
    const results: Record<string, FieldValidationResult> = {}

    // Validate each certification expiration date
    const certTypes = [
      'eightA',
      'hubZone',
      'sdvosb',
      'wosb',
      'edwosb',
      'vosb',
      'sdb',
      'gsaSchedule',
      'iso9001',
    ]

    for (const certType of certTypes) {
      if (
        certifications[
          `has${certType.charAt(0).toUpperCase() + certType.slice(1)}`
        ]
      ) {
        const expirationDate = certifications[`${certType}ExpirationDate`]
        if (expirationDate) {
          results[`${certType}ExpirationDate`] =
            this.fieldValidator.validateCertificationDate(
              expirationDate,
              certType
            )
        }
      }
    }

    return results
  }

  private performCrossFieldValidation(profile: Partial<Profile>): {
    errors: ValidationError[]
    warnings: ValidationError[]
    suggestions: ValidationError[]
  } {
    const errors: ValidationError[] = []
    const warnings: ValidationError[] = []
    const suggestions: ValidationError[] = []

    // Email domain vs website domain consistency
    if (profile.primaryContactEmail && profile.website) {
      const emailDomain = profile.primaryContactEmail.split('@')[1]
      const websiteDomain = profile.website
        .replace(/^https?:\/\//, '')
        .replace(/^www\./, '')
        .split('/')[0]

      if (emailDomain && websiteDomain && emailDomain !== websiteDomain) {
        suggestions.push({
          field: 'consistency',
          message:
            'Consider using an email address that matches your website domain',
          severity: 'info',
          code: 'DOMAIN_CONSISTENCY_SUGGESTION',
        })
      }
    }

    // UEI vs DUNS consistency
    if (profile.uei && profile.duns) {
      warnings.push({
        field: 'identifiers',
        message:
          'UEI has replaced DUNS numbers - consider removing DUNS if UEI is current',
        severity: 'warning',
        code: 'IDENTIFIER_TRANSITION',
      })
    }

    // Business type vs certifications consistency
    if (profile.businessType === 'Corporation' && profile.certifications) {
      const certs = profile.certifications as Record<string, unknown>
      if (certs.hasSdb || certs.has8a) {
        warnings.push({
          field: 'businessType',
          message:
            'Verify corporation status is compatible with small business certifications',
          severity: 'warning',
          code: 'BUSINESS_TYPE_CERT_CONSISTENCY',
        })
      }
    }

    return { errors, warnings, suggestions }
  }

  private validateOrganizationSlug(slug: string): FieldValidationResult {
    const errors: ValidationError[] = []
    const warnings: ValidationError[] = []
    const suggestions: ValidationError[] = []

    if (!slug || slug.trim().length === 0) {
      errors.push({
        field: 'slug',
        message: 'Organization slug is required',
        severity: 'error',
        code: VALIDATION_CODES.REQUIRED_FIELD,
      })
    } else {
      // Format validation
      if (!/^[a-z0-9-]+$/.test(slug)) {
        errors.push({
          field: 'slug',
          message:
            'Slug must contain only lowercase letters, numbers, and hyphens',
          severity: 'error',
          code: VALIDATION_CODES.INVALID_FORMAT,
        })
      }

      // Length validation
      if (slug.length < 3) {
        errors.push({
          field: 'slug',
          message: 'Slug must be at least 3 characters',
          severity: 'error',
          code: VALIDATION_CODES.INVALID_LENGTH,
        })
      } else if (slug.length > 50) {
        errors.push({
          field: 'slug',
          message: 'Slug cannot exceed 50 characters',
          severity: 'error',
          code: VALIDATION_CODES.INVALID_LENGTH,
        })
      }

      // Reserved words check
      const reservedSlugs = [
        'admin',
        'api',
        'www',
        'mail',
        'ftp',
        'localhost',
        'app',
        'dashboard',
        'settings',
      ]
      if (reservedSlugs.includes(slug)) {
        errors.push({
          field: 'slug',
          message: 'This slug is reserved and cannot be used',
          severity: 'error',
          code: 'RESERVED_SLUG',
        })
      }

      // Consecutive hyphens
      if (slug.includes('--')) {
        errors.push({
          field: 'slug',
          message: 'Slug cannot contain consecutive hyphens',
          severity: 'error',
          code: VALIDATION_CODES.INVALID_FORMAT,
        })
      }
    }

    const score = this.fieldValidator['calculateFieldScore'](
      'slug',
      slug,
      errors.length,
      warnings.length
    )

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions,
      score,
    }
  }

  private generateNextSteps(
    profile: Partial<Profile>,
    fieldResults: Record<string, FieldValidationResult>,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _errors: ValidationError[]
  ): string[] {
    const steps: string[] = []

    // Priority order for missing required fields
    const fieldPriority = [
      'companyName',
      'primaryContactEmail',
      'primaryNaics',
      'addressLine1',
      'city',
      'state',
      'zipCode',
    ]

    for (const field of fieldPriority) {
      const result = fieldResults[field]
      if (result && !result.isValid) {
        const fieldName = field.replace(/([A-Z])/g, ' $1').toLowerCase()
        steps.push(`Fix ${fieldName} validation errors`)
      } else if (!profile[field as keyof Profile]) {
        const fieldName = field.replace(/([A-Z])/g, ' $1').toLowerCase()
        steps.push(`Add ${fieldName}`)
      }
    }

    // Add certification suggestions
    if (
      !profile.certifications ||
      Object.keys(profile.certifications).length === 0
    ) {
      steps.push('Add relevant business certifications')
    }

    // Add capabilities suggestions
    if (!profile.coreCompetencies || profile.coreCompetencies.length === 0) {
      steps.push('List your core competencies')
    }

    return steps.slice(0, 5) // Limit to top 5 next steps
  }
}

// =============================================
// VALIDATION HOOKS & UTILITIES
// =============================================

export function createValidationConfig(
  overrides: Partial<ValidationConfig> = {}
): ValidationConfig {
  return {
    realTimeValidation: true,
    strictMode: false,
    showSuggestions: true,
    debounceMs: 300,
    requiredFields: ['companyName', 'primaryContactEmail', 'primaryNaics'],
    customRules: {},
    ...overrides,
  }
}

export function createValidationContext(
  overrides: Partial<ValidationContext> = {}
): ValidationContext {
  return {
    locale: 'en-US',
    timezone: 'America/New_York',
    businessRules: {},
    ...overrides,
  }
}

// Debounced validation utility
export function debounceValidation<T extends unknown[]>(
  fn: (...args: T) => Promise<unknown>,
  delay: number
): (...args: T) => Promise<unknown> {
  let timeoutId: NodeJS.Timeout | null = null

  return (...args: T): Promise<unknown> => {
    return new Promise((resolve, reject) => {
      if (timeoutId) {
        clearTimeout(timeoutId)
      }

      timeoutId = setTimeout(async () => {
        try {
          const result = await fn(...args)
          resolve(result)
        } catch (error) {
          reject(error)
        }
      }, delay)
    })
  }
}

// Validation message formatting
export function formatValidationMessage(error: ValidationError): string {
  const prefixes = {
    error: '❌',
    warning: '⚠️',
    info: '💡',
  }

  return `${prefixes[error.severity]} ${error.message}`
}

// Validation summary helper
export function getValidationSummary(result: FormValidationResult): {
  total: number
  errors: number
  warnings: number
  suggestions: number
  score: number
} {
  return {
    total:
      result.errors.length + result.warnings.length + result.suggestions.length,
    errors: result.errors.length,
    warnings: result.warnings.length,
    suggestions: result.suggestions.length,
    score: result.overallScore,
  }
}

export { FormValidator as EnhancedFormValidator }
