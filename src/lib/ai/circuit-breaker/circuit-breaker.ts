import { CircuitOpenError } from '../interfaces/types';

export type CircuitState = 'closed' | 'open' | 'half-open';

export interface CircuitBreakerConfig {
  failureThreshold: number;
  recoveryTimeout: number;
  monitoringWindow: number;
  expectedErrorRate: number;
}

export interface CircuitBreakerMetrics {
  state: CircuitState;
  failureCount: number;
  successCount: number;
  lastFailureTime?: Date;
  nextRetryTime?: Date;
  errorRate: number;
  uptime: number;
}

export class AICircuitBreaker {
  private failures: Map<string, number> = new Map();
  private successes: Map<string, number> = new Map();
  private lastFailureTime: Map<string, Date> = new Map();
  private circuitState: Map<string, CircuitState> = new Map();
  private windowStart: Map<string, Date> = new Map();

  constructor(private config: CircuitBreakerConfig = {
    failureThreshold: 5,
    recoveryTimeout: 60000, // 1 minute
    monitoringWindow: 300000, // 5 minutes
    expectedErrorRate: 0.1 // 10%
  }) {}

  async execute<T>(
    provider: string,
    operation: () => Promise<T>
  ): Promise<T> {
    const state = this.getState(provider);

    if (state === 'open') {
      const canRetry = this.canAttemptRecovery(provider);
      if (!canRetry) {
        throw new CircuitOpenError(`Provider ${provider} circuit is open`);
      }
      
      this.circuitState.set(provider, 'half-open');
    }

    try {
      const result = await operation();
      this.onSuccess(provider);
      return result;
    } catch (error) {
      this.onFailure(provider, error as Error);
      throw error;
    }
  }

  getState(provider: string): CircuitState {
    return this.circuitState.get(provider) || 'closed';
  }

  getMetrics(provider: string): CircuitBreakerMetrics {
    const state = this.getState(provider);
    const failures = this.getFailureCount(provider);
    const successes = this.getSuccessCount(provider);
    const totalRequests = failures + successes;
    const errorRate = totalRequests > 0 ? failures / totalRequests : 0;
    
    const lastFailure = this.lastFailureTime.get(provider);
    const nextRetryTime = this.calculateNextRetryTime(provider);
    
    const windowStart = this.windowStart.get(provider);
    const uptime = windowStart ? Date.now() - windowStart.getTime() : 0;

    return {
      state,
      failureCount: failures,
      successCount: successes,
      lastFailureTime: lastFailure,
      nextRetryTime,
      errorRate,
      uptime
    };
  }

  getAllMetrics(): Map<string, CircuitBreakerMetrics> {
    const metrics = new Map<string, CircuitBreakerMetrics>();
    
    for (const provider of this.getAllProviders()) {
      metrics.set(provider, this.getMetrics(provider));
    }
    
    return metrics;
  }

  reset(provider: string): void {
    this.failures.delete(provider);
    this.successes.delete(provider);
    this.lastFailureTime.delete(provider);
    this.circuitState.set(provider, 'closed');
    this.windowStart.set(provider, new Date());
  }

  forceOpen(provider: string): void {
    this.circuitState.set(provider, 'open');
    this.lastFailureTime.set(provider, new Date());
  }

  forceClose(provider: string): void {
    this.circuitState.set(provider, 'closed');
    this.failures.delete(provider);
    this.windowStart.set(provider, new Date());
  }

  private onSuccess(provider: string): void {
    const currentState = this.getState(provider);
    
    this.incrementSuccessCount(provider);
    
    if (currentState === 'half-open') {
      // Recovery successful, close the circuit
      this.circuitState.set(provider, 'closed');
      this.failures.delete(provider);
      this.windowStart.set(provider, new Date());
    }
    
    this.cleanupOldMetrics(provider);
  }

  private onFailure(provider: string, error: Error): void {
    this.incrementFailureCount(provider);
    this.lastFailureTime.set(provider, new Date());
    
    const currentState = this.getState(provider);
    
    if (currentState === 'half-open') {
      // Failed during recovery attempt, reopen circuit
      this.circuitState.set(provider, 'open');
      return;
    }
    
    const failures = this.getFailureCount(provider);
    const successes = this.getSuccessCount(provider);
    const totalRequests = failures + successes;
    const errorRate = this.calculateCurrentErrorRate(provider);
    
    // Only consider error rate if we have enough requests (at least 5)
    const shouldOpenByErrorRate = totalRequests >= 5 && errorRate > this.config.expectedErrorRate;
    const shouldOpenByFailureCount = failures >= this.config.failureThreshold;
    
    if (shouldOpenByFailureCount || shouldOpenByErrorRate) {
      // Only log if we're transitioning from closed to open (not if already open)
      const wasAlreadyOpen = this.getState(provider) === 'open';
      this.circuitState.set(provider, 'open');
      
      // Only log the first time it opens, not on subsequent failures
      if (!wasAlreadyOpen) {
        // Use debug level for non-critical providers
        const logLevel = provider.includes('imagerouter') ? 'debug' : 'warn';
        const message = `Circuit breaker opened for provider ${provider}. Failures: ${failures}, Error rate: ${errorRate.toFixed(2)}. Will retry in ${this.config.recoveryTimeout / 1000}s`;
        
        if (logLevel === 'debug') {
          console.debug(message);
        } else {
          console.warn(message);
        }
      }
    }
    
    this.cleanupOldMetrics(provider);
  }

  private canAttemptRecovery(provider: string): boolean {
    const lastFailure = this.lastFailureTime.get(provider);
    if (!lastFailure) {
      return true;
    }
    
    const timeSinceFailure = Date.now() - lastFailure.getTime();
    return timeSinceFailure >= this.config.recoveryTimeout;
  }

  private calculateNextRetryTime(provider: string): Date | undefined {
    const state = this.getState(provider);
    if (state !== 'open') {
      return undefined;
    }
    
    const lastFailure = this.lastFailureTime.get(provider);
    if (!lastFailure) {
      return undefined;
    }
    
    return new Date(lastFailure.getTime() + this.config.recoveryTimeout);
  }

  private getFailureCount(provider: string): number {
    return this.failures.get(provider) || 0;
  }

  private getSuccessCount(provider: string): number {
    return this.successes.get(provider) || 0;
  }

  private incrementFailureCount(provider: string): void {
    const current = this.getFailureCount(provider);
    this.failures.set(provider, current + 1);
    
    if (!this.windowStart.has(provider)) {
      this.windowStart.set(provider, new Date());
    }
  }

  private incrementSuccessCount(provider: string): void {
    const current = this.getSuccessCount(provider);
    this.successes.set(provider, current + 1);
    
    if (!this.windowStart.has(provider)) {
      this.windowStart.set(provider, new Date());
    }
  }

  private calculateCurrentErrorRate(provider: string): number {
    const failures = this.getFailureCount(provider);
    const successes = this.getSuccessCount(provider);
    const total = failures + successes;
    
    return total > 0 ? failures / total : 0;
  }

  private cleanupOldMetrics(provider: string): void {
    const windowStart = this.windowStart.get(provider);
    if (!windowStart) {
      return;
    }
    
    const windowAge = Date.now() - windowStart.getTime();
    if (windowAge > this.config.monitoringWindow) {
      // Reset metrics for new monitoring window
      this.failures.delete(provider);
      this.successes.delete(provider);
      this.windowStart.set(provider, new Date());
    }
  }

  private getAllProviders(): string[] {
    const providers = new Set<string>();
    
    for (const provider of this.failures.keys()) {
      providers.add(provider);
    }
    
    for (const provider of this.successes.keys()) {
      providers.add(provider);
    }
    
    for (const provider of this.circuitState.keys()) {
      providers.add(provider);
    }
    
    return Array.from(providers);
  }
}

export class CircuitBreakerManager {
  private circuitBreakers: Map<string, AICircuitBreaker> = new Map();
  private globalConfig: CircuitBreakerConfig;

  constructor(config: CircuitBreakerConfig = {
    failureThreshold: 5,
    recoveryTimeout: 60000,
    monitoringWindow: 300000,
    expectedErrorRate: 0.1
  }) {
    this.globalConfig = config;
  }

  getCircuitBreaker(provider: string, config?: Partial<CircuitBreakerConfig>): AICircuitBreaker {
    if (!this.circuitBreakers.has(provider)) {
      const breakerConfig = { ...this.globalConfig, ...config };
      this.circuitBreakers.set(provider, new AICircuitBreaker(breakerConfig));
    }
    
    return this.circuitBreakers.get(provider)!;
  }

  async executeWithCircuitBreaker<T>(
    provider: string,
    operation: () => Promise<T>,
    config?: Partial<CircuitBreakerConfig>
  ): Promise<T> {
    const circuitBreaker = this.getCircuitBreaker(provider, config);
    return circuitBreaker.execute(provider, operation);
  }

  getProviderMetrics(provider: string): CircuitBreakerMetrics | null {
    const circuitBreaker = this.circuitBreakers.get(provider);
    return circuitBreaker ? circuitBreaker.getMetrics(provider) : null;
  }

  getAllProviderMetrics(): Map<string, CircuitBreakerMetrics> {
    const allMetrics = new Map<string, CircuitBreakerMetrics>();
    
    for (const [provider, circuitBreaker] of this.circuitBreakers) {
      const metrics = circuitBreaker.getMetrics(provider);
      allMetrics.set(provider, metrics);
    }
    
    return allMetrics;
  }

  resetProvider(provider: string): boolean {
    const circuitBreaker = this.circuitBreakers.get(provider);
    if (circuitBreaker) {
      circuitBreaker.reset(provider);
      return true;
    }
    return false;
  }

  forceOpenProvider(provider: string): boolean {
    const circuitBreaker = this.circuitBreakers.get(provider);
    if (circuitBreaker) {
      circuitBreaker.forceOpen(provider);
      return true;
    }
    return false;
  }

  forceCloseProvider(provider: string): boolean {
    const circuitBreaker = this.circuitBreakers.get(provider);
    if (circuitBreaker) {
      circuitBreaker.forceClose(provider);
      return true;
    }
    return false;
  }
}