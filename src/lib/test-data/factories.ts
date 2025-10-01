/**
 * Test Data Factories
 * 
 * Factory functions for creating consistent test data.
 * These functions use the types from @/types to ensure type safety.
 */

import type { 
  Organization, 
  User, 
  Profile, 
  Opportunity,
  MatchScore,
  BillingSubscription,
  UsageRecord,
  Certification,
  PastPerformance,
} from '../../types';

import { 
  TEST_NAICS_CODES,
  TEST_AGENCIES,
  TEST_CERTIFICATIONS,
  TEST_CONTRACT_TYPES,
  TEST_SET_ASIDES,
  TEST_ADDRESSES,
  TEST_DATES,
  TEST_SECURITY_CLEARANCES,
} from './constants';

let idCounter = 1;

/**
 * Generate a unique ID for test data
 */
function generateId(prefix: string): string {
  return `${prefix}_test_${Date.now()}_${idCounter++}`;
}

/**
 * Create a mock Organization
 */
export function createOrganization(overrides: Partial<Organization> = {}): Organization {
  const id = overrides.id || generateId('org');
  const name = overrides.name || 'Test Organization LLC';
  const slug = overrides.slug || name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  
  return {
    id,
    name,
    slug,
    domain: overrides.domain || `${slug}.com`,
    createdAt: overrides.createdAt || TEST_DATES.PAST_MONTH,
    updatedAt: overrides.updatedAt || TEST_DATES.TODAY,
    ownerId: overrides.ownerId || generateId('user'),
    ...overrides,
  };
}

/**
 * Create a mock User
 */
export function createUser(overrides: Partial<User> = {}): User {
  const id = overrides.id || generateId('user');
  const email = overrides.email || `user${idCounter}@example.com`;
  
  return {
    id,
    clerkId: overrides.clerkId || `clerk_${id}`,
    email,
    firstName: overrides.firstName || 'Test',
    lastName: overrides.lastName || 'User',
    organizationId: overrides.organizationId || generateId('org'),
    role: overrides.role || 'MEMBER',
    createdAt: overrides.createdAt || TEST_DATES.PAST_MONTH,
    updatedAt: overrides.updatedAt || TEST_DATES.TODAY,
    timezone: overrides.timezone || 'America/New_York',
    ...overrides,
  };
}

/**
 * Create a mock Certification
 */
export function createCertification(overrides: Partial<Certification> = {}): Certification {
  const certType = overrides.type || 'SBA_8A';
  const certInfo = TEST_CERTIFICATIONS[certType] || TEST_CERTIFICATIONS.SBA_8A;
  
  return {
    type: certType,
    status: overrides.status || 'ACTIVE',
    expirationDate: overrides.expirationDate || TEST_DATES.NEXT_YEAR,
    certificationNumber: overrides.certificationNumber || `CERT-${Date.now()}`,
    issuingAgency: certInfo.issuer,
    ...overrides,
  };
}

/**
 * Create a mock Past Performance record
 */
export function createPastPerformance(overrides: Partial<PastPerformance> = {}): PastPerformance {
  return {
    contractNumber: overrides.contractNumber || `GS-35F-${Date.now()}`,
    agency: overrides.agency || TEST_AGENCIES.DOD.name,
    title: overrides.title || 'IT Support Services',
    value: overrides.value || 2500000,
    startDate: overrides.startDate || TEST_DATES.PAST_YEAR,
    endDate: overrides.endDate || TEST_DATES.NEXT_YEAR,
    performance: overrides.performance || 'EXCELLENT',
    contactName: overrides.contactName || 'Contract Officer',
    contactEmail: overrides.contactEmail || 'co@agency.gov',
    contactPhone: overrides.contactPhone || '+1-555-123-4567',
    ...overrides,
  };
}

/**
 * Create a mock Profile
 */
export function createProfile(overrides: Partial<Profile> = {}): Profile {
  const id = overrides.id || generateId('profile');
  const userId = overrides.userId || generateId('user');
  const organizationId = overrides.organizationId || generateId('org');
  
  return {
    id,
    userId,
    organizationId,
    
    // Company Information
    companyName: overrides.companyName || 'Test Company LLC',
    dbaName: overrides.dbaName || 'Test Company',
    uei: overrides.uei || `UEI${Date.now()}AB`,
    cageCode: overrides.cageCode || `CAGE${idCounter}`,
    
    // Business Address
    businessAddress: overrides.businessAddress || TEST_ADDRESSES.DC_METRO,
    
    // Contact Information
    primaryContact: overrides.primaryContact || {
      name: 'John Doe',
      title: 'CEO',
      email: 'john@testcompany.com',
      phone: '+1-555-123-4567',
    },
    
    // NAICS Codes
    primaryNaics: overrides.primaryNaics || TEST_NAICS_CODES.SOFTWARE_DEV,
    secondaryNaics: overrides.secondaryNaics || [TEST_NAICS_CODES.SYSTEMS_DESIGN],
    
    // Certifications
    certifications: overrides.certifications || [
      createCertification({ type: 'SBA_8A' }),
      createCertification({ type: 'HUBZONE' }),
    ],
    
    // Core Competencies
    coreCompetencies: overrides.coreCompetencies || [
      'Software Development',
      'Cloud Computing',
      'Cybersecurity',
      'Data Analytics',
    ],
    
    // Past Performance
    pastPerformance: overrides.pastPerformance || [
      createPastPerformance(),
    ],
    
    // Security Clearance
    securityClearance: overrides.securityClearance || {
      level: 'SECRET',
      facilityCleared: true,
      personnelCleared: 15,
    },
    
    // Company Details
    employeeCount: overrides.employeeCount || 50,
    annualRevenue: overrides.annualRevenue || 5000000,
    yearEstablished: overrides.yearEstablished || 2015,
    
    // Profile Metadata
    completenessScore: overrides.completenessScore || 95,
    isVerified: overrides.isVerified !== undefined ? overrides.isVerified : true,
    lastUpdated: overrides.lastUpdated || TEST_DATES.TODAY,
    createdAt: overrides.createdAt || TEST_DATES.PAST_MONTH,
    updatedAt: overrides.updatedAt || TEST_DATES.TODAY,
    
    ...overrides,
  };
}

/**
 * Create a mock Opportunity
 */
export function createOpportunity(overrides: Partial<Opportunity> = {}): Opportunity {
  const id = overrides.id || generateId('opp');
  const agency = TEST_AGENCIES.DOD;
  
  return {
    id,
    externalId: overrides.externalId || `ext_${id}`,
    solicitationNumber: overrides.solicitationNumber || `W52P1J-24-R-${idCounter.toString().padStart(4, '0')}`,
    title: overrides.title || 'IT Support Services Contract',
    description: overrides.description || 'Comprehensive IT support and cybersecurity services.',
    
    // Agency Information
    agency: overrides.agency || agency,
    agencyCode: overrides.agencyCode || 'DOD',
    location: overrides.location || `${TEST_ADDRESSES.DC_METRO.city}, ${TEST_ADDRESSES.DC_METRO.state}`,
    state: overrides.state || TEST_ADDRESSES.DC_METRO.state,
    
    // Contract Details
    type: overrides.type || 'SOLICITATION',
    setAsideType: overrides.setAsideType || TEST_SET_ASIDES.SMALL_BUSINESS,
    naicsCodes: overrides.naicsCodes || [TEST_NAICS_CODES.SOFTWARE_DEV.code],
    pscCodes: overrides.pscCodes || ['D302', 'D316'],
    
    // Timeline
    postedDate: overrides.postedDate || TEST_DATES.TODAY,
    deadline: overrides.deadline || TEST_DATES.NEXT_MONTH,
    
    // Contract Value
    contractValue: overrides.contractValue || 2500000,
    contractValueMin: overrides.contractValueMin || 1000000,
    contractValueMax: overrides.contractValueMax || 5000000,
    
    // Security Clearance
    securityClearance: overrides.securityClearance || {
      level: 'SECRET',
      facilityCleared: true,
      personnelCleared: 15,
    },
    
    // Additional fields
    sourceData: overrides.sourceData || {},
    titleEmbedding: overrides.titleEmbedding,
    descriptionEmbedding: overrides.descriptionEmbedding,
    processedAt: overrides.processedAt,
    
    // Metadata
    createdAt: overrides.createdAt || TEST_DATES.TODAY,
    updatedAt: overrides.updatedAt || TEST_DATES.TODAY,
    
    ...overrides,
  };
}

/**
 * Create a mock MatchScore
 */
export function createMatchScore(overrides: Partial<MatchScore> = {}): MatchScore {
  const score = overrides.score || 85;
  
  return {
    id: overrides.id || generateId('match'),
    profileId: overrides.profileId || generateId('profile'),
    opportunityId: overrides.opportunityId || generateId('opp'),
    
    // Overall Score
    score,
    confidence: overrides.confidence || 0.9,
    algorithmVersion: overrides.algorithmVersion || 'v1.0',
    
    // Factor Breakdown
    factors: overrides.factors || [
      {
        name: 'NAICS Alignment',
        contribution: 40,
        explanation: 'Exact NAICS code match',
      },
      {
        name: 'Geographic Proximity',
        contribution: 18.75,
        explanation: 'Same state, different city',
      },
      {
        name: 'Certification Match',
        contribution: 16,
        explanation: 'Meets certification requirements',
      },
      {
        name: 'Past Performance',
        contribution: 10.5,
        explanation: 'Relevant past performance',
      },
    ],
    
    // Metadata
    createdAt: overrides.createdAt || TEST_DATES.TODAY,
    
    ...overrides,
  };
}

/**
 * Create a mock BillingSubscription
 */
export function createBillingSubscription(overrides: Partial<BillingSubscription> = {}): BillingSubscription {
  return {
    id: overrides.id || generateId('sub'),
    organizationId: overrides.organizationId || generateId('org'),
    stripeCustomerId: overrides.stripeCustomerId || `cus_${Date.now()}`,
    stripeSubscriptionId: overrides.stripeSubscriptionId || `sub_${Date.now()}`,
    
    // Plan details
    plan: overrides.plan || 'PROFESSIONAL',
    status: overrides.status || 'ACTIVE',
    currentPeriodStart: overrides.currentPeriodStart || TEST_DATES.TODAY,
    currentPeriodEnd: overrides.currentPeriodEnd || TEST_DATES.NEXT_MONTH,
    
    // Features
    features: overrides.features || {
      maxUsers: 10,
      maxOpportunities: 1000,
      apiAccess: true,
      customIntegrations: true,
      prioritySupport: true,
    },
    
    // Usage limits
    limits: overrides.limits || {
      opportunityMatches: 1000,
      aiQueries: 500,
      documentProcessing: 100,
      apiCalls: 10000,
    },
    
    // Metadata
    createdAt: overrides.createdAt || TEST_DATES.PAST_MONTH,
    updatedAt: overrides.updatedAt || TEST_DATES.TODAY,
    cancelAtPeriodEnd: overrides.cancelAtPeriodEnd || false,
    
    ...overrides,
  };
}

/**
 * Create a mock UsageRecord
 */
export function createUsageRecord(overrides: Partial<UsageRecord> = {}): UsageRecord {
  return {
    id: overrides.id || generateId('usage'),
    organizationId: overrides.organizationId || generateId('org'),
    userId: overrides.userId || generateId('user'),
    
    // Usage details
    type: overrides.type || 'OPPORTUNITY_MATCH',
    quantity: overrides.quantity || 1,
    metadata: overrides.metadata || {},
    
    // Timestamps
    timestamp: overrides.timestamp || TEST_DATES.TODAY,
    billingPeriodStart: overrides.billingPeriodStart || TEST_DATES.TODAY,
    billingPeriodEnd: overrides.billingPeriodEnd || TEST_DATES.NEXT_MONTH,
    
    ...overrides,
  };
}

/**
 * Create multiple opportunities with varied data
 */
export function createOpportunities(count: number, template?: Partial<Opportunity>): Opportunity[] {
  const agencies = Object.values(TEST_AGENCIES);
  const naicsCodes = Object.values(TEST_NAICS_CODES);
  const setAsides = Object.values(TEST_SET_ASIDES);
  
  return Array.from({ length: count }, (_, index) => {
    const agency = agencies[index % agencies.length];
    const naics = naicsCodes[index % naicsCodes.length];
    const setAside = setAsides[index % setAsides.length];
    
    return createOpportunity({
      ...template,
      id: `opp_${index + 1}`,
      solicitation: `${agency.code}-24-R-${(index + 1).toString().padStart(4, '0')}`,
      title: `${naics.title} Services Contract ${index + 1}`,
      agency: agency.name,
      office: agency.offices[0],
      naicsCodes: [naics.code],
      setAside,
      estimatedValue: {
        min: 500000 * (index + 1),
        max: 1000000 * (index + 1),
        currency: 'USD',
      },
    });
  });
}

/**
 * Create matched opportunities with scores
 */
export function createMatchedOpportunities(
  profileId: string,
  count: number
): { opportunities: Opportunity[], matchScores: MatchScore[] } {
  const opportunities = createOpportunities(count);
  const matchScores = opportunities.map((opp, index) => 
    createMatchScore({
      userId: profileId,
      opportunityId: opp.id,
      overallScore: 70 + (index % 30), // Scores between 70-100
    })
  );
  
  return { opportunities, matchScores };
}