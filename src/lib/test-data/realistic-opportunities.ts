/**
 * Realistic Government Contracting Opportunities Generator
 * 
 * Creates opportunities using real government data sources for:
 * - NAICS codes from 2022 classification
 * - Set-aside types from federal regulations  
 * - Competencies from government services catalog
 * - Locations from US geography data
 * - Agency information from agencies.json
 * 
 * UPDATED: Now supports comprehensive opportunity model with:
 * - Multiple data sources (SAM.gov, HigherGov, USA Spending, FPDS-NG, Grants.gov)
 * - Global enum usage for type safety
 * - Structured agency information
 * - Award data for historical opportunities
 * - Enhanced geographic and financial information
 */

import type { Opportunity, AgencyInfo } from '@/types'
import {
  SourceSystem,
  OpportunityType,
  ContractType,
  SetAsideType,
  CompetitionType,
  SecurityClearanceLevel,
  ProcurementMethod,
  ContractDuration,
  AwardType,
  AwardStatus,
  OpportunityStatus,
  LEGACY_MAPPINGS
} from '@/types/opportunity-enums'
import { addDays, subDays, format } from 'date-fns'

// Import government data sources statically for Next.js compatibility
import naicsData from '@/data/government/codes/codes.json'
import setAsidesData from '@/data/government/set-asides/set-asides.json'
import competenciesData from '@/data/government/competencies/competencies.json'
import locationsData from '@/data/government/locations/locations.json'
import agenciesData from '@/data/government/agencies/agencies.json'
import certificationsData from '@/data/government/certifications/certifications.json'
import vehiclesData from '@/data/government/vehicles/vehicles.json'

// Government data is now loaded statically with all available sources
const governmentData = {
  naicsData,
  setAsidesData,
  competenciesData,
  locationsData,
  agenciesData,
  certificationsData,
  vehiclesData
}

// Generate today's date for realistic deadlines
const today = new Date()

// Realistic government contracting opportunity templates
const OPPORTUNITY_TEMPLATES = [
  {
    titleTemplate: "Comprehensive [SERVICE] Solutions for [AGENCY]",
    descriptionTemplate: "The [AGENCY] is seeking qualified contractors to provide [SERVICE] services to support mission-critical operations. This contract will involve [DESCRIPTION] with emphasis on innovation, efficiency, and security compliance.",
    agencies: ['Department of Defense', 'General Services Administration', 'Department of Homeland Security'],
    contractTypes: ['IDIQ', 'BPA', 'CONTRACT']
  },
  {
    titleTemplate: "Enterprise [SERVICE] Support Services",
    descriptionTemplate: "This opportunity involves providing [SERVICE] support services including [DESCRIPTION]. The contractor must demonstrate extensive experience and capability to deliver high-quality solutions.",
    agencies: ['Department of Veterans Affairs', 'Department of Health and Human Services', 'National Aeronautics and Space Administration'],
    contractTypes: ['CONTRACT', 'TASK_ORDER']
  },
  {
    titleTemplate: "Advanced [SERVICE] Implementation and Support",
    descriptionTemplate: "Contractor will provide [SERVICE] implementation, customization, and ongoing support services. Requirements include [DESCRIPTION] with focus on scalability and performance.",
    agencies: ['Department of Treasury', 'Department of Commerce', 'Environmental Protection Agency'],
    contractTypes: ['CONTRACT', 'COOPERATIVE_AGREEMENT']
  },
  {
    titleTemplate: "Modernization of [SERVICE] Infrastructure",
    descriptionTemplate: "The government seeks to modernize its [SERVICE] capabilities through [DESCRIPTION]. This initiative requires experienced contractors with proven track records in government environments.",
    agencies: ['General Services Administration', 'Department of Defense', 'Department of Homeland Security'],
    contractTypes: ['CONTRACT', 'IDIQ']
  },
  {
    titleTemplate: "Integrated [SERVICE] Program Management",
    descriptionTemplate: "Comprehensive program management services for [SERVICE] initiatives. Scope includes [DESCRIPTION] with emphasis on stakeholder coordination and delivery excellence.",
    agencies: ['Small Business Administration', 'Department of Agriculture', 'Department of Education'],
    contractTypes: ['CONTRACT', 'BPA']
  }
]

// Agency codes mapping
const AGENCY_CODES: Record<string, string> = {
  'Department of Defense': 'DOD',
  'General Services Administration': 'GSA',
  'Department of Homeland Security': 'DHS', 
  'Department of Veterans Affairs': 'VA',
  'Department of Health and Human Services': 'HHS',
  'National Aeronautics and Space Administration': 'NASA',
  'Department of Treasury': 'TREAS',
  'Department of Commerce': 'DOC',
  'Environmental Protection Agency': 'EPA',
  'Small Business Administration': 'SBA',
  'Department of Agriculture': 'USDA',
  'Department of Education': 'ED'
}

/**
 * Get random items from an array using seeded random
 */
function getRandomItems<T>(array: T[], count: number): T[] {
  const indices = new Set<number>()
  const result: T[] = []
  const maxCount = Math.min(count, array.length)
  
  while (result.length < maxCount) {
    const index = seededRandom.nextInt(array.length)
    if (!indices.has(index)) {
      indices.add(index)
      result.push(array[index])
    }
  }
  
  return result
}

// Deterministic seeded random number generator to prevent hydration mismatches
class SeededRandom {
  private seed: number

  constructor(seed: number) {
    this.seed = seed
  }

  next(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280
    return this.seed / 233280
  }

  nextInt(max: number): number {
    return Math.floor(this.next() * max)
  }

  nextFloat(min: number = 0, max: number = 1): number {
    return min + this.next() * (max - min)
  }
}

// Global seeded random instance
let seededRandom = new SeededRandom(12345) // Fixed seed for consistency

/**
 * Get a random item from an array using seeded random
 */
function getRandomItem<T>(array: T[]): T {
  if (!array || array.length === 0) {
    throw new Error('Cannot get random item from empty array')
  }
  return array[seededRandom.nextInt(array.length)]
}

/**
 * Generate realistic deadline dates
 */
function generateDeadline(index: number): string {
  // Mix of past and future deadlines for realistic data
  const dayOffset = Math.floor((index * 7) - 35) // Spread across 10 weeks centered on today
  const deadline = index % 3 === 0 ? subDays(today, Math.abs(dayOffset)) : addDays(today, Math.abs(dayOffset))
  return deadline.toISOString()
}

/**
 * Generate realistic posted dates
 */
function generatePostedDate(deadline: string): string {
  // Posted date should be 30-60 days before deadline
  const deadlineDate = new Date(deadline)
  const daysBeforeDeadline = 30 + Math.floor(seededRandom.nextFloat() * 30) // 30-60 days
  const postedDate = subDays(deadlineDate, daysBeforeDeadline)
  return postedDate.toISOString()
}

/**
 * Generate contract values based on NAICS industry
 */
function generateContractValue(naicsCode: string): { min: number; max: number; value: number } {
  // Different industries have different typical contract sizes
  const industryMultipliers: Record<string, number> = {
    '11': 0.5,  // Agriculture - smaller contracts
    '21': 2.0,  // Mining - larger infrastructure contracts
    '23': 3.0,  // Construction - very large contracts
    '31': 1.5,  // Manufacturing
    '42': 1.0,  // Wholesale trade
    '48': 2.5,  // Transportation - infrastructure contracts
    '51': 1.8,  // Information/IT - technology contracts
    '54': 1.2,  // Professional services
    '61': 0.8,  // Educational services
    '62': 1.3,  // Health care
    '71': 0.6,  // Arts/entertainment
    '72': 0.7,  // Accommodation/food
    '81': 0.9,  // Other services
    '92': 1.5   // Public administration
  }

  const sectorCode = naicsCode.substring(0, 2)
  const multiplier = industryMultipliers[sectorCode] || 1.0
  
  // Base contract value between $100K and $10M, adjusted by industry
  const baseMin = 100000 + seededRandom.nextFloat() * 900000 // $100K-$1M
  const baseMax = baseMin * (2 + seededRandom.nextFloat() * 8) // 2x-10x the minimum
  
  const min = Math.floor(baseMin * multiplier)
  const max = Math.floor(baseMax * multiplier)
  const value = Math.floor(min + (max - min) * 0.7) // Typical value is 70% of range
  
  return { min, max, value }
}

/**
 * Generate realistic opportunity locations with enhanced searchability
 */
function generateLocations(locationsData: any): { 
  location: string; 
  state: string; 
  city?: string;
  zipCode?: string;
} {
  const states = locationsData.locations?.states || locationsData.states || []
  
  // If no states found, use fallback
  if (states.length === 0) {
    return {
      location: 'Washington, DC',
      state: 'DC',
      city: 'Washington',
      zipCode: '20001'
    }
  }
  
  const randomState = getRandomItem(states)
  
  // Get a random county from the state
  const counties = randomState.counties || []
  if (counties.length > 0) {
    const randomCounty = getRandomItem(counties)
    const cities = randomCounty.cities || []
    
    if (cities.length > 0) {
      const randomCity = getRandomItem(cities)
      // Generate a realistic zip code based on state and city
      const baseZip = Math.floor(seededRandom.nextFloat() * 90000) + 10000
      
      return {
        location: `${randomCity.name}, ${randomState.name}`,
        state: randomState.code || randomState.id || 'XX',
        city: randomCity.name,
        zipCode: baseZip.toString()
      }
    }
    
    // Fallback to county if no cities
    const baseZip = Math.floor(seededRandom.nextFloat() * 90000) + 10000
    return {
      location: `${randomCounty.name}, ${randomState.name}`,
      state: randomState.code || randomState.id || 'XX',
      city: randomCounty.name,
      zipCode: baseZip.toString()
    }
  }
  
  // Fallback to state only
  const baseZip = Math.floor(seededRandom.nextFloat() * 90000) + 10000
  return {
    location: `${randomState.name}`,
    state: randomState.code || randomState.id || 'XX',
    city: randomState.name,
    zipCode: baseZip.toString()
  }
}

/**
 * Reset the seeded random generator for consistent results
 */
export function resetSeed(seed: number = 12345) {
  seededRandom = new SeededRandom(seed)
}

/**
 * Create realistic government contracting opportunities
 */
export function createRealisticOpportunities(count: number): Opportunity[] {
  // Reset seed for consistent generation
  resetSeed()
  // Use statically loaded government data with all available sources
  const { 
    naicsData, 
    setAsidesData, 
    competenciesData, 
    locationsData: loadedLocationsData,
    agenciesData: loadedAgenciesData,
    certificationsData,
    vehiclesData
  } = governmentData
  
  // Extract data from government sources
  const naicsCodes = (naicsData['2022'] || []).flatMap((sector: any) =>
    (sector.subsectors || []).flatMap((subsector: any) =>
      (subsector.industryGroups || []).flatMap((group: any) =>
        (group.industries || []).flatMap((industry: any) =>
          (industry.nationalIndustries || []).map((national: any) => ({
            code: national.code,
            title: national.definition || national.title,
            description: national.description || industry.description || national.title
          }))
        )
      )
    )
  )
  
  // If no NAICS codes found, use fallback
  if (naicsCodes.length === 0) {
    naicsCodes.push({
      code: '541511',
      title: 'Custom Computer Programming Services',
      description: 'Information Technology Services'
    })
  }
  
  const setAsides = (setAsidesData.setAsides || setAsidesData || []).filter((sa: any) => sa.isActive !== false)
  
  // If no set-asides found, use fallback
  if (setAsides.length === 0) {
    setAsides.push({
      code: 'NONE',
      name: 'Full and Open Competition',
      description: 'No set-aside restrictions'
    })
  }
  
  const competencyCategories = Object.values(competenciesData.services_catalog || {})
  
  // Debug logging
  console.log('Competency categories loaded:', competencyCategories.length)
  if (competencyCategories.length > 0) {
    console.log('First category:', competencyCategories[0])
  }
  
  // Ensure we have competency categories
  if (competencyCategories.length === 0) {
    console.warn('No competency categories found, using fallback')
    competencyCategories.push({
      category: 'Information Technology',
      competencies: [
        { name: 'Software Development', id: 'software_dev' },
        { name: 'IT Support', id: 'it_support' },
        { name: 'Cloud Services', id: 'cloud_services' }
      ]
    })
  }
  
  return Array.from({ length: count }, (_, index) => {
    // Select random data elements
    const template = getRandomItem(OPPORTUNITY_TEMPLATES)
    const naics = getRandomItem(naicsCodes)
    const setAside = getRandomItem(setAsides)
    const agency = getRandomItem(template.agencies)
    const contractType = getRandomItem(template.contractTypes)
    const competencyCategory = getRandomItem(competencyCategories) as any
    let competencies = competencyCategory.competencies || []
    
    // If no competencies, use fallback
    if (!competencies || competencies.length === 0) {
      console.warn('No competencies found in category:', competencyCategory.category || 'unknown')
      competencies = [{ name: 'General Services', id: 'general' }]
    }
    
    const primaryService = getRandomItem(competencies)
    const supportingServices = competencies.length > 1 
      ? getRandomItems(competencies.filter(c => c.id !== primaryService.id), Math.min(2, competencies.length - 1))
      : []
    const { location, state, city, zipCode } = generateLocations(loadedLocationsData)
    
    // Generate values
    const deadline = generateDeadline(index)
    const postedDate = generatePostedDate(deadline)
    const contractValues = generateContractValue(naics.code)
    const solicitationNumber = `${AGENCY_CODES[agency] || 'GOV'}-${format(new Date(), 'yy')}-R-${(index + 1).toString().padStart(4, '0')}`
    
    // Build title and description
    const title = template.titleTemplate
      .replace('[SERVICE]', primaryService.name)
      .replace('[AGENCY]', agency)
    
    const serviceDescription = supportingServices.length > 0 
      ? supportingServices.map(s => s.name).join(', ')
      : `${primaryService.name} services and related support`
    const description = template.descriptionTemplate
      .replace(/\[SERVICE\]/g, primaryService.name)
      .replace(/\[AGENCY\]/g, agency)
      .replace(/\[DESCRIPTION\]/g, serviceDescription)
    
    // Generate security clearance requirements (30% of opportunities)
    const securityClearance = seededRandom.nextFloat() < 0.3 ? {
      level: getRandomItem(['PUBLIC_TRUST', 'SECRET', 'TOP_SECRET']) as 'PUBLIC_TRUST' | 'SECRET' | 'TOP_SECRET',
      facilityCleared: seededRandom.nextFloat() < 0.5,
      personnelCleared: Math.floor(seededRandom.nextFloat() * 20) + 1
    } : undefined

    // Generate relevant certifications from certifications.json (40% of opportunities)
    const relevantCertifications = seededRandom.nextFloat() < 0.4 ? (() => {
      const certCategories = certificationsData.certificationCategories || []
      if (certCategories.length === 0) return []
      
      const category = getRandomItem(certCategories)
      const certifications = category.certifications || []
      if (certifications.length === 0) return []
      
      return getRandomItems(certifications, Math.min(2, certifications.length)).map(cert => cert.id)
    })() : []

    // Generate procurement vehicle from vehicles.json (25% of opportunities)
    const procurementVehicle = seededRandom.nextFloat() < 0.25 ? (() => {
      const vehicles = vehiclesData.procurement_vehicles || []
      if (vehicles.length === 0) return null
      
      const vehicle = getRandomItem(vehicles)
      return {
        title: vehicle.title,
        fullName: vehicle.full_name,
        category: vehicle.category,
        agency: vehicle.agency
      }
    })() : null

    // Convert to AgencyInfo structure (needed for contact generation)
    const allAgencies = [
      ...(loadedAgenciesData.agencies?.departments || []),
      ...(loadedAgenciesData.agencies?.independentAgencies || []),
      ...(loadedAgenciesData.agencies?.subAgencies || []),
      ...(loadedAgenciesData.agencies?.offices || [])
    ]
    
    const randomAgency = allAgencies.length > 0 ? getRandomItem(allAgencies) : {
      code: AGENCY_CODES[agency] || 'GOV',
      name: agency,
      abbreviation: AGENCY_CODES[agency],
      type: 'department',
      isActive: true,
      contractingAuthority: true
    }
    
    const agencyInfo: AgencyInfo = {
      code: randomAgency.code,
      name: randomAgency.name,
      abbreviation: randomAgency.abbreviation,
      type: randomAgency.type,
      isActive: randomAgency.isActive,
      contractingAuthority: randomAgency.contractingAuthority,
      website: randomAgency.website,
      businessAreas: randomAgency.businessAreas,
      commonNaics: randomAgency.commonNaics,
      alternateNames: randomAgency.alternateNames
    }

    // Generate realistic point of contact data (80% of opportunities)
    const pointOfContact = seededRandom.nextFloat() < 0.8 ? (() => {
      const contactTypes = ['PRIMARY_POINT_OF_CONTACT', 'CONTRACTING_OFFICER', 'TECHNICAL_CONTACT', 'PROGRAM_MANAGER']
      const contactType = getRandomItem(contactTypes)
      
      // Generate realistic government contact names
      const firstNames = ['Sarah', 'Michael', 'Jennifer', 'David', 'Lisa', 'Robert', 'Ashley', 'Christopher', 'Amanda', 'James']
      const lastNames = ['Johnson', 'Williams', 'Brown', 'Davis', 'Miller', 'Wilson', 'Moore', 'Taylor', 'Anderson', 'Thomas']
      
      const firstName = getRandomItem(firstNames)
      const lastName = getRandomItem(lastNames)
      const agencyAbbrev = agencyInfo.abbreviation || agencyInfo.code || 'GOV'
      
      return [{
        firstName,
        lastName,
        fullName: `${firstName} ${lastName}`,  // Use camelCase to match ContactsSection expectations
        fullname: `${firstName} ${lastName}`, // Keep lowercase for backward compatibility
        name: `${firstName} ${lastName}`,     // Also provide 'name' field as fallback
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${agencyAbbrev.toLowerCase()}.gov`,
        phone: `${Math.floor(seededRandom.nextFloat() * 900) + 100}-${Math.floor(seededRandom.nextFloat() * 900) + 100}-${Math.floor(seededRandom.nextFloat() * 9000) + 1000}`,
        title: contactType === 'PRIMARY_POINT_OF_CONTACT' ? 'Program Specialist' :
               contactType === 'CONTRACTING_OFFICER' ? 'Contracting Officer' :
               contactType === 'TECHNICAL_CONTACT' ? 'Technical Lead' :
               'Program Manager',
        type: contactType,
        address: {
          city: agencyInfo.name?.includes('Department') ? 'Washington' : city,
          state: agencyInfo.name?.includes('Department') ? 'DC' : state,
          zipCode: agencyInfo.name?.includes('Department') ? '20001' : zipCode,
          country: 'USA'
        }
      }]
    })() : undefined
    
    // Map legacy set-aside codes to new enums
    const setAsideEnum = LEGACY_MAPPINGS.setAsideCodeToEnum[setAside.code as keyof typeof LEGACY_MAPPINGS.setAsideCodeToEnum] || SetAsideType.NONE
    
    // Generate contract type enum
    const contractTypeEnum = getRandomItem([
      ContractType.FFP,
      ContractType.CPFF,
      ContractType.TIME_AND_MATERIALS,
      ContractType.IDIQ,
      ContractType.BPA,
      ContractType.GSA_SCHEDULE
    ])
    
    // Generate source system (weighted toward active sources) - moved before oppTypeEnum
    const rand = seededRandom.nextFloat()
    const sourceSystem = rand < 0.4 ? SourceSystem.SAM_GOV :
                        rand < 0.7 ? SourceSystem.HIGHERGOV :
                        rand < 0.85 ? SourceSystem.GRANTS_GOV :
                        rand < 0.95 ? SourceSystem.USA_SPENDING :
                        SourceSystem.MANUAL
    
    // Generate comprehensive opportunity type enum based on source system
    const oppTypeEnum = (() => {
      if (sourceSystem === SourceSystem.GRANTS_GOV) {
        // Grant-specific types for Grants.gov
        return getRandomItem([
          OpportunityType.GRANT_DISCRETIONARY,
          OpportunityType.GRANT_CONTINUATION,
          OpportunityType.GRANT_MANDATORY,
          OpportunityType.GRANT_EARMARK,
          OpportunityType.COOPERATIVE_AGREEMENT
        ])
      } else if (sourceSystem === SourceSystem.USA_SPENDING) {
        // USASpending specific types
        return getRandomItem([
          OpportunityType.CONTRACT_AWARD,
          OpportunityType.CONTRACT_NEW,
          OpportunityType.CONTRACT_CONTINUE,
          OpportunityType.ASSISTANCE_BLOCK_GRANT,
          OpportunityType.ASSISTANCE_PROJECT_GRANT
        ])
      } else if (sourceSystem === SourceSystem.FPDS_NG) {
        // FPDS-NG contract award types
        return getRandomItem([
          OpportunityType.CONTRACT_AWARD,
          OpportunityType.DELIVERY_ORDER,
          OpportunityType.TASK_ORDER,
          OpportunityType.BPA_CALL,
          OpportunityType.PURCHASE_ORDER
        ])
      } else {
        // SAM.gov and HigherGov procurement types (most common)
        return getRandomItem([
          OpportunityType.SOLICITATION,
          OpportunityType.PRESOLICITATION,
          OpportunityType.RFP,
          OpportunityType.RFQ,
          OpportunityType.IFB,
          OpportunityType.SOURCES_SOUGHT,
          OpportunityType.SPECIAL_NOTICE,
          OpportunityType.AWARD_NOTICE,
          OpportunityType.COMBINED_SYNOPSIS,
          OpportunityType.GSA_SCHEDULE,
          OpportunityType.OASIS,
          OpportunityType.SEWP,
          OpportunityType.MICRO_PURCHASE
        ])
      }
    })()
    
    // Generate security clearance enum (30% of opportunities)
    const clearanceLevel = seededRandom.nextFloat() < 0.3 ? getRandomItem([
      SecurityClearanceLevel.PUBLIC_TRUST,
      SecurityClearanceLevel.SECRET,
      SecurityClearanceLevel.TOP_SECRET
    ]) : SecurityClearanceLevel.NONE

    // Generate CUID-compatible ID for proper database compatibility
    const generateCuidCompatibleId = (prefix: string, index: number): string => {
      // CUID format: c + timestamp_base36 + counter_base36 + fingerprint_base36 + random_base36
      // For mock data, we'll create a deterministic but CUID-compatible format
      const timestamp = Math.floor(Date.now() / 1000).toString(36)
      const counter = index.toString(36).padStart(4, '0')
      const fingerprint = 'mock'
      const random = seededRandom.nextFloat().toString(36).substr(2, 8)
      return `c${timestamp}${counter}${fingerprint}${random}`
    }

    // Create the comprehensive opportunity with new model structure
    const opportunity: Opportunity = {
      // Core identifiers
      id: generateCuidCompatibleId('realistic', index),
      organizationId: 'system', // Will be set by the system
      solicitationNumber,
      title,
      description,
      summary: `${primaryService.name} services for ${agencyInfo.name}`,
      
      // Agency Information (structured JSON)
      agency: agencyInfo,
      office: `${agencyInfo.name} Contracting Office`,
      
      // Timeline
      postedDate: new Date(postedDate),
      responseDeadline: new Date(deadline),
      performanceStartDate: addDays(new Date(deadline), 30),
      performanceEndDate: addDays(new Date(deadline), 395), // ~1 year contract
      lastModifiedDate: new Date(postedDate),

      // Classification using global enums
      opportunityType: oppTypeEnum,
      contractType: contractTypeEnum,
      setAsideType: setAsideEnum,
      competitionType: CompetitionType.FULL_AND_OPEN,

      // Financial information
      estimatedValue: contractValues.value,
      minimumValue: contractValues.min,
      maximumValue: contractValues.max,
      currency: 'USD',
      fundingAmount: sourceSystem === SourceSystem.GRANTS_GOV ? contractValues.value : undefined,
      awardCeiling: contractValues.max,

      // Award information (for historical data simulation)
      awardType: seededRandom.nextFloat() < 0.3 ? AwardType.CONTRACT : undefined,
      awardStatus: seededRandom.nextFloat() < 0.2 ? AwardStatus.AWARDED : undefined,
      awardee: seededRandom.nextFloat() < 0.2 ? `${getRandomItem(['Advanced', 'Strategic', 'Professional', 'Global', 'Elite'])} ${getRandomItem(['Solutions', 'Systems', 'Technologies', 'Consulting', 'Services'])} Inc.` : undefined,
      awardDate: seededRandom.nextFloat() < 0.2 ? addDays(new Date(deadline), Math.floor(seededRandom.nextFloat() * 30)) : undefined,
      awardAmount: seededRandom.nextFloat() < 0.2 ? contractValues.value * (0.8 + seededRandom.nextFloat() * 0.4) : undefined, // 80-120% of estimated

      // Geographic information - structured address objects
      placeOfPerformance: {
        addressLine1: undefined, // Performance location usually doesn't need specific address
        city: city,
        state: state,
        zipCode: zipCode,
        country: 'USA'
      },
      contractorLocation: seededRandom.nextFloat() < 0.7 ? {
        addressLine1: undefined, // Contractor location usually just city/state requirement
        city: city,
        state: state,
        zipCode: zipCode,
        country: 'USA'
      } : undefined, // 30% don't require specific contractor location
      
      // Legacy fields for backward compatibility and search optimization
      performanceCountry: 'USA',
      performanceState: state,
      performanceCity: city,
      performanceZipCode: zipCode,

      // Classification codes
      naicsCodes: [naics.code],
      pscCodes: [`D${Math.floor(seededRandom.nextFloat() * 400) + 100}`],
      cfda: sourceSystem === SourceSystem.GRANTS_GOV ? `${Math.floor(seededRandom.nextFloat() * 99) + 10}.${Math.floor(seededRandom.nextFloat() * 999) + 100}` : undefined,

      // Requirements
      securityClearanceRequired: clearanceLevel,
      procurementMethod: getRandomItem([
        ProcurementMethod.SEALED_BID,
        ProcurementMethod.COMPETITIVE_PROPOSALS,
        ProcurementMethod.GSA_SCHEDULE
      ]),
      contractDuration: getRandomItem([
        ContractDuration.ONE_YEAR,
        ContractDuration.TWO_YEARS,
        ContractDuration.THREE_YEARS,
        ContractDuration.OPTION_YEARS
      ]),
      competencies: [primaryService.name, ...supportingServices.map(s => s.name)],

      // Special requirements
      smallBusinessSetAside: setAsideEnum !== SetAsideType.NONE,
      facilityClearanceReq: clearanceLevel !== SecurityClearanceLevel.NONE && seededRandom.nextFloat() < 0.3,
      personnelClearanceReq: clearanceLevel !== SecurityClearanceLevel.NONE ? Math.floor(seededRandom.nextFloat() * 10) + 1 : 0,

      // Content
      fullText: `${title}\n\n${description}`,
      attachments: seededRandom.nextFloat() < 0.6 ? [
        { name: 'Solicitation Document.pdf', url: '/mock/solicitation.pdf', size: 2048000 },
        { name: 'Statement of Work.docx', url: '/mock/sow.docx', size: 512000 }
      ] : undefined,
      solicDocument: `/mock/solicitations/${solicitationNumber}.pdf`,
      qaDocument: seededRandom.nextFloat() < 0.4 ? `/mock/qa/${solicitationNumber}_qa.pdf` : undefined,
      amendments: seededRandom.nextFloat() < 0.2 ? [
        { number: 'Amendment 001', date: addDays(new Date(postedDate), 7), changes: 'Updated submission deadline' }
      ] : undefined,

      // Enhanced fields using structured data
      requiredCertifications: relevantCertifications,
      procurementVehicle: procurementVehicle,
      pointOfContact: pointOfContact,

      // Data source tracking
      sourceSystem,
      sourceId: `${sourceSystem}_${Math.floor(seededRandom.nextFloat() * 1000000)}`,
      sourceUrl: `https://${sourceSystem.toLowerCase().replace('_', '')}.example.com/opportunity/${solicitationNumber}`,
      lastSyncedAt: new Date(),
      dataHash: `hash_${seededRandom.nextFloat().toString(36).substr(2, 9)}`,

      // Status
      status: OpportunityStatus.ACTIVE,
      isArchived: false,
      
      // Analytics
      viewCount: Math.floor(seededRandom.nextFloat() * 100),
      saveCount: Math.floor(seededRandom.nextFloat() * 25),
      applicationCount: Math.floor(seededRandom.nextFloat() * 5),
      matchCount: Math.floor(seededRandom.nextFloat() * 50),

      // AI enhancements
      confidenceScore: 0.7 + seededRandom.nextFloat() * 0.3, // 0.7-1.0
      relevanceScore: 0.6 + seededRandom.nextFloat() * 0.4,  // 0.6-1.0
      embeddings: undefined, // Would be populated by AI service
      tags: [
        primaryService.name.toLowerCase().replace(/\s+/g, '_'),
        agencyInfo.abbreviation?.toLowerCase() || 'government',
        contractTypeEnum.toLowerCase()
      ],

      // Historical data (for USA Spending integration)
      historicalAwards: seededRandom.nextFloat() < 0.3 ? [
        { year: 2023, amount: contractValues.value * 0.9, winner: 'Previous Contractor LLC' },
        { year: 2022, amount: contractValues.value * 0.8, winner: 'Another Winner Inc.' }
      ] : undefined,
      competitorAnalysis: seededRandom.nextFloat() < 0.2 ? {
        topCompetitors: ['BigCorp Solutions', 'TechGiant Services', 'Professional Consulting Group'],
        winRateBySize: { small: 0.3, medium: 0.4, large: 0.3 }
      } : undefined,

      // System fields
      createdAt: new Date(postedDate),
      updatedAt: new Date(postedDate),
      
      // Backward compatibility fields
      externalId: `${sourceSystem}_${solicitationNumber}`,
      deadline: new Date(deadline),
      type: oppTypeEnum,
      contractValue: contractValues.value,
      contractValueMin: contractValues.min,
      contractValueMax: contractValues.max,
      location,
      state,
      city,
      zipCode,
      agencyCode: agencyInfo.code
    }
    
    return opportunity
  })
}

/**
 * Generate opportunities with specific set-aside types for testing
 */
export function createOpportunitiesWithSetAsides(setAsideTypes: string[], opportunitiesPerSetAside: number = 2): Opportunity[] {
  const allOpportunities: Opportunity[] = []
  
  for (const setAsideType of setAsideTypes) {
    const setAside = (governmentData.setAsidesData.setAsides || governmentData.setAsidesData).find((sa: any) => sa.code === setAsideType)
    if (!setAside) continue
    
    for (let i = 0; i < opportunitiesPerSetAside; i++) {
      const opportunities = createRealisticOpportunities(1)
      const opp = opportunities[0]
      
      // Override set-aside type and related fields with CUID-compatible ID
      const timestamp = Math.floor(Date.now() / 1000).toString(36)
      const counter = i.toString(36).padStart(4, '0')
      const fingerprint = setAsideType.toLowerCase().substr(0, 4)
      const random = Math.random().toString(36).substr(2, 8)
      opp.id = `c${timestamp}${counter}${fingerprint}${random}`
      opp.setAsideType = setAside.code
      opp.title = `${setAside.name} - ${opp.title}`
      opp.requiredCertifications = [setAsideType]
      
      allOpportunities.push(opp)
    }
  }
  
  return allOpportunities
}

/**
 * Generate opportunities in specific geographic locations for testing
 */
export function createOpportunitiesInLocations(stateCodes: string[], opportunitiesPerLocation: number = 2): Opportunity[] {
  const allOpportunities: Opportunity[] = []
  
  for (const stateCode of stateCodes) {
    const state = (governmentData.locationsData.locations?.states || []).find((s: any) => s.code === stateCode)
    if (!state) continue
    
    for (let i = 0; i < opportunitiesPerLocation; i++) {
      const opportunities = createRealisticOpportunities(1)
      const opp = opportunities[0]
      
      // Override location fields with CUID-compatible ID
      const county = state.counties?.[0] || { name: state.name }
      const timestamp = Math.floor(Date.now() / 1000).toString(36)
      const counter = i.toString(36).padStart(4, '0')
      const fingerprint = stateCode.toLowerCase()
      const random = Math.random().toString(36).substr(2, 8)
      opp.id = `c${timestamp}${counter}${fingerprint}${random}`
      opp.state = stateCode
      opp.location = `${county.name}, ${state.name}`
      opp.performanceLocation = `${county.name}, ${state.name}`
      opp.title = `${state.name} - ${opp.title}`
      
      allOpportunities.push(opp)
    }
  }
  
  return allOpportunities
}

/**
 * Export default generator for backward compatibility
 */
export { createRealisticOpportunities as default }