/**
 * Runtime Type Guards and Validation Utilities
 * Provides runtime type checking for Profile and Organization JSON fields
 */

import type { 
  ProfileCertifications, 
  ProfilePastPerformance, 
  KeyProject,
  SamGovRegistration,
  ProfileAnalytics,
  OrganizationSettings,
  OrganizationFeatures,
  PlanFeatures
} from '@/types'

// =============================================
// PROFILE TYPE GUARDS
// =============================================

export function isProfileCertifications(obj: unknown): obj is ProfileCertifications {
  if (!obj || typeof obj !== 'object') return false
  
  const cert = obj as Record<string, unknown>
  
  // Check that all boolean fields are actually booleans if present
  const booleanFields = [
    'has8a', 'hasHubZone', 'hasSdvosb', 'hasWosb', 'hasEdwosb', 
    'hasVosb', 'hasSdb', 'hasGSASchedule', 'hasClearance', 
    'hasISO9001', 'hasCMMI'
  ]
  
  for (const field of booleanFields) {
    if (field in cert && typeof cert[field] !== 'boolean') {
      return false
    }
  }
  
  // Check date fields are strings if present
  const dateFields = [
    'eightAExpirationDate', 'hubZoneExpirationDate', 'sdvosbExpirationDate',
    'wosbExpirationDate', 'edwosbExpirationDate', 'vosbExpirationDate',
    'sdbExpirationDate', 'gsaScheduleExpirationDate', 'iso9001ExpirationDate'
  ]
  
  for (const field of dateFields) {
    if (field in cert && typeof cert[field] !== 'string') {
      return false
    }
  }
  
  // Check enum fields
  if ('clearanceLevel' in cert && cert.clearanceLevel !== '' && cert.clearanceLevel !== null) {
    const validLevels = ['Public Trust', 'Secret', 'Top Secret', 'Top Secret/SCI']
    if (!validLevels.includes(cert.clearanceLevel as string)) {
      return false
    }
  }
  
  if ('cmmiLevel' in cert && cert.cmmiLevel !== '' && cert.cmmiLevel !== null) {
    const validLevels = ['CMMI Level 1', 'CMMI Level 2', 'CMMI Level 3', 'CMMI Level 4', 'CMMI Level 5']
    if (!validLevels.includes(cert.cmmiLevel as string)) {
      return false
    }
  }
  
  return true
}

export function isKeyProject(obj: unknown): obj is KeyProject {
  if (!obj || typeof obj !== 'object') return false
  
  const project = obj as Record<string, unknown>
  
  // Required fields
  if (typeof project.title !== 'string' || project.title.length === 0) {
    return false
  }
  
  if (typeof project.completedYear !== 'number' || 
      project.completedYear < 1990 || 
      project.completedYear > new Date().getFullYear()) {
    return false
  }
  
  // Optional fields type checking
  if ('description' in project && typeof project.description !== 'string') {
    return false
  }
  
  if ('value' in project && typeof project.value !== 'number') {
    return false
  }
  
  if ('customerType' in project) {
    const validTypes = ['Federal', 'State', 'Local', 'Commercial']
    if (!validTypes.includes(project.customerType as string)) {
      return false
    }
  }
  
  if ('client' in project && typeof project.client !== 'string') {
    return false
  }
  
  return true
}

export function isProfilePastPerformance(obj: unknown): obj is ProfilePastPerformance {
  if (!obj || typeof obj !== 'object') return false
  
  const perf = obj as Record<string, unknown>
  
  // Check optional string fields
  const stringFields = ['description', 'totalContractValue', 'yearsInBusiness']
  for (const field of stringFields) {
    if (field in perf && typeof perf[field] !== 'string') {
      return false
    }
  }
  
  // Check keyProjects array
  if ('keyProjects' in perf) {
    if (!Array.isArray(perf.keyProjects)) {
      return false
    }
    
    // Validate each project
    for (const project of perf.keyProjects) {
      if (!isKeyProject(project)) {
        return false
      }
    }
  }
  
  return true
}

export function isSamGovRegistration(obj: unknown): obj is SamGovRegistration {
  if (!obj || typeof obj !== 'object') return false
  
  const sam = obj as Record<string, unknown>
  
  // Required fields
  if (typeof sam.uei !== 'string' || sam.uei.length === 0) {
    return false
  }
  
  if (typeof sam.entityName !== 'string' || sam.entityName.length === 0) {
    return false
  }
  
  // Address validation
  if ('address' in sam) {
    if (!sam.address || typeof sam.address !== 'object') {
      return false
    }
    
    const address = sam.address as Record<string, unknown>
    if (typeof address.countryCode !== 'string') {
      return false
    }
  }
  
  // Registration status validation
  if ('registrationStatus' in sam) {
    const validStatuses = ['Active', 'Inactive', 'Expired']
    if (!validStatuses.includes(sam.registrationStatus as string)) {
      return false
    }
  }
  
  return true
}

// =============================================
// ORGANIZATION TYPE GUARDS
// =============================================

export function isPlanFeatures(obj: unknown): obj is PlanFeatures {
  if (!obj || typeof obj !== 'object') return false
  
  const plan = obj as Record<string, unknown>
  
  // Required numeric fields
  const numericFields = ['maxUsers', 'maxProfiles', 'maxOpportunities', 'maxDocuments', 'storageGB', 'aiRequests']
  for (const field of numericFields) {
    if (typeof plan[field] !== 'number' || plan[field] < 0) {
      return false
    }
  }
  
  // Required boolean fields
  const booleanFields = [
    'advancedAI', 'customModels', 'opportunityMatching', 'advancedAnalytics', 
    'customReports', 'competitiveAnalysis', 'apiAccess', 'webhooks', 
    'samGovSync', 'crmIntegration'
  ]
  for (const field of booleanFields) {
    if (typeof plan[field] !== 'boolean') {
      return false
    }
  }
  
  // Support level validation
  if ('supportLevel' in plan) {
    const validLevels = ['community', 'email', 'priority', 'dedicated']
    if (!validLevels.includes(plan.supportLevel as string)) {
      return false
    }
  }
  
  return true
}

export function isOrganizationFeatures(obj: unknown): obj is OrganizationFeatures {
  if (!obj || typeof obj !== 'object') return false
  
  const features = obj as Record<string, unknown>
  
  // Validate plan features
  if ('plan' in features && !isPlanFeatures(features.plan)) {
    return false
  }
  
  // Validate flags (all should be boolean)
  if ('flags' in features) {
    if (!features.flags || typeof features.flags !== 'object') {
      return false
    }
    
    const flags = features.flags as Record<string, unknown>
    for (const [key, value] of Object.entries(flags)) {
      if (typeof value !== 'boolean') {
        return false
      }
    }
  }
  
  return true
}

export function isOrganizationSettings(obj: unknown): obj is OrganizationSettings {
  if (!obj || typeof obj !== 'object') return false
  
  const settings = obj as Record<string, unknown>
  
  // Validate timezone
  if ('timezone' in settings && typeof settings.timezone !== 'string') {
    return false
  }
  
  // Validate dateFormat
  if ('dateFormat' in settings) {
    const validFormats = ['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD']
    if (!validFormats.includes(settings.dateFormat as string)) {
      return false
    }
  }
  
  // Validate currency
  if ('currency' in settings) {
    const validCurrencies = ['USD', 'EUR', 'GBP', 'CAD']
    if (!validCurrencies.includes(settings.currency as string)) {
      return false
    }
  }
  
  // Validate theme
  if ('theme' in settings) {
    const validThemes = ['light', 'dark', 'auto']
    if (!validThemes.includes(settings.theme as string)) {
      return false
    }
  }
  
  return true
}

// =============================================
// VALIDATION UTILITIES
// =============================================

export function validateAndSanitizeProfile(profile: unknown): {
  isValid: boolean
  sanitized?: any
  errors: string[]
} {
  const errors: string[] = []
  
  if (!profile || typeof profile !== 'object') {
    return { isValid: false, errors: ['Profile must be an object'] }
  }
  
  const sanitized = { ...profile } as any
  
  // Validate certifications
  if (sanitized.certifications && !isProfileCertifications(sanitized.certifications)) {
    errors.push('Invalid certifications format')
    delete sanitized.certifications
  }
  
  // Validate pastPerformance
  if (sanitized.pastPerformance && !isProfilePastPerformance(sanitized.pastPerformance)) {
    errors.push('Invalid past performance format')
    delete sanitized.pastPerformance
  }
  
  // Validate samGovData
  if (sanitized.samGovData && !isSamGovRegistration(sanitized.samGovData)) {
    errors.push('Invalid SAM.gov data format')
    delete sanitized.samGovData
  }
  
  return {
    isValid: errors.length === 0,
    sanitized,
    errors
  }
}

export function validateAndSanitizeOrganization(organization: unknown): {
  isValid: boolean
  sanitized?: any
  errors: string[]
} {
  const errors: string[] = []
  
  if (!organization || typeof organization !== 'object') {
    return { isValid: false, errors: ['Organization must be an object'] }
  }
  
  const sanitized = { ...organization } as any
  
  // Validate settings
  if (sanitized.settings && !isOrganizationSettings(sanitized.settings)) {
    errors.push('Invalid organization settings format')
    sanitized.settings = {}
  }
  
  // Validate features
  if (sanitized.features && !isOrganizationFeatures(sanitized.features)) {
    errors.push('Invalid organization features format')
    sanitized.features = { plan: {}, flags: {} }
  }
  
  return {
    isValid: errors.length === 0,
    sanitized,
    errors
  }
}

// =============================================
// MIGRATION UTILITIES
// =============================================

export function migrateProfileData(oldProfile: any): any {
  const migrated = { ...oldProfile }
  
  // Migrate old certification format to new format
  if (migrated.certifications && typeof migrated.certifications === 'object') {
    const certs = migrated.certifications
    
    // Handle legacy boolean certifications
    if ('sba8a' in certs) {
      certs.has8a = certs.sba8a
      delete certs.sba8a
    }
    
    if ('hubzone' in certs) {
      certs.hasHubZone = certs.hubzone
      delete certs.hubzone
    }
    
    // Add missing required fields with defaults
    const certificationDefaults = {
      has8a: false,
      hasHubZone: false,
      hasSdvosb: false,
      hasWosb: false,
      hasEdwosb: false,
      hasVosb: false,
      hasSdb: false
    }
    
    migrated.certifications = { ...certificationDefaults, ...certs }
  }
  
  // Migrate past performance format
  if (migrated.pastPerformance && typeof migrated.pastPerformance === 'object') {
    const perf = migrated.pastPerformance
    
    // Handle legacy field names
    if ('projects' in perf && !('keyProjects' in perf)) {
      perf.keyProjects = perf.projects
      delete perf.projects
    }
    
    // Ensure keyProjects have required fields
    if (Array.isArray(perf.keyProjects)) {
      perf.keyProjects = perf.keyProjects.map((project: any) => ({
        ...project,
        title: project.title || project.name || 'Untitled Project',
        completedYear: project.completedYear || project.completionYear || new Date().getFullYear(),
        id: project.id || `migrated-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      }))
    }
  }
  
  return migrated
}

export function migrateOrganizationData(oldOrg: any): any {
  const migrated = { ...oldOrg }
  
  // Initialize empty settings/features if they don't exist
  if (!migrated.settings || typeof migrated.settings !== 'object') {
    migrated.settings = {}
  }
  
  if (!migrated.features || typeof migrated.features !== 'object') {
    migrated.features = { plan: {}, flags: {} }
  }
  
  // Migrate legacy plan field to planType
  if ('plan' in migrated && typeof migrated.plan === 'string') {
    migrated.planType = migrated.plan
    delete migrated.plan
  }
  
  return migrated
}