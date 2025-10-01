/**
 * Validation Utilities for Document Chat System Store
 *
 * Provides validation functions for different store slices to ensure data consistency
 */

import type { Profile, User } from '@/types'

interface ProfileValidationError {
  message: string
  severity: 'error' | 'warning'
  code: string
}

interface ValidationResult {
  isValid: boolean
  score: number
  totalFields: number
  completedFields: number
  errors: ProfileValidationError[]
  warnings: ProfileValidationError[]
  suggestions: ProfileValidationError[]
}

interface OpportunityFilters {
  [key: string]: any
}

// =============================================
// PROFILE VALIDATION
// =============================================

export function validateProfileData(profile: Partial<Profile>): ValidationResult {
  const errors: ProfileValidationError[] = []
  const warnings: ProfileValidationError[] = []
  const totalFields = 10
  let completedFields = 0

  // Company name validation
  if (!profile.companyName || profile.companyName.trim().length === 0) {
    errors.push({
      message: 'Company name is required',
      severity: 'error',
      code: 'REQUIRED_FIELD'
    })
  } else {
    completedFields++
  }

  // Email validation
  if (profile.primaryContactEmail) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(profile.primaryContactEmail)) {
      errors.push({
        message: 'Please enter a valid email address',
        severity: 'error',
        code: 'INVALID_FORMAT'
      })
    } else {
      completedFields++
    }
  }

  // UEI validation
  if (profile.uei && (profile.uei.length !== 12 || !/^[A-Z0-9]+$/.test(profile.uei))) {
    errors.push({
      message: 'UEI must be 12 alphanumeric characters',
      severity: 'error',
      code: 'INVALID_FORMAT'
    })
  } else if (profile.uei) {
    completedFields++
  }

  // DUNS validation
  if (profile.duns && (profile.duns.length !== 9 || !/^\d+$/.test(profile.duns))) {
    errors.push({
      message: 'DUNS must be 9 digits',
      severity: 'error',
      code: 'INVALID_FORMAT'
    })
  } else if (profile.duns) {
    completedFields++
  }

  return {
    isValid: errors.length === 0,
    score: Math.round((completedFields / totalFields) * 100),
    totalFields,
    completedFields,
    errors,
    warnings,
    suggestions: []
  }
}

// =============================================
// USER VALIDATION
// =============================================

export function validateUserData(user: Partial<User>): ValidationResult {
  const errors: ProfileValidationError[] = []
  const warnings: ProfileValidationError[] = []
  const totalFields = 5
  let completedFields = 0

  // Email validation
  if (!user.email || user.email.trim().length === 0) {
    errors.push({
      message: 'Email is required',
      severity: 'error',
      code: 'REQUIRED_FIELD'
    })
  } else {
    completedFields++
  }

  // First name validation
  if (user.firstName) {
    completedFields++
  }

  // Last name validation
  if (user.lastName) {
    completedFields++
  }

  return {
    isValid: errors.length === 0,
    score: Math.round((completedFields / totalFields) * 100),
    totalFields,
    completedFields,
    errors,
    warnings,
    suggestions: []
  }
}

// =============================================
// OPPORTUNITY FILTERS VALIDATION
// =============================================

export function validateOpportunityFilters(filters: OpportunityFilters): ValidationResult {
  const errors: ProfileValidationError[] = []
  const warnings: ProfileValidationError[] = []
  const totalFields = 3
  let completedFields = 0

  // Basic validation - can be expanded as needed
  if (filters.search && typeof filters.search === 'string') {
    completedFields++
  }

  if (filters.location && typeof filters.location === 'string') {
    completedFields++
  }

  if (filters.naics && Array.isArray(filters.naics)) {
    completedFields++
  }

  return {
    isValid: errors.length === 0,
    score: Math.round((completedFields / totalFields) * 100),
    totalFields,
    completedFields,
    errors,
    warnings,
    suggestions: []
  }
}