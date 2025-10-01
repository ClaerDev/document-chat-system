#!/usr/bin/env tsx

/**
 * Performance Test Seed Data for GovMatch AI
 * 
 * This script creates large datasets for performance testing, load testing,
 * and pagination testing to ensure the application scales properly.
 * 
 * Usage:
 *   tsx prisma/seed-performance.ts [count]
 *   
 * Examples:
 *   tsx prisma/seed-performance.ts          # Creates default dataset (1000 records)
 *   tsx prisma/seed-performance.ts 10000   # Creates 10,000 opportunities
 */

import { PrismaClient } from '@prisma/client'
import { faker } from '@faker-js/faker'
import { 
  OpportunityType,
  ContractType,
  SetAsideType,
  SourceSystem,
  OpportunityStatus
} from '../src/types/opportunity-enums'

const prisma = new PrismaClient()

// Configuration
const DEFAULT_RECORD_COUNT = 1000
const BATCH_SIZE = 100

// Government agencies for realistic data
const AGENCIES = [
  'Department of Defense', 'Department of Health and Human Services',
  'Department of Veterans Affairs', 'General Services Administration',
  'Department of Homeland Security', 'Department of Energy',
  'National Aeronautics and Space Administration', 'Department of Agriculture',
  'Department of Commerce', 'Department of Justice', 'Department of Transportation',
  'Environmental Protection Agency', 'Department of Education', 'Department of Labor'
]

// NAICS codes for IT/Professional services
const NAICS_CODES = [
  '541511', '541512', '541513', '541519', '541611', '541612', '541613', '541614',
  '541618', '541690', '541711', '541712', '541720', '541330', '541810', '541820'
]

// PSC codes for common services
const PSC_CODES = [
  'D302', 'D307', 'D316', 'D317', 'D399', 'R408', 'R410', 'R425', 'R497', 'R499'
]

// Contract types
const CONTRACT_TYPES = [
  ContractType.FFP,
  ContractType.CPFF, 
  ContractType.CPAF, 
  ContractType.TIME_AND_MATERIALS, 
  ContractType.IDIQ, 
  ContractType.GSA_SCHEDULE
]
const OPPORTUNITY_TYPES = [
  OpportunityType.RFP, 
  OpportunityType.RFQ, 
  OpportunityType.RFI, 
  OpportunityType.SOURCES_SOUGHT, 
  OpportunityType.SOURCES_SOUGHT
]
const SET_ASIDE_TYPES = [
  SetAsideType.SBA,
  SetAsideType.SBA_8A, 
  SetAsideType.HUBZONE_COMPETITIVE, 
  SetAsideType.SDVOSB_COMPETITIVE, 
  SetAsideType.WOSB, 
  SetAsideType.VOSB_COMPETITIVE
]

async function createPerformanceOrganizations(count: number = 50) {
  console.log(`📊 Creating ${count} performance test organizations...`)
  
  const organizations = []
  for (let i = 0; i < count; i++) {
    organizations.push({
      name: `${faker.company.name()} ${faker.company.buzzNoun()}`,
      slug: `perf-org-${i.toString().padStart(4, '0')}`,
      subscriptionStatus: faker.helpers.arrayElement(['ACTIVE', 'TRIALING', 'PAST_DUE'] as const),
      planType: faker.helpers.arrayElement(['STARTER', 'PROFESSIONAL', 'ENTERPRISE']),
      billingEmail: faker.internet.email(),
    })
  }

  // Insert in batches
  for (let i = 0; i < organizations.length; i += BATCH_SIZE) {
    const batch = organizations.slice(i, i + BATCH_SIZE)
    await prisma.organization.createMany({
      data: batch,
      skipDuplicates: true,
    })
  }

  console.log(`✅ Created ${count} performance test organizations`)
  return organizations
}

async function createPerformanceUsers(organizations: any[], usersPerOrg: number = 5) {
  console.log(`👥 Creating ${organizations.length * usersPerOrg} performance test users...`)
  
  const users = []
  const roles = ['OWNER', 'ADMIN', 'MEMBER', 'VIEWER'] as const
  
  for (let orgIndex = 0; orgIndex < organizations.length; orgIndex++) {
    const org = organizations[orgIndex]
    
    for (let userIndex = 0; userIndex < usersPerOrg; userIndex++) {
      const userNumber = orgIndex * usersPerOrg + userIndex
      users.push({
        clerkId: `perf_user_${userNumber.toString().padStart(6, '0')}`,
        email: `perf.user.${userNumber}@${org.slug}.test`,
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        role: userIndex === 0 ? 'OWNER' : faker.helpers.arrayElement(roles),
        organizationId: org.id || `perf-org-${orgIndex.toString().padStart(4, '0')}`, // Fallback for new orgs
        timezone: faker.helpers.arrayElement([
          'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
          'America/Phoenix', 'America/Anchorage', 'Pacific/Honolulu'
        ]),
        emailOptIn: faker.datatype.boolean(0.8), // 80% opt-in rate
      })
    }
  }

  // Insert in batches
  for (let i = 0; i < users.length; i += BATCH_SIZE) {
    const batch = users.slice(i, i + BATCH_SIZE)
    await prisma.user.createMany({
      data: batch,
      skipDuplicates: true,
    })
  }

  console.log(`✅ Created ${users.length} performance test users`)
  return users
}

async function createPerformanceOpportunities(count: number) {
  console.log(`🎯 Creating ${count} performance test opportunities...`)
  
  // Get a sample organization to assign opportunities to
  const org = await prisma.organization.findFirst({
    where: { slug: { startsWith: 'perf-org-' } }
  })
  
  if (!org) {
    throw new Error('No performance test organization found')
  }

  const opportunities = []
  const states = ['VA', 'DC', 'MD', 'CA', 'TX', 'NY', 'FL', 'WA', 'CO', 'IL']
  
  for (let i = 0; i < count; i++) {
    const postedDate = faker.date.between({
      from: new Date('2024-01-01'),
      to: new Date('2024-12-31')
    })
    
    const deadlineDate = faker.date.between({
      from: postedDate,
      to: new Date('2025-12-31')
    })

    const minValue = faker.number.int({ min: 100000, max: 1000000 })
    const maxValue = minValue * faker.number.float({ min: 1.5, max: 5.0 })
    
    opportunities.push({
      organizationId: org.id,
      solicitationNumber: `PERF-${i.toString().padStart(6, '0')}-${faker.number.int({ min: 1000, max: 9999 })}`,
      title: faker.lorem.words({ min: 3, max: 12 }),
      description: faker.lorem.paragraphs(3, '\n\n'),
      agency: faker.helpers.arrayElement(AGENCIES),
      office: `${faker.helpers.arrayElement(['Office of', 'Division of', 'Bureau of'])} ${faker.lorem.words(2)}`,
      location: `${faker.location.city()}, ${faker.helpers.arrayElement(states)}`,
      postedDate,
      responseDeadline: deadlineDate,
      performanceStartDate: faker.date.between({
        from: deadlineDate,
        to: new Date('2026-01-01')
      }),
      performanceEndDate: faker.date.between({
        from: new Date('2025-01-01'),
        to: new Date('2030-01-01')
      }),
      opportunityType: faker.helpers.arrayElement(OPPORTUNITY_TYPES),
      contractType: faker.helpers.arrayElement([...CONTRACT_TYPES, null]),
      setAsideType: faker.helpers.arrayElement([...SET_ASIDE_TYPES, null]),
      competitionType: faker.helpers.arrayElement([
        'Full and Open Competition',
        'Set-Aside',
        'Limited Sources',
        'Single Source'
      ]),
      estimatedValue: Math.round((minValue + maxValue) / 2),
      minimumValue: minValue,
      maximumValue: maxValue,
      naicsCodes: faker.helpers.arrayElements(NAICS_CODES, { min: 1, max: 3 }),
      pscCodes: faker.helpers.arrayElements(PSC_CODES, { min: 1, max: 2 }),
      placeOfPerformance: `${faker.location.city()}, ${faker.helpers.arrayElement(states)}`,
      contractorLocation: faker.helpers.arrayElement(['No Restrictions', ...states]),
      securityClearanceRequired: faker.helpers.arrayElement([
        'Not Required', 'Public Trust', 'Secret', 'Top Secret', null
      ]),
      procurementMethod: faker.helpers.arrayElement([
        'Open Market', 'GSA Schedule', 'SEWP', 'OASIS', 'SeaPort-e'
      ]),
      itSubcategories: faker.helpers.arrayElements([
        'Software Development', 'IT Support', 'Cybersecurity', 'Cloud Computing',
        'Data Analytics', 'AI/ML', 'DevOps', 'Network Infrastructure'
      ], { min: 1, max: 4 }),
      contractDuration: faker.helpers.arrayElement([
        'Short-term (< 1 year)', '1-2 years', '3-5 years', 'Long-term (5+ years)'
      ]),
      sourceSystem: faker.helpers.arrayElement(['SAM.gov', 'HigherGov', 'FedConnect']),
      sourceId: `PERF_${faker.string.alphanumeric(10)}`,
      sourceUrl: faker.internet.url(),
      status: faker.helpers.arrayElement(['ACTIVE', 'CLOSED', 'AMENDED']),
      fullText: faker.lorem.paragraphs(5, '\n\n'), // For search testing
    })
  }

  // Insert in batches
  for (let i = 0; i < opportunities.length; i += BATCH_SIZE) {
    const batch = opportunities.slice(i, i + BATCH_SIZE)
    console.log(`   Creating batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(opportunities.length / BATCH_SIZE)}...`)
    
    await prisma.opportunity.createMany({
      data: batch,
      skipDuplicates: true,
    })
  }

  console.log(`✅ Created ${count} performance test opportunities`)
  return opportunities
}

async function createPerformanceProfiles(users: any[], profilesPerUser: number = 1) {
  console.log(`🏢 Creating ${users.length * profilesPerUser} performance test profiles...`)
  
  const profiles = []
  const businessTypes = ['Corporation', 'LLC', 'Partnership', 'Sole Proprietorship']
  const employeeCounts = ['1-10', '11-50', '51-100', '101-500', '500+']
  const revenues = ['<$1M', '$1M-$5M', '$5M-$10M', '$10M-$50M', '$50M+']
  
  for (let userIndex = 0; userIndex < users.length; userIndex++) {
    const user = users[userIndex]
    
    for (let profileIndex = 0; profileIndex < profilesPerUser; profileIndex++) {
      const profileNumber = userIndex * profilesPerUser + profileIndex
      
      profiles.push({
        organizationId: user.organizationId,
        createdById: user.id || `perf_user_${userIndex.toString().padStart(6, '0')}`,
        companyName: `${faker.company.name()} ${faker.company.buzzNoun()}`,
        uei: `PERF${profileNumber.toString().padStart(12, '0')}`,
        duns: faker.string.numeric(9),
        cageCode: faker.string.alphanumeric(5).toUpperCase(),
        addressLine1: faker.location.streetAddress(),
        addressLine2: faker.datatype.boolean(0.3) ? faker.location.secondaryAddress() : null,
        city: faker.location.city(),
        state: faker.location.state({ abbreviated: true }),
        zipCode: faker.location.zipCode(),
        primaryContactName: `${faker.person.firstName()} ${faker.person.lastName()}`,
        primaryContactEmail: faker.internet.email(),
        primaryContactPhone: faker.phone.number(),
        website: faker.internet.url(),
        businessType: faker.helpers.arrayElement(businessTypes),
        yearEstablished: faker.number.int({ min: 1980, max: 2024 }),
        employeeCount: faker.helpers.arrayElement(employeeCounts),
        annualRevenue: faker.helpers.arrayElement(revenues),
        primaryNaics: faker.helpers.arrayElement(NAICS_CODES),
        secondaryNaics: faker.helpers.arrayElements(NAICS_CODES, { min: 0, max: 3 }),
        certifications: {
          sba8a: faker.datatype.boolean(0.15),
          hubzone: faker.datatype.boolean(0.1),
          sdvosb: faker.datatype.boolean(0.08),
          wosb: faker.datatype.boolean(0.12),
          vosb: faker.datatype.boolean(0.06),
        },
        coreCompetencies: faker.helpers.arrayElements([
          'Software Development', 'IT Consulting', 'Cybersecurity', 'Cloud Computing',
          'Data Analytics', 'Project Management', 'Systems Integration', 'DevOps',
          'AI/Machine Learning', 'Network Infrastructure', 'Database Management'
        ], { min: 2, max: 6 }),
        securityClearance: faker.helpers.arrayElement([
          'Not Required', 'Public Trust', 'Secret', 'Top Secret', null
        ]),
        profileCompleteness: faker.number.int({ min: 30, max: 100 }),
      })
    }
  }

  // Insert in batches
  for (let i = 0; i < profiles.length; i += BATCH_SIZE) {
    const batch = profiles.slice(i, i + BATCH_SIZE)
    console.log(`   Creating batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(profiles.length / BATCH_SIZE)}...`)
    
    await prisma.profile.createMany({
      data: batch,
      skipDuplicates: true,
    })
  }

  console.log(`✅ Created ${profiles.length} performance test profiles`)
  return profiles
}

async function createPerformanceMatchScores(count: number = 5000) {
  console.log(`🎯 Creating ${count} performance test match scores...`)
  
  // Get sample profiles and opportunities
  const profiles = await prisma.profile.findMany({
    where: { uei: { startsWith: 'PERF' } },
    take: 100,
  })
  
  const opportunities = await prisma.opportunity.findMany({
    where: { solicitationNumber: { startsWith: 'PERF-' } },
    take: 100,
  })
  
  if (profiles.length === 0 || opportunities.length === 0) {
    console.log('⚠️  No performance test profiles or opportunities found, skipping match scores')
    return
  }

  const matchScores: any[] = []
  for (let i = 0; i < count; i++) {
    const profile = faker.helpers.arrayElement(profiles)
    const opportunity = faker.helpers.arrayElement(opportunities)
    
    // Skip if this combination already exists
    const existingScore = matchScores.find(
      ms => ms.profileId === profile.id && ms.opportunityId === opportunity.id
    )
    if (existingScore) continue

    const overallScore = faker.number.float({ min: 0, max: 100, multipleOf: 0.1 })
    
    matchScores.push({
      organizationId: profile.organizationId,
      profileId: profile.id,
      opportunityId: opportunity.id,
      overallScore,
      naicsScore: faker.number.float({ min: 0, max: 100, multipleOf: 0.1 }),
      locationScore: faker.number.float({ min: 0, max: 100, multipleOf: 0.1 }),
      certificationScore: faker.number.float({ min: 0, max: 100, multipleOf: 0.1 }),
      experienceScore: faker.number.float({ min: 0, max: 100, multipleOf: 0.1 }),
      sizeScore: faker.number.float({ min: 0, max: 100, multipleOf: 0.1 }),
      scoringVersion: 'performance-test-v1.0',
      factors: {
        performance_test: {
          generated_at: new Date().toISOString(),
          test_iteration: i,
          score_tier: overallScore < 25 ? 'poor' : overallScore < 50 ? 'fair' : overallScore < 75 ? 'good' : 'excellent',
        },
      },
      explanation: `Performance test match score ${i + 1}: ${overallScore.toFixed(1)} overall match`,
      userRating: faker.datatype.boolean(0.3) ? faker.number.int({ min: 1, max: 5 }) : null,
    })
  }

  // Insert in batches
  for (let i = 0; i < matchScores.length; i += BATCH_SIZE) {
    const batch = matchScores.slice(i, i + BATCH_SIZE)
    console.log(`   Creating batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(matchScores.length / BATCH_SIZE)}...`)
    
    await prisma.matchScore.createMany({
      data: batch,
      skipDuplicates: true,
    })
  }

  console.log(`✅ Created ${matchScores.length} performance test match scores`)
}

async function main() {
  const recordCount = parseInt(process.argv[2]) || DEFAULT_RECORD_COUNT
  
  console.log('🚀 GovMatch AI - Performance Test Data Generator')
  console.log('=================================================')
  console.log(`Creating ${recordCount} opportunities and related test data...\n`)

  const startTime = Date.now()

  try {
    // Create organizations (scale with record count)
    const orgCount = Math.max(10, Math.floor(recordCount / 100))
    const organizations = await createPerformanceOrganizations(orgCount)
    
    // Create users (5 per organization)
    const users = await createPerformanceUsers(organizations, 5)
    
    // Create opportunities (main performance test data)
    await createPerformanceOpportunities(recordCount)
    
    // Create profiles (1 per user for performance testing)
    await createPerformanceProfiles(users, 1)
    
    // Create match scores (for search/filtering performance)
    const matchScoreCount = Math.min(recordCount * 2, 10000) // Cap at 10k for performance
    await createPerformanceMatchScores(matchScoreCount)
    
    const endTime = Date.now()
    const duration = ((endTime - startTime) / 1000).toFixed(2)
    
    console.log('\n🎉 Performance test data creation completed!')
    console.log(`⏱️  Total time: ${duration} seconds`)
    console.log(`📊 Created:`)
    console.log(`   - ${orgCount} organizations`)
    console.log(`   - ${users.length} users`)
    console.log(`   - ${recordCount} opportunities`)
    console.log(`   - ${users.length} profiles`)
    console.log(`   - ~${matchScoreCount} match scores`)
    
    console.log('\nUsage Tips:')
    console.log('- Use this data for pagination testing')
    console.log('- Test search performance with large datasets')
    console.log('- Validate database query optimization')
    console.log('- Test UI performance with large lists')
    console.log('- Run load tests against API endpoints')
    
  } catch (error) {
    console.error('❌ Error creating performance test data:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  main()
}

export { main as seedPerformance }