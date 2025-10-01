/**
 * @swagger
 * /api/v1/opportunity-relationship:
 *   post:
 *     tags: [Data Relationships]
 *     summary: Find relationship between SAM.gov opportunity and USAspending.gov awards
 *     description: |
 *       Research and establish relationships between SAM.gov opportunities and their corresponding
 *       USAspending.gov contract awards using solicitation numbers and other identifiers.
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [solicitationNumber]
 *             properties:
 *               solicitationNumber:
 *                 type: string
 *                 description: SAM.gov solicitation number to search for
 *                 example: "W15P7T-24-R-0001"
 *               opportunityTitle:
 *                 type: string
 *                 description: Opportunity title for additional matching
 *                 example: "IT Support Services"
 *               agency:
 *                 type: string
 *                 description: Awarding agency name
 *                 example: "Department of Defense"
 *               naicsCode:
 *                 type: string
 *                 description: Primary NAICS code
 *                 example: "541511"
 *     responses:
 *       200:
 *         description: Relationship research completed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 relationships:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       awardId:
 *                         type: string
 *                       confidence:
 *                         type: string
 *                         enum: [HIGH, MEDIUM, LOW]
 *                       matchType:
 *                         type: string
 *                         enum: [EXACT_SOLICITATION, PARTIAL_SOLICITATION, AGENCY_NAICS_DATE, FUZZY_MATCH]
 *                       award:
 *                         $ref: '#/components/schemas/SimilarContract'
 *                 searchStrategy:
 *                   type: object
 *                   properties:
 *                     exactSolicitationMatch:
 *                       type: boolean
 *                     agencyAndNaicsMatch:
 *                       type: boolean
 *                     fuzzyTextMatch:
 *                       type: boolean
 *       400:
 *         description: Invalid request parameters
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: API error
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { z } from 'zod'
import { withRateLimit, rateLimitConfigs } from '@/lib/rate-limit'
import { withApiTracking } from '@/lib/api-tracking'
import { asyncHandler } from '@/lib/api-errors'
import { createUSAspendingProvider } from '@/lib/data-providers/usaspending-provider'
import type { SimilarContract } from '@/types'

const RelationshipSearchSchema = z.object({
  solicitationNumber: z.string().min(1).describe("SAM.gov solicitation number"),
  opportunityTitle: z.string().optional().describe("Opportunity title for matching"),
  agency: z.string().optional().describe("Awarding agency name"),
  naicsCode: z.string().optional().describe("Primary NAICS code"),
  estimatedValue: z.number().optional().describe("Estimated contract value")
})

interface RelationshipMatch {
  awardId: string
  confidence: 'HIGH' | 'MEDIUM' | 'LOW'
  matchType: 'EXACT_SOLICITATION' | 'PARTIAL_SOLICITATION' | 'AGENCY_NAICS_DATE' | 'FUZZY_MATCH'
  award: SimilarContract
  matchReasons: string[]
}

// Initialize USAspending provider
let usaspendingProvider: ReturnType<typeof createUSAspendingProvider> | null = null

function getUSAspendingProvider() {
  if (!usaspendingProvider) {
    usaspendingProvider = createUSAspendingProvider()
  }
  return usaspendingProvider
}

async function findOpportunityRelationships(searchParams: {
  solicitationNumber: string
  opportunityTitle?: string
  agency?: string
  naicsCode?: string
  estimatedValue?: number
}): Promise<RelationshipMatch[]> {
  const provider = getUSAspendingProvider()
  const relationships: RelationshipMatch[] = []
  
  console.log(`🔍 [Relationship Search] Starting search for solicitation: ${searchParams.solicitationNumber}`)
  
  try {
    // Strategy 1: Direct solicitation number match
    console.log('📋 [Strategy 1] Searching for exact solicitation number match...')
    const directMatches = await provider.findRelatedContracts(searchParams.solicitationNumber)
    
    for (const contract of directMatches) {
      // Check for exact solicitation match in various fields
      const exactMatch = [
        contract.solicitationNumber,
        contract.awardNumber,
        contract.description
      ].some(field => 
        field?.toLowerCase().includes(searchParams.solicitationNumber.toLowerCase())
      )
      
      if (exactMatch) {
        relationships.push({
          awardId: contract.id,
          confidence: 'HIGH',
          matchType: 'EXACT_SOLICITATION',
          award: contract,
          matchReasons: ['Exact solicitation number match found']
        })
      } else {
        // Partial match - solicitation appears in description or other fields
        relationships.push({
          awardId: contract.id,
          confidence: 'MEDIUM',
          matchType: 'PARTIAL_SOLICITATION',
          award: contract,
          matchReasons: ['Solicitation number referenced in contract data']
        })
      }
    }
    
    // Strategy 2: Agency + NAICS + Date range matching
    if (searchParams.agency && searchParams.naicsCode && relationships.length < 3) {
      console.log('🏛️ [Strategy 2] Searching by agency, NAICS, and estimated value...')
      
      const agencyMatches = await provider.fetchSimilarContracts({
        naicsCodes: [searchParams.naicsCode],
        estimatedValue: searchParams.estimatedValue,
        limit: 5,
        dateFrom: new Date('2022-01-01'), // Look back 2+ years
        dateTo: new Date()
      })
      
      for (const contract of agencyMatches) {
        // Skip if already found
        if (relationships.some(rel => rel.awardId === contract.id)) continue
        
        const matchReasons: string[] = []
        let confidence: 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW'
        
        // Check agency match
        if (contract.agency.name.toLowerCase().includes(searchParams.agency.toLowerCase()) ||
            searchParams.agency.toLowerCase().includes(contract.agency.name.toLowerCase())) {
          matchReasons.push('Agency match')
          confidence = 'MEDIUM'
        }
        
        // Check NAICS match
        if (contract.naicsCodes?.includes(searchParams.naicsCode)) {
          matchReasons.push('NAICS code match')
          if (confidence === 'MEDIUM') confidence = 'HIGH'
        }
        
        // Check title similarity if provided
        if (searchParams.opportunityTitle && contract.title) {
          const titleSimilarity = calculateStringSimilarity(
            searchParams.opportunityTitle.toLowerCase(),
            contract.title.toLowerCase()
          )
          if (titleSimilarity > 0.7) {
            matchReasons.push('High title similarity')
            confidence = 'HIGH'
          } else if (titleSimilarity > 0.4) {
            matchReasons.push('Moderate title similarity')
          }
        }
        
        if (matchReasons.length > 0) {
          relationships.push({
            awardId: contract.id,
            confidence,
            matchType: 'AGENCY_NAICS_DATE',
            award: contract,
            matchReasons
          })
        }
      }
    }
    
    // Strategy 3: Fuzzy text matching on opportunity title
    if (searchParams.opportunityTitle && relationships.length < 5) {
      console.log('🔤 [Strategy 3] Fuzzy text matching on opportunity title...')
      
      // Search for contracts with similar descriptions
      const fuzzyMatches = await provider.fetchSimilarContracts({
        naicsCodes: searchParams.naicsCode ? [searchParams.naicsCode] : undefined,
        limit: 10,
        dateFrom: new Date('2022-01-01')
      })
      
      for (const contract of fuzzyMatches) {
        // Skip if already found
        if (relationships.some(rel => rel.awardId === contract.id)) continue
        
        const titleSimilarity = calculateStringSimilarity(
          searchParams.opportunityTitle.toLowerCase(),
          contract.title.toLowerCase()
        )
        
        const descSimilarity = calculateStringSimilarity(
          searchParams.opportunityTitle.toLowerCase(),
          contract.description?.toLowerCase() || ''
        )
        
        const maxSimilarity = Math.max(titleSimilarity, descSimilarity)
        
        if (maxSimilarity > 0.6) {
          relationships.push({
            awardId: contract.id,
            confidence: maxSimilarity > 0.8 ? 'HIGH' : 'MEDIUM',
            matchType: 'FUZZY_MATCH',
            award: contract,
            matchReasons: [
              `${Math.round(maxSimilarity * 100)}% text similarity`,
              maxSimilarity === titleSimilarity ? 'Title match' : 'Description match'
            ]
          })
        }
      }
    }
    
    // Sort by confidence and similarity
    relationships.sort((a, b) => {
      const confidenceOrder = { 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 }
      const aScore = confidenceOrder[a.confidence]
      const bScore = confidenceOrder[b.confidence]
      
      if (aScore !== bScore) return bScore - aScore
      
      // Secondary sort by match type preference
      const typeOrder = { 
        'EXACT_SOLICITATION': 4, 
        'PARTIAL_SOLICITATION': 3,
        'AGENCY_NAICS_DATE': 2, 
        'FUZZY_MATCH': 1 
      }
      return typeOrder[b.matchType] - typeOrder[a.matchType]
    })
    
    console.log(`✅ [Relationship Search] Found ${relationships.length} potential relationships`)
    return relationships.slice(0, 5) // Return top 5 matches
    
  } catch (error) {
    console.error('❌ [Relationship Search] Error finding relationships:', error)
    return []
  }
}

// Simple string similarity using Levenshtein distance
function calculateStringSimilarity(str1: string, str2: string): number {
  if (str1 === str2) return 1.0
  if (str1.length === 0 || str2.length === 0) return 0.0
  
  const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null))
  
  for (let i = 0; i <= str1.length; i++) matrix[0][i] = i
  for (let j = 0; j <= str2.length; j++) matrix[j][0] = j
  
  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,     // deletion
        matrix[j - 1][i] + 1,     // insertion
        matrix[j - 1][i - 1] + indicator   // substitution
      )
    }
  }
  
  const maxLength = Math.max(str1.length, str2.length)
  return (maxLength - matrix[str2.length][str1.length]) / maxLength
}

// POST /api/v1/opportunity-relationship - Find relationships
async function handlePOST(request: NextRequest) {
  return withRateLimit(rateLimitConfigs.api, 'opportunity-relationship')(request, async () => {
    // Check authentication
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Unauthorized. Please sign in to research opportunity relationships.' 
      }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = RelationshipSearchSchema.parse(body)
    
    console.log(`🔍 [Opportunity Relationship] Searching for relationships for solicitation: ${validatedData.solicitationNumber}`)

    try {
      const relationships = await findOpportunityRelationships({
        solicitationNumber: validatedData.solicitationNumber,
        opportunityTitle: validatedData.opportunityTitle,
        agency: validatedData.agency,
        naicsCode: validatedData.naicsCode,
        estimatedValue: validatedData.estimatedValue
      })
      
      console.log(`✅ [Opportunity Relationship] Found ${relationships.length} potential relationships`)

      return NextResponse.json({
        success: true,
        relationships,
        searchStrategy: {
          exactSolicitationMatch: relationships.some(r => r.matchType === 'EXACT_SOLICITATION'),
          agencyAndNaicsMatch: relationships.some(r => r.matchType === 'AGENCY_NAICS_DATE'),
          fuzzyTextMatch: relationships.some(r => r.matchType === 'FUZZY_MATCH')
        },
        totalFound: relationships.length
      })

    } catch (error) {
      console.error('❌ [Opportunity Relationship] Failed to find relationships:', error)
      
      return NextResponse.json({
        success: false,
        error: 'Failed to research opportunity relationships',
        details: error.message
      }, { status: 500 })
    }
  })
}

export const POST = withApiTracking(asyncHandler(handlePOST))