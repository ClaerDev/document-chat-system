import { Profile, Opportunity } from '@/types'

// MatchScore Algorithm v2 - Enhanced with comprehensive profile matching
// Common interfaces for Profile-Opportunity matching consistency

// Common matching interfaces that both Profile and Opportunity can implement
export interface MatchableEntity {
  // Geographic matching
  geographicInfo?: {
    state?: string
    city?: string
    region?: string
    workRemote?: boolean
    travelRequired?: boolean
    locations?: string[] // Multiple acceptable locations
  }
  
  // Industry/Business matching
  businessInfo?: {
    naicsCodes: string[]
    primaryNaics?: string
    businessType?: string
    contractTypes?: string[] // Types of contracts (Fixed price, Cost plus, T&M, etc.)
    contractValues?: {
      min?: number
      max?: number
      preferred?: number
    }
  }
  
  // Certifications & Compliance
  certificationRequirements?: {
    requiredCertifications?: string[] // Required certifications (8a, HUBZone, etc.)
    preferredCertifications?: string[] // Nice-to-have certifications
    securityClearance?: string // Required security clearance level
    complianceStandards?: string[] // ISO, CMMI, FedRAMP, etc.
  }
  
  // Government & Agency matching
  governmentInfo?: {
    levels?: string[] // FEDERAL, STATE, LOCAL
    agencies?: string[] // Specific agencies
    setAsideTypes?: string[] // Set-aside types this applies to
  }
  
  // Experience & Capability matching
  experienceRequirements?: {
    yearsRequired?: number
    keySkills?: string[] // Core competencies/skills
    pastPerformanceAreas?: string[] // Areas of past performance
    teamSize?: {
      min?: number
      max?: number
    }
  }
  
  // Brand & Communication (for proposals/outreach)
  communicationPreferences?: {
    preferredVoice?: string // PROFESSIONAL, TECHNICAL, etc.
    preferredTone?: string // FORMAL, CONVERSATIONAL, etc.
    responseStyle?: string // How they prefer to communicate
  }
}

export interface MatchScoreResult {
  score: number // 0-100
  breakdown: MatchScoreBreakdown
  explanation: string
}

export interface MatchScoreBreakdown {
  // Core business alignment (35% total weight)
  naicsAlignment: FactorScore
  businessTypeMatch: FactorScore
  
  // Geographic & logistics (20% total weight)
  geographicProximity: FactorScore
  
  // Certifications & compliance (20% total weight)
  certificationMatch: FactorScore
  securityClearanceMatch: FactorScore
  
  // Experience & capability (15% total weight)
  pastPerformance: FactorScore
  skillsAlignment: FactorScore
  
  // Government preferences (10% total weight)  
  governmentLevel: FactorScore
  agencyMatch: FactorScore
}

export interface FactorScore {
  score: number // 0-100
  weight: number // percentage weight
  contribution: number // weighted contribution to total
  details: string
}

// Normalization functions to convert Profile/Opportunity to common MatchableEntity format
export function normalizeProfile(profile: any): MatchableEntity {
  // Extract geographic preferences
  const geoPrefs = profile.geographicPreferences
  const geographicInfo = {
    state: profile.state,
    city: profile.city,
    workRemote: geoPrefs?.workFromHome || false,
    travelRequired: geoPrefs?.travelWillingness !== 'NONE',
    locations: []
  }
  
  // Extract state preferences if available
  if (geoPrefs?.preferences?.state) {
    geographicInfo.locations = geoPrefs.preferences.state
      .filter((pref: any) => pref.type === 'PREFERRED' || pref.type === 'WILLING')
      .map((pref: any) => pref.name || pref.data?.code)
      .filter(Boolean)
  }
  
  // Extract NAICS codes
  let naicsCodes: string[] = []
  if (profile.primaryNaics) naicsCodes.push(profile.primaryNaics)
  if (profile.secondaryNaics) naicsCodes.push(...profile.secondaryNaics)
  if (profile.naicsCodes) naicsCodes.push(...profile.naicsCodes)
  naicsCodes = [...new Set(naicsCodes.filter(Boolean))] // Remove duplicates
  
  // Extract certifications
  const certifications = profile.certifications || {}
  const userCertifications = certifications.certifications || []
  const setAsides = certifications.setAsides || []
  
  return {
    geographicInfo,
    businessInfo: {
      naicsCodes,
      primaryNaics: profile.primaryNaics,
      businessType: profile.businessType,
      contractTypes: [], // Could be inferred from past performance
      contractValues: {
        // Could be extracted from past performance or revenue
        preferred: profile.annualRevenue ? parseRevenueRange(profile.annualRevenue) : undefined
      }
    },
    certificationRequirements: {
      requiredCertifications: userCertifications.map((cert: any) => cert.type || cert.name).filter(Boolean),
      preferredCertifications: setAsides,
      securityClearance: profile.securityClearance,
      complianceStandards: userCertifications
        .filter((cert: any) => cert.type?.includes('ISO') || cert.type?.includes('CMMI'))
        .map((cert: any) => cert.type)
    },
    governmentInfo: {
      levels: profile.governmentLevels || [],
      agencies: [], // Could be extracted from past performance
      setAsideTypes: setAsides
    },
    experienceRequirements: {
      yearsRequired: profile.yearEstablished ? new Date().getFullYear() - profile.yearEstablished : undefined,
      keySkills: profile.coreCompetencies || [],
      pastPerformanceAreas: extractPastPerformanceAreas(profile.pastPerformance),
      teamSize: parseEmployeeCount(profile.employeeCount)
    },
    communicationPreferences: {
      preferredVoice: profile.brandVoice,
      preferredTone: profile.brandTone,
      responseStyle: combineBrandAttributes(profile.brandVoice, profile.brandTone)
    }
  }
}

export function normalizeOpportunity(opportunity: any): MatchableEntity {
  // Extract location information
  const locations = []
  if (opportunity.state) locations.push(opportunity.state)
  if (opportunity.location) locations.push(opportunity.location)
  if (opportunity.performanceLocation) locations.push(opportunity.performanceLocation)
  
  return {
    geographicInfo: {
      state: opportunity.state,
      city: opportunity.location?.split(',')[0],
      workRemote: opportunity.workLocation?.includes('remote') || false,
      travelRequired: opportunity.travelRequired || false,
      locations: [...new Set(locations.filter(Boolean))]
    },
    businessInfo: {
      naicsCodes: opportunity.naicsCodes || [],
      primaryNaics: opportunity.primaryNaics,
      businessType: opportunity.businessType,
      contractTypes: opportunity.contractType ? [opportunity.contractType] : [],
      contractValues: {
        min: opportunity.contractValueMin || opportunity.estimatedValue?.min,
        max: opportunity.contractValueMax || opportunity.estimatedValue?.max,
        preferred: opportunity.contractValue || opportunity.estimatedValue?.preferred
      }
    },
    certificationRequirements: {
      requiredCertifications: opportunity.requiredCertifications || [],
      preferredCertifications: opportunity.preferredCertifications || [],
      securityClearance: opportunity.securityClearance,
      complianceStandards: opportunity.complianceRequirements || []
    },
    governmentInfo: {
      levels: inferGovernmentLevel(opportunity.agency),
      agencies: opportunity.agency ? [opportunity.agency] : [],
      setAsideTypes: opportunity.setAsideType ? [opportunity.setAsideType] : []
    },
    experienceRequirements: {
      yearsRequired: opportunity.minimumExperience || 0,
      keySkills: opportunity.requiredSkills || opportunity.keywords || [],
      pastPerformanceAreas: opportunity.industryAreas || [],
      teamSize: parseTeamSizeRequirement(opportunity.teamSizeRequirement)
    },
    communicationPreferences: {
      preferredVoice: opportunity.communicationStyle?.voice,
      preferredTone: opportunity.communicationStyle?.tone,
      responseStyle: opportunity.responsePreferences
    }
  }
}

// Helper functions for data extraction and parsing
function parseRevenueRange(revenue: string): number | undefined {
  const ranges: Record<string, number> = {
    'Less than $100K': 50000,
    '$100K - $500K': 300000,
    '$500K - $1M': 750000,
    '$1M - $5M': 3000000,
    '$5M - $10M': 7500000,
    '$10M - $25M': 17500000,
    '$25M - $50M': 37500000,
    '$50M - $100M': 75000000,
    '$100M+': 150000000
  }
  return ranges[revenue]
}

function parseEmployeeCount(employeeCount: string): { min?: number; max?: number } | undefined {
  if (!employeeCount) return undefined
  
  const ranges: Record<string, { min: number; max: number }> = {
    '1-5': { min: 1, max: 5 },
    '6-10': { min: 6, max: 10 },
    '11-25': { min: 11, max: 25 },
    '26-50': { min: 26, max: 50 },
    '51-100': { min: 51, max: 100 },
    '101-250': { min: 101, max: 250 },
    '251-500': { min: 251, max: 500 },
    '501-1000': { min: 501, max: 1000 },
    '1000+': { min: 1000, max: 10000 }
  }
  return ranges[employeeCount]
}

function extractPastPerformanceAreas(pastPerformance: any): string[] {
  if (!pastPerformance) return []
  
  const areas: string[] = []
  
  if (pastPerformance.keyProjects && Array.isArray(pastPerformance.keyProjects)) {
    pastPerformance.keyProjects.forEach((project: any) => {
      if (project.customerType) areas.push(project.customerType)
      if (project.title) {
        // Extract industry keywords from project titles
        const industryKeywords = project.title.toLowerCase()
        if (industryKeywords.includes('it') || industryKeywords.includes('software')) areas.push('Information Technology')
        if (industryKeywords.includes('defense') || industryKeywords.includes('military')) areas.push('Defense')
        if (industryKeywords.includes('health') || industryKeywords.includes('medical')) areas.push('Healthcare')
      }
    })
  }
  
  return [...new Set(areas)]
}

function combineBrandAttributes(voice?: string, tone?: string): string {
  if (!voice && !tone) return ''
  if (voice && tone) return `${voice} and ${tone}`
  return voice || tone || ''
}

function inferGovernmentLevel(agency?: string): string[] {
  if (!agency) return []
  
  const agencyLower = agency.toLowerCase()
  
  if (agencyLower.includes('department of') || agencyLower.includes('dod') || 
      agencyLower.includes('gsa') || agencyLower.includes('federal')) {
    return ['FEDERAL']
  } else if (agencyLower.includes('state') || agencyLower.includes('commonwealth')) {
    return ['STATE']
  } else if (agencyLower.includes('city') || agencyLower.includes('county') || 
             agencyLower.includes('local')) {
    return ['LOCAL']
  }
  
  return ['FEDERAL'] // Default assumption
}

function parseTeamSizeRequirement(requirement?: string): { min?: number; max?: number } | undefined {
  if (!requirement) return undefined
  
  // Parse requirements like "5-10 people", "minimum 3", "up to 20", etc.
  const numbers = requirement.match(/\d+/g)
  if (!numbers) return undefined
  
  if (numbers.length === 1) {
    const num = parseInt(numbers[0])
    if (requirement.includes('minimum') || requirement.includes('at least')) {
      return { min: num }
    } else if (requirement.includes('maximum') || requirement.includes('up to')) {
      return { max: num }
    } else {
      return { min: num, max: num }
    }
  } else if (numbers.length === 2) {
    return { min: parseInt(numbers[0]), max: parseInt(numbers[1]) }
  }
  
  return undefined
}

// Geographic distance calculation with support for new geographic preferences structure
function calculateGeographicScore(profile: any, opportunityState: string): number {
  if (!opportunityState || typeof opportunityState !== 'string') return 50 // neutral if missing opportunity data
  
  // Handle new geographic preferences structure
  if (profile.geographicPreferences && typeof profile.geographicPreferences === 'object') {
    const geoPrefs = profile.geographicPreferences
    
    // Check work from home preference
    if (geoPrefs.workFromHome) {
      return 95 // High score for remote work capability
    }
    
    // Check state preferences
    if (geoPrefs.preferences?.state && Array.isArray(geoPrefs.preferences.state)) {
      for (const statePref of geoPrefs.preferences.state) {
        if (statePref.data?.code === opportunityState.toUpperCase() || 
            statePref.name?.toLowerCase().includes(opportunityState.toLowerCase())) {
          return statePref.type === 'PREFERRED' ? 100 : 
                 statePref.type === 'WILLING' ? 80 : 30 // AVOID type
        }
      }
    }
    
    // Check travel willingness
    const travelWillingness = geoPrefs.travelWillingness
    if (travelWillingness === 'NATIONAL' || travelWillingness === 'INTERNATIONAL') {
      return 70 // Willing to travel anywhere
    } else if (travelWillingness === 'REGIONAL') {
      return 50 // May travel regionally
    } else if (travelWillingness === 'LOCAL') {
      return 30 // Limited travel
    }
  }
  
  // Fallback to legacy state field
  const profileState = profile.state
  if (!profileState || typeof profileState !== 'string') return 50 // neutral if missing profile data
  
  // Exact state match
  if (profileState.toLowerCase() === opportunityState.toLowerCase()) {
    return 100
  }
  
  // TODO: Add region-based scoring (adjacent states, etc.)
  // For now, any different state gets a lower score
  return 25
}

// NAICS code alignment scoring
function calculateNaicsScore(profileNaics: string[], opportunityNaics: string[]): number {
  if (!profileNaics?.length || !opportunityNaics?.length) return 0
  
  let maxScore = 0
  
  for (const profileCode of profileNaics) {
    for (const oppCode of opportunityNaics) {
      // Exact match
      if (profileCode === oppCode) {
        return 100
      }
      
      // Industry group match (first 3 digits)
      if (profileCode.substring(0, 3) === oppCode.substring(0, 3)) {
        maxScore = Math.max(maxScore, 80)
      }
      
      // Sector match (first 2 digits)  
      else if (profileCode.substring(0, 2) === oppCode.substring(0, 2)) {
        maxScore = Math.max(maxScore, 60)
      }
    }
  }
  
  return maxScore
}

// Certification matching with support for new UserCertification[] structure
function calculateCertificationScore(profileCertifications: any): number {
  if (!profileCertifications || typeof profileCertifications !== 'object') return 50
  
  // Handle new UserCertification[] structure
  if (profileCertifications.certifications && Array.isArray(profileCertifications.certifications)) {
    const activeCerts = profileCertifications.certifications.filter((cert: any) => {
      // Check if certification is active (not expired)
      if (cert.expirationDate) {
        const expDate = new Date(cert.expirationDate)
        const today = new Date()
        return expDate > today
      }
      return true // No expiration date means it's active
    }).length
    
    // Score based on number of active certifications
    if (activeCerts === 0) return 30
    if (activeCerts >= 5) return 95
    if (activeCerts >= 3) return 85
    if (activeCerts >= 2) return 70
    return 55
  }
  
  // Handle set-asides separately
  if (profileCertifications.setAsides && Array.isArray(profileCertifications.setAsides)) {
    const setAsideCount = profileCertifications.setAsides.length
    if (setAsideCount >= 3) return 90
    if (setAsideCount >= 2) return 75
    if (setAsideCount >= 1) return 60
  }
  
  // Fallback to legacy certification structure
  const activeCerts = Object.entries(profileCertifications)
    .filter(([key, value]) => key.startsWith('has') && value === true)
    .length
  
  // Base score based on having certifications
  if (activeCerts === 0) return 30
  if (activeCerts >= 3) return 85
  if (activeCerts >= 2) return 70
  return 55
}

// Past performance scoring with support for new JSON structure
function calculatePastPerformanceScore(profile: any): number {
  if (!profile.pastPerformance) return 50
  
  const pastPerf = profile.pastPerformance as any
  let score = 50
  
  // Has description
  if (pastPerf.description && pastPerf.description.trim().length > 50) {
    score += 15
  }
  
  // Has total contract value
  if (pastPerf.totalContractValue && pastPerf.totalContractValue.trim().length > 0) {
    score += 10
  }
  
  // Has years in business
  if (pastPerf.yearsInBusiness && pastPerf.yearsInBusiness.trim().length > 0) {
    score += 10
  }
  
  // Has key projects - this is the most important factor
  if (pastPerf.keyProjects && Array.isArray(pastPerf.keyProjects) && pastPerf.keyProjects.length > 0) {
    const projectCount = pastPerf.keyProjects.length
    if (projectCount >= 5) {
      score += 25
    } else if (projectCount >= 3) {
      score += 20
    } else if (projectCount >= 1) {
      score += 15
    }
  }
  
  return Math.min(100, score)
}

// Government level matching - new factor for enhanced profiles
function calculateGovernmentLevelScore(profileGovernmentLevels: string[], opportunityAgency: string): number {
  if (!profileGovernmentLevels || !Array.isArray(profileGovernmentLevels) || profileGovernmentLevels.length === 0) {
    return 75 // Neutral score if no preferences specified
  }
  
  if (!opportunityAgency) return 75 // Neutral if no agency info
  
  // Simple heuristics to determine government level from agency name
  const agencyLower = opportunityAgency.toLowerCase()
  let detectedLevel = 'FEDERAL' // Default assumption
  
  if (agencyLower.includes('department of') || agencyLower.includes('dod') || 
      agencyLower.includes('gsa') || agencyLower.includes('dhs') ||
      agencyLower.includes('federal') || agencyLower.includes('fbi') ||
      agencyLower.includes('cia') || agencyLower.includes('nasa')) {
    detectedLevel = 'FEDERAL'
  } else if (agencyLower.includes('state') || agencyLower.includes(' st ') || agencyLower.includes('commonwealth')) {
    detectedLevel = 'STATE'  
  } else if (agencyLower.includes('city') || agencyLower.includes('county') || 
             agencyLower.includes('municipal') || agencyLower.includes('township') ||
             agencyLower.includes('local') || agencyLower.includes('school district')) {
    detectedLevel = 'LOCAL'
  }
  
  // Check if detected level matches preferences
  if (profileGovernmentLevels.includes(detectedLevel)) {
    return 100
  }
  
  return 50 // Lower score if not preferred government level
}

// Enhanced scoring functions using normalized MatchableEntity data
function calculateComprehensiveMatchScore(profileEntity: MatchableEntity, opportunityEntity: MatchableEntity): MatchScoreResult {
  // Updated weights for comprehensive matching (total = 100%)
  const weights = {
    // Core business alignment (35% total)
    naicsAlignment: 20,
    businessTypeMatch: 15,
    
    // Geographic & logistics (20% total)
    geographicProximity: 20,
    
    // Certifications & compliance (20% total)
    certificationMatch: 12,
    securityClearanceMatch: 8,
    
    // Experience & capability (15% total)
    pastPerformance: 8,
    skillsAlignment: 7,
    
    // Government preferences (10% total)
    governmentLevel: 6,
    agencyMatch: 4
  }
  
  // Calculate individual scores
  const naicsScore = calculateNaicsMatchScore(profileEntity.businessInfo, opportunityEntity.businessInfo)
  const businessTypeScore = calculateBusinessTypeMatch(profileEntity.businessInfo, opportunityEntity.businessInfo)
  const geographicScore = calculateGeographicMatchScore(profileEntity.geographicInfo, opportunityEntity.geographicInfo)
  const certificationScore = calculateCertificationMatchScore(profileEntity.certificationRequirements, opportunityEntity.certificationRequirements)
  const securityClearanceScore = calculateSecurityClearanceMatch(profileEntity.certificationRequirements, opportunityEntity.certificationRequirements)
  const pastPerformanceScore = calculatePastPerformanceMatchScore(profileEntity.experienceRequirements, opportunityEntity.experienceRequirements)
  const skillsScore = calculateSkillsMatchScore(profileEntity.experienceRequirements, opportunityEntity.experienceRequirements)
  const governmentLevelScore = calculateGovernmentLevelMatchScore(profileEntity.governmentInfo, opportunityEntity.governmentInfo)
  const agencyScore = calculateAgencyMatchScore(profileEntity.governmentInfo, opportunityEntity.governmentInfo)
  
  // Calculate weighted contributions
  const contributions = {
    naicsAlignment: (naicsScore * weights.naicsAlignment) / 100,
    businessTypeMatch: (businessTypeScore * weights.businessTypeMatch) / 100,
    geographicProximity: (geographicScore * weights.geographicProximity) / 100,
    certificationMatch: (certificationScore * weights.certificationMatch) / 100,
    securityClearanceMatch: (securityClearanceScore * weights.securityClearanceMatch) / 100,
    pastPerformance: (pastPerformanceScore * weights.pastPerformance) / 100,
    skillsAlignment: (skillsScore * weights.skillsAlignment) / 100,
    governmentLevel: (governmentLevelScore * weights.governmentLevel) / 100,
    agencyMatch: (agencyScore * weights.agencyMatch) / 100
  }
  
  // Total score
  const totalScore = Math.round(Object.values(contributions).reduce((sum, contribution) => sum + contribution, 0))
  
  // Build comprehensive breakdown
  const breakdown: MatchScoreBreakdown = {
    naicsAlignment: {
      score: naicsScore,
      weight: weights.naicsAlignment,
      contribution: contributions.naicsAlignment,
      details: generateNaicsMatchDetails(naicsScore)
    },
    businessTypeMatch: {
      score: businessTypeScore,
      weight: weights.businessTypeMatch,
      contribution: contributions.businessTypeMatch,
      details: generateBusinessTypeMatchDetails(businessTypeScore)
    },
    geographicProximity: {
      score: geographicScore,
      weight: weights.geographicProximity,
      contribution: contributions.geographicProximity,
      details: generateGeographicMatchDetails(geographicScore)
    },
    certificationMatch: {
      score: certificationScore,
      weight: weights.certificationMatch,
      contribution: contributions.certificationMatch,
      details: generateCertificationMatchDetails(certificationScore)
    },
    securityClearanceMatch: {
      score: securityClearanceScore,
      weight: weights.securityClearanceMatch,
      contribution: contributions.securityClearanceMatch,
      details: generateSecurityClearanceMatchDetails(securityClearanceScore)
    },
    pastPerformance: {
      score: pastPerformanceScore,
      weight: weights.pastPerformance,
      contribution: contributions.pastPerformance,
      details: generatePastPerformanceMatchDetails(pastPerformanceScore)
    },
    skillsAlignment: {
      score: skillsScore,
      weight: weights.skillsAlignment,
      contribution: contributions.skillsAlignment,
      details: generateSkillsMatchDetails(skillsScore)
    },
    governmentLevel: {
      score: governmentLevelScore,
      weight: weights.governmentLevel,
      contribution: contributions.governmentLevel,
      details: generateGovernmentLevelMatchDetails(governmentLevelScore)
    },
    agencyMatch: {
      score: agencyScore,
      weight: weights.agencyMatch,
      contribution: contributions.agencyMatch,
      details: generateAgencyMatchDetails(agencyScore)
    }
  }
  
  return {
    score: totalScore,
    breakdown,
    explanation: generateComprehensiveExplanation(totalScore, breakdown)
  }
}

// Main function that handles both old and new API
export function calculateMatchScore(profile: any, opportunity: any): MatchScoreResult {
  try {
    // Normalize to common interface
    const profileEntity = normalizeProfile(profile)
    const opportunityEntity = normalizeOpportunity(opportunity)
    
    // Use comprehensive scoring
    return calculateComprehensiveMatchScore(profileEntity, opportunityEntity)
  } catch (error) {
    console.error('Error in comprehensive match scoring, falling back to legacy:', error)
    
    // Fallback to simplified legacy scoring for backward compatibility
    return calculateLegacyMatchScore(profile, opportunity)
  }
}

// Legacy scoring function for backward compatibility
function calculateLegacyMatchScore(profile: any, opportunity: any): MatchScoreResult {
  // Factor weights - updated to include government level preferences
  const weights = {
    naics: 30, // Reduced to make room for government level
    geographic: 25, // Same importance for location matching  
    certification: 20, // Reduced slightly
    pastPerformance: 15, // Same importance
    governmentLevel: 10 // New factor for government level preferences
  }
  
  // Prepare profile NAICS array - handle both old and new structures
  let profileNaics: string[] = []
  if (profile.primaryNaics) {
    profileNaics.push(profile.primaryNaics)
  }
  if (profile.secondaryNaics && Array.isArray(profile.secondaryNaics)) {
    profileNaics.push(...profile.secondaryNaics)
  }
  // Handle new naicsCodes field if present
  if (profile.naicsCodes && Array.isArray(profile.naicsCodes)) {
    profileNaics.push(...profile.naicsCodes)
  }
  profileNaics = profileNaics.filter(Boolean) as string[]
  
  // Prepare opportunity NAICS array
  const opportunityNaics = opportunity.naicsCodes || []
  
  // Calculate individual factor scores with updated functions
  const naicsScore = calculateNaicsScore(profileNaics, opportunityNaics)
  const geographicScore = calculateGeographicScore(profile, opportunity.state || opportunity.performanceLocation || opportunity.location || '')
  const certificationScore = calculateCertificationScore(profile.certifications)
  const pastPerformanceScore = calculatePastPerformanceScore(profile)
  const governmentLevelScore = calculateGovernmentLevelScore(profile.governmentLevels || [], opportunity.agency || '')
  
  // Calculate weighted contributions
  const naicsContribution = (naicsScore * weights.naics) / 100
  const geographicContribution = (geographicScore * weights.geographic) / 100
  const certificationContribution = (certificationScore * weights.certification) / 100
  const pastPerformanceContribution = (pastPerformanceScore * weights.pastPerformance) / 100
  const governmentLevelContribution = (governmentLevelScore * weights.governmentLevel) / 100
  
  // Total score
  const totalScore = Math.round(
    naicsContribution + geographicContribution + certificationContribution + pastPerformanceContribution + governmentLevelContribution
  )
  
  // Build breakdown
  const breakdown: MatchScoreBreakdown = {
    naicsAlignment: {
      score: naicsScore,
      weight: weights.naics,
      contribution: naicsContribution,
      details: naicsScore === 100 
        ? 'Exact NAICS code match found'
        : naicsScore >= 80 
        ? 'Industry group alignment detected'
        : naicsScore >= 60
        ? 'Sector alignment detected'
        : 'Limited NAICS alignment'
    },
    geographicProximity: {
      score: geographicScore,
      weight: weights.geographic,
      contribution: geographicContribution,
      details: geographicScore >= 95
        ? 'Remote work capability or perfect location match'
        : geographicScore === 100
        ? 'Preferred geographic location'
        : geographicScore >= 80
        ? 'Acceptable geographic location'
        : geographicScore >= 50
        ? 'Different location - travel required'
        : 'Location not preferred - significant travel required'
    },
    certificationMatch: {
      score: certificationScore,
      weight: weights.certification,
      contribution: certificationContribution,
      details: certificationScore >= 90
        ? 'Excellent certification portfolio with active credentials'
        : certificationScore >= 75
        ? 'Strong certification portfolio'
        : certificationScore >= 60
        ? 'Good certification coverage'
        : 'Limited certifications - may limit eligibility'
    },
    pastPerformance: {
      score: pastPerformanceScore,
      weight: weights.pastPerformance,
      contribution: pastPerformanceContribution,
      details: pastPerformanceScore >= 80
        ? 'Comprehensive past performance with multiple projects documented'
        : pastPerformanceScore >= 65
        ? 'Good past performance documentation'
        : pastPerformanceScore >= 50
        ? 'Basic past performance information'
        : 'Limited past performance data'
    },
    governmentLevel: {
      score: governmentLevelScore,
      weight: weights.governmentLevel,
      contribution: governmentLevelContribution,
      details: governmentLevelScore === 100
        ? 'Matches your preferred government level'
        : governmentLevelScore >= 75
        ? 'No government level preferences specified'
        : 'Different from your preferred government levels'
    }
  }
  
  // Generate explanation
  const explanation = generateExplanation(totalScore)
  
  return {
    score: totalScore,
    breakdown,
    explanation
  }
}

function generateExplanation(score: number): string {
  if (score >= 90) {
    return 'Excellent match! Strong alignment across all factors makes this a high-priority opportunity.'
  } else if (score >= 70) {
    return 'Good match with solid alignment. Consider this opportunity for pursuit.'
  } else if (score >= 50) {
    return 'Moderate match. Review the breakdown to understand gaps and potential.'
  } else {
    return 'Lower match score. Significant gaps exist - consider if pursuit is strategic.'
  }
}

// Performance optimization: Batch scoring for multiple opportunities
export function calculateBatchMatchScores(
  profile: Profile, 
  opportunities: Opportunity[]
): Map<string, MatchScoreResult> {
  const results = new Map<string, MatchScoreResult>()
  
  for (const opportunity of opportunities) {
    if (opportunity.id) {
      results.set(opportunity.id, calculateMatchScore(profile, opportunity))
    }
  }
  
  return results
}