/**
 * Real-time Opportunity Match Scoring API
 * 
 * Computes match scores for a specific set of opportunities (current page only).
 * Caches scores with the search results for efficient pagination.
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { redis } from '@/lib/redis'
import { withRateLimit, rateLimitConfigs } from '@/lib/rate-limit'
import { UsageTrackingService, UsageType } from '@/lib/usage-tracking'
import crypto from 'crypto'

// Request schema for batch scoring
const BatchScoreSchema = z.object({
  opportunities: z.array(z.object({
    sourceId: z.string().describe('SAM.gov opportunity ID'),
    title: z.string().describe('Opportunity title'),
    description: z.string().describe('Opportunity description'),
    agency: z.string().describe('Issuing agency'),
    naicsCodes: z.array(z.string()).describe('NAICS codes'),
    setAside: z.array(z.string()).optional().describe('Set-aside types'),
    estimatedValue: z.object({
      min: z.number().optional(),
      max: z.number().optional(),
      currency: z.string()
    }).optional().describe('Contract value range'),
    placeOfPerformance: z.object({
      city: z.string().optional(),
      state: z.string().optional(),
      country: z.string()
    }).optional().describe('Performance location'),
    responseDeadline: z.string().optional().transform(val => val ? new Date(val) : undefined).describe('Deadline'),
    dataHash: z.string().describe('Data hash for caching')
  })).max(100).describe('Opportunities to score (max 100 per request)'),
  searchContext: z.object({
    query: z.string().optional().describe('Original search query'),
    filters: z.record(z.any()).optional().describe('Applied filters')
  }).optional().describe('Search context for relevance scoring')
})

// Match score response interface
interface OpportunityMatchScore {
  sourceId: string
  overallScore: number
  confidence: number
  factors: {
    relevanceScore: number
    naicsMatch: number
    agencyMatch: number
    valueMatch: number
    geographicMatch: number
    setAsideMatch: number
    deadlineUrgency: number
  }
  reasoning: string[]
  recommendations: string[]
  cached: boolean
}

/**
 * @swagger
 * /api/v1/opportunities/realtime/score:
 *   post:
 *     tags: [Opportunities, Match Scoring]
 *     summary: Score opportunities for current page
 *     description: |
 *       Calculate match scores for a batch of opportunities (current page only).
 *       Uses cached scores when available and computes fresh scores for new opportunities.
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               opportunities:
 *                 type: array
 *                 maxItems: 100
 *                 items:
 *                   type: object
 *                   properties:
 *                     sourceId:
 *                       type: string
 *                     title:
 *                       type: string
 *                     description:
 *                       type: string
 *                     agency:
 *                       type: string
 *                     naicsCodes:
 *                       type: array
 *                       items:
 *                         type: string
 *                     dataHash:
 *                       type: string
 *               searchContext:
 *                 type: object
 *                 properties:
 *                   query:
 *                     type: string
 *                   filters:
 *                     type: object
 *     responses:
 *       200:
 *         description: Match scores calculated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       sourceId:
 *                         type: string
 *                       overallScore:
 *                         type: number
 *                       confidence:
 *                         type: number
 *                       factors:
 *                         type: object
 *                       reasoning:
 *                         type: array
 *                         items:
 *                           type: string
 *                       cached:
 *                         type: boolean
 *                 meta:
 *                   type: object
 *                   properties:
 *                     scoredCount:
 *                       type: integer
 *                     cachedCount:
 *                       type: integer
 *                     processingTime:
 *                       type: number
 */
export async function POST(request: NextRequest) {
  return withRateLimit(rateLimitConfigs.ai, 'realtime-scoring')(request, async () => {
    const startTime = Date.now()
    
    try {
      // Authentication
      const { userId } = await auth()
      if (!userId) {
        return NextResponse.json(
          { success: false, error: 'Authentication required' },
          { status: 401 }
        )
      }

      // Get user with profile for scoring
      const user = await prisma.user.findUnique({
        where: { clerkId: userId },
        include: { 
          organization: true,
          profile: true
        }
      })

      if (!user || !user.organization) {
        return NextResponse.json(
          { success: false, error: 'User or organization not found' },
          { status: 404 }
        )
      }

      if (!user.profile) {
        return NextResponse.json(
          { success: false, error: 'Profile required for match scoring' },
          { status: 400 }
        )
      }

      // Parse and validate request
      const body = await request.json()
      const validation = BatchScoreSchema.safeParse(body)

      if (!validation.success) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Invalid request data',
            details: validation.error.errors 
          },
          { status: 400 }
        )
      }

      const { opportunities, searchContext } = validation.data

      console.log(`🎯 Scoring ${opportunities.length} opportunities for user ${userId}`)

      // Track AI usage
      try {
        await UsageTrackingService.trackUsage({
          organizationId: user.organizationId,
          usageType: UsageType.AI_CALL,
          quantity: opportunities.length,
          resourceType: 'opportunity_scoring',
          metadata: {
            endpoint: '/api/v1/opportunities/realtime/score',
            profileId: user.profile.id,
            searchContext
          }
        })
      } catch (trackingError) {
        console.warn('Failed to track scoring usage:', trackingError)
      }

      // Check cache for existing scores
      const scores: OpportunityMatchScore[] = []
      const needsScoring: typeof opportunities = []
      let cacheHits = 0

      for (const opp of opportunities) {
        const cacheKey = generateScoreCacheKey(user.profile.id, opp.sourceId, opp.dataHash)
        const cached = await redis.get(cacheKey)
        
        if (cached) {
          try {
            const cachedScore = JSON.parse(cached)
            scores.push({ ...cachedScore, cached: true })
            cacheHits++
          } catch (error) {
            console.warn('Failed to parse cached score:', error)
            needsScoring.push(opp)
          }
        } else {
          needsScoring.push(opp)
        }
      }

      console.log(`📊 Cache hits: ${cacheHits}, Need scoring: ${needsScoring.length}`)

      // Score opportunities that aren't cached
      if (needsScoring.length > 0) {
        const freshScores = await computeMatchScores(
          needsScoring,
          user.profile,
          searchContext
        )

        // Cache the new scores (30 minutes to align with search cache)
        for (const score of freshScores) {
          const opp = needsScoring.find(o => o.sourceId === score.sourceId)
          if (opp) {
            const cacheKey = generateScoreCacheKey(user.profile.id, opp.sourceId, opp.dataHash)
            await redis.setex(cacheKey, 30 * 60, JSON.stringify({ ...score, cached: false }))
          }
        }

        scores.push(...freshScores.map(score => ({ ...score, cached: false })))
      }

      // Sort by overall score (descending)
      scores.sort((a, b) => b.overallScore - a.overallScore)

      const processingTime = Date.now() - startTime

      console.log(`✅ Scored ${scores.length} opportunities in ${processingTime}ms (${cacheHits} cached, ${needsScoring.length} computed)`)

      return NextResponse.json({
        success: true,
        data: scores,
        meta: {
          scoredCount: scores.length,
          cachedCount: cacheHits,
          computedCount: needsScoring.length,
          processingTime
        }
      })

    } catch (error) {
      const processingTime = Date.now() - startTime
      console.error('Match scoring error:', error)
      
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to compute match scores',
          meta: { processingTime }
        },
        { status: 500 }
      )
    }
  })
}

// Helper methods (would normally be in a separate class)
function generateScoreCacheKey(profileId: string, sourceId: string, dataHash: string): string {
  const combined = `${profileId}:${sourceId}:${dataHash}`
  const hash = crypto.createHash('md5').update(combined).digest('hex')
  return `match_score:realtime:${hash}`
}

async function computeMatchScores(
  opportunities: any[],
  profile: any,
  searchContext?: any
): Promise<OpportunityMatchScore[]> {
  // This is a simplified scoring algorithm
  // In production, this would use your existing AI scoring logic
  
  const scores: OpportunityMatchScore[] = []
  
  for (const opp of opportunities) {
    // Calculate individual factor scores (0-100)
    const relevanceScore = calculateRelevanceScore(opp, profile, searchContext)
    const naicsMatch = calculateNaicsMatch(opp.naicsCodes, profile.primaryNaics, profile.secondaryNaics)
    const agencyMatch = calculateAgencyMatch(opp.agency, profile.preferredAgencies)
    const valueMatch = calculateValueMatch(opp.estimatedValue, profile.targetContractSize)
    const geographicMatch = calculateGeographicMatch(opp.placeOfPerformance, profile.geographicPreferences)
    const setAsideMatch = calculateSetAsideMatch(opp.setAside, profile.certifications)
    const deadlineUrgency = calculateDeadlineUrgency(opp.responseDeadline)
    
    // Weighted overall score
    const weights = {
      relevanceScore: 0.25,
      naicsMatch: 0.20,
      agencyMatch: 0.10,
      valueMatch: 0.15,
      geographicMatch: 0.10,
      setAsideMatch: 0.10,
      deadlineUrgency: 0.10
    }
    
    const overallScore = Math.round(
      relevanceScore * weights.relevanceScore +
      naicsMatch * weights.naicsMatch +
      agencyMatch * weights.agencyMatch +
      valueMatch * weights.valueMatch +
      geographicMatch * weights.geographicMatch +
      setAsideMatch * weights.setAsideMatch +
      deadlineUrgency * weights.deadlineUrgency
    )
    
    // Generate reasoning
    const reasoning = generateReasoning({
      relevanceScore,
      naicsMatch,
      agencyMatch,
      valueMatch,
      geographicMatch,
      setAsideMatch,
      deadlineUrgency
    })
    
    const recommendations = generateRecommendations(opp, profile, {
      relevanceScore,
      naicsMatch,
      agencyMatch,
      valueMatch,
      geographicMatch,
      setAsideMatch,
      deadlineUrgency
    })
    
    scores.push({
      sourceId: opp.sourceId,
      overallScore,
      confidence: Math.min(95, 60 + (overallScore * 0.3)), // Confidence based on score
      factors: {
        relevanceScore,
        naicsMatch,
        agencyMatch,
        valueMatch,
        geographicMatch,
        setAsideMatch,
        deadlineUrgency
      },
      reasoning,
      recommendations,
      cached: false
    })
  }
  
  return scores
}

// Simplified scoring functions (in production, these would be more sophisticated)
function calculateRelevanceScore(opp: any, profile: any, searchContext?: any): number {
  let score = 50 // Base score
  
  // Boost if search query matches core competencies
  if (searchContext?.query && profile.coreCompetencies) {
    const queryLower = searchContext.query.toLowerCase()
    const competencyMatch = profile.coreCompetencies.some((comp: string) => 
      queryLower.includes(comp.toLowerCase()) || comp.toLowerCase().includes(queryLower)
    )
    if (competencyMatch) score += 30
  }
  
  // Boost if title/description matches competencies
  if (profile.coreCompetencies) {
    const titleDesc = `${opp.title} ${opp.description}`.toLowerCase()
    const competencyMatches = profile.coreCompetencies.filter((comp: string) =>
      titleDesc.includes(comp.toLowerCase())
    ).length
    score += Math.min(30, competencyMatches * 10)
  }
  
  return Math.min(100, score)
}

function calculateNaicsMatch(oppNaics: string[], primaryNaics?: string, secondaryNaics?: string[]): number {
  if (!primaryNaics && (!secondaryNaics || secondaryNaics.length === 0)) return 0
  
  // Exact match with primary NAICS
  if (primaryNaics && oppNaics.includes(primaryNaics)) return 100
  
  // Match with secondary NAICS
  if (secondaryNaics) {
    const matches = oppNaics.filter(code => secondaryNaics.includes(code))
    if (matches.length > 0) return 80
  }
  
  // Partial matches (same 2-digit sector)
  const primarySector = primaryNaics?.substring(0, 2)
  if (primarySector) {
    const sectorMatches = oppNaics.filter(code => code.startsWith(primarySector))
    if (sectorMatches.length > 0) return 60
  }
  
  return 20 // Default low score
}

function calculateAgencyMatch(oppAgency: string, preferredAgencies?: string[]): number {
  if (!preferredAgencies || preferredAgencies.length === 0) return 50 // Neutral
  
  if (preferredAgencies.includes(oppAgency)) return 100
  
  // Partial name matching
  const agencyLower = oppAgency.toLowerCase()
  const partialMatch = preferredAgencies.some(pref => 
    agencyLower.includes(pref.toLowerCase()) || pref.toLowerCase().includes(agencyLower)
  )
  
  return partialMatch ? 70 : 30
}

function calculateValueMatch(oppValue: any, targetSize?: string): number {
  if (!oppValue || !targetSize) return 50 // Neutral
  
  const value = oppValue.max || oppValue.min || 0
  
  // Define size ranges (in dollars)
  const sizeRanges = {
    'micro': [0, 10000],
    'small': [10000, 250000],
    'medium': [250000, 1000000],
    'large': [1000000, 10000000],
    'enterprise': [10000000, Infinity]
  }
  
  const range = sizeRanges[targetSize.toLowerCase()]
  if (!range) return 50
  
  if (value >= range[0] && value <= range[1]) return 100
  
  // Close match (within one range)
  if (value >= range[0] * 0.5 && value <= range[1] * 2) return 70
  
  return 30
}

function calculateGeographicMatch(oppLocation: any, geoPrefs?: any): number {
  if (!geoPrefs || !oppLocation) return 50 // Neutral
  
  // Handle new grouped structure
  if (geoPrefs.preferences && typeof geoPrefs.preferences === 'object') {
    const states = geoPrefs.preferences.state || []
    if (oppLocation.state && states.some((s: any) => s.code === oppLocation.state)) {
      return 100
    }
  }
  
  // Handle legacy flat array structure
  if (Array.isArray(geoPrefs.preferences)) {
    const stateMatch = geoPrefs.preferences.some((pref: any) => 
      pref.type === 'state' && pref.code === oppLocation.state
    )
    if (stateMatch) return 100
  }
  
  // Remote work consideration
  if (geoPrefs.workFromHome) return 80
  
  return 40
}

function calculateSetAsideMatch(oppSetAside: string[], certifications?: any): number {
  if (!oppSetAside || oppSetAside.length === 0) return 70 // No restrictions
  if (!certifications) return 30 // Has restrictions but no certs
  
  // Check for certification matches
  const certTypes = {
    'Small Business': 'hasSmallBusiness',
    '8(a)': 'has8a',
    'Woman Owned': 'hasWosb',
    'Service-Disabled Veteran': 'hasSdvosb',
    'HUBZone': 'hasHubzone'
  }
  
  for (const setAside of oppSetAside) {
    for (const [keyword, certField] of Object.entries(certTypes)) {
      if (setAside.includes(keyword) && certifications[certField]) {
        return 100 // Perfect match
      }
    }
  }
  
  return 20 // Has restrictions but no matching certs
}

function calculateDeadlineUrgency(deadline?: Date): number {
  if (!deadline) return 50 // No deadline info
  
  const now = new Date()
  const daysUntil = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  
  if (daysUntil < 0) return 0 // Past deadline
  if (daysUntil <= 7) return 100 // Urgent
  if (daysUntil <= 14) return 80 // Soon
  if (daysUntil <= 30) return 60 // Moderate
  
  return 40 // Plenty of time
}

function generateReasoning(factors: any): string[] {
  const reasoning: string[] = []
  
  if (factors.relevanceScore > 70) {
    reasoning.push("Strong alignment with your core competencies and experience")
  }
  if (factors.naicsMatch > 80) {
    reasoning.push("Perfect NAICS code match with your primary business area")
  }
  if (factors.agencyMatch > 70) {
    reasoning.push("Matches your preferred government agencies")
  }
  if (factors.setAsideMatch > 80) {
    reasoning.push("You qualify for the set-aside requirements")
  }
  if (factors.deadlineUrgency > 80) {
    reasoning.push("Urgent opportunity with approaching deadline")
  }
  
  return reasoning
}

function generateRecommendations(opp: any, profile: any, factors: any): string[] {
  const recommendations: string[] = []
  
  if (factors.naicsMatch < 50) {
    recommendations.push("Consider if this opportunity aligns with your business capabilities")
  }
  if (factors.deadlineUrgency > 80) {
    recommendations.push("Act quickly - deadline is approaching soon")
  }
  if (factors.setAsideMatch < 50 && opp.setAside?.length > 0) {
    recommendations.push("This opportunity has set-aside requirements you may not qualify for")
  }
  if (factors.valueMatch < 50) {
    recommendations.push("Contract size may not align with your typical project range")
  }
  
  return recommendations
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}