import { NextRequest } from 'next/server'
import { security } from '@/lib/config/env'

export interface SecurityEvent {
  id: string
  timestamp: string
  type: SecurityEventType
  severity: SecuritySeverity
  source: {
    ip: string
    userAgent: string
    userId?: string
    organizationId?: string
  }
  request: {
    method: string
    url: string
    headers: Record<string, string>
    body?: string
  }
  details: Record<string, any>
  message: string
}

export enum SecurityEventType {
  AUTHENTICATION_FAILURE = 'authentication_failure',
  AUTHORIZATION_FAILURE = 'authorization_failure',
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
  SUSPICIOUS_REQUEST = 'suspicious_request',
  XSS_ATTEMPT = 'xss_attempt',
  SQL_INJECTION_ATTEMPT = 'sql_injection_attempt',
  CSRF_ATTEMPT = 'csrf_attempt',
  MALFORMED_REQUEST = 'malformed_request',
  UNUSUAL_ACTIVITY = 'unusual_activity',
  DATA_BREACH_ATTEMPT = 'data_breach_attempt',
  PRIVILEGE_ESCALATION = 'privilege_escalation',
  ACCOUNT_ENUMERATION = 'account_enumeration'
}

export enum SecuritySeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * Security monitoring and logging utility
 */
export class SecurityMonitor {
  private static instance: SecurityMonitor
  private events: SecurityEvent[] = []
  private readonly maxEvents = 10000 // Keep last 10k events in memory
  
  private constructor() {}
  
  static getInstance(): SecurityMonitor {
    if (!SecurityMonitor.instance) {
      SecurityMonitor.instance = new SecurityMonitor()
    }
    return SecurityMonitor.instance
  }
  
  /**
   * Log a security event
   */
  logEvent(
    type: SecurityEventType,
    severity: SecuritySeverity,
    message: string,
    request: NextRequest,
    details: Record<string, any> = {},
    userId?: string,
    organizationId?: string
  ): void {
    const event: SecurityEvent = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      type,
      severity,
      source: {
        ip: this.getClientIP(request),
        userAgent: request.headers.get('user-agent') || 'unknown',
        userId,
        organizationId
      },
      request: {
        method: request.method,
        url: request.url,
        headers: this.sanitizeHeaders(request.headers),
        body: this.sanitizeBody(details.body)
      },
      details,
      message
    }
    
    // Add to memory store
    this.events.push(event)
    
    // Keep only recent events
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents)
    }
    
    // Log to console
    this.logToConsole(event)
    
    // Send to external monitoring (if configured)
    this.sendToExternalMonitoring(event)
    
    // Trigger alerts for high severity events
    if (severity === SecuritySeverity.HIGH || severity === SecuritySeverity.CRITICAL) {
      this.triggerAlert(event)
    }
  }
  
  /**
   * Get client IP address
   */
  private getClientIP(request: NextRequest): string {
    return (
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      request.headers.get('cf-connecting-ip') ||
      request.headers.get('x-client-ip') ||
      'unknown'
    )
  }
  
  /**
   * Sanitize headers for logging
   */
  private sanitizeHeaders(headers: Headers): Record<string, string> {
    const sanitized: Record<string, string> = {}
    const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key', 'x-auth-token']
    
    headers.forEach((value, key) => {
      if (sensitiveHeaders.includes(key.toLowerCase())) {
        sanitized[key] = '[REDACTED]'
      } else {
        sanitized[key] = value
      }
    })
    
    return sanitized
  }
  
  /**
   * Sanitize request body for logging
   */
  private sanitizeBody(body: any): string | undefined {
    if (!body) return undefined
    
    try {
      const bodyStr = typeof body === 'string' ? body : JSON.stringify(body)
      
      // Redact sensitive fields
      const sensitivePatterns = [
        /"password"\s*:\s*"[^"]*"/gi,
        /"token"\s*:\s*"[^"]*"/gi,
        /"secret"\s*:\s*"[^"]*"/gi,
        /"apiKey"\s*:\s*"[^"]*"/gi
      ]
      
      let sanitized = bodyStr
      sensitivePatterns.forEach(pattern => {
        sanitized = sanitized.replace(pattern, (match) => {
          const field = match.split(':')[0]
          return `${field}: "[REDACTED]"`
        })
      })
      
      // Truncate if too long
      return sanitized.length > 1000 ? sanitized.substring(0, 1000) + '...' : sanitized
    } catch (error) {
      return '[INVALID JSON]'
    }
  }
  
  /**
   * Log to console with appropriate formatting
   */
  private logToConsole(event: SecurityEvent): void {
    const emoji = this.getSeverityEmoji(event.severity)
    const timestamp = new Date(event.timestamp).toISOString()
    
    console.log(`${emoji} [SECURITY] ${timestamp} - ${event.type.toUpperCase()}`)
    console.log(`   Message: ${event.message}`)
    console.log(`   Source: ${event.source.ip} (${event.source.userAgent})`)
    console.log(`   Request: ${event.request.method} ${event.request.url}`)
    
    if (Object.keys(event.details).length > 0) {
      console.log(`   Details:`, event.details)
    }
  }
  
  /**
   * Get emoji for severity level
   */
  private getSeverityEmoji(severity: SecuritySeverity): string {
    switch (severity) {
      case SecuritySeverity.LOW: return '🟢'
      case SecuritySeverity.MEDIUM: return '🟡'
      case SecuritySeverity.HIGH: return '🟠'
      case SecuritySeverity.CRITICAL: return '🔴'
      default: return '⚪'
    }
  }
  
  /**
   * Send to external monitoring service
   */
  private async sendToExternalMonitoring(event: SecurityEvent): Promise<void> {
    // In production, integrate with services like:
    // - Sentry for error tracking
    // - DataDog for monitoring
    // - AWS CloudWatch for logging
    // - Custom SIEM solutions
    
    if (security.webhookUrl) {
      try {
        await fetch(security.webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${security.webhookToken}`
          },
          body: JSON.stringify(event)
        })
      } catch (error) {
        console.error('Failed to send security event to external monitoring:', error)
      }
    }
  }
  
  /**
   * Trigger alert for high severity events
   */
  private async triggerAlert(event: SecurityEvent): Promise<void> {
    // Send immediate alerts for critical security events
    if (security.alertEmail) {
      // In production, integrate with email service
      console.error(`🚨 CRITICAL SECURITY ALERT: ${event.message}`)
      console.error(`Event ID: ${event.id}`)
      console.error(`Source: ${event.source.ip}`)
      console.error(`Time: ${event.timestamp}`)
    }
    
    // Slack/Teams notifications
    if (security.slackWebhook) {
      try {
        await fetch(security.slackWebhook, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: `🚨 Security Alert: ${event.message}`,
            attachments: [{
              color: event.severity === SecuritySeverity.CRITICAL ? 'danger' : 'warning',
              fields: [
                { title: 'Event Type', value: event.type, short: true },
                { title: 'Severity', value: event.severity, short: true },
                { title: 'Source IP', value: event.source.ip, short: true },
                { title: 'Time', value: event.timestamp, short: true }
              ]
            }]
          })
        })
      } catch (error) {
        console.error('Failed to send Slack alert:', error)
      }
    }
  }
  
  /**
   * Get recent security events
   */
  getRecentEvents(limit: number = 100): SecurityEvent[] {
    return this.events.slice(-limit)
  }
  
  /**
   * Get events by type
   */
  getEventsByType(type: SecurityEventType, limit: number = 100): SecurityEvent[] {
    return this.events
      .filter(event => event.type === type)
      .slice(-limit)
  }
  
  /**
   * Get events by severity
   */
  getEventsBySeverity(severity: SecuritySeverity, limit: number = 100): SecurityEvent[] {
    return this.events
      .filter(event => event.severity === severity)
      .slice(-limit)
  }
  
  /**
   * Get events by IP address
   */
  getEventsByIP(ip: string, limit: number = 100): SecurityEvent[] {
    return this.events
      .filter(event => event.source.ip === ip)
      .slice(-limit)
  }
  
  /**
   * Check for unusual activity patterns
   */
  detectUnusualActivity(ip: string, timeWindow: number = 3600000): boolean {
    const cutoff = new Date(Date.now() - timeWindow)
    const recentEvents = this.events.filter(
      event => event.source.ip === ip && new Date(event.timestamp) > cutoff
    )
    
    // Detection rules
    const failedAuthAttempts = recentEvents.filter(
      event => event.type === SecurityEventType.AUTHENTICATION_FAILURE
    ).length
    
    const suspiciousRequests = recentEvents.filter(
      event => event.type === SecurityEventType.SUSPICIOUS_REQUEST
    ).length
    
    const totalEvents = recentEvents.length
    
    // Thresholds for unusual activity
    return (
      failedAuthAttempts > 10 ||
      suspiciousRequests > 5 ||
      totalEvents > 100
    )
  }
  
  /**
   * Get security metrics
   */
  getSecurityMetrics(timeWindow: number = 3600000): {
    totalEvents: number
    eventsByType: Record<string, number>
    eventsBySeverity: Record<string, number>
    topIPs: Array<{ ip: string; count: number }>
    unusualActivityIPs: string[]
  } {
    const cutoff = new Date(Date.now() - timeWindow)
    const recentEvents = this.events.filter(
      event => new Date(event.timestamp) > cutoff
    )
    
    const eventsByType: Record<string, number> = {}
    const eventsBySeverity: Record<string, number> = {}
    const ipCounts: Record<string, number> = {}
    
    recentEvents.forEach(event => {
      // Count by type
      eventsByType[event.type] = (eventsByType[event.type] || 0) + 1
      
      // Count by severity
      eventsBySeverity[event.severity] = (eventsBySeverity[event.severity] || 0) + 1
      
      // Count by IP
      ipCounts[event.source.ip] = (ipCounts[event.source.ip] || 0) + 1
    })
    
    const topIPs = Object.entries(ipCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([ip, count]) => ({ ip, count }))
    
    const unusualActivityIPs = topIPs
      .filter(({ ip }) => this.detectUnusualActivity(ip, timeWindow))
      .map(({ ip }) => ip)
    
    return {
      totalEvents: recentEvents.length,
      eventsByType,
      eventsBySeverity,
      topIPs,
      unusualActivityIPs
    }
  }
}

// Convenience functions for common security events
export const securityMonitor = SecurityMonitor.getInstance()

export function logAuthenticationFailure(
  request: NextRequest,
  reason: string,
  details: Record<string, any> = {}
): void {
  securityMonitor.logEvent(
    SecurityEventType.AUTHENTICATION_FAILURE,
    SecuritySeverity.MEDIUM,
    `Authentication failed: ${reason}`,
    request,
    details
  )
}

export function logSuspiciousRequest(
  request: NextRequest,
  reason: string,
  details: Record<string, any> = {}
): void {
  securityMonitor.logEvent(
    SecurityEventType.SUSPICIOUS_REQUEST,
    SecuritySeverity.HIGH,
    `Suspicious request detected: ${reason}`,
    request,
    details
  )
}

export function logXSSAttempt(
  request: NextRequest,
  payload: string,
  details: Record<string, any> = {}
): void {
  securityMonitor.logEvent(
    SecurityEventType.XSS_ATTEMPT,
    SecuritySeverity.HIGH,
    `XSS attempt detected`,
    request,
    { payload: payload.substring(0, 100), ...details }
  )
}

export function logSQLInjectionAttempt(
  request: NextRequest,
  payload: string,
  details: Record<string, any> = {}
): void {
  securityMonitor.logEvent(
    SecurityEventType.SQL_INJECTION_ATTEMPT,
    SecuritySeverity.CRITICAL,
    `SQL injection attempt detected`,
    request,
    { payload: payload.substring(0, 100), ...details }
  )
}

export function logRateLimitExceeded(
  request: NextRequest,
  limit: number,
  details: Record<string, any> = {}
): void {
  securityMonitor.logEvent(
    SecurityEventType.RATE_LIMIT_EXCEEDED,
    SecuritySeverity.MEDIUM,
    `Rate limit exceeded: ${limit} requests`,
    request,
    details
  )
}