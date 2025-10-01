/**
 * Comprehensive Zod validation schemas for MatchScore system
 * Supports both calculation-based and LLM-enhanced scoring
 */

import { z } from 'zod';

// ==========================================
// Core MatchScore Schemas
// ==========================================

export const MatchScoreSchema = z.object({
  id: z.string().cuid().describe("Unique identifier for the match score"),
  organizationId: z.string().cuid().describe("Organization that owns this score"),
  profileId: z.string().cuid().describe("Profile being scored"),
  opportunityId: z.string().cuid().describe("Opportunity being matched against"),
  userId: z.string().cuid().optional().describe("User who calculated the score"),
  
  // Core scoring
  overallScore: z.number().min(0).max(100).describe("Overall match score from 0-100"),
  confidence: z.number().min(0).max(100).describe("Confidence level in the score from 0-100"),
  
  // 4-Category scores (Research-Based Algorithm v4.0)
  pastPerformanceScore: z.number().min(0).max(100).describe("Past performance score (35% weight) - Contract history and agency experience"),
  technicalCapabilityScore: z.number().min(0).max(100).describe("Technical capability score (35% weight) - NAICS, certifications, competencies"),
  strategicFitRelationshipsScore: z.number().min(0).max(100).describe("Strategic fit score (15% weight) - Geographic, government level, scale"),
  credibilityMarketPresenceScore: z.number().min(0).max(100).describe("Credibility score (15% weight) - SAM.gov, contact info, professional presence"),
  
  // Scoring metadata
  algorithmVersion: z.string().describe("Algorithm version used (e.g., 'v4.0-research-based', 'v5.0-llm-enhanced')"),
  scoringMethod: z.enum(['calculation', 'llm', 'hybrid']).describe("Method used to calculate the score"),
  factors: z.record(z.any()).describe("Detailed scoring factors breakdown with sub-factors"),
  detailedFactors: z.record(z.any()).optional().describe("Enhanced factor breakdown for modal display"),
  
  // LLM-enhanced features
  semanticAnalysis: z.object({
    implicitRequirements: z.array(z.string()).describe("Hidden requirements detected"),
    hiddenPreferences: z.array(z.string()).describe("Unstated preferences inferred"),
    evaluationCriteriaPrediction: z.array(z.object({
      criterion: z.string().describe("Evaluation criterion"),
      estimatedWeight: z.number().describe("Estimated weight percentage"),
      evidence: z.string().describe("Evidence for this criterion")
    })).describe("Predicted evaluation criteria"),
    competitiveLandscape: z.object({
      likelyIncumbent: z.string().nullable().describe("Likely incumbent contractor"),
      estimatedCompetitors: z.number().describe("Estimated number of competitors"),
      competitorProfiles: z.array(z.string()).describe("Profiles of likely competitors"),
      incumbentVulnerabilities: z.array(z.string()).describe("Potential incumbent weaknesses")
    }).describe("Competitive landscape analysis")
  }).optional().describe("LLM semantic analysis results"),
  
  strategicInsights: z.object({
    winProbability: z.object({
      percentage: z.number().min(0).max(100).describe("Win probability percentage"),
      rationale: z.string().describe("Rationale for win probability"),
      confidenceInterval: z.tuple([z.number(), z.number()]).describe("Confidence interval [low, high]")
    }).describe("Win probability assessment"),
    competitiveAdvantages: z.array(z.object({
      advantage: z.string().describe("Competitive advantage"),
      impact: z.enum(['HIGH', 'MEDIUM', 'LOW']).describe("Impact level"),
      howToLeverage: z.string().describe("How to leverage this advantage")
    })).describe("Identified competitive advantages"),
    criticalGaps: z.array(z.object({
      gap: z.string().describe("Critical gap identified"),
      severity: z.enum(['DISQUALIFYING', 'CRITICAL', 'IMPORTANT', 'MINOR']).describe("Severity level"),
      mitigation: z.string().describe("Suggested mitigation strategy"),
      timeToAddress: z.string().describe("Time required to address")
    })).describe("Critical gaps that need addressing"),
    teamingRecommendations: z.array(z.object({
      partnerType: z.string().describe("Type of partner needed"),
      reason: z.string().describe("Reason for partnership"),
      specificCompanies: z.array(z.string()).optional().describe("Specific company suggestions"),
      urgency: z.enum(['IMMEDIATE', 'SOON', 'EVENTUAL']).describe("Urgency level")
    })).describe("Teaming recommendations"),
    proposalStrategy: z.object({
      winThemes: z.array(z.string()).describe("Key win themes to emphasize"),
      discriminators: z.array(z.string()).describe("Key discriminators"),
      ghostingOpportunities: z.array(z.string()).describe("How to ghost competitors"),
      priceToWinEstimate: z.object({
        lowRange: z.number().describe("Low range estimate"),
        highRange: z.number().describe("High range estimate"),
        confidence: z.number().describe("Confidence in estimate"),
        rationale: z.string().describe("Rationale for estimate")
      }).optional().describe("Price to win estimate")
    }).describe("Proposal strategy recommendations")
  }).optional().describe("Strategic insights from LLM analysis"),
  
  recommendations: z.array(z.string()).describe("Action recommendations"),
  processingTimeMs: z.number().positive().optional().describe("Time taken to calculate score in milliseconds"),
  costUsd: z.number().nonnegative().optional().describe("Cost of LLM calls in USD"),
  
  // User experience
  userFeedback: z.string().optional().describe("User feedback on score accuracy"),
  feedbackComment: z.string().optional().describe("Detailed user feedback"),
  userRating: z.number().int().min(1).max(5).optional().describe("User rating from 1-5"),
  markedAsReviewed: z.boolean().default(false).describe("Whether user has reviewed this score"),
  
  // Performance tracking
  actualOutcome: z.enum(['won', 'lost', 'no_bid', 'withdrawn']).optional().describe("Actual outcome of the opportunity"),
  winProbabilityEst: z.number().min(0).max(100).optional().describe("Estimated win probability percentage"),
  actualWinRate: z.boolean().optional().describe("Whether opportunity was actually won"),
  
  // Timestamps
  createdAt: z.date().describe("When the score was created"),
  updatedAt: z.date().describe("When the score was last updated")
});

export type MatchScore = z.infer<typeof MatchScoreSchema>;

// ==========================================
// Input/Output Schemas
// ==========================================

// Schema for creating a new match score
export const CreateMatchScoreSchema = MatchScoreSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true
}).extend({
  // Make some fields optional for creation
  userId: z.string().cuid().optional(),
  userFeedback: z.string().optional(),
  feedbackComment: z.string().optional(),
  userRating: z.number().int().min(1).max(5).optional(),
  markedAsReviewed: z.boolean().default(false),
  actualOutcome: z.enum(['won', 'lost', 'no_bid', 'withdrawn']).optional(),
  actualWinRate: z.boolean().optional()
});

export type CreateMatchScoreInput = z.infer<typeof CreateMatchScoreSchema>;

// Schema for updating a match score
export const UpdateMatchScoreSchema = MatchScoreSchema.partial().extend({
  id: z.string().cuid(), // ID is required for updates
  updatedAt: z.date().optional() // Will be set automatically
});

export type UpdateMatchScoreInput = z.infer<typeof UpdateMatchScoreSchema>;

// ==========================================
// Factor Schemas
// ==========================================

export const ScoreFactorSchema = z.object({
  name: z.string().describe("Factor name"),
  contribution: z.number().describe("Contribution to overall score"),
  explanation: z.string().describe("Explanation of the score")
});

export const DetailedScoreFactorSchema = z.object({
  score: z.number().min(0).max(100).describe("Factor score from 0-100"),
  weight: z.number().describe("Weight of this factor"),
  contribution: z.number().describe("Contribution to category score"),
  evidence: z.object({
    dataPoints: z.array(z.string()).describe("Specific data points used"),
    reasoning: z.string().describe("How the data was interpreted"),
    confidence: z.number().min(0).max(100).describe("Confidence in this factor score")
  }).describe("Evidence and reasoning"),
  semanticMatches: z.object({
    explicit: z.array(z.string()).describe("Direct matches found"),
    implicit: z.array(z.string()).describe("Inferred matches"),
    contextual: z.array(z.string()).describe("Context-based matches")
  }).describe("Semantic matching results")
});

export const CategoryScoreSchema = z.object({
  score: z.number().min(0).max(100).describe("Category score from 0-100"),
  weight: z.number().describe("Category weight in overall score"),
  contribution: z.number().describe("Actual contribution to overall score"),
  subfactors: z.record(DetailedScoreFactorSchema).describe("Sub-factor scores"),
  insights: z.object({
    strengths: z.array(z.string()).describe("Category strengths"),
    weaknesses: z.array(z.string()).describe("Category weaknesses"),
    opportunities: z.array(z.string()).describe("Opportunities for improvement"),
    threats: z.array(z.string()).describe("Potential threats")
  }).describe("Category-level insights")
});

// ==========================================
// API Request/Response Schemas
// ==========================================

// Request to calculate a match score
export const CalculateMatchScoreRequestSchema = z.object({
  opportunityId: z.string().cuid().describe("Opportunity to score against"),
  profileId: z.string().cuid().describe("Profile to score"),
  method: z.enum(['calculation', 'llm', 'hybrid']).default('calculation').describe("Scoring method to use"),
  useAdvancedAnalysis: z.boolean().default(false).describe("Whether to use LLM-enhanced analysis"),
  saveToDatabase: z.boolean().default(true).describe("Whether to save the result to database")
});

export type CalculateMatchScoreRequest = z.infer<typeof CalculateMatchScoreRequestSchema>;

// Response from match score calculation
export const MatchScoreResponseSchema = z.object({
  success: z.boolean().describe("Whether the calculation was successful"),
  data: MatchScoreSchema.optional().describe("The calculated match score"),
  error: z.string().optional().describe("Error message if calculation failed"),
  metadata: z.object({
    processingTimeMs: z.number().describe("Time taken to calculate"),
    method: z.enum(['calculation', 'llm', 'hybrid']).describe("Method used"),
    algorithmVersion: z.string().describe("Algorithm version used"),
    costUsd: z.number().optional().describe("Cost if LLM was used")
  }).optional().describe("Calculation metadata")
});

export type MatchScoreResponse = z.infer<typeof MatchScoreResponseSchema>;

// ==========================================
// LLM-Specific Schemas
// ==========================================

export const LLMMatchScoreRequestSchema = z.object({
  opportunity: z.record(z.any()).describe("Opportunity data"),
  profile: z.record(z.any()).describe("Profile data"),
  context: z.object({
    organizationId: z.string().cuid().describe("Organization context"),
    userId: z.string().cuid().optional().describe("User context"),
    preferences: z.record(z.any()).optional().describe("User preferences")
  }).describe("Additional context for scoring"),
  options: z.object({
    useReasoning: z.boolean().default(true).describe("Use reasoning models"),
    includeSemanticAnalysis: z.boolean().default(true).describe("Include semantic analysis"),
    includeStrategicInsights: z.boolean().default(true).describe("Include strategic insights"),
    maxTokens: z.number().default(8000).describe("Maximum tokens for LLM response"),
    temperature: z.number().min(0).max(2).default(0.3).describe("LLM temperature setting")
  }).describe("LLM options")
});

export type LLMMatchScoreRequest = z.infer<typeof LLMMatchScoreRequestSchema>;

// ==========================================
// Validation Helpers
// ==========================================

export const validateMatchScore = (data: unknown): MatchScore => {
  return MatchScoreSchema.parse(data);
};

export const validateCreateMatchScore = (data: unknown): CreateMatchScoreInput => {
  return CreateMatchScoreSchema.parse(data);
};

export const validateUpdateMatchScore = (data: unknown): UpdateMatchScoreInput => {
  return UpdateMatchScoreSchema.parse(data);
};

export const validateCalculateRequest = (data: unknown): CalculateMatchScoreRequest => {
  return CalculateMatchScoreRequestSchema.parse(data);
};

export const validateLLMRequest = (data: unknown): LLMMatchScoreRequest => {
  return LLMMatchScoreRequestSchema.parse(data);
};

// ==========================================
// Database Conversion Helpers
// ==========================================

// Convert Prisma Decimal fields to numbers for API responses
export const serializeMatchScore = (score: any): MatchScore => {
  return {
    ...score,
    overallScore: Number(score.overallScore),
    confidence: Number(score.confidence),
    pastPerformanceScore: Number(score.pastPerformanceScore),
    technicalCapabilityScore: Number(score.technicalCapabilityScore),
    strategicFitRelationshipsScore: Number(score.strategicFitRelationshipsScore),
    credibilityMarketPresenceScore: Number(score.credibilityMarketPresenceScore),
    winProbabilityEst: score.winProbabilityEst ? Number(score.winProbabilityEst) : undefined,
    costUsd: score.costUsd ? Number(score.costUsd) : undefined
  };
};

// Convert API input to Prisma format (numbers to Decimals)
export const deserializeMatchScore = (score: CreateMatchScoreInput) => {
  return {
    ...score,
    overallScore: score.overallScore,
    confidence: score.confidence,
    pastPerformanceScore: score.pastPerformanceScore,
    technicalCapabilityScore: score.technicalCapabilityScore,
    strategicFitRelationshipsScore: score.strategicFitRelationshipsScore,
    credibilityMarketPresenceScore: score.credibilityMarketPresenceScore,
    winProbabilityEst: score.winProbabilityEst,
    costUsd: score.costUsd
  };
};

// ==========================================
// Error Schemas
// ==========================================

export const MatchScoreErrorSchema = z.object({
  code: z.enum([
    'VALIDATION_ERROR',
    'PROFILE_NOT_FOUND',
    'OPPORTUNITY_NOT_FOUND',
    'INSUFFICIENT_DATA',
    'LLM_ERROR',
    'CALCULATION_ERROR',
    'RATE_LIMIT_ERROR',
    'PERMISSION_DENIED'
  ]).describe("Error code"),
  message: z.string().describe("Human-readable error message"),
  details: z.record(z.any()).optional().describe("Additional error details"),
  field: z.string().optional().describe("Field that caused the error")
});

export type MatchScoreError = z.infer<typeof MatchScoreErrorSchema>;