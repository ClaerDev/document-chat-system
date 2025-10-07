import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seeding...')

  // Create demo organizations
  console.log('📦 Creating demo organizations...')

  const demoOrg1 = await prisma.organization.upsert({
    where: { slug: 'demo-company' },
    update: {},
    create: {
      name: 'Demo Company Inc.',
      slug: 'demo-company',
      planType: 'PROFESSIONAL',
      subscriptionStatus: 'ACTIVE',
      billingEmail: 'demo@example.com',
    },
  })

  const demoOrg2 = await prisma.organization.upsert({
    where: { slug: 'acme-corp' },
    update: {},
    create: {
      name: 'ACME Corporation',
      slug: 'acme-corp',
      planType: 'STARTER',
      subscriptionStatus: 'ACTIVE',
      billingEmail: 'billing@acme.example.com',
    },
  })

  console.log(`✅ Created demo organizations: ${demoOrg1.name}, ${demoOrg2.name}`)

  // Note: User accounts should be created through Clerk authentication
  // This seed script only creates organizations and other non-user data

  console.log('✅ Database seeding completed!')
  console.log('')
  console.log('📝 Next steps:')
  console.log('   1. Sign up through the UI to create your user account')
  console.log('   2. Your account will be automatically linked to an organization')
  console.log('   3. Start uploading documents and chatting!')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error('❌ Seeding error:', e)
    await prisma.$disconnect()
    process.exit(1)
  })
