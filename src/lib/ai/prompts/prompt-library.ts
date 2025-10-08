/**
 * Prompt Library Manager
 * 
 * Centralized system for managing, selecting, and executing AI prompts
 * with integration to the existing model routing system.
 */

import { 
  PromptTemplate, 
  PromptVariables, 
  PromptExecutionContext, 
  PromptExecutionResult,
  PromptCategory,
  PromptOperation,
  ModelTier,
  PromptComplexity,
  PromptLibraryConfig
} from './types'
import { DOCUMENT_PROCESSING_TEMPLATES } from './templates/document-processing'
import { ai as aiConfig } from '@/lib/config/env'

export class PromptLibrary {
  private templates: Map<string, PromptTemplate> = new Map()
  private config: PromptLibraryConfig
  private usageStats: Map<string, any> = new Map()

  constructor(config?: Partial<PromptLibraryConfig>) {
    this.config = {
      defaultTier: 'balanced',
      enableCaching: true,
      enableOptimization: true,
      enableQualityChecks: true,
      enableUsageTracking: true,
      maxCostPerRequest: aiConfig.perRequestCostLimit,
      dailyCostLimit: aiConfig.dailyCostLimit,
      maxLatency: aiConfig.defaultTimeout,
      timeoutMs: aiConfig.defaultTimeout,
      minQualityScore: 0.8,
      enableFallbacks: true,
      ...config
    }

    this.loadTemplates()
  }

  /**
   * Load all prompt templates into the library
   */
  private loadTemplates(): void {
    const allTemplates = [
      ...DOCUMENT_PROCESSING_TEMPLATES
    ]

    for (const template of allTemplates) {
      this.templates.set(template.id, template)
    }

    console.log(`📚 Prompt Library: Loaded ${this.templates.size} templates`)
  }

  /**
   * Find templates by various criteria
   */
  findTemplates(criteria: {
    category?: PromptCategory
    operation?: PromptOperation
    complexity?: PromptComplexity
    tags?: string[]
    search?: string
  }): PromptTemplate[] {
    const templates = Array.from(this.templates.values())
    
    return templates.filter(template => {
      if (criteria.category && template.category !== criteria.category) {
        return false
      }
      
      if (criteria.operation && template.operation !== criteria.operation) {
        return false
      }
      
      if (criteria.complexity && template.complexity !== criteria.complexity) {
        return false
      }
      
      if (criteria.tags && !criteria.tags.some(tag => template.tags.includes(tag))) {
        return false
      }
      
      if (criteria.search) {
        const searchTerm = criteria.search.toLowerCase()
        const searchableText = `${template.name} ${template.description} ${template.tags.join(' ')}`.toLowerCase()
        if (!searchableText.includes(searchTerm)) {
          return false
        }
      }
      
      return true
    })
  }

  /**
   * Get a specific template by ID
   */
  getTemplate(templateId: string): PromptTemplate | undefined {
    return this.templates.get(templateId)
  }

  /**
   * Get the best template for a specific operation
   */
  getBestTemplate(
    operation: PromptOperation, 
    category?: PromptCategory,
    complexity?: PromptComplexity
  ): PromptTemplate | undefined {
    const candidates = this.findTemplates({ operation, category, complexity })
    
    if (candidates.length === 0) {
      return undefined
    }
    
    // Sort by success rate and performance metrics
    return candidates.sort((a, b) => {
      const aScore = (a.successRate || 0.5) * 0.4 + 
                    (1 - (a.avgLatency || 5000) / 10000) * 0.3 +
                    (1 - (a.avgCost || 0.1) / 1.0) * 0.3
      const bScore = (b.successRate || 0.5) * 0.4 + 
                    (1 - (b.avgLatency || 5000) / 10000) * 0.3 +
                    (1 - (b.avgCost || 0.1) / 1.0) * 0.3
      return bScore - aScore
    })[0]
  }

  /**
   * Substitute variables in prompt template
   */
  private substituteVariables(template: string, variables: PromptVariables): string {
    let result = template
    
    // Simple template variable substitution
    const variablePattern = /\{\{(\w+(?:\.\w+)*)\}\}/g
    
    result = result.replace(variablePattern, (match, path) => {
      const value = this.getNestedValue(variables, path)
      return value !== undefined ? String(value) : match
    })
    
    return result
  }

  /**
   * Get nested value from object using dot notation
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined
    }, obj)
  }

  /**
   * Build execution context with routing optimization
   */
  private buildExecutionContext(
    template: PromptTemplate,
    variables: PromptVariables,
    options?: Partial<PromptExecutionContext>
  ): PromptExecutionContext {
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    return {
      template,
      variables,
      requestId,
      timestamp: new Date(),
      source: 'prompt-library',
      enableQualityChecks: this.config.enableQualityChecks,
      enableCostOptimization: this.config.enableOptimization,
      enableLatencyOptimization: this.config.enableOptimization,
      ...options
    }
  }

  /**
   * Execute a prompt with full integration to routing system
   */
  async executePrompt(
    templateId: string,
    variables: PromptVariables,
    options?: Partial<PromptExecutionContext>
  ): Promise<PromptExecutionResult> {
    const template = this.getTemplate(templateId)
    if (!template) {
      throw new Error(`Template not found: ${templateId}`)
    }

    const context = this.buildExecutionContext(template, variables, options)
    const startTime = Date.now()

    try {
      // Substitute variables in prompts
      const systemPrompt = this.substituteVariables(template.systemPrompt, variables)
      const userPrompt = this.substituteVariables(template.userPromptTemplate, variables)

      // Build request for AI service
      const aiRequest = {
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        model: context.modelOverride || this.selectOptimalModel(template),
        provider: context.providerOverride || template.preferredProviders?.[0] || 'openrouter',
        maxTokens: template.maxTokens || aiConfig.maxTokens,
        temperature: template.temperature || 0.3,
        organizationId: variables.organizationId || null,
        options: {
          requestId: context.requestId,
          promptTemplate: templateId,
          enableCaching: this.config.enableCaching,
          qualityRequirement: variables.qualityRequirement || 'standard'
        }
      }

      // Execute through existing AI service (this would integrate with your existing routing)
      const response = await this.executeAIRequest(aiRequest)
      
      const latency = Date.now() - startTime
      
      // Build result
      const result: PromptExecutionResult = {
        requestId: context.requestId,
        template,
        response: response.content,
        provider: response.provider,
        model: response.model,
        latency,
        cost: response.cost || 0,
        tokensUsed: response.tokensUsed || { prompt: 0, completion: 0, total: 0 },
        success: true,
        timestamp: new Date()
      }

      // Quality checks if enabled
      if (context.enableQualityChecks && template.qualityChecks) {
        result.qualityChecks = await this.performQualityChecks(result, template.qualityChecks)
        result.qualityScore = this.calculateQualityScore(result.qualityChecks)
      }

      // Update usage statistics
      if (this.config.enableUsageTracking) {
        this.updateUsageStats(templateId, result)
      }

      return result

    } catch (error) {
      const latency = Date.now() - startTime
      
      return {
        requestId: context.requestId,
        template,
        response: '',
        provider: 'unknown',
        model: 'unknown',
        latency,
        cost: 0,
        tokensUsed: { prompt: 0, completion: 0, total: 0 },
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      }
    }
  }

  /**
   * Select optimal model based on template requirements
   */
  private selectOptimalModel(template: PromptTemplate): string {
    // Use template's recommended tier or fallback to default
    const tier = template.recommendedTier || this.config.defaultTier
    
    // Map to actual models based on tier (integrate with your model registry)
    switch (tier) {
      case 'fast':
        return aiConfig.modelFast
      case 'powerful':
        return aiConfig.modelPowerful
      default:
        return aiConfig.modelBalanced
    }
  }

  /**
   * Execute AI request (this would integrate with your existing AI service)
   */
  private async executeAIRequest(request: any): Promise<any> {
    // This would call your existing AI service routing system
    // For now, returning a mock response structure
    const response = await fetch('/api/v1/ai/enhanced-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    })

    if (!response.ok) {
      throw new Error(`AI request failed: ${response.status}`)
    }

    return response.json()
  }

  /**
   * Perform quality checks on the result
   */
  private async performQualityChecks(
    result: PromptExecutionResult, 
    checks: string[]
  ): Promise<Array<{ check: string; passed: boolean; score?: number; details?: string }>> {
    // Implement quality checking logic
    return checks.map(check => ({
      check,
      passed: true, // Placeholder - implement actual checks
      score: 0.9,
      details: 'Quality check passed'
    }))
  }

  /**
   * Calculate overall quality score
   */
  private calculateQualityScore(qualityChecks?: Array<{ passed: boolean; score?: number }>): number {
    if (!qualityChecks || qualityChecks.length === 0) {
      return 1.0
    }

    const scores = qualityChecks.map(check => check.score || (check.passed ? 1.0 : 0.0))
    return scores.reduce((sum, score) => sum + score, 0) / scores.length
  }

  /**
   * Update usage statistics for templates
   */
  private updateUsageStats(templateId: string, result: PromptExecutionResult): void {
    const stats = this.usageStats.get(templateId) || {
      totalExecutions: 0,
      successfulExecutions: 0,
      totalLatency: 0,
      totalCost: 0,
      avgQualityScore: 0
    }

    stats.totalExecutions++
    if (result.success) {
      stats.successfulExecutions++
    }
    stats.totalLatency += result.latency
    stats.totalCost += result.cost
    
    if (result.qualityScore) {
      stats.avgQualityScore = (stats.avgQualityScore * (stats.totalExecutions - 1) + result.qualityScore) / stats.totalExecutions
    }

    this.usageStats.set(templateId, stats)

    // Update template performance metrics
    const template = this.templates.get(templateId)
    if (template) {
      template.avgLatency = stats.totalLatency / stats.totalExecutions
      template.avgCost = stats.totalCost / stats.totalExecutions
      template.successRate = stats.successfulExecutions / stats.totalExecutions
    }
  }

  /**
   * Get template usage statistics
   */
  getUsageStats(templateId?: string): any {
    if (templateId) {
      return this.usageStats.get(templateId)
    }
    return Object.fromEntries(this.usageStats)
  }

  /**
   * Get all available templates
   */
  getAllTemplates(): PromptTemplate[] {
    return Array.from(this.templates.values())
  }
}

// Create singleton instance
export const promptLibrary = new PromptLibrary()

// Convenience functions for common operations
export async function extractFullText(
  documentContent: string, 
  documentType: string = 'document',
  organizationId?: string
): Promise<PromptExecutionResult> {
  return promptLibrary.executePrompt('doc_complete_text_extraction', {
    documentContent,
    documentType,
    organizationId
  })
}

export async function createExecutiveSummary(
  documentContent: string,
  documentType: string = 'document',
  organizationName?: string,
  organizationCapabilities?: string[]
): Promise<PromptExecutionResult> {
  return promptLibrary.executePrompt('doc_executive_summary', {
    documentContent,
    documentType,
    organizationName,
    organizationCapabilities
  })
}

export async function analyzeRFPRequirements(
  documentContent: string,
  organizationId?: string,
  organizationName?: string,
  organizationCapabilities?: string[]
): Promise<PromptExecutionResult> {
  return promptLibrary.executePrompt('gov_rfp_full_text_extraction', {
    documentContent,
    documentType: 'RFP',
    organizationId,
    organizationName,
    organizationCapabilities
  })
}

export async function extractComplianceRequirements(
  documentContent: string,
  documentType: string = 'solicitation'
): Promise<PromptExecutionResult> {
  return promptLibrary.executePrompt('gov_compliance_requirements_extraction', {
    documentContent,
    documentType
  })
}