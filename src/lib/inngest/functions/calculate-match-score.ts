/**
 * Inngest Function: Calculate Match Score
 * 
 * Background processing for opportunity match scoring to prevent UI blocking
 * and credit waste from redundant calculations.
 */

import { inngest } from "../client";
import type { InngestEvents } from "../client";
import { prisma } from '@/lib/db';
import { calculateMatchScore } from '@/lib/profile-scoring-config';
import { calculateLLMMatchScore } from '@/lib/llm-scoring/llm-scoring-engine';
import { cacheManager } from '@/lib/cache';
import { UsageTrackingService, UsageType } from '@/lib/usage-tracking';

export const calculateMatchScoreFunction = inngest.createFunction(
  { 
    id: "calculate-match-score",
    concurrency: {
      limit: 10, // Limit concurrent executions to manage AI API load
    },
    retries: 2
  },
  { event: "match-score/opportunity.requested" },
  async ({ event, step }) => {
    const { 
      opportunityId, 
      organizationId, 
      userId, 
      profileId,
      opportunity: opportunityData,
      method = 'llm',
      useAdvancedAnalysis = true,
      priority = 'normal'
    } = event.data;

    const startTime = Date.now();

    return await step.run("calculate-match-score", async () => {
      try {
        console.log(`🎯 [Inngest] Starting match score calculation for opportunity: ${opportunityId}`);

        // Get user and profile
        const user = await prisma.user.findUnique({
          where: { clerkId: userId },
          include: { organization: true }
        });

        if (!user) {
          throw new Error(`User not found: ${userId}`);
        }

        // Get profile (use provided profileId or organization's primary profile)
        const profile = await prisma.profile.findFirst({
          where: {
            ...(profileId ? { id: profileId } : { organizationId: user.organizationId }),
            deletedAt: null
          }
        });

        if (!profile) {
          throw new Error(`Profile not found for organization: ${user.organizationId}`);
        }

        // Generate cache key
        const profileHashData = {
          primaryNaics: profile.primaryNaics,
          secondaryNaics: profile.secondaryNaics,
          naicsCodes: profile.naicsCodes,
          state: profile.state,
          geographicPreferences: profile.geographicPreferences,
          certifications: profile.certifications,
          pastPerformance: profile.pastPerformance,
          governmentLevels: profile.governmentLevels,
          securityClearance: profile.securityClearance,
          capabilities: profile.capabilities || profile.coreCompetencies,
          brandVoice: profile.brandVoice,
          brandTone: profile.brandTone
        };
        
        const profileHash = Buffer.from(JSON.stringify(profileHashData)).toString('base64').slice(0, 12);
        const cacheKey = `match_score:${profile.id}:${profileHash}:${opportunityId}:${method}:${useAdvancedAnalysis ? 'enhanced' : 'fast'}`;

        // Check cache first
        const cachedResult = await cacheManager.get(cacheKey);
        if (cachedResult) {
          console.log(`✅ [Inngest] Cache hit for opportunity: ${opportunityId}`);
          
          // Send completion event
          await inngest.send({
            name: "match-score/opportunity.completed",
            data: {
              opportunityId,
              organizationId,
              score: cachedResult.score,
              details: cachedResult,
              processingTime: Date.now() - startTime,
              method,
              cached: true
            }
          });
          
          return {
            success: true,
            opportunityId,
            score: cachedResult.score,
            cached: true,
            processingTime: Date.now() - startTime
          };
        }

        // Get opportunity data
        let opportunity = opportunityData;
        
        if (!opportunity) {
          // Fetch from API if not provided
          if (opportunityId.startsWith('rt_')) {
            throw new Error(`Real-time opportunity data must be provided for: ${opportunityId}`);
          }
          
          // For stored opportunities, fetch from mock API
          const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/v1/opportunities-mock?query=&limit=50`);
          if (!response.ok) {
            throw new Error(`Failed to fetch opportunity data: ${response.status}`);
          }
          
          const data = await response.json();
          if (!data.success || !data.data?.items) {
            throw new Error(`Invalid opportunity data structure`);
          }
          
          opportunity = data.data.items.find((opp: any) => opp.id === opportunityId);
          if (!opportunity) {
            throw new Error(`Opportunity not found: ${opportunityId}`);
          }
        }

        console.log(`📊 [Inngest] Calculating ${method} score for: ${opportunity.title?.substring(0, 50)}...`);

        // Calculate match score based on method
        let matchResult;
        
        if (method === 'llm' || method === 'hybrid') {
          try {
            matchResult = await calculateLLMMatchScore(opportunity, profile, {
              organizationId: user.organizationId,
              userId: user.id,
              enableSemanticAnalysis: useAdvancedAnalysis,
              enableStrategicInsights: useAdvancedAnalysis,
              useReasoningModels: true,
              maxTokens: 8000,
              temperature: 0.3,
              fastMode: !useAdvancedAnalysis
            });
          } catch (llmError) {
            console.warn(`[Inngest] LLM scoring failed, falling back to calculation:`, llmError);
            // Fallback to calculation method
            matchResult = calculateMatchScore(opportunity, profile);
            matchResult.algorithmVersion = 'v4.0-fallback-from-llm';
            matchResult.scoringMethod = 'calculation';
          }
        } else {
          matchResult = calculateMatchScore(opportunity, profile);
        }

        if (!matchResult || typeof matchResult.score !== 'number') {
          throw new Error(`Invalid match result for opportunity: ${opportunityId}`);
        }

        const finalScore = Math.round(matchResult.score);

        // Cache the result
        await cacheManager.set(cacheKey, matchResult, {
          ttl: 86400, // 24 hours
          userId,
          organizationId: user.organizationId,
          tags: [`profile:${profile.id}`, `opportunity:${opportunityId}`]
        });

        // Save to database for SSE streaming and persistence
        try {
          await prisma.matchScore.create({
            data: {
              opportunityId,
              organizationId: user.organizationId,
              profileId: profile.id,
              overallScore: finalScore,
              confidence: matchResult.confidence || 85,
              algorithmVersion: matchResult.algorithmVersion || 'v5.0-llm-enhanced',
              factors: matchResult.factors || {},
              detailedFactors: matchResult.detailedFactors || matchResult.factors || {},
              breakdown: matchResult.breakdown || {},
              explanation: matchResult.explanation || matchResult.reasoning || '',
              reasoning: matchResult.reasoning || '',
              recommendations: matchResult.recommendations || [],
              scoringMethod: method,
              pastPerformanceScore: matchResult.pastPerformanceScore || 0, // Add missing field
              technicalCapabilityScore: matchResult.technicalCapabilityScore || 0, // Add missing field
              metadata: {
                useAdvancedAnalysis,
                processingTime: Date.now() - startTime,
                source: 'inngest_background',
                cached: false
              }
            }
          });
          console.log(`💾 [Inngest] Saved score to database: ${opportunityId} = ${finalScore}%`);
        } catch (dbError) {
          console.error(`⚠️ [Inngest] Failed to save score to database:`, dbError);
          // Don't fail the whole operation if database save fails
        }

        // Track usage for fresh calculations only
        await UsageTrackingService.trackUsage({
          organizationId: user.organizationId,
          usageType: UsageType.MATCH_SCORE_CALCULATION,
          quantity: 1,
          resourceType: 'individual_calculation',
          metadata: {
            opportunityId,
            profileId: profile.id,
            method,
            useAdvancedAnalysis,
            processingTime: Date.now() - startTime,
            source: 'inngest_background'
          }
        });

        console.log(`✅ [Inngest] Completed score calculation for ${opportunityId}: ${finalScore}%`);

        // Send completion event
        await inngest.send({
          name: "match-score/opportunity.completed",
          data: {
            opportunityId,
            organizationId,
            score: finalScore,
            details: {
              ...matchResult,
              opportunityId,
              score: finalScore,
              factors: matchResult.factors,
              detailedFactors: matchResult.factors,
              isFromCache: false
            },
            processingTime: Date.now() - startTime,
            method,
            cached: false
          }
        });

        return {
          success: true,
          opportunityId,
          score: finalScore,
          details: matchResult,
          cached: false,
          processingTime: Date.now() - startTime
        };

      } catch (error) {
        console.error(`❌ [Inngest] Match score calculation failed for ${opportunityId}:`, error);
        
        // Send failure event
        await inngest.send({
          name: "match-score/opportunity.failed",
          data: {
            opportunityId,
            organizationId,
            error: error.message,
            retry: false // Don't auto-retry to prevent credit waste
          }
        });

        throw error;
      }
    });
  }
);

export const calculateBatchMatchScoresFunction = inngest.createFunction(
  { 
    id: "calculate-batch-match-scores",
    concurrency: {
      limit: 5, // Limit batch processing
    }
  },
  { event: "match-score/batch.requested" },
  async ({ event, step }) => {
    const { 
      batchId,
      opportunityIds, 
      organizationId, 
      userId, 
      profileId,
      opportunities: opportunityDataMap = {},
      method = 'llm',
      useAdvancedAnalysis = true
    } = event.data;

    console.log(`🚀 [Inngest] Starting batch match score calculation: ${batchId} (${opportunityIds.length} opportunities)`);

    // Process opportunities individually using the single scoring function
    const results = await step.run("process-batch", async () => {
      const scorePromises = opportunityIds.map(async (opportunityId, index) => {
        // Stagger requests to avoid overwhelming APIs
        if (index > 0) {
          await new Promise(resolve => setTimeout(resolve, 500 * index));
        }

        try {
          // Send individual scoring request
          await inngest.send({
            name: "match-score/opportunity.requested",
            data: {
              opportunityId,
              organizationId,
              userId,
              profileId,
              opportunity: opportunityDataMap[opportunityId],
              method,
              useAdvancedAnalysis,
              priority: 'normal'
            }
          });

          return { opportunityId, status: 'queued' };
        } catch (error) {
          console.error(`Failed to queue scoring for ${opportunityId}:`, error);
          return { opportunityId, status: 'failed', error: error.message };
        }
      });

      return await Promise.all(scorePromises);
    });

    console.log(`✅ [Inngest] Batch scoring queued: ${batchId} - ${results.filter(r => r.status === 'queued').length}/${opportunityIds.length} successful`);

    return {
      success: true,
      batchId,
      queuedCount: results.filter(r => r.status === 'queued').length,
      failedCount: results.filter(r => r.status === 'failed').length,
      results
    };
  }
);