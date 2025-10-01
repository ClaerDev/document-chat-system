/**
 * Prompt Library Types and Interfaces
 *
 * Comprehensive type system for managing AI prompts across the Document Chat System platform
 */

export type PromptCategory = 
  | 'document_processing'
  | 'government_contracting'
  | 'opportunity_analysis'
  | 'compliance_check'
  | 'proposal_writing'
  | 'market_research'
  | 'content_generation'
  | 'data_extraction'
  | 'summarization'
  | 'analysis'
  | 'quality_assurance'

export type PromptOperation = 
  | 'full_text_extraction'
  | 'structured_extraction'
  | 'executive_summary'
  | 'detailed_summary'
  | 'key_points_extraction'
  | 'compliance_analysis'
  | 'opportunity_matching'
  | 'proposal_review'
  | 'rfp_analysis'
  | 'capability_assessment'
  | 'competitive_analysis'
  | 'past_performance_analysis'
  | 'requirements_analysis'
  | 'risk_assessment'

export type PromptComplexity = 'simple' | 'moderate' | 'complex' | 'expert'

export type ModelTier = 'fast' | 'balanced' | 'powerful'

export interface PromptTemplate {
  id: string
  name: string
  description: string
  category: PromptCategory
  operation: PromptOperation
  complexity: PromptComplexity
  version: string
  
  // Core prompt content
  systemPrompt: string
  userPromptTemplate: string
  
  // Routing preferences
  recommendedTier: ModelTier
  preferredProviders?: string[]
  maxTokens?: number
  temperature?: number
  
  // Validation and quality
  expectedOutputFormat?: 'text' | 'json' | 'markdown' | 'structured'
  qualityChecks?: string[]
  
  // Context requirements
  requiresDocumentContext?: boolean
  requiresOrganizationContext?: boolean
  requiresUserContext?: boolean
  
  // Performance metadata
  avgLatency?: number
  avgCost?: number
  successRate?: number
  
  // Government contracting specific
  securityLevel?: 'public' | 'cui' | 'classified'
  complianceRequirements?: string[]
  
  created: Date
  updated: Date
  createdBy: string
  tags: string[]
}

export interface PromptVariables {
  // Document variables
  documentType?: string
  documentContent?: string
  
  // Organization variables
  organizationId?: string
  organizationName?: string
  organizationCapabilities?: string[]
  organizationCertifications?: string[]
  
  // User variables
  userId?: string
  userRole?: string
  userPreferences?: Record<string, any>
  
  // Task variables
  taskType?: string
  urgencyLevel?: 'low' | 'medium' | 'high' | 'critical'
  qualityRequirement?: 'standard' | 'high' | 'premium'
  
  // Government contracting variables
  agencyName?: string
  solicitationNumber?: string
  naicsCode?: string
  contractValue?: number
  contractType?: string
  performancePeriod?: string
  
  // Custom variables
  customVariables?: Record<string, any>
}

export interface PromptExecutionContext {
  template: PromptTemplate
  variables: PromptVariables
  
  // Execution preferences
  modelOverride?: string
  providerOverride?: string
  tierOverride?: ModelTier
  
  // Tracking
  requestId: string
  timestamp: Date
  source: string
  
  // Quality controls
  enableQualityChecks?: boolean
  enableCostOptimization?: boolean
  enableLatencyOptimization?: boolean
}

export interface PromptExecutionResult {
  requestId: string
  template: PromptTemplate
  
  // AI response
  response: string
  provider: string
  model: string
  
  // Performance metrics
  latency: number
  cost: number
  tokensUsed: {
    prompt: number
    completion: number
    total: number
  }
  
  // Quality metrics
  qualityScore?: number
  qualityChecks?: Array<{
    check: string
    passed: boolean
    score?: number
    details?: string
  }>
  
  // Error handling
  success: boolean
  error?: string
  warnings?: string[]
  
  timestamp: Date
}

export interface PromptLibraryConfig {
  defaultTier: ModelTier
  enableCaching: boolean
  enableOptimization: boolean
  enableQualityChecks: boolean
  enableUsageTracking: boolean
  
  // Cost controls
  maxCostPerRequest: number
  dailyCostLimit: number
  
  // Performance controls
  maxLatency: number
  timeoutMs: number
  
  // Quality controls
  minQualityScore: number
  enableFallbacks: boolean
}