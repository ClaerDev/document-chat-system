import { PrismaClient } from '@prisma/client';
import { cache } from 'react';

const prisma = new PrismaClient();

export interface ProviderHealthCheck {
  provider: string;
  isHealthy: boolean;
  latency: number;
  timestamp: Date;
  error?: string;
}

export interface CircuitBreakerConfig {
  failureThreshold: number;
  timeout: number;
  resetTimeout: number;
}

export interface ProviderStatusUpdate {
  provider: string;
  isHealthy: boolean;
  avgLatency?: number;
  p95Latency?: number;
  successRate?: number;
  errorRate?: number;
  requestCount?: number;
  totalCost?: number;
  totalTokens?: number;
  consecutiveFailures?: number;
}

export class ProviderStatusService {
  private static readonly DEFAULT_CIRCUIT_CONFIG: CircuitBreakerConfig = {
    failureThreshold: 5,
    timeout: 60000, // 1 minute
    resetTimeout: 300000, // 5 minutes
  };

  /**
   * Update provider status with health check results
   */
  async updateProviderStatus(update: ProviderStatusUpdate): Promise<void> {
    try {
      const now = new Date();
      
      await prisma.aIProviderStatus.upsert({
        where: { provider: update.provider },
        update: {
          isHealthy: update.isHealthy,
          lastHealthCheck: now,
          avgLatency: update.avgLatency,
          p95Latency: update.p95Latency,
          successRate: update.successRate,
          errorRate: update.errorRate,
          requestCount: update.requestCount,
          totalCost: update.totalCost,
          totalTokens: update.totalTokens,
          consecutiveFailures: update.consecutiveFailures || 0,
          updatedAt: now,
        },
        create: {
          provider: update.provider,
          isHealthy: update.isHealthy,
          lastHealthCheck: now,
          avgLatency: update.avgLatency,
          p95Latency: update.p95Latency,
          successRate: update.successRate,
          errorRate: update.errorRate,
          requestCount: update.requestCount || 0,
          totalCost: update.totalCost || 0,
          totalTokens: update.totalTokens || 0,
          consecutiveFailures: update.consecutiveFailures || 0,
          updatedAt: now,
        },
      });
    } catch (error) {
      console.error('Failed to update provider status:', error);
    }
  }

  /**
   * Get current status of all providers
   */
  async getAllProviderStatus(): Promise<any[]> {
    try {
      return await prisma.aIProviderStatus.findMany({
        orderBy: [
          { priority: 'desc' },
          { provider: 'asc' },
        ],
      });
    } catch (error) {
      console.error('Failed to get provider status:', error);
      return [];
    }
  }

  /**
   * Get status of a specific provider
   */
  async getProviderStatus(provider: string): Promise<any | null> {
    try {
      return await prisma.aIProviderStatus.findUnique({
        where: { provider },
      });
    } catch (error) {
      console.error(`Failed to get status for provider ${provider}:`, error);
      return null;
    }
  }

  /**
   * Get healthy providers ordered by priority
   */
  async getHealthyProviders(): Promise<any[]> {
    try {
      return await prisma.aIProviderStatus.findMany({
        where: {
          isHealthy: true,
          isEnabled: true,
          circuitState: 'CLOSED',
        },
        orderBy: [
          { priority: 'desc' },
          { avgLatency: 'asc' },
        ],
      });
    } catch (error) {
      console.error('Failed to get healthy providers:', error);
      return [];
    }
  }

  /**
   * Record a failure for a provider
   */
  async recordProviderFailure(provider: string, error: string): Promise<void> {
    try {
      const status = await this.getProviderStatus(provider);
      const consecutiveFailures = (status?.consecutiveFailures || 0) + 1;

      await this.updateProviderStatus({
        provider,
        isHealthy: false,
        consecutiveFailures,
      });

      // Check if circuit breaker should be triggered
      if (consecutiveFailures >= ProviderStatusService.DEFAULT_CIRCUIT_CONFIG.failureThreshold) {
        await this.openCircuitBreaker(provider);
      }
    } catch (error) {
      console.error(`Failed to record failure for provider ${provider}:`, error);
    }
  }

  /**
   * Record a success for a provider
   */
  async recordProviderSuccess(provider: string, latency: number): Promise<void> {
    try {
      await this.updateProviderStatus({
        provider,
        isHealthy: true,
        avgLatency: latency,
        consecutiveFailures: 0,
      });

      // If circuit was open, close it
      const status = await this.getProviderStatus(provider);
      if (status?.circuitState === 'OPEN' || status?.circuitState === 'HALF_OPEN') {
        await this.closeCircuitBreaker(provider);
      }
    } catch (error) {
      console.error(`Failed to record success for provider ${provider}:`, error);
    }
  }

  /**
   * Open circuit breaker for a provider
   */
  async openCircuitBreaker(provider: string): Promise<void> {
    try {
      const now = new Date();
      const nextRetryAt = new Date(now.getTime() + ProviderStatusService.DEFAULT_CIRCUIT_CONFIG.resetTimeout);

      await prisma.aIProviderStatus.update({
        where: { provider },
        data: {
          circuitState: 'OPEN',
          circuitOpenedAt: now,
          nextRetryAt,
          isHealthy: false,
        },
      });

      console.log(`Circuit breaker opened for provider ${provider}`);
    } catch (error) {
      console.error(`Failed to open circuit breaker for provider ${provider}:`, error);
    }
  }

  /**
   * Close circuit breaker for a provider
   */
  async closeCircuitBreaker(provider: string): Promise<void> {
    try {
      await prisma.aIProviderStatus.update({
        where: { provider },
        data: {
          circuitState: 'CLOSED',
          circuitOpenedAt: null,
          nextRetryAt: null,
          isHealthy: true,
          consecutiveFailures: 0,
        },
      });

      console.log(`Circuit breaker closed for provider ${provider}`);
    } catch (error) {
      console.error(`Failed to close circuit breaker for provider ${provider}:`, error);
    }
  }

  /**
   * Check if circuit breaker should be moved to half-open state
   */
  async checkCircuitBreakerRetry(provider: string): Promise<boolean> {
    try {
      const status = await this.getProviderStatus(provider);
      
      if (!status || status.circuitState !== 'OPEN') {
        return false;
      }

      const now = new Date();
      if (status.nextRetryAt && now >= status.nextRetryAt) {
        await prisma.aIProviderStatus.update({
          where: { provider },
          data: {
            circuitState: 'HALF_OPEN',
          },
        });
        return true;
      }

      return false;
    } catch (error) {
      console.error(`Failed to check circuit breaker retry for provider ${provider}:`, error);
      return false;
    }
  }

  /**
   * Perform health check for a provider
   */
  async performHealthCheck(provider: string): Promise<ProviderHealthCheck> {
    const startTime = Date.now();
    
    try {
      // This would be replaced with actual health check logic for each provider
      const isHealthy = await this.checkProviderHealth(provider);
      const latency = Date.now() - startTime;

      const result: ProviderHealthCheck = {
        provider,
        isHealthy,
        latency,
        timestamp: new Date(),
      };

      if (isHealthy) {
        await this.recordProviderSuccess(provider, latency);
      } else {
        await this.recordProviderFailure(provider, 'Health check failed');
        result.error = 'Health check failed';
      }

      return result;
    } catch (error) {
      const latency = Date.now() - startTime;
      await this.recordProviderFailure(provider, error instanceof Error ? error.message : 'Unknown error');
      
      return {
        provider,
        isHealthy: false,
        latency,
        timestamp: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Perform health checks for all providers
   */
  async performAllHealthChecks(): Promise<ProviderHealthCheck[]> {
    const providers = await prisma.aIProviderStatus.findMany({
      where: { isEnabled: true },
      select: { provider: true },
    });

    const healthChecks = await Promise.all(
      providers.map(({ provider }) => this.performHealthCheck(provider))
    );

    return healthChecks;
  }

  /**
   * Update provider performance metrics from analytics
   */
  async updateProviderMetrics(provider: string, organizationId?: string): Promise<void> {
    try {
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      // Get 24-hour metrics
      const metrics = await prisma.aIMetric.aggregate({
        where: {
          provider,
          createdAt: { gte: oneDayAgo },
          ...(organizationId && { organizationId }),
        },
        _count: { id: true },
        _avg: { latency: true },
        _sum: { cost: true, totalTokens: true },
      });

      // Calculate success rate
      const successfulRequests = await prisma.aIMetric.count({
        where: {
          provider,
          createdAt: { gte: oneDayAgo },
          success: true,
          ...(organizationId && { organizationId }),
        },
      });

      const totalRequests = metrics._count.id;
      const successRate = totalRequests > 0 ? (successfulRequests / totalRequests) * 100 : 0;
      const errorRate = 100 - successRate;

      // Calculate P95 latency
      const latencyData = await prisma.aIMetric.findMany({
        where: {
          provider,
          createdAt: { gte: oneDayAgo },
          ...(organizationId && { organizationId }),
        },
        select: { latency: true },
        orderBy: { latency: 'asc' },
      });

      const p95Index = Math.floor(latencyData.length * 0.95);
      const p95Latency = latencyData[p95Index]?.latency || 0;

      await this.updateProviderStatus({
        provider,
        isHealthy: successRate > 90, // Consider healthy if >90% success rate
        avgLatency: metrics._avg.latency || 0,
        p95Latency,
        successRate,
        errorRate,
        requestCount: totalRequests,
        totalCost: metrics._sum.cost || 0,
        totalTokens: metrics._sum.totalTokens || 0,
      });
    } catch (error) {
      console.error(`Failed to update metrics for provider ${provider}:`, error);
    }
  }

  /**
   * Get provider recommendations based on current status
   */
  async getProviderRecommendations(): Promise<Array<{
    type: string;
    provider: string;
    description: string;
    severity: 'low' | 'medium' | 'high';
    action: string;
  }>> {
    const recommendations = [];
    const providers = await this.getAllProviderStatus();

    for (const provider of providers) {
      // Check for unhealthy providers
      if (!provider.isHealthy) {
        recommendations.push({
          type: 'health',
          provider: provider.provider,
          description: `Provider ${provider.provider} is unhealthy`,
          severity: 'high' as const,
          action: 'investigate_and_fix',
        });
      }

      // Check for high latency
      if (provider.avgLatency > 5000) {
        recommendations.push({
          type: 'latency',
          provider: provider.provider,
          description: `High latency detected for ${provider.provider} (${provider.avgLatency}ms)`,
          severity: 'medium' as const,
          action: 'monitor_and_optimize',
        });
      }

      // Check for low success rate
      if (provider.successRate < 95) {
        recommendations.push({
          type: 'success_rate',
          provider: provider.provider,
          description: `Low success rate for ${provider.provider} (${provider.successRate}%)`,
          severity: 'medium' as const,
          action: 'investigate_errors',
        });
      }

      // Check for circuit breaker open
      if (provider.circuitState === 'OPEN') {
        recommendations.push({
          type: 'circuit_breaker',
          provider: provider.provider,
          description: `Circuit breaker is open for ${provider.provider}`,
          severity: 'high' as const,
          action: 'wait_for_retry_or_fix',
        });
      }
    }

    return recommendations;
  }

  /**
   * Initialize provider status for a new provider
   */
  async initializeProvider(provider: string, config: {
    priority?: number;
    costMultiplier?: number;
    isEnabled?: boolean;
  } = {}): Promise<void> {
    try {
      await prisma.aIProviderStatus.upsert({
        where: { provider },
        update: {
          priority: config.priority || 0,
          costMultiplier: config.costMultiplier || 1.0,
          isEnabled: config.isEnabled !== false,
        },
        create: {
          provider,
          priority: config.priority || 0,
          costMultiplier: config.costMultiplier || 1.0,
          isEnabled: config.isEnabled !== false,
          isHealthy: true,
          lastHealthCheck: new Date(),
          circuitState: 'CLOSED',
        },
      });
    } catch (error) {
      console.error(`Failed to initialize provider ${provider}:`, error);
    }
  }

  /**
   * Private helper methods
   */
  private async checkProviderHealth(provider: string): Promise<boolean> {
    // This would be replaced with actual health check logic for each provider
    // For now, we'll simulate a health check
    try {
      switch (provider) {
        case 'openai':
          // Simulate OpenAI health check
          return Math.random() > 0.05; // 95% success rate
        case 'anthropic':
          // Simulate Anthropic health check
          return Math.random() > 0.03; // 97% success rate
        case 'google':
          // Simulate Google health check
          return Math.random() > 0.04; // 96% success rate
        case 'azure':
          // Simulate Azure health check
          return Math.random() > 0.02; // 98% success rate
        default:
          return false;
      }
    } catch (error) {
      return false;
    }
  }
}

// Create a cached instance
export const providerStatusService = new ProviderStatusService();

// Cache provider status for performance
export const getCachedProviderStatus = cache(async () => {
  return providerStatusService.getAllProviderStatus();
});

export const getCachedHealthyProviders = cache(async () => {
  return providerStatusService.getHealthyProviders();
});