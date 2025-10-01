// Export types first (excluding conflicting exports)
export type {
  TaskType,
  Complexity,
  UnifiedMessage,
  ImageAttachment,
  FileAttachment,
  MessageAttachment,
  UnifiedCompletionRequest,
  UnifiedCompletionResponse,
  UnifiedEmbeddingRequest,
  UnifiedEmbeddingResponse,
  UnifiedStreamRequest,
  UnifiedStreamChunk,
  ProviderCapabilities,
  CostEstimate,
  TokenEstimate,
  AIRequest,
  ModelInfo,
  ProviderError,
  URLCitation,
  Citation
} from './types';

export {
  RateLimitError,
  AuthenticationError,
  ValidationError,
  CircuitOpenError,
  AllProvidersFailedError
} from './types';

// Export base adapter avoiding conflicts
export { AIProviderAdapter } from './base-adapter';

// Export enhanced contracts (avoiding conflicts)
export type {
  IAIService,
  CompletionRequest as EnhancedCompletionRequest,
  CompletionResponse as EnhancedCompletionResponse,
  EmbeddingRequest as EnhancedEmbeddingRequest,
  EmbeddingResponse as EnhancedEmbeddingResponse,
  Provider,
  HealthStatus,
  ServiceMetrics,
  Message,
  Tool,
  ToolCall
} from './service-contracts';

// Export error handling (avoiding conflicts)
export {
  AIServiceError,
  ProviderUnavailableError,
  InvalidRequestError,
  CostLimitExceededError,
  ProviderTimeoutError,
  ModelNotFoundError,
  QuotaExceededError,
  CircuitBreakerOpenError,
  ContentFilterError,
  NetworkError,
  ProviderConfigurationError,
  DefaultErrorHandler,
  ErrorUtils
} from './errors';

// Export ImageRouter types
export type {
  ImageRouterConfig,
  UnifiedMediaGenerationRequest,
  UnifiedImageGenerationRequest,
  UnifiedVideoGenerationRequest,
  UnifiedImageEditRequest,
  UnifiedMediaGenerationResponse,
  MediaCostEstimate,
  ImageRouterCapabilities,
  ImageRouterModel,
  ImageRouterModelPerformance,
  ImageRouterMetrics,
  ImageRouterError,
  ImageGenerationRequest,
  ImageGenerationResponse,
  VideoGenerationRequest,
  VideoGenerationResponse,
  ImageEditRequest,
  ImageEditResponse,
  ImageRouterModelType,
  ImageRouterQuality,
  ImageRouterResponseFormat,
  ImageRouterCostOptimization
} from './imagerouter-types';

export {
  isImageGenerationRequest,
  isVideoGenerationRequest,
  isImageEditRequest,
  IMAGEROUTER_CONSTANTS
} from './imagerouter-types';