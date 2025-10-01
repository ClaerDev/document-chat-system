import { PrismaClient } from '@prisma/client'
import { 
  createOrganization,
  createUser,
  createProfile,
  OrganizationBuilder,
  ProfileBuilder,
  TEST_ORGANIZATIONS,
  TEST_USERS,
} from '../src/lib/test-data'

const prisma = new PrismaClient()

// Simple environment access without validation (to avoid Clerk key requirements in seed)
const getDeveloperEmail = () => process.env.DEVELOPER_EMAIL

async function main() {
  console.log('🌱 Starting database seeding...')

  // 🛡️ Ensure critical backup directories exist (should never be deleted)
  console.log('🛡️ Ensuring critical backup directories exist...')
  
  const fs = require('fs')
  const path = require('path')
  
  // Critical directories that should always exist
  const criticalDirectories = [
    'database-backups',
    '../../../database-backups-safe',
    'uploads' // File upload directory
  ]
  
  for (const dir of criticalDirectories) {
    const fullPath = path.resolve(dir)
    try {
      if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true })
        console.log(`✅ Created critical directory: ${dir}`)
      } else {
        console.log(`✅ Critical directory exists: ${dir}`)
      }
    } catch (error) {
      console.warn(`⚠️ Could not create directory ${dir}:`, error.message)
    }
  }
  
  // Create backup preservation manifest if it doesn't exist
  const manifestPath = path.resolve('../../../database-backups-safe/backup-manifest.md')
  if (!fs.existsSync(manifestPath)) {
    try {
      const manifestContent = `# Database Backup Manifest

This directory contains critical database backups that should **NEVER** be deleted.

Created: ${new Date().toISOString()}
Purpose: Preserve database backups across git operations (hard reset, clean, etc.)

## Protected Files
- \`schema-backup-*.prisma\` - Prisma schema backups
- \`database-backup-*.sql\` - PostgreSQL database dumps
- \`backup-manifest.md\` - This manifest file
- \`restore-test.sh\` - Backup restoration test script

## Usage
Use the backup-preservation.sh script in the root directory to manage these backups.

⚠️ **WARNING**: This directory survives git reset operations. Do not delete manually.
`
      fs.writeFileSync(manifestPath, manifestContent)
      console.log('✅ Created backup preservation manifest')
    } catch (error) {
      console.warn('⚠️ Could not create backup manifest:', error.message)
    }
  }
  
  console.log('✅ Critical backup directories ensured')

  // Create demo organizations
  const demoOrg = await prisma.organization.upsert({
    where: { slug: 'acme-contracting' },
    update: {},
    create: {
      name: 'ACME Contracting Inc.',
      slug: 'acme-contracting',
      planType: 'PROFESSIONAL',
      subscriptionStatus: 'ACTIVE',
      billingEmail: 'billing@acmecontracting.com',
    },
  })

  const demoOrg2 = await prisma.organization.upsert({
    where: { slug: 'tech-solutions-llc' },
    update: {},
    create: {
      name: 'Tech Solutions LLC',
      slug: 'tech-solutions-llc',
      planType: 'STARTER',
      subscriptionStatus: 'ACTIVE',
      billingEmail: 'admin@techsolutions.com',
    },
  })

  console.log('✅ Created demo organizations')

  // Create default organization for mock data
  const defaultOrg = await prisma.organization.upsert({
    where: { slug: 'default' },
    update: {},
    create: {
      id: 'default',
      name: 'Default Organization',
      slug: 'default',
      planType: 'PROFESSIONAL',
      subscriptionStatus: 'ACTIVE',
      billingEmail: 'admin@default.org',
    },
  })

  // Create Chris Doe's organization for yourpersonalmarketer123@gmail.com
  const chrisOrg = await prisma.organization.upsert({
    where: { slug: 'chris-doe-organization' },
    update: {},
    create: {
      name: "Chris Doe's Organization",
      slug: 'chris-doe-organization',
      planType: 'PROFESSIONAL',
      subscriptionStatus: 'ACTIVE',
      billingEmail: 'yourpersonalmarketer123@gmail.com',
    },
  })

  // Create Chris Doe user (yourpersonalmarketer123@gmail.com)
  const chrisUser = await prisma.user.upsert({
    where: { email: 'yourpersonalmarketer123@gmail.com' },
    update: {
      firstName: 'Chris',
      lastName: 'Doe',
      organizationId: chrisOrg.id,
    },
    create: {
      clerkId: 'user_2zJXaObm7qHLzX94FUWSNi9InXz', // Real Clerk ID from database
      email: 'yourpersonalmarketer123@gmail.com',
      firstName: 'Chris',
      lastName: 'Doe',
      role: 'OWNER',
      organizationId: chrisOrg.id,
      timezone: 'America/Los_Angeles',
    },
  })

  // Create Chris's Professional subscription
  await prisma.subscription.upsert({
    where: { stripeSubscriptionId: 'sub_chris_professional_2024' },
    update: {},
    create: {
      organizationId: chrisOrg.id,
      stripeSubscriptionId: 'sub_chris_professional_2024',
      stripePriceId: 'price_professional_monthly',
      stripeCustomerId: 'cus_chris_doe_2024',
      planType: 'PROFESSIONAL',
      status: 'ACTIVE',
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      cancelAtPeriodEnd: false,
      amount: 14900, // $149.00 in cents
      currency: 'usd',
      interval: 'month',
      features: [
        '1 seat included',
        '10 saved filters', 
        '10 AI credits/month',
        'Email drafts and capability statements',
        'CSV export',
      ],
      limits: {
        seats: 1,
        savedFilters: 10,
        aiCreditsPerMonth: 10,
        matchScoreCalculations: 200,
      },
      metadata: {
        primaryUser: 'Chris Doe',
        signupMethod: 'Google OAuth',
        preferredPlan: 'PROFESSIONAL'
      }
    }
  })

  // Create Chris's profile
  const existingChrisProfile = await prisma.profile.findFirst({
    where: { 
      organizationId: chrisOrg.id,
      deletedAt: null
    }
  })
  
  let chrisProfile
  if (!existingChrisProfile) {
    chrisProfile = await prisma.profile.create({
      data: {
      organizationId: chrisOrg.id,
      createdById: chrisUser.id,
      companyName: "Chris Doe's Organization",
      uei: 'CHRIS12345678',
      duns: '123456789',
      cageCode: 'CDOE1',
      addressLine1: '456 Innovation Drive',
      city: 'San Francisco',
      state: 'CA',
      zipCode: '94105',
      country: 'USA',
      primaryContactName: 'Chris Doe',
      primaryContactEmail: 'yourpersonalmarketer123@gmail.com',
      primaryContactPhone: '(555) 123-4567',
      website: 'https://chrisdoe.com',
      businessType: 'Corporation',
      yearEstablished: 2020,
      employeeCount: '1-10',
      annualRevenue: '$1M-$5M',
      primaryNaics: '541511',
      secondaryNaics: ['541512', '541519'],
      certifications: {
        sba8a: false,
        hubzone: false,
        sdvosb: false,
        wosb: false,
        vosb: false,
      },
      coreCompetencies: [
        'Software Development',
        'AI & Machine Learning',
        'Digital Marketing',
        'Business Consulting',
      ],
        securityClearance: 'Not Required',
        profileCompleteness: 90,
      }
    })
  } else {
    chrisProfile = existingChrisProfile
  }

  console.log('✅ Created Chris Doe user and organization with Professional subscription')

  // Create demo users (these would normally be created by Clerk)
  const demoUser1 = await prisma.user.upsert({
    where: { email: 'john.doe@acmecontracting.com' },
    update: {},
    create: {
      clerkId: 'user_demo_1',
      email: 'john.doe@acmecontracting.com',
      firstName: 'John',
      lastName: 'Doe',
      role: 'OWNER',
      organizationId: demoOrg.id,
      timezone: 'America/New_York',
    },
  })

  const demoUser2 = await prisma.user.upsert({
    where: { email: 'jane.smith@acmecontracting.com' },
    update: {},
    create: {
      clerkId: 'user_demo_2',
      email: 'jane.smith@acmecontracting.com',
      firstName: 'Jane',
      lastName: 'Smith',
      role: 'ADMIN',
      organizationId: demoOrg.id,
      timezone: 'America/New_York',
    },
  })

  const demoUser3 = await prisma.user.upsert({
    where: { email: 'mike.johnson@techsolutions.com' },
    update: {},
    create: {
      clerkId: 'user_demo_3',
      email: 'mike.johnson@techsolutions.com',
      firstName: 'Mike',
      lastName: 'Johnson',
      role: 'OWNER',
      organizationId: demoOrg2.id,
      timezone: 'America/Los_Angeles',
    },
  })

  // Create the development user dynamically based on environment variables
  // Use the current developer's email, and if available, their current Clerk user ID
  const devEmail = getDeveloperEmail() || 'yourpersonalmarketer123@gmail.com'
  
  // Try to find existing user by email first, then use your known Clerk ID as fallback
  let existingUser = await prisma.user.findUnique({
    where: { email: devEmail }
  })
  
  const devClerkId = existingUser?.clerkId || 'user_2zejG5UJK1j5PUcDKxai49XmV26' // fallback to your ID
  const devFirstName = existingUser?.firstName || 'Chris'
  const devLastName = existingUser?.lastName || 'Developer'

  console.log(`🔧 Creating/updating development user: ${devEmail} (${devClerkId})`)
  
  const mockUser = await prisma.user.upsert({
    where: { clerkId: devClerkId },
    update: {
      email: devEmail,
      firstName: devFirstName,
      lastName: devLastName,
    },
    create: {
      clerkId: devClerkId,
      email: devEmail,
      firstName: devFirstName,
      lastName: devLastName,
      role: 'OWNER',
      organizationId: defaultOrg.id,
      timezone: 'America/New_York',
    },
  })

  console.log(`✅ Created development user: ${mockUser.firstName} ${mockUser.lastName} (${mockUser.clerkId})`)
  console.log('✅ Created demo users')

  // Create demo profiles
  console.log('⏭️ Skipping demo profiles until schema is fixed')
  /* const profile1 = await prisma.profile.upsert({
    where: { uei: 'ACME12345678' },
    update: {},
    create: {
      organizationId: demoOrg.id,
      createdById: demoUser1.id,
      companyName: 'ACME Contracting Inc.',
      uei: 'ACME12345678',
      duns: '123456789',
      cageCode: '1ABC2',
      addressLine1: '123 Business Ave',
      city: 'Washington',
      state: 'DC',
      zipCode: '20001',
      country: 'USA',
      primaryContactName: 'John Doe',
      primaryContactEmail: 'john.doe@acmecontracting.com',
      primaryContactPhone: '(555) 123-4567',
      website: 'https://acmecontracting.com',
      businessType: 'Corporation',
      yearEstablished: 2010,
      employeeCount: '51-100',
      annualRevenue: '$5M-$10M',
      primaryNaics: '541330',
      secondaryNaics: ['541511', '541512'],
      certifications: {
        sba8a: true,
        hubzone: false,
        sdvosb: false,
        wosb: false,
        vosb: true,
      },
      coreCompetencies: [
        'Software Development',
        'IT Consulting',
        'Systems Integration',
        'Cybersecurity',
      ],
      securityClearance: 'Secret',
      profileCompleteness: 85,
    },
  })

  const profile2 = await prisma.profile.upsert({
    where: { uei: 'UEI987654321' },
    update: {},
    create: {
      organizationId: demoOrg2.id,
      createdById: demoUser3.id,
      companyName: 'Tech Solutions LLC',
      uei: 'UEI987654321',
      duns: '987654321',
      cageCode: '9XYZ8',
      addressLine1: '456 Innovation Blvd',
      city: 'San Francisco',
      state: 'CA',
      zipCode: '94105',
      country: 'USA',
      primaryContactName: 'Mike Johnson',
      primaryContactEmail: 'mike.johnson@techsolutions.com',
      primaryContactPhone: '(555) 987-6543',
      website: 'https://techsolutions.com',
      businessType: 'LLC',
      yearEstablished: 2015,
      employeeCount: '11-50',
      annualRevenue: '$1M-$5M',
      primaryNaics: '541511',
      secondaryNaics: ['541512', '541519'],
      certifications: {
        sba8a: false,
        hubzone: true,
        sdvosb: false,
        wosb: true,
        vosb: false,
      },
      coreCompetencies: [
        'Cloud Computing',
        'Data Analytics',
        'Machine Learning',
        'DevOps',
      ],
      securityClearance: 'Public Trust',
      profileCompleteness: 75,
    },
  }) */

  console.log('⏭️ Skipped demo profiles creation')

  // Create demo opportunities
  const opportunity1 = await prisma.opportunity.upsert({
    where: { solicitationNumber: 'W52P1J-24-R-0001' },
    update: {},
    create: {
      organizationId: demoOrg.id,
      solicitationNumber: 'W52P1J-24-R-0001',
      title: 'IT Support Services for Military Base',
      description: 'Comprehensive IT support services including help desk, network administration, and cybersecurity monitoring for a military installation.',
      agency: 'Department of Defense',
      office: 'Army Contracting Command',
      location: 'Fort Belvoir, VA',
      postedDate: new Date('2024-01-15'),
      responseDeadline: new Date('2025-02-15'),
      performanceStartDate: new Date('2024-04-01'),
      performanceEndDate: new Date('2025-03-31'),
      opportunityType: 'RFP',
      contractType: 'CPFF',
      setAsideType: 'Small Business',
      competitionType: 'Full and Open Competition',
      estimatedValue: 2500000,
      minimumValue: 2000000,
      maximumValue: 3000000,
      naicsCodes: ['541511', '541512'],
      pscCodes: ['D302', 'D307'],
      placeOfPerformance: 'Fort Belvoir, VA',
      contractorLocation: 'VA',
      securityClearanceRequired: 'Secret',
      procurementMethod: 'Open Market',
      itSubcategories: ['Help Desk/IT Support', 'Network Infrastructure', 'Cybersecurity'],
      contractDuration: '1-2 years',
      sourceSystem: 'SAM.gov',
      sourceId: 'SAM_12345',
      sourceUrl: 'https://sam.gov/opportunities/12345',
      status: 'ACTIVE',
    },
  })

  const opportunity2 = await prisma.opportunity.upsert({
    where: { solicitationNumber: 'GSA-FAS-24-0001' },
    update: {},
    create: {
      organizationId: demoOrg.id,
      solicitationNumber: 'GSA-FAS-24-0001',
      title: 'Cloud Infrastructure Services',
      description: 'Design, implementation, and management of cloud infrastructure services for federal agencies.',
      agency: 'General Services Administration',
      office: 'Federal Acquisition Service',
      location: 'Washington, DC',
      postedDate: new Date('2024-01-20'),
      responseDeadline: new Date('2025-03-01'),
      performanceStartDate: new Date('2024-05-01'),
      performanceEndDate: new Date('2027-04-30'),
      opportunityType: 'RFP',
      contractType: 'FFP',
      setAsideType: '8(a)',
      competitionType: 'Set-Aside',
      estimatedValue: 5000000,
      minimumValue: 4000000,
      maximumValue: 6000000,
      naicsCodes: ['541511', '518210'],
      pscCodes: ['D316', 'D317'],
      placeOfPerformance: 'Various CONUS',
      contractorLocation: 'DC',
      securityClearanceRequired: 'Public Trust',
      procurementMethod: 'GSA Schedule',
      itSubcategories: ['Cloud Computing', 'System Integration', 'Data Analytics'],
      contractDuration: '3-5 years',
      sourceSystem: 'HigherGov',
      sourceId: 'HG_67890',
      sourceUrl: 'https://highergov.com/opportunities/67890',
      status: 'ACTIVE',
    },
  })

  // Create additional opportunities for testing search and pagination
  const additionalOpportunities = [
    {
      solicitationNumber: 'VA-118-24-R-0001',
      title: 'Healthcare Information System Modernization',
      description: 'Modernization of legacy healthcare information systems including EHR integration, data migration, and user training.',
      agency: 'Department of Veterans Affairs',
      office: 'Office of Information and Technology',
      location: 'Washington, DC',
      postedDate: new Date('2024-01-25'),
      responseDeadline: new Date('2024-03-15'),
      performanceStartDate: new Date('2024-06-01'),
      performanceEndDate: new Date('2026-05-31'),
      opportunityType: 'RFP',
      contractType: 'CPFF',
      setAsideType: 'SDVOSB',
      competitionType: 'Set-Aside',
      estimatedValue: 8500000,
      minimumValue: 7000000,
      maximumValue: 10000000,
      naicsCodes: ['541511', '541512', '621111'],
      pscCodes: ['D302', 'D316'],
      placeOfPerformance: 'DC',
      contractorLocation: 'VA',
      securityClearanceRequired: 'Not Required',
      procurementMethod: 'VETS 2',
      itSubcategories: ['Legacy System Modernization', 'Database Management', 'Software Development'],
      contractDuration: '1-2 years',
      sourceSystem: 'SAM.gov',
      sourceId: 'SAM_23456',
      sourceUrl: 'https://sam.gov/opportunities/23456',
      status: 'ACTIVE',
    },
    {
      solicitationNumber: 'DHS-TSA-24-0001',
      title: 'Airport Security Technology Enhancement',
      description: 'Development and deployment of advanced screening technologies for airport security checkpoints.',
      agency: 'Department of Homeland Security',
      office: 'Transportation Security Administration',
      location: 'Arlington, VA',
      postedDate: new Date('2024-02-01'),
      responseDeadline: new Date('2024-04-01'),
      performanceStartDate: new Date('2024-07-01'),
      performanceEndDate: new Date('2025-06-30'),
      opportunityType: 'RFP',
      contractType: 'FFP',
      setAsideType: 'Small Business',
      competitionType: 'Full and Open Competition',
      estimatedValue: 12000000,
      minimumValue: 10000000,
      maximumValue: 15000000,
      naicsCodes: ['334511', '541330'],
      pscCodes: ['5895', '5985'],
      placeOfPerformance: 'VA',
      contractorLocation: 'MD',
      securityClearanceRequired: 'Top Secret',
      procurementMethod: 'SeaPort-e',
      itSubcategories: ['Cybersecurity', 'Data Analytics'],
      contractDuration: 'Short-term (< 1 year)',
      sourceSystem: 'HigherGov',
      sourceId: 'HG_34567',
      sourceUrl: 'https://highergov.com/opportunities/34567',
      status: 'ACTIVE',
    },
    {
      solicitationNumber: 'NASA-GSFC-24-0001',
      title: 'Satellite Data Processing Platform',
      description: 'Design and implementation of a cloud-based platform for processing and analyzing satellite imagery data.',
      agency: 'National Aeronautics and Space Administration',
      office: 'Goddard Space Flight Center',
      location: 'Greenbelt, MD',
      postedDate: new Date('2024-02-05'),
      responseDeadline: new Date('2024-04-15'),
      performanceStartDate: new Date('2024-08-01'),
      performanceEndDate: new Date('2027-07-31'),
      opportunityType: 'RFP',
      contractType: 'CPAF',
      setAsideType: 'HUBZone',
      competitionType: 'Set-Aside',
      estimatedValue: 6500000,
      minimumValue: 5500000,
      maximumValue: 7500000,
      naicsCodes: ['541511', '518210', '541712'],
      pscCodes: ['D316', 'D317', 'R425'],
      placeOfPerformance: 'MD',
      sourceSystem: 'SAM.gov',
      sourceId: 'SAM_45678',
      sourceUrl: 'https://sam.gov/opportunities/45678',
      status: 'ACTIVE',
    },
    {
      solicitationNumber: 'EPA-ORD-24-0001',
      title: 'Environmental Data Analytics Platform',
      description: 'Development of advanced analytics platform for environmental monitoring data analysis and reporting.',
      agency: 'Environmental Protection Agency',
      office: 'Office of Research and Development',
      location: 'Research Triangle Park, NC',
      postedDate: new Date('2024-02-10'),
      responseDeadline: new Date('2024-05-01'),
      performanceStartDate: new Date('2024-09-01'),
      performanceEndDate: new Date('2026-08-31'),
      opportunityType: 'RFP',
      contractType: 'T&M',
      setAsideType: 'WOSB',
      competitionType: 'Set-Aside',
      estimatedValue: 3200000,
      minimumValue: 2800000,
      maximumValue: 3600000,
      naicsCodes: ['541511', '541690', '541720'],
      pscCodes: ['D302', 'R425'],
      placeOfPerformance: 'NC',
      sourceSystem: 'HigherGov',
      sourceId: 'HG_56789',
      sourceUrl: 'https://highergov.com/opportunities/56789',
      status: 'ACTIVE',
    },
    {
      solicitationNumber: 'DOE-NNSA-24-0001',
      title: 'Cybersecurity Infrastructure Assessment',
      description: 'Comprehensive cybersecurity assessment and enhancement of critical infrastructure systems.',
      agency: 'Department of Energy',
      office: 'National Nuclear Security Administration',
      location: 'Albuquerque, NM',
      postedDate: new Date('2024-02-15'),
      responseDeadline: new Date('2024-05-15'),
      performanceStartDate: new Date('2024-10-01'),
      performanceEndDate: new Date('2025-09-30'),
      opportunityType: 'RFP',
      contractType: 'FFP',
      setAsideType: 'Small Business',
      competitionType: 'Full and Open Competition',
      estimatedValue: 4800000,
      minimumValue: 4200000,
      maximumValue: 5400000,
      naicsCodes: ['541512', '561621'],
      pscCodes: ['D302', 'R408'],
      placeOfPerformance: 'NM',
      sourceSystem: 'SAM.gov',
      sourceId: 'SAM_67890',
      sourceUrl: 'https://sam.gov/opportunities/67890',
      status: 'ACTIVE',
    },
    {
      solicitationNumber: 'USDA-NRCS-24-0001',
      title: 'Agricultural Data Management System',
      description: 'Development of integrated data management system for agricultural conservation programs.',
      agency: 'Department of Agriculture',
      office: 'Natural Resources Conservation Service',
      location: 'Fort Worth, TX',
      postedDate: new Date('2024-02-20'),
      responseDeadline: new Date('2024-06-01'),
      performanceStartDate: new Date('2024-11-01'),
      performanceEndDate: new Date('2026-10-31'),
      opportunityType: 'RFP',
      contractType: 'IDIQ',
      setAsideType: '8(a)',
      competitionType: 'Set-Aside',
      estimatedValue: 7200000,
      minimumValue: 6000000,
      maximumValue: 8400000,
      naicsCodes: ['541511', '541618'],
      pscCodes: ['D302', 'D316'],
      placeOfPerformance: 'TX',
      sourceSystem: 'HigherGov',
      sourceId: 'HG_78901',
      sourceUrl: 'https://highergov.com/opportunities/78901',
      status: 'ACTIVE',
    },
    {
      solicitationNumber: 'DOC-NIST-24-0001',
      title: 'AI Research Computing Infrastructure',
      description: 'High-performance computing infrastructure for artificial intelligence and machine learning research.',
      agency: 'Department of Commerce',
      office: 'National Institute of Standards and Technology',
      location: 'Gaithersburg, MD',
      postedDate: new Date('2024-01-30'),
      responseDeadline: new Date('2024-03-30'),
      performanceStartDate: new Date('2024-06-15'),
      performanceEndDate: new Date('2025-06-14'),
      opportunityType: 'RFP',
      contractType: 'FFP',
      setAsideType: 'Total Small Business',
      competitionType: 'Set-Aside',
      estimatedValue: 9800000,
      minimumValue: 8500000,
      maximumValue: 11000000,
      naicsCodes: ['334111', '541511', '541712'],
      pscCodes: ['7010', 'D316'],
      placeOfPerformance: 'MD',
      sourceSystem: 'SAM.gov',
      sourceId: 'SAM_89012',
      sourceUrl: 'https://sam.gov/opportunities/89012',
      status: 'ACTIVE',
    },
    {
      solicitationNumber: 'DOJ-FBI-24-0001',
      title: 'Digital Forensics Laboratory Modernization',
      description: 'Modernization of digital forensics capabilities including hardware, software, and training.',
      agency: 'Department of Justice',
      office: 'Federal Bureau of Investigation',
      location: 'Quantico, VA',
      postedDate: new Date('2024-01-18'),
      responseDeadline: new Date('2024-02-28'),
      performanceStartDate: new Date('2024-05-15'),
      performanceEndDate: new Date('2025-05-14'),
      opportunityType: 'RFP',
      contractType: 'CPFF',
      setAsideType: 'Small Business',
      competitionType: 'Full and Open Competition',
      estimatedValue: 5600000,
      minimumValue: 4800000,
      maximumValue: 6400000,
      naicsCodes: ['541511', '334111', '561621'],
      pscCodes: ['D302', '7010', 'R408'],
      placeOfPerformance: 'VA',
      sourceSystem: 'HigherGov',
      sourceId: 'HG_90123',
      sourceUrl: 'https://highergov.com/opportunities/90123',
      status: 'ACTIVE',
    },
    {
      solicitationNumber: 'HHS-CDC-24-0001',
      title: 'Public Health Surveillance System',
      description: 'Advanced surveillance system for tracking and analyzing public health trends and disease outbreaks.',
      agency: 'Department of Health and Human Services',
      office: 'Centers for Disease Control and Prevention',
      location: 'Atlanta, GA',
      postedDate: new Date('2024-02-12'),
      responseDeadline: new Date('2024-04-30'),
      performanceStartDate: new Date('2024-08-15'),
      performanceEndDate: new Date('2026-08-14'),
      opportunityType: 'RFP',
      contractType: 'T&M',
      setAsideType: 'VOSB',
      competitionType: 'Set-Aside',
      estimatedValue: 4200000,
      minimumValue: 3600000,
      maximumValue: 4800000,
      naicsCodes: ['541511', '541690', '621999'],
      pscCodes: ['D302', 'R425'],
      placeOfPerformance: 'GA',
      sourceSystem: 'SAM.gov',
      sourceId: 'SAM_01234',
      sourceUrl: 'https://sam.gov/opportunities/01234',
      status: 'ACTIVE',
    },
    {
      solicitationNumber: 'DOT-FAA-24-0001',
      title: 'Air Traffic Management System Upgrade',
      description: 'NextGen air traffic management system upgrades for improved efficiency and safety.',
      agency: 'Department of Transportation',
      office: 'Federal Aviation Administration',
      location: 'Oklahoma City, OK',
      postedDate: new Date('2024-01-22'),
      responseDeadline: new Date('2024-03-22'),
      performanceStartDate: new Date('2024-07-01'),
      performanceEndDate: new Date('2026-06-30'),
      opportunityType: 'RFP',
      contractType: 'CPAF',
      setAsideType: 'Small Business',
      competitionType: 'Full and Open Competition',
      estimatedValue: 15000000,
      minimumValue: 12000000,
      maximumValue: 18000000,
      naicsCodes: ['334220', '541330', '488111'],
      pscCodes: ['5895', 'D302'],
      placeOfPerformance: 'OK',
      sourceSystem: 'HigherGov',
      sourceId: 'HG_12345',
      sourceUrl: 'https://highergov.com/opportunities/12345',
      status: 'ACTIVE',
    }
  ]

  // Create all additional opportunities
  for (const oppData of additionalOpportunities) {
    await prisma.opportunity.upsert({
      where: { solicitationNumber: oppData.solicitationNumber },
      update: {},
      create: {
        organizationId: demoOrg.id,
        ...oppData,
      },
    })
  }

  console.log(`✅ Created ${additionalOpportunities.length + 2} demo opportunities`)

  // Create demo match scores
  console.log('⏭️ Skipping match scores (depends on profiles)')
  /* await prisma.matchScore.upsert({
    where: {
      profileId_opportunityId: {
        profileId: profile1.id,
        opportunityId: opportunity1.id,
      },
    },
    update: {},
    create: {
      organizationId: demoOrg.id,
      profileId: profile1.id,
      opportunityId: opportunity1.id,
      overallScore: 87.5,
      naicsScore: 95.0,
      locationScore: 75.0,
      certificationScore: 90.0,
      experienceScore: 85.0,
      sizeScore: 80.0,
      scoringVersion: '1.0',
      factors: {
        naics_match: {
          primary_match: true,
          secondary_matches: 1,
          score: 95.0,
        },
        location: {
          distance_miles: 150,
          same_state: true,
          score: 75.0,
        },
        certifications: {
          sba8a_eligible: true,
          required_clearance_met: true,
          score: 90.0,
        },
        experience: {
          relevant_projects: 12,
          similar_agencies: 3,
          score: 85.0,
        },
        size: {
          revenue_match: true,
          employee_count_match: true,
          score: 80.0,
        },
      },
      explanation: 'Excellent match based on NAICS code alignment and relevant experience in IT support services for DoD.',
    },
  })

  await prisma.matchScore.upsert({
    where: {
      profileId_opportunityId: {
        profileId: profile1.id,
        opportunityId: opportunity2.id,
      },
    },
    update: {},
    create: {
      organizationId: demoOrg.id,
      profileId: profile1.id,
      opportunityId: opportunity2.id,
      overallScore: 72.3,
      naicsScore: 85.0,
      locationScore: 90.0,
      certificationScore: 95.0,
      experienceScore: 65.0,
      sizeScore: 45.0,
      scoringVersion: '1.0',
      factors: {
        naics_match: {
          primary_match: false,
          secondary_matches: 1,
          score: 85.0,
        },
        location: {
          distance_miles: 50,
          same_state: true,
          score: 90.0,
        },
        certifications: {
          sba8a_eligible: true,
          setaside_qualified: true,
          score: 95.0,
        },
        experience: {
          relevant_projects: 5,
          cloud_experience: 3,
          score: 65.0,
        },
        size: {
          revenue_below_threshold: true,
          size_standard_met: false,
          score: 45.0,
        },
      },
      explanation: 'Good match for 8(a) set-aside opportunity, but limited cloud infrastructure experience may be a factor.',
    },
  }) */

  console.log('⏭️ Skipped demo match scores creation')

  // Create demo pipeline
  const pipeline = await prisma.pipeline.upsert({
    where: {
      id: 'pipeline_demo_1',
    },
    update: {},
    create: {
      id: 'pipeline_demo_1',
      organizationId: demoOrg.id,
      name: 'Default Sales Pipeline',
      description: 'Standard opportunity management pipeline',
      isDefault: true,
      stages: {
        stages: [
          { id: 'discovery', name: 'Discovery', order: 1 },
          { id: 'qualification', name: 'Qualification', order: 2 },
          { id: 'proposal', name: 'Proposal', order: 3 },
          { id: 'negotiation', name: 'Negotiation', order: 4 },
          { id: 'award', name: 'Award', order: 5 },
          { id: 'closed', name: 'Closed', order: 6 },
        ],
      },
    },
  })

  // Create pipeline items
  await prisma.pipelineItem.upsert({
    where: {
      pipelineId_opportunityId: {
        pipelineId: pipeline.id,
        opportunityId: opportunity1.id,
      },
    },
    update: {},
    create: {
      pipelineId: pipeline.id,
      opportunityId: opportunity1.id,
      stage: 'qualification',
      priority: 'HIGH',
      notes: 'Strong technical match, need to review past performance requirements',
      dueDate: new Date('2024-02-10'),
    },
  })

  await prisma.pipelineItem.upsert({
    where: {
      pipelineId_opportunityId: {
        pipelineId: pipeline.id,
        opportunityId: opportunity2.id,
      },
    },
    update: {},
    create: {
      pipelineId: pipeline.id,
      opportunityId: opportunity2.id,
      stage: 'discovery',
      priority: 'MEDIUM',
      notes: 'Initial review shows potential, need to assess size standards',
      dueDate: new Date('2024-02-20'),
    },
  })

  console.log('✅ Created demo pipeline and items')

  // Create demo activities
  await prisma.activity.create({
    data: {
      userId: demoUser1.id,
      opportunityId: opportunity1.id,
      activityType: 'OPPORTUNITY_VIEWED',
      title: 'Viewed IT Support Services opportunity',
      description: 'Initial review of opportunity details and requirements',
      metadata: {
        duration_seconds: 120,
        sections_viewed: ['overview', 'requirements', 'evaluation_criteria'],
      },
    },
  })

  await prisma.activity.create({
    data: {
      userId: demoUser2.id,
      opportunityId: opportunity1.id,
      activityType: 'NOTE_ADDED',
      title: 'Added note about team capabilities',
      description: 'Confirmed we have the right security clearances for this project',
      metadata: {
        note_type: 'capability_assessment',
      },
    },
  })

  console.log('✅ Created demo activities')

  // Create mock documents to match frontend store
  const mockDocuments = [
    {
      id: 'd1',
      originalName: 'DARPA AI Research Proposal.pdf',
      organizationId: defaultOrg.id,
      uploadedById: mockUser.id,
      fileSize: 2486789,
      mimeType: 'application/pdf',
      status: 'COMPLETED',
      extractedText: 'This is a comprehensive proposal for AI research and development focusing on machine learning algorithms and neural network architectures. The project aims to advance the state-of-the-art in artificial intelligence...',
      metadata: {
        documentType: 'proposal',
        tags: ['ai', 'research', 'darpa'],
        urgencyLevel: 'high',
        classification: 'unclassified',
        contractValue: '$2.5M',
        deadline: '2024-03-15'
      }
    },
    {
      id: 'd2',
      originalName: 'Cybersecurity Framework Compliance.docx',
      organizationId: defaultOrg.id,
      uploadedById: mockUser.id,
      fileSize: 1024567,
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      status: 'COMPLETED',
      extractedText: 'Comprehensive cybersecurity framework documentation outlining compliance requirements for federal contractors. Includes NIST guidelines, security controls implementation, and risk assessment procedures...',
      metadata: {
        documentType: 'compliance',
        tags: ['cybersecurity', 'compliance', 'nist'],
        urgencyLevel: 'medium',
        classification: 'unclassified',
        deadline: '2024-04-01'
      }
    },
    {
      id: 'd3',
      originalName: 'Contract Amendment Template.pdf',
      organizationId: defaultOrg.id,
      uploadedById: mockUser.id,
      fileSize: 512345,
      mimeType: 'application/pdf',
      status: 'COMPLETED',
      extractedText: 'Standard template for contract amendments including scope changes, timeline modifications, and budget adjustments. Template follows federal acquisition regulations and includes all required legal clauses...',
      metadata: {
        documentType: 'template',
        tags: ['contract', 'amendment', 'template'],
        urgencyLevel: 'low',
        classification: 'unclassified'
      }
    }
  ]

  for (const docData of mockDocuments) {
    await prisma.document.upsert({
      where: { id: docData.id },
      update: {},
      create: {
        id: docData.id,
        name: docData.originalName,
        organizationId: docData.organizationId,
        uploadedById: docData.uploadedById,
        size: docData.fileSize,
        mimeType: docData.mimeType,
        status: docData.status as any,
        lastModified: new Date(),
        filePath: `/uploads/${docData.id}`,
        aiData: {
          content: {
            extractedText: docData.extractedText,
            summary: '',
            keywords: [],
            keyPoints: [],
            actionItems: [],
            questions: []
          },
          status: {
            status: 'completed',
            progress: 100,
            startedAt: new Date().toISOString(),
            completedAt: new Date().toISOString(),
            retryCount: 0
          },
          structure: {
            sections: [],
            tables: [],
            images: [],
            ocrResults: []
          },
          analysis: {
            qualityScore: 0.8,
            readabilityScore: 0.7,
            complexityMetrics: { readabilityScore: 0.7 },
            entities: [],
            confidence: 0.8,
            suggestions: []
          },
          processedAt: new Date().toISOString(),
          modelVersion: 'seed-v1.0',
          processingHistory: [
            {
              timestamp: new Date().toISOString(),
              event: 'Document Seeded',
              success: true
            }
          ]
        },
        metadata: docData.metadata,
      }
    })
  }

  console.log('✅ Created mock documents')
  
  // 🛡️ Final safety check - ensure backup preservation system is ready
  console.log('🛡️ Final backup preservation system check...')
  
  try {
    // Make backup preservation script executable
    const { execSync } = require('child_process')
    execSync('chmod +x backup-preservation.sh', { cwd: process.cwd() })
    console.log('✅ Backup preservation script is executable')
    
    // Run backup status check
    const statusOutput = execSync('./backup-preservation.sh status', { 
      cwd: process.cwd(),
      encoding: 'utf8',
      stdio: 'pipe'
    })
    console.log('✅ Backup preservation system status checked')
    
    // Create an initial backup if none exists
    try {
      execSync('./backup-preservation.sh create', { 
        cwd: process.cwd(),
        stdio: 'pipe'
      })
      console.log('✅ Initial backup created and preserved')
    } catch (backupError) {
      console.warn('⚠️ Could not create initial backup (this may be normal if PostgreSQL is not configured)')
    }
    
  } catch (error) {
    console.warn('⚠️ Backup preservation system check failed:', error.message)
    console.warn('⚠️ Please run "./backup-preservation.sh status" manually to verify system')
  }
  
  console.log('🎉 Database seeding completed successfully!')
  console.log('')
  console.log('🛡️ Critical directories protected:')
  console.log('   • database-backups/ (local)')
  console.log('   • ../../../database-backups-safe/ (permanent)')
  console.log('   • uploads/ (file storage)')
  console.log('')
  console.log('💡 Remember: Use "./backup-preservation.sh preserve" before git reset!')
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })