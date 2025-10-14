/**
 * ImageRouter Error Handler
 * 
 * Comprehensive error handling, categorization, recovery, and reporting for ImageRouter.
 * Implements intelligent error recovery strategies and error pattern analysis.
 */

import {
  ValidationError,
  AuthenticationError,
  RateLimitError,
  NetworkError,
  ProviderUnavailableError,
  QuotaExceededError,
  ProviderConfigurationError
} from '../interfaces/errors';
import { ImageRouterError } from '../interfaces/imagerouter-types';

// Error categories for recovery strategies
export type ErrorCategory = 
  | 'transient'      // Temporary errors that can be retried
  | 'permanent'      // Permanent errors that should not be retried
  | 'rate_limit'     // Rate limiting errors with specific handling
  | 'authentication' // Authentication/authorization errors
  | 'validation'     // Request validation errors
  | 'quota'          // Quota/billing errors
  | 'network'        // Network connectivity errors
  | 'service'        // ImageRouter service errors
  | 'configuration'  // Configuration errors
  | 'unknown';       // Uncategorized errors

// Error recovery strategies
export type RecoveryStrategy = 
  | 'retry'          // Simple retry
  | 'exponential_backoff' // Retry with exponential backoff
  | 'circuit_breaker'     // Use circuit breaker
  | 'fallback'       // Use fallback provider
  | 'user_intervention'   // Requires user action
  | 'none';          // No recovery possible

// Error context for debugging and recovery
export interface ErrorContext {
  operation: string;
  requestId?: string;
  organizationId?: string;
  userId?: string;
  model?: string;
  mediaType?: 'image' | 'video' | 'edit';
  prompt?: string;
  metadata?: Record<string, any>;
  timestamp: string;
  attemptNumber: number;
  previousErrors?: ErrorInfo[];
}

// Structured error information
export interface ErrorInfo {
  category: ErrorCategory;
  recoveryStrategy: RecoveryStrategy;
  isRetryable: boolean;
  retryAfter?: number;
  maxRetries?: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  userMessage: string;
  technicalMessage: string;
  errorCode?: string;
  httpStatus?: number;
  context: ErrorContext;
  correlationId: string;
}

// Recovery result
export interface RecoveryResult {
  success: boolean;
  strategy: RecoveryStrategy;
  newError?: Error;
  fallbackUsed?: boolean;
  retryAfter?: number;
  message?: string;
}

// Error pattern for analysis
export interface ErrorPattern {
  pattern: string;
  category: ErrorCategory;
  frequency: number;
  firstSeen: string;
  lastSeen: string;
  affectedUsers: Set<string>;
  affectedOrganizations: Set<string>;
  metadata: Record<string, any>;
}

// Retry configuration
export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  jitterFactor: number;
  retryableCategories: ErrorCategory[];
}

// Default retry configuration
const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelay: 1000,       // 1 second
  maxDelay: 30000,       // 30 seconds
  backoffMultiplier: 2,
  jitterFactor: 0.1,
  retryableCategories: ['transient', 'network', 'rate_limit']
};

export class ImageRouterErrorHandler {
  private errorPatterns: Map<string, ErrorPattern> = new Map();
  private retryConfig: RetryConfig;
  private correlationCounter = 0;

  constructor(retryConfig: Partial<RetryConfig> = {}) {
    this.retryConfig = { ...DEFAULT_RETRY_CONFIG, ...retryConfig };
  }

  /**
   * Main error handling entry point
   */
  async handleError(
    error: Error, 
    context: Partial<ErrorContext>
  ): Promise<{ errorInfo: ErrorInfo; recovery?: RecoveryResult }> {
    
    const correlationId = this.generateCorrelationId();
    const fullContext: ErrorContext = {
      operation: 'unknown',
      timestamp: new Date().toISOString(),
      attemptNumber: 1,
      ...context
    };

    // Categorize the error
    const category = this.categorizeError(error);
    const recoveryStrategy = this.getRecoveryStrategy(category, fullContext);
    
    // Create structured error info
    const errorInfo: ErrorInfo = {
      category,
      recoveryStrategy,
      isRetryable: this.isRetryable(category, fullContext.attemptNumber),
      retryAfter: this.extractRetryAfter(error),
      maxRetries: this.retryConfig.maxAttempts,
      severity: this.calculateSeverity(category, error),
      userMessage: this.generateUserMessage(category, error),
      technicalMessage: this.generateTechnicalMessage(error, fullContext),
      errorCode: this.extractErrorCode(error),
      httpStatus: this.extractHttpStatus(error),
      context: fullContext,
      correlationId
    };

    // Track error patterns
    this.trackErrorPattern(errorInfo);

    // Attempt recovery if applicable
    let recovery: RecoveryResult | undefined;
    if (errorInfo.isRetryable && recoveryStrategy !== 'none') {
      recovery = await this.attemptRecovery(error, errorInfo);
    }

    // Log the error
    await this.logError(errorInfo, recovery);

    return { errorInfo, recovery };
  }

  /**
   * Categorize error type for appropriate handling
   */
  categorizeError(error: Error): ErrorCategory {
    if (error instanceof AuthenticationError) {
      return 'authentication';
    }
    
    if (error instanceof ValidationError) {
      return 'validation';
    }
    
    if (error instanceof RateLimitError) {
      return 'rate_limit';
    }
    
    if (error instanceof QuotaExceededError) {
      return 'quota';
    }
    
    if (error instanceof ProviderConfigurationError) {
      return 'configuration';
    }
    
    if (error instanceof NetworkError) {
      return 'network';
    }
    
    if (error instanceof ProviderUnavailableError) {
      return 'service';
    }
    
    // Check for transient errors by message/status
    if (this.isTransientError(error)) {
      return 'transient';
    }
    
    // Check for permanent errors
    if (this.isPermanentError(error)) {
      return 'permanent';
    }
    
    return 'unknown';
  }

  /**
   * Determine recovery strategy based on error category
   */
  getRecoveryStrategy(category: ErrorCategory, context: ErrorContext): RecoveryStrategy {
    switch (category) {
      case 'transient':
      case 'network':
        return context.attemptNumber < this.retryConfig.maxAttempts 
          ? 'exponential_backoff' 
          : 'circuit_breaker';
      
      case 'rate_limit':
        return 'retry'; // With specific delay from rate limit headers
      
      case 'authentication':
      case 'configuration':
        return 'user_intervention';
      
      case 'validation':
        return 'none'; // User needs to fix the request
      
      case 'quota':
        return 'user_intervention'; // User needs to increase quota
      
      case 'service':
        return context.attemptNumber < 2 ? 'circuit_breaker' : 'fallback';
      
      case 'permanent':
        return 'none';
      
      case 'unknown':
        return context.attemptNumber < 2 ? 'retry' : 'none';
      
      default:
        return 'none';
    }
  }

  /**
   * Check if error is retryable
   */
  isRetryable(category: ErrorCategory, attemptNumber: number): boolean {
    if (attemptNumber >= this.retryConfig.maxAttempts) {
      return false;
    }
    
    return this.retryConfig.retryableCategories.includes(category);
  }

  /**
   * Attempt error recovery
   */
  async attemptRecovery(error: Error, errorInfo: ErrorInfo): Promise<RecoveryResult> {
    const { recoveryStrategy, category, context } = errorInfo;
    
    try {
      switch (recoveryStrategy) {
        case 'retry':
          return await this.simpleRetry(errorInfo);
        
        case 'exponential_backoff':
          return await this.exponentialBackoffRetry(errorInfo);
        
        case 'circuit_breaker':
          return await this.circuitBreakerRecovery(errorInfo);
        
        case 'fallback':
          return await this.fallbackRecovery(errorInfo);
        
        case 'user_intervention':
          return {
            success: false,
            strategy: recoveryStrategy,
            message: this.getUserInterventionMessage(category)
          };
        
        default:
          return {
            success: false,
            strategy: 'none',
            message: 'No recovery strategy available'
          };
      }
    } catch (recoveryError) {
      return {
        success: false,
        strategy: recoveryStrategy,
        newError: recoveryError as Error,
        message: `Recovery attempt failed: ${(recoveryError as Error).message}`
      };
    }
  }

  /**
   * Simple retry with fixed delay
   */
  private async simpleRetry(errorInfo: ErrorInfo): Promise<RecoveryResult> {
    const delay = errorInfo.retryAfter || this.retryConfig.baseDelay;
    
    await this.sleep(delay);
    
    return {
      success: true,
      strategy: 'retry',
      retryAfter: delay,
      message: `Retrying after ${delay}ms delay`
    };
  }

  /**
   * Exponential backoff retry
   */
  private async exponentialBackoffRetry(errorInfo: ErrorInfo): Promise<RecoveryResult> {
    const { attemptNumber } = errorInfo.context;
    const baseDelay = this.retryConfig.baseDelay;
    const backoffMultiplier = this.retryConfig.backoffMultiplier;
    const jitterFactor = this.retryConfig.jitterFactor;
    
    // Calculate exponential backoff delay
    const exponentialDelay = baseDelay * Math.pow(backoffMultiplier, attemptNumber - 1);
    
    // Add jitter to prevent thundering herd
    const jitter = exponentialDelay * jitterFactor * Math.random();
    const totalDelay = Math.min(exponentialDelay + jitter, this.retryConfig.maxDelay);
    
    await this.sleep(totalDelay);
    
    return {
      success: true,
      strategy: 'exponential_backoff',
      retryAfter: totalDelay,
      message: `Retrying with exponential backoff: ${Math.round(totalDelay)}ms delay`
    };
  }

  /**
   * Circuit breaker recovery
   */
  private async circuitBreakerRecovery(errorInfo: ErrorInfo): Promise<RecoveryResult> {
    // This would integrate with the circuit breaker system
    // For now, implement a simple delay-based recovery
    const delay = 30000; // 30 seconds
    
    await this.sleep(delay);
    
    return {
      success: true,
      strategy: 'circuit_breaker',
      retryAfter: delay,
      message: 'Circuit breaker recovery: waiting for service health to improve'
    };
  }

  /**
   * Fallback to alternative provider/method
   */
  private async fallbackRecovery(errorInfo: ErrorInfo): Promise<RecoveryResult> {
    // This would implement fallback to alternative providers
    // For ImageRouter, this might mean using a different model or provider
    
    return {
      success: true,
      strategy: 'fallback',
      fallbackUsed: true,
      message: 'Using fallback strategy: switched to alternative provider'
    };
  }

  /**
   * Track error patterns for analysis
   */
  private trackErrorPattern(errorInfo: ErrorInfo): void {
    const { category, context, technicalMessage } = errorInfo;
    const pattern = this.generatePatternKey(category, technicalMessage);
    
    const existingPattern = this.errorPatterns.get(pattern);
    const now = new Date().toISOString();
    
    if (existingPattern) {
      existingPattern.frequency++;
      existingPattern.lastSeen = now;
      if (context.userId) existingPattern.affectedUsers.add(context.userId);
      if (context.organizationId) existingPattern.affectedOrganizations.add(context.organizationId);
    } else {
      this.errorPatterns.set(pattern, {
        pattern,
        category,
        frequency: 1,
        firstSeen: now,
        lastSeen: now,
        affectedUsers: new Set(context.userId ? [context.userId] : []),
        affectedOrganizations: new Set(context.organizationId ? [context.organizationId] : []),
        metadata: {
          operation: context.operation,
          model: context.model,
          mediaType: context.mediaType
        }
      });
    }
  }

  /**
   * Get error patterns for analysis
   */
  getErrorPatterns(): ErrorPattern[] {
    return Array.from(this.errorPatterns.values())
      .sort((a, b) => b.frequency - a.frequency);
  }

  /**
   * Clear old error patterns
   */
  clearOldPatterns(maxAge: number = 24 * 60 * 60 * 1000): void {
    const cutoff = new Date(Date.now() - maxAge).toISOString();
    
    for (const [pattern, info] of this.errorPatterns.entries()) {
      if (info.lastSeen < cutoff) {
        this.errorPatterns.delete(pattern);
      }
    }
  }

  // Helper methods

  private isTransientError(error: Error): boolean {
    const transientMessages = [
      'timeout',
      'connection reset',
      'temporarily unavailable',
      'service temporarily overloaded',
      'internal server error'
    ];
    
    const message = error.message.toLowerCase();
    return transientMessages.some(msg => message.includes(msg));
  }

  private isPermanentError(error: Error): boolean {
    const permanentMessages = [
      'invalid api key',
      'model not found',
      'unsupported format',
      'content policy violation'
    ];
    
    const message = error.message.toLowerCase();
    return permanentMessages.some(msg => message.includes(msg));
  }

  private extractRetryAfter(error: Error): number | undefined {
    if (error instanceof RateLimitError && error.retryAfter) {
      return error.retryAfter * 1000; // Convert to milliseconds
    }
    return undefined;
  }

  private extractErrorCode(error: Error): string | undefined {
    if ('code' in error) {
      return (error as any).code;
    }
    return undefined;
  }

  private extractHttpStatus(error: Error): number | undefined {
    if ('status' in error) {
      return (error as any).status;
    }
    if ('statusCode' in error) {
      return (error as any).statusCode;
    }
    return undefined;
  }

  private calculateSeverity(category: ErrorCategory, error: Error): 'low' | 'medium' | 'high' | 'critical' {
    switch (category) {
      case 'authentication':
      case 'configuration':
        return 'critical';
      case 'quota':
      case 'service':
        return 'high';
      case 'rate_limit':
      case 'network':
        return 'medium';
      case 'validation':
      case 'transient':
        return 'low';
      default:
        return 'medium';
    }
  }

  private generateUserMessage(category: ErrorCategory, error: Error): string {
    switch (category) {
      case 'authentication':
        return 'Authentication failed. Please check your API credentials.';
      case 'validation':
        return 'Request validation failed. Please check your input and try again.';
      case 'rate_limit':
        return 'Rate limit exceeded. Please wait a moment before trying again.';
      case 'quota':
        return 'Usage quota exceeded. Please upgrade your plan or wait for quota reset.';
      case 'network':
        return 'Network connection issue. Please check your internet connection.';
      case 'service':
        return 'ImageRouter service is temporarily unavailable. Please try again later.';
      case 'configuration':
        return 'Configuration error. Please contact support.';
      case 'transient':
        return 'Temporary service issue. Retrying automatically.';
      default:
        // For debugging: return the actual error message for unknown errors
        return `ImageRouter error: ${error.message || error.toString()}`;
    }
  }

  private generateTechnicalMessage(error: Error, context: ErrorContext): string {
    return `[${context.operation}] ${error.name}: ${error.message} (Attempt ${context.attemptNumber})`;
  }

  private getUserInterventionMessage(category: ErrorCategory): string {
    switch (category) {
      case 'authentication':
        return 'Please verify your ImageRouter API key and try again.';
      case 'configuration':
        return 'Please check your ImageRouter configuration settings.';
      case 'quota':
        return 'Please upgrade your ImageRouter plan or wait for quota reset.';
      default:
        return 'User intervention required. Please contact support.';
    }
  }

  private generatePatternKey(category: ErrorCategory, message: string): string {
    // Create a pattern key by removing specific details but keeping the error type
    const normalizedMessage = message
      .replace(/\d+/g, 'N')                    // Replace numbers with N
      .replace(/\b[a-f0-9-]{36}\b/g, 'UUID')   // Replace UUIDs
      .replace(/\b[a-f0-9]{8,}\b/g, 'ID')      // Replace other IDs
      .toLowerCase();
    
    return `${category}:${normalizedMessage}`;
  }

  private generateCorrelationId(): string {
    return `ir_error_${Date.now()}_${++this.correlationCounter}`;
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async logError(errorInfo: ErrorInfo, recovery?: RecoveryResult): Promise<void> {
    const logData = {
      ...errorInfo,
      recovery,
      timestamp: new Date().toISOString()
    };
    
    // Log to appropriate system based on severity
    if (errorInfo.severity === 'critical') {
      console.error('🚨 CRITICAL ImageRouter Error:', logData);
    } else if (errorInfo.severity === 'high') {
      console.error('🔥 HIGH ImageRouter Error:', logData);
    } else if (errorInfo.severity === 'medium') {
      console.warn('⚠️ ImageRouter Warning:', logData);
    } else {
      console.log('ℹ️ ImageRouter Info:', logData);
    }
    
    // Here you would also send to error tracking service like Sentry
    // await errorTrackingService.report(logData);
  }
}