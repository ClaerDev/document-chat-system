'use client'

import { EnhancedError, ErrorSeverity, ErrorCategory } from '@/hooks/use-error-handler'
import { useGlobalError } from '@/contexts/global-error-context'
import { enhancedCacheManager } from '@/lib/cache/enhanced-cache-manager'
import { errorMonitor, ErrorCorrelation } from '@/lib/monitoring/error-monitor'

// Recovery strategy types
export enum RecoveryStrategy {
  CIRCUIT_BREAKER = 'circuit_breaker',
  CACHE_REFRESH = 'cache_refresh',
  SERVICE_RESTART = 'service_restart',
  FAILOVER = 'failover',
  RETRY_WITH_BACKOFF = 'retry_with_backoff',
  DEGRADE_GRACEFULLY = 'degrade_gracefully',
  CLEAR_STATE = 'clear_state',
  OFFLINE_MODE = 'offline_mode',
  PERFORMANCE_OPTIMIZATION = 'performance_optimization'
}

// Recovery action configuration
export interface RecoveryAction {
  id: string
  strategy: RecoveryStrategy
  description: string
  conditions: RecoveryCondition[]
  steps: RecoveryStep[]
  rollbackSteps?: RecoveryStep[]
  timeout: number
  retryCount: number
  priority: number
  dependencies?: string[]
}

// Conditions that trigger recovery
export interface RecoveryCondition {
  type: 'error_count' | 'error_rate' | 'pattern_match' | 'circuit_breaker' | 'health_score'
  operator: '>' | '<' | '=' | '>=' | '<='
  value: number | string
  timeWindow?: number
}

// Individual recovery step
export interface RecoveryStep {
  id: string
  name: string
  action: string
  parameters: Record<string, any>
  timeout: number
  critical: boolean
  retryable: boolean
  successCriteria?: SuccessCriteria[]
}

// Success criteria for recovery steps
export interface SuccessCriteria {
  type: 'error_reduction' | 'health_improvement' | 'service_response' | 'metric_threshold'
  target: number | string
  timeframe: number
}

// Recovery execution result
export interface RecoveryResult {
  actionId: string
  startTime: Date
  endTime?: Date
  status: 'running' | 'success' | 'failed' | 'cancelled' | 'timeout'
  steps: Array<{
    stepId: string
    status: 'pending' | 'running' | 'success' | 'failed' | 'skipped'
    result?: any
    error?: string
    duration?: number
  }>
  metrics: {
    errorsBefore: number
    errorsAfter: number
    healthBefore: number
    healthAfter: number
  }
  logs: string[]
}

// Predefined recovery actions
const RECOVERY_ACTIONS: RecoveryAction[] = [
  {
    id: 'circuit_breaker_all_services',
    strategy: RecoveryStrategy.CIRCUIT_BREAKER,
    description: 'Activate circuit breakers for all failing services',
    conditions: [
      {
        type: 'pattern_match',
        operator: '=',
        value: 'api_cascade_failure'
      }
    ],
    steps: [
      {
        id: 'identify_failing_services',
        name: 'Identify Failing Services',
        action: 'analyze_errors',
        parameters: { category: 'EXTERNAL_SERVICE', timeWindow: 600000 },
        timeout: 30000,
        critical: true,
        retryable: false
      },
      {
        id: 'activate_circuit_breakers',
        name: 'Activate Circuit Breakers',
        action: 'circuit_breaker',
        parameters: { mode: 'open', duration: 600000 },
        timeout: 10000,
        critical: true,
        retryable: true
      },
      {
        id: 'notify_users',
        name: 'Notify Users',
        action: 'notification',
        parameters: {
          title: 'Service Protection Activated',
          message: 'We\'ve temporarily disabled some services to maintain stability.',
          type: 'warning'
        },
        timeout: 5000,
        critical: false,
        retryable: true
      }
    ],
    timeout: 60000,
    retryCount: 2,
    priority: 1
  },
  
  {
    id: 'cache_warming_recovery',
    strategy: RecoveryStrategy.CACHE_REFRESH,
    description: 'Warm cache with critical data',
    conditions: [
      {
        type: 'error_count',
        operator: '>',
        value: 10,
        timeWindow: 300000
      }
    ],
    steps: [
      {
        id: 'clear_corrupted_cache',
        name: 'Clear Corrupted Cache',
        action: 'cache_clear',
        parameters: { pattern: 'critical:*' },
        timeout: 30000,
        critical: true,
        retryable: true
      },
      {
        id: 'warm_essential_data',
        name: 'Warm Essential Data',
        action: 'cache_warm',
        parameters: {
          endpoints: [
            '/api/profile',
            '/api/opportunities/featured',
            '/api/settings/user'
          ]
        },
        timeout: 120000,
        critical: false,
        retryable: true,
        successCriteria: [
          {
            type: 'service_response',
            target: 'success',
            timeframe: 60000
          }
        ]
      }
    ],
    timeout: 180000,
    retryCount: 1,
    priority: 2
  },
  
  {
    id: 'performance_optimization',
    strategy: RecoveryStrategy.PERFORMANCE_OPTIMIZATION,
    description: 'Optimize system performance under load',
    conditions: [
      {
        type: 'pattern_match',
        operator: '=',
        value: 'performance_degradation'
      }
    ],
    steps: [
      {
        id: 'reduce_cache_ttl',
        name: 'Reduce Cache TTL',
        action: 'cache_config',
        parameters: { defaultTTL: 1800 }, // 30 minutes instead of 1 hour
        timeout: 10000,
        critical: false,
        retryable: true
      },
      {
        id: 'enable_request_batching',
        name: 'Enable Request Batching',
        action: 'api_config',
        parameters: { batching: true, batchSize: 10 },
        timeout: 15000,
        critical: false,
        retryable: true
      },
      {
        id: 'activate_performance_mode',
        name: 'Activate Performance Mode',
        action: 'ui_config',
        parameters: { reducedAnimations: true, lazyLoading: true },
        timeout: 5000,
        critical: false,
        retryable: false
      }
    ],
    rollbackSteps: [
      {
        id: 'restore_cache_ttl',
        name: 'Restore Cache TTL',
        action: 'cache_config',
        parameters: { defaultTTL: 3600 },
        timeout: 10000,
        critical: false,
        retryable: true
      },
      {
        id: 'disable_request_batching',
        name: 'Disable Request Batching',
        action: 'api_config',
        parameters: { batching: false },
        timeout: 15000,
        critical: false,
        retryable: true
      }
    ],
    timeout: 60000,
    retryCount: 1,
    priority: 3
  },
  
  {
    id: 'enable_offline_mode',
    strategy: RecoveryStrategy.OFFLINE_MODE,
    description: 'Enable offline mode for network issues',
    conditions: [
      {
        type: 'pattern_match',
        operator: '=',
        value: 'network_degradation'
      }
    ],
    steps: [
      {
        id: 'activate_offline_mode',
        name: 'Activate Offline Mode',
        action: 'offline_mode',
        parameters: { enabled: true },
        timeout: 5000,
        critical: true,
        retryable: false
      },
      {
        id: 'cache_critical_data',
        name: 'Cache Critical Data',
        action: 'cache_offline_data',
        parameters: { priority: 'critical' },
        timeout: 60000,
        critical: false,
        retryable: true
      },
      {
        id: 'notify_offline_mode',
        name: 'Notify Offline Mode',
        action: 'notification',
        parameters: {
          title: 'Offline Mode Activated',
          message: 'You can continue working with cached data.',
          type: 'info',
          persistent: true
        },
        timeout: 5000,
        critical: false,
        retryable: true
      }
    ],
    timeout: 90000,
    retryCount: 1,
    priority: 4
  },
  
  {
    id: 'graceful_degradation',
    strategy: RecoveryStrategy.DEGRADE_GRACEFULLY,
    description: 'Gracefully degrade non-essential features',
    conditions: [
      {
        type: 'health_score',
        operator: '<',
        value: 60
      }
    ],
    steps: [
      {
        id: 'disable_analytics',
        name: 'Disable Analytics',
        action: 'feature_toggle',
        parameters: { feature: 'analytics', enabled: false },
        timeout: 5000,
        critical: false,
        retryable: false
      },
      {
        id: 'disable_realtime_updates',
        name: 'Disable Realtime Updates',
        action: 'feature_toggle',
        parameters: { feature: 'realtime', enabled: false },
        timeout: 5000,
        critical: false,
        retryable: false
      },
      {
        id: 'reduce_ui_complexity',
        name: 'Reduce UI Complexity',
        action: 'ui_config',
        parameters: { 
          animations: false, 
          backgroundImages: false,
          autoRefresh: false 
        },
        timeout: 5000,
        critical: false,
        retryable: false
      }
    ],
    timeout: 30000,
    retryCount: 1,
    priority: 5
  }
]

class AutoRecoveryManager {
  private activeRecoveries = new Map<string, RecoveryResult>()
  private recoveryHistory: RecoveryResult[] = []
  private readonly MAX_HISTORY = 100
  private monitoringInterval?: NodeJS.Timeout
  private readonly MONITORING_FREQUENCY = 15000 // 15 seconds

  constructor() {
    this.startMonitoring()
  }

  /**
   * Evaluate and trigger recovery actions based on system state
   */
  async evaluateRecovery(): Promise<RecoveryResult[]> {
    const analytics = errorMonitor.getAnalytics()
    const health = errorMonitor.assessSystemHealth()
    const correlations = errorMonitor.getCorrelations()
    
    const triggeredRecoveries: RecoveryResult[] = []

    for (const action of RECOVERY_ACTIONS) {
      // Skip if already running
      if (this.activeRecoveries.has(action.id)) {
        continue
      }

      // Check conditions
      if (await this.shouldTriggerRecovery(action, analytics, health, correlations)) {
        console.log(`Triggering recovery action: ${action.description}`)
        
        const result = await this.executeRecovery(action)
        triggeredRecoveries.push(result)
      }
    }

    return triggeredRecoveries
  }

  /**
   * Check if recovery action should be triggered
   */
  private async shouldTriggerRecovery(
    action: RecoveryAction,
    analytics: any,
    health: any,
    correlations: ErrorCorrelation[]
  ): Promise<boolean> {
    for (const condition of action.conditions) {
      switch (condition.type) {
        case 'error_count':
          if (!this.compareValues(analytics.totalErrors, condition.operator, condition.value)) {
            return false
          }
          break

        case 'error_rate':
          if (!this.compareValues(analytics.errorRate, condition.operator, condition.value)) {
            return false
          }
          break

        case 'health_score':
          if (!this.compareValues(health.score, condition.operator, condition.value)) {
            return false
          }
          break

        case 'pattern_match':
          const hasPattern = correlations.some(c => 
            c.pattern.id === condition.value && c.triggered
          )
          if (!hasPattern) {
            return false
          }
          break

        case 'circuit_breaker':
          // Check circuit breaker state
          // Implementation would depend on circuit breaker integration
          break
      }
    }

    return true
  }

  /**
   * Execute recovery action
   */
  private async executeRecovery(action: RecoveryAction): Promise<RecoveryResult> {
    const result: RecoveryResult = {
      actionId: action.id,
      startTime: new Date(),
      status: 'running',
      steps: action.steps.map(step => ({
        stepId: step.id,
        status: 'pending'
      })),
      metrics: {
        errorsBefore: errorMonitor.getAnalytics().totalErrors,
        errorsAfter: 0,
        healthBefore: errorMonitor.assessSystemHealth().score,
        healthAfter: 0
      },
      logs: [`Started recovery action: ${action.description}`]
    }

    this.activeRecoveries.set(action.id, result)

    try {
      // Execute steps sequentially
      for (let i = 0; i < action.steps.length; i++) {
        const step = action.steps[i]
        const stepResult = result.steps[i]
        
        stepResult.status = 'running'
        result.logs.push(`Executing step: ${step.name}`)

        try {
          const startTime = Date.now()
          const stepOutput = await this.executeStep(step)
          const duration = Date.now() - startTime

          stepResult.status = 'success'
          stepResult.result = stepOutput
          stepResult.duration = duration
          
          result.logs.push(`Step completed: ${step.name} (${duration}ms)`)

          // Check success criteria if defined
          if (step.successCriteria) {
            const success = await this.checkSuccessCriteria(step.successCriteria)
            if (!success && step.critical) {
              throw new Error(`Success criteria not met for critical step: ${step.name}`)
            }
          }

        } catch (error) {
          stepResult.status = 'failed'
          stepResult.error = (error as Error).message
          
          result.logs.push(`Step failed: ${step.name} - ${(error as Error).message}`)

          if (step.critical) {
            throw error
          } else {
            result.logs.push(`Non-critical step failed, continuing recovery`)
          }
        }
      }

      // Recovery completed successfully
      result.status = 'success'
      result.endTime = new Date()
      result.metrics.errorsAfter = errorMonitor.getAnalytics().totalErrors
      result.metrics.healthAfter = errorMonitor.assessSystemHealth().score
      
      result.logs.push(`Recovery completed successfully`)

    } catch (error) {
      result.status = 'failed'
      result.endTime = new Date()
      result.logs.push(`Recovery failed: ${(error as Error).message}`)

      // Attempt rollback if available
      if (action.rollbackSteps) {
        result.logs.push('Attempting rollback...')
        await this.executeRollback(action.rollbackSteps, result)
      }
    }

    // Cleanup
    this.activeRecoveries.delete(action.id)
    this.addToHistory(result)

    return result
  }

  /**
   * Execute individual recovery step
   */
  private async executeStep(step: RecoveryStep): Promise<any> {
    const timeout = new Promise((_, reject) => 
      setTimeout(() => reject(new Error(`Step timeout: ${step.name}`)), step.timeout)
    )

    const execution = this.performStepAction(step)

    return Promise.race([execution, timeout])
  }

  /**
   * Perform the actual step action
   */
  private async performStepAction(step: RecoveryStep): Promise<any> {
    switch (step.action) {
      case 'circuit_breaker':
        return this.executeCircuitBreakerAction(step.parameters)

      case 'cache_clear':
        return this.executeCacheClearAction(step.parameters)

      case 'cache_warm':
        return this.executeCacheWarmAction(step.parameters)

      case 'cache_config':
        return this.executeCacheConfigAction(step.parameters)

      case 'notification':
        return this.executeNotificationAction(step.parameters)

      case 'offline_mode':
        return this.executeOfflineModeAction(step.parameters)

      case 'feature_toggle':
        return this.executeFeatureToggleAction(step.parameters)

      case 'ui_config':
        return this.executeUIConfigAction(step.parameters)

      case 'api_config':
        return this.executeAPIConfigAction(step.parameters)

      case 'analyze_errors':
        return this.executeAnalyzeErrorsAction(step.parameters)

      default:
        throw new Error(`Unknown action: ${step.action}`)
    }
  }

  /**
   * Execute circuit breaker action
   */
  private async executeCircuitBreakerAction(params: any): Promise<any> {
    console.log(`Circuit breaker action: ${JSON.stringify(params)}`)
    // Implementation would integrate with actual circuit breaker system
    return { success: true, action: 'circuit_breaker', params }
  }

  /**
   * Execute cache clear action
   */
  private async executeCacheClearAction(params: any): Promise<any> {
    if (params.pattern) {
      // Clear cache by pattern
      console.log(`Clearing cache pattern: ${params.pattern}`)
      // Implementation would use cache manager's pattern clearing
    } else {
      await enhancedCacheManager.flush()
    }
    return { success: true, action: 'cache_clear', cleared: true }
  }

  /**
   * Execute cache warming action
   */
  private async executeCacheWarmAction(params: any): Promise<any> {
    const warmed = []
    for (const endpoint of params.endpoints || []) {
      try {
        // Simulate cache warming
        console.log(`Warming cache for: ${endpoint}`)
        warmed.push(endpoint)
      } catch (error) {
        console.warn(`Failed to warm cache for ${endpoint}:`, error)
      }
    }
    return { success: true, action: 'cache_warm', warmed }
  }

  /**
   * Execute cache configuration action
   */
  private async executeCacheConfigAction(params: any): Promise<any> {
    console.log(`Cache config update: ${JSON.stringify(params)}`)
    // Implementation would update cache configuration
    return { success: true, action: 'cache_config', params }
  }

  /**
   * Execute notification action
   */
  private async executeNotificationAction(params: any): Promise<any> {
    console.log(`Sending notification: ${params.title} - ${params.message}`)
    // Implementation would send actual notification
    return { success: true, action: 'notification', sent: true }
  }

  /**
   * Execute offline mode action
   */
  private async executeOfflineModeAction(params: any): Promise<any> {
    console.log(`Offline mode: ${params.enabled ? 'enabled' : 'disabled'}`)
    // Implementation would toggle offline mode
    return { success: true, action: 'offline_mode', enabled: params.enabled }
  }

  /**
   * Execute feature toggle action
   */
  private async executeFeatureToggleAction(params: any): Promise<any> {
    console.log(`Feature toggle: ${params.feature} = ${params.enabled}`)
    // Implementation would toggle feature flags
    return { success: true, action: 'feature_toggle', feature: params.feature, enabled: params.enabled }
  }

  /**
   * Execute UI configuration action
   */
  private async executeUIConfigAction(params: any): Promise<any> {
    console.log(`UI config update: ${JSON.stringify(params)}`)
    // Implementation would update UI settings
    return { success: true, action: 'ui_config', params }
  }

  /**
   * Execute API configuration action
   */
  private async executeAPIConfigAction(params: any): Promise<any> {
    console.log(`API config update: ${JSON.stringify(params)}`)
    // Implementation would update API settings
    return { success: true, action: 'api_config', params }
  }

  /**
   * Execute error analysis action
   */
  private async executeAnalyzeErrorsAction(params: any): Promise<any> {
    const analytics = errorMonitor.getAnalytics()
    const categoryErrors = analytics.errorsByCategory[params.category as ErrorCategory] || 0
    
    return {
      success: true,
      action: 'analyze_errors',
      category: params.category,
      count: categoryErrors,
      analysis: `Found ${categoryErrors} errors in category ${params.category}`
    }
  }

  /**
   * Execute rollback steps
   */
  private async executeRollback(rollbackSteps: RecoveryStep[], result: RecoveryResult): Promise<void> {
    for (const step of rollbackSteps) {
      try {
        await this.executeStep(step)
        result.logs.push(`Rollback step completed: ${step.name}`)
      } catch (error) {
        result.logs.push(`Rollback step failed: ${step.name} - ${(error as Error).message}`)
      }
    }
  }

  /**
   * Check success criteria
   */
  private async checkSuccessCriteria(criteria: SuccessCriteria[]): Promise<boolean> {
    for (const criterion of criteria) {
      switch (criterion.type) {
        case 'error_reduction':
          // Check if error rate has reduced
          const currentErrors = errorMonitor.getAnalytics().totalErrors
          if (currentErrors >= Number(criterion.target)) {
            return false
          }
          break

        case 'health_improvement':
          const health = errorMonitor.assessSystemHealth().score
          if (health < Number(criterion.target)) {
            return false
          }
          break

        case 'service_response':
          // Implementation would check if services are responding
          break

        case 'metric_threshold':
          // Implementation would check specific metrics
          break
      }
    }

    return true
  }

  /**
   * Compare values based on operator
   */
  private compareValues(actual: number, operator: string, expected: number | string): boolean {
    const expectedNum = Number(expected)
    
    switch (operator) {
      case '>': return actual > expectedNum
      case '<': return actual < expectedNum
      case '=': return actual === expectedNum
      case '>=': return actual >= expectedNum
      case '<=': return actual <= expectedNum
      default: return false
    }
  }

  /**
   * Add result to history
   */
  private addToHistory(result: RecoveryResult): void {
    this.recoveryHistory.push(result)
    
    if (this.recoveryHistory.length > this.MAX_HISTORY) {
      this.recoveryHistory = this.recoveryHistory.slice(-this.MAX_HISTORY)
    }
  }

  /**
   * Start background monitoring
   */
  private startMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
    }

    this.monitoringInterval = setInterval(async () => {
      try {
        await this.evaluateRecovery()
      } catch (error) {
        console.error('Recovery evaluation failed:', error)
      }
    }, this.MONITORING_FREQUENCY)
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
      this.monitoringInterval = undefined
    }
  }

  /**
   * Get active recoveries
   */
  getActiveRecoveries(): Map<string, RecoveryResult> {
    return new Map(this.activeRecoveries)
  }

  /**
   * Get recovery history
   */
  getRecoveryHistory(): RecoveryResult[] {
    return [...this.recoveryHistory]
  }

  /**
   * Manually trigger recovery action
   */
  async triggerRecovery(actionId: string): Promise<RecoveryResult> {
    const action = RECOVERY_ACTIONS.find(a => a.id === actionId)
    if (!action) {
      throw new Error(`Recovery action not found: ${actionId}`)
    }

    return this.executeRecovery(action)
  }

  /**
   * Cancel active recovery
   */
  cancelRecovery(actionId: string): boolean {
    const recovery = this.activeRecoveries.get(actionId)
    if (recovery) {
      recovery.status = 'cancelled'
      recovery.endTime = new Date()
      recovery.logs.push('Recovery cancelled by user')
      
      this.activeRecoveries.delete(actionId)
      this.addToHistory(recovery)
      
      return true
    }
    return false
  }
}

// Export singleton instance
export const autoRecoveryManager = new AutoRecoveryManager()
export default autoRecoveryManager