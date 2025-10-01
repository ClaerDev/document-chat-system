/**
 * Profile Field Analysis Utilities
 * 
 * Dynamic utility functions for analyzing profile completeness, field counting,
 * and validation. These utilities automatically detect profile structure changes
 * and provide accurate field counting for completeness scoring.
 * 
 * Usage:
 * - Profile completeness calculations
 * - Field validation and missing field detection
 * - Dynamic form analysis
 * - Application-wide profile field counting
 */

import { Profile } from '@/types'

// =============================================
// PROFILE FIELD STRUCTURE DEFINITIONS
// =============================================

/**
 * Complete profile field definitions based on actual form schemas
 * This structure is automatically used for dynamic field counting
 */
export const PROFILE_FIELD_STRUCTURE = {
  // BASIC INFO TAB (22 fields from ProfileBasicForm.tsx schema)
  basicInfo: {
    category: 'Basic Information',
    weight: 0.40, // 40% of total profile weight
    fields: [
      // Company Identity (5 fields)
      'companyName',
      'dbaName', 
      'uei',
      'duns', 
      'cageCode',
      
      // Business Address (6 fields)
      'addressLine1',
      'addressLine2', 
      'city',
      'state',
      'zipCode',
      'country',
      
      // Contact Information (4 fields)
      'primaryContactName',
      'primaryContactEmail', 
      'primaryContactPhone',
      'website',
      
      // Professional Branding (3 fields)
      'logoUrl',
      'bannerUrl',
      'contactProfileImageUrl',
      
      // Business Details (4 fields)
      'businessType',
      'yearEstablished',
      'employeeCount',
      'annualRevenue'
    ]
  },

  // NAICS CODES TAB (2 fields)
  naicsCodes: {
    category: 'NAICS Classification',
    weight: 0.20, // 20% of total profile weight
    fields: [
      'primaryNaics',
      'secondaryNaics' // Array field
    ]
  },

  // CERTIFICATIONS TAB (2 complex structures)
  certifications: {
    category: 'Certifications & Set-Asides',
    weight: 0.15, // 15% of total profile weight
    fields: [
      'certifications', // Complex object with certifications[] and setAsides[]
      'setAsides' // May be standalone or part of certifications object
    ]
  },

  // CAPABILITIES TAB (5 complex structures)
  capabilities: {
    category: 'Capabilities & Experience',
    weight: 0.25, // 25% of total profile weight
    fields: [
      'coreCompetencies',        // Array field
      'securityClearance',       // Single value
      'governmentLevels',        // Array field
      'geographicPreferences',   // Complex object with nested structures
      'pastPerformance'          // Complex object with multiple sub-fields
    ]
  },

  // SETTINGS TAB (2 fields - excluded from completeness)
  settings: {
    category: 'Communication Preferences',
    weight: 0.0, // 0% - excluded from profile completeness
    excluded: true,
    fields: [
      'brandVoice',  // Communication preference
      'brandTone'    // Communication preference
    ]
  }
} as const

// =============================================
// FIELD ANALYSIS FUNCTIONS
// =============================================

/**
 * Get all profile fields that count toward completeness
 * Automatically excludes settings fields per research findings
 */
export function getProfileCompletenessFields(): string[] {
  const fields: string[] = []
  
  for (const [categoryKey, categoryData] of Object.entries(PROFILE_FIELD_STRUCTURE)) {
    if (!categoryData.excluded) {
      fields.push(...categoryData.fields)
    }
  }
  
  return fields
}

/**
 * Get all profile fields including settings (for comprehensive analysis)
 */
export function getAllProfileFields(): string[] {
  const fields: string[] = []
  
  for (const [categoryKey, categoryData] of Object.entries(PROFILE_FIELD_STRUCTURE)) {
    fields.push(...categoryData.fields)
  }
  
  return fields
}

/**
 * Get field count by category
 */
export function getFieldCountByCategory(): Record<string, number> {
  const counts: Record<string, number> = {}
  
  for (const [categoryKey, categoryData] of Object.entries(PROFILE_FIELD_STRUCTURE)) {
    counts[categoryData.category] = categoryData.fields.length
  }
  
  return counts
}

/**
 * Get total profile completeness field count
 * This is the authoritative count used throughout the application
 */
export function getTotalProfileFields(): number {
  return getProfileCompletenessFields().length
}

/**
 * Get comprehensive field breakdown for debugging/analysis
 */
export function getProfileFieldAnalysis() {
  const completenessFields = getProfileCompletenessFields()
  const allFields = getAllProfileFields()
  const categoryBreakdown = getFieldCountByCategory()
  
  return {
    totalCompletenessFields: completenessFields.length,
    totalFormFields: allFields.length,
    completenessFields,
    allFields,
    categoryBreakdown,
    excludedFields: PROFILE_FIELD_STRUCTURE.settings.fields,
    structure: PROFILE_FIELD_STRUCTURE
  }
}

// =============================================
// FIELD VALIDATION FUNCTIONS
// =============================================

/**
 * Check if a profile field has a meaningful value
 * Handles different field types and complex objects
 */
export function isFieldComplete(profile: Profile, fieldName: string): boolean {
  const value = profile[fieldName as keyof Profile]
  
  // Handle null/undefined
  if (value === null || value === undefined) {
    return false
  }
  
  // Handle empty strings
  if (typeof value === 'string' && value.trim() === '') {
    return false
  }
  
  // Handle arrays
  if (Array.isArray(value)) {
    return value.length > 0
  }
  
  // Handle complex objects based on field type
  switch (fieldName) {
    case 'certifications':
      if (typeof value === 'object' && value !== null) {
        const certs = value as any
        // Check new structure: { certifications: [...], setAsides: [...] }
        if ('certifications' in certs && 'setAsides' in certs) {
          return (Array.isArray(certs.certifications) && certs.certifications.length > 0) || 
                 (Array.isArray(certs.setAsides) && certs.setAsides.length > 0)
        }
        // Check legacy structure: { has8a: true, hasHubZone: false, ... }
        return Object.entries(certs).some(([k, v]) => k.startsWith('has') && v === true)
      }
      return false

    case 'setAsides':
      // setAsides might be standalone array or part of certifications object
      if (Array.isArray(value)) {
        return value.length > 0
      }
      // Check if it's part of certifications object
      const certifications = (profile as any).certifications
      if (certifications && typeof certifications === 'object' && 'setAsides' in certifications) {
        return Array.isArray(certifications.setAsides) && certifications.setAsides.length > 0
      }
      return false

    case 'pastPerformance':
      if (typeof value === 'object' && value !== null) {
        const perfData = value as any
        // Consider complete if it has any meaningful past performance data
        return !!(perfData.description || 
                 perfData.totalContractValue || 
                 perfData.yearsInBusiness || 
                 (Array.isArray(perfData.keyProjects) && perfData.keyProjects.length > 0))
      }
      return false

    case 'geographicPreferences':
      if (typeof value === 'object' && value !== null) {
        const geoData = value as any
        // Check for location preferences
        if (geoData.preferences) {
          if (Array.isArray(geoData.preferences)) {
            // Legacy flat array structure
            return geoData.preferences.length > 0
          }
          if (typeof geoData.preferences === 'object') {
            // New grouped structure: { country: [], state: [], city: [], ... }
            return Object.values(geoData.preferences).some(
              (arr: any) => Array.isArray(arr) && arr.length > 0
            )
          }
        }
        // Check for travel preferences
        return !!(geoData.workFromHome !== undefined || 
                 geoData.travelWillingness || 
                 geoData.maxTravelPercentage !== undefined)
      }
      return false

    default:
      // For simple fields, any truthy value (except empty string) counts
      return !!value
  }
}

/**
 * Calculate completion percentage for a specific category
 */
export function calculateCategoryCompletion(profile: Profile, categoryKey: keyof typeof PROFILE_FIELD_STRUCTURE): number {
  const category = PROFILE_FIELD_STRUCTURE[categoryKey]
  if (category.excluded) return 100 // Settings always considered "complete" for UI purposes
  
  const fields = category.fields
  const completedFields = fields.filter(field => isFieldComplete(profile, field))
  
  return fields.length > 0 ? Math.round((completedFields.length / fields.length) * 100) : 0
}

/**
 * Get detailed completion analysis
 */
export function analyzeProfileCompletion(profile: Profile) {
  const analysis = {
    overall: 0,
    categories: {} as Record<string, { percentage: number; completed: number; total: number; fields: string[] }>,
    completedFields: [] as string[],
    missingFields: [] as string[],
    totalFields: 0,
    completedCount: 0
  }
  
  const completenessFields = getProfileCompletenessFields()
  analysis.totalFields = completenessFields.length
  
  // Analyze each category
  for (const [categoryKey, categoryData] of Object.entries(PROFILE_FIELD_STRUCTURE)) {
    if (categoryData.excluded) continue
    
    const completion = calculateCategoryCompletion(profile, categoryKey as keyof typeof PROFILE_FIELD_STRUCTURE)
    const completedInCategory = categoryData.fields.filter(field => isFieldComplete(profile, field))
    
    analysis.categories[categoryData.category] = {
      percentage: completion,
      completed: completedInCategory.length,
      total: categoryData.fields.length,
      fields: categoryData.fields
    }
    
    analysis.completedFields.push(...completedInCategory)
  }
  
  // Calculate overall completion
  analysis.completedCount = analysis.completedFields.length
  analysis.overall = Math.round((analysis.completedCount / analysis.totalFields) * 100)
  
  // Find missing fields
  analysis.missingFields = completenessFields.filter(field => !isFieldComplete(profile, field))
  
  return analysis
}

/**
 * Get missing critical fields (must-have fields)
 */
export function getMissingCriticalFields(profile: Profile): string[] {
  const criticalFields = [
    'companyName',
    'primaryNaics',
    'primaryContactEmail'
  ]
  
  return criticalFields.filter(field => !isFieldComplete(profile, field))
}

/**
 * Generate next steps based on missing fields and priorities
 */
export function generateProfileNextSteps(profile: Profile): string[] {
  const steps: string[] = []
  const analysis = analyzeProfileCompletion(profile)
  
  // Critical fields first
  const missingCritical = getMissingCriticalFields(profile)
  if (missingCritical.length > 0) {
    steps.push(`🚨 Complete critical fields: ${missingCritical.join(', ')}`)
  }
  
  // Category-based recommendations
  for (const [categoryName, categoryData] of Object.entries(analysis.categories)) {
    if (categoryData.percentage < 80) {
      const missingCount = categoryData.total - categoryData.completed
      steps.push(`📝 Complete ${categoryName}: ${missingCount} fields remaining`)
    }
  }
  
  return steps
}

// =============================================
// UTILITY EXPORTS
// =============================================

/**
 * Main export: Dynamic field counting utility
 * Use this throughout the application for consistent field counting
 */
export const ProfileFieldUtils = {
  // Field counting
  getTotalFields: getTotalProfileFields,
  getCompletenessFields: getProfileCompletenessFields,
  getAllFields: getAllProfileFields,
  getFieldCountByCategory,
  
  // Analysis
  analyzeCompletion: analyzeProfileCompletion,
  calculateCategoryCompletion,
  getProfileFieldAnalysis,
  
  // Validation
  isFieldComplete,
  getMissingCriticalFields,
  generateNextSteps: generateProfileNextSteps,
  
  // Structure
  FIELD_STRUCTURE: PROFILE_FIELD_STRUCTURE
}

export default ProfileFieldUtils