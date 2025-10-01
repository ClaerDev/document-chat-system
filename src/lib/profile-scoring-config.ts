/**
 * Unified Scoring Configuration System
 * 
 * SINGLE SOURCE OF TRUTH for all scoring configurations:
 * 1. Profile Completeness Scoring - how complete/ready a profile is  
 * 2. Opportunity Matching Scoring - how well a profile matches opportunities
 * 
 * Both scoring systems use government contracting research and FAR 15.305 findings
 * and share the same 4-category structure for consistency.
 * 
 * Consolidated all scoring logic into one file for easier maintenance.
 */

// Import necessary types for both profile and opportunity scoring
import type { Profile, Opportunity, MatchScore } from '@/types';
import type { GovernmentLevel, GeographicPreferences } from '@/types/profile';

/**
 * =====================================================
 * OPPORTUNITY MATCHING SCORING CONFIGURATIONS
 * =====================================================
 * 
 * These configurations control how well a profile matches opportunities.
 * Used by /lib/match-score/algorithm.ts for opportunity matching.
 */

export interface OpportunityMatchingWeights {
  // Core Capability Matching (70% total - most critical for winning)
  pastPerformance: number              // 35% - Contract history relevance and agency experience
  technicalCapability: number         // 35% - NAICS alignment, certifications, competencies
  
  // Strategic Positioning (30% total - important for fit and efficiency)
  strategicFitRelationships: number   // 15% - Geographic fit, government level, business scale
  credibilityMarketPresence: number   // 15% - SAM.gov status, contact info, professional presence
}

// Detailed sub-factor weights for each category
export interface OpportunityMatchingSubFactors {
  pastPerformance: {
    contractValueAlignment: number    // 40% - Similar contract values and scale
    agencyExperience: number         // 30% - Experience with same/similar agencies
    industryExperience: number       // 20% - NAICS code overlap in past projects
    recencyRelevance: number         // 10% - How recent and relevant experience is
  }
  technicalCapability: {
    naicsAlignment: number           // 50% - Primary/secondary NAICS code matching
    certificationMatch: number       // 25% - Required certifications and set-asides
    competencyAlignment: number      // 15% - Skills and capabilities matching
    securityClearanceMatch: number   // 10% - Security clearance level compatibility
  }
  strategicFitRelationships: {
    geographicProximity: number      // 40% - Distance from contractor to performance location
    governmentLevelMatch: number     // 30% - Experience with federal/state/local levels
    geographicPreferenceMatch: number // 20% - Preferred work locations alignment
    businessScaleAlignment: number   // 10% - Company size vs opportunity scope
  }
  credibilityMarketPresence: {
    governmentRegistration: number   // 60% - SAM.gov, UEI, CAGE Code verification status
    contactCompleteness: number      // 25% - Professional contact information completeness
    marketPresence: number           // 10% - Website, branding, professional presentation
    businessVerification: number     // 5% - Complete address and business details
  }
}

export interface OpportunityMatchingConfiguration {
  id: string
  name: string
  version: string
  description: string
  weights: OpportunityMatchingWeights
  subFactors: OpportunityMatchingSubFactors
  enabled: boolean
}

// Current Algorithm Configuration - Research-Based 4-Category Model
export const CURRENT_ALGORITHM_CONFIG: OpportunityMatchingConfiguration = {
  id: 'current-algorithm-v4',
  name: 'Research-Based 4-Category Algorithm v4.0',
  version: '4.0',
  description: 'Research-based 4-category algorithm aligned with profile scoring structure, emphasizing past performance and technical capability per FAR 15.305',
  weights: {
    pastPerformance: 35,              // 35% - Contract history relevance and agency experience
    technicalCapability: 35,         // 35% - NAICS alignment, certifications, competencies
    strategicFitRelationships: 15,    // 15% - Geographic fit, government level, business scale
    credibilityMarketPresence: 15     // 15% - SAM.gov status, contact info, professional presence
  },
  subFactors: {
    pastPerformance: {
      contractValueAlignment: 40,    // 40% - Similar contract values and scale
      agencyExperience: 30,         // 30% - Experience with same/similar agencies
      industryExperience: 20,       // 20% - NAICS code overlap in past projects
      recencyRelevance: 10          // 10% - How recent and relevant experience is
    },
    technicalCapability: {
      naicsAlignment: 50,           // 50% - Primary/secondary NAICS code matching
      certificationMatch: 25,       // 25% - Required certifications and set-asides
      competencyAlignment: 15,      // 15% - Skills and capabilities matching
      securityClearanceMatch: 10    // 10% - Security clearance level compatibility
    },
    strategicFitRelationships: {
      geographicProximity: 40,      // 40% - Distance from contractor to performance location
      governmentLevelMatch: 30,     // 30% - Experience with federal/state/local levels
      geographicPreferenceMatch: 20, // 20% - Preferred work locations alignment
      businessScaleAlignment: 10    // 10% - Company size vs opportunity scope
    },
    credibilityMarketPresence: {
      governmentRegistration: 60,   // 60% - SAM.gov, UEI, CAGE Code verification status
      contactCompleteness: 25,      // 25% - Professional contact information completeness
      marketPresence: 10,           // 10% - Website, branding, professional presentation
      businessVerification: 5      // 5% - Complete address and business details
    }
  },
  enabled: true
}

/**
 * =====================================================
 * PROFILE COMPLETENESS SCORING CONFIGURATIONS  
 * =====================================================
 * 
 * These configurations control profile completeness scoring.
 * 4 main categories with government contracting research priorities.
 */

export interface ProfileFieldConfig {
  field: string
  label: string
  weight: number
  description?: string
  checkFunction?: string // Name of the check function to use
}

export interface ProfileSectionConfig {
  name: string
  weight: number // Section weight (e.g., 15 for 15%)
  description: string
  fields: ProfileFieldConfig[]
}

export interface ProfileSectionWeights {
  // Core Capability Sections (70% total - most critical for contracts)
  pastPerformance: number          // 35% - Contract history (most critical per FAR)
  technicalCapability: number      // 35% - NAICS + certifications + competencies
  
  // Strategic Positioning Sections (30% total - important but secondary)  
  strategicFitRelationships: number // 15% - Business info + geographic preferences
  credibilityMarketPresence: number // 15% - Contact info + basic info + SAM.gov
}

export interface ProfileScoringConfiguration {
  id: string
  name: string  
  version: string
  description: string
  sectionWeights: ProfileSectionWeights
  detailedSections?: ProfileSectionConfig[] // Optional detailed field-level configuration
  enabled: boolean
}

// Detailed Field-Level Configuration for Credibility & Market Presence
export const CREDIBILITY_SECTION_CONFIG: ProfileSectionConfig = {
  name: 'credibilityMarketPresence',
  weight: 15,
  description: 'Contact information, company details, and government registration status',
  fields: [
    // Contact Information (30 points total)
    { field: 'contactEmail', label: 'Contact Email', weight: 12, description: 'Primary business email address' },
    { field: 'contactName', label: 'Contact Name', weight: 7, description: 'Primary contact person' },
    { field: 'contactPhone', label: 'Contact Phone', weight: 6, description: 'Business phone number' },
    { field: 'website', label: 'Website', weight: 5, description: 'Professional web presence' },
    
    // Basic Company Info (30 points total)
    { field: 'companyName', label: 'Company Name', weight: 12, description: 'Legal business name' },
    { field: 'businessAddress', label: 'Business Address', weight: 8, description: 'Physical business location' },
    { field: 'logo', label: 'Company Logo', weight: 5, description: 'Professional branding image' },
    { field: 'securityClearance', label: 'Security Clearance', weight: 5, description: 'Security clearance level if applicable' },
    
    // Government Integration (40 points total)
    { field: 'ueiNumber', label: 'UEI Number', weight: 15, description: 'Unique Entity Identifier' },
    { field: 'cageCode', label: 'CAGE Code', weight: 15, description: 'Commercial Activity Code' },
    { field: 'samGovIntegration', label: 'SAM.gov Integration', weight: 10, description: 'Full automated SAM.gov integration' }
  ]
}

// Current Profile Completeness Configuration
export const CURRENT_PROFILE_CONFIG: ProfileScoringConfiguration = {
  id: 'profile-completeness-v2',
  name: 'Government Contracting Profile Scoring v2.1',
  version: '2.1',
  description: 'Research-based profile completeness with 4-category structure emphasizing contract-winning capabilities',
  sectionWeights: {
    pastPerformance: 35,           // 35% - Contract history and performance records
    technicalCapability: 35,       // 35% - NAICS codes, certifications, core competencies  
    strategicFitRelationships: 15, // 15% - Business information and strategic positioning
    credibilityMarketPresence: 15  // 15% - Contact information and government registration
  },
  detailedSections: [
    CREDIBILITY_SECTION_CONFIG
    // Add other sections here as needed
  ],
  enabled: true
}

/**
 * =====================================================
 * PROFILE SCORING CALCULATION ENGINE
 * =====================================================
 */

export interface ProfileFieldScore {
  field: string
  label: string
  weight: number
  completeness: number
  rawScore: number
  suggestions: string[]
}

export interface ProfileSectionScore {
  section: string
  weight: number
  sectionScore: number      // This is the actual score to display (0-100)
  weightedScore: number     // This is used for overall calculation
  completeness: number
  quality: number
  missingFields: string[]
  suggestions: string[]
  maxPossible?: number
  fields?: ProfileFieldScore[]
}

export interface ProfileScore {
  overall: number
  completeness: number
  quality: number
  sections: ProfileSectionScore[]
  totalFields: number
  completedFields: number
  criticalFieldsCompleted: number
  totalCriticalFields: number
  lastCalculated: Date
  algorithm: string
  version: string
  strengths: string[]
  weaknesses: string[]
  nextSteps: string[]
  recommendations: {
    priority: 'high' | 'medium' | 'low'
    title: string
    description: string
    impact: number
    effort: 'low' | 'medium' | 'high'
    category: string
  }[]
}

/**
 * Calculate profile completeness score with fixed credibility scoring
 */
export function calculateProfileScore(profile: any): ProfileScore {
  if (!profile) {
    return createEmptyProfileScore()
  }

  try {
    // Calculate each section with proper weight distribution
    const sections: ProfileSectionScore[] = [
      calculatePastPerformanceSection(profile),
      calculateTechnicalCapabilitySection(profile), 
      calculateStrategicFitRelationshipsSection(profile),
      calculateCredibilityMarketPresenceSection(profile)
    ]

    // Calculate overall metrics
    const totalWeightedScore = sections.reduce((sum, section) => sum + section.weightedScore, 0)
    const avgCompleteness = sections.reduce((sum, section) => sum + section.completeness, 0) / sections.length
    const avgQuality = sections.reduce((sum, section) => sum + section.quality, 0) / sections.length

    // Count total and completed fields
    const { totalFields, completedFields } = countProfileFields(profile)
    const { criticalFieldsCompleted, totalCriticalFields } = countCriticalFields(profile)

    return {
      overall: Math.min(Math.round(totalWeightedScore), 100),
      completeness: Math.round(avgCompleteness),
      quality: Math.round(avgQuality),
      sections,
      totalFields,
      completedFields,
      criticalFieldsCompleted,
      totalCriticalFields,
      lastCalculated: new Date(),
      algorithm: 'government-contracting-v2.1',
      version: '2.1',
      strengths: generateStrengths(sections),
      weaknesses: generateWeaknesses(sections),
      nextSteps: generateNextSteps(sections),
      recommendations: generateRecommendations(sections, profile)
    }
  } catch (error) {
    console.error('Error calculating profile score:', error)
    console.error('Profile data:', profile)
    
    // Return empty score with error indication
    return {
      ...createEmptyProfileScore(),
      weaknesses: ['Error calculating profile score - please refresh and try again'],
      nextSteps: ['Check profile data integrity', 'Contact support if issue persists']
    }
  }
}

/**
 * Past Performance Section (35% weight)
 * Critical for government contracting per FAR 15.305
 */
function calculatePastPerformanceSection(profile: any): ProfileSectionScore {
  const weight = 35
  let score = 0
  const maxPossible = 100
  const missingFields: string[] = []
  const suggestions: string[] = []

  // Past Performance scoring per SCORING_BREAKDOWN.md (4 fields, 25 points each)
  // Using actual Prisma schema field: pastPerformance (Json)
  const pastPerformanceData = profile.pastPerformance
  
  // Description (25 points) - check pastPerformance.description or JSON structure
  if (pastPerformanceData?.description || profile.companyDescription) {
    score += 25
  } else {
    missingFields.push('description')
    suggestions.push('Add past performance narrative and overview')
  }
  
  // Key Projects (25 points) - check pastPerformance.projects or similar
  if (pastPerformanceData?.projects?.length > 0 || pastPerformanceData?.keyProjects?.length > 0) {
    score += 25
  } else {
    missingFields.push('keyProjects')
    suggestions.push('Add detailed project examples with outcomes')
  }
  
  // Total Contract Value (25 points) - check pastPerformance.totalValue or contractValue
  if (pastPerformanceData?.totalContractValue || pastPerformanceData?.contractValue) {
    score += 25
  } else {
    missingFields.push('totalContractValue')
    suggestions.push('Add historical contract values and scale')
  }
  
  // Years in Business (25 points) - use yearEstablished from schema
  if (profile.yearEstablished) {
    score += 25
  } else {
    missingFields.push('yearsInBusiness')
    suggestions.push('Add business experience and longevity')
  }

  const sectionScore = Math.min(score, maxPossible)
  
  // Create field-level breakdown per SCORING_BREAKDOWN.md
  const fields: ProfileFieldScore[] = [
    {
      field: 'description',
      label: 'Description', 
      weight: 25,
      completeness: (pastPerformanceData?.description || profile.companyDescription) ? 100 : 0,
      rawScore: (pastPerformanceData?.description || profile.companyDescription) ? 25 : 0,
      suggestions: !(pastPerformanceData?.description || profile.companyDescription) ? ['Add past performance narrative and overview'] : []
    },
    {
      field: 'keyProjects',
      label: 'Key Projects',
      weight: 25,
      completeness: (pastPerformanceData?.projects?.length > 0 || pastPerformanceData?.keyProjects?.length > 0) ? 100 : 0,
      rawScore: (pastPerformanceData?.projects?.length > 0 || pastPerformanceData?.keyProjects?.length > 0) ? 25 : 0,
      suggestions: !(pastPerformanceData?.projects?.length > 0 || pastPerformanceData?.keyProjects?.length > 0) ? ['Add detailed project examples with outcomes'] : []
    },
    {
      field: 'totalContractValue',
      label: 'Total Contract Value',
      weight: 25,
      completeness: (pastPerformanceData?.totalContractValue || pastPerformanceData?.contractValue) ? 100 : 0,
      rawScore: (pastPerformanceData?.totalContractValue || pastPerformanceData?.contractValue) ? 25 : 0,
      suggestions: !(pastPerformanceData?.totalContractValue || pastPerformanceData?.contractValue) ? ['Add historical contract values and scale'] : []
    },
    {
      field: 'yearsInBusiness',
      label: 'Years in Business',
      weight: 25,
      completeness: profile.yearEstablished ? 100 : 0,
      rawScore: profile.yearEstablished ? 25 : 0,
      suggestions: !profile.yearEstablished ? ['Add business experience and longevity'] : []
    }
  ]

  return {
    section: 'pastPerformance',
    weight,
    sectionScore,
    weightedScore: (sectionScore * weight) / 100,
    completeness: Math.min((score / maxPossible) * 100, 100),
    quality: sectionScore,
    missingFields,
    suggestions,
    maxPossible,
    fields: fields || [] // Ensure fields array is never null/undefined
  }
}

/**
 * Technical Capability Section (35% weight)
 * NAICS codes, certifications, and competencies
 */
function calculateTechnicalCapabilitySection(profile: any): ProfileSectionScore {
  const weight = 35
  let score = 0
  const maxPossible = 100
  const missingFields: string[] = []
  const suggestions: string[] = []

  // Technical Capability scoring per SCORING_BREAKDOWN.md (4 fields) - using Prisma schema names
  const primaryNaics = profile.primaryNaics
  const secondaryNaics = Array.isArray(profile.secondaryNaics) ? profile.secondaryNaics : []
  const certifications = profile.certifications  // This is JSON in schema
  const competencies = Array.isArray(profile.coreCompetencies) ? profile.coreCompetencies : []
  
  // Check if certifications object has actual certifications or setAsides
  const hasCertifications = certifications && (
    (certifications.certifications && Array.isArray(certifications.certifications) && certifications.certifications.length > 0) ||
    (certifications.setAsides && Array.isArray(certifications.setAsides) && certifications.setAsides.length > 0)
  )
  
  // Primary NAICS Code (40 points) - Most critical
  if (primaryNaics) {
    score += 40
  } else {
    missingFields.push('primaryNaics')
    suggestions.push('Add main business classification code')
  }
  
  // Secondary NAICS Codes (20 points) - Diversification bonus
  if (secondaryNaics.length > 0) {
    score += 20
  } else {
    missingFields.push('secondaryNAICS')
    suggestions.push('Add additional capability classifications')
  }
  
  // Business Certifications (20 points) - Set-aside opportunities
  if (hasCertifications) {
    score += 20
  } else {
    missingFields.push('certifications')
    suggestions.push('Add set-asides: 8(a), WOSB, SDVOSB, etc.')
  }
  
  // Core Competencies (20 points) - Capability depth
  if (competencies.length > 0) {
    score += 20
  } else {
    missingFields.push('coreCompetencies')
    suggestions.push('Add skills, clearances, geographic reach')
  }

  const sectionScore = Math.min(score, maxPossible)
  
  // Create field-level breakdown per SCORING_BREAKDOWN.md - using correct schema names
  const fields: ProfileFieldScore[] = [
    {
      field: 'primaryNaics',
      label: 'Primary NAICS Code',
      weight: 40,
      completeness: primaryNaics ? 100 : 0,
      rawScore: primaryNaics ? 40 : 0,
      suggestions: !primaryNaics ? ['Add main business classification code'] : []
    },
    {
      field: 'secondaryNAICS',
      label: 'Secondary NAICS Codes',
      weight: 20,
      completeness: secondaryNaics.length > 0 ? 100 : 0,
      rawScore: secondaryNaics.length > 0 ? 20 : 0,
      suggestions: secondaryNaics.length === 0 ? ['Add additional capability classifications'] : []
    },
    {
      field: 'certifications',
      label: 'Business Certifications',
      weight: 20,
      completeness: hasCertifications ? 100 : 0,
      rawScore: hasCertifications ? 20 : 0,
      suggestions: !hasCertifications ? ['Add set-asides: 8(a), WOSB, SDVOSB, etc.'] : []
    },
    {
      field: 'coreCompetencies',
      label: 'Core Competencies',
      weight: 20,
      completeness: competencies.length > 0 ? 100 : 0,
      rawScore: competencies.length > 0 ? 20 : 0,
      suggestions: competencies.length === 0 ? ['Add skills, clearances, geographic reach'] : []
    }
  ]
  
  return {
    section: 'technicalCapability',
    weight,
    sectionScore,
    weightedScore: (sectionScore * weight) / 100,
    completeness: Math.min((score / maxPossible) * 100, 100),
    quality: sectionScore,
    missingFields,
    suggestions,
    maxPossible,
    fields: fields || [] // Ensure fields array is never null/undefined
  }
}

/**
 * Strategic Fit & Relationships Section (15% weight)
 * Business information and strategic positioning
 */
function calculateStrategicFitRelationshipsSection(profile: any): ProfileSectionScore {
  const weight = 15
  let score = 0
  const maxPossible = 100
  const missingFields: string[] = []
  const suggestions: string[] = []

  // Strategic Fit scoring per SCORING_BREAKDOWN.md (expanded to include preferences) - using Prisma schema names
  
  // Business Type (20 points)
  if (profile.businessType) {
    score += 20
  } else {
    missingFields.push('businessType')
    suggestions.push('Add business type: Corporation, LLC, Partnership, etc.')
  }
  
  // Year Established (20 points)
  if (profile.yearEstablished) {
    score += 20
  } else {
    missingFields.push('yearEstablished')
    suggestions.push('Add company founding year and stability')
  }
  
  // Employee Count (20 points)
  if (profile.employeeCount) {
    score += 20
  } else {
    missingFields.push('employeeCount')
    suggestions.push('Add team size and capacity')
  }
  
  // Annual Revenue (20 points)
  if (profile.annualRevenue) {
    score += 20
  } else {
    missingFields.push('annualRevenue')
    suggestions.push('Add financial scale and capability')
  }
  
  // Geographic Preferences (20 points)
  if (profile.geographicPreferences && typeof profile.geographicPreferences === 'object' && Object.keys(profile.geographicPreferences).length > 0) {
    score += 20
  } else {
    missingFields.push('geographicPreferences')
    suggestions.push('Add preferred work locations and travel preferences')
  }

  const sectionScore = Math.min(score, maxPossible)
  
  // Create field-level breakdown per SCORING_BREAKDOWN.md (expanded fields)
  const fields: ProfileFieldScore[] = [
    {
      field: 'businessType',
      label: 'Business Type',
      weight: 20,
      completeness: profile.businessType ? 100 : 0,
      rawScore: profile.businessType ? 20 : 0,
      suggestions: !profile.businessType ? ['Add business type: Corporation, LLC, Partnership, etc.'] : []
    },
    {
      field: 'yearEstablished',
      label: 'Year Established',
      weight: 20,
      completeness: profile.yearEstablished ? 100 : 0,
      rawScore: profile.yearEstablished ? 20 : 0,
      suggestions: !profile.yearEstablished ? ['Add company founding year and stability'] : []
    },
    {
      field: 'employeeCount',
      label: 'Employee Count',
      weight: 20,
      completeness: profile.employeeCount ? 100 : 0,
      rawScore: profile.employeeCount ? 20 : 0,
      suggestions: !profile.employeeCount ? ['Add team size and capacity'] : []
    },
    {
      field: 'annualRevenue',
      label: 'Annual Revenue',
      weight: 20,
      completeness: profile.annualRevenue ? 100 : 0,
      rawScore: profile.annualRevenue ? 20 : 0,
      suggestions: !profile.annualRevenue ? ['Add financial scale and capability'] : []
    },
    {
      field: 'geographicPreferences',
      label: 'Geographic Preferences',
      weight: 20,
      completeness: (profile.geographicPreferences && typeof profile.geographicPreferences === 'object' && Object.keys(profile.geographicPreferences).length > 0) ? 100 : 0,
      rawScore: (profile.geographicPreferences && typeof profile.geographicPreferences === 'object' && Object.keys(profile.geographicPreferences).length > 0) ? 20 : 0,
      suggestions: !(profile.geographicPreferences && typeof profile.geographicPreferences === 'object' && Object.keys(profile.geographicPreferences).length > 0) ? ['Add preferred work locations and travel preferences'] : []
    }
  ]
  
  return {
    section: 'strategicFitRelationships',
    weight,
    sectionScore,
    weightedScore: (sectionScore * weight) / 100,
    completeness: Math.min((score / maxPossible) * 100, 100),
    quality: sectionScore,
    missingFields,
    suggestions,
    maxPossible,
    fields: fields || [] // Ensure fields array is never null/undefined
  }
}

/**
 * Credibility & Market Presence Section (15% weight)
 * Contact information, basic info, and government registration
 * FIXED: Proper scoring to avoid math overflow
 */
function calculateCredibilityMarketPresenceSection(profile: any): ProfileSectionScore {
  const weight = 15
  let score = 0
  const maxPossible = 100
  const missingFields: string[] = []
  const suggestions: string[] = []
  
  // Credibility scoring per SCORING_BREAKDOWN.md (expanded to include more fields) - using Prisma schema names
  
  // Contact Information (30 points total)
  // Contact Email (12 points)
  if (profile.primaryContactEmail) {
    score += 12
  } else {
    missingFields.push('contactEmail')
    suggestions.push('Add primary business email')
  }
  
  // Contact Name (7 points) 
  if (profile.primaryContactName) {
    score += 7
  } else {
    missingFields.push('contactName')
    suggestions.push('Add primary contact person')
  }
  
  // Contact Phone (6 points)
  if (profile.primaryContactPhone) {
    score += 6
  } else {
    missingFields.push('contactPhone')
    suggestions.push('Add primary business phone number')
  }
  
  // Website (5 points)
  if (profile.website) {
    score += 5
  } else {
    missingFields.push('website')
    suggestions.push('Add professional web presence')
  }
  
  // Basic Company Info (30 points total)
  // Company Name (12 points)
  if (profile.companyName) {
    score += 12
  } else {
    missingFields.push('companyName')
    suggestions.push('Add legal business name')
  }
  
  // Business Address (8 points) - check for any address component
  if (profile.addressLine1 || profile.city || profile.state || profile.zipCode) {
    score += 8
  } else {
    missingFields.push('businessAddress')
    suggestions.push('Add physical business location')
  }
  
  // Logo/Branding (5 points)
  if (profile.logoUrl) {
    score += 5
  } else {
    missingFields.push('logo')
    suggestions.push('Add company logo for professional presentation')
  }
  
  // Security Clearance (5 points)
  if (profile.securityClearance) {
    score += 5
  } else {
    missingFields.push('securityClearance')
    suggestions.push('Add security clearance level if applicable')
  }
  
  // Government Integration & Preferences (40 points total)  
  // UEI Number (15 points)
  if (profile.uei) {
    score += 15
  } else {
    missingFields.push('ueiNumber')
    suggestions.push('Add Unique Entity Identifier')
  }
  
  // CAGE Code (15 points)
  if (profile.cageCode) {
    score += 15
  } else {
    missingFields.push('cageCode')
    suggestions.push('Add Commercial Activity Code')
  }
  
  // Full SAM.gov Integration (10 points) - simplified check
  if (profile.uei && profile.cageCode && profile.samGovStatus === 'verified') {
    score += 10
  } else {
    missingFields.push('samGovIntegration')
    suggestions.push('Complete full automated integration')
  }

  // Ensure total doesn't exceed maxPossible
  const sectionScore = Math.min(score, maxPossible)
  
  
  // Create field-level breakdown per SCORING_BREAKDOWN.md (expanded fields total, 100 points)
  const fields: ProfileFieldScore[] = [
    // Contact Information (30 points total) - using schema field names
    {
      field: 'contactEmail',
      label: 'Contact Email',
      weight: 12,
      completeness: profile.primaryContactEmail ? 100 : 0,
      rawScore: profile.primaryContactEmail ? 12 : 0,
      suggestions: !profile.primaryContactEmail ? ['Add primary business email'] : []
    },
    {
      field: 'contactName',
      label: 'Contact Name',
      weight: 7,
      completeness: profile.primaryContactName ? 100 : 0,
      rawScore: profile.primaryContactName ? 7 : 0,
      suggestions: !profile.primaryContactName ? ['Add primary contact person'] : []
    },
    {
      field: 'contactPhone',
      label: 'Contact Phone',
      weight: 6,
      completeness: profile.primaryContactPhone ? 100 : 0,
      rawScore: profile.primaryContactPhone ? 6 : 0,
      suggestions: !profile.primaryContactPhone ? ['Add primary business phone number'] : []
    },
    {
      field: 'website',
      label: 'Website',
      weight: 5,
      completeness: profile.website ? 100 : 0,
      rawScore: profile.website ? 5 : 0,
      suggestions: !profile.website ? ['Add professional web presence'] : []
    },
    // Basic Company Info (30 points total)
    {
      field: 'companyName',
      label: 'Company Name',
      weight: 12,
      completeness: profile.companyName ? 100 : 0,
      rawScore: profile.companyName ? 12 : 0,
      suggestions: !profile.companyName ? ['Add legal business name'] : []
    },
    {
      field: 'businessAddress',
      label: 'Business Address',
      weight: 8,
      completeness: (profile.addressLine1 || profile.city || profile.state || profile.zipCode) ? 100 : 0,
      rawScore: (profile.addressLine1 || profile.city || profile.state || profile.zipCode) ? 8 : 0,
      suggestions: (!profile.addressLine1 && !profile.city && !profile.state && !profile.zipCode) ? ['Add physical business location'] : []
    },
    {
      field: 'logo',
      label: 'Company Logo',
      weight: 5,
      completeness: profile.logoUrl ? 100 : 0,
      rawScore: profile.logoUrl ? 5 : 0,
      suggestions: !profile.logoUrl ? ['Add company logo for professional presentation'] : []
    },
    {
      field: 'securityClearance',
      label: 'Security Clearance',
      weight: 5,
      completeness: profile.securityClearance ? 100 : 0,
      rawScore: profile.securityClearance ? 5 : 0,
      suggestions: !profile.securityClearance ? ['Add security clearance level if applicable'] : []
    },
    // Government Integration & Preferences (40 points total)
    {
      field: 'ueiNumber',
      label: 'UEI Number',
      weight: 15,
      completeness: profile.uei ? 100 : 0,
      rawScore: profile.uei ? 15 : 0,
      suggestions: !profile.uei ? ['Add Unique Entity Identifier'] : []
    },
    {
      field: 'cageCode',
      label: 'CAGE Code',
      weight: 15,
      completeness: profile.cageCode ? 100 : 0,
      rawScore: profile.cageCode ? 15 : 0,
      suggestions: !profile.cageCode ? ['Add Commercial Activity Code'] : []
    },
    {
      field: 'samGovIntegration',
      label: 'SAM.gov Integration',
      weight: 10,
      completeness: (profile.uei && profile.cageCode && profile.samGovStatus === 'verified') ? 100 : 0,
      rawScore: (profile.uei && profile.cageCode && profile.samGovStatus === 'verified') ? 10 : 0,
      suggestions: (!profile.uei || !profile.cageCode || profile.samGovStatus !== 'verified') ? ['Complete full automated integration'] : []
    }
  ]
  
  return {
    section: 'credibilityMarketPresence',
    weight,
    sectionScore, // This is what gets displayed in UI (0-100)
    weightedScore: (sectionScore * weight) / 100, // This is what contributes to overall score
    completeness: Math.min((score / maxPossible) * 100, 100),
    quality: sectionScore,
    missingFields,
    suggestions,
    maxPossible,
    fields: fields || [] // Ensure fields array is never null/undefined
  }
}

/**
 * Helper functions
 */
function createEmptyProfileScore(): ProfileScore {
  return {
    overall: 0,
    completeness: 0,
    quality: 0,
    sections: [],
    totalFields: 0,
    completedFields: 0,
    criticalFieldsCompleted: 0,
    totalCriticalFields: 8,
    lastCalculated: new Date(),
    algorithm: 'government-contracting-v2.1',
    version: '2.1',
    strengths: [],
    weaknesses: ['Profile is empty - start by adding basic information'],
    nextSteps: ['Add contact information', 'Complete basic company details', 'Add NAICS codes'],
    recommendations: []
  }
}

function countProfileFields(profile: any): { totalFields: number; completedFields: number } {
  // All individual fields from Prisma schema that contribute to scoring (comprehensive list)
  const fieldChecks = [
    // Company Information
    { field: 'companyName', check: () => !!profile.companyName },
    { field: 'dbaName', check: () => !!profile.dbaName },
    { field: 'uei', check: () => !!profile.uei },
    { field: 'cageCode', check: () => !!profile.cageCode },
    // Business Address
    { field: 'addressLine1', check: () => !!profile.addressLine1 },
    { field: 'city', check: () => !!profile.city },
    { field: 'state', check: () => !!profile.state },
    { field: 'zipCode', check: () => !!profile.zipCode },
    // Contact Information
    { field: 'primaryContactName', check: () => !!profile.primaryContactName },
    { field: 'primaryContactEmail', check: () => !!profile.primaryContactEmail },
    { field: 'primaryContactPhone', check: () => !!profile.primaryContactPhone },
    { field: 'website', check: () => !!profile.website },
    // Profile Images
    { field: 'logoUrl', check: () => !!profile.logoUrl },
    { field: 'bannerUrl', check: () => !!profile.bannerUrl },
    // Business Classification
    { field: 'businessType', check: () => !!profile.businessType },
    { field: 'yearEstablished', check: () => !!profile.yearEstablished },
    { field: 'employeeCount', check: () => !!profile.employeeCount },
    { field: 'annualRevenue', check: () => !!profile.annualRevenue },
    // NAICS and Certifications
    { field: 'primaryNaics', check: () => !!profile.primaryNaics },
    { field: 'secondaryNaics', check: () => Array.isArray(profile.secondaryNaics) && profile.secondaryNaics.length > 0 },
    { field: 'certifications', check: () => {
      const certs = profile.certifications
      return certs && ((certs.certifications && certs.certifications.length > 0) || (certs.setAsides && certs.setAsides.length > 0))
    }},
    // Capabilities
    { field: 'coreCompetencies', check: () => Array.isArray(profile.coreCompetencies) && profile.coreCompetencies.length > 0 },
    { field: 'pastPerformance', check: () => profile.pastPerformance && typeof profile.pastPerformance === 'object' && Object.keys(profile.pastPerformance).length > 0 },
    { field: 'securityClearance', check: () => !!profile.securityClearance },
    // Preferences
    { field: 'geographicPreferences', check: () => profile.geographicPreferences && typeof profile.geographicPreferences === 'object' && Object.keys(profile.geographicPreferences).length > 0 },
    { field: 'governmentLevels', check: () => Array.isArray(profile.governmentLevels) && profile.governmentLevels.length > 0 },
    // SAM.gov Integration (CRITICAL: This should be separate check)
    { field: 'samGovIntegration', check: () => profile.uei && profile.cageCode && profile.samGovStatus === 'verified' }
  ]
  
  let completedFields = 0
  fieldChecks.forEach(({ field, check }) => {
    if (check()) {
      completedFields++
    }
  })
  
  return { totalFields: fieldChecks.length, completedFields }
}

function countCriticalFields(profile: any): { criticalFieldsCompleted: number; totalCriticalFields: number } {
  // Critical fields for government contracting
  const criticalFields = [
    'companyName', 'primaryContactEmail', 'primaryNaics', 'certifications',
    'pastPerformance', 'businessType', 'yearEstablished', 'uei', 'cageCode'
  ]
  
  let criticalFieldsCompleted = 0
  criticalFields.forEach(field => {
    const value = profile[field]
    if (value !== null && value !== undefined && value !== '') {
      if (Array.isArray(value)) {
        if (value.length > 0) criticalFieldsCompleted++
      } else if (typeof value === 'object') {
        if (Object.keys(value).length > 0) criticalFieldsCompleted++
      } else {
        criticalFieldsCompleted++
      }
    }
  })
  
  return { criticalFieldsCompleted, totalCriticalFields: criticalFields.length }
}

function generateStrengths(sections: ProfileSectionScore[]): string[] {
  const strengths: string[] = []
  
  sections.forEach(section => {
    if (section.sectionScore >= 80) {
      const labels = {
        pastPerformance: 'Strong Contract History',
        technicalCapability: 'Solid Technical Capabilities',
        strategicFitRelationships: 'Good Strategic Positioning',
        credibilityMarketPresence: 'Professional Market Presence'
      }
      strengths.push(labels[section.section as keyof typeof labels] || 'Strong Performance')
    }
  })
  
  return strengths
}

function generateWeaknesses(sections: ProfileSectionScore[]): string[] {
  const weaknesses: string[] = []
  
  sections.forEach(section => {
    if (section.sectionScore < 50) {
      const labels = {
        pastPerformance: 'Limited Contract History',
        technicalCapability: 'Incomplete Technical Information',
        strategicFitRelationships: 'Missing Strategic Details',
        credibilityMarketPresence: 'Incomplete Profile Information'
      }
      weaknesses.push(labels[section.section as keyof typeof labels] || 'Needs Improvement')
    }
  })
  
  return weaknesses
}

function generateNextSteps(sections: ProfileSectionScore[]): string[] {
  const steps: string[] = []
  
  // Find the section with lowest score that has missing fields
  const sortedSections = [...sections].sort((a, b) => a.sectionScore - b.sectionScore)
  
  for (const section of sortedSections) {
    if (section.suggestions.length > 0) {
      steps.push(...section.suggestions.slice(0, 2))
      if (steps.length >= 3) break
    }
  }
  
  return steps.slice(0, 3)
}

function generateRecommendations(sections: ProfileSectionScore[], profile: any): any[] {
  const recommendations: any[] = []
  
  sections.forEach(section => {
    if (section.sectionScore < 80 && section.missingFields.length > 0) {
      const priority = section.weight >= 30 ? 'high' : section.weight >= 20 ? 'medium' : 'low'
      
      section.missingFields.slice(0, 2).forEach(field => {
        recommendations.push({
          priority,
          title: `Complete ${field.replace(/([A-Z])/g, ' $1').toLowerCase()}`,
          description: section.suggestions[0] || `Add missing ${field.toLowerCase()} information`,
          impact: section.weight,
          effort: 'medium' as const,
          category: section.section
        })
      })
    }
  })
  
  return recommendations.slice(0, 5)
}

/**
 * =====================================================
 * CONFIGURATION ACCESS FUNCTIONS
 * =====================================================
 */

export const getOpportunityMatchingConfiguration = (): OpportunityMatchingConfiguration => {
  return CURRENT_ALGORITHM_CONFIG
}

export const getOpportunityMatchingWeights = (): OpportunityMatchingWeights => {
  return CURRENT_ALGORITHM_CONFIG.weights
}

export const getOpportunityMatchingWeightPercentages = () => {
  const weights = CURRENT_ALGORITHM_CONFIG.weights
  
  return {
    pastPerformance: weights.pastPerformance,
    technicalCapability: weights.technicalCapability,
    strategicFitRelationships: weights.strategicFitRelationships,
    credibilityMarketPresence: weights.credibilityMarketPresence
  }
}

export const getOpportunityMatchingSubFactors = (): OpportunityMatchingSubFactors => {
  return CURRENT_ALGORITHM_CONFIG.subFactors
}

export const getProfileScoringConfiguration = (): ProfileScoringConfiguration => {
  return CURRENT_PROFILE_CONFIG
}

export const getProfileSectionWeights = (): ProfileSectionWeights => {
  return CURRENT_PROFILE_CONFIG.sectionWeights
}

/**
 * =====================================================
 * UI HELPER FUNCTIONS
 * =====================================================
 */

export const getCategoryWeightLabels = () => {
  const weights = CURRENT_PROFILE_CONFIG.sectionWeights
  
  return {
    pastPerformance: {
      label: 'Past Performance',
      weight: weights.pastPerformance,
      formattedWeight: `${weights.pastPerformance}%`,
      priority: 'critical' as const,
      description: 'Contract history and performance records - most critical evaluation factor per FAR 15.305'
    },
    technicalCapability: {
      label: 'Technical Capability', 
      weight: weights.technicalCapability,
      formattedWeight: `${weights.technicalCapability}%`,
      priority: 'critical' as const,
      description: 'NAICS codes, certifications, and core competencies demonstrating technical qualifications'
    },
    strategicFitRelationships: {
      label: 'Strategic Fit & Relationships',
      weight: weights.strategicFitRelationships,
      formattedWeight: `${weights.strategicFitRelationships}%`, 
      priority: 'important' as const,
      description: 'Business information and strategic positioning for government contracting'
    },
    credibilityMarketPresence: {
      label: 'Credibility & Market Presence',
      weight: weights.credibilityMarketPresence,
      formattedWeight: `${weights.credibilityMarketPresence}%`,
      priority: 'foundation' as const,
      description: 'Contact information, company details, and government registration status'
    }
  }
}

export const getCategoryWeightPercentages = () => {
  const weights = CURRENT_PROFILE_CONFIG.sectionWeights
  
  return {
    pastPerformance: weights.pastPerformance,
    technicalCapability: weights.technicalCapability,
    strategicFitRelationships: weights.strategicFitRelationships,
    credibilityMarketPresence: weights.credibilityMarketPresence
  }
}

export const getMatchingFactorLabels = () => {
  const weights = CURRENT_ALGORITHM_CONFIG.weights
  
  return {
    pastPerformance: {
      label: 'Past Performance',
      weight: weights.pastPerformance,
      formattedWeight: `${weights.pastPerformance}%`,
      priority: 'critical' as const,
      description: 'Contract history relevance and agency experience'
    },
    technicalCapability: {
      label: 'Technical Capability', 
      weight: weights.technicalCapability,
      formattedWeight: `${weights.technicalCapability}%`,
      priority: 'critical' as const,
      description: 'NAICS alignment, certifications, and competencies'
    },
    strategicFitRelationships: {
      label: 'Strategic Fit & Relationships',
      weight: weights.strategicFitRelationships,
      formattedWeight: `${weights.strategicFitRelationships}%`,
      priority: 'important' as const,
      description: 'Geographic fit, government level experience, and business scale'
    },
    credibilityMarketPresence: {
      label: 'Credibility & Market Presence',
      weight: weights.credibilityMarketPresence,
      formattedWeight: `${weights.credibilityMarketPresence}%`,
      priority: 'foundation' as const,
      description: 'SAM.gov status, contact completeness, and professional presence'
    }
  }
}

export const getUnifiedScoringConfiguration = () => {
  return {
    profileScoring: CURRENT_PROFILE_CONFIG,
    opportunityMatching: CURRENT_ALGORITHM_CONFIG,
    version: '2.1',
    lastUpdated: new Date().toISOString(),
    categoryWeights: getCategoryWeightPercentages(),
    matchingFactors: getMatchingFactorLabels()
  }
}

export const getCategoryPriorityColor = (priority: 'critical' | 'important' | 'foundation'): string => {
  switch (priority) {
    case 'critical':
      return 'destructive'
    case 'important':
      return 'outline'
    case 'foundation':
      return 'secondary'
    default:
      return 'outline'
  }
}

// Legacy compatibility 
export type ScoringWeights = Record<string, number>
export type ScoringConfig = Record<string, any>

// Legacy type alias for backward compatibility
export type LegacyProfileScore = ProfileScore

export const getScoringConfiguration = () => CURRENT_PROFILE_CONFIG
export const getWeights = () => CURRENT_PROFILE_CONFIG.sectionWeights

// Type definitions for showcase component compatibility
export interface UnifiedScoringConfiguration extends ProfileScoringConfiguration {
  categories: {
    technicalCapability: {
      sections: {
        naics: number
        certifications: number
        capabilities: number
      }
    }
    credibility: {
      sections: {
        basic: number
        contact: number
        samGov: number
      }
    }
  }
}

export type UnifiedScoringConfigurationKey = 'current' | 'gov-contracting' | 'default'

// Enhanced configuration for showcase component
export interface EnhancedOpportunityMatchingConfiguration extends OpportunityMatchingConfiguration {
  categoryWeights: {
    technicalCapability: {
      naicsAlignment: number
      certificationMatch: number
      competencyAlignment: number
      securityClearanceMatch: number
    }
    strategicFit: {
      geographicProximity: number
      governmentLevelMatch: number
      geographicPreferenceMatch: number
    }
    credibilityMarketPresence: {
      samGovStatus: number
      contactInformation: number
      professionalPresence: number
    }
  }
}

export type OpportunityMatchingConfigurationKey = 'current' | 'default'

// Legacy exports for showcase component compatibility
export const UNIFIED_SCORING_CONFIGURATIONS = {
  'current': {
    ...CURRENT_PROFILE_CONFIG,
    categories: {
      technicalCapability: {
        sections: {
          naics: 50,
          certifications: 30,
          capabilities: 20
        }
      },
      credibility: {
        sections: {
          basic: 40,
          contact: 40,
          samGov: 20
        }
      }
    }
  },
  'gov-contracting': {
    ...CURRENT_PROFILE_CONFIG,
    name: 'Government Contracting Focused',
    description: 'Optimized for government contracting opportunities',
    categories: {
      technicalCapability: {
        sections: {
          naics: 50,
          certifications: 30,
          capabilities: 20
        }
      },
      credibility: {
        sections: {
          basic: 40,
          contact: 40,
          samGov: 20
        }
      }
    }
  },
  'default': {
    ...CURRENT_PROFILE_CONFIG,
    categories: {
      technicalCapability: {
        sections: {
          naics: 50,
          certifications: 30,
          capabilities: 20
        }
      },
      credibility: {
        sections: {
          basic: 40,
          contact: 40,
          samGov: 20
        }
      }
    }
  }
}

export const OPPORTUNITY_MATCHING_CONFIGURATIONS = {
  current: {
    ...CURRENT_ALGORITHM_CONFIG,
    categoryWeights: {
      technicalCapability: {
        naicsAlignment: 0.5,        // 50% of technical capability weight
        certificationMatch: 0.25,   // 25% of technical capability weight
        competencyAlignment: 0.15,  // 15% of technical capability weight
        securityClearanceMatch: 0.1 // 10% of technical capability weight
      },
      strategicFit: {
        geographicProximity: 0.4,       // 40% of strategic fit weight
        governmentLevelMatch: 0.3,      // 30% of strategic fit weight
        geographicPreferenceMatch: 0.3  // 30% of strategic fit weight
      },
      credibilityMarketPresence: {
        samGovStatus: 0.5,        // 50% of credibility weight
        contactInformation: 0.3,   // 30% of credibility weight
        professionalPresence: 0.2  // 20% of credibility weight
      }
    }
  },
  default: {
    ...CURRENT_ALGORITHM_CONFIG,
    categoryWeights: {
      technicalCapability: {
        naicsAlignment: 0.5,        // 50% of technical capability weight
        certificationMatch: 0.25,   // 25% of technical capability weight
        competencyAlignment: 0.15,  // 15% of technical capability weight
        securityClearanceMatch: 0.1 // 10% of technical capability weight
      },
      strategicFit: {
        geographicProximity: 0.4,       // 40% of strategic fit weight
        governmentLevelMatch: 0.3,      // 30% of strategic fit weight
        geographicPreferenceMatch: 0.3  // 30% of strategic fit weight
      },
      credibilityMarketPresence: {
        samGovStatus: 0.5,        // 50% of credibility weight
        contactInformation: 0.3,   // 30% of credibility weight
        professionalPresence: 0.2  // 20% of credibility weight
      }
    }
  }
}

export const getCategoryTotals = (categoryWeights: any) => {
  const totals = {
    pastPerformance: 35,
    technicalCapability: 35,
    strategicFitRelationships: 15,
    credibilityMarketPresence: 15
  }
  return totals
}

export const getContractReadinessAssessment = (overallScore: number) => {
  if (overallScore >= 90) {
    return {
      level: 'Excellent',
      description: 'Ready for large-scale government contracts',
      color: 'green'
    }
  } else if (overallScore >= 80) {
    return {
      level: 'Good',
      description: 'Ready for mid-tier government contracts',
      color: 'blue'
    }
  } else if (overallScore >= 70) {
    return {
      level: 'Fair',
      description: 'Ready for small government contracts',
      color: 'yellow'
    }
  } else {
    return {
      level: 'Needs Improvement',
      description: 'Profile improvements needed before contracting',
      color: 'red'
    }
  }
}

/**
 * =====================================================
 * OPPORTUNITY MATCHING ALGORITHM IMPLEMENTATION
 * =====================================================
 * Unified opportunity matching algorithm that uses the same 4-category
 * structure as profile completeness scoring for consistency
 */

// Types already imported above - no need to import again

// Opportunity matching interfaces
export interface MatchScoreInput {
  primaryNaics?: { code: string; title: string };
  secondaryNaics?: { code: string; title: string }[];
  businessAddress?: {
    state: string;
    city: string;
    zipCode: string;
  };
  certifications?: { type: string; status: string }[];
  pastPerformance?: {
    contractNumber: string;
    agency: string;
    performance: string;
    value: number;
  }[];
}

export interface MatchScoreResult {
  score: number;
  weight: number;
  contribution: number;
  details: string;
}

export interface MatchScoreFactor {
  score: number;
  weight: number;
  contribution: number;
  details: string;
}

export interface MatchScoreFactors {
  pastPerformance: MatchScoreFactor;
  technicalCapability: MatchScoreFactor;
  strategicFitRelationships: MatchScoreFactor;
  credibilityMarketPresence: MatchScoreFactor;
}

/**
 * Calculate overall match score for an opportunity against a profile
 * UNIFIED 4-CATEGORY ALGORITHM (v4.0) - Matches profile completeness structure
 */
export function calculateMatchScore(
  input: MatchScoreInput
): MatchScore;
export function calculateMatchScore(
  opportunity: Opportunity,
  profile: Profile | MatchScoreInput
): MatchScore;
export function calculateMatchScore(
  opportunityOrInput: Opportunity | MatchScoreInput,
  profile?: Profile | MatchScoreInput
): MatchScore {
  // Handle both function signatures
  let opportunity: Opportunity;
  let actualProfile: Profile | MatchScoreInput;
  
  if (profile) {
    // Called with (opportunity, profile)
    opportunity = opportunityOrInput as Opportunity;
    actualProfile = profile;
  } else {
    // Called with (input)
    const input = opportunityOrInput as MatchScoreInput;
    opportunity = (input as any).opportunity;
    actualProfile = (input as any).profile;
  }

  // Debug profile data for scoring
  console.log('🔍 Match Score Debug:', {
    opportunityId: opportunity.id,
    opportunityTitle: opportunity.title?.substring(0, 50),
    profileKeys: Object.keys(actualProfile || {}),
    profilePrimaryNaics: (actualProfile as any)?.primaryNaics,
    profileState: (actualProfile as any)?.state,
    profilePastPerformance: (actualProfile as any)?.pastPerformance ? 'exists' : 'missing',
    opportunityNaics: opportunity.naicsCodes,
    opportunityState: opportunity.placeOfPerformance?.state || opportunity.performanceState
  });

  // Get dynamic weights from our unified configuration
  const weights = getOpportunityMatchingWeightPercentages();

  // Calculate factors using unified 4-category structure
  const factors: MatchScoreFactors = {
    pastPerformance: calculatePastPerformanceMatchScore(actualProfile, opportunity, weights.pastPerformance),
    technicalCapability: calculateTechnicalCapabilityMatchScore(actualProfile, opportunity, weights.technicalCapability),
    strategicFitRelationships: calculateStrategicFitMatchScore(actualProfile, opportunity, weights.strategicFitRelationships),
    credibilityMarketPresence: calculateCredibilityMatchScore(actualProfile, opportunity, weights.credibilityMarketPresence)
  };

  // Calculate weighted overall score
  const overallScore = Object.values(factors).reduce(
    (total, factor) => total + factor.contribution,
    0
  );

  // Debug final score calculation
  console.log(`🎯 Final Score Calculation for ${opportunity.id}:`, {
    pastPerformance: `${factors.pastPerformance.score}pts × ${factors.pastPerformance.weight}% = ${factors.pastPerformance.contribution.toFixed(1)}`,
    technicalCapability: `${factors.technicalCapability.score}pts × ${factors.technicalCapability.weight}% = ${factors.technicalCapability.contribution.toFixed(1)}`,
    strategicFit: `${factors.strategicFitRelationships.score}pts × ${factors.strategicFitRelationships.weight}% = ${factors.strategicFitRelationships.contribution.toFixed(1)}`,
    credibility: `${factors.credibilityMarketPresence.score}pts × ${factors.credibilityMarketPresence.weight}% = ${factors.credibilityMarketPresence.contribution.toFixed(1)}`,
    totalContribution: overallScore.toFixed(1),
    finalScore: Math.round(overallScore)
  });

  // Calculate confidence using credibility as multiplier
  const confidence = calculateMatchConfidenceScore(overallScore, factors.credibilityMarketPresence);

  return {
    score: Math.round(Math.min(Math.max(overallScore, 0), 100)),
    confidence: Math.round(Math.min(Math.max(confidence, 0), 100)),
    factors,
    details: `Overall match score: ${Math.round(overallScore)}% (${Math.round(confidence)}% confidence)`,
    algorithmVersion: '4.0',
    calculatedAt: new Date().toISOString()
  } as MatchScore;
}

/**
 * Past Performance match scoring (35% weight)
 */
function calculatePastPerformanceMatchScore(
  profile: Profile | MatchScoreInput,
  opportunity: Opportunity,
  categoryWeight: number
): MatchScoreFactor {
  let score = 0;
  const details = [];

  const profileData = profile as Profile;
  const pastPerformance = profileData.pastPerformance || [];
  
  // Convert to array if needed
  const pastPerformanceArray = Array.isArray(pastPerformance) ? pastPerformance : 
    pastPerformance ? [pastPerformance] : [];

  if (pastPerformanceArray.length === 0) {
    // No past performance - score based on opportunity risk level
    const estValue = opportunity.estimatedValue || 0;
    if (estValue < 250000) {
      score = 40; // Small contracts might accept new contractors
      details.push('No past performance (small contract threshold)');
    } else if (estValue < 1000000) {
      score = 25; // Medium contracts prefer some experience
      details.push('No past performance (medium contract risk)');
    } else {
      score = 10; // Large contracts require proven track record
      details.push('No past performance (high contract risk)');
    }
  } else {
    // Base score for having past performance
    let baseScore = Math.min(20 + (pastPerformanceArray.length * 15), 80);
    score += baseScore;
    details.push(`${pastPerformanceArray.length} past performance record(s)`);

    // Contract value alignment - compare past contracts to opportunity value
    const oppValue = opportunity.estimatedValue || 500000;
    const hasRelevantSize = pastPerformanceArray.some((pp: any) => {
      const ppValue = pp.contractValue || pp.value || 0;
      return ppValue >= (oppValue * 0.5) && ppValue <= (oppValue * 3);
    });
    
    if (hasRelevantSize) {
      score += 15;
      details.push('Similar contract value experience');
    } else {
      score += 5;
      details.push('Different contract value scale');
    }

    // Agency/sector alignment - simplified check
    if (opportunity.agency && opportunity.agency.name) {
      const hasGovExperience = pastPerformanceArray.some((pp: any) => 
        pp.client?.toLowerCase().includes('government') ||
        pp.client?.toLowerCase().includes('federal') ||
        pp.client?.toLowerCase().includes('state') ||
        pp.client?.toLowerCase().includes('county') ||
        pp.client?.toLowerCase().includes('city')
      );
      
      if (hasGovExperience) {
        score += 10;
        details.push('Government contracting experience');
      } else {
        score += 3;
        details.push('Private sector experience');
      }
    }
  }

  const finalScore = Math.min(score, 100);
  
  return {
    score: finalScore,
    weight: categoryWeight,
    contribution: (finalScore * categoryWeight) / 100,
    details: details.join(', ')
  };
}

/**
 * Technical Capability match scoring (35% weight)
 */
function calculateTechnicalCapabilityMatchScore(
  profile: Profile | MatchScoreInput,
  opportunity: Opportunity,
  categoryWeight: number
): MatchScoreFactor {
  let score = 0;
  const details = [];

  const profileData = profile as Profile;
  
  // NAICS code matching (50% of technical capability)
  if (opportunity.naicsCodes && Array.isArray(opportunity.naicsCodes) && opportunity.naicsCodes.length > 0) {
    if (profileData.primaryNaics) {
      // Check for exact match
      if (opportunity.naicsCodes.includes(profileData.primaryNaics)) {
        score += 50;
        details.push('Exact primary NAICS match');
      } 
      // Check secondary NAICS codes
      else if (profileData.secondaryNaics && Array.isArray(profileData.secondaryNaics)) {
        const hasSecondaryMatch = opportunity.naicsCodes.some(code => 
          profileData.secondaryNaics.includes(code)
        );
        if (hasSecondaryMatch) {
          score += 40;
          details.push('Secondary NAICS match');
        } else {
          // Check for same sector (first 2 digits)
          const primarySector = profileData.primaryNaics.substring(0, 2);
          const hasSectorMatch = opportunity.naicsCodes.some(code => 
            code.substring(0, 2) === primarySector
          );
          if (hasSectorMatch) {
            score += 25;
            details.push('Same industry sector');
          } else {
            score += 10;
            details.push('Different industry alignment');
          }
        }
      } else {
        // No secondary NAICS, check sector match
        const primarySector = profileData.primaryNaics.substring(0, 2);
        const hasSectorMatch = opportunity.naicsCodes.some(code => 
          code.substring(0, 2) === primarySector
        );
        if (hasSectorMatch) {
          score += 30;
          details.push('Same industry sector match');
        } else {
          score += 15;
          details.push('Different industry sector');
        }
      }
    } else {
      // No primary NAICS specified
      score += 5;
      details.push('No primary NAICS code specified');
    }
  } else {
    // No opportunity NAICS codes
    score += 25;
    details.push('Opportunity NAICS codes not specified');
  }

  // Certification matching (25% of technical capability)
  if (profileData.certifications && opportunity.setAsideType) {
    const certs = profileData.certifications as any;
    if (certs.setAsides && Array.isArray(certs.setAsides)) {
      if (certs.setAsides.includes(opportunity.setAsideType) || 
          certs.setAsides.includes('SBA') ||
          opportunity.setAsideType.includes('SBA')) {
        score += 25;
        details.push('Certification match');
      }
    }
  }

  // Security clearance (10% of technical capability)
  if (opportunity.securityClearanceRequired && profileData.securityClearance) {
    score += 10;
    details.push('Security clearance match');
  }

  // Competencies (15% of technical capability) - simplified
  if (profileData.coreCompetencies && Array.isArray(profileData.coreCompetencies) && profileData.coreCompetencies.length > 0) {
    score += 15;
    details.push('Core competencies available');
  }

  const finalScore = Math.min(score, 100);
  
  return {
    score: finalScore,
    weight: categoryWeight,
    contribution: (finalScore * categoryWeight) / 100,
    details: details.join(', ')
  };
}

/**
 * Strategic Fit & Relationships match scoring (15% weight)
 */
function calculateStrategicFitMatchScore(
  profile: Profile | MatchScoreInput,
  opportunity: Opportunity,
  categoryWeight: number
): MatchScoreFactor {
  let score = 0;
  const details = [];

  const profileData = profile as Profile;

  // Geographic proximity (40% of strategic fit)
  if (opportunity.placeOfPerformance?.state || opportunity.performanceState) {
    const oppState = opportunity.placeOfPerformance?.state || opportunity.performanceState;
    
    if (profileData.state === oppState) {
      score += 40;
      details.push('Same state location');
    } else {
      score += 20;
      details.push('Different state location');
    }
  }

  // Government level match (30% of strategic fit)
  const govLevels = profileData.governmentLevels || [];
  let govLevelMatch = false;
  
  if (Array.isArray(govLevels) && govLevels.length > 0) {
    // Determine opportunity government level based on agency
    const agencyName = opportunity.agency?.name?.toLowerCase() || '';
    const agencyType = opportunity.agency?.type?.toLowerCase() || '';
    
    if (agencyName.includes('federal') || agencyType === 'federal') {
      govLevelMatch = govLevels.includes('federal');
    } else if (agencyName.includes('state') || agencyType === 'state') {
      govLevelMatch = govLevels.includes('state');
    } else if (agencyName.includes('county') || agencyType === 'county') {
      govLevelMatch = govLevels.includes('county');
    } else if (agencyName.includes('city') || agencyType === 'city') {
      govLevelMatch = govLevels.includes('city');
    } else {
      // Default to partial match if we can't determine
      govLevelMatch = true;
    }
    
    if (govLevelMatch) {
      score += 30;
      details.push('Government level preference match');
    } else {
      score += 15;
      details.push('Different government level');
    }
  } else {
    score += 20;
    details.push('No government level preferences specified');
  }

  // Geographic preferences (20% of strategic fit)
  if (profileData.geographicPreferences) {
    const geoPref = profileData.geographicPreferences;
    let hasRelevantPrefs = false;
    
    // Handle new grouped format
    if ((geoPref as any).state && Array.isArray((geoPref as any).state)) {
      hasRelevantPrefs = (geoPref as any).state.length > 0;
    }
    // Handle legacy flat array format  
    else if (Array.isArray(geoPref)) {
      hasRelevantPrefs = geoPref.length > 0;
    }
    
    if (hasRelevantPrefs) {
      score += 20;
      details.push('Geographic preferences defined');
    } else {
      score += 10;
      details.push('Geographic preferences incomplete');
    }
  } else {
    score += 5;
    details.push('No geographic preferences specified');
  }

  // Contract value scale alignment (10% of strategic fit)
  const oppValue = opportunity.estimatedValue || 0;
  if (oppValue > 0) {
    if (oppValue < 500000) {
      score += 10; // Small contracts fit most businesses
      details.push('Small contract scale suitable');
    } else if (oppValue < 5000000) {
      score += 8; // Medium contracts need some capacity
      details.push('Medium contract scale alignment');
    } else {
      score += 6; // Large contracts need proven capacity
      details.push('Large contract scale consideration');
    }
  } else {
    score += 8;
    details.push('Contract value scale unknown');
  }

  const finalScore = Math.min(score, 100);
  
  return {
    score: finalScore,
    weight: categoryWeight,
    contribution: (finalScore * categoryWeight) / 100,
    details: details.join(', ')
  };
}

/**
 * Credibility & Market Presence match scoring (15% weight)
 */
function calculateCredibilityMatchScore(
  profile: Profile | MatchScoreInput,
  opportunity: Opportunity,
  categoryWeight: number
): MatchScoreFactor {
  let score = 0;
  const details = [];

  const profileData = profile as Profile;

  // Government registration (60% of credibility)
  if (profileData.uei && profileData.cageCode) {
    score += 60;
    details.push('Full SAM.gov registration');
  } else if (profileData.uei || profileData.cageCode) {
    score += 30;
    details.push('Partial SAM.gov registration');
  } else {
    details.push('No SAM.gov registration');
  }

  // Contact completeness (25% of credibility)
  if (profileData.primaryContactEmail && profileData.primaryContactName) {
    score += 25;
    details.push('Complete contact information');
  } else {
    score += 10;
    details.push('Incomplete contact information');
  }

  // Market presence (10% of credibility)
  if (profileData.website) {
    score += 10;
    details.push('Professional web presence');
  }

  // Business verification (5% of credibility)
  if (profileData.companyName && (profileData.addressLine1 || profileData.city)) {
    score += 5;
    details.push('Business address verified');
  }

  const finalScore = Math.min(score, 100);
  
  return {
    score: finalScore,
    weight: categoryWeight,
    contribution: (finalScore * categoryWeight) / 100,
    details: details.join(', ')
  };
}

/**
 * Calculate confidence score based on overall match and credibility
 */
function calculateMatchConfidenceScore(
  overallScore: number, 
  credibilityFactor: MatchScoreFactor
): number {
  const credibilityScore = credibilityFactor.score;
  
  // Base confidence is the overall score
  let confidence = overallScore;
  
  // Apply credibility multiplier
  if (credibilityScore >= 80) {
    confidence = confidence * 1.1; // 10% boost
  } else if (credibilityScore >= 60) {
    // No change
  } else if (credibilityScore >= 40) {
    confidence = confidence * 0.9; // 10% penalty
  } else {
    confidence = confidence * 0.8; // 20% penalty
  }
  
  return confidence;
}

// Export batch calculation function for API compatibility
export function calculateBatchMatchScores(
  opportunities: Opportunity[],
  profile: Profile | MatchScoreInput
): MatchScore[] {
  return opportunities.map(opportunity => 
    calculateMatchScore(opportunity, profile)
  );
}

// Default export for backward compatibility
export default calculateProfileScore