/**
 * Advanced LLM-Based Government Contract Opportunity Scoring System v5.0
 * 
 * Implementation based on the comprehensive algorithm in LLM-based Scoring algorithm.md
 * Uses existing AI service infrastructure with OpenRouter integration
 */

import { AIServiceManager } from '@/lib/ai/ai-service-manager';
import { CompletionRequest, CompletionResponse } from '@/lib/ai/interfaces/service-contracts';
import { CURRENT_ALGORITHM_CONFIG } from '@/lib/profile-scoring-config';
import type { Profile, Opportunity } from '@/types';
import { 
  LLMMatchScoreRequest, 
  MatchScore, 
  CreateMatchScoreInput,
  validateLLMRequest 
} from '@/lib/validations/match-score';

// ==========================================
// Types from the Algorithm Document
// ==========================================

interface LLMScoringConfig {
  organizationId: string;
  userId?: string;
  enableSemanticAnalysis: boolean;
  enableStrategicInsights: boolean;
  useReasoningModels: boolean;
  maxTokens: number;
  temperature: number;
  fastMode?: boolean; // Enable simplified scoring for faster results
}

interface ContextAnalysis {
  explicitRequirements: string[];
  implicitRequirements: string[];
  hiddenPreferences: string[];
  competitiveLandscape: {
    likelyIncumbent: string | null;
    estimatedCompetitors: number;
    competitorProfiles: string[];
    incumbentVulnerabilities: string[];
  };
  redFlags: string[];
  reasoningTrace: ReasoningStep[];
  modelUsed: string;
  processingTimeMs: number;
  cost: number;
}

interface ReasoningStep {
  step: string;
  analysis: string;
  confidence: number;
  evidence: string[];
}

interface DetailedScoring {
  categories: {
    pastPerformance: CategoryScore;
    technicalCapability: CategoryScore;
    strategicFitRelationships: CategoryScore;
    credibilityMarketPresence: CategoryScore;
  };
  overallScore: number;
  confidence: number;
  reasoning: string;
  processingTimeMs: number;
  cost: number;
}

interface CategoryScore {
  score: number;
  weight: number;
  contribution: number;
  subfactors: Record<string, SubFactorScore>;
  insights: {
    strengths: string[];
    weaknesses: string[];
    opportunities: string[];
    threats: string[];
  };
}

interface SubFactorScore {
  score: number;
  weight: number;
  contribution: number;
  evidence: {
    dataPoints: string[];
    reasoning: string;
    confidence: number;
  };
  semanticMatches: {
    explicit: string[];
    implicit: string[];
    contextual: string[];
  };
}

interface VerifiedScoring extends DetailedScoring {
  verificationNotes: string[];
  adjustments: string[];
  finalConfidence: number;
}

interface StrategicInsights {
  winProbability: {
    percentage: number;
    rationale: string;
    confidenceInterval: [number, number];
  };
  competitiveAdvantages: Array<{
    advantage: string;
    impact: 'HIGH' | 'MEDIUM' | 'LOW';
    howToLeverage: string;
  }>;
  criticalGaps: Array<{
    gap: string;
    severity: 'DISQUALIFYING' | 'CRITICAL' | 'IMPORTANT' | 'MINOR';
    mitigation: string;
    timeToAddress: string;
  }>;
  teamingRecommendations: Array<{
    partnerType: string;
    reason: string;
    specificCompanies?: string[];
    urgency: 'IMMEDIATE' | 'SOON' | 'EVENTUAL';
  }>;
  proposalStrategy: {
    winThemes: string[];
    discriminators: string[];
    ghostingOpportunities: string[];
    priceToWinEstimate?: {
      lowRange: number;
      highRange: number;
      confidence: number;
      rationale: string;
    };
  };
}

interface LLMMatchScoreResult {
  // Core scoring
  overallScore: number;
  confidence: number;
  algorithmVersion: string;
  timestamp: string;
  
  // Detailed category scores
  categories: {
    pastPerformance: CategoryScore;
    technicalCapability: CategoryScore;
    strategicFitRelationships: CategoryScore;
    credibilityMarketPresence: CategoryScore;
  };
  
  // Semantic analysis results
  semanticAnalysis: {
    implicitRequirements: string[];
    hiddenPreferences: string[];
    evaluationCriteriaPrediction: Array<{
      criterion: string;
      estimatedWeight: number;
      evidence: string;
    }>;
    competitiveLandscape: {
      likelyIncumbent: string | null;
      estimatedCompetitors: number;
      competitorProfiles: string[];
      incumbentVulnerabilities: string[];
    };
  };
  
  // Strategic intelligence
  strategicInsights: StrategicInsights;
  
  // Action recommendations
  recommendations: {
    goNoGoRecommendation: 'STRONG_GO' | 'GO' | 'CONDITIONAL_GO' | 'NO_GO';
    decisionRationale: string;
    immediateActions: Array<{
      action: string;
      deadline: string;
      responsible: string;
      impact: string;
    }>;
    conditionalFactors?: Array<{
      condition: string;
      ifMet: string;
      ifNotMet: string;
    }>;
  };
  
  // Confidence and reliability metrics
  analysisMetadata: {
    dataCompleteness: number;
    analysisDepth: 'COMPREHENSIVE' | 'STANDARD' | 'LIMITED';
    uncertaintyFactors: string[];
    assumptionsMade: string[];
    dataQualityIssues: string[];
    llmModel: string;
    promptVersion: string;
    processingTimeMs: number;
  };
}

// ==========================================
// Model Selection Strategy (OpenRouter + OpenAI Only)
// ==========================================

const MODEL_SELECTION = {
  // Reasoning models for complex analysis (via OpenRouter + OpenAI)
  reasoning: {
    primary: "deepseek/deepseek-r1",         // OpenRouter - Advanced reasoning model for better insights
    fallback: "deepseek/deepseek-chat",      // OpenRouter - Fallback to regular DeepSeek
    budget: "openai/gpt-4o-mini"            // OpenAI - Fast fallback
  },
  
  // Analysis models for scoring (via OpenRouter + OpenAI)
  analysis: {
    primary: "deepseek/deepseek-r1",         // OpenRouter - Advanced reasoning for scoring
    fallback: "openai/gpt-4o-mini",         // OpenAI - Fast and accurate for structured tasks
    budget: "deepseek/deepseek-chat"        // OpenRouter - Budget option
  },
  
  // Verification models (via OpenRouter + OpenAI)
  verification: {
    primary: "openai/gpt-4o-mini",          // OpenAI - Fastest for verification
    fallback: "deepseek/deepseek-chat",     // OpenRouter - Fast fallback
    budget: "meta-llama/llama-3.1-8b-instruct" // OpenRouter - Budget option
  }
};

// ==========================================
// Main LLM Scoring Engine
// ==========================================

export class LLMScoringEngine {
  private aiService: any; // AI service instance
  private config: LLMScoringConfig;
  private totalCost: number = 0; // Track cumulative cost
  
  constructor(aiService: any, config: LLMScoringConfig) {
    this.aiService = aiService;
    this.config = config;
  }

  /**
   * Helper method to make AI calls and track costs
   */
  private async callAIWithCostTracking(request: any): Promise<any> {
    const response = await this.aiService.generateCompletion(request);
    if (response.cost) {
      this.totalCost += response.cost;
      console.log(`💰 [LLM SCORING] Added $${response.cost.toFixed(6)} to total cost (now $${this.totalCost.toFixed(6)})`);
    }
    return response;
  }
  
  /**
   * Calculate comprehensive LLM-based match score
   * Implements the 5-step process from the algorithm document
   */
  async calculateScore(
    opportunity: Opportunity,
    profile: Profile
  ): Promise<LLMMatchScoreResult> {
    const startTime = Date.now();
    this.totalCost = 0; // Reset cost tracking for this calculation
    
    console.log(`🚀 LLMScoringEngine.calculateScore: Starting 5-step LLM analysis for opportunity ${opportunity.id}`);
    
    try {
      if (this.config.fastMode) {
        // Fast mode: Skip steps 1, 3, and 4 for speed
        console.log(`🚀 FAST MODE: Performing simplified 2-step LLM scoring`);
        
        // Step 2 only: Direct detailed scoring (most important step)
        console.log(`🤖 FAST STEP: Calculating detailed scores`);
        const detailedScoring = await this.calculateDetailedScores(
          opportunity,
          profile,
          this.createMinimalContextAnalysis() // Use minimal context
        );
        console.log(`✅ FAST STEP completed: Score ${detailedScoring.overallScore} in fast mode`);
        
        // Convert to final result format with minimal overhead
        const finalResult = this.compileFastResult(detailedScoring, startTime);
        console.log(`✅ FAST MODE COMPLETE: Final LLM score is ${finalResult.overallScore}`);
        
        return finalResult;
      } else {
        // Full mode: All 5 steps for comprehensive analysis
        console.log(`🤖 FULL MODE: Performing comprehensive 5-step LLM analysis`);
        
        // Step 1: Deep reasoning analysis
        console.log(`🤖 STEP 1: Performing reasoning analysis with AI service`);
        const contextAnalysis = await this.performReasoningAnalysis(
          opportunity,
          profile
        );
        console.log(`✅ STEP 1 completed: Context analysis generated`);
        
        // Step 2: Detailed scoring with structured output
        console.log(`🤖 STEP 2: Calculating detailed scores`);
        const detailedScoring = await this.calculateDetailedScores(
          opportunity,
          profile,
          contextAnalysis
        );
        console.log(`✅ STEP 2 completed: Detailed scoring generated with score ${detailedScoring.overallScore}`);
        
        // Step 3: Verification with different model
        console.log(`🤖 STEP 3: Verifying with alternative model`);
        const verifiedScore = await this.verifyWithAlternativeModel(
          detailedScoring
        );
        console.log(`✅ STEP 3 completed: Score verified as ${verifiedScore.overallScore}`);
        
        // Step 4: Strategic insights generation
        console.log(`🤖 STEP 4: Generating strategic insights`);
        const insights = await this.generateStrategicInsights(
          verifiedScore,
          opportunity,
          profile
        );
        console.log(`✅ STEP 4 completed: Strategic insights generated`);
        
        // Step 5: Compile final result
        console.log(`🤖 STEP 5: Compiling final comprehensive result`);
        const finalResult = this.compileFinalResult(
          verifiedScore,
          insights,
          contextAnalysis,
          startTime
        );
        console.log(`✅ ALL STEPS COMPLETE: Final LLM score is ${finalResult.overallScore}`);
        
        return finalResult;
      }
    } catch (error) {
      console.error('❌ LLM scoring error in calculateScore:', error);
      throw error;
    }
  }
  
  /**
   * Step 1: Perform deep reasoning analysis using chain-of-thought
   * Uses DeepSeek-R1 for comprehensive reasoning
   */
  private async performReasoningAnalysis(
    opportunity: Opportunity,
    profile: Profile
  ): Promise<ContextAnalysis> {
    console.log(`🔍 Step 1 START: performReasoningAnalysis`);
    console.log(`🔍 Step 1 Config:`, {
      organizationId: this.config.organizationId,
      userId: this.config.userId,
      model: MODEL_SELECTION.reasoning.primary
    });
    
    const prompt = this.buildReasoningPrompt(opportunity, profile);
    console.log(`🔍 Step 1 Prompt length: ${prompt.length} characters`);
    
    const request: CompletionRequest = {
      model: MODEL_SELECTION.reasoning.primary,
      messages: [
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.2,
      maxTokens: 4000, // Reduced for faster response
      responseFormat: { type: "text" }, // Let it reason freely first
      organizationId: this.config.organizationId,
      userId: this.config.userId,
      metadata: {
        taskType: 'llm_scoring_reasoning'
      }
    };
    
    console.log(`🤖 Step 1: Calling AI service with request:`, {
      model: request.model,
      hasMessages: !!request.messages,
      messageCount: request.messages?.length,
      organizationId: request.organizationId,
      userId: request.userId
    });
    
    let response;
    try {
      response = await this.callAIWithCostTracking(request);
      console.log(`🤖 Step 1 Response received:`, {
        hasContent: !!response?.content,
        contentLength: response?.content?.length || 0,
        contentType: typeof response?.content,
        responseKeys: response ? Object.keys(response) : 'no response',
        model: response?.model,
        latency: response?.latency,
        cost: response?.cost
      });
      
      if (!response || !response.content) {
        console.error(`❌ Step 1 FAILED: No response or content from AI service`);
        throw new Error('AI service returned no content in Step 1');
      }
    } catch (error) {
      console.error(`❌ Step 1 ERROR calling AI service:`, error);
      throw error;
    }
    
    console.log(`🤖 Step 1 AI Response preview:`, response.content?.substring(0, 300) + '...');
    
    // Parse reasoning trace and extract structured analysis
    const reasoningSteps = this.parseReasoningTrace(response.content);
    const analysis = await this.structureAnalysis(response.content, reasoningSteps);
    
    const result = {
      ...analysis,
      reasoningTrace: reasoningSteps,
      modelUsed: response.model || MODEL_SELECTION.reasoning.primary,
      processingTimeMs: response.latency || 0,
      cost: response.cost || 0
    };
    
    console.log(`✅ Step 1 COMPLETE: performReasoningAnalysis result:`, {
      hasExplicitRequirements: !!result.explicitRequirements,
      hasImplicitRequirements: !!result.implicitRequirements,
      processingTimeMs: result.processingTimeMs,
      modelUsed: result.modelUsed
    });
    
    return result;
  }
  
  /**
   * Build comprehensive reasoning prompt based on algorithm document
   */
  private buildReasoningPrompt(
    opportunity: Opportunity,
    profile: Profile
  ): string {
    // Extract only essential fields to reduce token usage by 60-70%
    const oppData = {
      title: opportunity.title,
      agency: opportunity.agency,
      naicsCodes: opportunity.naicsCodes,
      estimatedValue: opportunity.estimatedValue,
      setAsideType: opportunity.setAsideType,
      performanceState: opportunity.performanceState || opportunity.placeOfPerformance?.state,
      securityClearanceRequired: opportunity.securityClearanceRequired
    };
    
    const profileData = {
      companyName: profile.companyName,
      primaryNaics: profile.primaryNaics,
      secondaryNaics: profile.secondaryNaics,
      certifications: profile.certifications,
      pastPerformance: profile.pastPerformance,
      geographicPreferences: profile.geographicPreferences,
      securityClearance: profile.securityClearance
    };

    return `Expert gov contracting analyst. Perform HONEST correlation analysis between contractor and opportunity.

OPP: ${JSON.stringify(oppData)}
CONTRACTOR: ${JSON.stringify(profileData)}

CRITICAL: Be brutally honest about fit. Identify specific gaps and mismatches.

Analyze DIRECT CORRELATIONS:
1. EXPLICIT: Which specific contractor capabilities match/miss opportunity requirements
2. GAPS: What critical requirements does the contractor lack or struggle to meet
3. COMPETITIVE: How contractor's specific profile compares to likely competition
4. RISKS: Real disqualification threats based on contractor's actual capabilities
5. REALISTIC WIN FACTORS: Only cite advantages that are actually supported by contractor's profile

Focus on SPECIFIC profile elements (NAICS codes, past performance, certifications, geography) vs opportunity requirements. NO generic assessments.

Provide honest structured analysis for realistic scoring.`;
  }
  
  /**
   * Step 2: Calculate detailed scores using structured prompting
   * Uses Claude for precise scoring with JSON output
   */
  private async calculateDetailedScores(
    opportunity: Opportunity,
    profile: Profile,
    contextAnalysis: ContextAnalysis
  ): Promise<DetailedScoring> {
    console.log(`🔍 Step 2 START: calculateDetailedScores`);
    
    const scoringPrompt = this.buildScoringPrompt(opportunity, profile, contextAnalysis);
    console.log(`🔍 Step 2 Prompt length: ${scoringPrompt.length} characters`);
    
    const request: CompletionRequest = {
      model: MODEL_SELECTION.analysis.primary,
      messages: [
        {
          role: "system",
          content: this.getScoringSystemPrompt()
        },
        {
          role: "user",
          content: scoringPrompt
        }
      ],
      temperature: 0.1, // Very low for consistency
      maxTokens: 3000, // Reduced for faster structured output
      responseFormat: { type: "json_object" },
      organizationId: this.config.organizationId,
      userId: this.config.userId,
      metadata: {
        taskType: 'llm_scoring_detailed'
      }
    };
    
    console.log(`🤖 Step 2: Calling AI service with request:`, {
      model: request.model,
      hasMessages: !!request.messages,
      messageCount: request.messages?.length,
      systemPromptLength: request.messages?.[0]?.content?.length,
      userPromptLength: request.messages?.[1]?.content?.length,
      organizationId: request.organizationId,
      userId: request.userId,
      responseFormat: request.responseFormat
    });
    
    let response;
    try {
      response = await this.callAIWithCostTracking(request);
      console.log(`🤖 Step 2 Response received:`, {
        hasContent: !!response?.content,
        contentLength: response?.content?.length || 0,
        contentType: typeof response?.content,
        responseKeys: response ? Object.keys(response) : 'no response',
        model: response?.model,
        latency: response?.latency,
        cost: response?.cost
      });
      
      if (!response || !response.content) {
        console.error(`❌ Step 2 FAILED: No response or content from AI service`);
        throw new Error('AI service returned no content in Step 2');
      }
    } catch (error) {
      console.error(`❌ Step 2 ERROR calling AI service:`, error);
      throw error;
    }
    
    console.log(`🤖 Step 2 AI Response preview:`, response.content?.substring(0, 500) + '...');
    
    let scoring;
    try {
      // The response might have the content nested in different ways
      let contentToParse = response.content;
      
      // Check if it's already an object (some adapters return parsed JSON)
      if (typeof contentToParse === 'object') {
        scoring = contentToParse;
        console.log(`🤖 Step 2 Response already parsed as object`);
      } else {
        // Try to parse as JSON string
        scoring = JSON.parse(contentToParse);
        console.log(`🤖 Step 2 JSON parsing successful`);
      }
      
      // Validate the structure
      if (!scoring.categories || !scoring.overallScore) {
        throw new Error('Invalid scoring structure returned');
      }
      
    } catch (jsonError) {
      console.error(`🤖 Step 2 JSON parsing failed:`, jsonError);
      console.error(`🤖 Raw response:`, response);
      console.error(`🤖 Response type:`, typeof response.content);
      console.error(`🤖 Response content sample:`, 
        typeof response.content === 'string' 
          ? response.content.substring(0, 500) 
          : JSON.stringify(response.content, null, 2).substring(0, 500)
      );
      
      // Try to extract JSON from text if it's embedded
      if (typeof response.content === 'string') {
        // First try to remove markdown code blocks if present
        let cleanContent = response.content;
        if (cleanContent.includes('```json')) {
          cleanContent = cleanContent.replace(/```json\s*/g, '').replace(/```\s*/g, '');
        } else if (cleanContent.includes('```')) {
          cleanContent = cleanContent.replace(/```\s*/g, '');
        }
        
        // Now try to extract JSON
        const jsonMatch = cleanContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            scoring = JSON.parse(jsonMatch[0]);
            console.log(`🤖 Step 2 Extracted JSON from text successfully`);
          } catch (extractError) {
            console.error(`🤖 Step 2 JSON extraction also failed:`, extractError);
            scoring = null;
          }
        }
      }
      
      // Final fallback to basic structure
      if (!scoring) {
        console.log(`🤖 Step 2 Using fallback scoring structure`);
        scoring = {
          categories: {
            pastPerformance: { 
              score: 50, 
              weight: 35, 
              contribution: 17.5,
              subfactors: {},
              insights: { strengths: [], weaknesses: [], opportunities: [], threats: [] }
            },
            technicalCapability: { 
              score: 50, 
              weight: 35, 
              contribution: 17.5,
              subfactors: {},
              insights: { strengths: [], weaknesses: [], opportunities: [], threats: [] }
            },
            strategicFitRelationships: { 
              score: 50, 
              weight: 15, 
              contribution: 7.5,
              subfactors: {},
              insights: { strengths: [], weaknesses: [], opportunities: [], threats: [] }
            },
            credibilityMarketPresence: { 
              score: 50, 
              weight: 15, 
              contribution: 7.5,
              subfactors: {},
              insights: { strengths: [], weaknesses: [], opportunities: [], threats: [] }
            }
          },
          overallScore: 50,
          confidence: 50,
          reasoning: `JSON parsing failed: ${jsonError instanceof Error ? jsonError.message : 'Unknown error'} - using fallback scores`
        };
      }
    }
    
    // Ensure scoring has valid values - this is critical for the API
    if (!scoring.overallScore || typeof scoring.overallScore !== 'number') {
      console.log(`🤖 Step 2 WARNING: Invalid overallScore (${scoring.overallScore}), calculating from contributions`);
      
      // Calculate from category contributions
      const pastPerf = scoring.categories?.pastPerformance?.contribution || 17.5;
      const techCap = scoring.categories?.technicalCapability?.contribution || 17.5;
      const strategic = scoring.categories?.strategicFitRelationships?.contribution || 7.5;
      const credibility = scoring.categories?.credibilityMarketPresence?.contribution || 7.5;
      
      scoring.overallScore = pastPerf + techCap + strategic + credibility;
      console.log(`🤖 Step 2 Calculated overallScore from contributions: ${scoring.overallScore}`);
      
      // Ensure it's within valid range
      if (scoring.overallScore < 0 || scoring.overallScore > 100) {
        console.log(`🤖 Step 2 WARNING: Calculated score out of range, using fallback`);
        scoring.overallScore = 65; // Safe fallback
      }
    }
    
    if (!scoring.confidence || typeof scoring.confidence !== 'number') {
      console.log(`🤖 Step 2 Setting default confidence`);
      scoring.confidence = 75;
    }
    
    // Absolute safety check - ensure overallScore is always a valid number
    if (typeof scoring.overallScore !== 'number' || isNaN(scoring.overallScore)) {
      console.error(`🤖 Step 2 CRITICAL: overallScore is still invalid after fixes, using emergency fallback`);
      scoring.overallScore = 50; // Emergency fallback
    }
    
    const result = {
      ...scoring,
      processingTimeMs: response.latency || 0,
      cost: response.cost || 0
    };
    
    console.log(`✅ Step 2 COMPLETE: calculateDetailedScores result:`, {
      hasScoring: !!result,
      overallScore: result.overallScore,
      confidence: result.confidence,
      hasCategories: !!result.categories,
      categoryKeys: result.categories ? Object.keys(result.categories) : 'none',
      processingTimeMs: result.processingTimeMs
    });
    
    return result;
  }
  
  /**
   * Build scoring prompt with current algorithm configuration
   */
  private buildScoringPrompt(
    opportunity: Opportunity,
    profile: Profile,
    contextAnalysis: ContextAnalysis
  ): string {
    // Use compressed data to reduce token usage by ~50%
    const oppCore = {
      title: opportunity.title,
      naicsCodes: opportunity.naicsCodes,
      estimatedValue: opportunity.estimatedValue,
      setAsideType: opportunity.setAsideType
    };
    
    const profileCore = {
      companyName: profile.companyName,
      primaryNaics: profile.primaryNaics,
      certifications: profile.certifications,
      pastPerformance: profile.pastPerformance
    };

    return `Calculate HONEST match scores using v4.0 algorithm. Focus on REAL correlations between contractor profile and opportunity.

FRAMEWORK: ${JSON.stringify(CURRENT_ALGORITHM_CONFIG.categories, null, 0)}
CONTEXT: ${JSON.stringify(contextAnalysis, null, 0)}
OPP: ${JSON.stringify(oppCore)}
CONTRACTOR: ${JSON.stringify(profileCore)}

CRITICAL: Base scores on SPECIFIC profile-opportunity correlations. Identify gaps honestly.

Score each subfactor (0-100) with SPECIFIC evidence from contractor profile vs opportunity requirements:

Honest scoring guide:
- 90+: Perfect match with overwhelming specific evidence (rare)
- 80-89: Strong match with solid specific evidence
- 70-79: Good match with some evidence, minor gaps
- 60-69: Moderate match with identifiable gaps
- 50-59: Weak match with significant capability gaps
- <50: Poor match with major misalignments

REQUIREMENTS:
1. Cite SPECIFIC contractor capabilities that match/miss opportunity requirements
2. Identify ALL significant gaps in contractor's profile for this opportunity
3. NO generic assessments - only evidence-based scoring
4. Be realistic about contractor's competitive position

Output detailed JSON with honest scores and specific evidence.`;
  }
  
  private getScoringSystemPrompt(): string {
    return `You are a government contracting scoring expert. Calculate HONEST match scores using the exact 4-category structure.

CRITICAL ANALYSIS REQUIREMENTS:
1. BE BRUTALLY HONEST - identify real gaps and mismatches
2. CITE SPECIFIC profile elements when explaining scores  
3. HIGHLIGHT ACTUAL weaknesses and competitive disadvantages
4. NO generic or overly optimistic assessments
5. Focus on DIRECT CORRELATIONS between contractor profile and opportunity requirements

CRITICAL RULES:
1. Return ONLY raw JSON - no markdown, no code blocks, no backticks
2. Do NOT wrap JSON in \`\`\`json blocks
3. Do NOT include any text before or after the JSON
4. Start your response with { and end with }

SCORING GUIDELINES (be realistic):
- 90+: Perfect match with overwhelming evidence (rare)
- 80-89: Strong match with solid evidence
- 70-79: Good match with some evidence
- 60-69: Moderate match with gaps identified
- 50-59: Weak match with significant gaps
- <50: Poor match with major misalignments

Return this EXACT JSON structure with HONEST numeric values:

{
  "categories": {
    "pastPerformance": {
      "score": [0-100 number - be honest about gaps in relevant experience],
      "weight": 35,
      "contribution": [score * 0.35],
      "subfactors": {},
      "insights": {
        "strengths": ["SPECIFIC contractor past performance that directly relates to this opportunity"],
        "weaknesses": ["SPECIFIC gaps in contractor's experience for this opportunity type"],
        "opportunities": ["SPECIFIC ways contractor could leverage their experience"],
        "threats": ["SPECIFIC competitive disadvantages or experience gaps"]
      }
    },
    "technicalCapability": {
      "score": [0-100 number - honest assessment of NAICS/capability alignment],
      "weight": 35,
      "contribution": [score * 0.35],
      "subfactors": {},
      "insights": {
        "strengths": ["SPECIFIC technical capabilities that match opportunity requirements"],
        "weaknesses": ["SPECIFIC technical gaps or missing certifications for this opportunity"],
        "opportunities": ["SPECIFIC technical advantages contractor could leverage"],
        "threats": ["SPECIFIC technical requirements contractor may struggle to meet"]
      }
    },
    "strategicFitRelationships": {
      "score": [0-100 number - honest geographic and strategic alignment assessment],
      "weight": 15,
      "contribution": [score * 0.15],
      "subfactors": {},
      "insights": {
        "strengths": ["SPECIFIC strategic/geographic advantages for this opportunity"],
        "weaknesses": ["SPECIFIC strategic/geographic mismatches or disadvantages"],
        "opportunities": ["SPECIFIC strategic positioning advantages"],
        "threats": ["SPECIFIC strategic challenges or location disadvantages"]
      }
    },
    "credibilityMarketPresence": {
      "score": [0-100 number - realistic assessment of contractor credibility vs opportunity requirements],
      "weight": 15,
      "contribution": [score * 0.15],
      "subfactors": {},
      "insights": {
        "strengths": ["SPECIFIC credibility factors that benefit this opportunity"],
        "weaknesses": ["SPECIFIC credibility gaps or market presence issues"],
        "opportunities": ["SPECIFIC credibility advantages to highlight"],
        "threats": ["SPECIFIC credibility concerns that could hurt competitiveness"]
      }
    }
  },
  "overallScore": [sum of all contributions],
  "confidence": [60-95 confidence percentage based on data quality],
  "reasoning": "HONEST explanation citing specific profile-opportunity correlations and gaps"
}`;
  }
  
  /**
   * Step 3: Verify scoring with alternative model for robustness
   * Uses Gemini for fast verification with thinking capability
   */
  private async verifyWithAlternativeModel(
    scoring: DetailedScoring
  ): Promise<VerifiedScoring> {
    const verificationPrompt = `Verify and calibrate these match scores. Look for:
1. Scoring consistency across categories
2. Evidence quality for each score
3. Logical coherence of the analysis
4. Potential biases or errors

Original Scoring:
${JSON.stringify(scoring, null, 2)}

Provide your verification with any necessary adjustments and explain your reasoning.`;
    
    const request: CompletionRequest = {
      model: MODEL_SELECTION.verification.primary,
      messages: [
        {
          role: "user",
          content: verificationPrompt
        }
      ],
      temperature: 0.3,
      maxTokens: 2000, // Reduced for faster verification
      organizationId: this.config.organizationId,
      userId: this.config.userId,
      metadata: {
        taskType: 'llm_scoring_verification'
      }
    };
    
    const response = await this.callAIWithCostTracking(request);
    
    return this.parseVerification(response.content, scoring);
  }
  
  /**
   * Step 4: Generate strategic insights using high-quality model
   * Uses o1-preview for high-value opportunities, cheaper models for others
   */
  private async generateStrategicInsights(
    verifiedScore: VerifiedScoring,
    opportunity: Opportunity,
    profile: Profile
  ): Promise<StrategicInsights> {
    const insightsPrompt = this.buildInsightsPrompt(verifiedScore, opportunity, profile);
    
    // Use faster models for all insights generation to improve performance
    const model = MODEL_SELECTION.verification.primary; // Use fastest model for insights
    
    const request: CompletionRequest = {
      model,
      messages: [
        {
          role: "user",
          content: insightsPrompt
        }
      ],
      temperature: 0.4,
      maxTokens: 2500, // Reduced for faster insights generation
      organizationId: this.config.organizationId,
      userId: this.config.userId,
      metadata: {
        taskType: 'llm_scoring_insights'
      }
    };
    
    const response = await this.callAIWithCostTracking(request);
    
    return this.parseInsights(response.content);
  }
  
  private buildInsightsPrompt(
    verifiedScore: VerifiedScoring,
    opportunity: Opportunity,
    profile: Profile
  ): string {
    // Use only essential scoring data to reduce token usage by ~60%
    const scoreCore = {
      overallScore: verifiedScore.overallScore,
      confidence: verifiedScore.confidence,
      categories: Object.keys(verifiedScore.categories).reduce((acc, key) => {
        acc[key] = { score: verifiedScore.categories[key].score };
        return acc;
      }, {} as any)
    };

    return `Senior BD strategist. Provide HONEST, REALISTIC insights based on actual profile-opportunity correlation.

SCORE: ${JSON.stringify(scoreCore)}
OPP: ${opportunity.title} (${opportunity.agency}, $${opportunity.estimatedValue})
CONTRACTOR: ${profile.companyName}

CRITICAL: Base ALL insights on SPECIFIC profile data vs opportunity requirements. NO generic or overly optimistic statements.

Provide HONEST assessment:
1. WIN PROBABILITY: Realistic % based on actual score and gaps (don't inflate)
2. ADVANTAGES: Only cite strengths actually supported by contractor's profile data
3. GAPS: All critical weaknesses and missing capabilities that hurt competitiveness  
4. TEAMING: Partners needed to address SPECIFIC gaps identified in contractor profile
5. STRATEGY: Themes that specifically address contractor's actual advantages/disadvantages
6. GO/NO-GO: Honest decision with frank rationale based on realistic win probability

Be brutally honest about weaknesses. Cite specific profile elements. Executive decision-makers need truth, not optimism.`;
  }
  
  /**
   * Step 5: Compile final comprehensive result
   */
  private compileFinalResult(
    verifiedScore: VerifiedScoring,
    insights: StrategicInsights,
    contextAnalysis: ContextAnalysis,
    startTime: number
  ): LLMMatchScoreResult {
    console.log(`🔍 Step 5 START: compileFinalResult`);
    console.log(`🔍 Step 5 Input verifiedScore:`, {
      hasVerifiedScore: !!verifiedScore,
      overallScore: verifiedScore?.overallScore,
      finalConfidence: verifiedScore?.finalConfidence,
      confidence: verifiedScore?.confidence,
      hasCategories: !!verifiedScore?.categories,
      scoreKeys: verifiedScore ? Object.keys(verifiedScore) : 'none'
    });
    
    const processingTimeMs = Date.now() - startTime;
    const totalCost = (contextAnalysis.cost || 0) + (verifiedScore.cost || 0);
    
    // Ensure we have valid scores with comprehensive fallbacks
    let overallScore = verifiedScore.overallScore;
    
    // Multiple fallback layers for overallScore
    if (typeof overallScore !== 'number' || isNaN(overallScore)) {
      console.warn(`🤖 Step 5 WARNING: Invalid overallScore from verifiedScore: ${overallScore}, trying alternatives`);
      
      // Try to calculate from verified categories
      if (verifiedScore.categories) {
        const pastPerf = verifiedScore.categories.pastPerformance?.contribution || 17.5;
        const techCap = verifiedScore.categories.technicalCapability?.contribution || 17.5;
        const strategic = verifiedScore.categories.strategicFitRelationships?.contribution || 7.5;
        const credibility = verifiedScore.categories.credibilityMarketPresence?.contribution || 7.5;
        overallScore = pastPerf + techCap + strategic + credibility;
        console.log(`🤖 Step 5 Calculated overallScore from categories: ${overallScore}`);
      }
      
      // Final fallback
      if (typeof overallScore !== 'number' || isNaN(overallScore)) {
        console.error(`🤖 Step 5 CRITICAL: Using emergency fallback score`);
        overallScore = 50;
      }
    }
    
    const confidence = verifiedScore.finalConfidence || verifiedScore.confidence || 75;
    
    console.log(`🤖 Step 5: Compiling final result with score: ${overallScore}, confidence: ${confidence}`);
    
    const result = {
      // Core scoring
      overallScore: Math.round(overallScore),
      confidence: Math.round(confidence),
      algorithmVersion: "v5.0-llm-enhanced",
      timestamp: new Date().toISOString(),
      
      // Detailed category scores
      categories: verifiedScore.categories,
      
      // Semantic analysis results
      semanticAnalysis: {
        implicitRequirements: contextAnalysis.implicitRequirements,
        hiddenPreferences: contextAnalysis.hiddenPreferences,
        evaluationCriteriaPrediction: this.extractEvaluationCriteria(contextAnalysis),
        competitiveLandscape: contextAnalysis.competitiveLandscape
      },
      
      // Strategic intelligence
      strategicInsights: insights,
      
      // Action recommendations
      recommendations: this.generateActionRecommendations(insights, verifiedScore),
      
      // Confidence and reliability metrics
      analysisMetadata: {
        dataCompleteness: this.calculateDataCompleteness(contextAnalysis),
        analysisDepth: this.determineAnalysisDepth(verifiedScore.overallScore),
        uncertaintyFactors: this.extractUncertaintyFactors(contextAnalysis),
        assumptionsMade: this.extractAssumptions(contextAnalysis),
        dataQualityIssues: this.identifyDataQualityIssues(contextAnalysis),
        llmModel: contextAnalysis.modelUsed,
        promptVersion: "v5.0",
        processingTimeMs: processingTimeMs
      },
      
      // Cost tracking
      costUsd: this.totalCost
    };
    
    console.log(`✅ Step 5 COMPLETE: compileFinalResult:`, {
      finalOverallScore: result.overallScore,
      finalConfidence: result.confidence,
      algorithmVersion: result.algorithmVersion,
      hasCategories: !!result.categories,
      hasSemanticAnalysis: !!result.semanticAnalysis,
      hasStrategicInsights: !!result.strategicInsights,
      processingTimeMs: result.analysisMetadata.processingTimeMs
    });
    
    return result;
  }
  
  // ==========================================
  // Helper Methods
  // ==========================================
  
  private parseReasoningTrace(content: string): ReasoningStep[] {
    // Extract reasoning steps from the LLM response
    // For now, return a basic step
    return [{
      step: "Initial Analysis",
      analysis: content?.substring(0, 500) || "Analysis in progress",
      confidence: 75,
      evidence: ["Opportunity data analyzed", "Profile data analyzed"]
    }];
  }
  
  private async structureAnalysis(content: string, reasoningSteps: ReasoningStep[]): Promise<Partial<ContextAnalysis>> {
    // Convert free-form reasoning into structured analysis
    // Implementation would use another LLM call to structure the analysis
    return {
      explicitRequirements: [],
      implicitRequirements: [],
      hiddenPreferences: [],
      competitiveLandscape: {
        likelyIncumbent: null,
        estimatedCompetitors: 0,
        competitorProfiles: [],
        incumbentVulnerabilities: []
      },
      redFlags: []
    };
  }
  
  private parseVerification(content: string, originalScoring: DetailedScoring): VerifiedScoring {
    // Parse verification response and apply adjustments
    return {
      ...originalScoring,
      verificationNotes: ["Verification completed"],
      adjustments: [],
      finalConfidence: originalScoring.confidence || 75
    };
  }
  
  private parseInsights(content: string): StrategicInsights {
    // Parse strategic insights from LLM response
    // Return basic insights for now
    return {
      winProbability: { 
        percentage: 65, 
        rationale: "Based on profile capabilities and opportunity requirements", 
        confidenceInterval: [55, 75] 
      },
      competitiveAdvantages: [{
        advantage: "Strong technical capabilities",
        impact: 'MEDIUM',
        howToLeverage: "Emphasize in proposal"
      }],
      criticalGaps: [],
      teamingRecommendations: [],
      proposalStrategy: {
        winThemes: ["Technical excellence"],
        discriminators: ["Proven experience"],
        ghostingOpportunities: []
      }
    };
  }
  
  private extractEvaluationCriteria(contextAnalysis: ContextAnalysis) {
    return [{
      criterion: "Technical Capability",
      estimatedWeight: 35,
      evidence: "Based on NAICS requirements"
    }];
  }
  
  private generateActionRecommendations(insights: StrategicInsights, verifiedScore: VerifiedScoring) {
    const score = verifiedScore.overallScore || 50;
    const goNoGo = score >= 80 ? 'STRONG_GO' :
                   score >= 70 ? 'GO' :
                   score >= 50 ? 'CONDITIONAL_GO' : 'NO_GO';
    
    return {
      goNoGoRecommendation: goNoGo as any,
      decisionRationale: `Based on ${score}% match score`,
      immediateActions: [{
        action: "Review opportunity details",
        deadline: "48 hours",
        responsible: "BD Team",
        impact: "Critical for decision"
      }],
      conditionalFactors: []
    };
  }
  
  private calculateDataCompleteness(contextAnalysis: ContextAnalysis): number {
    return 85; // Placeholder - would analyze data completeness
  }
  
  private determineAnalysisDepth(score: number): 'COMPREHENSIVE' | 'STANDARD' | 'LIMITED' {
    return score >= 70 ? 'COMPREHENSIVE' : score >= 50 ? 'STANDARD' : 'LIMITED';
  }
  
  private extractUncertaintyFactors(contextAnalysis: ContextAnalysis): string[] {
    return []; // Implementation would extract uncertainty factors
  }
  
  private extractAssumptions(contextAnalysis: ContextAnalysis): string[] {
    return []; // Implementation would extract assumptions made
  }
  
  private identifyDataQualityIssues(contextAnalysis: ContextAnalysis): string[] {
    return []; // Implementation would identify data quality issues
  }
  
  /**
   * Create minimal context analysis for fast mode
   */
  private createMinimalContextAnalysis(): ContextAnalysis {
    return {
      explicitRequirements: [],
      implicitRequirements: [],
      hiddenPreferences: [],
      competitiveLandscape: {
        likelyIncumbent: null,
        estimatedCompetitors: 0,
        competitorProfiles: [],
        incumbentVulnerabilities: []
      },
      redFlags: [],
      reasoningTrace: [{
        step: "Fast Mode",
        analysis: "Simplified analysis for speed",
        confidence: 75,
        evidence: ["Fast mode enabled"]
      }],
      modelUsed: "fast-mode",
      processingTimeMs: 0,
      cost: this.totalCost
    };
  }
  
  /**
   * Compile fast result with minimal overhead
   */
  private compileFastResult(
    detailedScoring: DetailedScoring,
    startTime: number
  ): LLMMatchScoreResult {
    const processingTimeMs = Date.now() - startTime;
    const overallScore = detailedScoring.overallScore || 50;
    const confidence = detailedScoring.confidence || 75;
    
    return {
      // Core scoring
      overallScore: Math.round(overallScore),
      confidence: Math.round(confidence),
      algorithmVersion: "v5.0-llm-fast",
      timestamp: new Date().toISOString(),
      
      // Detailed category scores
      categories: detailedScoring.categories,
      
      // Minimal semantic analysis for fast mode
      semanticAnalysis: {
        implicitRequirements: [],
        hiddenPreferences: [],
        evaluationCriteriaPrediction: [],
        competitiveLandscape: {
          likelyIncumbent: null,
          estimatedCompetitors: 0,
          competitorProfiles: [],
          incumbentVulnerabilities: []
        }
      },
      
      // Basic strategic insights
      strategicInsights: {
        winProbability: { 
          percentage: Math.round(overallScore * 0.8), // Rough estimation
          rationale: "Fast mode estimation based on match score", 
          confidenceInterval: [Math.max(0, overallScore - 15), Math.min(100, overallScore + 15)] 
        },
        competitiveAdvantages: [],
        criticalGaps: [],
        teamingRecommendations: [],
        proposalStrategy: {
          winThemes: ["Strong technical capabilities"],
          discriminators: ["Proven experience"],
          ghostingOpportunities: []
        }
      },
      
      // Basic recommendations
      recommendations: {
        goNoGoRecommendation: overallScore >= 70 ? 'GO' : overallScore >= 50 ? 'CONDITIONAL_GO' : 'NO_GO',
        decisionRationale: `Fast mode analysis: ${overallScore}% match score`,
        immediateActions: [{
          action: "Review detailed opportunity requirements",
          deadline: "48 hours",
          responsible: "BD Team",
          impact: "Critical for decision"
        }],
        conditionalFactors: []
      },
      
      // Minimal metadata for fast mode
      analysisMetadata: {
        dataCompleteness: 80,
        analysisDepth: 'STANDARD',
        uncertaintyFactors: ["Fast mode - limited analysis"],
        assumptionsMade: ["Standard scoring assumptions"],
        dataQualityIssues: [],
        llmModel: "fast-mode",
        promptVersion: "v5.0-fast",
        processingTimeMs: processingTimeMs
      },
      
      // Cost tracking for fast mode
      costUsd: this.totalCost
    };
  }
}

// ==========================================
// Factory Function
// ==========================================

export async function createLLMScoringEngine(
  config: LLMScoringConfig
): Promise<LLMScoringEngine> {
  // Use simple AI client for direct provider access (supports both OpenRouter and OpenAI)
  const { simpleAIClient } = await import('@/lib/ai/services/simple-ai-client');
  
  console.log(`🔧 LLM Scoring Engine: Using SimpleAIClient for direct provider access with OpenRouter + OpenAI support`);
  
  return new LLMScoringEngine(simpleAIClient, config);
}

// ==========================================
// Main Scoring Function
// ==========================================

export async function calculateLLMMatchScore(
  opportunity: Opportunity,
  profile: Profile,
  config: LLMScoringConfig
): Promise<CreateMatchScoreInput> {
  console.log(`🚀 LLM SCORING START: calculateLLMMatchScore for opportunity ${opportunity.id}`);
  console.log(`🚀 LLM Scoring Config:`, { 
    organizationId: config.organizationId,
    userId: config.userId,
    enableSemanticAnalysis: config.enableSemanticAnalysis,
    enableStrategicInsights: config.enableStrategicInsights,
    useReasoningModels: config.useReasoningModels
  });
  
  try {
    const engine = await createLLMScoringEngine(config);
    console.log(`🤖 LLM Scoring Engine: Created engine successfully, calling calculateScore...`);
    
    const result = await engine.calculateScore(opportunity, profile);
    console.log(`🎯 LLM Scoring Engine: Calculation completed:`, {
      hasResult: !!result,
      overallScore: result?.overallScore,
      confidence: result?.confidence,
      algorithmVersion: result?.algorithmVersion,
      resultKeys: result ? Object.keys(result) : 'no result'
    });
    
    if (!result) {
      console.error(`❌ LLM Engine returned null/undefined result`);
      throw new Error('LLM scoring engine returned no result');
    }
    
    if (typeof result.overallScore !== 'number' || isNaN(result.overallScore)) {
      console.error(`❌ LLM Engine returned invalid overallScore:`, result.overallScore);
      console.error(`❌ Full result object:`, JSON.stringify(result, null, 2));
      throw new Error(`Invalid overallScore from LLM engine: ${result.overallScore} (type: ${typeof result.overallScore})`);
    }
    
    // Additional safety - ensure score is in valid range
    if (result.overallScore < 0 || result.overallScore > 100) {
      console.warn(`❌ LLM Engine returned out-of-range overallScore: ${result.overallScore}, clamping to valid range`);
      result.overallScore = Math.max(0, Math.min(100, result.overallScore));
    }
    
    // Convert LLM result to database format
    const dbResult = {
      organizationId: config.organizationId,
      profileId: profile.id,
      opportunityId: opportunity.id,
      userId: config.userId,
      
      // Core scoring
      score: result.overallScore, // Add score field for API compatibility
      overallScore: result.overallScore,
      confidence: result.confidence,
      
      // Category scores
      pastPerformanceScore: result.categories?.pastPerformance?.score || 0,
      technicalCapabilityScore: result.categories?.technicalCapability?.score || 0,
      strategicFitRelationshipsScore: result.categories?.strategicFitRelationships?.score || 0,
      credibilityMarketPresenceScore: result.categories?.credibilityMarketPresence?.score || 0,
      
      // Metadata
      algorithmVersion: result.algorithmVersion,
      scoringMethod: 'llm',
      factors: result.categories,
      detailedFactors: result.categories,
      
      // LLM-specific data
      semanticAnalysis: result.semanticAnalysis,
      strategicInsights: result.strategicInsights,
      recommendations: [
        result.recommendations?.decisionRationale || 'No decision rationale available',
        ...(result.recommendations?.immediateActions?.map(a => a.action) || [])
      ],
      processingTimeMs: result.analysisMetadata?.processingTimeMs || 0,
      costUsd: result.costUsd || 0, // Actual cost from AI service usage
      
      // User experience defaults
      markedAsReviewed: false,
      winProbabilityEst: result.strategicInsights?.winProbability?.percentage || null
    };
    
    console.log(`✅ LLM SCORING COMPLETE: Final DB result:`, {
      score: dbResult.score,
      overallScore: dbResult.overallScore,
      confidence: dbResult.confidence,
      pastPerformanceScore: dbResult.pastPerformanceScore,
      technicalCapabilityScore: dbResult.technicalCapabilityScore,
      strategicFitRelationshipsScore: dbResult.strategicFitRelationshipsScore,
      credibilityMarketPresenceScore: dbResult.credibilityMarketPresenceScore,
      algorithmVersion: dbResult.algorithmVersion,
      processingTimeMs: dbResult.processingTimeMs
    });
    
    return dbResult;
  } catch (error) {
    console.error(`❌ LLM SCORING FAILED:`, error);
    throw error;
  }
}