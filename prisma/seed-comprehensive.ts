/**
 * Comprehensive Database Seeding Script
 * 
 * Seeds the database with realistic test data using centralized factories.
 * This creates all internal data that the app needs for development/testing.
 * 
 * External opportunities come from mock APIs, not the database.
 */

import { PrismaClient } from '@prisma/client'
import { 
  createOrganization,
  createUser,
  createProfile,
  createBillingSubscription,
  createUsageRecord,
  createMatchScore,
  OrganizationBuilder,
  ProfileBuilder,
  UserBuilder,
  MatchScoreBuilder,
  TEST_ORGANIZATIONS,
  TEST_USERS,
  TEST_PROFILES,
  TEST_CERTIFICATIONS,
  TEST_NAICS_CODES,
} from '../src/lib/test-data'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting comprehensive database seeding...')

  // Clean existing data
  console.log('🧹 Cleaning existing data...')
  await prisma.usageRecord.deleteMany()
  await prisma.matchScore.deleteMany()
  await prisma.opportunityNote.deleteMany()
  await prisma.opportunityApplication.deleteMany()
  await prisma.savedOpportunity.deleteMany()
  await prisma.subscription.deleteMany()
  await prisma.document.deleteMany()
  await prisma.opportunity.deleteMany()
  await prisma.profile.deleteMany()
  await prisma.user.deleteMany()
  await prisma.organization.deleteMany()
  console.log('✅ Cleaned existing data')

  // 1. Create Organizations
  console.log('🏢 Creating organizations...')
  
  const acmeOrg = await prisma.organization.create({
    data: {
      name: 'ACME Government Contracting LLC',
      slug: 'acme-contracting',
      planType: 'PROFESSIONAL',
      subscriptionStatus: 'ACTIVE',
      billingEmail: 'billing@acmecontracting.com',
    }
  })

  const techSolutionsOrg = await prisma.organization.create({
    data: {
      name: 'Tech Solutions Federal Inc',
      slug: 'tech-solutions',
      planType: 'STARTER',
      subscriptionStatus: 'ACTIVE',
      billingEmail: 'billing@techsolutionsfederal.com',
    }
  })

  const cyberDefenseOrg = await prisma.organization.create({
    data: {
      name: 'CyberDefense Systems Corp',
      slug: 'cyber-defense',
      planType: 'ENTERPRISE',
      subscriptionStatus: 'ACTIVE',
      billingEmail: 'billing@cyberdefensesys.com',
    }
  })

  console.log(`✅ Created ${[acmeOrg, techSolutionsOrg, cyberDefenseOrg].length} organizations`)

  // 2. Create Users for each organization
  console.log('👥 Creating users...')
  
  // ACME Users
  const acmeOwner = await prisma.user.create({
    data: {
      clerkId: 'user_acme_owner',
      email: 'john.doe@acmecontracting.com',
      firstName: 'John',
      lastName: 'Doe',
      role: 'OWNER',
      organizationId: acmeOrg.id,
      timezone: 'America/New_York',
      emailOptIn: true,
      lastActiveAt: new Date(),
    }
  })

  const acmeAdmin = await prisma.user.create({
    data: {
      clerkId: 'user_acme_admin',
      email: 'jane.smith@acmecontracting.com',
      firstName: 'Jane',
      lastName: 'Smith',
      role: 'ADMIN',
      organizationId: acmeOrg.id,
      timezone: 'America/New_York',
      emailOptIn: true,
      lastActiveAt: new Date(),
    }
  })

  const acmeMember = await prisma.user.create({
    data: {
      clerkId: 'user_acme_member',
      email: 'bob.wilson@acmecontracting.com',
      firstName: 'Bob',
      lastName: 'Wilson',
      role: 'MEMBER',
      organizationId: acmeOrg.id,
      timezone: 'America/New_York',
      emailOptIn: true,
      lastActiveAt: new Date(),
    }
  })

  // Tech Solutions Users
  const techOwner = await prisma.user.create({
    data: {
      clerkId: 'user_tech_owner',
      email: 'sarah.johnson@techsolutionsfederal.com',
      firstName: 'Sarah',
      lastName: 'Johnson',
      role: 'OWNER',
      organizationId: techSolutionsOrg.id,
      timezone: 'America/New_York',
      emailOptIn: true,
      lastActiveAt: new Date(),
    }
  })

  const techMember = await prisma.user.create({
    data: {
      clerkId: 'user_tech_member',
      email: 'mike.davis@techsolutionsfederal.com',
      firstName: 'Mike',
      lastName: 'Davis',
      role: 'MEMBER',
      organizationId: techSolutionsOrg.id,
      timezone: 'America/New_York',
      emailOptIn: true,
      lastActiveAt: new Date(),
    }
  })

  // CyberDefense Users
  const cyberOwner = await prisma.user.create({
    data: {
      clerkId: 'user_cyber_owner',
      email: 'alex.rodriguez@cyberdefensesys.com',
      firstName: 'Alex',
      lastName: 'Rodriguez',
      role: 'OWNER',
      organizationId: cyberDefenseOrg.id,
      timezone: 'America/New_York',
      emailOptIn: true,
      lastActiveAt: new Date(),
    }
  })

  const allUsers = [acmeOwner, acmeAdmin, acmeMember, techOwner, techMember, cyberOwner]
  console.log(`✅ Created ${allUsers.length} users`)

  // 3. Create Profiles for each organization
  console.log('📋 Creating profiles...')

  // ACME Profile - Small Business with 8(a) and HUBZone
  const acmeProfile = await prisma.profile.create({
    data: {
      organizationId: acmeOrg.id,
      createdById: acmeOwner.id,
      updatedById: acmeOwner.id,
      companyName: 'ACME Government Contracting LLC',
      dbaName: 'ACME Contracting',
      uei: 'UEI123456789ACME',
      cageCode: 'ACME1',
      addressLine1: '1234 Government Way',
      city: 'Arlington',
      state: 'VA',
      zipCode: '22204',
      country: 'USA',
      primaryContactName: 'John Doe',
      primaryContactEmail: 'john.doe@acmecontracting.com',
      primaryContactPhone: '+1-555-123-4567',
      yearEstablished: 2015,
      employeeCount: '25',
      annualRevenue: '$5,000,000',
      primaryNaics: '541511',
      secondaryNaics: ['541512', '541513'],
      certifications: {
        has8a: true,
        hasHubZone: true,
        hasSdvosb: false,
        hasWosb: false,
        hasEdwosb: false,
        hasVosb: false,
        hasSdb: false
      },
      coreCompetencies: ['Software Development', 'Cloud Computing', 'Cybersecurity', 'Data Analytics'],
      securityClearance: 'SECRET',
      profileCompleteness: 95,
    }
  })

  // Tech Solutions Profile - Woman-Owned Small Business
  const techProfile = await prisma.profile.create({
    data: {
      organizationId: techSolutionsOrg.id,
      createdById: techOwner.id,
      updatedById: techOwner.id,
      companyName: 'Tech Solutions Federal Inc',
      dbaName: 'Tech Solutions',
      uei: 'UEI123456789TECH',
      cageCode: 'TECH1',
      addressLine1: '5678 Innovation Blvd',
      city: 'Reston',
      state: 'VA',
      zipCode: '20190',
      country: 'USA',
      primaryContactName: 'Sarah Johnson',
      primaryContactEmail: 'sarah.johnson@techsolutionsfederal.com',
      primaryContactPhone: '+1-555-987-6543',
      yearEstablished: 2012,
      employeeCount: '50',
      annualRevenue: '$8,000,000',
      primaryNaics: '541611',
      secondaryNaics: ['541511'],
      certifications: {
        has8a: false,
        hasHubZone: false,
        hasSdvosb: false,
        hasWosb: true,
        hasEdwosb: false,
        hasVosb: false,
        hasSdb: false
      },
      coreCompetencies: ['Management Consulting', 'Digital Transformation', 'Process Improvement'],
      securityClearance: 'PUBLIC_TRUST',
      profileCompleteness: 88,
    }
  })

  // CyberDefense Profile - Large Defense Contractor
  const cyberProfile = await prisma.profile.create({
    data: {
      organizationId: cyberDefenseOrg.id,
      createdById: cyberOwner.id,
      updatedById: cyberOwner.id,
      companyName: 'CyberDefense Systems Corp',
      dbaName: 'CyberDefense',
      uei: 'UEI123456789CYBER',
      cageCode: 'CYBER',
      addressLine1: '9012 Defense Plaza',
      city: 'McLean',
      state: 'VA',
      zipCode: '22102',
      country: 'USA',
      primaryContactName: 'Alex Rodriguez',
      primaryContactEmail: 'alex.rodriguez@cyberdefensesys.com',
      primaryContactPhone: '+1-555-456-7890',
      yearEstablished: 2005,
      employeeCount: '500',
      annualRevenue: '$75,000,000',
      primaryNaics: '541513',
      secondaryNaics: ['541330', '541712'],
      certifications: {
        has8a: false,
        hasHubZone: false,
        hasSdvosb: false,
        hasWosb: false,
        hasEdwosb: false,
        hasVosb: false,
        hasSdb: false
      },
      coreCompetencies: ['Cybersecurity', 'Defense Systems', 'Threat Intelligence', 'Security Operations'],
      securityClearance: 'TOP_SECRET',
      profileCompleteness: 100,
    }
  })

  const allProfiles = [acmeProfile, techProfile, cyberProfile]
  console.log(`✅ Created ${allProfiles.length} profiles`)

  // 4. Create Billing Subscriptions
  console.log('💳 Creating billing subscriptions...')

  const acmeSubscription = await prisma.subscription.create({
    data: {
      organizationId: acmeOrg.id,
      stripeSubscriptionId: 'sub_acme_professional',
      stripePriceId: 'price_professional_monthly',
      stripeCustomerId: 'cus_acme_contracting',
      planType: 'PROFESSIONAL',
      status: 'ACTIVE',
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      amount: 19900, // $199.00 in cents
      currency: 'usd',
      interval: 'month',
      features: {
        maxUsers: 10,
        maxOpportunities: 1000,
        apiAccess: true,
        customIntegrations: true,
        prioritySupport: true,
      },
      limits: {
        opportunityMatches: 1000,
        aiQueries: 500,
        documentProcessing: 100,
        apiCalls: 10000,
      },
    }
  })

  const techSubscription = await prisma.subscription.create({
    data: {
      organizationId: techSolutionsOrg.id,
      stripeSubscriptionId: 'sub_tech_starter',
      stripePriceId: 'price_starter_monthly',
      stripeCustomerId: 'cus_tech_solutions',
      planType: 'STARTER',
      status: 'ACTIVE',
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      amount: 4900, // $49.00 in cents
      currency: 'usd',
      interval: 'month',
      features: {
        maxUsers: 5,
        maxOpportunities: 500,
        apiAccess: false,
        customIntegrations: false,
        prioritySupport: false,
      },
      limits: {
        opportunityMatches: 500,
        aiQueries: 100,
        documentProcessing: 25,
        apiCalls: 1000,
      },
    }
  })

  const cyberSubscription = await prisma.subscription.create({
    data: {
      organizationId: cyberDefenseOrg.id,
      stripeSubscriptionId: 'sub_cyber_enterprise',
      stripePriceId: 'price_enterprise_monthly',
      stripeCustomerId: 'cus_cyber_defense',
      planType: 'ENTERPRISE',
      status: 'ACTIVE',
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      amount: 99900, // $999.00 in cents
      currency: 'usd',
      interval: 'month',
      features: {
        maxUsers: 100,
        maxOpportunities: 10000,
        apiAccess: true,
        customIntegrations: true,
        prioritySupport: true,
      },
      limits: {
        opportunityMatches: 10000,
        aiQueries: 2000,
        documentProcessing: 500,
        apiCalls: 100000,
      },
    }
  })

  console.log(`✅ Created 3 billing subscriptions`)

  // 5. Create Usage Records
  console.log('📊 Creating usage records...')

  const usageRecords = []
  const usageTypes = ['OPPORTUNITY_MATCH', 'AI_QUERY', 'DOCUMENT_PROCESSING', 'API_CALL', 'EXPORT']
  
  // Create usage records for the past 30 days
  for (let i = 0; i < 30; i++) {
    const date = new Date()
    date.setDate(date.getDate() - i)
    
    for (const org of [acmeOrg, techSolutionsOrg, cyberDefenseOrg]) {
      for (const type of usageTypes) {
        const quantity = Math.floor(Math.random() * 20) + 1
        
        const usageRecord = await prisma.usageRecord.create({
          data: {
            organizationId: org.id,
            subscriptionId: org.id === acmeOrg.id ? acmeSubscription.id : 
                           org.id === techSolutionsOrg.id ? techSubscription.id : 
                           cyberSubscription.id,
            usageType: type as any,
            quantity,
            periodStart: new Date(date.getFullYear(), date.getMonth(), 1),
            periodEnd: new Date(date.getFullYear(), date.getMonth() + 1, 0),
            createdAt: date,
          }
        })
        
        usageRecords.push(usageRecord)
      }
    }
  }

  console.log(`✅ Created ${usageRecords.length} usage records`)

  // 6. Create Some Saved Opportunities (user interactions with external opportunities)
  console.log('🎯 Creating saved opportunities...')

  const savedOpportunities = []
  
  // ACME saves some opportunities
  for (let i = 1; i <= 5; i++) {
    const saved = await prisma.savedOpportunity.create({
      data: {
        organizationId: acmeOrg.id,
        userId: acmeOwner.id,
        externalOpportunityId: `EXT_OPP_${i}`,
        sourceSystem: 'HIGHERGOV',
        sourceUrl: `https://www.highergov.com/opportunity/EXT_OPP_${i}`,
        title: `IT Modernization Services Contract ${i}`,
        agency: 'Department of Defense',
        solicitation: `DOD-24-R-000${i}`,
        dueDate: new Date(Date.now() + (30 + i) * 24 * 60 * 60 * 1000), // Due in 30+ days
        estimatedValue: { min: 1000000 * i, max: 5000000 * i, currency: 'USD' },
        tags: ['IT', 'Modernization', 'Cloud'],
        notes: `This looks like a good fit for our capabilities. Estimated win probability: ${70 + i * 5}%`,
        priority: i <= 2 ? 'HIGH' : i <= 4 ? 'MEDIUM' : 'LOW',
        status: i === 1 ? 'PURSUING' : 'SAVED',
      }
    })
    savedOpportunities.push(saved)
  }

  // Create application for the first saved opportunity
  await prisma.opportunityApplication.create({
    data: {
      organizationId: acmeOrg.id,
      userId: acmeOwner.id,
      savedOpportunityId: savedOpportunities[0].id,
      status: 'PREPARING',
      proposalValue: 2500000,
      winProbability: 75,
      competitorCount: 3,
      responseDeadline: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days
      strategy: 'Focus on our past performance with similar DoD projects and our 8(a) certification advantage.',
      teamMembers: ['John Doe', 'Jane Smith', 'Bob Wilson'],
    }
  })

  // Create notes for saved opportunities
  await prisma.opportunityNote.create({
    data: {
      savedOpportunityId: savedOpportunities[0].id,
      userId: acmeOwner.id,
      content: 'Contacted PM John Smith at DISA. Very responsive and provided additional requirements details.',
      type: 'CONTACT',
      isPrivate: false,
      tags: ['contact', 'requirements'],
    }
  })

  await prisma.opportunityNote.create({
    data: {
      savedOpportunityId: savedOpportunities[0].id,
      userId: acmeAdmin.id,
      content: 'Our team has strong experience with similar cloud migration projects. Should emphasize AWS GovCloud experience.',
      type: 'STRATEGY',
      isPrivate: false,
      tags: ['strategy', 'cloud', 'aws'],
    }
  })

  console.log(`✅ Created ${savedOpportunities.length} saved opportunities with applications and notes`)

  // 7. Generate match scores for demonstration
  console.log('🎯 Creating match scores...')

  // Create match scores for the external opportunities that users saved
  const matchScores = []
  for (const savedOpp of savedOpportunities.slice(0, 3)) {
    // Create a temporary opportunity record for the match score
    const tempOpportunity = await prisma.opportunity.create({
      data: {
        organizationId: acmeOrg.id,
        solicitationNumber: savedOpp.solicitation,
        title: savedOpp.title,
        agency: savedOpp.agency,
        sourceSystem: 'HIGHERGOV',
        sourceId: savedOpp.externalOpportunityId,
        estimatedValue: 2500000,
        naicsCodes: ['541511'],
        status: 'ACTIVE',
      }
    })

    const matchScore = await prisma.matchScore.create({
      data: {
        organizationId: acmeOrg.id,
        profileId: acmeProfile.id,
        opportunityId: tempOpportunity.id, // Reference to database opportunity
        overallScore: 75 + Math.floor(Math.random() * 25), // 75-100 score
        naicsScore: 90 + Math.floor(Math.random() * 10),
        locationScore: 85 + Math.floor(Math.random() * 15),
        certificationScore: 95,
        experienceScore: 80 + Math.floor(Math.random() * 20),
        sizeScore: 90,
        scoringVersion: 'v1.0',
        factors: {
          naicsAlignment: { score: 100, weight: 40, contribution: 40, details: 'Exact NAICS match' },
          geographicProximity: { score: 85, weight: 25, contribution: 21.25, details: 'Same metro area' },
          certificationMatch: { score: 95, weight: 20, contribution: 19, details: '8(a) certification advantage' },
          pastPerformance: { score: 80, weight: 15, contribution: 12, details: 'Strong DoD experience' },
        },
        explanation: 'Excellent match based on NAICS alignment, geographic proximity, and certification advantages.',
      }
    })
    matchScores.push(matchScore)
  }

  console.log(`✅ Created ${matchScores.length} match scores`)

  // 8. Summary
  console.log('\n📊 Database Seeding Summary:')
  console.log(`✅ Organizations: 3`)
  console.log(`✅ Users: ${allUsers.length}`)
  console.log(`✅ Profiles: ${allProfiles.length}`) 
  console.log(`✅ Subscriptions: 3`)
  console.log(`✅ Usage Records: ${usageRecords.length}`)
  console.log(`✅ Saved Opportunities: ${savedOpportunities.length}`)
  console.log(`✅ Applications: 1`)
  console.log(`✅ Notes: 2`)
  console.log(`✅ Match Scores: ${matchScores.length}`)

  console.log('\n🎉 Database seeding completed successfully!')
  console.log('\n📝 Next Steps:')
  console.log('1. Run: npx prisma db push (to apply schema changes)')
  console.log('2. Run: npx tsx prisma/seed-comprehensive.ts (to seed data)')
  console.log('3. Update API routes to read from database instead of mock data')
  console.log('4. Opportunities will still come from mock external APIs')
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })