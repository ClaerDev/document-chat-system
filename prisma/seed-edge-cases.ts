#!/usr/bin/env tsx

/**
 * Edge Case Seed Data for GovMatch AI
 * 
 * This script creates specialized test data scenarios for edge cases,
 * boundary conditions, and error testing to ensure robust application behavior.
 * 
 * Usage:
 *   tsx prisma/seed-edge-cases.ts
 */

import { PrismaClient } from '@prisma/client'
import { 
  OpportunityType,
  ContractType,
  SetAsideType,
  CompetitionType,
  SecurityClearanceLevel,
  ProcurementMethod,
  ContractDuration,
  SourceSystem,
  OpportunityStatus
} from '../src/types/opportunity-enums'

const prisma = new PrismaClient()

async function createEdgeCaseData() {
  console.log('🧪 Creating edge case test data...')

  // Edge Case 1: Organization with minimal required data
  const minimalOrg = await prisma.organization.upsert({
    where: { slug: 'minimal-org' },
    update: {},
    create: {
      name: 'Minimal Org',
      slug: 'minimal-org',
      subscriptionStatus: 'TRIALING', // Edge case: trial status
    },
  })

  // Edge Case 2: User with no optional fields
  const minimalUser = await prisma.user.upsert({
    where: { email: 'minimal@test.com' },
    update: {},
    create: {
      clerkId: 'minimal_user_clerk_id',
      email: 'minimal@test.com',
      organizationId: minimalOrg.id,
      role: 'VIEWER', // Edge case: lowest privilege role
      emailOptIn: false, // Edge case: opted out
    },
  })

  // Edge Case 3: Profile with maximum data lengths and edge values
  const maxDataProfile = await prisma.profile.upsert({
    where: { id: 'max-data-profile-id' },
    update: {},
    create: {
      organizationId: minimalOrg.id,
      createdById: minimalUser.id,
      companyName: 'A'.repeat(255), // Maximum length company name
      dbaName: 'B'.repeat(255), // Maximum length DBA name
      uei: 'MAX_DATA_UEI_12345678901234567890',
      duns: '999999999', // Edge case: max DUNS
      cageCode: 'Z9Z9Z',
      addressLine1: 'C'.repeat(255), // Maximum address length
      addressLine2: 'D'.repeat(255),
      city: 'E'.repeat(100),
      state: 'ZZ', // Non-standard state code
      zipCode: '99999-9999', // Maximum zip format
      primaryContactName: 'F'.repeat(100),
      primaryContactEmail: 'verylongemailaddress@verylongdomainname.com',
      primaryContactPhone: '+1-999-999-9999 ext 99999',
      website: 'https://very-long-website-name-for-testing-purposes.com',
      businessType: 'Limited Liability Partnership', // Long business type
      yearEstablished: 1800, // Very old establishment year
      employeeCount: '10,000+', // Large employee count
      annualRevenue: '$1B+', // Large revenue
      primaryNaics: '999999', // Edge case NAICS
      secondaryNaics: Array.from({length: 10}, (_, i) => `99999${i}`), // Many secondary NAICS
      certifications: {
        sba8a: true,
        hubzone: true,
        sdvosb: true,
        wosb: true,
        vosb: true,
        custom_cert_1: true,
        custom_cert_2: true,
      },
      coreCompetencies: Array.from({length: 20}, (_, i) => `Competency ${i + 1}`), // Many competencies
      securityClearance: 'Top Secret/SCI with Polygraph', // Highest clearance
      profileCompleteness: 100, // Perfect completion
    },
  })

  // Edge Case 4: Opportunity with extreme values
  const extremeOpportunity = await prisma.opportunity.upsert({
    where: { solicitationNumber: 'EXTREME-TEST-999999999' },
    update: {},
    create: {
      organizationId: minimalOrg.id,
      solicitationNumber: 'EXTREME-TEST-999999999',
      title: 'X'.repeat(500), // Very long title
      description: 'Y'.repeat(10000), // Very long description
      agency: 'Department of Extremely Long Agency Names and Complex Organizational Structures',
      office: 'Office of Very Specific and Detailed Specialized Operations',
      location: 'Remote/Virtual/Worldwide/Multiple Locations/To Be Determined',
      postedDate: new Date('1999-01-01'), // Very old posting
      responseDeadline: new Date('2099-12-31'), // Far future deadline
      performanceStartDate: new Date('2030-01-01'),
      performanceEndDate: new Date('2050-12-31'), // Very long performance period
      opportunityType: OpportunityType.RFP,
      contractType: ContractType.CPAF,
      setAsideType: SetAsideType.SBA_8A as any,
      competitionType: CompetitionType.LIMITED_SOURCES,
      estimatedValue: 999999999999, // Extremely large value
      minimumValue: 1, // Minimum possible value
      maximumValue: 999999999999,
      naicsCodes: Array.from({length: 50}, (_, i) => `${999990 + i}`), // Many NAICS codes
      pscCodes: Array.from({length: 30}, (_, i) => `Z99${i.toString().padStart(2, '0')}`), // Many PSC codes
      placeOfPerformance: 'Worldwide, including OCONUS, Remote, Virtual, Customer Sites, Government Facilities',
      contractorLocation: 'No Geographic Restrictions',
      securityClearanceRequired: SecurityClearanceLevel.SECRET as any,
      procurementMethod: ProcurementMethod.COMPETITIVE_PROPOSALS,
      itSubcategories: [
        'Artificial Intelligence', 'Machine Learning', 'Quantum Computing',
        'Blockchain', 'IoT', 'Edge Computing', 'DevSecOps', 'Zero Trust',
        'Cloud Native', 'Microservices', 'Containerization', 'Serverless'
      ],
      contractDuration: ContractDuration.OVER_5_YEARS,
      sourceSystem: SourceSystem.HIGHERGOV,
      sourceId: 'EXTREME_TEST_ID_999999999',
      sourceUrl: 'https://extremely-long-government-website-url-for-testing-purposes.mil/solicitations',
      status: OpportunityStatus.ACTIVE,
    },
  })

  // Edge Case 5: Match score with extreme values
  await prisma.matchScore.upsert({
    where: {
      profileId_opportunityId: {
        profileId: maxDataProfile.id,
        opportunityId: extremeOpportunity.id,
      },
    },
    update: {},
    create: {
      organizationId: minimalOrg.id,
      profileId: maxDataProfile.id,
      opportunityId: extremeOpportunity.id,
      overallScore: 0.1, // Extremely low score
      naicsScore: 100.0, // Perfect NAICS match
      locationScore: 0.0, // No location match
      certificationScore: 100.0, // Perfect certification match
      experienceScore: 50.0, // Moderate experience
      sizeScore: 0.0, // No size match
      scoringVersion: 'edge-case-v1.0',
      factors: {
        edge_cases: {
          multiple_naics_matches: 25,
          extreme_values_handled: true,
          boundary_conditions_tested: true,
          null_field_handling: 'graceful',
          empty_array_handling: 'safe',
          max_length_fields: 'truncated_safely',
        },
        performance_metrics: {
          calculation_time_ms: 9999,
          complexity_score: 100,
          data_quality_issues: 15,
        },
      },
      explanation: 'Edge case test: Profile with maximum data complexity matched against opportunity with extreme requirements. Low overall score due to size mismatch despite perfect NAICS and certification alignment.',
      userRating: 1, // Lowest possible rating
      userFeedback: 'This is a test feedback comment for edge case scenarios with various special characters: !@#$%^&*()_+-=[]{}|;:,.<>?',
    },
  })

  // Edge Case 6: Organization with expired subscription
  const expiredOrg = await prisma.organization.upsert({
    where: { slug: 'expired-sub-org' },
    update: {},
    create: {
      name: 'Expired Subscription Org',
      slug: 'expired-sub-org',
      subscriptionStatus: 'PAST_DUE', // Edge case: expired subscription
      planType: 'ENTERPRISE',
      billingEmail: 'expired@billing.test',
    },
  })

  // Edge Case 7: User with special characters in name
  const specialCharUser = await prisma.user.upsert({
    where: { email: 'special.chars+test@domain-with-dashes.co.uk' },
    update: {},
    create: {
      clerkId: 'special_char_user_id',
      email: 'special.chars+test@domain-with-dashes.co.uk',
      firstName: "Jean-François O'Brien-Smith",
      lastName: "van der Berg-González",
      organizationId: expiredOrg.id,
      role: 'ADMIN',
      timezone: 'America/Argentina/Buenos_Aires', // Complex timezone
    },
  })

  // Edge Case 8: Future-dated opportunities (for date handling testing)
  const futureOpportunity = await prisma.opportunity.upsert({
    where: { solicitationNumber: 'FUTURE-OPP-2099' },
    update: {},
    create: {
      organizationId: expiredOrg.id,
      solicitationNumber: 'FUTURE-OPP-2099',
      title: 'Future Technology Opportunity',
      description: 'Opportunity posted in the future for testing date handling',
      agency: 'Future Technology Agency',
      postedDate: new Date('2099-01-01'),
      responseDeadline: new Date('2099-12-31'),
      opportunityType: OpportunityType.RFP,
      contractType: ContractType.FFP,
      estimatedValue: 0, // Zero value edge case
      naicsCodes: ['000000'], // Edge case NAICS
      pscCodes: ['0000'],
      sourceSystem: SourceSystem.SAM_GOV,
      status: OpportunityStatus.DRAFT, // Edge case status
    },
  })

  // Edge Case 9: Profile with incomplete data (testing required field validation)
  const incompleteProfile = await prisma.profile.upsert({
    where: { id: 'incomplete-profile-id' },
    update: {},
    create: {
      organizationId: expiredOrg.id,
      createdById: specialCharUser.id,
      companyName: 'Incomplete Profile Test Company',
      uei: 'INCOMPLETE_UEI_TEST',
      // Deliberately missing many optional fields
      profileCompleteness: 15, // Very low completion
      certifications: {}, // Empty certifications
      coreCompetencies: [], // Empty competencies
      secondaryNaics: [], // Empty secondary NAICS
    },
  })

  // Edge Case 10: API usage with edge values
  await prisma.usageRecord.create({
    data: {
      organizationId: expiredOrg.id,
      usageType: 'AI_QUERY',
      quantity: 99999, // Very high usage
      periodStart: new Date('2024-01-01'),
      periodEnd: new Date('2024-01-01'), // Same day period
      resourceId: 'edge_case_resource',
      resourceType: 'edge_test',
      metadata: {
        edge_case_testing: true,
        extreme_values: [0, -1, 99999],
        special_characters: '!@#$%^&*()_+-=[]{}|;:,.<>?',
        unicode_test: '🚀📊💼🔒🌐',
        empty_values: {
          empty_string: '',
          empty_array: [],
          empty_object: {},
        },
      },
    },
  })

  console.log('✅ Edge case test data created successfully')
  console.log(`   - Minimal organization: ${minimalOrg.slug}`)
  console.log(`   - Maximum data profile: ${maxDataProfile.companyName.substring(0, 30)}...`)
  console.log(`   - Extreme opportunity: ${extremeOpportunity.solicitationNumber}`)
  console.log(`   - Expired subscription org: ${expiredOrg.slug}`)
  console.log(`   - Future opportunity: ${futureOpportunity.solicitationNumber}`)
  console.log(`   - Incomplete profile: ${incompleteProfile.companyName}`)
}

async function createBoundaryTestData() {
  console.log('🎯 Creating boundary condition test data...')

  // Boundary Case 1: Organizations at subscription limits
  const limitTestOrg = await prisma.organization.upsert({
    where: { slug: 'limit-test-org' },
    update: {},
    create: {
      name: 'Limit Test Organization',
      slug: 'limit-test-org',
      subscriptionStatus: 'ACTIVE',
      planType: 'STARTER',
    },
  })

  // Create exactly 1 user (starter plan limit)
  const limitUser = await prisma.user.upsert({
    where: { email: 'limit.user@test.com' },
    update: {},
    create: {
      clerkId: 'limit_user_clerk_id',
      email: 'limit.user@test.com',
      firstName: 'Limit',
      lastName: 'User',
      organizationId: limitTestOrg.id,
      role: 'OWNER',
    },
  })

  // Boundary Case 2: Profile at various completion percentages
  const boundaryCompletions = [0, 1, 25, 50, 75, 99, 100]
  
  for (const completion of boundaryCompletions) {
    await prisma.profile.upsert({
      where: { id: `boundary-${completion}-percent-profile-id` },
      update: {},
      create: {
        organizationId: limitTestOrg.id,
        createdById: limitUser.id,
        companyName: `${completion}% Complete Profile Company`,
        uei: `BOUNDARY_${completion}_PERCENT`,
        profileCompleteness: completion,
        // Add fields based on completion percentage
        ...(completion > 0 && { duns: '123456789' }),
        ...(completion > 25 && { cageCode: 'TEST1' }),
        ...(completion > 50 && { addressLine1: 'Test Address' }),
        ...(completion > 75 && { primaryContactEmail: 'contact@test.com' }),
        ...(completion === 100 && { 
          website: 'https://complete.test.com',
          yearEstablished: 2020,
          businessType: 'Corporation',
        }),
      },
    })
  }

  // Boundary Case 3: Match scores at boundary values
  const opportunity = await prisma.opportunity.upsert({
    where: { solicitationNumber: 'BOUNDARY-TEST-001' },
    update: {},
    create: {
      organizationId: limitTestOrg.id,
      solicitationNumber: 'BOUNDARY-TEST-001',
      title: 'Boundary Test Opportunity',
      description: 'Opportunity for testing boundary conditions',
      agency: 'Test Agency',
      estimatedValue: 25000, // Small business threshold boundary
      naicsCodes: ['541511'],
      pscCodes: ['D302'],
      sourceSystem: SourceSystem.SAM_GOV,
      status: OpportunityStatus.ACTIVE,
    },
  })

  const profile = await prisma.profile.findFirst({
    where: { companyName: '100% Complete Profile Company' },
  })

  if (profile) {
    const boundaryScores = [0.0, 0.1, 24.9, 25.0, 49.9, 50.0, 74.9, 75.0, 99.9, 100.0]
    
    for (let i = 0; i < boundaryScores.length; i++) {
      const score = boundaryScores[i]
      await prisma.matchScore.upsert({
        where: {
          profileId_opportunityId: {
            profileId: profile.id,
            opportunityId: opportunity.id,
          },
        },
        update: {
          overallScore: score,
        },
        create: {
          organizationId: limitTestOrg.id,
          profileId: profile.id,
          opportunityId: opportunity.id,
          overallScore: score,
          naicsScore: score,
          locationScore: score,
          certificationScore: score,
          experienceScore: score,
          sizeScore: score,
          scoringVersion: 'boundary-test-v1.0',
          factors: {
            boundary_test: {
              score_tier: score < 25 ? 'poor' : score < 50 ? 'fair' : score < 75 ? 'good' : 'excellent',
              boundary_value: score,
              test_iteration: i,
            },
          },
          explanation: `Boundary test score: ${score} (${score < 25 ? 'Poor' : score < 50 ? 'Fair' : score < 75 ? 'Good' : 'Excellent'} match)`,
        },
      })
    }
  }

  console.log('✅ Boundary condition test data created successfully')
}

async function main() {
  console.log('🧪 GovMatch AI - Edge Case Seed Data Generator')
  console.log('===============================================')

  try {
    await createEdgeCaseData()
    await createBoundaryTestData()
    
    console.log('\n🎉 All edge case and boundary test data created successfully!')
    console.log('\nUsage Tips:')
    console.log('- Use this data to test form validation')
    console.log('- Test pagination with large datasets')
    console.log('- Validate error handling with edge cases')
    console.log('- Test UI behavior with long text fields')
    console.log('- Verify match scoring with boundary conditions')
    
  } catch (error) {
    console.error('❌ Error creating edge case test data:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  main()
}

export { main as seedEdgeCases }