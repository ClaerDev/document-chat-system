import { db } from '@/lib/db'

export async function seedDefaultProfile() {
  try {
    console.log('Seeding default profile...')
    
    // Create a default organization if it doesn't exist
    let organization = await db.organization.findFirst({
      where: { slug: 'default-test-org' }
    })
    
    if (!organization) {
      organization = await db.organization.create({
        data: {
          name: 'Test Company Inc',
          slug: 'default-test-org',
        }
      })
    }
    
    // Create a default user if it doesn't exist
    let user = await db.user.findFirst({
      where: { organizationId: organization.id }
    })
    
    if (!user) {
      user = await db.user.create({
        data: {
          clerkId: 'test-user-123',
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User',
          organizationId: organization.id,
          role: 'OWNER',
          lastActiveAt: new Date(),
        }
      })
    }
    
    // Check if profile already exists
    const existingProfile = await db.profile.findFirst({
      where: { 
        organizationId: organization.id,
        deletedAt: null
      }
    })
    
    if (existingProfile) {
      console.log('Profile already exists, updating...')
      
      // Update existing profile with more complete data
      const updatedProfile = await db.profile.update({
        where: { id: existingProfile.id },
        data: {
          companyName: 'TechSolutions Inc',
          state: 'VA', // Same state as opportunity 1 for testing
          primaryNaics: '541511', // Computer Systems Design Services
          secondaryNaics: ['541512', '541618'], // More NAICS codes
          certifications: {
            hasWOSB: true,
            hasHUBZone: false,
            hasSDVOSB: true,
            has8a: false,
            hasVOSB: true
          },
          pastPerformance: {
            description: 'Extensive experience in IT support services for government agencies, including DOD, VA, and civilian agencies. Successfully delivered 15+ projects over 5 years.',
            keyProjects: [
              {
                title: 'DOD IT Infrastructure Modernization',
                client: 'U.S. Department of Defense',
                value: 2500000,
                duration: '18 months',
                description: 'Led comprehensive IT infrastructure upgrade for military installation'
              },
              {
                title: 'VA Health System Integration',
                client: 'Department of Veterans Affairs',
                value: 1200000,
                duration: '12 months',
                description: 'Integrated legacy health systems with modern EHR platforms'
              }
            ]
          },
          coreCompetencies: [
            'Cloud Migration',
            'Cybersecurity',
            'System Integration',
            'Help Desk Support',
            'Network Administration'
          ],
          profileCompleteness: 85
        }
      })
      
      console.log('Profile updated successfully:', updatedProfile.id)
      return updatedProfile
    } else {
      // Create new profile with comprehensive data
      const newProfile = await db.profile.create({
        data: {
          organizationId: organization.id,
          createdById: user.id,
          companyName: 'TechSolutions Inc',
          state: 'VA', // Same state as opportunity 1 for testing
          primaryNaics: '541511', // Computer Systems Design Services
          secondaryNaics: ['541512', '541618'], // More NAICS codes
          certifications: {
            hasWOSB: true,
            hasHUBZone: false,
            hasSDVOSB: true,
            has8a: false,
            hasVOSB: true
          },
          pastPerformance: {
            description: 'Extensive experience in IT support services for government agencies, including DOD, VA, and civilian agencies. Successfully delivered 15+ projects over 5 years.',
            keyProjects: [
              {
                title: 'DOD IT Infrastructure Modernization',
                client: 'U.S. Department of Defense',
                value: 2500000,
                duration: '18 months',
                description: 'Led comprehensive IT infrastructure upgrade for military installation'
              },
              {
                title: 'VA Health System Integration',
                client: 'Department of Veterans Affairs',
                value: 1200000,
                duration: '12 months',
                description: 'Integrated legacy health systems with modern EHR platforms'
              }
            ]
          },
          coreCompetencies: [
            'Cloud Migration',
            'Cybersecurity',
            'System Integration',
            'Help Desk Support',
            'Network Administration'
          ],
          profileCompleteness: 85,
          country: 'USA'
        }
      })
      
      console.log('Profile created successfully:', newProfile.id)
      return newProfile
    }
  } catch (error) {
    console.error('Error seeding profile:', error)
    throw error
  }
}