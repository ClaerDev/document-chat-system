'use client'

import { cacheManager, CacheOptions, CacheResult } from './index'
import cacheService from './redis'
import { useGlobalError } from '@/contexts/global-error-context'
import { useErrorHandler, ErrorSeverity, ErrorCategory, EnhancedError } from '@/hooks/use-error-handler'
import { useCircuitBreaker } from '@/hooks/use-circuit-breaker'
import { useNotifications } from '@/contexts/notification-context'

// Enhanced cache options
export interface EnhancedCacheOptions extends CacheOptions {
  // Error handling options
  fallbackData?: any
  silentFail?: boolean
  retryAttempts?: number
  retryDelay?: number
  circuitBreakerKey?: string
  
  // User experience options
  showLoadingToUser?: boolean
  showErrorToUser?: boolean
  userFriendlyErrorMessage?: string
  
  // Performance options
  backgroundRefresh?: boolean
  staleWhileRevalidate?: boolean
  priorityLevel?: 'low' | 'medium' | 'high' | 'critical'
  
  // Monitoring options
  trackPerformance?: boolean
  errorContext?: Record<string, any>
}

// Cache operation result with enhanced metadata
export interface EnhancedCacheResult<T> extends CacheResult<T> {
  performance: {
    duration: number
    cacheHit: boolean
    source: 'cache' | 'network' | 'fallback'
    retryCount: number
  }
  errors?: EnhancedError[]
  warnings?: string[]
  degraded?: boolean
}

// Cache health metrics
export interface CacheHealthMetrics {
  hitRate: number
  errorRate: number
  avgResponseTime: number
  connectionStatus: 'connected' | 'disconnected' | 'degraded'
  lastError?: EnhancedError
  circuitBreakerStatus: Record<string, 'open' | 'closed' | 'half_open'>
}

class EnhancedCacheManager {
  private metricsWindow = new Map<string, Array<{ timestamp: number; hit: boolean; duration: number; error?: boolean }>>()
  private readonly METRICS_WINDOW_SIZE = 100
  private readonly HEALTH_CHECK_INTERVAL = 30000 // 30 seconds
  private healthCheckTimer?: NodeJS.Timeout
  
  constructor() {
    this.startHealthMonitoring()
  }

  /**
   * Enhanced cache get with comprehensive error handling
   */
  async get<T>(
    key: string, 
    options: EnhancedCacheOptions = {}
  ): Promise<T | null> {
    const startTime = performance.now()
    const circuitBreakerKey = options.circuitBreakerKey || `cache:${key}`
    
    try {
      // Check circuit breaker if specified
      if (options.circuitBreakerKey) {
        const breakerState = this.getCircuitBreakerState(circuitBreakerKey)
        if (breakerState === 'open') {
          this.handleCacheError(
            new Error('Cache circuit breaker is open'),
            key,
            options,
            'circuit_breaker_open'
          )
          return options.fallbackData || null
        }
      }

      const result = await cacheManager.get<T>(key, options)
      const duration = performance.now() - startTime

      // Record successful cache operation
      this.recordMetrics(key, { 
        timestamp: Date.now(), 
        hit: result !== null, 
        duration 
      })

      // Handle cache miss with user notification if needed
      if (result === null && options.showLoadingToUser) {
        this.notifyUser(
          'info',
          'Loading Fresh Data',
          'Fetching the latest information for you...',
          { duration: 2000 }
        )
      }

      return result
    } catch (error) {
      const duration = performance.now() - startTime
      return this.handleCacheError(error as Error, key, options, 'get_operation', duration)
    }
  }

  /**
   * Enhanced cache set with error recovery
   */
  async set<T>(
    key: string, 
    value: T, 
    options: EnhancedCacheOptions = {}
  ): Promise<boolean> {
    const startTime = performance.now()
    
    try {
      const success = await cacheManager.set(key, value, options)
      const duration = performance.now() - startTime

      this.recordMetrics(key, { 
        timestamp: Date.now(), 
        hit: false, 
        duration,
        error: !success
      })

      if (!success && !options.silentFail) {
        this.handleCacheError(
          new Error('Cache set operation failed'),
          key,
          options,
          'set_operation',
          duration
        )
      }

      return success
    } catch (error) {
      const duration = performance.now() - startTime
      this.handleCacheError(error as Error, key, options, 'set_operation', duration)
      return false
    }
  }

  /**
   * Enhanced withCache with comprehensive error handling and user experience
   */
  async withCache<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: EnhancedCacheOptions = {}
  ): Promise<EnhancedCacheResult<T>> {
    const startTime = performance.now()
    const errors: EnhancedError[] = []
    const warnings: string[] = []
    let degraded = false
    let retryCount = 0
    const maxRetries = options.retryAttempts || 3

    // Show loading indicator if requested
    if (options.showLoadingToUser) {
      this.notifyUser(
        'info',
        'Loading Data',
        this.getLoadingMessage(options.priorityLevel || 'medium'),
        { duration: 1000 }
      )
    }

    // Try cache first
    let cached: T | null = null
    let cacheError: Error | null = null
    
    try {
      cached = await this.get<T>(key, options)
    } catch (error) {
      cacheError = error as Error
      warnings.push('Cache read failed, fetching from source')
    }

    // If we have cached data and it's not stale, return it
    if (cached !== null && !options.backgroundRefresh) {
      const duration = performance.now() - startTime
      
      return {
        data: cached,
        cached: true,
        key,
        performance: {
          duration,
          cacheHit: true,
          source: 'cache',
          retryCount: 0
        },
        errors: cacheError ? [this.createEnhancedError(cacheError, key, 'cache_read')] : undefined,
        warnings: warnings.length > 0 ? warnings : undefined
      }
    }

    // Fetch from source with retry logic
    let fetchedData: T | null = null
    let fetchError: Error | null = null

    while (retryCount <= maxRetries && fetchedData === null) {
      try {
        fetchedData = await fetcher()
        
        // Try to cache the result
        if (fetchedData !== null) {
          try {
            await this.set(key, fetchedData, options)
          } catch (setCacheError) {
            warnings.push('Failed to cache fetched data')
            degraded = true
          }
        }
        
        break
      } catch (error) {
        fetchError = error as Error
        retryCount++
        
        if (retryCount <= maxRetries) {
          const delay = this.calculateRetryDelay(retryCount, options.retryDelay || 1000)
          warnings.push(`Fetch attempt ${retryCount} failed, retrying in ${delay}ms`)
          
          // Show retry notification to user
          if (options.showErrorToUser && retryCount === 1) {
            this.notifyUser(
              'warning',
              'Slow Connection Detected',
              'Retrying to get fresh data...',
              { duration: 3000 }
            )
          }
          
          await this.delay(delay)
        }
      }
    }

    const duration = performance.now() - startTime

    // Handle final result
    if (fetchedData !== null) {
      // Success
      return {
        data: fetchedData,
        cached: false,
        key,
        performance: {
          duration,
          cacheHit: false,
          source: 'network',
          retryCount
        },
        warnings: warnings.length > 0 ? warnings : undefined,
        degraded
      }
    } else if (cached !== null && options.staleWhileRevalidate) {
      // Return stale data with warning
      warnings.push('Returning stale data due to fetch failure')
      degraded = true
      
      if (options.showErrorToUser) {
        this.notifyUser(
          'warning',
          'Using Cached Data',
          'Unable to fetch fresh data, showing cached version',
          { duration: 5000 }
        )
      }

      return {
        data: cached,
        cached: true,
        key,
        performance: {
          duration,
          cacheHit: true,
          source: 'cache',
          retryCount
        },
        errors: fetchError ? [this.createEnhancedError(fetchError, key, 'fetch_failed')] : undefined,
        warnings,
        degraded: true
      }
    } else if (options.fallbackData !== undefined) {
      // Use fallback data
      warnings.push('Using fallback data due to cache and fetch failures')
      
      if (options.showErrorToUser) {
        this.notifyUser(
          'error',
          'Data Unavailable',
          options.userFriendlyErrorMessage || 'Unable to load data, showing default content',
          { persistent: true }
        )
      }

      return {
        data: options.fallbackData,
        cached: false,
        key,
        performance: {
          duration,
          cacheHit: false,
          source: 'fallback',
          retryCount
        },
        errors: [
          ...(cacheError ? [this.createEnhancedError(cacheError, key, 'cache_failed')] : []),
          ...(fetchError ? [this.createEnhancedError(fetchError, key, 'fetch_failed')] : [])
        ],
        warnings,
        degraded: true
      }
    } else {
      // Complete failure
      const error = fetchError || cacheError || new Error('Unknown cache/fetch failure')
      this.handleCacheError(error, key, options, 'complete_failure', duration)
      throw error
    }
  }

  /**
   * Get cache health metrics
   */
  getHealthMetrics(): CacheHealthMetrics {
    const allMetrics = Array.from(this.metricsWindow.values()).flat()
    const recentMetrics = allMetrics.filter(m => Date.now() - m.timestamp < 300000) // Last 5 minutes

    if (recentMetrics.length === 0) {
      return {
        hitRate: 0,
        errorRate: 0,
        avgResponseTime: 0,
        connectionStatus: 'disconnected',
        circuitBreakerStatus: {}
      }
    }

    const hits = recentMetrics.filter(m => m.hit).length
    const errors = recentMetrics.filter(m => m.error).length
    const totalDuration = recentMetrics.reduce((sum, m) => sum + m.duration, 0)

    const hitRate = hits / recentMetrics.length
    const errorRate = errors / recentMetrics.length
    const avgResponseTime = totalDuration / recentMetrics.length

    const status = cacheService.getStatus()
    let connectionStatus: 'connected' | 'disconnected' | 'degraded' = 'disconnected'
    
    if (status.connected) {
      connectionStatus = errorRate > 0.1 ? 'degraded' : 'connected'
    }

    return {
      hitRate,
      errorRate,
      avgResponseTime,
      connectionStatus,
      circuitBreakerStatus: {} // Would be populated by circuit breaker integration
    }
  }

  /**
   * Handle cache errors with comprehensive context and user notification
   */
  private handleCacheError(
    error: Error,
    cacheKey: string,
    options: EnhancedCacheOptions,
    operation: string,
    duration?: number
  ): any {
    // Record error metrics
    this.recordMetrics(cacheKey, {
      timestamp: Date.now(),
      hit: false,
      duration: duration || 0,
      error: true
    })

    // Create enhanced error
    const enhancedError = this.createEnhancedError(error, cacheKey, operation, options)

    // Report to global error context if available
    if (typeof window !== 'undefined') {
      // Client-side error reporting would go here
      console.error('Cache Error:', enhancedError)
    }

    // User notification
    if (options.showErrorToUser && !options.silentFail) {
      const severity = this.categorizeErrorSeverity(error, operation)
      
      switch (severity) {
        case 'critical':
          this.notifyUser(
            'error',
            'Service Temporarily Unavailable',
            options.userFriendlyErrorMessage || 'We\'re experiencing technical difficulties. Please try again in a few moments.',
            { persistent: true }
          )
          break
          
        case 'high':
          this.notifyUser(
            'warning',
            'Performance Issue',
            'Some features may be slower than usual. We\'re working to resolve this.',
            { duration: 8000 }
          )
          break
          
        case 'medium':
          if (operation !== 'set_operation') { // Don't notify for cache write failures
            this.notifyUser(
              'info',
              'Loading...',
              'Fetching fresh data for you.',
              { duration: 3000 }
            )
          }
          break
      }
    }

    return options.fallbackData || null
  }

  /**
   * Create enhanced error with cache context
   */
  private createEnhancedError(
    error: Error,
    cacheKey: string,
    operation: string,
    options?: EnhancedCacheOptions
  ): EnhancedError {
    const enhancedError = error as EnhancedError
    
    enhancedError.errorId = `cache_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    enhancedError.category = ErrorCategory.EXTERNAL_SERVICE
    enhancedError.severity = this.categorizeErrorSeverity(error, operation)
    enhancedError.feature = 'Cache System'
    enhancedError.timestamp = new Date()
    enhancedError.retryable = operation !== 'circuit_breaker_open'
    enhancedError.metadata = {
      cacheKey,
      operation,
      cacheStatus: cacheService.getStatus(),
      ...options?.errorContext
    }

    return enhancedError
  }

  /**
   * Categorize error severity based on operation and error type
   */
  private categorizeErrorSeverity(error: Error, operation: string): ErrorSeverity {
    if (operation === 'complete_failure' || error.message.includes('circuit breaker')) {
      return ErrorSeverity.CRITICAL
    }
    
    if (operation === 'get_operation' || error.message.includes('connection')) {
      return ErrorSeverity.HIGH
    }
    
    if (operation === 'set_operation') {
      return ErrorSeverity.MEDIUM // Cache write failures are less critical
    }
    
    return ErrorSeverity.MEDIUM
  }

  /**
   * Get user-friendly loading message based on priority
   */
  private getLoadingMessage(priority: 'low' | 'medium' | 'high' | 'critical'): string {
    switch (priority) {
      case 'critical':
        return 'Loading critical data...'
      case 'high':
        return 'Loading important information...'
      case 'medium':
        return 'Loading data...'
      case 'low':
        return 'Loading additional content...'
      default:
        return 'Loading...'
    }
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  private calculateRetryDelay(attempt: number, baseDelay: number): number {
    return Math.min(baseDelay * Math.pow(2, attempt - 1), 30000) // Max 30 seconds
  }

  /**
   * Simple delay utility
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Record performance and error metrics
   */
  private recordMetrics(key: string, metric: { timestamp: number; hit: boolean; duration: number; error?: boolean }) {
    if (!this.metricsWindow.has(key)) {
      this.metricsWindow.set(key, [])
    }
    
    const metrics = this.metricsWindow.get(key)!
    metrics.push(metric)
    
    // Keep only recent metrics
    if (metrics.length > this.METRICS_WINDOW_SIZE) {
      metrics.shift()
    }
  }

  /**
   * Get circuit breaker state (placeholder for integration)
   */
  private getCircuitBreakerState(key: string): 'open' | 'closed' | 'half_open' {
    // This would integrate with the actual circuit breaker implementation
    return 'closed'
  }

  /**
   * Notify user through notification system
   */
  private notifyUser(
    type: 'info' | 'warning' | 'error',
    title: string,
    message: string,
    options: { duration?: number; persistent?: boolean } = {}
  ) {
    // This would integrate with the actual notification system
    console.log(`[${type.toUpperCase()}] ${title}: ${message}`)
  }

  /**
   * Start background health monitoring
   */
  private startHealthMonitoring() {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer)
    }

    this.healthCheckTimer = setInterval(() => {
      const metrics = this.getHealthMetrics()
      
      // Check for degraded performance
      if (metrics.errorRate > 0.2) { // 20% error rate
        console.warn('Cache performance degraded:', metrics)
      }
      
      // Clean up old metrics
      this.cleanupOldMetrics()
    }, this.HEALTH_CHECK_INTERVAL)
  }

  /**
   * Clean up old metrics to prevent memory leaks
   */
  private cleanupOldMetrics() {
    const cutoff = Date.now() - 3600000 // 1 hour ago
    
    this.metricsWindow.forEach((metrics, key) => {
      const filteredMetrics = metrics.filter(m => m.timestamp > cutoff)
      if (filteredMetrics.length === 0) {
        this.metricsWindow.delete(key)
      } else {
        this.metricsWindow.set(key, filteredMetrics)
      }
    })
  }

  /**
   * Cleanup resources
   */
  destroy() {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer)
      this.healthCheckTimer = undefined
    }
    this.metricsWindow.clear()
  }
}

// Export enhanced cache manager
export const enhancedCacheManager = new EnhancedCacheManager()
export default enhancedCacheManager