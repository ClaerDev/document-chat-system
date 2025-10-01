/**
 * Test Data Constants
 * 
 * Common constants used throughout test data generation.
 * These ensure consistency across all mock data.
 */

// Common NAICS codes for government contracting
export const TEST_NAICS_CODES = {
  SOFTWARE_DEV: { code: '541511', title: 'Custom Computer Programming Services' },
  SYSTEMS_DESIGN: { code: '541512', title: 'Computer Systems Design Services' },
  CYBERSECURITY: { code: '541519', title: 'Other Computer Related Services' },
  CONSULTING: { code: '541611', title: 'Administrative Management and General Management Consulting Services' },
  ENGINEERING: { code: '541330', title: 'Engineering Services' },
  RESEARCH: { code: '541715', title: 'Research and Development in the Physical, Engineering, and Life Sciences' },
} as const;

// Common government agencies
export const TEST_AGENCIES = {
  DOD: {
    name: 'Department of Defense',
    code: 'DOD',
    offices: ['DISA', 'DARPA', 'US Army Corps of Engineers', 'Navy SPAWAR'],
  },
  GSA: {
    name: 'General Services Administration',
    code: 'GSA',
    offices: ['FAS', 'PBS', 'OGP'],
  },
  NASA: {
    name: 'National Aeronautics and Space Administration',
    code: 'NASA',
    offices: ['Goddard Space Flight Center', 'Johnson Space Center'],
  },
  DHS: {
    name: 'Department of Homeland Security',
    code: 'DHS',
    offices: ['CISA', 'TSA', 'USCIS'],
  },
  VA: {
    name: 'Department of Veterans Affairs',
    code: 'VA',
    offices: ['VHA', 'VBA', 'NCA'],
  },
} as const;

// Common certification types
export const TEST_CERTIFICATIONS = {
  SBA_8A: {
    type: 'SBA_8A',
    name: '8(a) Business Development',
    issuer: 'Small Business Administration',
  },
  HUBZONE: {
    type: 'HUBZONE',
    name: 'HUBZone Certification',
    issuer: 'Small Business Administration',
  },
  SDVOSB: {
    type: 'SDVOSB',
    name: 'Service-Disabled Veteran-Owned Small Business',
    issuer: 'Department of Veterans Affairs',
  },
  WOSB: {
    type: 'WOSB',
    name: 'Woman-Owned Small Business',
    issuer: 'Small Business Administration',
  },
  MBE: {
    type: 'MBE',
    name: 'Minority Business Enterprise',
    issuer: 'National Minority Supplier Development Council',
  },
} as const;

// Common PSC codes
export const TEST_PSC_CODES = {
  IT_SERVICES: ['D302', 'D307', 'D310', 'D316'],
  ENGINEERING: ['C111', 'C112', 'C113', 'C114'],
  RESEARCH: ['AC11', 'AC12', 'AC13', 'AC14'],
  CONSULTING: ['R425', 'R408', 'R413', 'R421'],
} as const;

// Common security clearance levels
export const TEST_SECURITY_CLEARANCES = {
  NONE: null,
  PUBLIC_TRUST: 'PUBLIC_TRUST',
  SECRET: 'SECRET',
  TOP_SECRET: 'TOP_SECRET',
  TS_SCI: 'TOP_SECRET_SCI',
} as const;

// Common contract types
export const TEST_CONTRACT_TYPES = {
  CONTRACT: 'CONTRACT',
  GRANT: 'GRANT',
  COOPERATIVE_AGREEMENT: 'COOPERATIVE_AGREEMENT',
  SOLICITATION: 'SOLICITATION',
  RFP: 'RFP',
  RFQ: 'RFQ',
  RFI: 'RFI',
} as const;

// Common set-aside types
export const TEST_SET_ASIDES = {
  NONE: null,
  SMALL_BUSINESS: 'SMALL_BUSINESS',
  SBA_8A: '8A',
  HUBZONE: 'HUBZONE',
  SDVOSB: 'SDVOSB',
  WOSB: 'WOSB',
  EDWOSB: 'EDWOSB',
} as const;

// Test organization data
export const TEST_ORGANIZATIONS = [
  {
    id: 'org_acme_contracting',
    name: 'ACME Government Contracting LLC',
    slug: 'acme-contracting',
    domain: 'acmecontracting.com',
  },
  {
    id: 'org_tech_solutions',
    name: 'Tech Solutions Federal Inc',
    slug: 'tech-solutions',
    domain: 'techsolutionsfederal.com',
  },
  {
    id: 'org_cyber_defense',
    name: 'CyberDefense Systems Corp',
    slug: 'cyber-defense',
    domain: 'cyberdefensesys.com',
  },
] as const;

// Test user data
export const TEST_USERS = [
  {
    id: 'user_john_doe',
    clerkId: 'clerk_john_doe',
    email: 'john.doe@acmecontracting.com',
    firstName: 'John',
    lastName: 'Doe',
    role: 'OWNER' as const,
  },
  {
    id: 'user_jane_smith',
    clerkId: 'clerk_jane_smith',
    email: 'jane.smith@acmecontracting.com',
    firstName: 'Jane',
    lastName: 'Smith',
    role: 'ADMIN' as const,
  },
  {
    id: 'user_bob_wilson',
    clerkId: 'clerk_bob_wilson',
    email: 'bob.wilson@techsolutionsfederal.com',
    firstName: 'Bob',
    lastName: 'Wilson',
    role: 'MEMBER' as const,
  },
] as const;

// Test profile templates
export const TEST_PROFILES = {
  SMALL_IT_CONTRACTOR: {
    companyName: 'Small IT Solutions LLC',
    primaryNaics: TEST_NAICS_CODES.SOFTWARE_DEV,
    certifications: [TEST_CERTIFICATIONS.SBA_8A, TEST_CERTIFICATIONS.HUBZONE],
    coreCompetencies: ['Software Development', 'Cloud Computing', 'Cybersecurity'],
    employeeCount: 25,
    annualRevenue: 2500000,
  },
  LARGE_DEFENSE_CONTRACTOR: {
    companyName: 'Defense Systems International',
    primaryNaics: TEST_NAICS_CODES.ENGINEERING,
    certifications: [],
    coreCompetencies: ['Systems Engineering', 'Defense Solutions', 'Program Management'],
    employeeCount: 500,
    annualRevenue: 75000000,
  },
  WOMAN_OWNED_CONSULTING: {
    companyName: 'Strategic Consulting Partners',
    primaryNaics: TEST_NAICS_CODES.CONSULTING,
    certifications: [TEST_CERTIFICATIONS.WOSB],
    coreCompetencies: ['Management Consulting', 'Process Improvement', 'Change Management'],
    employeeCount: 50,
    annualRevenue: 8000000,
  },
} as const;

// Test opportunity templates
export const TEST_OPPORTUNITIES = {
  SMALL_IT_PROJECT: {
    title: 'IT Modernization Support Services',
    agency: TEST_AGENCIES.GSA.name,
    type: TEST_CONTRACT_TYPES.CONTRACT,
    setAside: TEST_SET_ASIDES.SMALL_BUSINESS,
    naicsCodes: [TEST_NAICS_CODES.SOFTWARE_DEV.code],
    estimatedValue: { min: 500000, max: 1500000, currency: 'USD' },
    securityClearance: TEST_SECURITY_CLEARANCES.PUBLIC_TRUST,
  },
  LARGE_DEFENSE_CONTRACT: {
    title: 'Weapon System Engineering Support',
    agency: TEST_AGENCIES.DOD.name,
    type: TEST_CONTRACT_TYPES.CONTRACT,
    setAside: TEST_SET_ASIDES.NONE,
    naicsCodes: [TEST_NAICS_CODES.ENGINEERING.code],
    estimatedValue: { min: 50000000, max: 100000000, currency: 'USD' },
    securityClearance: TEST_SECURITY_CLEARANCES.TOP_SECRET,
  },
  RESEARCH_GRANT: {
    title: 'Advanced Materials Research',
    agency: TEST_AGENCIES.NASA.name,
    type: TEST_CONTRACT_TYPES.GRANT,
    setAside: TEST_SET_ASIDES.NONE,
    naicsCodes: [TEST_NAICS_CODES.RESEARCH.code],
    estimatedValue: { min: 250000, max: 750000, currency: 'USD' },
    securityClearance: TEST_SECURITY_CLEARANCES.NONE,
  },
} as const;

// Common addresses for testing
export const TEST_ADDRESSES = {
  DC_METRO: {
    street: '1234 Government Way',
    city: 'Arlington',
    state: 'VA',
    zipCode: '22204',
    country: 'USA',
  },
  HUNTSVILLE: {
    street: '5678 Research Blvd',
    city: 'Huntsville',
    state: 'AL',
    zipCode: '35801',
    country: 'USA',
  },
  SAN_DIEGO: {
    street: '9012 Naval Base Dr',
    city: 'San Diego',
    state: 'CA',
    zipCode: '92101',
    country: 'USA',
  },
} as const;

// Date helpers for consistent test dates
export const TEST_DATES = {
  PAST_YEAR: new Date(new Date().setFullYear(new Date().getFullYear() - 1)),
  PAST_MONTH: new Date(new Date().setMonth(new Date().getMonth() - 1)),
  PAST_WEEK: new Date(new Date().setDate(new Date().getDate() - 7)),
  TODAY: new Date(),
  NEXT_WEEK: new Date(new Date().setDate(new Date().getDate() + 7)),
  NEXT_MONTH: new Date(new Date().setMonth(new Date().getMonth() + 1)),
  NEXT_YEAR: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
} as const;