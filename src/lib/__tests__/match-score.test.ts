import { calculateMatchScore, calculateBatchMatchScores } from '../match-score'
import { Profile, Opportunity } from '@/types'

// Mock profile for testing
const mockProfile: Profile = {
  id: 'test-profile-1',
  organizationId: 'test-org-1',
  companyName: 'Test Tech Solutions',
  state: 'VA',
  primaryNaics: '541511',
  secondaryNaics: ['541512', '518210'],
  certifications: {
    hasMinorityOwned: true,
    hasWomanOwned: false,
    hasVeteranOwned: true,
    hasHubzone: false,
    hasSmallBusiness: true
  },
  pastPerformance: {
    description: 'Extensive experience in federal IT projects',
    keyProjects: [
      { name: 'DOD Cloud Migration', value: 5000000 },
      { name: 'VA Healthcare System', value: 3000000 }
    ]
  },
  createdAt: new Date(),
  updatedAt: new Date(),
  createdById: 'test-user',
  profileCompleteness: 85
}

// Mock opportunities for testing
const mockOpportunities: Opportunity[] = [
  {
    id: '1',
    title: 'IT Support Services',
    agency: 'Department of Defense',
    location: 'Arlington, VA',
    state: 'VA',
    naicsCodes: ['541511'],
    deadline: new Date(),
    contractValue: 2500000,
    externalId: 'test-1',
    agencyCode: 'DOD',
    solicitationNumber: 'W91CRB-24-R-0001',
    type: 'SOLICITATION',
    description: 'IT support services',
    postedDate: new Date(),
    sourceData: {
      sourceSystem: 'test',
      sourceId: 'test-1'
    },
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '2',
    title: 'Cloud Infrastructure',
    agency: 'General Services Administration',
    location: 'Washington, DC',
    state: 'DC',
    naicsCodes: ['518210'],
    deadline: new Date(),
    contractValue: 15000000,
    externalId: 'test-2',
    agencyCode: 'GSA',
    solicitationNumber: 'GSA-24-CLOUD-001',
    type: 'RFP',
    description: 'Cloud infrastructure services',
    postedDate: new Date(),
    sourceData: {
      sourceSystem: 'test',
      sourceId: 'test-2'
    },
    createdAt: new Date(),
    updatedAt: new Date()
  }
]

describe('MatchScore Algorithm', () => {
  describe('Single Score Calculation Performance', () => {
    it('should calculate a single match score in under 1 second', () => {
      const startTime = performance.now()
      
      const result = calculateMatchScore(mockProfile, mockOpportunities[0])
      
      const endTime = performance.now()
      const duration = endTime - startTime
      
      console.log(`Single score calculation took ${duration.toFixed(2)}ms`)
      
      expect(duration).toBeLessThan(1000) // Less than 1 second
      expect(result.score).toBeGreaterThanOrEqual(0)
      expect(result.score).toBeLessThanOrEqual(100)
      expect(result.breakdown).toBeDefined()
      expect(result.explanation).toBeDefined()
    })
  })

  describe('Batch Score Calculation Performance', () => {
    it('should calculate batch scores for 50 opportunities in under 3 seconds', () => {
      // Create 50 opportunities for testing
      const largeOpportunitySet = Array.from({ length: 50 }, (_, i) => ({
        ...mockOpportunities[0],
        id: `test-${i + 1}`,
        title: `Test Opportunity ${i + 1}`
      }))
      
      const startTime = performance.now()
      
      const results = calculateBatchMatchScores(mockProfile, largeOpportunitySet)
      
      const endTime = performance.now()
      const duration = endTime - startTime
      
      console.log(`Batch score calculation (50 opportunities) took ${duration.toFixed(2)}ms`)
      
      expect(duration).toBeLessThan(3000) // Less than 3 seconds
      expect(results.size).toBe(50)
      
      // Verify all scores are valid
      results.forEach((result, opportunityId) => {
        expect(result.score).toBeGreaterThanOrEqual(0)
        expect(result.score).toBeLessThanOrEqual(100)
        expect(result.breakdown).toBeDefined()
        expect(result.explanation).toBeDefined()
      })
    })
  })

  describe('Algorithm Accuracy', () => {
    it('should score exact NAICS match higher than different NAICS', () => {
      const exactMatchOpp = {
        ...mockOpportunities[0],
        naicsCodes: ['541511'] // Exact match with profile
      }
      
      const differentNaicsOpp = {
        ...mockOpportunities[0],
        naicsCodes: ['123456'] // No match with profile
      }
      
      const exactResult = calculateMatchScore(mockProfile, exactMatchOpp)
      const differentResult = calculateMatchScore(mockProfile, differentNaicsOpp)
      
      expect(exactResult.score).toBeGreaterThan(differentResult.score)
      expect(exactResult.breakdown.naicsAlignment.score).toBeGreaterThan(
        differentResult.breakdown.naicsAlignment.score
      )
    })

    it('should score same state higher than different state', () => {
      const sameStateOpp = {
        ...mockOpportunities[0],
        state: 'VA' // Same as profile
      }
      
      const differentStateOpp = {
        ...mockOpportunities[0], 
        state: 'CA' // Different from profile
      }
      
      const sameStateResult = calculateMatchScore(mockProfile, sameStateOpp)
      const differentStateResult = calculateMatchScore(mockProfile, differentStateOpp)
      
      expect(sameStateResult.breakdown.geographicProximity.score).toBeGreaterThan(
        differentStateResult.breakdown.geographicProximity.score
      )
    })
  })

  describe('Score Breakdown Validation', () => {
    it('should have correct factor weights totaling 100%', () => {
      const result = calculateMatchScore(mockProfile, mockOpportunities[0])
      
      const totalWeight = 
        result.breakdown.naicsAlignment.weight +
        result.breakdown.geographicProximity.weight +
        result.breakdown.certificationMatch.weight +
        result.breakdown.pastPerformance.weight
      
      expect(totalWeight).toBe(100)
    })

    it('should have detailed explanations for each factor', () => {
      const result = calculateMatchScore(mockProfile, mockOpportunities[0])
      
      expect(result.breakdown.naicsAlignment.details).toBeDefined()
      expect(result.breakdown.geographicProximity.details).toBeDefined()
      expect(result.breakdown.certificationMatch.details).toBeDefined()
      expect(result.breakdown.pastPerformance.details).toBeDefined()
      
      expect(typeof result.explanation).toBe('string')
      expect(result.explanation.length).toBeGreaterThan(10)
    })
  })
})