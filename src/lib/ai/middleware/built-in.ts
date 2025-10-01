/**
 * Built-in Middleware Implementations
 * Provides common middleware for AI services
 */

import type { Middleware, RequestContext, ResponseContext } from './index';

// Logging Middleware
export class LoggingMiddleware implements Middleware {
  name = 'logging';
  priority = 100;
  
  constructor(private options: { 
    logRequests?: boolean;
    logResponses?: boolean;
    logErrors?: boolean;
    sanitize?: boolean;
  } = {}) {
    this.options = {
      logRequests: true,
      logResponses: true,
      logErrors: true,
      sanitize: true,
      ...options
    };
  }
  
  async beforeRequest(context: RequestContext): Promise<RequestContext> {
    if (this.options.logRequests) {
      console.log(`[AI Request] ${context.operation} - Provider: ${context.provider}`, {
        timestamp: context.startTime,
        model: context.model,
        userId: context.userId,
        organizationId: context.organizationId,
        request: this.options.sanitize ? this.sanitizeRequest(context.request) : context.request
      });
    }
    return context;
  }
  
  async afterResponse(context: ResponseContext): Promise<ResponseContext> {
    if (this.options.logResponses) {
      console.log(`[AI Response] ${context.operation} - Provider: ${context.provider}`, {
        latency: context.latency,
        cost: context.cost,
        success: context.success,
        tokens: context.response?.usage,
        model: context.model
      });
    }
    return context;
  }
  
  async onError(error: Error, context: RequestContext): Promise<Error> {
    if (this.options.logErrors) {
      console.error(`[AI Error] ${context.operation} - Provider: ${context.provider}`, {
        error: error.message,
        stack: error.stack,
        model: context.model,
        userId: context.userId,
        organizationId: context.organizationId
      });
    }
    return error;
  }
  
  private sanitizeRequest(request: any): any {
    if (!request) return request;
    
    const sanitized = { ...request };
    
    // Remove sensitive information from messages
    if (sanitized.messages) {
      sanitized.messages = sanitized.messages.map((msg: any) => ({
        ...msg,
        content: this.sanitizeContent(msg.content)
      }));
    }
    
    // Remove text content for embeddings
    if (sanitized.text) {
      sanitized.text = `[${sanitized.text.length} characters]`;
    }
    
    return sanitized;
  }
  
  private sanitizeContent(content: string): string {
    // Basic PII sanitization - could be enhanced
    const sanitized = content
      .replace(/\b[\w._%+-]+@[\w.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL]')
      .replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[SSN]')
      .replace(/\b\d{3}-\d{3}-\d{4}\b/g, '[PHONE]');
    
    return sanitized.length > 200 ? sanitized.substring(0, 200) + '...' : sanitized;
  }
}

// Cost Control Middleware
export class CostControlMiddleware implements Middleware {
  name = 'cost-control';
  priority = 50;
  
  constructor(private limits: {
    maxPerRequest?: number;
    maxDaily?: number;
    maxMonthly?: number;
  }) {}
  
  async beforeRequest(context: RequestContext): Promise<RequestContext | null> {
    // Estimate cost
    const estimated = await this.estimateCost(context);
    
    // Check per-request limit
    if (this.limits.maxPerRequest && estimated > this.limits.maxPerRequest) {
      throw new Error(
        `Estimated cost ${estimated} exceeds per-request limit ${this.limits.maxPerRequest}`
      );
    }
    
    // Check daily usage
    if (this.limits.maxDaily) {
      const dailyUsage = await this.getDailyUsage(context.userId || context.organizationId);
      if (dailyUsage + estimated > this.limits.maxDaily) {
        return null; // Block request
      }
    }
    
    // Check monthly usage
    if (this.limits.maxMonthly) {
      const monthlyUsage = await this.getMonthlyUsage(context.userId || context.organizationId);
      if (monthlyUsage + estimated > this.limits.maxMonthly) {
        return null; // Block request
      }
    }
    
    return context;
  }
  
  private async estimateCost(context: RequestContext): Promise<number> {
    // More realistic cost estimation based on model type
    if (context.operation === 'completion') {
      const messageLength = context.request.messages?.reduce(
        (acc: number, msg: any) => acc + msg.content.length, 0
      ) || 0;
      const estimatedPromptTokens = Math.ceil(messageLength / 4);
      const estimatedCompletionTokens = Math.ceil(estimatedPromptTokens * 0.3); // Estimate 30% completion length
      
      // Model-specific pricing (per 1K tokens)
      const model = context.model || 'gpt-4o-mini';
      const costPerToken: Record<string, { prompt: number; completion: number }> = {
        'gpt-4o': { prompt: 0.005, completion: 0.015 },
        'gpt-4o-mini': { prompt: 0.00015, completion: 0.0006 },
        'gpt-3.5-turbo': { prompt: 0.0005, completion: 0.0015 },
        'powerful': { prompt: 0.005, completion: 0.015 }, // Maps to gpt-4o
        'balanced': { prompt: 0.00015, completion: 0.0006 }, // Maps to gpt-4o-mini
        'fast': { prompt: 0.0005, completion: 0.0015 } // Maps to gpt-3.5-turbo
      };
      
      const modelCost = costPerToken[model] || costPerToken['gpt-4o-mini'];
      const promptCost = (estimatedPromptTokens / 1000) * modelCost.prompt;
      const completionCost = (estimatedCompletionTokens / 1000) * modelCost.completion;
      
      return promptCost + completionCost;
    } else if (context.operation === 'embedding') {
      const textLength = Array.isArray(context.request.text) 
        ? context.request.text.join('').length
        : context.request.text?.length || 0;
      const estimatedTokens = Math.ceil(textLength / 4);
      return (estimatedTokens / 1000) * 0.00002; // text-embedding-3-small pricing
    }
    return 0;
  }
  
  private async getDailyUsage(identifier?: string): Promise<number> {
    // Placeholder - would integrate with usage tracking system
    return 0;
  }
  
  private async getMonthlyUsage(identifier?: string): Promise<number> {
    // Placeholder - would integrate with usage tracking system
    return 0;
  }
}

// Caching Middleware
export class CachingMiddleware implements Middleware {
  name = 'caching';
  priority = 75;
  
  private cache = new Map<string, { response: any; timestamp: number; ttl: number }>();
  
  constructor(private options: {
    ttl?: number; // Time to live in milliseconds
    maxSize?: number; // Maximum cache entries
    enableSemanticCaching?: boolean;
  } = {}) {
    this.options = {
      ttl: 5 * 60 * 1000, // 5 minutes default
      maxSize: 1000,
      enableSemanticCaching: false,
      ...options
    };
  }
  
  async beforeRequest(context: RequestContext): Promise<RequestContext | null> {
    // Only cache deterministic requests
    if (!this.isCacheable(context)) {
      return context;
    }
    
    const cacheKey = this.generateCacheKey(context);
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      // Return cached response by modifying context
      context.metadata.cached = true;
      context.metadata.cachedResponse = cached.response;
      return context;
    }
    
    return context;
  }
  
  async afterResponse(context: ResponseContext): Promise<ResponseContext> {
    if (!context.metadata.cached && this.isCacheable(context)) {
      const cacheKey = this.generateCacheKey(context);
      
      // Clean up old entries if cache is full
      if (this.cache.size >= (this.options.maxSize || 1000)) {
        this.evictOldest();
      }
      
      this.cache.set(cacheKey, {
        response: context.response,
        timestamp: Date.now(),
        ttl: this.options.ttl || 5 * 60 * 1000
      });
    }
    
    return context;
  }
  
  private isCacheable(context: RequestContext | ResponseContext): boolean {
    // Don't cache streaming requests
    if (context.operation === 'stream') return false;
    
    // Don't cache requests with randomness
    if (context.request.temperature && context.request.temperature > 0) return false;
    if (context.request.seed === undefined) return false;
    
    return true;
  }
  
  private generateCacheKey(context: RequestContext | ResponseContext): string {
    const keyData = {
      operation: context.operation,
      provider: context.provider,
      model: context.model,
      request: context.request
    };
    
    return JSON.stringify(keyData);
  }
  
  private evictOldest(): void {
    let oldestKey = '';
    let oldestTime = Date.now();
    
    for (const [key, value] of this.cache.entries()) {
      if (value.timestamp < oldestTime) {
        oldestTime = value.timestamp;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }
  
  // Public methods for cache management
  clearCache(): void {
    this.cache.clear();
  }
  
  getCacheStats(): { size: number; hitRate: number } {
    return {
      size: this.cache.size,
      hitRate: 0 // Would need to track hits/misses
    };
  }
}

// Rate Limiting Middleware
export class RateLimitingMiddleware implements Middleware {
  name = 'rate-limiting';
  priority = 25;
  
  private requestCounts = new Map<string, { count: number; resetTime: number }>();
  
  constructor(private limits: {
    requestsPerMinute?: number;
    tokensPerMinute?: number;
    concurrent?: number;
  }) {}
  
  async beforeRequest(context: RequestContext): Promise<RequestContext | null> {
    const identifier = context.userId || context.organizationId || 'anonymous';
    
    if (this.limits.requestsPerMinute) {
      if (!this.checkRequestLimit(identifier)) {
        throw new Error('Rate limit exceeded: too many requests per minute');
      }
    }
    
    // Increment request count
    this.incrementRequestCount(identifier);
    
    return context;
  }
  
  private checkRequestLimit(identifier: string): boolean {
    const now = Date.now();
    const resetTime = Math.floor(now / 60000) * 60000 + 60000; // Next minute
    const current = this.requestCounts.get(identifier);
    
    if (!current || current.resetTime <= now) {
      this.requestCounts.set(identifier, { count: 0, resetTime });
      return true;
    }
    
    return current.count < (this.limits.requestsPerMinute || Infinity);
  }
  
  private incrementRequestCount(identifier: string): void {
    const current = this.requestCounts.get(identifier);
    if (current) {
      current.count++;
    }
  }
}

// Monitoring Middleware
export class MonitoringMiddleware implements Middleware {
  name = 'monitoring';
  priority = 10;
  
  private metrics = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    totalLatency: 0,
    totalCost: 0
  };
  
  async beforeRequest(context: RequestContext): Promise<RequestContext> {
    this.metrics.totalRequests++;
    context.metadata.monitoringStartTime = Date.now();
    return context;
  }
  
  async afterResponse(context: ResponseContext): Promise<ResponseContext> {
    if (context.success) {
      this.metrics.successfulRequests++;
    } else {
      this.metrics.failedRequests++;
    }
    
    this.metrics.totalLatency += context.latency;
    if (context.cost) {
      this.metrics.totalCost += context.cost;
    }
    
    // Could send metrics to external monitoring service
    this.sendMetrics(context);
    
    return context;
  }
  
  async onError(error: Error, context: RequestContext): Promise<Error> {
    this.metrics.failedRequests++;
    
    // Send error metrics
    this.sendErrorMetrics(error, context);
    
    return error;
  }
  
  private sendMetrics(context: ResponseContext): void {
    // Placeholder for sending metrics to monitoring service
    // Could integrate with DataDog, New Relic, etc.
  }
  
  private sendErrorMetrics(error: Error, context: RequestContext): void {
    // Placeholder for sending error metrics
  }
  
  getMetrics() {
    return {
      ...this.metrics,
      averageLatency: this.metrics.totalRequests > 0 
        ? this.metrics.totalLatency / this.metrics.totalRequests 
        : 0,
      successRate: this.metrics.totalRequests > 0
        ? this.metrics.successfulRequests / this.metrics.totalRequests
        : 0
    };
  }
}