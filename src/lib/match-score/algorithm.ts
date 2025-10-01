/**
 * Match Score Algorithm Implementation
 * 
 * Core algorithm for calculating opportunity match scores based on
 * various factors like NAICS alignment, geography, certifications, etc.
 */

import type { Profile, Opportunity, MatchScore } from '@/types';
import type { GovernmentLevel, GeographicPreferences } from '@/types/profile';
import { getOpportunityMatchingWeightPercentages, getOpportunityMatchingSubFactors } from '@/lib/profile-scoring-config';

/**
 * Get dynamic weights from configuration instead of hardcoded values
 * This ensures all weight references stay in sync when configuration changes
 */
function getWeights() {
  return getOpportunityMatchingWeightPercentages();
}

/**
 * Get legacy weights for backward compatibility with existing individual factor functions
 * Maps the new 4-category structure to individual factor weights for existing functions
 */
function getLegacyWeights() {
  const categoryWeights = getOpportunityMatchingWeightPercentages();
  const subFactors = getOpportunityMatchingSubFactors();
  
  // Calculate individual factor weights by combining category and sub-factor weights
  return {
    // From Technical Capability category (35%)
    naicsAlignment: (categoryWeights.technicalCapability * subFactors.technicalCapability.naicsAlignment) / 100,
    certificationMatch: (categoryWeights.technicalCapability * subFactors.technicalCapability.certificationMatch) / 100,
    
    // From Strategic Fit category (15%) 
    geographicProximity: (categoryWeights.strategicFitRelationships * subFactors.strategicFitRelationships.geographicProximity) / 100,
    governmentLevelMatch: (categoryWeights.strategicFitRelationships * subFactors.strategicFitRelationships.governmentLevelMatch) / 100,
    geographicPreferenceMatch: (categoryWeights.strategicFitRelationships * subFactors.strategicFitRelationships.geographicPreferenceMatch) / 100,
    
    // Direct category weights
    pastPerformance: categoryWeights.pastPerformance,
    credibilityMarketPresence: categoryWeights.credibilityMarketPresence
  };
}

// Types expected by the tests
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
 * 
 * RESEARCH-BASED SCORING ALGORITHM (v4.0)
 * ========================================
 * Based on extensive government contracting research including:
 * - FAR 15.305 (Federal Acquisition Regulation evaluation factors)
 * - GAO protest decisions analysis
 * - Industry best practices from successful contractors
 * 
 * UNIFIED 4-CATEGORY EVALUATION STRUCTURE:
 * Aligned with profile completeness scoring for consistent user experience
 * 
 * 1. PAST PERFORMANCE (35% total weight) - MOST CRITICAL
 *    - Contract value alignment (40% sub-weight)
 *    - Agency experience (30% sub-weight)
 *    - Industry experience (20% sub-weight)
 *    - Recency and relevance (10% sub-weight)
 * 
 * 2. TECHNICAL CAPABILITY (35% total weight) - MOST CRITICAL
 *    - NAICS code alignment (50% sub-weight)
 *    - Certification match (25% sub-weight)
 *    - Competency alignment (15% sub-weight)
 *    - Security clearance match (10% sub-weight)
 * 
 * 3. STRATEGIC FIT & RELATIONSHIPS (15% total weight) - IMPORTANT
 *    - Geographic proximity (40% sub-weight)
 *    - Government level match (30% sub-weight)
 *    - Geographic preference match (20% sub-weight)
 *    - Business scale alignment (10% sub-weight)
 * 
 * 4. CREDIBILITY & MARKET PRESENCE (15% total weight) - FOUNDATION
 *    - Government registration (60% sub-weight)
 *    - Contact completeness (25% sub-weight)
 *    - Market presence (10% sub-weight)
 *    - Business verification (5% sub-weight)
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
    opportunity = input.opportunity;
    actualProfile = input.profile;
  }

  // Get dynamic weights from configuration
  const weights = getWeights();

  // Calculate factors with new unified 4-category structure
  const factors: MatchScoreFactors = {
    // PAST PERFORMANCE (35% total) - MOST CRITICAL per FAR 15.305
    pastPerformance: calculatePastPerformanceCategory(actualProfile, opportunity, weights.pastPerformance),
    
    // TECHNICAL CAPABILITY (35% total) - EQUALLY CRITICAL
    technicalCapability: calculateTechnicalCapabilityCategory(actualProfile, opportunity, weights.technicalCapability),
    
    // STRATEGIC FIT & RELATIONSHIPS (15% total) - IMPORTANT 
    strategicFitRelationships: calculateStrategicFitCategory(actualProfile, opportunity, weights.strategicFitRelationships),
    
    // CREDIBILITY & MARKET PRESENCE (15% total) - FOUNDATION
    credibilityMarketPresence: calculateCredibilityCategory(actualProfile, opportunity, weights.credibilityMarketPresence),
  };

  // Calculate weighted overall score
  const overallScore = Object.values(factors).reduce(
    (total, factor) => total + factor.contribution,
    0
  );

  // Calculate confidence using credibility as multiplier
  const confidence = calculateConfidenceScore(overallScore, factors.credibilityMarketPresence);

  // Generate recommendations
  const recommendations = generateRecommendations(factors, opportunity);

  // Handle different profile types
  const profileId = (actualProfile as any).id || 'unknown';
  const userId = (actualProfile as any).createdById || (actualProfile as any).userId || 'unknown';
  
  return {
    id: `match_${opportunity.id}_${profileId}`,
    userId,
    opportunityId: opportunity.id,
    profileId,
    score: Math.round(overallScore), // Use 'score' to match MatchScore interface
    confidence: Math.round(confidence), // Confidence based on credibility multiplier
    factors: Object.entries(factors).map(([name, factor]) => ({
      name: name.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()), // Convert camelCase to Title Case
      contribution: factor.contribution,
      explanation: factor.details
    })),
    algorithmVersion: 'v3.0-research-based',
    createdAt: new Date(),
    // Keep the detailed factors for backward compatibility with modal
    detailedFactors: factors,
    recommendations,
  };
}

/**
 * Calculate confidence score using credibility as multiplier
 * 
 * Higher credibility scores increase confidence, lower scores decrease it
 * 
 * @param overallScore - The calculated match score
 * @param credibilityFactor - The credibility & market presence factor
 * @returns confidence score (0-100)
 */
function calculateConfidenceScore(
  overallScore: number, 
  credibilityFactor: MatchScoreFactor
): number {
  const credibilityScore = credibilityFactor.score;
  
  // Base confidence is the overall score
  let confidence = overallScore;
  
  // Apply credibility multiplier
  // High credibility (80+): +10% confidence boost
  // Good credibility (60-79): no change
  // Low credibility (40-59): -10% confidence penalty  
  // Very low credibility (<40): -20% confidence penalty
  
  if (credibilityScore >= 80) {
    confidence = confidence * 1.1; // 10% boost
  } else if (credibilityScore >= 60) {
    // No change
  } else if (credibilityScore >= 40) {
    confidence = confidence * 0.9; // 10% penalty
  } else {
    confidence = confidence * 0.8; // 20% penalty
  }
  
  // Ensure confidence stays within bounds
  return Math.max(0, Math.min(100, confidence));
}

/**
 * Calculate NAICS code alignment score
 * Part of TECHNICAL CAPABILITY category
 * This factor weight is configured dynamically
 */
export function calculateNAICSAlignment(
  profile: Profile | MatchScoreInput,
  opportunity: Opportunity
): MatchScoreFactor {
  const weight = getLegacyWeights().naicsAlignment; // Dynamic weight from configuration
  
  // Handle both Profile and MatchScoreInput types
  if (!profile) {
    return {
      score: 0,
      weight,
      contribution: 0,
      details: 'No profile provided',
    };
  }
  
  const primaryNaics = profile && 'primaryNaics' in profile && profile.primaryNaics 
    ? profile.primaryNaics.code 
    : (profile as Profile).primaryNaics;
  const secondaryNaics = profile && 'secondaryNaics' in profile && profile.secondaryNaics
    ? profile.secondaryNaics.map(n => n.code)
    : (profile as Profile).secondaryNaics;
  
  if (!primaryNaics || !opportunity.naicsCodes?.length) {
    return {
      score: 0,
      weight,
      contribution: 0,
      details: 'No NAICS codes available for comparison',
    };
  }

  // Check for exact match
  const hasExactMatch = opportunity.naicsCodes.includes(primaryNaics);
  if (hasExactMatch) {
    return {
      score: 100,
      weight,
      contribution: weight,
      details: 'Exact primary NAICS match',
    };
  }

  // Check secondary NAICS codes if available
  if (secondaryNaics?.length) {
    const hasSecondaryMatch = opportunity.naicsCodes.some(code =>
      secondaryNaics.includes(code)
    );
    
    if (hasSecondaryMatch) {
      return {
        score: 80,
        weight,
        contribution: weight * 0.8,
        details: 'Secondary NAICS match',
      };
    }
  }

  // Check for industry group match (first 4 digits)
  const profileIndustryGroup = primaryNaics.substring(0, 4);
  const hasIndustryGroupMatch = opportunity.naicsCodes.some(code => 
    code.substring(0, 4) === profileIndustryGroup
  );

  if (hasIndustryGroupMatch) {
    return {
      score: 60,
      weight,
      contribution: weight * 0.6,
      details: 'Industry group match',
    };
  }

  // Check for sector-level match (first 2 digits)
  const profileSector = primaryNaics.substring(0, 2);
  const hasSectorMatch = opportunity.naicsCodes.some(code => 
    code.substring(0, 2) === profileSector
  );

  if (hasSectorMatch) {
    return {
      score: 40,
      weight,
      contribution: weight * 0.4,
      details: 'Sector match',
    };
  }

  return {
    score: 0,
    weight,
    contribution: 0,
    details: 'No NAICS alignment',
  };
}

/**
 * Calculate geographic proximity score
 * Part of STRATEGIC FIT (15% total)
 * This factor represents 5% of the total score
 */
export function calculateGeographicProximity(
  profile: Profile | MatchScoreInput,
  opportunity: Opportunity
): MatchScoreFactor {
  const weight = getLegacyWeights().geographicProximity; // Dynamic weight from configuration

  // Handle both Profile and MatchScoreInput types
  if (!profile) {
    return {
      score: 50,
      weight,
      contribution: weight * 0.5,
      details: 'No profile provided',
    };
  }
  
  const profileState = profile && 'businessAddress' in profile && profile.businessAddress
    ? profile.businessAddress.state
    : (profile as Profile).state;
  const profileCity = profile && 'businessAddress' in profile && profile.businessAddress
    ? profile.businessAddress.city
    : (profile as Profile).city;

  // Get opportunity location data - handle both object and string formats
  const opportunityState = typeof opportunity.location === 'object' && opportunity.location?.state 
    ? opportunity.location.state 
    : opportunity.state;
  const opportunityCity = typeof opportunity.location === 'object' && opportunity.location?.city 
    ? opportunity.location.city 
    : opportunity.city;

  if (!opportunityState || !profileState) {
    return {
      score: 50,
      weight,
      contribution: weight * 0.5,
      details: 'Location information unavailable',
    };
  }

  // Same state check
  if (opportunityState === profileState) {
    // Same city check
    if (opportunityCity && profileCity && opportunityCity === profileCity) {
      return {
        score: 100,
        weight,
        contribution: weight,
        details: 'Same city and state',
      };
    }
    
    return {
      score: 75,
      weight,
      contribution: weight * 0.75,
      details: 'Same state, different city',
    };
  }

  return {
    score: 25,
    weight,
    contribution: weight * 0.25,
    details: 'Different state',
  };
}

/**
 * Calculate certification match score
 * Part of TECHNICAL CAPABILITY (35% total)
 * This factor represents 15% of the total score
 * Evaluates set-asides, security clearances, and required certifications
 */
export function calculateCertificationMatch(
  profile: Profile | MatchScoreInput,
  opportunity: Opportunity
): MatchScoreFactor {
  const weight = getLegacyWeights().certificationMatch; // Dynamic weight from configuration

  // Handle both Profile and MatchScoreInput types
  if (!profile) {
    return {
      score: 50,
      weight,
      contribution: weight * 0.5,
      details: 'No profile provided',
    };
  }
  
  const certifications = profile && 'certifications' in profile
    ? profile.certifications
    : (profile as Profile).certifications;

  // Get required certifications from opportunity
  const requiredCerts = (opportunity as any).requiredCertifications || [];
  
  // If no certifications required
  if (!opportunity.setAsideType && !opportunity.securityClearance && requiredCerts.length === 0) {
    return {
      score: 100,
      weight,
      contribution: weight,
      details: 'No specific certifications required',
    };
  }

  let score = 0; // Base score
  let details = 'Required certifications not held';

  // Handle new ProfileCertifications structure
  if (certifications && typeof certifications === 'object' && !Array.isArray(certifications)) {
    const profileCerts = certifications as any; // ProfileCertifications type
    
    // Check specific required certifications
    if (requiredCerts.length > 0) {
      if (profileCerts.certifications?.length) {
        const activeCerts = profileCerts.certifications.filter((cert: any) => 
          cert.status === 'ACTIVE' || cert.status === 'Valid' || !cert.status
        );
        const matchingCerts = activeCerts.filter((cert: any) => 
          requiredCerts.includes(cert.type) || requiredCerts.includes(cert.certificationType)
        );

        if (matchingCerts.length === requiredCerts.length) {
          score = 100;
          details = 'All required certifications present';
        } else if (matchingCerts.length > 0) {
          score = Math.round((matchingCerts.length / requiredCerts.length) * 100);
          details = `${matchingCerts.length} of ${requiredCerts.length} required certifications`;
        } else {
          score = 0;
          details = `0 of ${requiredCerts.length} required certifications`;
        }
      } else {
        score = 0;
        details = `0 of ${requiredCerts.length} required certifications`;
      }
    }
    // Check set-aside requirements using opportunity.setAsideType
    else if (opportunity.setAsideType) {
      // Load comprehensive certification database
      let certificationDatabase: any = null;
      try {
        certificationDatabase = require('@/data/government/certifications/certifications.json');
      } catch (error) {
        // Fallback to basic matching if database unavailable
        console.warn('Certification database not available, using basic matching');
      }

      // Check both certifications and set-asides arrays with comprehensive database
      const hasCertification = profileCerts.certifications?.some((cert: any) => {
        const userCertId = (cert.id || cert.certificationId || cert.type || cert.certificationType || '').toLowerCase();
        const userCertName = (cert.name || cert.certificationName || '').toLowerCase();
        const userTags = cert.tags || [];
        
        // Match against comprehensive database if available
        if (certificationDatabase?.certificationCategories) {
          for (const category of certificationDatabase.certificationCategories) {
            for (const dbCert of category.certifications || []) {
              // Direct ID match
              if (userCertId === dbCert.id) {
                return isRelevantForSetAside(dbCert, opportunity.setAsideType, certificationDatabase);
              }
              
              // Name match
              if (userCertName && (userCertName === dbCert.name.toLowerCase() || 
                                  userCertName.includes(dbCert.name.toLowerCase()) ||
                                  dbCert.name.toLowerCase().includes(userCertName))) {
                return isRelevantForSetAside(dbCert, opportunity.setAsideType, certificationDatabase);
              }

              // Tag matching
              if (userTags.length > 0 && dbCert.tags) {
                const matchingTags = userTags.some((tag: string) => 
                  dbCert.tags.includes(tag.toLowerCase())
                );
                if (matchingTags) {
                  return isRelevantForSetAside(dbCert, opportunity.setAsideType, certificationDatabase);
                }
              }
            }
          }
        }

        // Fallback to basic string matching
        const certType = (cert.type || cert.certificationType || cert.name || '').toUpperCase();
        return basicSetAsideMatch(certType, opportunity.setAsideType);
      });

      const hasSetAside = profileCerts.setAsides?.some((setAside: string) => {
        return setAsideMatch(setAside, opportunity.setAsideType);
      });

      // Calculate detailed score based on match quality
      if (hasCertification && hasSetAside) {
        score = 100;
        details = 'Perfect match - both certification and set-aside eligibility confirmed';
      } else if (hasCertification) {
        score = 95;
        details = 'Required certification held';
      } else if (hasSetAside) {
        score = 90;
        details = 'Eligible for set-aside type';
      } else {
        // Check for related certifications that might be beneficial
        const hasRelatedCert = profileCerts.certifications?.some((cert: any) => {
          return isRelatedCertification(cert, opportunity.setAsideType);
        });

        if (hasRelatedCert) {
          score = 40;
          details = 'Related certifications present - may provide competitive advantage';
        } else if (profileCerts.certifications?.length > 0 || profileCerts.setAsides?.length > 0) {
          score = 20;
          details = 'Other certifications present but not required type';
        } else {
          score = 0;
          details = 'Required certifications not held';
        }
      }
    }

    return {
      score,
      weight,
      contribution: weight * (score / 100),
      details,
    };
  }

  // Handle legacy array format (for backward compatibility)
  if (Array.isArray(certifications)) {
    // Check specific required certifications
    if (requiredCerts.length > 0) {
      if (certifications.length > 0) {
        const activeCerts = certifications.filter((cert: any) => cert.status === 'ACTIVE');
        const matchingCerts = activeCerts.filter((cert: any) => 
          requiredCerts.includes(cert.type)
        );

        if (matchingCerts.length === requiredCerts.length) {
          score = 100;
          details = 'All required certifications present';
        } else if (matchingCerts.length > 0) {
          score = Math.round((matchingCerts.length / requiredCerts.length) * 100);
          details = `${matchingCerts.length} of ${requiredCerts.length} required certifications`;
        } else {
          score = 0;
          details = `0 of ${requiredCerts.length} required certifications`;
        }
      } else {
        score = 0;
        details = `0 of ${requiredCerts.length} required certifications`;
      }
    }
    // Check set-aside requirements
    else if (opportunity.setAsideType) {
      if (certifications.length > 0) {
        const activeCerts = certifications.filter((cert: any) => cert.status === 'ACTIVE');
        const hasMatchingCert = activeCerts.some((cert: any) => {
          switch (opportunity.setAsideType) {
            case 'SMALL_BUSINESS':
              return cert.type === 'SBA_8A' || cert.type === 'SMALL_BUSINESS';
            case 'WOMAN_OWNED':
              return cert.type === 'WOMAN_OWNED';
            case 'VETERAN_OWNED':
              return cert.type === 'VETERAN_OWNED';
            case 'HUBZONE':
              return cert.type === 'HUBZONE';
            default:
              return false;
          }
        });

        if (hasMatchingCert) {
          score = 100;
          details = 'All required certifications present';
        } else if (activeCerts.length > 0) {
          score = 60;
          details = 'Some certifications present';
        } else {
          score = 0;
          details = 'Required certifications not held';
        }
      } else {
        score = 0;
        details = 'Required certifications not held';
      }
    }

    return {
      score,
      weight,
      contribution: weight * (score / 100),
      details,
    };
  }

  // No certifications data
  return {
    score: 0,
    weight,
    contribution: 0,
    details: 'No certification information available',
  };
}

/**
 * Calculate past performance score
 * MOST CRITICAL FACTOR (35% of total score)
 * Based on FAR 15.305: Past performance is the #1 evaluation factor
 * Evaluates:
 * - Recency and relevancy of past contracts
 * - Performance ratings and quality
 * - Contract size and complexity similarity
 * - Agency-specific experience
 */
export function calculatePastPerformance(
  profile: Profile | MatchScoreInput,
  opportunity: Opportunity
): MatchScoreFactor {
  const weight = getLegacyWeights().pastPerformance; // Dynamic weight from configuration - MOST CRITICAL per FAR 15.305

  // Handle both Profile and MatchScoreInput types
  if (!profile) {
    return {
      score: 50,
      weight,
      contribution: weight * 0.5,
      details: 'No profile provided',
    };
  }
  
  const pastPerformance = profile && 'pastPerformance' in profile
    ? profile.pastPerformance
    : (profile as Profile).pastPerformance;

  // Handle new ProfilePastPerformance structure
  if (pastPerformance && typeof pastPerformance === 'object' && !Array.isArray(pastPerformance)) {
    const newFormatPerf = pastPerformance as any; // ProfilePastPerformance type
    
    // Check if we have key projects (new format)
    if (newFormatPerf.keyProjects?.length) {
      const keyProjects = newFormatPerf.keyProjects;
      const currentYear = new Date().getFullYear();
      
      // Look for government projects
      const govProjects = keyProjects.filter((project: any) => 
        project.customerType === 'Federal' || 
        project.customerType === 'State' || 
        project.customerType === 'Local' ||
        (project.client && (
          project.client.toLowerCase().includes('department') ||
          project.client.toLowerCase().includes('agency') ||
          project.client.toLowerCase().includes('government')
        ))
      );

      if (govProjects.length > 0) {
        // Check for recent projects (within last 3 years)
        const recentProjects = govProjects.filter((project: any) => {
          const completedYear = project.completedYear || project.completionYear || 0;
          return completedYear >= currentYear - 3;
        });

        if (recentProjects.length > 0) {
          // Check if any projects are with the same type of agency
          const opportunityAgencyName = typeof opportunity.agency === 'string' ? opportunity.agency : opportunity.agency?.name || '';
          const agencyLower = opportunityAgencyName.toLowerCase();
          const sameAgencyType = recentProjects.some((project: any) => {
            if (project.customerType === 'Federal' && agencyLower.includes('department')) return true;
            if (project.customerType === 'State' && agencyLower.includes('state')) return true;
            if (project.customerType === 'Local' && (
              agencyLower.includes('city') ||
              agencyLower.includes('county')
            )) return true;
            return false;
          });

          if (sameAgencyType) {
            return {
              score: 90,
              weight,
              contribution: weight * 0.9,
              details: `Recent government experience with similar agency type (${govProjects.length} projects)`,
            };
          }

          return {
            score: 75,
            weight,
            contribution: weight * 0.75,
            details: `Recent government project experience (${recentProjects.length} projects)`,
          };
        }

        return {
          score: 60,
          weight,
          contribution: weight * 0.6,
          details: `Government project experience (${govProjects.length} projects)`,
        };
      }

      // Has projects but not government-focused
      return {
        score: 55,
        weight,
        contribution: weight * 0.55,
        details: `General project experience (${keyProjects.length} projects)`,
      };
    }

    // Check other indicators in new format
    if (newFormatPerf.yearsInBusiness) {
      const years = parseInt(newFormatPerf.yearsInBusiness);
      if (years >= 5) {
        return {
          score: 60,
          weight,
          contribution: weight * 0.6,
          details: `${years} years in business`,
        };
      }
    }

    if (newFormatPerf.description) {
      return {
        score: 55,
        weight,
        contribution: weight * 0.55,
        details: 'Past performance described',
      };
    }

    // Has past performance object but minimal data
    return {
      score: 50,
      weight,
      contribution: weight * 0.5,
      details: 'Limited past performance information',
    };
  }

  // Handle legacy array format (for backward compatibility)
  if (Array.isArray(pastPerformance) && pastPerformance.length > 0) {
    // Check for same agency performance with recency weighting
    const sameAgencyPerf = pastPerformance
      .filter(perf => (perf as any).agency === opportunity.agency)
      .sort((a, b) => {
        // Sort by end date if available, otherwise by value
        const aDate = (a as any).endDate ? new Date((a as any).endDate) : new Date(0);
        const bDate = (b as any).endDate ? new Date((b as any).endDate) : new Date(0);
        return bDate.getTime() - aDate.getTime();
      })[0];

    if (sameAgencyPerf) {
      const isRecent = (sameAgencyPerf as any).endDate && 
        new Date((sameAgencyPerf as any).endDate) > new Date(Date.now() - 2 * 365 * 24 * 60 * 60 * 1000);
      
      if ((sameAgencyPerf as any).performance === 'EXCELLENT') {
        const score = isRecent ? 100 : 95;
        return {
          score,
          weight,
          contribution: weight * (score / 100),
          details: 'Excellent track record with same agency',
        };
      } else {
        const score = isRecent ? 85 : 80;
        return {
          score,
          weight,
          contribution: weight * (score / 100),
          details: 'Previous experience with same agency',
        };
      }
    }

    // Different agency but good performance
    const hasExcellentPerf = pastPerformance.some(perf => 
      (perf as any).performance === 'EXCELLENT'
    );

    if (hasExcellentPerf) {
      return {
        score: 70,
        weight,
        contribution: weight * 0.7,
        details: 'Good relevant experience with different agency',
      };
    }

    return {
      score: 60,
      weight,
      contribution: weight * 0.6,
      details: 'Moderate past performance record',
    };
  }

  // No past performance data at all
  return {
    score: 50,
    weight,
    contribution: weight * 0.5,
    details: 'No documented past performance',
  };
}

/**
 * Calculate credibility and market presence score
 * Part of CREDIBILITY & MARKET PRESENCE (15% total)
 * This factor represents 15% of the total score
 * Evaluates:
 * - Contact information completeness and accessibility
 * - Basic company information and legitimacy  
 * - SAM.gov registration and government readiness
 * - Professional presentation and market presence
 */
export function calculateCredibilityMarketPresence(
  profile: Profile | MatchScoreInput,
  opportunity: Opportunity
): MatchScoreFactor {
  const weight = getLegacyWeights().credibilityMarketPresence; // Dynamic weight from configuration - credibility & market presence

  // Handle both Profile and MatchScoreInput types
  if (!profile) {
    return {
      score: 50,
      weight,
      contribution: weight * 0.5,
      details: 'No profile provided',
    };
  }

  let score = 0;
  const credibilityDetails: string[] = [];
  const maxPossibleScore = 100;

  // CONTACT INFORMATION (6% of total = 40% of category)
  const contactScore = calculateContactCompleteness(profile);
  score += contactScore * 0.4; // 40% of category weight
  if (contactScore >= 80) {
    credibilityDetails.push('Complete contact information');
  } else if (contactScore >= 60) {
    credibilityDetails.push('Adequate contact information');
  } else {
    credibilityDetails.push('Incomplete contact information');
  }

  // BASIC COMPANY INFORMATION (4% of total = 27% of category)
  const basicScore = calculateBasicInfoCompleteness(profile);
  score += basicScore * 0.27; // 27% of category weight
  if (basicScore >= 80) {
    credibilityDetails.push('Complete company information');
  } else if (basicScore >= 60) {
    credibilityDetails.push('Adequate company information');
  } else {
    credibilityDetails.push('Incomplete company information');
  }

  // SAM.GOV REGISTRATION (5% of total = 33% of category)
  const samGovScore = calculateSamGovReadiness(profile);
  score += samGovScore * 0.33; // 33% of category weight
  if (samGovScore >= 80) {
    credibilityDetails.push('SAM.gov registered and ready');
  } else if (samGovScore >= 60) {
    credibilityDetails.push('Some SAM.gov registration');
  } else {
    credibilityDetails.push('SAM.gov registration incomplete');
  }

  // Ensure score is within bounds
  score = Math.max(0, Math.min(maxPossibleScore, score));

  return {
    score: Math.round(score),
    weight,
    contribution: weight * (score / 100),
    details: credibilityDetails.length > 0 ? credibilityDetails.join(', ') : 'Basic credibility assessment',
  };
}

// Helper functions for credibility and market presence assessment

/**
 * Calculate contact information completeness
 */
function calculateContactCompleteness(profile: Profile | MatchScoreInput): number {
  let contactScore = 0;
  let maxContactFields = 6; // Primary contact, email, phone, website, logo, banner
  
  const profileData = profile as Profile;
  
  // Primary contact name
  if (profileData.primaryContactName || profileData.contactName) {
    contactScore += 1;
  }
  
  // Primary contact email
  if (profileData.primaryContactEmail || profileData.email) {
    contactScore += 1;
  }
  
  // Primary contact phone
  if (profileData.primaryContactPhone || profileData.phone) {
    contactScore += 1;
  }
  
  // Website
  if (profileData.website) {
    contactScore += 1;
  }
  
  // Logo
  if (profileData.logo || profileData.logoUrl) {
    contactScore += 1;
  }
  
  // Banner/cover image
  if (profileData.banner || profileData.bannerUrl || profileData.coverImageUrl) {
    contactScore += 1;
  }
  
  return Math.round((contactScore / maxContactFields) * 100);
}

/**
 * Calculate basic company information completeness
 */
function calculateBasicInfoCompleteness(profile: Profile | MatchScoreInput): number {
  let basicScore = 0;
  let maxBasicFields = 8; // Company name, address fields, DBA, country
  
  const profileData = profile as Profile;
  
  // Company name
  if (profileData.companyName || profileData.name) {
    basicScore += 1;
  }
  
  // Address line 1
  if (profileData.addressLine1 || profileData.address) {
    basicScore += 1;
  }
  
  // City
  if (profileData.city) {
    basicScore += 1;
  }
  
  // State
  if (profileData.state) {
    basicScore += 1;
  }
  
  // ZIP code
  if (profileData.zipCode || profileData.zip) {
    basicScore += 1;
  }
  
  // Country
  if (profileData.country) {
    basicScore += 1;
  }
  
  // DBA name
  if (profileData.dbaName) {
    basicScore += 1;
  }
  
  // Address line 2 (optional but adds completeness)
  if (profileData.addressLine2) {
    basicScore += 1;
  }
  
  return Math.round((basicScore / maxBasicFields) * 100);
}

/**
 * Calculate SAM.gov registration readiness
 */
function calculateSamGovReadiness(profile: Profile | MatchScoreInput): number {
  let samScore = 0;
  let maxSamFields = 4; // SAM.gov integration, UEI, CAGE code, DUNS
  
  const profileData = profile as Profile;
  
  // SAM.gov integration status
  if (profileData.samGovIntegration || profileData.samGovRegistered) {
    samScore += 2; // Higher weight for actual registration
  }
  
  // Check certifications for government identifiers
  const certifications = profileData.certifications;
  if (certifications) {
    // Handle new ProfileCertifications structure
    if (typeof certifications === 'object' && !Array.isArray(certifications)) {
      const profileCerts = certifications as any;
      
      // UEI (Unique Entity Identifier)
      if (profileCerts.uei || (profileCerts.certifications && profileCerts.certifications.some((cert: any) => 
          cert.type === 'UEI' || cert.certificationType === 'UEI'))) {
        samScore += 1;
      }
      
      // CAGE Code
      if (profileCerts.cageCode || (profileCerts.certifications && profileCerts.certifications.some((cert: any) => 
          cert.type === 'CAGE' || cert.certificationType === 'CAGE'))) {
        samScore += 1;
      }
      
      // DUNS (legacy but still relevant)
      if (profileCerts.duns || (profileCerts.certifications && profileCerts.certifications.some((cert: any) => 
          cert.type === 'DUNS' || cert.certificationType === 'DUNS'))) {
        samScore += 1;
      }
    }
    // Handle legacy array format
    else if (Array.isArray(certifications)) {
      const hasSamRelated = certifications.some((cert: any) => 
        cert.type === 'UEI' || cert.type === 'CAGE' || cert.type === 'DUNS' ||
        cert.type === 'SAM_GOV_REGISTRATION'
      );
      if (hasSamRelated) {
        samScore += 2;
      }
    }
  }
  
  return Math.round((samScore / maxSamFields) * 100);
}

/**
 * Calculate government level match score
 * Part of STRATEGIC FIT (15% total)
 * This factor represents 5% of the total score
 * Evaluates:
 * - Federal/State/Local experience alignment
 * - Agency-type familiarity
 * - Regulatory understanding
 */
export function calculateGovernmentLevelMatch(
  profile: Profile | MatchScoreInput,
  opportunity: Opportunity
): MatchScoreFactor {
  const weight = getLegacyWeights().governmentLevelMatch; // Dynamic weight from configuration - strategic alignment

  // Handle both Profile and MatchScoreInput types
  if (!profile) {
    return {
      score: 50,
      weight,
      contribution: weight * 0.5,
      details: 'No profile provided',
    };
  }

  const governmentLevels = (profile as Profile).governmentLevels;

  // If no government level preferences are set, give neutral score
  if (!governmentLevels || governmentLevels.length === 0) {
    return {
      score: 50,
      weight,
      contribution: weight * 0.5,
      details: 'No government level preferences specified',
    };
  }

  // Determine opportunity government level based on agency
  const opportunityLevel = determineGovernmentLevel(opportunity);

  if (governmentLevels.includes(opportunityLevel)) {
    return {
      score: 100,
      weight,
      contribution: weight,
      details: `Perfect government level match (${opportunityLevel})`,
    };
  }

  // Partial match logic - some government levels work better together
  const partialMatchScore = calculateGovernmentLevelCompatibility(governmentLevels, opportunityLevel);
  
  if (partialMatchScore > 0) {
    return {
      score: partialMatchScore,
      weight,
      contribution: weight * (partialMatchScore / 100),
      details: `Partial government level compatibility (${opportunityLevel})`,
    };
  }

  return {
    score: 25,
    weight,
    contribution: weight * 0.25,
    details: `Government level mismatch - prefers ${governmentLevels.join(', ')} but opportunity is ${opportunityLevel}`,
  };
}

/**
 * Calculate geographic preference match score
 * Part of STRATEGIC FIT (15% total)
 * This factor represents 5% of the total score
 * Evaluates:
 * - Work location preferences
 * - Travel willingness
 * - Remote work capabilities
 * - Regional presence
 */
export function calculateGeographicPreferenceMatch(
  profile: Profile | MatchScoreInput,
  opportunity: Opportunity
): MatchScoreFactor {
  const weight = getLegacyWeights().geographicPreferenceMatch; // Dynamic weight from configuration - operational preference

  // Handle both Profile and MatchScoreInput types
  if (!profile) {
    return {
      score: 50,
      weight,
      contribution: weight * 0.5,
      details: 'No profile provided',
    };
  }

  const geoPrefs = (profile as Profile).geographicPreferences;

  // If no geographic preferences are set, give neutral score
  if (!geoPrefs || !geoPrefs.preferences) {
    return {
      score: 50,
      weight,
      contribution: weight * 0.5,
      details: 'No geographic preferences specified',
    };
  }

  if (!opportunity.state || !opportunity.city) {
    return {
      score: 25,
      weight,
      contribution: weight * 0.25,
      details: 'Opportunity location information incomplete',
    };
  }

  // Check preferred locations first
  const preferredMatch = checkGeographicMatch(geoPrefs.preferences, opportunity, 'PREFERRED');
  if (preferredMatch) {
    return {
      score: 100,
      weight,
      contribution: weight,
      details: `Matches preferred geographic area (${preferredMatch})`,
    };
  }

  // Check willing locations
  const willingMatch = checkGeographicMatch(geoPrefs.preferences, opportunity, 'WILLING');
  if (willingMatch) {
    return {
      score: 75,
      weight,
      contribution: weight * 0.75,
      details: `Matches acceptable geographic area (${willingMatch})`,
    };
  }

  // Check if location should be avoided
  const avoidMatch = checkGeographicMatch(geoPrefs.preferences, opportunity, 'AVOID');
  if (avoidMatch) {
    return {
      score: 0,
      weight,
      contribution: 0,
      details: `Location marked to avoid (${avoidMatch})`,
    };
  }

  // Check work from home capability
  if (geoPrefs.workFromHome) {
    return {
      score: 60,
      weight,
      contribution: weight * 0.6,
      details: 'Can work from home - location flexible',
    };
  }

  // Default to moderate score if no specific preference
  return {
    score: 40,
    weight,
    contribution: weight * 0.4,
    details: 'No specific preference for this location',
  };
}

// Helper functions


/**
 * Determine government level based on agency
 */
function determineGovernmentLevel(opportunity: Opportunity): GovernmentLevel {
  const agencyName = typeof opportunity.agency === 'string' ? opportunity.agency : opportunity.agency?.name || '';
  const agency = agencyName.toLowerCase();

  // Federal agencies
  const federalKeywords = [
    'department of', 'dept of', 'dod', 'defense', 'gsa', 'general services',
    'homeland security', 'dhs', 'veterans affairs', 'va', 'health and human services', 
    'hhs', 'treasury', 'commerce', 'epa', 'environmental protection', 'nasa', 
    'national aeronautics', 'sba', 'small business administration', 'agriculture',
    'usda', 'education', 'federal', 'national'
  ];

  if (federalKeywords.some(keyword => agency.includes(keyword))) {
    return 'FEDERAL';
  }

  // State agencies
  const stateKeywords = ['state', 'state of'];
  if (stateKeywords.some(keyword => agency.includes(keyword))) {
    return 'STATE';
  }

  // Local agencies
  const localKeywords = ['city', 'county', 'municipal', 'town', 'village', 'district'];
  if (localKeywords.some(keyword => agency.includes(keyword))) {
    return 'LOCAL';
  }

  // Default to federal for unknown agencies
  return 'FEDERAL';
}

/**
 * Calculate compatibility between preferred levels and opportunity level
 */
function calculateGovernmentLevelCompatibility(
  preferredLevels: GovernmentLevel[],
  opportunityLevel: GovernmentLevel
): number {
  // Some government levels have natural synergies
  const compatibilityMatrix: Record<GovernmentLevel, Record<GovernmentLevel, number>> = {
    FEDERAL: { FEDERAL: 100, STATE: 60, LOCAL: 40 },
    STATE: { STATE: 100, FEDERAL: 60, LOCAL: 80 },
    LOCAL: { LOCAL: 100, STATE: 80, FEDERAL: 30 }
  };

  const maxCompatibility = Math.max(
    ...preferredLevels.map(level => compatibilityMatrix[level][opportunityLevel] || 0)
  );

  return maxCompatibility;
}

/**
 * Check if opportunity matches geographic preferences
 */
function checkGeographicMatch(
  preferences: any, // Can be new or legacy format
  opportunity: Opportunity,
  preferenceType: 'PREFERRED' | 'WILLING' | 'AVOID'
): string | null {
  if (!preferences) return null;

  // Handle new grouped structure: {country: [], state: [], county: [], city: [], zip: []}
  if (preferences.state || preferences.city || preferences.zip || preferences.country) {
    // Check state level preferences
    const statePrefs = preferences.state?.filter((pref: any) => pref.type === preferenceType) || [];
    for (const pref of statePrefs) {
      if (pref.states?.includes(opportunity.state || '') || 
          pref.locations?.includes(opportunity.state || '')) {
        return `State: ${opportunity.state}`;
      }
    }

    // Check city level preferences
    const cityPrefs = preferences.city?.filter((pref: any) => pref.type === preferenceType) || [];
    for (const pref of cityPrefs) {
      if (pref.cities?.includes(opportunity.city || '') ||
          pref.locations?.includes(opportunity.city || '')) {
        return `City: ${opportunity.city}`;
      }
    }

    // Check zip code level preferences
    if (opportunity.zipCode) {
      const zipPrefs = preferences.zip?.filter((pref: any) => pref.type === preferenceType) || [];
      for (const pref of zipPrefs) {
        if (pref.zipCodes?.includes(opportunity.zipCode) ||
            pref.locations?.includes(opportunity.zipCode)) {
          return `Zip: ${opportunity.zipCode}`;
        }
      }
    }

    return null;
  }

  // Handle legacy flat array structure
  if (Array.isArray(preferences)) {
    for (const pref of preferences) {
      if (pref.type !== preferenceType) continue;
      
      // Check state match
      if (pref.states?.includes(opportunity.state || '') ||
          pref.state === opportunity.state) {
        return `State: ${opportunity.state}`;
      }

      // Check city match
      if (pref.cities?.includes(opportunity.city || '') ||
          pref.city === opportunity.city) {
        return `City: ${opportunity.city}`;
      }

      // Check zip code match
      if (opportunity.zipCode && (
          pref.zipCodes?.includes(opportunity.zipCode) ||
          pref.zipCode === opportunity.zipCode)) {
        return `Zip: ${opportunity.zipCode}`;
      }
    }
  }

  return null;
}

/**
 * Generate recommendations based on match score factors
 */
function generateRecommendations(
  factors: MatchScoreFactors,
  opportunity: Opportunity
): string[] {
  const recommendations: string[] = [];

  // NAICS recommendations
  if (factors.naicsAlignment.score >= 80) {
    recommendations.push('Strong NAICS alignment makes this an excellent opportunity');
  } else if (factors.naicsAlignment.score < 40) {
    recommendations.push('Consider building capabilities in the required NAICS codes');
  }

  // Geographic recommendations
  if (factors.geographicProximity.score < 60) {
    recommendations.push('Consider partnering with local firms for geographic advantage');
  }

  // Certification recommendations
  if (factors.certificationMatch.score < 50 && opportunity.setAside) {
    recommendations.push(`Consider obtaining ${opportunity.setAside.replace('_', ' ').toLowerCase()} certification`);
  }

  // Contract size recommendations
  if (factors.pastPerformance.details.includes('exceed capacity')) {
    recommendations.push('Consider teaming arrangements due to contract size');
  }

  // Credibility and market presence recommendations
  if (factors.credibilityMarketPresence.score < 50) {
    recommendations.push('Consider improving profile completeness and SAM.gov registration for better credibility');
  } else if (factors.credibilityMarketPresence.score >= 80) {
    recommendations.push('Strong market presence - highlight your professional profile and government readiness');
  }

  // Government level recommendations
  if (factors.governmentLevelMatch.score < 50) {
    const oppLevel = determineGovernmentLevel(opportunity);
    recommendations.push(`Consider building experience with ${oppLevel.toLowerCase()} agencies`);
  } else if (factors.governmentLevelMatch.score >= 80) {
    recommendations.push('Excellent government level match - highlight relevant experience');
  }

  // Geographic preference recommendations
  if (factors.geographicPreferenceMatch.score < 30) {
    recommendations.push('Consider if travel requirements align with your geographic preferences');
  } else if (factors.geographicPreferenceMatch.score === 0) {
    recommendations.push('This location is marked to avoid - review if this is still relevant');
  }

  return recommendations;
}

/**
 * Helper functions for comprehensive certification matching
 */

/**
 * Check if database certification is relevant for specific set-aside type
 */
function isRelevantForSetAside(dbCert: any, setAsideType: string, certificationDatabase: any[]): boolean {
  // Check if database certification is relevant for specific set-aside type
  const relevantTags: { [key: string]: string[] } = {
    'small_business': ['small_business', 'sba', 'general'],
    'woman_owned': ['woman_owned', 'small_business', 'diversity'],
    'veteran_owned': ['veteran_owned', 'small_business', 'service'],
    'service_disabled_veteran': ['service_disabled_veteran', 'veteran_owned', 'small_business'],
    '8a': ['8a', 'sba', 'small_business', 'disadvantaged'],
    'hubzone': ['hubzone', 'sba', 'small_business', 'geographic'],
    'economically_disadvantaged': ['economically_disadvantaged', 'disadvantaged', 'small_business']
  }

  const tags = relevantTags[setAsideType.toLowerCase()] || []
  return tags.some(tag => 
    dbCert.tags?.includes(tag) || 
    dbCert.category?.toLowerCase().includes(tag) ||
    dbCert.name.toLowerCase().includes(tag)
  )
}

/**
 * Direct matching for basic certification types
 */
function basicSetAsideMatch(certType: string, setAsideType: string): boolean {
  // Direct matching for basic certification types
  const typeMap: { [key: string]: string[] } = {
    '8a': ['8a', 'eight_a', 'eightA'],
    'hubzone': ['hubzone', 'hub_zone'],
    'woman_owned': ['wosb', 'woman_owned', 'edwosb'],
    'veteran_owned': ['vosb', 'veteran_owned'],
    'service_disabled_veteran': ['sdvosb', 'service_disabled_veteran'],
    'small_business': ['small_business', 'sb']
  }

  const setAsideVariants = typeMap[setAsideType.toLowerCase()] || [setAsideType.toLowerCase()]
  return setAsideVariants.some(variant => 
    certType.toLowerCase().includes(variant) || 
    variant.includes(certType.toLowerCase())
  )
}

/**
 * Match set-aside strings against type
 */
function setAsideMatch(setAside: string, setAsideType: string): boolean {
  // Match set-aside strings against type
  return basicSetAsideMatch(setAside, setAsideType)
}

/**
 * Check if user certification is related to opportunity set-aside
 */
function isRelatedCertification(cert: any, setAsideType: string): boolean {
  // Check if user certification is related to opportunity set-aside
  if (!cert || !cert.name) return false
  
  const certName = cert.name.toLowerCase()
  const relatedTerms: { [key: string]: string[] } = {
    'small_business': ['small', 'sba', 'business'],
    'woman_owned': ['woman', 'female', 'wosb', 'edwosb'],
    'veteran_owned': ['veteran', 'vosb', 'military', 'service'],
    'service_disabled_veteran': ['disabled', 'sdvosb', 'service'],
    '8a': ['8a', 'eight', 'disadvantaged', 'minority'],
    'hubzone': ['hubzone', 'hub', 'zone', 'historic']
  }

  const terms = relatedTerms[setAsideType.toLowerCase()] || []
  return terms.some(term => certName.includes(term))
}

/**
 * Calculate batch match scores for multiple opportunities
 */
export function calculateBatchMatchScores(
  opportunities: Opportunity[],
  profile: Profile
): MatchScore[] {
  return opportunities.map(opportunity => 
    calculateMatchScore(opportunity, profile)
  );
}

/**
 * Production Notification Logic with Credibility Thresholds
 * 
 * Determines if a user should be notified about an opportunity match
 * based on match score, profile credibility, and confidence levels.
 * 
 * @param matchScore - The calculated match score result
 * @returns boolean - Whether to notify the user
 */
export function shouldNotifyUser(matchScore: MatchScore): boolean {
  // Extract key metrics
  const overallScore = matchScore.score;
  const confidence = matchScore.confidence;
  
  // Get credibility score from the credibilityMarketPresence factor
  const credibilityFactor = matchScore.detailedFactors?.credibilityMarketPresence;
  const credibilityScore = credibilityFactor?.score || 0;
  
  // Production thresholds based on user requirements
  const MINIMUM_MATCH_SCORE = 75;     // Must be high-quality match
  const MINIMUM_CREDIBILITY = 60;     // Profile must be reasonably complete
  const MINIMUM_CONFIDENCE = 65;      // Algorithm must be confident in result
  
  // All three conditions must be met for notification
  const meetsMatchThreshold = overallScore >= MINIMUM_MATCH_SCORE;
  const meetsCredibilityThreshold = credibilityScore >= MINIMUM_CREDIBILITY;
  const meetsConfidenceThreshold = confidence >= MINIMUM_CONFIDENCE;
  
  return meetsMatchThreshold && meetsCredibilityThreshold && meetsConfidenceThreshold;
}

/**
 * Get notification readiness assessment for a match score
 * 
 * Provides detailed feedback on why a notification would or wouldn't be sent
 * 
 * @param matchScore - The calculated match score result
 * @returns object with readiness status and detailed feedback
 */
export function getNotificationReadiness(matchScore: MatchScore): {
  shouldNotify: boolean;
  reasons: string[];
  recommendations: string[];
  scores: {
    match: number;
    credibility: number;
    confidence: number;
  }
} {
  const shouldNotify = shouldNotifyUser(matchScore);
  const overallScore = matchScore.score;
  const confidence = matchScore.confidence;
  const credibilityScore = matchScore.detailedFactors?.credibilityMarketPresence?.score || 0;
  
  const reasons: string[] = [];
  const recommendations: string[] = [];
  
  // Analyze each threshold
  if (overallScore >= 75) {
    reasons.push(`Strong opportunity match (${overallScore}%)`);
  } else {
    reasons.push(`Match score too low (${overallScore}% < 75%)`);
    recommendations.push('Focus on improving NAICS alignment and past performance');
  }
  
  if (credibilityScore >= 60) {
    reasons.push(`Adequate profile credibility (${credibilityScore}%)`);
  } else {
    reasons.push(`Profile credibility insufficient (${credibilityScore}% < 60%)`);
    recommendations.push('Complete contact information, basic company details, and SAM.gov registration');
  }
  
  if (confidence >= 65) {
    reasons.push(`High algorithm confidence (${confidence}%)`);
  } else {
    reasons.push(`Algorithm confidence too low (${confidence}% < 65%)`);
    recommendations.push('Add more profile details to improve matching accuracy');
  }
  
  return {
    shouldNotify,
    reasons,
    recommendations,
    scores: {
      match: overallScore,
      credibility: credibilityScore,
      confidence: confidence
    }
  };
}

/**
 * =====================================================
 * NEW 4-CATEGORY CALCULATION FUNCTIONS (v4.0)
 * =====================================================
 * These functions implement the unified 4-category structure
 * that aligns with the profile completeness scoring system
 */

/**
 * Calculate Past Performance category score
 * Combines multiple sub-factors with weighted contributions
 */
function calculatePastPerformanceCategory(
  profile: Profile | MatchScoreInput,
  opportunity: Opportunity,
  categoryWeight: number
): MatchScoreFactor {
  // Use the existing calculatePastPerformance function as the primary calculation
  const pastPerformanceFactor = calculatePastPerformance(profile, opportunity);
  
  return {
    score: pastPerformanceFactor.score,
    weight: categoryWeight,
    contribution: (pastPerformanceFactor.score * categoryWeight) / 100,
    details: pastPerformanceFactor.details
  };
}

/**
 * Calculate Technical Capability category score
 * Combines NAICS alignment, certifications, competencies, and security clearance
 */
function calculateTechnicalCapabilityCategory(
  profile: Profile | MatchScoreInput,
  opportunity: Opportunity,
  categoryWeight: number
): MatchScoreFactor {
  // Sub-factor weights (should total 100%)
  const subWeights = {
    naicsAlignment: 50,        // 50% - Primary technical match
    certificationMatch: 25,    // 25% - Required certifications and set-asides
    competencyAlignment: 15,   // 15% - Skills and capabilities
    securityClearanceMatch: 10 // 10% - Security clearance compatibility
  };
  
  // Calculate individual sub-factors
  const naicsFactor = calculateNAICSAlignment(profile, opportunity);
  const certFactor = calculateCertificationMatch(profile, opportunity);
  
  // For now, use simplified calculations for new sub-factors
  // TODO: Implement detailed competency and security clearance matching
  const competencyScore = 50; // Placeholder - implement detailed matching
  const securityScore = profile && (profile as Profile).securityClearance ? 80 : 20; // Basic check
  
  // Calculate weighted average of sub-factors
  const categoryScore = (
    (naicsFactor.score * subWeights.naicsAlignment) +
    (certFactor.score * subWeights.certificationMatch) +
    (competencyScore * subWeights.competencyAlignment) +
    (securityScore * subWeights.securityClearanceMatch)
  ) / 100;
  
  return {
    score: categoryScore,
    weight: categoryWeight,
    contribution: (categoryScore * categoryWeight) / 100,
    details: `NAICS: ${naicsFactor.score}%, Certs: ${certFactor.score}%, Competencies: ${competencyScore}%, Security: ${securityScore}%`
  };
}

/**
 * Calculate Strategic Fit & Relationships category score
 * Combines geographic factors, government level match, and business scale
 */
function calculateStrategicFitCategory(
  profile: Profile | MatchScoreInput,
  opportunity: Opportunity,
  categoryWeight: number
): MatchScoreFactor {
  // Sub-factor weights (should total 100%)
  const subWeights = {
    geographicProximity: 40,      // 40% - Distance to performance location
    governmentLevelMatch: 30,     // 30% - Experience with gov levels
    geographicPreferenceMatch: 20, // 20% - Location preferences
    businessScaleAlignment: 10    // 10% - Company size vs opportunity
  };
  
  // Calculate individual sub-factors
  const geoProximityFactor = calculateGeographicProximity(profile, opportunity);
  const govLevelFactor = calculateGovernmentLevelMatch(profile, opportunity);
  const geoPreferenceFactor = calculateGeographicPreferenceMatch(profile, opportunity);
  
  // Business scale alignment (simplified)
  const businessScaleScore = 70; // Placeholder - implement detailed scale matching
  
  // Calculate weighted average of sub-factors
  const categoryScore = (
    (geoProximityFactor.score * subWeights.geographicProximity) +
    (govLevelFactor.score * subWeights.governmentLevelMatch) +
    (geoPreferenceFactor.score * subWeights.geographicPreferenceMatch) +
    (businessScaleScore * subWeights.businessScaleAlignment)
  ) / 100;
  
  return {
    score: categoryScore,
    weight: categoryWeight,
    contribution: (categoryScore * categoryWeight) / 100,
    details: `Geographic: ${geoProximityFactor.score}%, Gov Level: ${govLevelFactor.score}%, Preferences: ${geoPreferenceFactor.score}%, Scale: ${businessScaleScore}%`
  };
}

/**
 * Calculate Credibility & Market Presence category score
 * Uses the existing calculateCredibilityMarketPresence function
 */
function calculateCredibilityCategory(
  profile: Profile | MatchScoreInput,
  opportunity: Opportunity,
  categoryWeight: number
): MatchScoreFactor {
  // Use the existing credibility calculation
  const credibilityFactor = calculateCredibilityMarketPresence(profile, opportunity);
  
  return {
    score: credibilityFactor.score,
    weight: categoryWeight,
    contribution: (credibilityFactor.score * categoryWeight) / 100,
    details: credibilityFactor.details
  };
}