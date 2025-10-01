'use client'

/**
 * Unified Error Handling System
 * 
 * Entry point for the centralized error handling system that brings together:
 * - Error registry for centralized reporting and analytics
 * - Smart error routing with context-aware handlers
 * - Centralized configuration management
 * - Integration with existing error handlers
 */

// Core exports
export { getErrorConfig, updateErrorConfig, resetErrorConfig } from './error-config'
export { 
  saveEnvVarOverrides,
  loadEnvVarOverrides,
  updateEnvVars,
  resetToEnvDefaults,
  getCurrentEnvVarOverrides,
  validateEnvVar,
  getAvailableEnvVars,
  type EnvVarOverrides
} from '../config/error-config-persistence'
export { 
  getErrorRegistry, 
  reportError, 
  addBreadcrumb, 
  getErrorAnalytics,
  type ErrorContext,
  type ErrorReport,
  type BreadcrumbEntry,
  type ErrorAnalytics
} from './error-registry'
export { 
  getErrorRouter, 
  routeError, 
  registerErrorHandler,
  type ErrorHandler,
  type ErrorHandlerResult,
  type ErrorAction,
  type ErrorRoutingRule
} from './error-router'
export { initializeErrorHandlers, createLegacyErrorWrapper } from './integration-adapter'

// Re-export existing error types for compatibility
export { 
  ErrorSeverity, 
  ErrorCategory, 
  type EnhancedError 
} from '@/hooks/use-error-handler'

/**
 * Initialize the unified error handling system
 * 
 * Call this once in your application root to set up all error handlers
 * and routing rules.
 */
export function initializeUnifiedErrorHandling(): void {
  try {
    // Initialize all error handlers
    initializeErrorHandlers()
    
    // Log successful initialization
    console.log('🚨 Unified Error Handling System initialized successfully')
    console.log('✅ Features enabled:')
    console.log('   • Centralized error registry & analytics')
    console.log('   • Smart error routing by context')
    console.log('   • Automatic error correlation')
    console.log('   • Circuit breaker patterns')
    console.log('   • Auto-recovery strategies')
    console.log('   • Real-time health monitoring')
    console.log('   • Centralized configuration')
    console.log('   • Multi-layer error boundaries')
    
  } catch (error) {
    console.error('Failed to initialize unified error handling:', error)
  }
}

/**
 * Quick error reporting function for simple use cases
 */
export function quickReportError(
  error: Error | string,
  options: {
    source?: ErrorContext['source']
    feature?: string
    severity?: import('@/hooks/use-error-handler').ErrorSeverity
    metadata?: Record<string, any>
  } = {}
): void {
  const errorObj = typeof error === 'string' ? new Error(error) : error
  const enhancedError = errorObj as import('@/hooks/use-error-handler').EnhancedError
  
  // Set severity if provided
  if (options.severity) {
    enhancedError.severity = options.severity
  }
  
  const context: ErrorContext = {
    source: options.source || 'system',
    feature: options.feature,
    metadata: options.metadata,
  }
  
  reportError(enhancedError, context)
}

/**
 * Create a scoped error reporter for a specific feature/component
 */
export function createScopedErrorReporter(
  defaultSource: ErrorContext['source'],
  defaultFeature?: string
) {
  return {
    reportError: (
      error: Error | string,
      context: Partial<ErrorContext> = {}
    ) => {
      const errorObj = typeof error === 'string' ? new Error(error) : error
      const enhancedError = errorObj as import('@/hooks/use-error-handler').EnhancedError
      
      const fullContext: ErrorContext = {
        source: defaultSource,
        feature: defaultFeature,
        ...context,
      }
      
      return reportError(enhancedError, fullContext)
    },
    
    addBreadcrumb: (
      message: string,
      data?: Record<string, any>
    ) => {
      addBreadcrumb({
        category: 'user-action',
        message,
        level: 'info',
        data: {
          feature: defaultFeature,
          source: defaultSource,
          ...data,
        },
      })
    },
    
    routeError: async (
      error: Error | string,
      context: Partial<ErrorContext> = {}
    ) => {
      const errorObj = typeof error === 'string' ? new Error(error) : error
      const enhancedError = errorObj as import('@/hooks/use-error-handler').EnhancedError
      
      const fullContext: ErrorContext = {
        source: defaultSource,
        feature: defaultFeature,
        ...context,
      }
      
      return routeError(errorObj, fullContext)
    }
  }
}

/**
 * Error handling utilities for common scenarios
 */
export const ErrorUtils = {
  /**
   * Handle API errors with automatic retry logic
   */
  handleApiError: async (
    error: Error,
    options: {
      url?: string
      method?: string
      status?: number
      feature?: string
      allowRetry?: boolean
    } = {}
  ) => {
    const context: ErrorContext = {
      source: 'api',
      feature: options.feature,
      url: options.url,
      metadata: {
        method: options.method,
        status: options.status,
      },
    }
    
    return routeError(error, context)
  },
  
  /**
   * Handle AI service errors with fallback strategies
   */
  handleAIError: async (
    error: Error,
    options: {
      provider?: string
      model?: string
      cost?: number
      feature?: string
      allowFallback?: boolean
    } = {}
  ) => {
    const context: ErrorContext = {
      source: 'ai-service',
      feature: options.feature,
      metadata: {
        provider: options.provider,
        model: options.model,
        cost: options.cost,
        allowFallback: options.allowFallback,
      },
    }
    
    return routeError(error, context)
  },
  
  /**
   * Handle network errors with offline detection
   */
  handleNetworkError: async (
    error: Error,
    options: {
      url?: string
      feature?: string
    } = {}
  ) => {
    const context: ErrorContext = {
      source: 'network',
      feature: options.feature,
      url: options.url,
      metadata: {
        offline: !navigator.onLine,
      },
    }
    
    return routeError(error, context)
  },
  
  /**
   * Handle UI component errors
   */
  handleComponentError: async (
    error: Error,
    options: {
      component?: string
      componentStack?: string
      feature?: string
    } = {}
  ) => {
    const context: ErrorContext = {
      source: 'ui-component',
      feature: options.feature || options.component,
      componentStack: options.componentStack,
      metadata: {
        component: options.component,
      },
    }
    
    return routeError(error, context)
  },
}

/**
 * React hook for using the unified error handling system
 */
export function useUnifiedErrorHandling(
  defaultSource: ErrorContext['source'] = 'ui-component',
  defaultFeature?: string
) {
  const reporter = createScopedErrorReporter(defaultSource, defaultFeature)
  
  return {
    ...reporter,
    
    // Additional React-specific utilities
    handleAsyncError: (asyncFn: () => Promise<any>) => {
      return async () => {
        try {
          return await asyncFn()
        } catch (error) {
          reporter.routeError(error as Error)
          throw error // Re-throw for component error boundaries
        }
      }
    },
    
    withErrorHandling: <T extends (...args: any[]) => any>(fn: T): T => {
      return ((...args: any[]) => {
        try {
          const result = fn(...args)
          
          // Handle promises
          if (result && typeof result.catch === 'function') {
            return result.catch((error: Error) => {
              reporter.routeError(error)
              throw error
            })
          }
          
          return result
        } catch (error) {
          reporter.routeError(error as Error)
          throw error
        }
      }) as T
    },
  }
}

// Default export for convenience
export default {
  initialize: initializeUnifiedErrorHandling,
  reportError: quickReportError,
  createReporter: createScopedErrorReporter,
  utils: ErrorUtils,
}