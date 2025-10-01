'use client'

import { ErrorHandler, ErrorHandlerResult, ErrorAction, registerErrorHandler } from './error-router'
import { ErrorContext, addBreadcrumb } from './error-registry'
import { EnhancedError, ErrorSeverity, ErrorCategory } from '@/hooks/use-error-handler'
import { getErrorConfig } from '@/lib/config/error-config'

/**
 * Integration Adapter for Existing Error Handlers
 * 
 * Bridges existing error handling systems with the new unified
 * error routing and registry system.
 */

// AI Service Error Handler
class AIServiceErrorHandler implements ErrorHandler {
  name = 'ai-service'
  priority = 100

  canHandle(error: Error, context: ErrorContext): boolean {
    return context.source === 'ai-service' || 
           error.message.includes('AI') ||
           error.message.includes('provider') ||
           error.message.includes('rate limit') ||
           error.message.includes('quota')
  }

  async handle(error: EnhancedError, context: ErrorContext): Promise<ErrorHandlerResult> {
    const config = getErrorConfig()
    
    addBreadcrumb({
      category: 'error',
      message: `AI service error: ${error.message}`,
      level: 'error',
      data: {
        provider: context.metadata?.provider,
        model: context.metadata?.model,
        cost: context.metadata?.cost,
      },
    })

    // Check if this is a rate limit error
    const isRateLimit = error.message.toLowerCase().includes('rate limit')
    const isQuotaExceeded = error.message.toLowerCase().includes('quota')
    
    let retryDelay = config.retry.baseDelay
    if (isRateLimit) {
      retryDelay = Math.min(retryDelay * 5, config.retry.maxDelay) // Longer delay for rate limits
    }

    const actions: ErrorAction[] = []
    
    // Add retry action if appropriate
    if (error.retryable && !isQuotaExceeded) {
      actions.push({
        type: 'retry',
        label: isRateLimit ? 'Retry Later' : 'Retry',
        handler: async () => {
          console.log('Retrying AI service request...')
          // Actual retry logic would be implemented by the caller
        },
        priority: 'high',
      })
    }

    // Add fallback action for AI services
    if (context.metadata?.allowFallback !== false) {
      actions.push({
        type: 'fallback',
        label: 'Try Different Provider',
        handler: async () => {
          console.log('Switching to fallback AI provider...')
          // Fallback logic would be implemented by the caller
        },
        priority: 'medium',
      })
    }

    return {
      handled: true,
      shouldRetry: error.retryable && !isQuotaExceeded,
      retryDelay,
      userMessage: this.generateAIServiceUserMessage(error, isRateLimit, isQuotaExceeded),
      actions,
      metadata: {
        handlerType: 'ai-service',
        circuitBreakerTriggered: context.metadata?.circuitBreakerOpen,
        provider: context.metadata?.provider,
      },
    }
  }

  private generateAIServiceUserMessage(error: EnhancedError, isRateLimit: boolean, isQuotaExceeded: boolean): string {
    if (isQuotaExceeded) {
      return 'AI service quota exceeded. Please try again later or contact support.'
    }
    if (isRateLimit) {
      return 'AI service is temporarily busy. Please wait a moment and try again.'
    }
    if (error.userMessage) {
      return error.userMessage
    }
    return 'AI service temporarily unavailable. Trying alternative provider...'
  }
}

// API Error Handler
class APIErrorHandler implements ErrorHandler {
  name = 'api'
  priority = 90

  canHandle(error: Error, context: ErrorContext): boolean {
    return context.source === 'api' || 
           error.message.includes('fetch') ||
           error.message.includes('HTTP') ||
           error.message.includes('API')
  }

  async handle(error: EnhancedError, context: ErrorContext): Promise<ErrorHandlerResult> {
    const config = getErrorConfig()
    
    addBreadcrumb({
      category: 'network',
      message: `API error: ${error.message}`,
      level: 'error',
      data: {
        url: context.url,
        method: context.metadata?.method,
        status: context.metadata?.status,
      },
    })

    const isNetworkError = error.message.toLowerCase().includes('network') || 
                          error.message.toLowerCase().includes('fetch')
    const isServerError = context.metadata?.status >= 500
    const isClientError = context.metadata?.status >= 400 && context.metadata?.status < 500

    const shouldRetry = isNetworkError || isServerError
    const retryDelay = isNetworkError ? config.retry.baseDelay * 2 : config.retry.baseDelay

    const actions: ErrorAction[] = []
    
    if (shouldRetry) {
      actions.push({
        type: 'retry',
        label: 'Retry Request',
        handler: async () => {
          console.log('Retrying API request...')
        },
        priority: 'high',
      })
    }

    if (isClientError && context.metadata?.status === 401) {
      actions.push({
        type: 'redirect',
        label: 'Sign In Again',
        handler: async () => {
          window.location.href = '/auth/signin'
        },
        priority: 'high',
      })
    }

    return {
      handled: true,
      shouldRetry,
      retryDelay,
      userMessage: this.generateAPIUserMessage(error, context),
      actions,
      metadata: {
        handlerType: 'api',
        statusCode: context.metadata?.status,
        endpoint: context.url,
      },
    }
  }

  private generateAPIUserMessage(error: EnhancedError, context: ErrorContext): string {
    const status = context.metadata?.status
    
    if (status === 401) {
      return 'Your session has expired. Please sign in again.'
    }
    if (status === 403) {
      return 'You don\'t have permission to perform this action.'
    }
    if (status === 404) {
      return 'The requested resource was not found.'
    }
    if (status >= 500) {
      return 'Server error occurred. Please try again in a moment.'
    }
    if (error.message.toLowerCase().includes('network')) {
      return 'Network connection problem. Please check your internet and try again.'
    }
    
    return error.userMessage || 'Request failed. Please try again.'
  }
}

// Network Error Handler
class NetworkErrorHandler implements ErrorHandler {
  name = 'network'
  priority = 80

  canHandle(error: Error, context: ErrorContext): boolean {
    return context.source === 'network' || 
           error.message.toLowerCase().includes('fetch') ||
           error.message.toLowerCase().includes('network') ||
           error.message.toLowerCase().includes('connection')
  }

  async handle(error: EnhancedError, context: ErrorContext): Promise<ErrorHandlerResult> {
    const config = getErrorConfig()
    
    addBreadcrumb({
      category: 'network',
      message: `Network error: ${error.message}`,
      level: 'error',
      data: {
        url: context.url,
        offline: !navigator.onLine,
      },
    })

    const isOffline = !navigator.onLine
    const retryDelay = isOffline ? config.retry.maxDelay : config.retry.baseDelay

    const actions: ErrorAction[] = []
    
    actions.push({
      type: 'retry',
      label: isOffline ? 'Retry When Online' : 'Retry',
      handler: async () => {
        console.log('Retrying network request...')
      },
      priority: 'high',
    })

    if (isOffline) {
      actions.push({
        type: 'fallback',
        label: 'Work Offline',
        handler: async () => {
          console.log('Switching to offline mode...')
        },
        priority: 'medium',
      })
    }

    return {
      handled: true,
      shouldRetry: true,
      retryDelay,
      userMessage: isOffline 
        ? 'You appear to be offline. Please check your connection and try again.'
        : 'Network connection problem. Please try again.',
      actions,
      metadata: {
        handlerType: 'network',
        offline: isOffline,
      },
    }
  }
}

// Authentication Error Handler
class AuthenticationErrorHandler implements ErrorHandler {
  name = 'authentication'
  priority = 85

  canHandle(error: Error, context: ErrorContext): boolean {
    return error.message.toLowerCase().includes('unauthorized') ||
           error.message.toLowerCase().includes('authentication') ||
           (error as EnhancedError).category === ErrorCategory.AUTHENTICATION ||
           context.metadata?.status === 401
  }

  async handle(error: EnhancedError, context: ErrorContext): Promise<ErrorHandlerResult> {
    addBreadcrumb({
      category: 'user-action',
      message: 'Authentication error occurred',
      level: 'error',
      data: {
        url: context.url,
        userId: context.userId,
      },
    })

    const actions: ErrorAction[] = [
      {
        type: 'redirect',
        label: 'Sign In',
        handler: async () => {
          // Clear any stale auth data
          localStorage.removeItem('auth-token')
          window.location.href = '/auth/signin'
        },
        priority: 'high',
      }
    ]

    return {
      handled: true,
      shouldRetry: false,
      userMessage: 'Your session has expired. Please sign in again.',
      actions,
      metadata: {
        handlerType: 'authentication',
        requiresAuth: true,
      },
    }
  }
}

// UI Component Error Handler
class UIComponentErrorHandler implements ErrorHandler {
  name = 'ui-component'
  priority = 70

  canHandle(error: Error, context: ErrorContext): boolean {
    return context.source === 'ui-component' ||
           error.stack?.includes('react') ||
           error.message.includes('component')
  }

  async handle(error: EnhancedError, context: ErrorContext): Promise<ErrorHandlerResult> {
    addBreadcrumb({
      category: 'error',
      message: `UI component error: ${error.message}`,
      level: 'error',
      data: {
        component: context.feature,
        componentStack: context.componentStack,
      },
    })

    const actions: ErrorAction[] = [
      {
        type: 'retry',
        label: 'Reload Component',
        handler: async () => {
          console.log('Reloading component...')
          // Component reload logic would be handled by error boundary
        },
        priority: 'medium',
      },
      {
        type: 'fallback',
        label: 'Refresh Page',
        handler: async () => {
          window.location.reload()
        },
        priority: 'low',
      }
    ]

    return {
      handled: true,
      shouldRetry: true,
      retryDelay: 1000,
      userMessage: `The ${context.feature || 'component'} encountered an error. Please try reloading.`,
      actions,
      metadata: {
        handlerType: 'ui-component',
        component: context.feature,
      },
    }
  }
}

// Database Error Handler
class DatabaseErrorHandler implements ErrorHandler {
  name = 'database'
  priority = 95

  canHandle(error: Error, context: ErrorContext): boolean {
    return context.source === 'database' ||
           error.stack?.includes('prisma') ||
           error.message.toLowerCase().includes('database') ||
           error.message.toLowerCase().includes('connection')
  }

  async handle(error: EnhancedError, context: ErrorContext): Promise<ErrorHandlerResult> {
    addBreadcrumb({
      category: 'error',
      message: `Database error: ${error.message}`,
      level: 'error',
      data: {
        operation: context.metadata?.operation,
        table: context.metadata?.table,
      },
    })

    const isConnectionError = error.message.toLowerCase().includes('connection')
    const isConstraintError = error.message.toLowerCase().includes('constraint')

    const shouldRetry = isConnectionError && !isConstraintError
    const retryDelay = isConnectionError ? 2000 : 1000

    const actions: ErrorAction[] = []
    
    if (shouldRetry) {
      actions.push({
        type: 'retry',
        label: 'Retry Operation',
        handler: async () => {
          console.log('Retrying database operation...')
        },
        priority: 'high',
      })
    }

    return {
      handled: true,
      shouldRetry,
      retryDelay,
      userMessage: isConstraintError 
        ? 'Data validation failed. Please check your input.'
        : 'Database temporarily unavailable. Please try again.',
      actions,
      metadata: {
        handlerType: 'database',
        connectionError: isConnectionError,
        constraintError: isConstraintError,
      },
    }
  }
}

/**
 * Initialize all error handlers
 */
export function initializeErrorHandlers(): void {
  // Register all handlers with the router
  registerErrorHandler(new AIServiceErrorHandler())
  registerErrorHandler(new APIErrorHandler())
  registerErrorHandler(new NetworkErrorHandler())
  registerErrorHandler(new AuthenticationErrorHandler())
  registerErrorHandler(new UIComponentErrorHandler())
  registerErrorHandler(new DatabaseErrorHandler())

  console.log('✅ Error handlers initialized and registered with unified routing system')
}

/**
 * Legacy error handler wrapper
 * Provides backward compatibility for existing error handling code
 */
export function createLegacyErrorWrapper(handlerName: string) {
  return {
    handleError: async (error: Error, context: Partial<ErrorContext> = {}) => {
      const { routeError } = await import('./error-router')
      
      const fullContext: ErrorContext = {
        source: 'system',
        ...context,
      }

      return routeError(error, fullContext, { customHandler: handlerName })
    }
  }
}

// Export individual handlers for direct access if needed
export {
  AIServiceErrorHandler,
  APIErrorHandler,
  NetworkErrorHandler,
  AuthenticationErrorHandler,
  UIComponentErrorHandler,
  DatabaseErrorHandler,
}