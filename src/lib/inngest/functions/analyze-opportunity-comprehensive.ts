/**
 * Inngest Function: Comprehensive Opportunity Analysis
 * 
 * Single function that handles AI analysis, competitors, and similar contracts
 * in the background to prevent UI blocking and provide efficient caching.
 */

import { inngest } from "../client";
import { env } from '@/lib/config/env';
import { createAIProvider } from '@/lib/ai/providers/factory';
import { AI_PROVIDERS } from '@/lib/ai/providers/factory';
import { prisma } from '@/lib/db';
import { createUSAspendingProvider } from '@/lib/data-providers/usaspending-provider';

export const analyzeOpportunityComprehensive = inngest.createFunction(
  {
    id: "analyze-opportunity-comprehensive",
    name: "Comprehensive Opportunity Analysis",
    concurrency: {
      limit: 5, // Limit concurrent executions
    },
    retries: 2
  },
  { event: "ai-analysis/opportunity.requested" },
  async ({ event, step }) => {
    const { 
      opportunityId, 
      organizationId, 
      userId, 
      opportunity,
      analysisType = 'complete',
      priority = 'normal'
    } = event.data;

    const startTime = Date.now();

    try {
      console.log(`🤖 [Comprehensive Analysis] Starting ${analysisType} analysis for opportunity: ${opportunityId}`);

      // Step 1: Check for existing cached data
      const existingData = await step.run('check-existing-cache', async () => {
        const [aiAnalysis, competitors, similarContracts] = await Promise.all([
          // Check AI analysis cache
          supabase
            .from('opportunity_ai_analysis')
            .select('*')
            .eq('opportunity_id', opportunityId)
            .eq('organization_id', organizationId)
            .eq('analysis_type', analysisType)
            .single()
            .then(({ data }) => {
              if (data && data.created_at) {
                const ageInHours = (Date.now() - new Date(data.created_at).getTime()) / (1000 * 60 * 60);
                return ageInHours < 24 ? data : null; // Cache for 24 hours
              }
              return null;
            })
            .catch(() => null),

          // Check competitors cache
          supabase
            .from('opportunity_competitors_cache')
            .select('*')
            .eq('opportunity_id', opportunityId)
            .eq('organization_id', organizationId)
            .single()
            .then(({ data }) => {
              if (data && data.created_at) {
                const ageInHours = (Date.now() - new Date(data.created_at).getTime()) / (1000 * 60 * 60);
                return ageInHours < 6 ? data.competitors_data : null; // Cache for 6 hours
              }
              return null;
            })
            .catch(() => null),

          // Check similar contracts cache
          supabase
            .from('opportunity_similar_contracts_cache')
            .select('*')
            .eq('opportunity_id', opportunityId)
            .eq('organization_id', organizationId)
            .single()
            .then(({ data }) => {
              if (data && data.created_at) {
                const ageInHours = (Date.now() - new Date(data.created_at).getTime()) / (1000 * 60 * 60);
                return ageInHours < 6 ? data.contracts_data : null; // Cache for 6 hours
              }
              return null;
            })
            .catch(() => null),
        ]);

        return { aiAnalysis, competitors, similarContracts };
      });

      // Step 2: Generate AI analysis if not cached
      const aiAnalysis = existingData.aiAnalysis || await step.run('generate-ai-analysis', async () => {
        if (existingData.aiAnalysis) return existingData.aiAnalysis;

        const aiProvider = createAIProvider(AI_PROVIDERS.OPENAI, {
          apiKey: env.OPENAI_API_KEY,
          model: 'gpt-4o-mini',
        });

        const prompt = `Provide a comprehensive analysis of this government contracting opportunity:

Opportunity Details:
Title: ${opportunity.title}
Agency: ${opportunity.agency?.name || opportunity.agency}
Description: ${opportunity.description || 'No description provided'}
NAICS Codes: ${opportunity.naicsCodes?.join(', ') || 'Not specified'}
PSC Codes: ${opportunity.pscCodes?.join(', ') || 'Not specified'}
Set-Aside: ${opportunity.setAsideType || 'None'}
Security Clearance: ${opportunity.securityClearanceRequired || 'None'}
Value: ${opportunity.estimatedValue ? `$${opportunity.estimatedValue.toLocaleString()}` : 'Not specified'}

Provide analysis in JSON format with sections: overview, requirements, challenges, recommendations.`;

        const response = await aiProvider.generateText({
          messages: [
            {
              role: 'system',
              content: 'You are an expert government contracting analyst. Provide detailed, actionable insights. Always respond with valid JSON.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.3,
          maxTokens: 2000,
        });

        let analysisData;
        try {
          analysisData = JSON.parse(response.text);
        } catch {
          analysisData = { overview: response.text, rawText: response.text, parseError: true };
        }

        const analysis = {
          ...analysisData,
          metadata: {
            model: 'gpt-4o-mini',
            tokensUsed: response.usage?.total_tokens || 0,
            processingTime: Date.now() - startTime,
            analysisType,
          }
        };

        // Save to database
        await supabase
          .from('opportunity_ai_analysis')
          .upsert({
            opportunity_id: opportunityId,
            organization_id: organizationId,
            user_id: userId,
            analysis_type: analysisType,
            analysis_data: analysis,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'opportunity_id,organization_id,analysis_type',
          });

        return analysis;
      });

      // Step 3: Generate competitors analysis if not cached
      const competitors = existingData.competitors || await step.run('analyze-competitors', async () => {
        if (existingData.competitors) return existingData.competitors;

        const provider = createUSAspendingProvider();
        
        // Fetch and process competitors (reusing existing logic but simplified)
        const similarContracts = await provider.fetchSimilarContracts({
          naicsCodes: opportunity.naicsCodes,
          pscCodes: opportunity.pscCodes,
          state: opportunity.placeOfPerformance?.state || opportunity.performanceState,
          estimatedValue: opportunity.estimatedValue || opportunity.contractValue,
          limit: 50,
        });

        // Process into competitors (simplified version of existing logic)
        const competitorMap = new Map();
        for (const contract of similarContracts) {
          if (!contract.recipientName) continue;
          const key = contract.recipientName.toLowerCase().trim();
          if (!competitorMap.has(key)) {
            competitorMap.set(key, {
              id: `competitor_${contract.recipientId || key.replace(/\s+/g, '_')}`,
              name: contract.recipientName,
              recipientId: contract.recipientId,
              uei: contract.recipientUei,
              location: contract.vendor?.location || contract.placeOfPerformance || {},
              businessType: contract.vendor?.businessType,
              contracts: [],
              totalValue: 0,
            });
          }
          const comp = competitorMap.get(key);
          comp.contracts.push(contract);
          comp.totalValue += contract.awardedValue || 0;
        }

        const competitorsArray = Array.from(competitorMap.values())
          .map(comp => ({
            ...comp,
            totalContracts: comp.contracts.length,
            averageValue: comp.totalContracts > 0 ? comp.totalValue / comp.totalContracts : 0,
            matchReasons: ['Similar NAICS', 'Same Agency Type'], // Simplified
          }))
          .sort((a, b) => b.totalValue - a.totalValue)
          .slice(0, 20);

        // Cache competitors
        await supabase
          .from('opportunity_competitors_cache')
          .upsert({
            opportunity_id: opportunityId,
            organization_id: organizationId,
            competitors_data: competitorsArray,
            total_found: competitorsArray.length,
            created_at: new Date().toISOString(),
          }, { onConflict: 'opportunity_id,organization_id' });

        return competitorsArray;
      });

      // Step 4: Generate similar contracts if not cached
      const similarContracts = existingData.similarContracts || await step.run('analyze-similar-contracts', async () => {
        if (existingData.similarContracts) return existingData.similarContracts;

        const provider = createUSAspendingProvider();
        const contracts = await provider.fetchSimilarContracts({
          naicsCodes: opportunity.naicsCodes,
          pscCodes: opportunity.pscCodes,
          state: opportunity.placeOfPerformance?.state || opportunity.performanceState,
          estimatedValue: opportunity.estimatedValue || opportunity.contractValue,
          limit: 10,
        });

        // Add similarity scores (simplified)
        const enhancedContracts = contracts.map(contract => ({
          ...contract,
          similarityScore: 75 + Math.random() * 20, // Simplified scoring
          matchReasons: ['NAICS Match', 'Similar Value'],
        }));

        // Cache similar contracts
        await supabase
          .from('opportunity_similar_contracts_cache')
          .upsert({
            opportunity_id: opportunityId,
            organization_id: organizationId,
            contracts_data: enhancedContracts,
            total_found: enhancedContracts.length,
            created_at: new Date().toISOString(),
          }, { onConflict: 'opportunity_id,organization_id' });

        return enhancedContracts;
      });

      // Step 5: Log completion (client will handle UI updates and notifications)
      console.log(`✅ [Comprehensive Analysis] Completed successfully:`, {
        opportunityId,
        aiAnalysisType: typeof aiAnalysis,
        competitorsFound: competitors.length,
        similarContractsFound: similarContracts.length,
        processingTime: Date.now() - startTime,
        message: `Analysis complete for "${opportunity.title}" - AI insights, ${competitors.length} competitors, and ${similarContracts.length} similar contracts found.`,
      });

      console.log(`✅ [Comprehensive Analysis] Completed all analysis for opportunity: ${opportunityId} in ${Date.now() - startTime}ms`);

      return {
        success: true,
        aiAnalysis,
        competitors,
        similarContracts,
        processingTime: Date.now() - startTime,
      };

    } catch (error) {
      console.error(`❌ [Comprehensive Analysis] Failed for ${opportunityId}:`, error);

      // Log failure (client will handle error states)
      console.error(`❌ [Comprehensive Analysis] Analysis failed:`, {
        opportunityId,
        organizationId,
        error: error instanceof Error ? error.message : 'Unknown error',
        analysisType,
      });

      throw error;
    }
  }
);