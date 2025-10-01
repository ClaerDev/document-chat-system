import { NextRequest, NextResponse } from 'next/server'
import { ApiResponse, PaginatedResponse, Opportunity } from '@/types'
import fs from 'fs'
import path from 'path'

// Load agencies data
let agenciesData: any = null
function loadAgenciesData() {
  if (!agenciesData) {
    try {
      const agenciesPath = path.join(process.cwd(), 'src/data/government/agencies/agencies.json')
      const agenciesContent = fs.readFileSync(agenciesPath, 'utf-8')
      agenciesData = JSON.parse(agenciesContent)
      console.log('✅ Loaded agencies data')
    } catch (error) {
      console.error('❌ Failed to load agencies data:', error)
      agenciesData = { agencies: { departments: [], agencies: [] } }
    }
  }
  return agenciesData
}

// Helper function to get agency by code
function getAgencyByCode(code: string) {
  const agencies = loadAgenciesData()
  const allAgencies = [...(agencies.agencies?.departments || []), ...(agencies.agencies?.agencies || [])]
  return allAgencies.find(agency => agency.code === code)
}

// Generate realistic attachment information for opportunities
function generateAttachments(opportunity: any): any[] {
  const attachmentTypes = [
    { name: 'Solicitation Document', type: 'PDF', category: 'solicitation', size: '2.5 MB' },
    { name: 'Statement of Work (SOW)', type: 'PDF', category: 'attachment', size: '1.2 MB' },
    { name: 'Technical Requirements', type: 'PDF', category: 'attachment', size: '850 KB' },
    { name: 'Amendment 001', type: 'PDF', category: 'amendment', size: '156 KB' },
    { name: 'Vendor Information', type: 'PDF', category: 'reference', size: '425 KB' },
    { name: 'Security Requirements', type: 'PDF', category: 'attachment', size: '675 KB' },
    { name: 'Price Schedule', type: 'XLS', category: 'attachment', size: '95 KB' },
    { name: 'Performance Work Statement', type: 'DOC', category: 'attachment', size: '1.8 MB' }
  ]
  
  // Generate 2-5 attachments per opportunity
  const numAttachments = Math.floor(Math.random() * 4) + 2
  const attachments = []
  
  // Always include the main solicitation document
  attachments.push({
    name: `${opportunity.solicitationNumber || 'Solicitation'} - Main Document`,
    type: 'PDF',
    size: '2.5 MB',
    category: 'solicitation',
    url: `https://sam.gov/api/prod/opps/v3/opportunities/${opportunity.id}/documents/main.pdf`,
    description: `Primary ${opportunity.opportunityType || opportunity.type || 'opportunity'} document containing all requirements and instructions`,
    lastModified: new Date().toISOString()
  })
  
  // Add random additional attachments
  for (let i = 1; i < numAttachments && i < attachmentTypes.length; i++) {
    const attachment = attachmentTypes[i]
    attachments.push({
      name: attachment.name,
      type: attachment.type,
      size: attachment.size,
      category: attachment.category,
      url: `https://sam.gov/api/prod/opps/v3/opportunities/${opportunity.id}/documents/att_${i}.${attachment.type.toLowerCase()}`,
      description: `${attachment.name} for ${opportunity.opportunityType || opportunity.type || 'opportunity'} ${opportunity.solicitationNumber || opportunity.id}`,
      lastModified: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString() // Random date within last week
    })
  }
  
  return attachments
}

// Generate realistic contact information for opportunities
function generateContactInfo(agency: any, location: any) {
  // Common government names for realistic contacts
  const firstNames = {
    male: ['Michael', 'David', 'John', 'Robert', 'William', 'James', 'Richard', 'Christopher', 'Daniel', 'Matthew'],
    female: ['Jennifer', 'Sarah', 'Jessica', 'Ashley', 'Emily', 'Michelle', 'Lisa', 'Angela', 'Kimberly', 'Rebecca']
  }
  
  const lastNames = ['Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 
                    'Wilson', 'Anderson', 'Taylor', 'Thomas', 'Jackson', 'White', 'Harris', 'Martin', 'Thompson', 'Moore']
  
  // Government titles based on agency type
  const titles = {
    contracting: ['Contracting Officer', 'Contract Specialist', 'Procurement Analyst', 'Contracting Officer Representative'],
    program: ['Program Manager', 'Project Manager', 'Program Director', 'Technical Lead'],
    administrative: ['Administrative Officer', 'Grants Manager', 'Program Analyst', 'Policy Analyst']
  }
  
  // Generate 1-2 contacts per opportunity
  const contactCount = Math.random() > 0.6 ? 2 : 1
  const contacts = []
  
  for (let i = 0; i < contactCount; i++) {
    const gender = Math.random() > 0.5 ? 'male' : 'female'
    const firstName = firstNames[gender][Math.floor(Math.random() * firstNames[gender].length)]
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)]
    
    // Determine contact type and title
    let contactType = 'PRIMARY_POINT_OF_CONTACT'
    let titleCategory = 'contracting'
    
    if (i === 1) {
      contactType = Math.random() > 0.5 ? 'PROGRAM_MANAGER' : 'TECHNICAL_CONTACT'
      titleCategory = contactType === 'PROGRAM_MANAGER' ? 'program' : 'program'
    } else if (i === 0 && contactCount === 1) {
      // Single contact - vary the type
      const rand = Math.random()
      if (rand > 0.7) {
        contactType = 'PROGRAM_MANAGER'
        titleCategory = 'program'
      } else if (rand > 0.4) {
        contactType = 'CONTRACTING_OFFICER'
        titleCategory = 'contracting'
      }
    }
    
    const title = titles[titleCategory][Math.floor(Math.random() * titles[titleCategory].length)]
    
    // Generate email domain based on agency
    let emailDomain = 'gov'
    const agencyName = typeof agency === 'string' ? agency : agency?.name || ''
    if (agencyName.toLowerCase().includes('defense') || agencyName.toLowerCase().includes('dod')) {
      emailDomain = 'defense.gov'
    } else if (agencyName.toLowerCase().includes('homeland') || agencyName.toLowerCase().includes('dhs')) {
      emailDomain = 'dhs.gov'
    } else if (agencyName.toLowerCase().includes('energy') || agencyName.toLowerCase().includes('doe')) {
      emailDomain = 'energy.gov'
    } else if (agencyName.toLowerCase().includes('health') || agencyName.toLowerCase().includes('hhs')) {
      emailDomain = 'hhs.gov'
    } else if (agencyName.toLowerCase().includes('education')) {
      emailDomain = 'ed.gov'
    } else if (agencyName.toLowerCase().includes('treasury')) {
      emailDomain = 'treasury.gov'
    } else if (agencyName.toLowerCase().includes('commerce')) {
      emailDomain = 'commerce.gov'
    } else if (agencyName.toLowerCase().includes('state')) {
      emailDomain = 'state.gov'
    } else {
      emailDomain = 'gsa.gov'
    }
    
    // Generate phone number (government format)
    const areaCode = location?.state === 'DC' ? '202' : 
                    location?.state === 'VA' ? '703' :
                    location?.state === 'MD' ? '301' :
                    location?.state === 'NY' ? '212' :
                    location?.state === 'CA' ? '415' :
                    location?.state === 'TX' ? '512' :
                    location?.state === 'FL' ? '305' : '555'
    
    const phoneNumber = `${areaCode}-${Math.floor(Math.random() * 900 + 100)}-${Math.floor(Math.random() * 9000 + 1000)}`
    
    const contact = {
      firstName,
      lastName,
      fullName: `${firstName} ${lastName}`,      // Use camelCase for consistency
      fullname: `${firstName} ${lastName}`,     // Keep lowercase for backward compatibility
      name: `${firstName} ${lastName}`,         // Also provide 'name' field as fallback
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${emailDomain}`,
      phone: phoneNumber,
      title,
      type: contactType,
      address: {
        city: location?.city || 'Washington',
        state: location?.state || 'DC',
        zipCode: location?.zipCode || '20001',
        country: 'USA'
      },
      officeAddress: {
        city: location?.city || 'Washington',
        state: location?.state || 'DC',
        zipcode: location?.zipCode || '20001',
        countryCode: 'USA'
      },
      source: 'SAM_GOV',
      confidence: Math.random() * 0.3 + 0.7, // 70-100% confidence
      lastValidated: new Date().toISOString()
    }
    
    contacts.push(contact)
  }
  
  return contacts
}

// Static opportunities for consistent testing
let cachedOpportunities: Opportunity[] | null = null

function getMockOpportunities(): Opportunity[] {
  if (!cachedOpportunities) {
    console.log('📁 Loading static opportunities from data/opportunities.json')
    try {
      // Load static opportunities from the data folder
      const dataPath = path.join(process.cwd(), 'data', 'opportunities.json')
      console.log('📍 Data path:', dataPath)
      
      // Check if file exists before reading
      if (!fs.existsSync(dataPath)) {
        console.log('⚠️ Static data file not found, creating minimal test data')
        throw new Error('Static data file not found')
      }
      
      const fileContent = fs.readFileSync(dataPath, 'utf-8')
      const staticOpportunities = JSON.parse(fileContent) as Opportunity[]
      
      // Enhance static opportunities with proper agency structure
      const agenciesData = loadAgenciesData()
      const allAgencies = [...(agenciesData.agencies?.departments || []), ...(agenciesData.agencies?.agencies || [])]
      
      cachedOpportunities = staticOpportunities.map(opp => {
        // Ensure agency structure is properly formatted
        let enhancedAgency = opp.agency
        if (typeof opp.agency === 'string') {
          // Try to find matching agency from agencies.json
          const foundAgency = allAgencies.find(agency => 
            agency.name.toLowerCase().includes(opp.agency.toLowerCase()) ||
            agency.abbreviation.toLowerCase() === opp.agency.toLowerCase()
          )
          if (foundAgency) {
            enhancedAgency = {
              code: foundAgency.code,
              name: foundAgency.name,
              abbreviation: foundAgency.abbreviation
            }
          } else {
            // Create agency object from string
            enhancedAgency = {
              code: opp.agencyCode || 'UNKNOWN',
              name: opp.agency,
              abbreviation: opp.agency.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 4)
            }
          }
        }
        
        // Map opportunity types to common filter values
        let mappedOpportunityType = opp.opportunityType || opp.type || 'RFP'
        if (mappedOpportunityType === 'SOLICITATION') {
          mappedOpportunityType = 'RFP' // Default SOLICITATION to RFP
        }
        
        // Add PSC codes if missing (derive from NAICS or use defaults)
        let pscCodes = opp.pscCodes || []
        if (pscCodes.length === 0 && opp.naicsCodes?.length > 0) {
          // Map common NAICS to PSC codes
          const naicsCode = opp.naicsCodes[0]
          if (naicsCode.startsWith('541')) {
            // Professional services
            pscCodes = ['D316', 'D302', 'R425']
          } else if (naicsCode.startsWith('518')) {
            // IT/Data processing
            pscCodes = ['D316', 'D307', 'D301']
          } else if (naicsCode.startsWith('334')) {
            // Computer/Electronics
            pscCodes = ['7025', '7030', '7035']
          } else {
            // Default
            pscCodes = ['D316']
          }
        }
        
        // Generate realistic contact information
        const contactInfo = generateContactInfo(enhancedAgency, opp.placeOfPerformance || { city: opp.city, state: opp.state })
        
        // Create the enhanced opportunity first
        const enhancedOpp = {
          ...opp,
          agency: enhancedAgency,
          agencyCode: enhancedAgency?.code || opp.agencyCode,
          // Ensure performance state is set
          performanceState: opp.performanceState || opp.state || opp.placeOfPerformance?.state,
          // Ensure status has a default
          status: opp.status || 'ACTIVE',
          // Use mapped opportunity type
          opportunityType: mappedOpportunityType,
          // Add PSC codes
          pscCodes: pscCodes,
          // Ensure source system has a default
          sourceSystem: opp.sourceSystem || 'SAM_GOV',
          // Add generated contact information
          pointOfContact: contactInfo
        }
        
        // Generate realistic attachments for this opportunity
        const attachments = generateAttachments(enhancedOpp)

        return {
          ...enhancedOpp,
          // Add generated attachments
          attachments: attachments
        }
      })
      
      console.log(`✅ Loaded ${cachedOpportunities.length} static opportunities from data/opportunities.json`)
    } catch (error) {
      console.error('❌ Failed to load static opportunities, creating minimal test data:', error)
      
      // Create minimal test data with proper agency structure for debugging
      const agenciesData = loadAgenciesData()
      const departments = agenciesData.agencies?.departments || []
      
      // Use actual agencies from agencies.json
      const dod = departments.find(d => d.abbreviation === 'DOD') || departments[0]
      const doe = departments.find(d => d.abbreviation === 'DOE') || departments[1]
      
      cachedOpportunities = [
        {
          id: 'test-opp-1',
          title: 'IT Infrastructure Modernization Services',
          description: 'Government agency seeking IT infrastructure modernization services including cloud migration and cybersecurity.',
          agency: {
            code: dod?.code || '9700',
            name: dod?.name || 'Department of Defense',
            abbreviation: dod?.abbreviation || 'DOD'
          },
          agencyCode: dod?.code || '9700',
          state: 'NY',
          location: 'New York, NY',
          contractValue: 500000,
          postedDate: new Date().toISOString(),
          deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          naicsCodes: ['541511', '541512'],
          setAsideType: 'SMALL_BUSINESS',
          opportunityType: 'RFP',
          type: 'RFP',
          status: 'ACTIVE',
          sourceSystem: 'SAM_GOV',
          placeOfPerformance: {
            city: 'New York',
            state: 'NY',
            zipCode: '10001',
            country: 'USA'
          },
          performanceState: 'NY',
          pscCodes: ['D316', 'D302'],
          pointOfContact: [{
            firstName: 'John',
            lastName: 'Smith',
            fullName: 'John Smith',
            email: 'john.smith@defense.gov',
            phone: '555-123-4567',
            title: 'Program Manager',
            type: 'PRIMARY_POINT_OF_CONTACT',
            address: {
              city: 'New York',
              state: 'NY',
              zipCode: '10001',
              country: 'USA'
            },
            source: 'SAM_GOV',
            confidence: 95,
            lastValidated: new Date().toISOString()
          }],
          attachments: generateAttachments({
            id: 'test-opp-1',
            solicitationNumber: 'DOD-24-001'
          })
        },
        {
          id: 'test-opp-2',
          title: 'Smart Grid Technology Implementation',
          description: 'State agency requires smart grid technology implementation services for energy infrastructure modernization.',
          agency: {
            code: doe?.code || '8900',
            name: doe?.name || 'Department of Energy',
            abbreviation: doe?.abbreviation || 'DOE'
          },
          agencyCode: doe?.code || '8900',
          state: 'CA',
          location: 'Los Angeles, CA',
          contractValue: 750000,
          postedDate: new Date().toISOString(),
          deadline: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString(),
          naicsCodes: ['541330', '541511'],
          setAsideType: 'WOMAN_OWNED_SMALL_BUSINESS',
          opportunityType: 'RFQ',
          type: 'RFQ',
          status: 'ACTIVE',
          sourceSystem: 'GRANTS_GOV',
          placeOfPerformance: {
            city: 'Los Angeles',
            state: 'CA',
            zipCode: '90210',
            country: 'USA'
          },
          performanceState: 'CA',
          pscCodes: ['R425', 'R408'],
          pointOfContact: [{
            firstName: 'Jane',
            lastName: 'Doe',
            fullName: 'Jane Doe',
            email: 'jane.doe@energy.gov',
            phone: '555-987-6543',
            title: 'Project Manager',
            type: 'PRIMARY_POINT_OF_CONTACT',
            address: {
              city: 'Los Angeles',
              state: 'CA',
              zipCode: '90210',
              country: 'USA'
            },
            source: 'SAM_GOV',
            confidence: 92,
            lastValidated: new Date().toISOString()
          }],
          attachments: generateAttachments({
            id: 'test-opp-2',
            solicitationNumber: 'DOE-24-002'
          })
        }
      ] as Opportunity[]
      
      console.log(`✅ Created ${cachedOpportunities.length} minimal test opportunities`)
    }
  }
  return cachedOpportunities
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    // Log all received parameters
    console.log('📝 MOCK API: Received request with parameters:', {
      url: request.url,
      allParams: Object.fromEntries(searchParams.entries()),
      timestamp: new Date().toISOString()
    })
    
    // Parse search parameters
    const query = searchParams.get('query') || ''
    const limit = Math.min(Number(searchParams.get('limit')) || 10, 50)
    const offset = Number(searchParams.get('offset')) || 0
    const sort = searchParams.get('sort') || 'postedDate'
    const order = searchParams.get('order') || 'desc'
    
    // Parse filter parameters
    const performanceStates = searchParams.get('performanceStates')?.split(',').filter(s => s.trim()) || []
    const performanceCities = searchParams.get('performanceCities')?.split(',').filter(s => s.trim()) || []
    const performanceZipCodes = searchParams.get('performanceZipCodes')?.split(',').filter(s => s.trim()) || []
    const securityClearances = searchParams.get('securityClearances')?.split(',').filter(s => s.trim()) || []
    
    console.log('🔍 API Search Query:', query)
    console.log('📝 URL Params:', Object.fromEntries(searchParams.entries()))
    console.log('🎯 Performance Filters:', { performanceStates, performanceCities, performanceZipCodes, securityClearances })
    
    // Get opportunities data
    const mockOpportunities = getMockOpportunities()
    
    // Filter opportunities based on query
    let filteredOpportunities = mockOpportunities
    
    if (query) {
      console.log(`🎯 Filtering ${filteredOpportunities.length} opportunities with query: "${query}"`)
      
      const lowerQuery = query.toLowerCase()
      const searchTerms = lowerQuery.split(/\s+/).filter(term => term.length > 0)
      
      filteredOpportunities = filteredOpportunities.filter(opp => {
        return searchTerms.every(term => {
          // Search in title
          const titleMatches = opp.title?.toLowerCase().includes(term)
          
          // Search in description
          const descriptionMatches = opp.description?.toLowerCase().includes(term)
          
          // Search in state
          const stateMatches = opp.state?.toLowerCase() === term || 
                               opp.placeOfPerformance?.state?.toLowerCase() === term
          
          // Search in location
          const locationMatches = opp.location?.toLowerCase().includes(term)
          
          // Search in agency
          const agencyName = typeof opp.agency === 'string' ? opp.agency : opp.agency?.name || ''
          const agencyMatches = agencyName.toLowerCase().includes(term)
          
          // Search in NAICS codes
          const naicsMatches = (opp.naicsCodes || []).some(code => 
            code === term || code.includes(term)
          )
          
          // Search in PSC codes
          const pscMatches = (opp.pscCodes || []).some(code => 
            code?.toLowerCase() === term || code?.toLowerCase().includes(term)
          )
          
          return titleMatches || descriptionMatches || stateMatches || 
                 locationMatches || agencyMatches || naicsMatches || pscMatches
        })
      })
      
      console.log(`✅ Search filtering complete: Found ${filteredOpportunities.length} matching opportunities`)
    }

    // Filter by performance states
    if (performanceStates.length > 0) {
      console.log(`🎯 Filtering by performance states: ${performanceStates.join(', ')}`)
      const beforeCount = filteredOpportunities.length
      filteredOpportunities = filteredOpportunities.filter(opp => {
        const oppState = opp.performanceState || opp.state || opp.placeOfPerformance?.state || ''
        return performanceStates.some(state => {
          const filterState = state.toLowerCase().trim()
          const oppStateNormalized = oppState.toLowerCase().trim()
          return oppStateNormalized === filterState || oppStateNormalized.includes(filterState)
        })
      })
      console.log(`📊 Performance state filter: ${beforeCount} → ${filteredOpportunities.length}`)
    }

    // Filter by performance cities
    if (performanceCities.length > 0) {
      console.log(`🎯 Filtering by performance cities: ${performanceCities.join(', ')}`)
      const beforeCount = filteredOpportunities.length
      filteredOpportunities = filteredOpportunities.filter(opp => {
        const oppCity = opp.city || opp.placeOfPerformance?.city || ''
        const oppLocation = opp.location || ''
        return performanceCities.some(city => {
          const filterCity = city.toLowerCase().trim()
          const oppCityNormalized = oppCity.toLowerCase().trim()
          const oppLocationNormalized = oppLocation.toLowerCase().trim()
          return oppCityNormalized === filterCity || 
                 oppCityNormalized.includes(filterCity) ||
                 oppLocationNormalized.includes(filterCity)
        })
      })
      console.log(`📊 Performance city filter: ${beforeCount} → ${filteredOpportunities.length}`)
    }

    // Filter by performance ZIP codes
    if (performanceZipCodes.length > 0) {
      console.log(`🎯 Filtering by performance ZIP codes: ${performanceZipCodes.join(', ')}`)
      const beforeCount = filteredOpportunities.length
      filteredOpportunities = filteredOpportunities.filter(opp => {
        const oppZip = opp.placeOfPerformance?.zipCode || ''
        return performanceZipCodes.some(zip => {
          const filterZip = zip.toString().trim()
          const oppZipNormalized = oppZip.toString().trim()
          return oppZipNormalized === filterZip || 
                 oppZipNormalized.startsWith(filterZip) ||
                 filterZip.startsWith(oppZipNormalized)
        })
      })
      console.log(`📊 Performance ZIP code filter: ${beforeCount} → ${filteredOpportunities.length}`)
    }

    // Filter by security clearances
    if (securityClearances.length > 0) {
      console.log(`🎯 Filtering by security clearances: ${securityClearances.join(', ')}`)
      const beforeCount = filteredOpportunities.length
      filteredOpportunities = filteredOpportunities.filter(opp => {
        const oppClearance = opp.securityClearanceRequired || opp.securityClearance || ''
        return securityClearances.some(clearance => {
          const filterClearance = clearance.toLowerCase().trim()
          const oppClearanceNormalized = oppClearance.toLowerCase().trim()
          // Handle various clearance formats
          return oppClearanceNormalized === filterClearance ||
                 oppClearanceNormalized.includes(filterClearance) ||
                 oppClearanceNormalized.replace(/\s+/g, '_') === filterClearance.replace(/\s+/g, '_')
        })
      })
      console.log(`📊 Security clearance filter: ${beforeCount} → ${filteredOpportunities.length}`)
    }

    // Sort opportunities
    filteredOpportunities.sort((a, b) => {
      let comparison = 0
      
      switch (sort) {
        case 'postedDate':
          comparison = new Date(a.postedDate).getTime() - new Date(b.postedDate).getTime()
          break
        case 'deadline':
          comparison = new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
          break
        case 'contractValue':
          comparison = (a.contractValue || 0) - (b.contractValue || 0)
          break
        case 'title':
          comparison = a.title.localeCompare(b.title)
          break
        default:
          comparison = new Date(a.postedDate).getTime() - new Date(b.postedDate).getTime()
      }
      
      return order === 'desc' ? -comparison : comparison
    })

    // Apply pagination
    const paginatedOpportunities = filteredOpportunities.slice(offset, offset + limit)
    const total = filteredOpportunities.length

    const response: ApiResponse<PaginatedResponse<Opportunity>> = {
      success: true,
      data: {
        items: paginatedOpportunities,
        total,
        page: Math.floor(offset / limit) + 1,
        limit,
        hasMore: offset + limit < total
      }
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Error fetching mock opportunities:', error)
    
    const errorResponse: ApiResponse<null> = {
      success: false,
      error: 'Failed to fetch opportunities',
      message: error instanceof Error ? error.message : 'Unknown error'
    }
    
    return NextResponse.json(errorResponse, { status: 500 })
  }
}