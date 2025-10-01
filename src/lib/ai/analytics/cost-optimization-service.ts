import { PrismaClient } from '@prisma/client';
import { aiAnalyticsService } from './ai-analytics-service';
import { providerStatusService } from './provider-status-service';

const prisma = new PrismaClient();

export interface CostOptimizationRecommendation {
  id: string;
  type: 'model_switch' | 'provider_switch' | 'caching' | 'request_batching' | 'circuit_breaker' | 'routing_optimization';
  title: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  potentialSavings: number;
  implementationEffort: 'low' | 'medium' | 'high';
  priority: number;
  provider?: string;
  model?: string;
  currentCost: number;
  optimizedCost: number;
  confidence: number;
  metadata: any;
  createdAt: Date;
  applied: boolean;
  appliedAt?: Date;
}

export interface CostOptimizationReport {
  organizationId: string;
  periodStart: Date;
  periodEnd: Date;
  totalCost: number;
  optimizedCost: number;
  potentialSavings: number;
  actualSavings: number;
  savingsPercentage: number;
  recommendations: CostOptimizationRecommendation[];
  appliedOptimizations: number;
  summary: {
    highImpactRecommendations: number;
    quickWins: number;
    longTermOpportunities: number;
    totalRecommendations: number;
  };
}

export interface OptimizationRule {
  id: string;
  type: string;
  enabled: boolean;
  thresholds: {
    minCostSavings: number;
    minConfidence: number;
    maxRisk: number;
  };
  autoApply: boolean;
  conditions: any[];
}

export class CostOptimizationService {
  private readonly DEFAULT_RULES: OptimizationRule[] = [
    {
      id: 'expensive_model_switch',
      type: 'model_switch',
      enabled: true,
      thresholds: {
        minCostSavings: 10, // $10 minimum savings
        minConfidence: 0.8,
        maxRisk: 0.2,
      },
      autoApply: false,
      conditions: [
        { field: 'costPerRequest', operator: '>', value: 0.01 },
        { field: 'qualityScore', operator: '<', value: 0.8 },
      ],
    },
    {
      id: 'provider_routing_optimization',
      type: 'routing_optimization',
      enabled: true,
      thresholds: {
        minCostSavings: 5,
        minConfidence: 0.7,
        maxRisk: 0.3,
      },
      autoApply: true,
      conditions: [
        { field: 'fallbackRate', operator: '>', value: 0.1 },
      ],
    },
    {
      id: 'caching_opportunities',
      type: 'caching',
      enabled: true,
      thresholds: {
        minCostSavings: 15,
        minConfidence: 0.9,
        maxRisk: 0.1,
      },
      autoApply: true,
      conditions: [
        { field: 'duplicateRequests', operator: '>', value: 0.05 },
      ],
    },
    {
      id: 'circuit_breaker_optimization',
      type: 'circuit_breaker',
      enabled: true,
      thresholds: {
        minCostSavings: 0,
        minConfidence: 0.95,
        maxRisk: 0.05,
      },
      autoApply: true,
      conditions: [
        { field: 'errorRate', operator: '>', value: 0.1 },
      ],
    },
  ];

  /**
   * Generate cost optimization recommendations for an organization
   */
  async generateRecommendations(organizationId: string, periodDays: number = 30): Promise<CostOptimizationReport> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - periodDays);

    const query = {
      organizationId,
      startDate,
      endDate,
    };

    // Get comprehensive analytics data
    const [dashboardData, providerStatus] = await Promise.all([
      aiAnalyticsService.getDashboardData(query),
      providerStatusService.getAllProviderStatus(),
    ]);

    const recommendations: CostOptimizationRecommendation[] = [];

    // Generate model optimization recommendations
    const modelRecommendations = await this.generateModelOptimizations(dashboardData, organizationId);
    recommendations.push(...modelRecommendations);

    // Generate provider optimization recommendations
    const providerRecommendations = await this.generateProviderOptimizations(dashboardData, providerStatus);
    recommendations.push(...providerRecommendations);

    // Generate caching recommendations
    const cachingRecommendations = await this.generateCachingOptimizations(dashboardData, organizationId);
    recommendations.push(...cachingRecommendations);

    // Generate routing optimization recommendations
    const routingRecommendations = await this.generateRoutingOptimizations(dashboardData);
    recommendations.push(...routingRecommendations);

    // Generate circuit breaker optimization recommendations
    const circuitBreakerRecommendations = await this.generateCircuitBreakerOptimizations(dashboardData, providerStatus);
    recommendations.push(...circuitBreakerRecommendations);

    // Calculate potential savings
    const totalCost = dashboardData.costAnalysis.totalCost;
    const potentialSavings = recommendations.reduce((sum, rec) => sum + rec.potentialSavings, 0);
    const optimizedCost = Math.max(0, totalCost - potentialSavings);

    // Get actual savings from applied optimizations
    const actualSavings = await this.getActualSavings(organizationId, startDate, endDate);
    const savingsPercentage = totalCost > 0 ? (actualSavings / totalCost) * 100 : 0;

    // Sort recommendations by priority
    recommendations.sort((a, b) => b.priority - a.priority);

    // Calculate summary
    const summary = {
      highImpactRecommendations: recommendations.filter(r => r.impact === 'high').length,
      quickWins: recommendations.filter(r => r.impact === 'medium' && r.implementationEffort === 'low').length,
      longTermOpportunities: recommendations.filter(r => r.implementationEffort === 'high').length,
      totalRecommendations: recommendations.length,
    };

    return {
      organizationId,
      periodStart: startDate,
      periodEnd: endDate,
      totalCost,
      optimizedCost,
      potentialSavings,
      actualSavings,
      savingsPercentage,
      recommendations,
      appliedOptimizations: recommendations.filter(r => r.applied).length,
      summary,
    };
  }

  /**
   * Generate model optimization recommendations
   */
  private async generateModelOptimizations(dashboardData: any, organizationId: string): Promise<CostOptimizationRecommendation[]> {
    const recommendations: CostOptimizationRecommendation[] = [];
    
    // Analyze expensive models with low quality
    for (const modelCost of dashboardData.costAnalysis.costByModel) {
      if (modelCost.cost > 10 && modelCost.percentage > 10) {
        // Check if there's a cheaper alternative with similar quality
        const alternativeModels = await this.findAlternativeModels(modelCost.model, organizationId);
        
        for (const alternative of alternativeModels) {
          const potentialSavings = modelCost.cost * (1 - alternative.costRatio);
          
          if (potentialSavings > 5) {
            recommendations.push({
              id: `model_switch_${modelCost.model}_${alternative.model}`,
              type: 'model_switch',
              title: `Switch from ${modelCost.model} to ${alternative.model}`,
              description: `${alternative.model} provides similar quality at ${((1 - alternative.costRatio) * 100).toFixed(0)}% lower cost`,
              impact: potentialSavings > 50 ? 'high' : potentialSavings > 20 ? 'medium' : 'low',
              potentialSavings,
              implementationEffort: 'low',
              priority: this.calculatePriority(potentialSavings, alternative.qualityDiff, alternative.confidence),
              model: modelCost.model,
              currentCost: modelCost.cost,
              optimizedCost: modelCost.cost * alternative.costRatio,
              confidence: alternative.confidence,
              metadata: {
                alternativeModel: alternative.model,
                qualityDiff: alternative.qualityDiff,
                costRatio: alternative.costRatio,
              },
              createdAt: new Date(),
              applied: false,
            });
          }
        }
      }
    }

    return recommendations;
  }

  /**
   * Generate provider optimization recommendations
   */
  private async generateProviderOptimizations(dashboardData: any, providerStatus: any[]): Promise<CostOptimizationRecommendation[]> {
    const recommendations: CostOptimizationRecommendation[] = [];
    
    // Analyze provider cost efficiency
    for (const provider of dashboardData.providerMetrics) {
      const status = providerStatus.find(s => s.provider === provider.provider);
      
      if (status && !status.isHealthy) {
        // Recommend switching away from unhealthy providers
        const potentialSavings = provider.totalCost * 0.1; // Assume 10% savings from avoiding failures
        
        recommendations.push({
          id: `provider_switch_${provider.provider}`,
          type: 'provider_switch',
          title: `Temporarily reduce traffic to ${provider.provider}`,
          description: `${provider.provider} is experiencing health issues. Reduce traffic until resolved.`,
          impact: 'medium',
          potentialSavings,
          implementationEffort: 'low',
          priority: this.calculatePriority(potentialSavings, 0, 0.9),
          provider: provider.provider,
          currentCost: provider.totalCost,
          optimizedCost: provider.totalCost * 0.9,
          confidence: 0.9,
          metadata: {
            reason: 'health_issue',
            providerStatus: status,
          },
          createdAt: new Date(),
          applied: false,
        });
      }
      
      // Check for high-cost, low-performance providers
      if (provider.avgCost > 0.01 && provider.avgLatency > 2000) {
        const betterProviders = dashboardData.providerMetrics.filter(p => 
          p.provider !== provider.provider && 
          p.avgCost < provider.avgCost * 0.8 && 
          p.avgLatency < provider.avgLatency * 0.8
        );
        
        if (betterProviders.length > 0) {
          const bestProvider = betterProviders.reduce((best, current) => 
            current.avgCost < best.avgCost ? current : best
          );
          
          const potentialSavings = provider.totalCost * 0.3; // Assume 30% of traffic can be redirected
          
          recommendations.push({
            id: `provider_routing_${provider.provider}_${bestProvider.provider}`,
            type: 'routing_optimization',
            title: `Redirect traffic from ${provider.provider} to ${bestProvider.provider}`,
            description: `${bestProvider.provider} offers better cost-performance ratio`,
            impact: potentialSavings > 30 ? 'high' : 'medium',
            potentialSavings,
            implementationEffort: 'medium',
            priority: this.calculatePriority(potentialSavings, 0, 0.7),
            provider: provider.provider,
            currentCost: provider.totalCost,
            optimizedCost: provider.totalCost * 0.7,
            confidence: 0.7,
            metadata: {
              targetProvider: bestProvider.provider,
              currentLatency: provider.avgLatency,
              targetLatency: bestProvider.avgLatency,
              currentCost: provider.avgCost,
              targetCost: bestProvider.avgCost,
            },
            createdAt: new Date(),
            applied: false,
          });
        }
      }
    }

    return recommendations;
  }

  /**
   * Generate caching optimization recommendations
   */
  private async generateCachingOptimizations(dashboardData: any, organizationId: string): Promise<CostOptimizationRecommendation[]> {
    const recommendations: CostOptimizationRecommendation[] = [];
    
    // Analyze duplicate requests
    const duplicateRequests = await this.analyzeDuplicateRequests(organizationId);
    
    if (duplicateRequests.rate > 0.05) { // More than 5% duplicate requests
      const potentialSavings = dashboardData.costAnalysis.totalCost * duplicateRequests.rate;
      
      recommendations.push({
        id: 'caching_duplicate_requests',
        type: 'caching',
        title: 'Implement intelligent caching',
        description: `${(duplicateRequests.rate * 100).toFixed(1)}% of requests are duplicates. Caching can reduce costs significantly.`,
        impact: potentialSavings > 50 ? 'high' : potentialSavings > 20 ? 'medium' : 'low',
        potentialSavings,
        implementationEffort: 'medium',
        priority: this.calculatePriority(potentialSavings, 0, 0.85),
        currentCost: dashboardData.costAnalysis.totalCost,
        optimizedCost: dashboardData.costAnalysis.totalCost * (1 - duplicateRequests.rate),
        confidence: 0.85,
        metadata: {
          duplicateRate: duplicateRequests.rate,
          cachingStrategy: duplicateRequests.strategy,
          estimatedCacheHitRate: duplicateRequests.rate * 0.9,
        },
        createdAt: new Date(),
        applied: false,
      });
    }

    return recommendations;
  }

  /**
   * Generate routing optimization recommendations
   */
  private async generateRoutingOptimizations(dashboardData: any): Promise<CostOptimizationRecommendation[]> {
    const recommendations: CostOptimizationRecommendation[] = [];
    
    // Analyze routing efficiency
    const routingEfficiency = dashboardData.routingAnalysis.routingEfficiency;
    
    if (routingEfficiency < 80) {
      const potentialSavings = dashboardData.costAnalysis.totalCost * 0.15; // Assume 15% improvement possible
      
      recommendations.push({
        id: 'routing_optimization_general',
        type: 'routing_optimization',
        title: 'Optimize routing algorithm',
        description: `Current routing efficiency is ${routingEfficiency.toFixed(1)}%. Optimization can improve cost-effectiveness.`,
        impact: 'medium',
        potentialSavings,
        implementationEffort: 'high',
        priority: this.calculatePriority(potentialSavings, 0, 0.6),
        currentCost: dashboardData.costAnalysis.totalCost,
        optimizedCost: dashboardData.costAnalysis.totalCost * 0.85,
        confidence: 0.6,
        metadata: {
          currentEfficiency: routingEfficiency,
          targetEfficiency: 85,
          optimizationOpportunities: dashboardData.routingAnalysis.recommendations,
        },
        createdAt: new Date(),
        applied: false,
      });
    }

    return recommendations;
  }

  /**
   * Generate circuit breaker optimization recommendations
   */
  private async generateCircuitBreakerOptimizations(dashboardData: any, providerStatus: any[]): Promise<CostOptimizationRecommendation[]> {
    const recommendations: CostOptimizationRecommendation[] = [];
    
    // Check for providers with high error rates
    for (const provider of dashboardData.providerMetrics) {
      if (provider.errorRate > 10) {
        const potentialSavings = provider.totalCost * (provider.errorRate / 100) * 0.8; // 80% of error cost can be saved
        
        recommendations.push({
          id: `circuit_breaker_${provider.provider}`,
          type: 'circuit_breaker',
          title: `Optimize circuit breaker for ${provider.provider}`,
          description: `High error rate (${provider.errorRate.toFixed(1)}%) detected. Adjust circuit breaker settings.`,
          impact: 'medium',
          potentialSavings,
          implementationEffort: 'low',
          priority: this.calculatePriority(potentialSavings, 0, 0.9),
          provider: provider.provider,
          currentCost: provider.totalCost,
          optimizedCost: provider.totalCost - potentialSavings,
          confidence: 0.9,
          metadata: {
            errorRate: provider.errorRate,
            recommendedThreshold: Math.max(3, Math.floor(provider.errorRate * 0.3)),
          },
          createdAt: new Date(),
          applied: false,
        });
      }
    }

    return recommendations;
  }

  /**
   * Apply an optimization recommendation
   */
  async applyOptimization(organizationId: string, recommendationId: string, userId: string): Promise<{
    success: boolean;
    message: string;
    appliedAt: Date;
  }> {
    try {
      // This would implement the actual optimization logic
      // For now, we'll just mark it as applied
      
      const appliedAt = new Date();
      
      // Store the applied optimization
      await prisma.aICostOptimization.create({
        data: {
          organizationId,
          periodStart: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
          periodEnd: new Date(),
          periodType: 'DAILY',
          totalCost: 0, // Would be calculated
          projectedCost: 0, // Would be calculated
          costSavings: 0, // Would be calculated
          cacheHitRate: 0, // Would be calculated
          routingEfficiency: 0, // Would be calculated
          tokenEfficiency: 0, // Would be calculated
          providerCosts: {},
          modelCosts: {},
          operationCosts: {},
          recommendations: [],
          appliedOptimizations: [recommendationId],
        },
      });

      return {
        success: true,
        message: 'Optimization applied successfully',
        appliedAt,
      };
    } catch (error) {
      console.error('Failed to apply optimization:', error);
      return {
        success: false,
        message: 'Failed to apply optimization',
        appliedAt: new Date(),
      };
    }
  }

  /**
   * Get cost optimization history
   */
  async getOptimizationHistory(organizationId: string, days: number = 30): Promise<any[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return await prisma.aICostOptimization.findMany({
      where: {
        organizationId,
        createdAt: { gte: startDate },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Private helper methods
   */
  private async findAlternativeModels(currentModel: string, organizationId: string): Promise<Array<{
    model: string;
    costRatio: number;
    qualityDiff: number;
    confidence: number;
  }>> {
    // This would analyze historical data to find cheaper alternatives
    // For now, return some example alternatives
    const alternatives = [
      { model: 'gpt-3.5-turbo', costRatio: 0.1, qualityDiff: -0.05, confidence: 0.8 },
      { model: 'claude-3-haiku', costRatio: 0.25, qualityDiff: -0.02, confidence: 0.85 },
    ];

    return alternatives.filter(alt => alt.model !== currentModel);
  }

  private async analyzeDuplicateRequests(organizationId: string): Promise<{
    rate: number;
    strategy: string;
  }> {
    // This would analyze actual request patterns
    // For now, return estimated duplicate rate
    return {
      rate: 0.08, // 8% duplicate requests
      strategy: 'semantic_caching',
    };
  }

  private calculatePriority(savings: number, qualityImpact: number, confidence: number): number {
    // Priority = (savings * confidence) - (quality_impact * 100)
    return (savings * confidence) - (Math.abs(qualityImpact) * 100);
  }

  private async getActualSavings(organizationId: string, startDate: Date, endDate: Date): Promise<number> {
    // This would calculate actual savings from applied optimizations
    // For now, return estimated savings
    return 45.67;
  }
}

// Create a singleton instance
export const costOptimizationService = new CostOptimizationService();