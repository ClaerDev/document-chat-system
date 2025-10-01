// Main AI Service Manager
export { AIServiceManager } from './ai-service-manager';

// Core interfaces and types
export type {
  AIRequest,
  TaskType,
  Complexity,
  UnifiedMessage,
  UnifiedCompletionRequest,
  UnifiedCompletionResponse,
  UnifiedEmbeddingRequest,
  UnifiedEmbeddingResponse,
  ProviderCapabilities,
  ModelInfo,
  CostEstimate,
  TokenEstimate
} from './interfaces/types';

export { AIProviderAdapter } from './interfaces/base-adapter';

// Configuration  
export { AIConfiguration, DEFAULT_AI_CONFIG, DEFAULT_TASK_ROUTING } from './config/ai-config';
export { ModelRegistry } from './config/model-registry';

// Circuit breaker
export { AICircuitBreaker, CircuitBreakerManager } from './circuit-breaker/circuit-breaker';

// Enhanced interfaces and contracts (avoiding naming conflicts)
export type {
  IAIService,
  EnhancedCompletionRequest,
  EnhancedCompletionResponse,
  EnhancedEmbeddingRequest,
  EnhancedEmbeddingResponse,
  Provider,
  HealthStatus,
  ServiceMetrics
} from './interfaces';

// Error handling (avoiding conflicts)
export {
  AIServiceError,
  ProviderUnavailableError,
  InvalidRequestError,
  CostLimitExceededError,
  DefaultErrorHandler,
  ErrorUtils,
  // Legacy error types
  RateLimitError,
  AuthenticationError,
  ValidationError,
  CircuitOpenError,
  AllProvidersFailedError
} from './interfaces';

// Middleware system
export { default as MiddlewareManager } from './middleware';
export type { Middleware, RequestContext, ResponseContext } from './middleware';
export {
  LoggingMiddleware,
  CostControlMiddleware,
  CachingMiddleware,
  RateLimitingMiddleware,
  MonitoringMiddleware
} from './middleware/built-in';

// Providers
export { SmartOpenRouterAdapter } from './providers/smart-openrouter-adapter';
export { OpenRouterMetricsCollector } from './monitoring/openrouter-metrics-collector';

// Individual provider adapters will be exported here when implemented