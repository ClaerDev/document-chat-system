/**
 * Inngest Function: Test Analysis (No External Dependencies)
 * 
 * Simple test function to verify Inngest is working
 */

import { inngest } from "../client";

export const analyzeOpportunityComprehensive = inngest.createFunction(
  {
    id: "analyze-opportunity-comprehensive-test",
    name: "Test Opportunity Analysis",
    concurrency: {
      limit: 5,
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
      analysisType = 'comprehensive'
    } = event.data;

    const startTime = Date.now();

    try {
      console.log(`🤖 [TEST] Starting ${analysisType} analysis for opportunity: ${opportunityId}`);
      console.log(`📊 Event data received:`, { opportunityId, organizationId, userId, analysisType });

      // Step 1: Mock AI analysis (instant)
      const aiAnalysis = await step.run('generate-ai-analysis', async () => {
        console.log('🔀 Generating test analysis...');
        
        const testAnalysis = {
          analysis: `Test analysis completed for: ${opportunity.title}\n\nThis is a mock analysis to test Inngest functionality.`,
          type: analysisType,
          generated_at: new Date().toISOString(),
          model_used: 'test-mode',
          confidence: 1.0
        };
        
        console.log('✅ Test analysis completed');
        return testAnalysis;
      });

      // Step 2: Mock competitors (instant)
      const competitors = await step.run('analyze-competitors', async () => {
        console.log('🔀 Generating test competitors...');
        
        const testCompetitors = {
          total_competitors: 5,
          competition_level: 'test',
          key_competitors: [
            { name: 'Test Competitor 1', market_share: '20%', risk_level: 'low' }
          ],
          analysis_date: new Date().toISOString()
        };
        
        console.log('✅ Test competitors completed');
        return testCompetitors;
      });

      // Step 3: Mock similar contracts (instant)
      const similarContracts = await step.run('find-similar-contracts', async () => {
        console.log('🔀 Generating test contracts...');
        
        const testContracts = {
          total_found: 3,
          avg_award_value: 500000,
          similar_contracts: [
            {
              title: 'Test Similar Contract',
              agency: opportunity.agency,
              award_value: 300000,
              awarded_date: '2024-01-15'
            }
          ],
          analysis_date: new Date().toISOString()
        };
        
        console.log('✅ Test contracts completed');
        return testContracts;
      });

      const processingTime = Date.now() - startTime;
      
      console.log(`✅ [TEST] Completed for opportunity: ${opportunityId} in ${processingTime}ms`);

      return {
        success: true,
        opportunityId,
        organizationId,
        analysisType,
        results: {
          aiAnalysis,
          competitors,
          similarContracts
        },
        processingTime,
        completedAt: new Date().toISOString(),
        testMode: true
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      console.error(`❌ [TEST] Failed for opportunity: ${opportunityId}`, error);
      
      return {
        success: false,
        opportunityId,
        organizationId,
        error: error.message,
        processingTime,
        failedAt: new Date().toISOString(),
        testMode: true
      };
    }
  }
);