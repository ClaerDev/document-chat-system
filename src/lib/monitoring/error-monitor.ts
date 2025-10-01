'use client'

import { EnhancedError, ErrorSeverity, ErrorCategory } from '@/hooks/use-error-handler'
import { useGlobalError } from '@/contexts/global-error-context'
import { useNotifications } from '@/contexts/notification-context'

// Error correlation patterns
export interface ErrorPattern {
  id: string
  name: string
  description: string
  matcher: (errors: EnhancedError[]) => boolean
  severity: ErrorSeverity
  threshold: number
  timeWindow: number // milliseconds
  actions: ErrorPatternAction[]
}

// Actions to take when patterns are detected
export interface ErrorPatternAction {
  type: 'notification' | 'circuit_breaker' | 'auto_recovery' | 'escalation' | 'log'
  config: any
  delay?: number
}

// Error correlation result
export interface ErrorCorrelation {
  pattern: ErrorPattern
  matchedErrors: EnhancedError[]
  confidence: number
  timestamp: Date
  triggered: boolean
}

// Error analytics data
export interface ErrorAnalytics {
  totalErrors: number
  errorsByCategory: Record<ErrorCategory, number>
  errorsBySeverity: Record<ErrorSeverity, number>
  errorsByFeature: Record<string, number>
  errorRate: number // errors per hour
  trends: {
    increasing: boolean
    percentage: number
    period: 'hour' | 'day' | 'week'
  }
  topErrors: Array<{
    message: string
    count: number
    lastOccurred: Date
  }>
  patterns: ErrorCorrelation[]
}

// System health assessment
export interface SystemHealthAssessment {
  score: number // 0-100
  status: 'healthy' | 'degraded' | 'critical'
  issues: Array<{
    severity: ErrorSeverity
    description: string
    impact: string
    recommendation: string
  }>
  predictions: Array<{
    type: 'error_spike' | 'system_overload' | 'service_degradation'
    probability: number
    timeframe: string
    preventiveActions: string[]
  }>
}

// Predefined error patterns
const ERROR_PATTERNS: ErrorPattern[] = [
  {
    id: 'auth_failure_burst',
    name: 'Authentication Failure Burst',
    description: 'Multiple authentication failures in short time',
    matcher: (errors) => {
      const authErrors = errors.filter(e => 
        e.category === ErrorCategory.AUTHENTICATION && 
        Date.now() - (e.timestamp?.getTime() || 0) < 300000 // 5 minutes
      )
      return authErrors.length >= 5
    },
    severity: ErrorSeverity.HIGH,
    threshold: 5,
    timeWindow: 300000,
    actions: [
      {
        type: 'notification',
        config: {
          title: 'Security Alert',
          message: 'Multiple authentication failures detected',
          persistent: true
        }
      },
      {
        type: 'circuit_breaker',
        config: { service: 'auth', duration: 600000 }, // 10 minutes
        delay: 60000 // 1 minute delay
      }
    ]
  },
  
  {
    id: 'api_cascade_failure',
    name: 'API Cascade Failure',
    description: 'Multiple API endpoints failing simultaneously',
    matcher: (errors) => {
      const apiErrors = errors.filter(e => 
        e.category === ErrorCategory.EXTERNAL_SERVICE &&
        Date.now() - (e.timestamp?.getTime() || 0) < 600000 // 10 minutes
      )
      const uniqueServices = new Set(apiErrors.map(e => e.feature))
      return uniqueServices.size >= 3 && apiErrors.length >= 10
    },
    severity: ErrorSeverity.CRITICAL,
    threshold: 10,
    timeWindow: 600000,
    actions: [
      {
        type: 'notification',
        config: {
          title: 'System Alert: Multiple Service Failures',
          message: 'Cascade failure detected across multiple services',
          persistent: true
        }
      },
      {
        type: 'auto_recovery',
        config: { strategy: 'circuit_breaker_all_services' }
      },
      {
        type: 'escalation',
        config: { level: 'critical', notify: ['admin', 'ops'] }
      }
    ]
  },
  
  {
    id: 'network_degradation',
    name: 'Network Degradation Pattern',
    description: 'Network-related errors trending upward',
    matcher: (errors) => {
      const networkErrors = errors.filter(e => 
        e.category === ErrorCategory.NETWORK &&
        Date.now() - (e.timestamp?.getTime() || 0) < 1800000 // 30 minutes
      )
      return networkErrors.length >= 8
    },
    severity: ErrorSeverity.MEDIUM,
    threshold: 8,
    timeWindow: 1800000,
    actions: [
      {
        type: 'notification',
        config: {
          title: 'Network Performance Notice',
          message: 'Network connectivity issues detected',
          persistent: false
        }
      },
      {
        type: 'auto_recovery',
        config: { strategy: 'enable_offline_mode' }
      }
    ]
  },
  
  {
    id: 'validation_error_spike',
    name: 'Validation Error Spike',
    description: 'Unusual increase in validation errors',
    matcher: (errors) => {
      const validationErrors = errors.filter(e => 
        e.category === ErrorCategory.VALIDATION &&
        Date.now() - (e.timestamp?.getTime() || 0) < 900000 // 15 minutes
      )
      return validationErrors.length >= 15
    },
    severity: ErrorSeverity.MEDIUM,
    threshold: 15,
    timeWindow: 900000,
    actions: [
      {
        type: 'notification',
        config: {
          title: 'Data Quality Alert',
          message: 'Increased validation errors may indicate data quality issues',
          persistent: false
        }
      },
      {
        type: 'log',
        config: { level: 'warning', details: 'validation_spike_analysis' }
      }
    ]
  },
  
  {
    id: 'performance_degradation',
    name: 'Performance Degradation',
    description: 'System performance consistently poor',
    matcher: (errors) => {
      const perfErrors = errors.filter(e => 
        e.category === ErrorCategory.PERFORMANCE &&
        Date.now() - (e.timestamp?.getTime() || 0) < 1200000 // 20 minutes
      )
      return perfErrors.length >= 6
    },
    severity: ErrorSeverity.HIGH,
    threshold: 6,
    timeWindow: 1200000,
    actions: [
      {
        type: 'notification',
        config: {
          title: 'Performance Alert',
          message: 'System performance degradation detected',
          persistent: true
        }
      },
      {
        type: 'auto_recovery',
        config: { strategy: 'performance_optimization' }
      }
    ]
  }
]

class ErrorMonitor {
  private errorHistory: EnhancedError[] = []
  private readonly MAX_HISTORY = 1000
  private correlations: ErrorCorrelation[] = []
  private readonly MAX_CORRELATIONS = 50
  private monitoringInterval?: NodeJS.Timeout
  private readonly MONITORING_FREQUENCY = 30000 // 30 seconds
  
  constructor() {
    this.startMonitoring()
  }

  /**
   * Add error to monitoring system
   */
  addError(error: EnhancedError): void {
    // Add to history
    this.errorHistory.push(error)
    
    // Trim history to prevent memory issues
    if (this.errorHistory.length > this.MAX_HISTORY) {
      this.errorHistory = this.errorHistory.slice(-this.MAX_HISTORY)
    }

    // Immediate pattern check for critical errors
    if (error.severity === ErrorSeverity.CRITICAL) {
      this.checkPatterns()
    }
  }

  /**
   * Analyze errors and detect patterns
   */
  checkPatterns(): ErrorCorrelation[] {
    const newCorrelations: ErrorCorrelation[] = []
    
    for (const pattern of ERROR_PATTERNS) {
      try {
        // Get relevant errors within time window
        const windowStart = Date.now() - pattern.timeWindow
        const relevantErrors = this.errorHistory.filter(error => 
          error.timestamp && error.timestamp.getTime() >= windowStart
        )

        // Check if pattern matches
        if (pattern.matcher(relevantErrors)) {
          const confidence = this.calculatePatternConfidence(pattern, relevantErrors)
          
          // Check if we've already triggered this pattern recently
          const recentCorrelation = this.correlations.find(c => 
            c.pattern.id === pattern.id &&
            Date.now() - c.timestamp.getTime() < pattern.timeWindow
          )

          if (!recentCorrelation) {
            const correlation: ErrorCorrelation = {
              pattern,
              matchedErrors: relevantErrors.filter(e => this.errorMatchesPattern(e, pattern)),
              confidence,
              timestamp: new Date(),
              triggered: confidence >= 0.8 // Trigger actions if confidence >= 80%
            }

            newCorrelations.push(correlation)
            
            // Execute actions if triggered
            if (correlation.triggered) {
              this.executePatternActions(correlation)
            }
          }
        }
      } catch (error) {
        console.error(`Error checking pattern ${pattern.id}:`, error)
      }
    }

    // Add new correlations
    this.correlations.push(...newCorrelations)
    
    // Trim correlations
    if (this.correlations.length > this.MAX_CORRELATIONS) {
      this.correlations = this.correlations.slice(-this.MAX_CORRELATIONS)
    }

    return newCorrelations
  }

  /**
   * Calculate confidence score for pattern match
   */
  private calculatePatternConfidence(pattern: ErrorPattern, errors: EnhancedError[]): number {
    const matchingErrors = errors.filter(e => this.errorMatchesPattern(e, pattern))
    const baseConfidence = Math.min(matchingErrors.length / pattern.threshold, 1.0)
    
    // Boost confidence based on recency and frequency
    const recentErrors = matchingErrors.filter(e => 
      e.timestamp && Date.now() - e.timestamp.getTime() < pattern.timeWindow / 2
    )
    const recencyBoost = recentErrors.length / matchingErrors.length * 0.2
    
    return Math.min(baseConfidence + recencyBoost, 1.0)
  }

  /**
   * Check if error matches pattern criteria
   */
  private errorMatchesPattern(error: EnhancedError, pattern: ErrorPattern): boolean {
    // This would be more sophisticated in practice
    return pattern.matcher([error])
  }

  /**
   * Execute actions for triggered pattern
   */
  private executePatternActions(correlation: ErrorCorrelation): void {
    console.log(`Executing actions for pattern: ${correlation.pattern.name}`)
    
    correlation.pattern.actions.forEach(action => {
      const delay = action.delay || 0
      
      setTimeout(() => {
        this.executeAction(action, correlation)
      }, delay)
    })
  }

  /**
   * Execute specific action
   */
  private executeAction(action: ErrorPatternAction, correlation: ErrorCorrelation): void {
    try {
      switch (action.type) {
        case 'notification':
          this.sendNotification(action.config, correlation)
          break
          
        case 'circuit_breaker':
          this.triggerCircuitBreaker(action.config)
          break
          
        case 'auto_recovery':
          this.initiateAutoRecovery(action.config, correlation)
          break
          
        case 'escalation':
          this.escalateIssue(action.config, correlation)
          break
          
        case 'log':
          this.logCorrelation(action.config, correlation)
          break
          
        default:
          console.warn(`Unknown action type: ${action.type}`)
      }
    } catch (error) {
      console.error(`Failed to execute action ${action.type}:`, error)
    }
  }

  /**
   * Send user notification
   */
  private sendNotification(config: any, correlation: ErrorCorrelation): void {
    // This would integrate with the notification system
    console.log(`NOTIFICATION: ${config.title} - ${config.message}`)
    console.log(`Pattern: ${correlation.pattern.name}, Confidence: ${correlation.confidence}`)
  }

  /**
   * Trigger circuit breaker
   */
  private triggerCircuitBreaker(config: any): void {
    console.log(`CIRCUIT BREAKER: Service ${config.service} for ${config.duration}ms`)
    // This would integrate with circuit breaker system
  }

  /**
   * Initiate automated recovery
   */
  private initiateAutoRecovery(config: any, correlation: ErrorCorrelation): void {
    console.log(`AUTO RECOVERY: Strategy ${config.strategy}`)
    // This would trigger recovery workflows
  }

  /**
   * Escalate issue to operations team
   */
  private escalateIssue(config: any, correlation: ErrorCorrelation): void {
    console.log(`ESCALATION: Level ${config.level} to ${config.notify.join(', ')}`)
    // This would integrate with alerting systems
  }

  /**
   * Log correlation for analysis
   */
  private logCorrelation(config: any, correlation: ErrorCorrelation): void {
    console.log(`LOG: ${config.level} - ${config.details}`)
    console.log('Correlation details:', correlation)
  }

  /**
   * Get comprehensive error analytics
   */
  getAnalytics(): ErrorAnalytics {
    const oneHourAgo = Date.now() - 3600000
    const recentErrors = this.errorHistory.filter(e => 
      e.timestamp && e.timestamp.getTime() >= oneHourAgo
    )

    // Error counts by category
    const errorsByCategory = {} as Record<ErrorCategory, number>
    Object.values(ErrorCategory).forEach(category => {
      errorsByCategory[category] = recentErrors.filter(e => e.category === category).length
    })

    // Error counts by severity
    const errorsBySeverity = {} as Record<ErrorSeverity, number>
    Object.values(ErrorSeverity).forEach(severity => {
      errorsBySeverity[severity] = recentErrors.filter(e => e.severity === severity).length
    })

    // Error counts by feature
    const errorsByFeature: Record<string, number> = {}
    recentErrors.forEach(error => {
      const feature = error.feature || 'Unknown'
      errorsByFeature[feature] = (errorsByFeature[feature] || 0) + 1
    })

    // Calculate trends
    const twoHoursAgo = Date.now() - 7200000
    const previousHourErrors = this.errorHistory.filter(e => 
      e.timestamp && 
      e.timestamp.getTime() >= twoHoursAgo && 
      e.timestamp.getTime() < oneHourAgo
    )

    const currentHourCount = recentErrors.length
    const previousHourCount = previousHourErrors.length
    const trendPercentage = previousHourCount > 0 
      ? ((currentHourCount - previousHourCount) / previousHourCount) * 100 
      : 0

    // Top errors
    const errorCounts = new Map<string, { count: number; lastOccurred: Date }>()
    recentErrors.forEach(error => {
      const key = error.message
      const existing = errorCounts.get(key)
      errorCounts.set(key, {
        count: (existing?.count || 0) + 1,
        lastOccurred: error.timestamp || new Date()
      })
    })

    const topErrors = Array.from(errorCounts.entries())
      .map(([message, data]) => ({ message, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    return {
      totalErrors: recentErrors.length,
      errorsByCategory,
      errorsBySeverity,
      errorsByFeature,
      errorRate: recentErrors.length, // errors per hour
      trends: {
        increasing: trendPercentage > 10,
        percentage: Math.abs(trendPercentage),
        period: 'hour'
      },
      topErrors,
      patterns: this.correlations.slice(-10) // Last 10 correlations
    }
  }

  /**
   * Assess overall system health
   */
  assessSystemHealth(): SystemHealthAssessment {
    const analytics = this.getAnalytics()
    let score = 100
    const issues: SystemHealthAssessment['issues'] = []
    const predictions: SystemHealthAssessment['predictions'] = []

    // Deduct points for error rate
    if (analytics.errorRate > 50) {
      score -= 40
      issues.push({
        severity: ErrorSeverity.CRITICAL,
        description: 'Very high error rate',
        impact: 'System stability at risk',
        recommendation: 'Immediate investigation required'
      })
    } else if (analytics.errorRate > 20) {
      score -= 20
      issues.push({
        severity: ErrorSeverity.HIGH,
        description: 'Elevated error rate',
        impact: 'User experience degraded',
        recommendation: 'Monitor and investigate error patterns'
      })
    } else if (analytics.errorRate > 10) {
      score -= 10
      issues.push({
        severity: ErrorSeverity.MEDIUM,
        description: 'Moderate error rate',
        impact: 'Minor performance impact',
        recommendation: 'Review error patterns and optimize'
      })
    }

    // Check for critical errors
    const criticalErrors = analytics.errorsBySeverity[ErrorSeverity.CRITICAL]
    if (criticalErrors > 0) {
      score -= criticalErrors * 15
      issues.push({
        severity: ErrorSeverity.CRITICAL,
        description: `${criticalErrors} critical errors detected`,
        impact: 'Core functionality affected',
        recommendation: 'Address critical errors immediately'
      })
    }

    // Check trends
    if (analytics.trends.increasing && analytics.trends.percentage > 50) {
      score -= 15
      predictions.push({
        type: 'error_spike',
        probability: Math.min(analytics.trends.percentage / 100, 0.9),
        timeframe: 'next hour',
        preventiveActions: [
          'Enable circuit breakers',
          'Scale up infrastructure',
          'Review recent deployments'
        ]
      })
    }

    // Check active patterns
    const activePatterns = this.correlations.filter(c => 
      c.triggered && Date.now() - c.timestamp.getTime() < 1800000 // 30 minutes
    )
    
    if (activePatterns.length > 0) {
      score -= activePatterns.length * 10
      activePatterns.forEach(pattern => {
        issues.push({
          severity: pattern.pattern.severity,
          description: pattern.pattern.description,
          impact: 'Pattern-based system degradation',
          recommendation: 'Review pattern actions and system recovery'
        })
      })
    }

    // Determine status
    let status: 'healthy' | 'degraded' | 'critical'
    if (score >= 80) {
      status = 'healthy'
    } else if (score >= 60) {
      status = 'degraded'
    } else {
      status = 'critical'
    }

    return {
      score: Math.max(score, 0),
      status,
      issues,
      predictions
    }
  }

  /**
   * Start background monitoring
   */
  private startMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
    }

    this.monitoringInterval = setInterval(() => {
      this.checkPatterns()
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
   * Get error history
   */
  getErrorHistory(): EnhancedError[] {
    return [...this.errorHistory]
  }

  /**
   * Get active correlations
   */
  getCorrelations(): ErrorCorrelation[] {
    return [...this.correlations]
  }

  /**
   * Clear history (for testing or reset)
   */
  clearHistory(): void {
    this.errorHistory = []
    this.correlations = []
  }
}

// Export singleton instance
export const errorMonitor = new ErrorMonitor()
export default errorMonitor