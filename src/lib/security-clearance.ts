/**
 * Global Security Clearance constants and enums
 * Reusable throughout the application
 */

export enum SecurityClearanceLevel {
  NONE = 'None',
  PUBLIC_TRUST = 'Public Trust',
  SECRET = 'Secret',
  TOP_SECRET = 'Top Secret',
  TS_SCI = 'TS/SCI',
  NOT_REQUIRED = 'Not Required',
  // DOE Clearances
  Q_CLEARANCE = 'Q Clearance',
  L_CLEARANCE = 'L Clearance'
}

export const SECURITY_CLEARANCE_LEVELS = [
  SecurityClearanceLevel.NONE,
  SecurityClearanceLevel.PUBLIC_TRUST,
  SecurityClearanceLevel.SECRET,
  SecurityClearanceLevel.TOP_SECRET,
  SecurityClearanceLevel.TS_SCI,
  SecurityClearanceLevel.NOT_REQUIRED,
  SecurityClearanceLevel.Q_CLEARANCE,
  SecurityClearanceLevel.L_CLEARANCE
] as const

export interface SecurityClearanceInfo {
  level: SecurityClearanceLevel
  description: string
  requirements: string[]
  commonAgencies: string[]
}

export const SECURITY_CLEARANCE_INFO: Record<SecurityClearanceLevel, SecurityClearanceInfo> = {
  [SecurityClearanceLevel.NONE]: {
    level: SecurityClearanceLevel.NONE,
    description: 'No security clearance required',
    requirements: ['Standard background check', 'Employment verification'],
    commonAgencies: ['Most civilian agencies', 'State and local governments']
  },
  [SecurityClearanceLevel.PUBLIC_TRUST]: {
    level: SecurityClearanceLevel.PUBLIC_TRUST,
    description: 'Position of public trust - basic government clearance',
    requirements: ['Background investigation', 'Financial review', 'Reference checks'],
    commonAgencies: ['DHS', 'GSA', 'Treasury', 'HHS', 'Education']
  },
  [SecurityClearanceLevel.SECRET]: {
    level: SecurityClearanceLevel.SECRET,
    description: 'Secret clearance - access to classified information',
    requirements: ['Comprehensive background investigation', 'Financial review', 'Personal interview', 'Reference interviews'],
    commonAgencies: ['DoD', 'State', 'Energy', 'DHS', 'FBI']
  },
  [SecurityClearanceLevel.TOP_SECRET]: {
    level: SecurityClearanceLevel.TOP_SECRET,
    description: 'Top Secret clearance - access to highly classified information',
    requirements: ['Extensive background investigation', 'Polygraph (may be required)', 'Financial deep dive', 'Comprehensive interviews'],
    commonAgencies: ['DoD', 'CIA', 'NSA', 'State', 'Energy']
  },
  [SecurityClearanceLevel.TS_SCI]: {
    level: SecurityClearanceLevel.TS_SCI,
    description: 'Top Secret with Sensitive Compartmented Information - highest level clearance',
    requirements: ['Full-scope polygraph', 'Extensive lifestyle investigation', 'Ongoing monitoring', 'Specialized compartment approval'],
    commonAgencies: ['Intelligence Community', 'NSA', 'CIA', 'DoD Special Programs']
  },
  [SecurityClearanceLevel.NOT_REQUIRED]: {
    level: SecurityClearanceLevel.NOT_REQUIRED,
    description: 'Security clearance is not applicable for this position',
    requirements: ['Standard employment verification'],
    commonAgencies: ['Commercial contracts', 'Public-facing services']
  },
  [SecurityClearanceLevel.Q_CLEARANCE]: {
    level: SecurityClearanceLevel.Q_CLEARANCE,
    description: 'Department of Energy Q clearance - access to nuclear information',
    requirements: ['Extensive background investigation', 'Psychological evaluation', 'Financial deep dive', 'Polygraph'],
    commonAgencies: ['Department of Energy', 'Nuclear facilities', 'National labs']
  },
  [SecurityClearanceLevel.L_CLEARANCE]: {
    level: SecurityClearanceLevel.L_CLEARANCE,
    description: 'Department of Energy L clearance - limited access to nuclear information',
    requirements: ['Standard background investigation', 'Financial review', 'Reference checks'],
    commonAgencies: ['Department of Energy', 'Nuclear contractors', 'National labs']
  }
}

/**
 * Check if a clearance level is valid
 */
export function isValidSecurityClearance(level: string): level is SecurityClearanceLevel {
  return Object.values(SecurityClearanceLevel).includes(level as SecurityClearanceLevel)
}

/**
 * Get clearance level from string (case-insensitive)
 */
export function parseSecurityClearance(level: string): SecurityClearanceLevel | null {
  const normalized = level.trim()
  
  // Direct match
  for (const clearanceLevel of Object.values(SecurityClearanceLevel)) {
    if (clearanceLevel.toLowerCase() === normalized.toLowerCase()) {
      return clearanceLevel
    }
  }
  
  // Common variations
  const variations: Record<string, SecurityClearanceLevel> = {
    'public trust': SecurityClearanceLevel.PUBLIC_TRUST,
    'confidential': SecurityClearanceLevel.SECRET, // Often grouped with Secret
    'top secret/sci': SecurityClearanceLevel.TS_SCI,
    'ts/sci': SecurityClearanceLevel.TS_SCI,
    'top secret - sci': SecurityClearanceLevel.TS_SCI,
    'secret clearance': SecurityClearanceLevel.SECRET,
    'top secret clearance': SecurityClearanceLevel.TOP_SECRET,
    'no clearance': SecurityClearanceLevel.NONE,
    'none required': SecurityClearanceLevel.NOT_REQUIRED,
    'not applicable': SecurityClearanceLevel.NOT_REQUIRED,
    'n/a': SecurityClearanceLevel.NOT_REQUIRED
  }
  
  return variations[normalized.toLowerCase()] || null
}

/**
 * Format clearance level for display
 */
export function formatSecurityClearance(level: SecurityClearanceLevel): string {
  return level
}

/**
 * Get clearance hierarchy (higher number = higher clearance)
 */
export function getSecurityClearanceRank(level: SecurityClearanceLevel): number {
  const rankings: Record<SecurityClearanceLevel, number> = {
    [SecurityClearanceLevel.NONE]: 0,
    [SecurityClearanceLevel.NOT_REQUIRED]: 0,
    [SecurityClearanceLevel.PUBLIC_TRUST]: 1,
    [SecurityClearanceLevel.L_CLEARANCE]: 2,
    [SecurityClearanceLevel.SECRET]: 3,
    [SecurityClearanceLevel.Q_CLEARANCE]: 4,
    [SecurityClearanceLevel.TOP_SECRET]: 5,
    [SecurityClearanceLevel.TS_SCI]: 6
  }
  
  return rankings[level] ?? 0
}

/**
 * Check if contractor clearance meets or exceeds requirement
 */
export function clearanceMeetsRequirement(
  contractorClearance: SecurityClearanceLevel,
  requiredClearance: SecurityClearanceLevel
): boolean {
  // Special case: if not required, any clearance is acceptable
  if (requiredClearance === SecurityClearanceLevel.NOT_REQUIRED) {
    return true
  }
  
  // Special case: if none required, only none/not required is acceptable
  if (requiredClearance === SecurityClearanceLevel.NONE) {
    return contractorClearance === SecurityClearanceLevel.NONE || 
           contractorClearance === SecurityClearanceLevel.NOT_REQUIRED
  }
  
  return getSecurityClearanceRank(contractorClearance) >= getSecurityClearanceRank(requiredClearance)
}

/**
 * Get all security clearance options for dropdowns
 */
export function getSecurityClearanceOptions(): Array<{
  value: SecurityClearanceLevel
  label: string
  description: string
}> {
  return SECURITY_CLEARANCE_LEVELS.map(level => ({
    value: level,
    label: level,
    description: SECURITY_CLEARANCE_INFO[level].description
  }))
}