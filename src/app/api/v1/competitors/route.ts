/**
 * @swagger
 * /api/v1/competitors:
 *   post:
 *     tags: [Competitive Intelligence]
 *     summary: Fetch competitor entities from USAspending.gov
 *     description: |
 *       Retrieve entities that have won similar government contracts based on opportunity characteristics.
 *       Analyzes USAspending.gov historical award data to identify competitors by NAICS codes, 
 *       service codes, place of performance, and contract value. Returns aggregated contractor 
 *       information with competitive intelligence metrics.
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [opportunityId]
 *             properties:
 *               opportunityId:
 *                 type: string
 *                 description: The opportunity ID to find competitors for
 *                 example: "rt_123456"
 *               naicsCodes:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: NAICS codes to filter by
 *                 example: ["541511", "541512"]
 *               pscCodes:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: PSC codes to filter by
 *                 example: ["D302", "R425"]
 *               state:
 *                 type: string
 *                 description: Place of performance state
 *                 example: "CA"
 *               city:
 *                 type: string
 *                 description: Place of performance city
 *                 example: "San Francisco"
 *               estimatedValue:
 *                 type: number
 *                 description: Estimated contract value for competitive analysis
 *                 example: 500000
 *               limit:
 *                 type: number
 *                 default: 10
 *                 maximum: 50
 *                 description: Maximum number of competitor entities to return
 *     responses:
 *       200:
 *         description: Competitor entities retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/CompetitorEntity'
 *                 totalFound:
 *                   type: number
 *                   example: 5
 *                 searchCriteria:
 *                   type: object
 *                   properties:
 *                     naicsMatch:
 *                       type: boolean
 *                     pscMatch:
 *                       type: boolean
 *                     stateMatch:
 *                       type: boolean
 *                     cityMatch:
 *                       type: boolean
 *                     valueRange:
 *                       type: string
 *       400:
 *         description: Invalid request parameters
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: USAspending.gov API error
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { z } from 'zod'
import { withRateLimit, rateLimitConfigs } from '@/lib/rate-limit'
import { withApiTracking } from '@/lib/api-tracking'
import { asyncHandler } from '@/lib/api-errors'
import { createUSAspendingProvider } from '@/lib/data-providers/usaspending-provider'

const CompetitorsSchema = z.object({
  opportunityId: z.string().min(1).describe("Opportunity ID to find competitors for"),
  naicsCodes: z.array(z.string()).optional().describe("NAICS codes for filtering"),
  pscCodes: z.array(z.string()).optional().describe("PSC codes for filtering"),
  state: z.string().optional().describe("Place of performance state"),
  city: z.string().optional().describe("Place of performance city"),
  estimatedValue: z.number().optional().describe("Estimated contract value"),
  limit: z.number().min(1).max(50).default(10).describe("Maximum number of competitor entities")
})

// Initialize USAspending provider (singleton pattern)
let usaspendingProvider: ReturnType<typeof createUSAspendingProvider> | null = null

function getUSAspendingProvider() {
  if (!usaspendingProvider) {
    usaspendingProvider = createUSAspendingProvider()
  }
  return usaspendingProvider
}

interface CompetitorEntity {
  id: string
  name: string
  uei?: string
  recipientId?: string
  duns?: string
  location: {
    city?: string
    state?: string
    zipCode?: string
    address?: string
  }
  businessType?: string
  businessSize?: string
  
  // Aggregated contract data
  totalContracts: number
  totalValue: number
  averageValue: number
  recentContracts: {
    awardDate: Date | string
    awardAmount: number
    title: string
    agency: string
    awardId?: string
    naicsCodes?: string[]
    pscCodes?: string[]
  }[]
  
  // Similarity metrics
  matchReasons: string[]
  competitiveAdvantage?: string[]
}

// POST /api/v1/competitors - Fetch competitor entities
async function handlePOST(request: NextRequest) {
  return withRateLimit(rateLimitConfigs.api, 'competitors')(request, async () => {
    // Check authentication
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Unauthorized. Please sign in to view competitive intelligence.' 
      }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = CompetitorsSchema.parse(body)
    
    console.log(`🔍 [Competitors] Analyzing competition for opportunity: ${validatedData.opportunityId}`, {
      naicsCodes: validatedData.naicsCodes,
      pscCodes: validatedData.pscCodes,
      state: validatedData.state,
      city: validatedData.city,
      estimatedValue: validatedData.estimatedValue,
      limit: validatedData.limit
    })

    try {
      // Get USAspending provider instance
      const provider = getUSAspendingProvider()
      
      // Fetch a larger pool of similar contracts to analyze competitors
      const similarContracts = await provider.fetchSimilarContracts({
        naicsCodes: validatedData.naicsCodes,
        pscCodes: validatedData.pscCodes,
        state: validatedData.state,
        estimatedValue: validatedData.estimatedValue,
        limit: 50 // Get more contracts to analyze competitors
      })
      
      console.log(`📊 [Competitors] Analyzing ${similarContracts.length} contracts for competitor entities`)

      // Aggregate contractors from similar contracts
      const competitorMap = new Map<string, {
        name: string
        contracts: typeof similarContracts
        totalValue: number
        recipientId?: string
        uei?: string
        duns?: string
        location: any
        businessType?: string
        businessSize?: string
      }>()

      // Process contracts to find unique competitors
      for (const contract of similarContracts) {
        if (!contract.recipientName) continue

        const competitorKey = contract.recipientName.toLowerCase().trim()
        
        if (!competitorMap.has(competitorKey)) {
          competitorMap.set(competitorKey, {
            name: contract.recipientName,
            contracts: [],
            totalValue: 0,
            recipientId: contract.recipientId,
            uei: contract.recipientUei,
            duns: contract.vendor?.duns || contract.vendor?.dunsNumber,
            location: contract.vendor?.location || contract.placeOfPerformance || {},
            businessType: contract.vendor?.businessType,
            businessSize: contract.vendor?.businessSize
          })
        }

        const competitor = competitorMap.get(competitorKey)!
        competitor.contracts.push(contract)
        competitor.totalValue += contract.awardedValue || 0
      }

      // Transform to competitor entities with competitive intelligence
      const competitorEntries = Array.from(competitorMap.entries())
        .filter(([_, data]) => data.contracts.length > 0) // Only entities with contracts
      
      // Fetch accurate total values for each competitor in parallel
      const competitorsWithTotals = await Promise.all(
        competitorEntries.map(async ([_, data]) => {
          // Fetch accurate total values using USAspending API
          let actualTotalValue = data.totalValue
          let actualTotalContracts = data.contracts.length
          let actualAverageValue = actualTotalContracts > 0 ? data.totalValue / actualTotalContracts : 0
          
          console.log(`📊 Initial calculation for ${data.name}: $${actualTotalValue.toLocaleString()} / ${actualTotalContracts} contracts = $${actualAverageValue.toLocaleString()} avg`)
          
          if (data.recipientId) {
            try {
              const recipientTotals = await provider.fetchRecipientTotalValue(
                data.recipientId,
                data.name, // Pass recipient name for proper filtering
                data.uei, // Pass UEI for most precise search
                validatedData.naicsCodes,
                validatedData.pscCodes
              )
              
              // Always use API totals when available (more comprehensive than sample data)
              if (recipientTotals.totalValue > 0) {
                actualTotalValue = recipientTotals.totalValue
                actualTotalContracts = recipientTotals.totalContracts
                actualAverageValue = recipientTotals.averageValue
                console.log(`✅ Using comprehensive totals for ${data.name}: $${actualTotalValue.toLocaleString()} / ${actualTotalContracts} contracts`)
              } else {
                console.log(`⚠️ API returned zero totals for ${data.name}, using contract-based calculation`)
                // Fallback: calculate from actual contract data
                const contractValues = data.contracts
                  .filter(c => c.awardedValue && c.awardedValue > 0)
                  .map(c => c.awardedValue!)
                
                if (contractValues.length > 0) {
                  actualTotalValue = contractValues.reduce((sum, val) => sum + val, 0)
                  actualTotalContracts = contractValues.length
                  actualAverageValue = actualTotalValue / actualTotalContracts
                  console.log(`📊 Fallback calculation for ${data.name}: $${actualTotalValue.toLocaleString()} / ${actualTotalContracts} contracts = $${actualAverageValue.toLocaleString()} avg`)
                }
              }
            } catch (error) {
              console.warn(`Failed to fetch total value for recipient ${data.recipientId}:`, error)
              // Fallback to contract-based calculations
            }
          }
          
          const matchReasons: string[] = []
          const competitiveAdvantage: string[] = []

          // Analyze match reasons
          const hasNaicsMatch = validatedData.naicsCodes?.some(naics => 
            data.contracts.some(c => c.naicsCodes?.includes(naics))
          )
          const hasPscMatch = validatedData.pscCodes?.some(psc => 
            data.contracts.some(c => c.pscCodes?.includes(psc))
          )
          const hasStateMatch = validatedData.state && 
            data.contracts.some(c => c.placeOfPerformance?.state === validatedData.state)

          if (hasNaicsMatch && validatedData.naicsCodes) {
            const matchingNaics = validatedData.naicsCodes.filter(naics => 
              data.contracts.some(c => c.naicsCodes?.includes(naics))
            )
            matchReasons.push(`NAICS ${matchingNaics.join(', ')}`)
          }

          if (hasPscMatch && validatedData.pscCodes) {
            const matchingPsc = validatedData.pscCodes.filter(psc => 
              data.contracts.some(c => c.pscCodes?.includes(psc))
            )
            matchReasons.push(`PSC ${matchingPsc.join(', ')}`)
          }

          if (hasStateMatch) {
            matchReasons.push(`${validatedData.state} Operations`)
          }

          // Analyze competitive advantages
          if (actualTotalContracts >= 10) {
            competitiveAdvantage.push('High Contract Volume')
          }
          if (actualTotalValue >= 10000000) {
            competitiveAdvantage.push('Major Contractor')
          }
          if (data.businessType?.toLowerCase().includes('small')) {
            competitiveAdvantage.push('Small Business')
          }
          if (data.businessType?.toLowerCase().includes('veteran')) {
            competitiveAdvantage.push('Veteran-Owned')
          }
          if (data.businessType?.toLowerCase().includes('woman')) {
            competitiveAdvantage.push('Woman-Owned')
          }

          // Recent contracts for examples - only include contracts with valid dates
          const contractsWithDates = data.contracts.filter(contract => {
            const hasDate = !!contract.awardedDate
            if (!hasDate) {
              console.log(`⚠️ Contract "${contract.title}" missing awardedDate:`, contract.awardedDate)
            }
            return hasDate
          })
          
          console.log(`📊 Competitor "${data.name}": ${data.contracts.length} total contracts, ${contractsWithDates.length} with valid dates`)
          
          const recentContracts = contractsWithDates
            .sort((a, b) => new Date(b.awardedDate!).getTime() - new Date(a.awardedDate!).getTime())
            .slice(0, 3)
            .map(contract => ({
              awardDate: contract.awardedDate!,
              awardAmount: contract.awardedValue || 0,
              title: contract.title,
              agency: contract.agency.name,
              awardId: contract.sourceUrl?.split('/').pop(),
              naicsCodes: contract.naicsCodes,
              pscCodes: contract.pscCodes
            }))

          return {
            id: `competitor_${data.recipientId || data.name.replace(/\s+/g, '_').toLowerCase()}`,
            name: data.name,
            recipientId: data.recipientId,
            uei: data.uei,
            duns: data.duns,
            location: data.location,
            businessType: data.businessType,
            businessSize: data.businessSize,
            totalContracts: actualTotalContracts,
            totalValue: actualTotalValue,
            averageValue: actualAverageValue,
            recentContracts,
            matchReasons,
            competitiveAdvantage: competitiveAdvantage.length > 0 ? competitiveAdvantage : undefined
          }
        })
      )
      
      const competitors = competitorsWithTotals
        .sort((a, b) => b.totalValue - a.totalValue) // Sort by total contract value
        .slice(0, validatedData.limit) // Limit results

      console.log(`✅ [Competitors] Found ${competitors.length} competitor entities`)

      return NextResponse.json({
        success: true,
        data: competitors,
        totalFound: competitors.length,
        searchCriteria: {
          naicsMatch: Boolean(validatedData.naicsCodes?.length),
          pscMatch: Boolean(validatedData.pscCodes?.length),
          stateMatch: Boolean(validatedData.state),
          cityMatch: Boolean(validatedData.city),
          valueRange: validatedData.estimatedValue 
            ? `${Math.round(validatedData.estimatedValue * 0.5 / 1000)}K - ${Math.round(validatedData.estimatedValue * 2.0 / 1000)}K`
            : 'Any'
        }
      })

    } catch (error) {
      console.error('❌ [Competitors] Failed to analyze competitors:', error)
      
      // Return empty results rather than an error to provide graceful degradation
      return NextResponse.json({
        success: true,
        data: [],
        totalFound: 0,
        searchCriteria: {
          naicsMatch: Boolean(validatedData.naicsCodes?.length),
          pscMatch: Boolean(validatedData.pscCodes?.length),
          stateMatch: Boolean(validatedData.state),
          cityMatch: Boolean(validatedData.city),
          valueRange: validatedData.estimatedValue 
            ? `${Math.round(validatedData.estimatedValue * 0.5 / 1000)}K - ${Math.round(validatedData.estimatedValue * 2.0 / 1000)}K`
            : 'Any'
        },
        error: 'Competitive intelligence temporarily unavailable',
        fromFallback: true
      })
    }
  })
}

export const POST = withApiTracking(asyncHandler(handlePOST))