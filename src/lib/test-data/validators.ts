/**
 * Test Data Validators
 * 
 * Validation functions to ensure test data consistency and type safety.
 * These validators help catch issues early when using mock data.
 */

import type { 
  Organization, 
  User, 
  Profile, 
  Opportunity,
  MatchScore,
} from '../../types';

/**
 * Validate that an object conforms to Organization type
 */
export function validateOrganization(org: any): org is Organization {
  return (
    typeof org === 'object' &&
    typeof org.id === 'string' &&
    typeof org.name === 'string' &&
    typeof org.slug === 'string' &&
    typeof org.domain === 'string' &&
    org.createdAt instanceof Date &&
    org.updatedAt instanceof Date &&
    typeof org.ownerId === 'string'
  );
}

/**
 * Validate that an object conforms to User type
 */
export function validateUser(user: any): user is User {
  return (
    typeof user === 'object' &&
    typeof user.id === 'string' &&
    typeof user.clerkId === 'string' &&
    typeof user.email === 'string' &&
    typeof user.firstName === 'string' &&
    typeof user.lastName === 'string' &&
    typeof user.organizationId === 'string' &&
    ['OWNER', 'ADMIN', 'MEMBER', 'VIEWER'].includes(user.role) &&
    user.createdAt instanceof Date &&
    user.updatedAt instanceof Date
  );
}

/**
 * Validate that an object conforms to Profile type
 */
export function validateProfile(profile: any): profile is Profile {
  if (typeof profile !== 'object') return false;
  
  // Basic required fields
  const hasBasicFields = (
    typeof profile.id === 'string' &&
    typeof profile.userId === 'string' &&
    typeof profile.organizationId === 'string' &&
    typeof profile.companyName === 'string'
  );
  
  // Business address validation
  const hasValidAddress = (
    profile.businessAddress &&
    typeof profile.businessAddress === 'object' &&
    typeof profile.businessAddress.street === 'string' &&
    typeof profile.businessAddress.city === 'string' &&
    typeof profile.businessAddress.state === 'string' &&
    typeof profile.businessAddress.zipCode === 'string'
  );
  
  // NAICS validation
  const hasValidNaics = (
    profile.primaryNaics &&
    typeof profile.primaryNaics === 'object' &&
    typeof profile.primaryNaics.code === 'string' &&
    typeof profile.primaryNaics.title === 'string'
  );
  
  return hasBasicFields && hasValidAddress && hasValidNaics;
}

/**
 * Validate that an object conforms to Opportunity type
 */
export function validateOpportunity(opp: any): opp is Opportunity {
  if (typeof opp !== 'object') return false;
  
  // Basic required fields
  const hasBasicFields = (
    typeof opp.id === 'string' &&
    typeof opp.solicitation === 'string' &&
    typeof opp.title === 'string' &&
    typeof opp.agency === 'string' &&
    typeof opp.type === 'string' &&
    Array.isArray(opp.naicsCodes) &&
    opp.postedDate instanceof Date &&
    opp.dueDate instanceof Date
  );
  
  // Location validation
  const hasValidLocation = (
    opp.location &&
    typeof opp.location === 'object' &&
    typeof opp.location.state === 'string' &&
    typeof opp.location.city === 'string'
  );
  
  // Value validation
  const hasValidValue = (
    opp.estimatedValue &&
    typeof opp.estimatedValue === 'object' &&
    typeof opp.estimatedValue.min === 'number' &&
    typeof opp.estimatedValue.max === 'number' &&
    opp.estimatedValue.min <= opp.estimatedValue.max
  );
  
  return hasBasicFields && hasValidLocation && hasValidValue;
}

/**
 * Validate that an object conforms to MatchScore type
 */
export function validateMatchScore(score: any): score is MatchScore {
  if (typeof score !== 'object') return false;
  
  // Basic required fields
  const hasBasicFields = (
    typeof score.id === 'string' &&
    typeof score.userId === 'string' &&
    typeof score.opportunityId === 'string' &&
    typeof score.overallScore === 'number' &&
    score.overallScore >= 0 &&
    score.overallScore <= 100
  );
  
  // Factors validation
  const hasValidFactors = (
    score.factors &&
    typeof score.factors === 'object' &&
    score.factors.naicsAlignment &&
    score.factors.geographicProximity &&
    score.factors.certificationMatch &&
    score.factors.pastPerformance
  );
  
  // Validate each factor
  const factorsValid = hasValidFactors && Object.values(score.factors).every((factor: any) => (
    typeof factor.score === 'number' &&
    typeof factor.weight === 'number' &&
    typeof factor.contribution === 'number' &&
    typeof factor.details === 'string' &&
    factor.score >= 0 && factor.score <= 100 &&
    factor.weight >= 0 && factor.weight <= 100
  ));
  
  return hasBasicFields && factorsValid;
}

/**
 * Validate relationships between entities
 */
export function validateRelationships(data: {
  organizations?: Organization[];
  users?: User[];
  profiles?: Profile[];
  opportunities?: Opportunity[];
  matchScores?: MatchScore[];
}): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Build lookup maps
  const orgIds = new Set(data.organizations?.map(o => o.id) || []);
  const userIds = new Set(data.users?.map(u => u.id) || []);
  const profileIds = new Set(data.profiles?.map(p => p.id) || []);
  const oppIds = new Set(data.opportunities?.map(o => o.id) || []);
  
  // Validate user-organization relationships
  data.users?.forEach(user => {
    if (!orgIds.has(user.organizationId)) {
      errors.push(`User ${user.id} references non-existent organization ${user.organizationId}`);
    }
  });
  
  // Validate profile relationships
  data.profiles?.forEach(profile => {
    if (!userIds.has(profile.userId)) {
      errors.push(`Profile ${profile.id} references non-existent user ${profile.userId}`);
    }
    if (!orgIds.has(profile.organizationId)) {
      errors.push(`Profile ${profile.id} references non-existent organization ${profile.organizationId}`);
    }
  });
  
  // Validate match score relationships
  data.matchScores?.forEach(score => {
    if (!userIds.has(score.userId)) {
      errors.push(`MatchScore ${score.id} references non-existent user ${score.userId}`);
    }
    if (!oppIds.has(score.opportunityId)) {
      errors.push(`MatchScore ${score.id} references non-existent opportunity ${score.opportunityId}`);
    }
  });
  
  // Validate organization owners exist
  data.organizations?.forEach(org => {
    if (!userIds.has(org.ownerId)) {
      errors.push(`Organization ${org.id} references non-existent owner ${org.ownerId}`);
    }
  });
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate that mock data is internally consistent
 */
export function validateMockDataConsistency(data: any[]): { 
  valid: boolean; 
  duplicateIds: string[];
  invalidTypes: string[];
} {
  const idMap = new Map<string, any>();
  const duplicateIds: string[] = [];
  const invalidTypes: string[] = [];
  
  data.forEach(item => {
    if (!item || typeof item !== 'object' || !item.id) {
      invalidTypes.push(JSON.stringify(item).substring(0, 50));
      return;
    }
    
    if (idMap.has(item.id)) {
      duplicateIds.push(item.id);
    } else {
      idMap.set(item.id, item);
    }
  });
  
  return {
    valid: duplicateIds.length === 0 && invalidTypes.length === 0,
    duplicateIds: Array.from(new Set(duplicateIds)),
    invalidTypes,
  };
}

/**
 * Type guard for arrays of specific types
 */
export function isArrayOf<T>(
  arr: any[],
  validator: (item: any) => item is T
): arr is T[] {
  return Array.isArray(arr) && arr.every(validator);
}