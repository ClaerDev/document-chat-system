/**
 * @swagger
 * /api/v1/match-scores:
 *   post:
 *     tags: [Match Scores]
 *     summary: Calculate advanced match scores with LLM enhancement
 *     description: |
 *       Calculate AI-powered match scores for government contracting opportunities
 *       using the enhanced v5.0 algorithm. Supports both calculation-based and 
 *       LLM-enhanced scoring methods with semantic analysis and strategic insights.
 *       
 *       The LLM-enhanced method provides:
 *       - Deep semantic analysis of implicit requirements
 *       - Competitive landscape intelligence
 *       - Strategic win/loss probability assessment
 *       - Actionable recommendations and go/no-go decisions
 *       
 *       Results are cached for 1 hour to improve performance for repeat calculations.
 *       Supports both single opportunity scoring and batch processing up to 50 opportunities.
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [opportunityIds]
 *             properties:
 *               opportunityIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 minItems: 1
 *                 maxItems: 50
 *                 description: Array of opportunity IDs to calculate match scores for
 *                 example: ["1", "2", "3"]
 *               profileId:
 *                 type: string
 *                 description: Optional profile ID to use for scoring (defaults to user's active profile)
 *                 example: "clm1234567890"
 *               method:
 *                 type: string
 *                 enum: [calculation, llm, hybrid]
 *                 default: calculation
 *                 description: Scoring method - calculation (fast), llm (intelligent), or hybrid (balanced)
 *                 example: "llm"
 *               useAdvancedAnalysis:
 *                 type: boolean
 *                 default: false
 *                 description: Enable LLM-enhanced semantic analysis and strategic insights
 *                 example: true
 *               saveToDatabase:
 *                 type: boolean
 *                 default: true
 *                 description: Whether to save results to database for future reference
 *                 example: true
 *           examples:
 *             calculation:
 *               summary: Standard calculation-based scoring
 *               value:
 *                 opportunityIds: ["1"]
 *                 method: "calculation"
 *                 saveToDatabase: true
 *             llm_enhanced:
 *               summary: LLM-enhanced scoring with strategic insights
 *               value:
 *                 opportunityIds: ["1"]
 *                 method: "llm"
 *                 useAdvancedAnalysis: true
 *                 saveToDatabase: true
 *             batch:
 *               summary: Batch opportunity scoring (calculation method)
 *               value:
 *                 opportunityIds: ["1", "2", "3", "4", "5"]
 *                 method: "calculation"
 *             hybrid:
 *               summary: Hybrid scoring combining both methods
 *               value:
 *                 opportunityIds: ["1"]
 *                 method: "hybrid"
 *                 useAdvancedAnalysis: true
 *     responses:
 *       200:
 *         description: Match scores calculated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required: [success, data]
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   required: [matchScores]
 *                   properties:
 *                     matchScores:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/MatchScore'
 *                     cached:
 *                       type: boolean
 *                       description: Whether results were served from cache
 *                     calculationTime:
 *                       type: number
 *                       description: Time taken to calculate scores in milliseconds
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         description: Profile or opportunities not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       429:
 *         $ref: '#/components/responses/RateLimit'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db'
import { calculateMatchScore, calculateBatchMatchScores } from '@/lib/profile-scoring-config'
import { calculateLLMMatchScore } from '@/lib/llm-scoring/llm-scoring-engine'
import { cacheManager } from '@/lib/cache'
import { MatchScoreCalculateSchema } from '@/lib/validations'
import { 
  validateCalculateRequest, 
  serializeMatchScore,
  deserializeMatchScore,
  type MatchScoreResponse 
} from '@/lib/validations/match-score'
import { SourceSystem } from '@/types/opportunity-enums'
import { handleApiError, asyncHandler, commonErrors } from '@/lib/api-errors'
import { withRateLimit, rateLimitConfigs } from '@/lib/rate-limit'
import { UsageTrackingService, UsageType } from '@/lib/usage-tracking'
import { withApiTracking } from '@/lib/api-tracking'
import { crudAuditLogger } from '@/lib/audit/crud-audit-logger'

/**
 * Fetch opportunity data from external APIs (simulated)
 * In production, this would call HigherGov, SAM.gov, etc.
 */
async function fetchOpportunityData(opportunityId: string) {
  try {
    // Check if this is a real-time opportunity ID (starts with 'rt_')
    if (opportunityId.startsWith('rt_')) {
      // Skip real-time opportunities to prevent infinite retry loops
      console.log(`⏭️ Skipping real-time opportunity: ${opportunityId}`)
      return null
    }
    
    // For non-real-time opportunities, use the existing mock API approach
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/v1/opportunities-mock?query=&limit=50`, {
      headers: {
        'Content-Type': 'application/json',
      },
    })
    
    if (!response.ok) {
      console.warn(`Failed to fetch opportunities: ${response.status}`)
      return null
    }
    
    const data = await response.json()
    
    if (!data.success || !data.data?.items) {
      console.warn('Invalid opportunities data structure')
      return null
    }
    
    // Find the specific opportunity by ID
    const opportunity = data.data.items.find((opp: any) => opp.id === opportunityId)
    
    if (!opportunity) {
      console.warn(`Opportunity ${opportunityId} not found in external data`)
      return null
    }
    
    // Transform external opportunity data to match our internal format for match scoring
    return {
      id: opportunity.id,
      title: opportunity.title,
      agency: opportunity.agency,
      // Geographic fields that algorithm expects
      placeOfPerformance: {
        state: opportunity.performanceState || opportunity.state,
        city: opportunity.performanceCity || opportunity.city || opportunity.location?.split(',')[0] || 'Unknown'
      },
      performanceState: opportunity.performanceState || opportunity.state,
      performanceCity: opportunity.performanceCity || opportunity.city,
      // Classification fields
      naicsCodes: opportunity.naicsCodes || [],
      setAsideType: opportunity.setAsideType,
      // Financial fields (algorithm expects a number)
      estimatedValue: opportunity.estimatedValue || opportunity.contractValue || opportunity.contractValueMin || 0,
      contractValue: opportunity.contractValue,
      contractValueMin: opportunity.contractValueMin,
      contractValueMax: opportunity.contractValueMax,
      // Security clearance field that algorithm expects
      securityClearanceRequired: opportunity.securityClearanceRequired || opportunity.securityClearance,
      // Date fields
      dueDate: opportunity.deadline,
      deadline: opportunity.deadline,
      postedDate: opportunity.postedDate,
      // Other fields algorithm might use
      competencies: opportunity.competencies,
      // Legacy fields for backward compatibility
      location: {
        state: opportunity.performanceState || opportunity.state,
        city: opportunity.performanceCity || opportunity.city || opportunity.location?.split(',')[0] || 'Unknown',
      },
      state: opportunity.performanceState || opportunity.state
    }
  } catch (error) {
    console.error(`Error fetching opportunity data for ${opportunityId}:`, error)
    return null
  }
}

/**
 * Calculate score using specified method (calculation, llm, or hybrid)
 */
async function calculateScoreByMethod(opportunity: any, profile: any, requestData: any) {
  const method = requestData.method || 'calculation';
  const useAdvancedAnalysis = requestData.useAdvancedAnalysis || false;
  
  console.log(`🤖 LLM Scoring: Method = "${method}", useAdvancedAnalysis = ${useAdvancedAnalysis}`);
  
  switch (method) {
    case 'calculation':
      console.log(`📊 Using calculation-based scoring`);
      // Use existing calculation-based algorithm
      return calculateMatchScore(opportunity, profile);
      
    case 'llm':
      console.log(`🚀 Using LLM-enhanced scoring with AI service`);
      // Use LLM-enhanced scoring
      try {
        const llmResult = await calculateLLMMatchScore(opportunity, profile, {
          organizationId: requestData.organizationId || 'default',
          userId: requestData.userId,
          enableSemanticAnalysis: useAdvancedAnalysis,
          enableStrategicInsights: useAdvancedAnalysis,
          useReasoningModels: true,
          maxTokens: 8000,
          temperature: 0.3,
          fastMode: !useAdvancedAnalysis // Use fast mode when advanced analysis is not requested
        });
        console.log(`✅ LLM scoring result:`, {
          hasResult: !!llmResult,
          score: llmResult?.score,
          overallScore: llmResult?.overallScore,
          confidence: llmResult?.confidence,
          keys: llmResult ? Object.keys(llmResult) : 'no result'
        });
        return llmResult;
      } catch (llmError) {
        console.error(`❌ LLM scoring error:`, llmError);
        
        // Check if it's an AI provider failure
        const isProviderFailure = llmError.code === 'ALL_PROVIDERS_FAILED' || 
                                 llmError.code === 'QUOTA_EXCEEDED' ||
                                 llmError.code === 'NETWORK_ERROR' ||
                                 llmError.message?.includes('All providers failed');
        
        if (isProviderFailure) {
          console.log(`🔄 AI providers unavailable, falling back to calculation method`);
          // Fallback to calculation-based scoring when AI services are down
          const fallbackResult = calculateMatchScore(opportunity, profile);
          return {
            ...fallbackResult,
            algorithmVersion: 'v4.0-fallback-from-llm',
            scoringMethod: 'calculation',
            factors: fallbackResult.breakdown || fallbackResult.factors || {},
            detailedFactors: fallbackResult.breakdown || fallbackResult.factors || {},
            semanticAnalysis: null,
            strategicInsights: null,
            recommendations: ['LLM analysis unavailable - using calculation-based scoring'],
            processingTimeMs: 0,
            costUsd: 0,
            markedAsReviewed: false,
            winProbabilityEst: null
          };
        } else {
          // Re-throw non-provider errors
          throw llmError;
        }
      }
      
    case 'hybrid':
      // Combine both methods
      const calcResult = calculateMatchScore(opportunity, profile);
      
      try {
        const llmResult = await calculateLLMMatchScore(opportunity, profile, {
          organizationId: requestData.organizationId || 'default',
          userId: requestData.userId,
          enableSemanticAnalysis: true,
          enableStrategicInsights: true,
          useReasoningModels: true,
          maxTokens: 8000,
          temperature: 0.3,
          fastMode: false // Hybrid mode uses full analysis
        });
        
        // Blend scores with 70% LLM, 30% calculation for optimal accuracy
        return {
          ...llmResult,
          overallScore: Math.round(llmResult.overallScore * 0.7 + calcResult.score * 0.3),
          algorithmVersion: 'v5.0-hybrid',
          factors: {
            ...llmResult.factors,
            calculationBaseline: calcResult.factors
          }
        };
      } catch (hybridLlmError) {
        console.error(`❌ Hybrid LLM scoring failed, using calculation only:`, hybridLlmError);
        
        // If LLM fails in hybrid mode, return calculation-only result
        return {
          ...calcResult,
          algorithmVersion: 'v4.0-hybrid-fallback',
          scoringMethod: 'calculation',
          factors: calcResult.breakdown || calcResult.factors || {},
          detailedFactors: calcResult.breakdown || calcResult.factors || {},
          semanticAnalysis: null,
          strategicInsights: null,
          recommendations: ['LLM component unavailable in hybrid mode - using calculation-only scoring'],
          processingTimeMs: 0,
          costUsd: 0,
          markedAsReviewed: false,
          winProbabilityEst: null
        };
      }
      
    default:
      return calculateMatchScore(opportunity, profile);
  }
}

// POST /api/v1/match-scores - Calculate match scores for opportunities
async function handlePOST(request: NextRequest) {
  return withRateLimit(rateLimitConfigs.matchScores, 'match-scores')(request, async () => {
    // Check authentication
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Unauthorized. Please sign in to calculate match scores.' 
      }, { status: 401 })
    }

    const body = await request.json()
    console.log(`🔍 Raw request body received:`, JSON.stringify(body, null, 2));
    
    // Validate request - support both old and new schemas for backward compatibility
    const validatedData = body.opportunityIds 
      ? MatchScoreCalculateSchema.parse(body)
      : validateCalculateRequest(body)
    
    console.log(`🔍 Validated data:`, JSON.stringify(validatedData, null, 2));
    
    // Extract opportunities data if provided (for real-time opportunities)
    const providedOpportunities = body.opportunities || {};
    
    // Performance optimization: limit batch size
    if (validatedData.opportunityIds.length > 50) {
      return NextResponse.json({ 
        success: false, 
        error: 'Batch size limited to 50 opportunities' 
      }, { status: 400 })
    }

    // Get the authenticated user's organization and profile
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      include: { organization: true }
    })

    if (!user) {
      return NextResponse.json({ 
        success: false, 
        error: 'User not found. Please complete your account setup.' 
      }, { status: 404 })
    }

    // Get the user's organization profile
    const profile = await prisma.profile.findFirst({
      where: {
        organizationId: user.organizationId,
        deletedAt: null
      }
    })

    if (!profile) {
      return NextResponse.json({ 
        success: false, 
        error: 'Profile not found. Please create a profile first.',
        message: 'A company profile is required to calculate match scores. Please complete your profile setup in the Profile section.'
      }, { status: 404 })
    }

    // Check usage limits for match score calculations
    try {
      await UsageTrackingService.enforceUsageLimit(
        user.organizationId,
        UsageType.MATCH_SCORE_CALCULATION,
        validatedData.opportunityIds.length
      );
    } catch (error: any) {
      return NextResponse.json({ 
        success: false, 
        error: error.message || 'Usage limit exceeded for match score calculations',
        code: 'USAGE_LIMIT_EXCEEDED',
        details: {
          requested: validatedData.opportunityIds.length,
          message: error.message
        }
      }, { status: 403 });
    }

    // Log audit trail for match score API request
    try {
      await crudAuditLogger.logAIOperation(
        'READ',
        'BATCH_REQUEST',
        `Match Score Calculation Request`,
        null,
        {
          requestedOpportunities: validatedData.opportunityIds.length,
          method: validatedData.method,
          useAdvancedAnalysis: validatedData.useAdvancedAnalysis
        },
        {
          algorithm: validatedData.method || 'calculation',
          score: 0, // Will be updated per opportunity
          isAIDecision: true,
          model: validatedData.method === 'llm' ? 'llm-enhanced' : 'calculation-based',
          profileName: profile.companyName,
          opportunityTitle: `Batch Request (${validatedData.opportunityIds.length} opportunities)`,
          endpoint: '/api/v1/match-scores',
          method: 'POST'
        }
      );
    } catch (auditError) {
      console.error('Failed to create batch request audit log:', auditError);
    }

    // Calculate match scores for all opportunities using parallel processing
    const results: Array<{
      opportunityId: string
      score: number
      breakdown?: any
      explanation?: string
    }> = []
    
    // Track cache hits vs misses for accurate billing
    let cacheHits = 0
    let cacheMisses = 0

    // Process opportunities in parallel for 5-10x speed improvement
    const opportunityPromises = validatedData.opportunityIds.map(async (opportunityId) => {
      try {
        // Check if opportunity data was provided directly (for real-time opportunities)
        const providedOpportunity = providedOpportunities[opportunityId];
        // Generate cache key that only invalidates when match-relevant profile data changes
        // Updated to include all fields that affect the new match scoring algorithm
        const profileHashData = {
          // NAICS codes - affects naics scoring factor  
          primaryNaics: profile.primaryNaics,
          secondaryNaics: profile.secondaryNaics,
          naicsCodes: profile.naicsCodes, // In case this field is used
          
          // Geographic data - affects geographic scoring factor
          state: profile.state, // Legacy field
          geographicPreferences: profile.geographicPreferences, // New structure
          
          // Certifications - affects certification scoring factor
          certifications: profile.certifications,
          
          // Past performance - affects past performance scoring factor
          pastPerformance: profile.pastPerformance,
          
          // Government level preferences - affects new government level scoring factor
          governmentLevels: profile.governmentLevels,
          
          // Other relevant fields that could affect scoring
          securityClearance: profile.securityClearance,
          capabilities: profile.capabilities || profile.coreCompetencies,
          brandVoice: profile.brandVoice,
          brandTone: profile.brandTone
        }
        
        // Create a simple hash of the relevant profile data
        const profileHash = Buffer.from(JSON.stringify(profileHashData)).toString('base64').slice(0, 12)
        const method = validatedData.method || 'calculation'
        const useAdvancedAnalysis = validatedData.useAdvancedAnalysis || false
        const cacheKey = `match_score:${profile.id}:${profileHash}:${opportunityId}:${method}:${useAdvancedAnalysis ? 'enhanced' : 'fast'}`
        
        // Try to get cached result first with fallback to old Redis if needed
        let matchResult
        let usedNewCache = false
        let isFromCache = false
        
        try {
          // Try new cache manager first
          const result = await cacheManager.withCache(
            cacheKey,
            async () => {
              let opportunity = null;
              
              // Use provided opportunity data if available (for real-time opportunities)
              if (providedOpportunity) {
                console.log(`📦 Using provided opportunity data for ID: ${opportunityId}`)
                opportunity = providedOpportunity;
              } else {
                // Fetch opportunity data from opportunities API (external data)
                // This simulates fetching from HigherGov/SAM.gov APIs
                console.log(`🔍 Fetching opportunity data for ID: ${opportunityId}`)
                opportunity = await fetchOpportunityData(opportunityId)
              }
              
              if (!opportunity) {
                console.warn(`⚠️ Opportunity ${opportunityId} not found - skipping`)
                return null // Return null instead of throwing error
              }
              
              console.log(`✅ Opportunity data ready for ${opportunityId}: ${opportunity.title?.substring(0, 50)}...`)
              
              // Calculate match score based on method
              return await calculateScoreByMethod(opportunity, profile, {
                ...validatedData,
                organizationId: user.organizationId,
                userId: user.id
              })
            },
            {
              ttl: 86400, // 24 hours for better performance
              userId,
              organizationId: user.organizationId,
              prefix: 'match_score:'
            }
          )
          
          matchResult = result.data
          usedNewCache = true
          isFromCache = result.cached
          
        } catch (newCacheError) {
          console.warn(`New cache system failed for ${cacheKey}, falling back to legacy:`, newCacheError)
          
          // Fallback to legacy Redis implementation
          try {
            const { redis } = await import('@/lib/redis')
            const cachedResult = await redis.get(cacheKey)
            if (cachedResult) {
              matchResult = JSON.parse(cachedResult)
              isFromCache = true
              console.log(`Legacy cache hit for opportunity ${opportunityId}`)
            }
          } catch (legacyCacheError) {
            console.warn(`Legacy cache read error for ${cacheKey}:`, legacyCacheError)
            // Continue without cache
          }

          // If no cached result, calculate it
          if (!matchResult) {
            let opportunity = null;
            
            // Use provided opportunity data if available (for real-time opportunities)
            if (providedOpportunity) {
              console.log(`📦 Using provided opportunity data for ID: ${opportunityId} (fallback path)`)
              opportunity = providedOpportunity;
            } else {
              // Fetch opportunity data from opportunities API (external data)
              opportunity = await fetchOpportunityData(opportunityId)
            }
            
            if (!opportunity) {
              console.error(`❌ Opportunity ${opportunityId} not found in fallback - skipping`)
              return null // Return null for failed opportunities
            }
            
            // Calculate match score with error handling
            try {
              matchResult = await calculateScoreByMethod(opportunity, profile, {
                ...validatedData,
                organizationId: user.organizationId,
                userId: user.id
              })
            } catch (scoreError) {
              console.error(`❌ Score calculation failed for ${opportunityId}:`, scoreError)
              return null // Return null for failed scoring
            }
            isFromCache = false
            
            // Try to cache the result with legacy system as fallback
            try {
              const { redis } = await import('@/lib/redis')
              await redis.setex(cacheKey, 86400, JSON.stringify(matchResult)) // 24 hours
              console.log(`Legacy cached result for opportunity ${opportunityId}`)
            } catch (legacyCacheError) {
              console.warn(`Legacy cache write error for ${cacheKey}:`, legacyCacheError)
              // Continue without caching
            }
          }
        }
        
        // Validate result
        if (!matchResult) {
          return null
        }
        
        // Check for both score and overallScore fields
        const finalScore = matchResult.score ?? matchResult.overallScore;
        
        if (typeof finalScore !== 'number' || finalScore < 0 || finalScore > 100) {
          console.warn(`❌ Invalid score calculated for opportunity ${opportunityId}:`, {
            finalScore,
            scoreType: typeof finalScore
          });
          return null;
        }
        
        const roundedScore = Math.round(finalScore)
        
        // Log AI decision audit trail for match score calculation
        if (!isFromCache) {
          try {
            await crudAuditLogger.logAIOperation(
              'CREATE',
              opportunityId,
              `Match Score for Opportunity ${opportunityId}`,
              null,
              {
                score: roundedScore,
                algorithm: matchResult.algorithmVersion || validatedData.method,
                confidence: matchResult.confidence || 85,
                factors: matchResult.factors || matchResult.breakdown
              },
              {
                algorithm: matchResult.algorithmVersion || validatedData.method,
                score: roundedScore,
                isAIDecision: true,
                model: validatedData.method === 'llm' ? 'llm-enhanced' : 'calculation-based',
                provider: validatedData.method === 'llm' ? 'ai-service' : 'internal',
                profileName: profile.companyName,
                opportunityTitle: `Opportunity ${opportunityId}`,
                confidence: matchResult.confidence || 85,
                factors: matchResult.factors || matchResult.breakdown,
                endpoint: '/api/v1/match-scores',
                method: 'POST'
              }
            );
          } catch (auditError) {
            console.error('Failed to create AI operation audit log:', auditError);
          }
        }
        
        // Save to database if LLM method was used and saveToDatabase is enabled
        // We'll save match scores without requiring FK constraint to opportunities table
        // since we want persistent scores even for mock/external opportunities
        const skipDatabaseSave = false; // Enable database saves for persistent match scores
        
        if (!isFromCache && (validatedData.method === 'llm' || validatedData.method === 'hybrid') && 
            (validatedData.saveToDatabase !== false) && !skipDatabaseSave) {
          try {
            const dbData = {
              organizationId: user.organizationId,
              profileId: profile.id,
              opportunityId: opportunityId,
              userId: user.id,
              overallScore: roundedScore,
              confidence: matchResult.confidence || 85,
              pastPerformanceScore: matchResult.pastPerformanceScore || matchResult.factors?.pastPerformance?.score || 0,
              technicalCapabilityScore: matchResult.technicalCapabilityScore || matchResult.factors?.technicalCapability?.score || 0,
              strategicFitRelationshipsScore: matchResult.strategicFitRelationshipsScore || matchResult.factors?.strategicFitRelationships?.score || 0,
              credibilityMarketPresenceScore: matchResult.credibilityMarketPresenceScore || matchResult.factors?.credibilityMarketPresence?.score || 0,
              algorithmVersion: matchResult.algorithmVersion || 'v5.0-llm',
              scoringMethod: validatedData.method,
              factors: matchResult.factors || {},
              detailedFactors: matchResult.factors || {},
              semanticAnalysis: matchResult.semanticAnalysis || null,
              strategicInsights: matchResult.strategicInsights || null,
              recommendations: matchResult.recommendations || [],
              processingTimeMs: matchResult.processingTimeMs || 0,
              costUsd: matchResult.costUsd || 0,
              markedAsReviewed: false,
              winProbabilityEst: matchResult.strategicInsights?.winProbability?.percentage || null
            };
            
            // First, ensure the opportunity exists in the database
            // If it doesn't exist, create a minimal record for the foreign key
            const opportunityData = providedOpportunities[opportunityId];
            await prisma.opportunity.upsert({
              where: { id: opportunityId },
              update: {}, // Don't update if it exists
              create: {
                id: opportunityId,
                title: opportunityData?.title || `External Opportunity ${opportunityId}`,
                description: opportunityData?.description || 'Opportunity from external source',
                agency: typeof opportunityData?.agency === 'string' ? opportunityData.agency : opportunityData?.agency?.name || 'External Agency',
                organizationId: user.organizationId,
                postedDate: new Date(),
                responseDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Default 30 days from now
                status: 'ACTIVE',
                source: 'external',
                sourceSystem: SourceSystem.SAM_GOV,
                solicitationNumber: `EXT-${opportunityId}`,
                estimatedValue: opportunityData?.estimatedValue || opportunityData?.contractValue || 0
              }
            });

            await prisma.matchScore.create({
              data: {
                ...deserializeMatchScore(dbData),
                createdAt: new Date(),
                updatedAt: new Date()
              }
            });
            
            console.log(`✅ Saved LLM match score to database for opportunity ${opportunityId}`);
          } catch (dbError) {
            console.error(`Failed to save match score to database:`, dbError);
            // Don't fail the request if database save fails
          }
        } else if (skipDatabaseSave && !isFromCache) {
          console.log(`⏭️ Database save temporarily disabled for mock opportunities`);
        }
        
        return {
          opportunityId,
          score: roundedScore,
          factors: matchResult.factors,
          detailedFactors: matchResult.factors,
          algorithmVersion: matchResult.algorithmVersion,
          confidence: matchResult.confidence || 85,
          costUsd: matchResult.costUsd || 0,
          breakdown: matchResult.breakdown,
          explanation: matchResult.explanation,
          isFromCache
        }
      } catch (error) {
        console.error(`Error calculating match score for opportunity ${opportunityId}:`, error)
        return null // Return null for failed opportunities
      }
    })

    // Wait for all opportunities to complete in parallel
    console.log(`🚀 Processing ${validatedData.opportunityIds.length} opportunities in parallel...`)
    const startTime = Date.now()
    
    const opportunityResults = await Promise.all(opportunityPromises)
    
    const processingTime = Date.now() - startTime
    console.log(`⚡ Parallel processing completed in ${processingTime}ms`)
    
    // Filter out null results and track cache hits/misses
    for (const result of opportunityResults) {
      if (result) {
        results.push(result)
        if (result.isFromCache) {
          cacheHits++
        } else {
          cacheMisses++
        }
      }
    }

    // Track usage for successful calculations (ONLY for cache misses - fresh calculations)
    if (cacheMisses > 0) {
      try {
        await UsageTrackingService.trackUsage({
          organizationId: user.organizationId,
          usageType: UsageType.MATCH_SCORE_CALCULATION,
          quantity: cacheMisses,
          resourceType: 'batch_calculation',
          metadata: {
            opportunityIds: validatedData.opportunityIds,
            profileId: profile.id,
            calculationTime: Date.now(),
            source: 'match_score_api',
            totalResults: results.length,
            cacheHits: cacheHits,
            cacheMisses: cacheMisses
          }
        });
        
        console.log(`Tracked usage: ${cacheMisses} fresh calculations (${cacheHits} from cache)`)
      } catch (trackingError) {
        console.error('Failed to track usage for match score calculation:', trackingError);
        // Don't fail the request if usage tracking fails
      }
    } else {
      console.log(`No billable usage - all ${results.length} results from cache`)
    }

    // Log audit trail for match score calculation completion
    try {
      await crudAuditLogger.logAIOperation(
        'CREATE',
        'BATCH_RESPONSE',
        `Match Score Calculation Completed`,
        null,
        {
          requestedOpportunities: validatedData.opportunityIds.length,
          successfulResults: results.length,
          cacheHits,
          cacheMisses,
          processingTime
        },
        {
          algorithm: validatedData.method || 'calculation',
          score: results.length > 0 ? Math.round(results.reduce((acc, r) => acc + r.score, 0) / results.length) : 0,
          isAIDecision: true,
          model: validatedData.method === 'llm' ? 'llm-enhanced' : 'calculation-based',
          profileName: profile.companyName,
          opportunityTitle: `Batch Response (${results.length}/${validatedData.opportunityIds.length} successful)`,
          endpoint: '/api/v1/match-scores',
          method: 'POST'
        }
      );
    } catch (auditError) {
      console.error('Failed to create batch response audit log:', auditError);
    }

    console.log(`🎯 Match score calculation completed:`, {
      requested: validatedData.opportunityIds.length,
      successful: results.length,
      method: validatedData.method,
      cacheHits,
      cacheMisses
    });

    return NextResponse.json({
      success: true,
      data: results
    })
  })
}

// GET /api/v1/match-scores - List match scores with filtering
async function handleGET(request: NextRequest) {
  return withRateLimit(rateLimitConfigs.api, 'match-scores-list')(request, async () => {
    // Check authentication
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Unauthorized' 
      }, { status: 401 });
    }

    // Get user and organization
    const user = await prisma.user.findUnique({
      where: { clerkId: userId }
    });
    
    if (!user) {
      return NextResponse.json({ 
        success: false, 
        error: 'User not found' 
      }, { status: 404 });
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const profileId = searchParams.get('profileId');
    const opportunityId = searchParams.get('opportunityId');
    const method = searchParams.get('method');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    try {
      // Build filter conditions
      const where: any = {
        organizationId: user.organizationId
      };
      
      if (profileId) where.profileId = profileId;
      if (opportunityId) where.opportunityId = opportunityId;
      if (method) where.scoringMethod = method;

      // Get match scores with pagination
      const matchScores = await prisma.matchScore.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: Math.min(limit, 100), // Max 100 per request
        skip: offset,
        include: {
          profile: {
            select: {
              id: true,
              companyName: true,
              primaryNaics: true
            }
          }
        }
      });

      // Get total count for pagination
      const total = await prisma.matchScore.count({ where });

      return NextResponse.json({
        success: true,
        data: matchScores.map(score => serializeMatchScore(score)),
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total
        }
      });

    } catch (error) {
      console.error('Error listing match scores:', error);
      
      return NextResponse.json({
        success: false,
        error: 'Failed to retrieve match scores'
      }, { status: 500 });
    }
  });
}

export const GET = withApiTracking(asyncHandler(handleGET));
export const POST = withApiTracking(asyncHandler(handlePOST))

// DELETE /api/v1/match-scores - Clear cache for profile
async function handleDELETE(request: NextRequest) {
  return withRateLimit(rateLimitConfigs.api, 'match-score-cache')(request, async () => {
    // Check authentication
    const { userId } = await auth()
    
    if (!userId) {
      throw commonErrors.unauthorized()
    }

    // Get the authenticated user's organization and profile
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      include: { organization: true }
    })

    if (!user) {
      throw commonErrors.notFound('User')
    }

    // Get the user's organization profile
    const profile = await prisma.profile.findFirst({
      where: {
        organizationId: user.organizationId,
        deletedAt: null
      }
    })

    if (!profile) {
      throw commonErrors.notFound('Profile')
    }

    // Clear all cached match scores for this profile (all versions)
    const pattern = `match_score:${profile.id}:*`
    let clearedCount = 0
    
    try {
      // Try new cache invalidation first
      clearedCount = await cacheManager.invalidateByTags([`profile:${profile.id}`])
      console.log(`New cache system cleared ${clearedCount} cached match scores for profile ${profile.id}`)
    } catch (newCacheError) {
      console.warn(`New cache invalidation failed, falling back to legacy:`, newCacheError)
      
      // Fallback to legacy Redis implementation
      try {
        const { redis } = await import('@/lib/redis')
        const keys = await redis.keys(pattern)
        
        if (keys.length > 0) {
          await redis.del(...keys)
          clearedCount = keys.length
          console.log(`Legacy system cleared ${keys.length} cached match scores for profile ${profile.id}`)
        }
      } catch (legacyCacheError) {
        console.error(`Legacy cache clearing failed:`, legacyCacheError)
        throw commonErrors.serverError('Failed to clear cache')
      }
    }

    return NextResponse.json({
      success: true,
      message: `Cleared ${clearedCount} cached match scores`
    })
  })
}

export const DELETE = withApiTracking(asyncHandler(handleDELETE))