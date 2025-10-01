/**
 * Cost Optimization Service for AI Operations
 * Tracks, analyzes, and optimizes costs for embedding generation and vector operations
 */

import { prisma } from '@/lib/prisma'

interface CostMetrics {
  tokens: number
  estimatedCost: number
  timestamp: Date
  operation: 'embedding' | 'search' | 'chunking'
  model: string
  organizationId: string
}

interface CostSummary {
  totalCost: number
  tokenCount: number
  operationCount: number
  averageCostPerOperation: number
  costByModel: Record<string, number>
  costByOperation: Record<string, number>
  period: {
    start: Date
    end: Date
  }
}

interface OptimizationRecommendation {
  type: 'model_switch' | 'batch_optimization' | 'deduplication' | 'caching'
  priority: 'high' | 'medium' | 'low'
  description: string
  potentialSavings: number
  implementation: string
}

export class CostOptimizationService {
  // OpenAI pricing (as of current rates - should be configurable)
  private static readonly PRICING = {
    'text-embedding-3-small': 0.00002 / 1000, // $0.00002 per 1K tokens
    'text-embedding-3-large': 0.00013 / 1000, // $0.00013 per 1K tokens
    'text-embedding-ada-002': 0.0001 / 1000,  // $0.0001 per 1K tokens
  }

  private static readonly OPTIMIZATION_THRESHOLDS = {
    HIGH_COST_ALERT: 100, // Alert if daily cost exceeds $100
    BATCH_SIZE_RECOMMENDATION: 50, // Recommend batching if processing >50 individual requests
    DEDUPLICATION_THRESHOLD: 0.95, // Deduplicate if similarity >95%
    CACHE_HIT_TARGET: 80, // Target 80%+ cache hit rate
  }

  /**
   * Calculate cost for embedding operations
   */
  static calculateEmbeddingCost(tokens: number, model: string = 'text-embedding-3-small'): number {
    const pricePerToken = this.PRICING[model as keyof typeof this.PRICING] || this.PRICING['text-embedding-3-small']
    return tokens * pricePerToken
  }

  /**
   * Track cost metrics for an operation
   */
  static async trackCost(metrics: CostMetrics): Promise<void> {
    try {
      // Store in database for analysis (assuming we have a cost_metrics table)
      // This would require a database migration to add the table
      await prisma.$executeRaw`
        INSERT INTO cost_metrics (tokens, estimated_cost, timestamp, operation, model, organization_id)
        VALUES (${metrics.tokens}, ${metrics.estimatedCost}, ${metrics.timestamp}, ${metrics.operation}, ${metrics.model}, ${metrics.organizationId})
        ON CONFLICT DO NOTHING
      `
    } catch (error) {
      // Fallback to logging if database tracking fails
      console.log('📊 Cost Tracking:', {
        tokens: metrics.tokens,
        cost: `$${metrics.estimatedCost.toFixed(6)}`,
        operation: metrics.operation,
        model: metrics.model,
        org: metrics.organizationId
      })
    }
  }

  /**
   * Get cost summary for a time period
   */
  static async getCostSummary(
    organizationId: string,
    startDate: Date,
    endDate: Date
  ): Promise<CostSummary> {
    try {
      const rawMetrics = await prisma.$queryRaw<any[]>`
        SELECT 
          SUM(estimated_cost) as total_cost,
          SUM(tokens) as token_count,
          COUNT(*) as operation_count,
          operation,
          model
        FROM cost_metrics 
        WHERE organization_id = ${organizationId}
          AND timestamp BETWEEN ${startDate} AND ${endDate}
        GROUP BY operation, model
      `

      const totalCost = rawMetrics.reduce((sum, row) => sum + parseFloat(row.total_cost || 0), 0)
      const totalTokens = rawMetrics.reduce((sum, row) => sum + parseInt(row.token_count || 0), 0)
      const totalOperations = rawMetrics.reduce((sum, row) => sum + parseInt(row.operation_count || 0), 0)

      const costByModel: Record<string, number> = {}
      const costByOperation: Record<string, number> = {}

      rawMetrics.forEach(row => {
        const cost = parseFloat(row.total_cost || 0)
        costByModel[row.model] = (costByModel[row.model] || 0) + cost
        costByOperation[row.operation] = (costByOperation[row.operation] || 0) + cost
      })

      return {
        totalCost,
        tokenCount: totalTokens,
        operationCount: totalOperations,
        averageCostPerOperation: totalOperations > 0 ? totalCost / totalOperations : 0,
        costByModel,
        costByOperation,
        period: { start: startDate, end: endDate }
      }
    } catch (error) {
      console.warn('Cost summary unavailable:', error)
      return {
        totalCost: 0,
        tokenCount: 0,
        operationCount: 0,
        averageCostPerOperation: 0,
        costByModel: {},
        costByOperation: {},
        period: { start: startDate, end: endDate }
      }
    }
  }

  /**
   * Generate cost optimization recommendations
   */
  static async generateRecommendations(
    organizationId: string,
    costSummary: CostSummary
  ): Promise<OptimizationRecommendation[]> {
    const recommendations: OptimizationRecommendation[] = []

    // 1. Model switching recommendations
    if (costSummary.costByModel['text-embedding-3-large']) {
      const largeCost = costSummary.costByModel['text-embedding-3-large']
      const smallCost = costSummary.costByModel['text-embedding-3-small'] || 0
      
      if (largeCost > smallCost * 2) {
        const potentialSavings = largeCost * 0.85 // ~85% savings switching to small
        recommendations.push({
          type: 'model_switch',
          priority: 'high',
          description: 'Consider switching from text-embedding-3-large to text-embedding-3-small for most use cases',
          potentialSavings,
          implementation: 'Update EmbeddingService default model configuration. Test accuracy impact first.'
        })
      }
    }

    // 2. Batch optimization
    const individualOperations = await this.getIndividualOperationCount(organizationId)
    if (individualOperations > this.OPTIMIZATION_THRESHOLDS.BATCH_SIZE_RECOMMENDATION) {
      recommendations.push({
        type: 'batch_optimization',
        priority: 'medium',
        description: `${individualOperations} individual embedding requests detected. Batch processing can reduce costs by 40-60%.`,
        potentialSavings: costSummary.totalCost * 0.5,
        implementation: 'Implement queue-based batching for non-urgent embedding requests. Use EmbeddingService.generateEmbeddings() for batches.'
      })
    }

    // 3. Deduplication opportunities
    const duplicateRate = await this.estimateDuplicationRate(organizationId)
    if (duplicateRate > 0.1) { // >10% duplication
      recommendations.push({
        type: 'deduplication',
        priority: 'medium',
        description: `~${(duplicateRate * 100).toFixed(1)}% of embeddings may be duplicates`,
        potentialSavings: costSummary.totalCost * duplicateRate,
        implementation: 'Implement content hashing before embedding generation. Cache embeddings by content hash.'
      })
    }

    // 4. Caching improvements
    const cacheHitRate = await this.getCacheHitRate(organizationId)
    if (cacheHitRate < this.OPTIMIZATION_THRESHOLDS.CACHE_HIT_TARGET) {
      recommendations.push({
        type: 'caching',
        priority: 'high',
        description: `Cache hit rate is ${cacheHitRate.toFixed(1)}%. Target is ${this.OPTIMIZATION_THRESHOLDS.CACHE_HIT_TARGET}%+`,
        potentialSavings: costSummary.totalCost * (this.OPTIMIZATION_THRESHOLDS.CACHE_HIT_TARGET - cacheHitRate) / 100,
        implementation: 'Improve caching strategy: longer TTL for embeddings, better cache key design, precompute common queries.'
      })
    }

    return recommendations.sort((a, b) => b.potentialSavings - a.potentialSavings)
  }

  /**
   * Create cost alert if thresholds exceeded
   */
  static async checkCostAlerts(organizationId: string): Promise<void> {
    const today = new Date()
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
    
    const dailySummary = await this.getCostSummary(organizationId, yesterday, today)
    
    if (dailySummary.totalCost > this.OPTIMIZATION_THRESHOLDS.HIGH_COST_ALERT) {
      console.warn(`🚨 High Cost Alert: Organization ${organizationId} spent $${dailySummary.totalCost.toFixed(2)} on AI operations in the last 24 hours`)
      
      // Here you could send notifications, create tickets, etc.
      // await sendCostAlert(organizationId, dailySummary)
    }
  }

  /**
   * Optimize embedding batch for cost efficiency
   */
  static optimizeEmbeddingBatch(texts: string[], options?: {
    maxBatchSize?: number
    deduplication?: boolean
    model?: string
  }): {
    batches: string[][]
    estimatedCost: number
    tokensEstimated: number
    optimizations: string[]
  } {
    const { maxBatchSize = 100, deduplication = true, model = 'text-embedding-3-small' } = options || {}
    const optimizations: string[] = []
    let processedTexts = [...texts]

    // 1. Deduplication
    if (deduplication) {
      const uniqueTexts = Array.from(new Set(processedTexts))
      if (uniqueTexts.length < processedTexts.length) {
        optimizations.push(`Removed ${processedTexts.length - uniqueTexts.length} duplicate texts`)
        processedTexts = uniqueTexts
      }
    }

    // 2. Optimal batching
    const batches: string[][] = []
    for (let i = 0; i < processedTexts.length; i += maxBatchSize) {
      batches.push(processedTexts.slice(i, i + maxBatchSize))
    }

    if (batches.length > 1) {
      optimizations.push(`Organized into ${batches.length} optimal batches`)
    }

    // 3. Cost estimation
    const tokensEstimated = processedTexts.reduce((sum, text) => {
      return sum + Math.ceil(text.length / 4) // Rough token estimation
    }, 0)

    const estimatedCost = this.calculateEmbeddingCost(tokensEstimated, model)

    return {
      batches,
      estimatedCost,
      tokensEstimated,
      optimizations
    }
  }

  // Helper methods
  private static async getIndividualOperationCount(organizationId: string): Promise<number> {
    try {
      const result = await prisma.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(*) as count 
        FROM cost_metrics 
        WHERE organization_id = ${organizationId}
        AND timestamp > NOW() - INTERVAL '7 days'
        AND operation = 'embedding'
      `
      return Number(result[0]?.count || 0)
    } catch {
      return 0
    }
  }

  private static async estimateDuplicationRate(organizationId: string): Promise<number> {
    // This would require more sophisticated analysis of actual document content
    // For now, return a conservative estimate
    return 0.05 // 5% duplication rate estimate
  }

  private static async getCacheHitRate(organizationId: string): Promise<number> {
    // This would require cache hit/miss tracking
    // For now, return a baseline rate
    return 65 // 65% cache hit rate estimate
  }
}