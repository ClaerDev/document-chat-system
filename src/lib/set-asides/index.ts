import {
  SetAside,
  SetAsideCode,
  SetAsideType,
  SetAsidesCollection,
  UserSetAsideEligibility,
  SET_ASIDE_THRESHOLDS,
  AgencyCode,
} from '@/types/set-asides'
import setAsidesData from '@/data/government/set-asides/set-asides.json'

// Type assertion for the imported JSON
const setAsidesCollection = setAsidesData as SetAsidesCollection

/**
 * Get all set-asides
 */
export function getAllSetAsides(): SetAside[] {
  return setAsidesCollection.setAsides
}

/**
 * Get a specific set-aside by code
 */
export function getSetAsideByCode(code: SetAsideCode): SetAside | undefined {
  return setAsidesCollection.setAsides.find((sa) => sa.code === code)
}

/**
 * Get set-asides by type (competitive, sole_source, partial)
 */
export function getSetAsidesByType(type: SetAsideType): SetAside[] {
  return setAsidesCollection.setAsides.filter((sa) => sa.type === type)
}

/**
 * Get agency-specific set-asides
 */
export function getAgencySpecificSetAsides(agency: AgencyCode): SetAside[] {
  return setAsidesCollection.setAsides.filter(
    (sa) => sa.agencySpecific === agency
  )
}

/**
 * Get general (non-agency-specific) set-asides
 */
export function getGeneralSetAsides(): SetAside[] {
  return setAsidesCollection.setAsides.filter((sa) => !sa.agencySpecific)
}

/**
 * Determine eligible set-asides based on user's certifications
 */
export function getEligibleSetAsides(userCertifications: string[]): SetAside[] {
  const eligibleSetAsides: SetAside[] = []

  // Check each set-aside to see if user's certifications make them eligible
  setAsidesCollection.setAsides.forEach((setAside) => {
    // Check if user has any of the required certifications for this set-aside
    const hasRequiredCerts = setAside.relatedCertifications.some(
      (requiredCert) => userCertifications.includes(requiredCert)
    )

    // Special case: always include small business set-asides if user has 'sb' certification
    const isSmallBusinessSetAside = ['SBA', 'SBP'].includes(setAside.code)
    const hasSmallBusinessCert = userCertifications.includes('sb')

    if (hasRequiredCerts || (isSmallBusinessSetAside && hasSmallBusinessCert)) {
      eligibleSetAsides.push(setAside)
    }
  })

  // Return set-asides sorted by priority
  return eligibleSetAsides.sort((a, b) => a.priority - b.priority)
}

/**
 * Check if user is eligible for a specific set-aside
 */
export function checkSetAsideEligibility(
  setAsideCode: SetAsideCode,
  userCertifications: string[]
): boolean {
  const eligibleSetAsides = getEligibleSetAsides(userCertifications)
  return eligibleSetAsides.some((sa) => sa.code === setAsideCode)
}

/**
 * Get sole source threshold for a set-aside
 */
export function getSoleSourceThreshold(
  code: SetAsideCode,
  isManufacturing: boolean = false
): number | null {
  const setAside = getSetAsideByCode(code)
  if (!setAside || setAside.type !== 'sole_source') {
    return null
  }

  // Special case for VA VOSB
  if (code === 'VSS') {
    return SET_ASIDE_THRESHOLDS.VA_VOSB_SOLE_SOURCE
  }

  // Standard thresholds
  return isManufacturing
    ? SET_ASIDE_THRESHOLDS.SOLE_SOURCE_MANUFACTURING
    : SET_ASIDE_THRESHOLDS.SOLE_SOURCE_OTHER
}

/**
 * Generate user eligibility records based on certifications
 */
export function generateUserSetAsideEligibility(
  userCertifications: string[],
  certificationDates: Record<string, string>
): UserSetAsideEligibility[] {
  const eligibleSetAsides = getEligibleSetAsides(userCertifications)

  return eligibleSetAsides.map((setAside) => {
    // Find which certifications qualify for this set-aside
    const qualifyingCerts = userCertifications.filter((cert) => {
      const eligibleCodes = CERTIFICATION_TO_SET_ASIDES[cert]
      return eligibleCodes?.includes(setAside.code)
    })

    // Use the earliest certification date
    const eligibilityDate =
      qualifyingCerts
        .map((cert) => certificationDates[cert])
        .filter((date) => date)
        .sort()[0] || new Date().toISOString()

    return {
      setAsideCode: setAside.code,
      eligibilityDate,
      certificationIds: qualifyingCerts,
      autoDetected: true,
      notes: `Auto-detected based on ${qualifyingCerts.join(', ')} certification(s)`,
    }
  })
}

/**
 * Format set-aside for display
 */
export function formatSetAsideDisplay(code: SetAsideCode): string {
  const setAside = getSetAsideByCode(code)
  if (!setAside) return code

  return `${setAside.name} (${code})`
}

/**
 * Get set-aside description for tooltips/help text
 */
export function getSetAsideDescription(code: SetAsideCode): string {
  const setAside = getSetAsideByCode(code)
  return setAside?.description || ''
}

/**
 * Check if opportunity matches user's set-aside eligibility
 */
export function matchOpportunitySetAside(
  opportunitySetAsideCode: string,
  userEligibleSetAsides: SetAsideCode[]
): {
  isMatch: boolean
  matchType: 'exact' | 'partial' | 'none'
  score: number
} {
  // Direct match
  if (userEligibleSetAsides.includes(opportunitySetAsideCode as SetAsideCode)) {
    return { isMatch: true, matchType: 'exact', score: 100 }
  }

  // Check if user has higher-level eligibility (e.g., 8(a) can compete for small business)
  const opportunitySetAside = getSetAsideByCode(
    opportunitySetAsideCode as SetAsideCode
  )
  if (!opportunitySetAside) {
    return { isMatch: false, matchType: 'none', score: 0 }
  }

  // Special cases for hierarchical eligibility
  if (opportunitySetAsideCode === 'SBA' || opportunitySetAsideCode === 'SBP') {
    // Any small business certification qualifies
    const hasSmallBusiness = userEligibleSetAsides.some((code) =>
      [
        '8A',
        '8AN',
        'HZC',
        'HZS',
        'SDVOSBC',
        'SDVOSBS',
        'WOSB',
        'WOSBSS',
        'EDWOSB',
        'EDWOSBSS',
      ].includes(code)
    )
    if (hasSmallBusiness) {
      return { isMatch: true, matchType: 'partial', score: 75 }
    }
  }

  return { isMatch: false, matchType: 'none', score: 0 }
}

/**
 * Get set-aside statistics for dashboard
 */
export function getSetAsideStats(
  opportunities: Array<{ setAsideCode?: string }>
): {
  totalSetAsides: number
  byType: Record<string, number>
  topSetAsides: Array<{ code: SetAsideCode; count: number; percentage: number }>
} {
  const setAsideCounts: Record<string, number> = {}
  let totalWithSetAside = 0

  opportunities.forEach((opp) => {
    if (opp.setAsideCode) {
      setAsideCounts[opp.setAsideCode] =
        (setAsideCounts[opp.setAsideCode] || 0) + 1
      totalWithSetAside++
    }
  })

  const topSetAsides = Object.entries(setAsideCounts)
    .map(([code, count]) => ({
      code: code as SetAsideCode,
      count,
      percentage: (count / totalWithSetAside) * 100,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  return {
    totalSetAsides: totalWithSetAside,
    byType: setAsideCounts,
    topSetAsides,
  }
}

// Export the collection for direct access if needed
export { setAsidesCollection }
