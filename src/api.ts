/**
 * Standardized API Response Types
 * 
 * These types ensure consistent error handling and response formats
 * across all API endpoints in the application.
 */

// Base API response structure
export interface BaseApiResponse {
  success: boolean
  message?: string
  timestamp?: string
}

// Success response type
export interface ApiSuccessResponse<T = any> extends BaseApiResponse {
  success: true
  data: T
  cached?: boolean
  responseTime?: number
}

// Error response type
export interface ApiErrorResponse extends BaseApiResponse {
  success: false
  error: string
  code?: string
  details?: any
  statusCode?: number
  stack?: string // Only in development
}

// Paginated response wrapper
export interface PaginatedResponse<T> {
  items: T[]
  pagination: {
    total: number
    page: number
    limit: number
    offset: number
    hasMore: boolean
    totalPages?: number
  }
}

// Common error codes used throughout the application
export enum ApiErrorCode {
  // Authentication & Authorization
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  INVALID_TOKEN = 'INVALID_TOKEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  
  // Validation
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  
  // Resources
  NOT_FOUND = 'NOT_FOUND',
  ALREADY_EXISTS = 'ALREADY_EXISTS',
  DUPLICATE_ERROR = 'DUPLICATE_ERROR',
  CONFLICT_ERROR = 'CONFLICT_ERROR',
  
  // Database
  DATABASE_ERROR = 'DATABASE_ERROR',
  DATABASE_CONNECTION_ERROR = 'DATABASE_CONNECTION_ERROR',
  CONSTRAINT_ERROR = 'CONSTRAINT_ERROR',
  
  // Rate Limiting
  RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR',
  TOO_MANY_REQUESTS = 'TOO_MANY_REQUESTS',
  
  // Usage & Billing
  USAGE_LIMIT_EXCEEDED = 'USAGE_LIMIT_EXCEEDED',
  SUBSCRIPTION_REQUIRED = 'SUBSCRIPTION_REQUIRED',
  PAYMENT_REQUIRED = 'PAYMENT_REQUIRED',
  
  // Network & Performance
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  
  // Cache
  CACHE_ERROR = 'CACHE_ERROR',
  CACHE_MISS = 'CACHE_MISS',
  
  // External Services
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  API_INTEGRATION_ERROR = 'API_INTEGRATION_ERROR',
  
  // Generic
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

// HTTP Status Codes mapped to error types
export const HTTP_STATUS = {
  // Success
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,
  
  // Client Errors
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  PAYMENT_REQUIRED: 402,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  
  // Server Errors
  INTERNAL_SERVER_ERROR: 500,
  NOT_IMPLEMENTED: 501,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504
} as const

// Error context for debugging and monitoring
export interface ErrorContext {
  requestId?: string
  userId?: string
  organizationId?: string
  endpoint: string
  method: string
  userAgent?: string
  ip?: string
  correlationId?: string
  sessionId?: string
}

// Enhanced error response with context
export interface DetailedApiErrorResponse extends ApiErrorResponse {
  context?: ErrorContext
  retryable?: boolean
  retryAfter?: number
  helpUrl?: string
  supportTicketId?: string
}

// Validation error details
export interface ValidationErrorDetail {
  field: string
  message: string
  code: string
  value?: any
  constraint?: string
}

// Validation error response
export interface ValidationErrorResponse extends ApiErrorResponse {
  code: ApiErrorCode.VALIDATION_ERROR
  details: ValidationErrorDetail[]
}

// Network error response
export interface NetworkErrorResponse extends ApiErrorResponse {
  code: ApiErrorCode.NETWORK_ERROR
  isOffline?: boolean
  retryable: boolean
  retryAfter?: number
}

// Rate limit error response
export interface RateLimitErrorResponse extends ApiErrorResponse {
  code: ApiErrorCode.RATE_LIMIT_ERROR
  retryAfter: number
  limit: number
  remaining: number
  resetTime: string
}

// Usage limit error response
export interface UsageLimitErrorResponse extends ApiErrorResponse {
  code: ApiErrorCode.USAGE_LIMIT_EXCEEDED
  currentUsage: number
  limit: number
  resetTime: string
  upgradeUrl?: string
}

// Type guards for error responses
export function isApiErrorResponse(response: any): response is ApiErrorResponse {
  return response && typeof response === 'object' && response.success === false && typeof response.error === 'string'
}

export function isValidationErrorResponse(response: any): response is ValidationErrorResponse {
  return isApiErrorResponse(response) && response.code === ApiErrorCode.VALIDATION_ERROR && Array.isArray(response.details)
}

export function isNetworkErrorResponse(response: any): response is NetworkErrorResponse {
  return isApiErrorResponse(response) && response.code === ApiErrorCode.NETWORK_ERROR
}

export function isRateLimitErrorResponse(response: any): response is RateLimitErrorResponse {
  return isApiErrorResponse(response) && response.code === ApiErrorCode.RATE_LIMIT_ERROR
}

export function isUsageLimitErrorResponse(response: any): response is UsageLimitErrorResponse {
  return isApiErrorResponse(response) && response.code === ApiErrorCode.USAGE_LIMIT_EXCEEDED
}

// API endpoint pattern types
export type ApiMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

export interface ApiEndpoint {
  method: ApiMethod
  path: string
  description?: string
  requiresAuth?: boolean
  rateLimit?: {
    requests: number
    windowMs: number
  }
  usageTracking?: {
    type: string
    cost?: number
  }
}

// Webhook payload types
export interface WebhookPayload<T = any> {
  id: string
  type: string
  data: T
  timestamp: string
  version: string
  organizationId?: string
}

// File upload response
export interface FileUploadResponse {
  fileId: string
  filename: string
  size: number
  mimeType: string
  url: string
  uploadedAt: string
}

// Health check response
export interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  version?: string
  uptime?: number
  checks?: Record<string, {
    status: 'pass' | 'fail' | 'warn'
    message?: string
    responseTime?: number
  }>
}

// Bulk operation response
export interface BulkOperationResponse<T = any> {
  total: number
  successful: number
  failed: number
  results: Array<{
    id: string
    success: boolean
    data?: T
    error?: string
  }>
  errors?: Array<{
    id: string
    error: string
    code?: string
  }>
}

// Export operation response
export interface ExportResponse {
  exportId: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  format: 'csv' | 'excel' | 'pdf' | 'json'
  downloadUrl?: string
  expiresAt?: string
  recordCount?: number
  fileSize?: number
  createdAt: string
}

// Search response with facets
export interface SearchResponse<T> extends PaginatedResponse<T> {
  query: string
  facets?: Record<string, Array<{
    value: string
    count: number
  }>>
  suggestions?: string[]
  executionTime?: number
}