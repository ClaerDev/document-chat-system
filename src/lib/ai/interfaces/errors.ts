/**
 * Enhanced Error Handling Classes for AI Services
 * Based on service-interfaces.md specification
 */

// Base AI Service Error
export abstract class AIServiceError extends Error {
  constructor(
    message: string,
    public code: string,
    public provider?: string,
    public retryable: boolean = false
  ) {
    super(message);
    this.name = 'AIServiceError';
  }
}

// Provider unavailable error
export class ProviderUnavailableError extends AIServiceError {
  constructor(provider: string, reason?: string) {
    super(
      `Provider ${provider} is unavailable: ${reason}`,
      'PROVIDER_UNAVAILABLE',
      provider,
      true
    );
    this.name = 'ProviderUnavailableError';
  }
}

// Rate limit exceeded error
export class RateLimitError extends AIServiceError {
  constructor(provider: string, public retryAfter?: number) {
    super(
      `Rate limit exceeded for ${provider}`,
      'RATE_LIMIT_EXCEEDED',
      provider,
      true
    );
    this.name = 'RateLimitError';
  }
}

// Invalid request error
export class InvalidRequestError extends AIServiceError {
  constructor(message: string, public details?: any) {
    super(message, 'INVALID_REQUEST', undefined, false);
    this.name = 'InvalidRequestError';
    this.details = details;
  }
}

// Validation error
export class ValidationError extends AIServiceError {
  constructor(message: string, public details?: any) {
    super(message, 'VALIDATION_ERROR', undefined, false);
    this.name = 'ValidationError';
    this.details = details;
  }
}

// Cost limit exceeded error
export class CostLimitExceededError extends AIServiceError {
  constructor(message: string) {
    super(message, 'COST_LIMIT_EXCEEDED', undefined, false);
    this.name = 'CostLimitExceededError';
  }
}

// Authentication error
export class AuthenticationError extends AIServiceError {
  constructor(message: string, provider?: string) {
    super(message, 'AUTHENTICATION_ERROR', provider, false);
    this.name = 'AuthenticationError';
  }
}

// Provider timeout error
export class ProviderTimeoutError extends AIServiceError {
  constructor(provider: string, timeout: number) {
    super(
      `Provider ${provider} timed out after ${timeout}ms`,
      'PROVIDER_TIMEOUT',
      provider,
      true
    );
    this.name = 'ProviderTimeoutError';
  }
}

// Model not found error
export class ModelNotFoundError extends AIServiceError {
  constructor(model: string, provider?: string) {
    super(
      `Model ${model} not found${provider ? ` for provider ${provider}` : ''}`,
      'MODEL_NOT_FOUND',
      provider,
      false
    );
    this.name = 'ModelNotFoundError';
  }
}

// Quota exceeded error
export class QuotaExceededError extends AIServiceError {
  constructor(provider: string, quotaType: string) {
    super(
      `Quota exceeded for ${provider}: ${quotaType}`,
      'QUOTA_EXCEEDED',
      provider,
      false
    );
    this.name = 'QuotaExceededError';
  }
}

// Circuit breaker open error
export class CircuitBreakerOpenError extends AIServiceError {
  constructor(provider: string) {
    super(
      `Circuit breaker is open for provider ${provider}`,
      'CIRCUIT_BREAKER_OPEN',
      provider,
      true
    );
    this.name = 'CircuitBreakerOpenError';
  }
}

// All providers failed error
export class AllProvidersFailedError extends AIServiceError {
  constructor(message: string, public errors: Error[] = []) {
    super(message, 'ALL_PROVIDERS_FAILED', undefined, false);
    this.name = 'AllProvidersFailedError';
    this.errors = errors;
  }
}

// Content filtering error
export class ContentFilterError extends AIServiceError {
  constructor(message: string, provider?: string) {
    super(message, 'CONTENT_FILTERED', provider, false);
    this.name = 'ContentFilterError';
  }
}

// Network error
export class NetworkError extends AIServiceError {
  constructor(message: string, provider?: string) {
    super(message, 'NETWORK_ERROR', provider, true);
    this.name = 'NetworkError';
  }
}

// Provider configuration error
export class ProviderConfigurationError extends AIServiceError {
  constructor(message: string, provider?: string) {
    super(message, 'PROVIDER_CONFIGURATION_ERROR', provider, false);
    this.name = 'ProviderConfigurationError';
  }
}

// Error Handler Interface
export interface ErrorHandler {
  canHandle(error: Error): boolean;
  handle(error: Error, context: RequestContext): Promise<ErrorHandlingResult>;
}

// Request context for error handling
export interface RequestContext {
  provider: string;
  model: string;
  operation: 'completion' | 'embedding' | 'stream';
  attempt: number;
  startTime: Date;
  metadata: Record<string, any>;
}

// Error handling result
export interface ErrorHandlingResult {
  action: 'retry' | 'fallback' | 'fail';
  retryConfig?: RetryConfig;
  fallbackProvider?: string;
  transformedError?: Error;
}

// Retry configuration
export interface RetryConfig {
  attempts: number;
  delay: number;
  backoff: 'linear' | 'exponential';
  maxDelay?: number;
  jitter?: boolean;
}

// Default Error Handler Implementation
export class DefaultErrorHandler implements ErrorHandler {
  canHandle(error: Error): boolean {
    return error instanceof AIServiceError;
  }
  
  async handle(
    error: Error,
    context: RequestContext
  ): Promise<ErrorHandlingResult> {
    if (error instanceof RateLimitError) {
      return {
        action: 'retry',
        retryConfig: {
          attempts: 3,
          delay: error.retryAfter || 1000,
          backoff: 'exponential',
          maxDelay: 30000,
          jitter: true
        }
      };
    }
    
    if (error instanceof ProviderUnavailableError || error instanceof CircuitBreakerOpenError) {
      return {
        action: 'fallback',
        fallbackProvider: this.selectFallbackProvider(context.provider)
      };
    }
    
    if (error instanceof ProviderTimeoutError || error instanceof NetworkError) {
      return {
        action: 'retry',
        retryConfig: {
          attempts: 2,
          delay: 1000,
          backoff: 'exponential',
          maxDelay: 5000
        }
      };
    }
    
    if (error instanceof AuthenticationError || error instanceof InvalidRequestError) {
      return { action: 'fail' };
    }
    
    // Default to fail for unknown errors
    return { action: 'fail' };
  }
  
  private selectFallbackProvider(currentProvider: string): string {
    // Simple fallback logic - could be enhanced with provider scoring
    const providers = ['openai', 'anthropic', 'google', 'azure'];
    const filtered = providers.filter(p => p !== currentProvider);
    return filtered[0] || 'openai';
  }
}

// Error utilities
export class ErrorUtils {
  static isRetryable(error: Error): boolean {
    if (error instanceof AIServiceError) {
      return error.retryable;
    }
    return false;
  }
  
  static getRetryDelay(error: Error, attempt: number): number {
    if (error instanceof RateLimitError && error.retryAfter) {
      return error.retryAfter;
    }
    
    // Exponential backoff with jitter
    const baseDelay = 1000;
    const maxDelay = 30000;
    const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
    const jitter = Math.random() * 0.1 * delay;
    return delay + jitter;
  }
  
  static categorizeError(error: Error): string {
    if (error instanceof RateLimitError) return 'rate_limit';
    if (error instanceof AuthenticationError) return 'auth';
    if (error instanceof ProviderUnavailableError) return 'provider_unavailable';
    if (error instanceof NetworkError) return 'network';
    if (error instanceof ProviderTimeoutError) return 'timeout';
    if (error instanceof InvalidRequestError) return 'invalid_request';
    if (error instanceof CostLimitExceededError) return 'cost_limit';
    if (error instanceof QuotaExceededError) return 'quota';
    if (error instanceof ContentFilterError) return 'content_filter';
    return 'unknown';
  }
}

// Re-export legacy error types for backward compatibility
// Note: These are already exported from ./types, we just make them available here too

// Type guards for error checking
export const isAIServiceError = (error: unknown): error is AIServiceError =>
  error instanceof AIServiceError;

export const isRetryableError = (error: unknown): boolean =>
  isAIServiceError(error) && error.retryable;

export const isRateLimitError = (error: unknown): error is RateLimitError =>
  error instanceof RateLimitError;

export const isProviderUnavailableError = (error: unknown): error is ProviderUnavailableError =>
  error instanceof ProviderUnavailableError;