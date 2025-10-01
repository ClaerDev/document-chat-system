'use client'

import { EnhancedError, ErrorSeverity, ErrorCategory } from '@/hooks/use-error-handler'
import { ErrorContext, ErrorReport, getErrorRegistry, addBreadcrumb } from './error-registry'
import { getErrorConfig } from '@/lib/config/error-config'

/**
 * Smart Error Router
 * 
 * Central dispatcher that routes errors to appropriate handlers based on
 * error type, source, and context. Provides unified interface for all
 * error handling while preserving specialized domain logic.
 */

// Error handler interface
export interface ErrorHandler {
  canHandle(error: Error, context: ErrorContext): boolean
  handle(error: EnhancedError, context: ErrorContext): Promise<ErrorHandlerResult>
  priority: number // Higher number = higher priority
  name: string
}

// Error handler result
export interface ErrorHandlerResult {
  handled: boolean
  shouldRetry: boolean
  retryDelay?: number
  userMessage?: string
  actions?: ErrorAction[]
  metadata?: Record<string, any>
}

// Error action interface
export interface ErrorAction {
  type: 'retry' | 'fallback' | 'redirect' | 'notify' | 'recover' | 'escalate'
  label: string
  handler: () => Promise<void> | void
  priority: 'low' | 'medium' | 'high'
}

// Error routing rules
interface ErrorRoutingRule {
  id: string
  matcher: (error: Error, context: ErrorContext) => boolean
  handlerName: string
  priority: number
  enabled: boolean
}

/**
 * Error Router Class
 */
class ErrorRouter {
  private handlers: Map<string, ErrorHandler> = new Map()
  private routingRules: ErrorRoutingRule[] = []
  private errorRegistry = getErrorRegistry()
  private defaultHandler: ErrorHandler

  constructor() {
    this.setupDefaultHandler()
    this.setupDefaultRules()
  }

  /**
   * Register an error handler
   */
  registerHandler(handler: ErrorHandler): void {
    this.handlers.set(handler.name, handler)
    console.log(`Registered error handler: ${handler.name}`)
  }

  /**
   * Unregister an error handler
   */
  unregisterHandler(handlerName: string): void {
    this.handlers.delete(handlerName)
    console.log(`Unregistered error handler: ${handlerName}`)
  }

  /**
   * Add a routing rule
   */
  addRoutingRule(rule: ErrorRoutingRule): void {
    this.routingRules.push(rule)
    this.routingRules.sort((a, b) => b.priority - a.priority)
  }

  /**
   * Remove a routing rule
   */
  removeRoutingRule(ruleId: string): void {
    this.routingRules = this.routingRules.filter(rule => rule.id !== ruleId)
  }

  /**
   * Route and handle an error
   */
  async routeError(
    error: Error, 
    context: ErrorContext,
    options: {
      skipRegistry?: boolean
      skipBreadcrumbs?: boolean
      customHandler?: string
    } = {}
  ): Promise<ErrorHandlerResult> {
    const startTime = Date.now()
    
    try {
      // Add breadcrumb if not skipped
      if (!options.skipBreadcrumbs) {
        addBreadcrumb({
          category: 'error',
          message: `Error occurred: ${error.message}`,
          level: 'error',
          data: {
            source: context.source,
            feature: context.feature,
            errorType: error.constructor.name,
          },
        })
      }

      // Enhance error with additional metadata
      const enhancedError = this.enhanceError(error, context)

      // Report to registry if not skipped
      let errorReport: ErrorReport | undefined
      if (!options.skipRegistry) {
        errorReport = this.errorRegistry.reportError(enhancedError, context)
      }

      // Find appropriate handler
      const handler = options.customHandler
        ? this.handlers.get(options.customHandler)
        : this.findHandler(enhancedError, context)

      if (!handler) {
        console.warn(`No handler found for error: ${error.message}`)
        return this.handleWithDefault(enhancedError, context)
      }

      // Handle the error
      const result = await handler.handle(enhancedError, context)

      // Add handling metadata
      const handlingTime = Date.now() - startTime
      result.metadata = {
        ...result.metadata,
        handlerName: handler.name,
        handlingTimeMs: handlingTime,
        errorReportId: errorReport?.id,
      }

      // Log successful handling
      if (getErrorConfig().development.enableConsoleLogging) {
        console.log(`Error handled by ${handler.name} in ${handlingTime}ms:`, result)
      }

      return result

    } catch (handlingError) {
      console.error('Error while handling error:', handlingError)
      
      // Fallback to default handler
      const enhancedError = this.enhanceError(error, context)
      return this.handleWithDefault(enhancedError, context)
    }
  }

  /**
   * Get all registered handlers
   */
  getHandlers(): ErrorHandler[] {
    return Array.from(this.handlers.values()).sort((a, b) => b.priority - a.priority)
  }

  /**
   * Get routing rules
   */
  getRoutingRules(): ErrorRoutingRule[] {
    return [...this.routingRules]
  }

  /**
   * Test routing for an error (without actually handling)
   */
  testRouting(error: Error, context: ErrorContext): {
    matchingRules: ErrorRoutingRule[]
    selectedHandler: ErrorHandler | null
    wouldUseDefault: boolean
  } {
    const matchingRules = this.routingRules.filter(rule => 
      rule.enabled && rule.matcher(error, context)
    )

    let selectedHandler: ErrorHandler | null = null
    
    for (const rule of matchingRules) {
      const handler = this.handlers.get(rule.handlerName)
      if (handler && handler.canHandle(error, context)) {
        selectedHandler = handler
        break
      }
    }

    // If no rules match, try to find handler by capability
    if (!selectedHandler) {
      selectedHandler = this.findHandlerByCapability(error, context)
    }

    return {
      matchingRules,
      selectedHandler,
      wouldUseDefault: !selectedHandler,
    }
  }

  // Private methods

  private enhanceError(error: Error, context: ErrorContext): EnhancedError {
    const enhancedError = error as EnhancedError

    // Generate error ID if not present
    if (!enhancedError.errorId) {
      enhancedError.errorId = `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }

    // Set timestamp if not present
    if (!enhancedError.timestamp) {
      enhancedError.timestamp = new Date()
    }

    // Auto-categorize if not categorized
    if (!enhancedError.category) {
      enhancedError.category = this.categorizeError(error, context)
    }

    // Auto-assess severity if not set
    if (!enhancedError.severity) {
      enhancedError.severity = this.assessSeverity(error, context)
    }

    // Set context-specific fields
    enhancedError.feature = enhancedError.feature || context.feature
    enhancedError.userId = enhancedError.userId || context.userId
    enhancedError.organizationId = enhancedError.organizationId || context.organizationId

    // Determine if retryable
    if (enhancedError.retryable === undefined) {
      enhancedError.retryable = this.isRetryable(enhancedError, context)
    }

    return enhancedError
  }

  private categorizeError(error: Error, context: ErrorContext): ErrorCategory {
    const message = error.message.toLowerCase()
    const stack = error.stack?.toLowerCase() || ''

    // Context-based categorization
    switch (context.source) {
      case 'network':
        return ErrorCategory.NETWORK
      case 'database':
        return ErrorCategory.DATA_INTEGRITY
      case 'ai-service':
        return ErrorCategory.EXTERNAL_SERVICE
    }

    // Message-based categorization
    if (message.includes('fetch') || message.includes('network') || message.includes('connection')) {
      return ErrorCategory.NETWORK
    }
    if (message.includes('unauthorized') || message.includes('authentication')) {
      return ErrorCategory.AUTHENTICATION
    }
    if (message.includes('forbidden') || message.includes('permission')) {
      return ErrorCategory.AUTHORIZATION
    }
    if (message.includes('validation') || message.includes('invalid')) {
      return ErrorCategory.VALIDATION
    }
    if (message.includes('timeout') || message.includes('slow')) {
      return ErrorCategory.PERFORMANCE
    }
    if (message.includes('api') || message.includes('service')) {
      return ErrorCategory.EXTERNAL_SERVICE
    }

    // Stack-based categorization
    if (stack.includes('prisma') || stack.includes('database')) {
      return ErrorCategory.DATA_INTEGRITY
    }
    if (stack.includes('auth') || stack.includes('clerk')) {
      return ErrorCategory.AUTHENTICATION
    }

    return ErrorCategory.UNKNOWN
  }

  private assessSeverity(error: Error, context: ErrorContext): ErrorSeverity {
    const category = (error as EnhancedError).category || this.categorizeError(error, context)
    
    // High severity for critical systems
    if (context.source === 'database' || context.source === 'system') {
      return ErrorSeverity.HIGH
    }

    // Category-based severity
    switch (category) {
      case ErrorCategory.DATA_INTEGRITY:
      case ErrorCategory.SYSTEM:
        return ErrorSeverity.CRITICAL
      
      case ErrorCategory.AUTHENTICATION:
      case ErrorCategory.AUTHORIZATION:
        return ErrorSeverity.HIGH
      
      case ErrorCategory.NETWORK:
      case ErrorCategory.EXTERNAL_SERVICE:
      case ErrorCategory.PERFORMANCE:
        return ErrorSeverity.MEDIUM
      
      case ErrorCategory.VALIDATION:
      case ErrorCategory.USER_INPUT:
        return ErrorSeverity.LOW
      
      default:
        return ErrorSeverity.MEDIUM
    }
  }

  private isRetryable(error: EnhancedError, context: ErrorContext): boolean {
    const category = error.category || ErrorCategory.UNKNOWN

    switch (category) {
      case ErrorCategory.NETWORK:
      case ErrorCategory.PERFORMANCE:
      case ErrorCategory.EXTERNAL_SERVICE:
        return true
      
      case ErrorCategory.AUTHENTICATION:
      case ErrorCategory.AUTHORIZATION:
      case ErrorCategory.DATA_INTEGRITY:
      case ErrorCategory.VALIDATION:
      case ErrorCategory.USER_INPUT:
        return false
      
      default:
        return context.source !== 'ui-component' // UI errors usually aren't retryable
    }
  }

  private findHandler(error: EnhancedError, context: ErrorContext): ErrorHandler | null {
    // First, try routing rules
    for (const rule of this.routingRules) {
      if (rule.enabled && rule.matcher(error, context)) {
        const handler = this.handlers.get(rule.handlerName)
        if (handler && handler.canHandle(error, context)) {
          return handler
        }
      }
    }

    // Fallback to capability-based matching
    return this.findHandlerByCapability(error, context)
  }

  private findHandlerByCapability(error: Error, context: ErrorContext): ErrorHandler | null {
    const candidates = Array.from(this.handlers.values())
      .filter(handler => handler.canHandle(error, context))
      .sort((a, b) => b.priority - a.priority)

    return candidates[0] || null
  }

  private async handleWithDefault(error: EnhancedError, context: ErrorContext): Promise<ErrorHandlerResult> {
    return this.defaultHandler.handle(error, context)
  }

  private setupDefaultHandler(): void {
    this.defaultHandler = {
      name: 'default',
      priority: 0,
      canHandle: () => true,
      handle: async (error: EnhancedError, context: ErrorContext): Promise<ErrorHandlerResult> => {
        console.error('Default error handler:', error.message)
        
        return {
          handled: true,
          shouldRetry: error.retryable || false,
          retryDelay: error.retryable ? 1000 : undefined,
          userMessage: this.generateDefaultUserMessage(error, context),
          actions: error.retryable ? [{
            type: 'retry',
            label: 'Try Again',
            handler: () => {
              // Default retry logic would be implemented by the caller
              console.log('Default retry action')
            },
            priority: 'medium',
          }] : [],
          metadata: {
            handledBy: 'default',
            fallback: true,
          },
        }
      },
    }
  }

  private generateDefaultUserMessage(error: EnhancedError, context: ErrorContext): string {
    if (error.userMessage) return error.userMessage

    switch (error.category) {
      case ErrorCategory.NETWORK:
        return 'Connection problem. Please check your internet and try again.'
      case ErrorCategory.AUTHENTICATION:
        return 'Please sign in to continue.'
      case ErrorCategory.AUTHORIZATION:
        return 'You don\'t have permission to perform this action.'
      case ErrorCategory.VALIDATION:
        return 'Please check your input and try again.'
      case ErrorCategory.EXTERNAL_SERVICE:
        return 'Service temporarily unavailable. Please try again later.'
      default:
        return 'An unexpected error occurred. Please try again or contact support.'
    }
  }

  private setupDefaultRules(): void {
    // AI Service errors
    this.addRoutingRule({
      id: 'ai-service-errors',
      matcher: (error, context) => context.source === 'ai-service',
      handlerName: 'ai-service',
      priority: 100,
      enabled: true,
    })

    // API errors
    this.addRoutingRule({
      id: 'api-errors',
      matcher: (error, context) => context.source === 'api',
      handlerName: 'api',
      priority: 90,
      enabled: true,
    })

    // Network errors
    this.addRoutingRule({
      id: 'network-errors',
      matcher: (error, context) => 
        context.source === 'network' || 
        error.message.toLowerCase().includes('fetch') ||
        error.message.toLowerCase().includes('network'),
      handlerName: 'network',
      priority: 80,
      enabled: true,
    })

    // Authentication errors
    this.addRoutingRule({
      id: 'auth-errors',
      matcher: (error, context) => 
        error.message.toLowerCase().includes('unauthorized') ||
        error.message.toLowerCase().includes('authentication') ||
        (error as EnhancedError).category === ErrorCategory.AUTHENTICATION,
      handlerName: 'authentication',
      priority: 85,
      enabled: true,
    })

    // UI Component errors
    this.addRoutingRule({
      id: 'ui-component-errors',
      matcher: (error, context) => context.source === 'ui-component',
      handlerName: 'ui-component',
      priority: 70,
      enabled: true,
    })

    // Database errors
    this.addRoutingRule({
      id: 'database-errors',
      matcher: (error, context) => 
        context.source === 'database' ||
        error.stack?.includes('prisma') ||
        error.message.toLowerCase().includes('database'),
      handlerName: 'database',
      priority: 95,
      enabled: true,
    })
  }
}

// Singleton instance
let errorRouter: ErrorRouter | null = null

/**
 * Get the global error router instance
 */
export function getErrorRouter(): ErrorRouter {
  if (!errorRouter) {
    errorRouter = new ErrorRouter()
  }
  return errorRouter
}

/**
 * Convenience function to route an error
 */
export function routeError(
  error: Error, 
  context: ErrorContext,
  options?: { skipRegistry?: boolean; skipBreadcrumbs?: boolean; customHandler?: string }
): Promise<ErrorHandlerResult> {
  return getErrorRouter().routeError(error, context, options)
}

/**
 * Convenience function to register a handler
 */
export function registerErrorHandler(handler: ErrorHandler): void {
  getErrorRouter().registerHandler(handler)
}

// Export types
export type { ErrorHandler, ErrorHandlerResult, ErrorAction, ErrorRoutingRule }

// Default export
export default getErrorRouter