/**
 * Security Monitoring Middleware
 * Automatically monitors API requests for security violations and suspicious activity
 */

import { NextRequest, NextResponse } from 'next/server';
import { SecurityMonitor } from '@/lib/audit/security-monitor';

export interface SecurityMiddlewareConfig {
  enabled: boolean;
  monitorPatterns: string[];
  excludePatterns: string[];
  rateLimit: {
    windowMs: number;
    maxRequests: number;
  };
}

const defaultConfig: SecurityMiddlewareConfig = {
  enabled: true,
  monitorPatterns: [
    '/api/v1/*',
    '/api/ai/*'
  ],
  excludePatterns: [
    '/api/health',
    '/api/status',
    '/api/_next/*'
  ],
  rateLimit: {
    windowMs: 60000, // 1 minute
    maxRequests: 100
  }
};

// Rate limiting storage (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export class SecurityMonitoringMiddleware {
  private config: SecurityMiddlewareConfig;
  
  constructor(config: Partial<SecurityMiddlewareConfig> = {}) {
    this.config = { ...defaultConfig, ...config };
  }

  /**
   * Main middleware function to process requests
   */
  async processRequest(
    request: NextRequest,
    response: NextResponse | null = null,
    organizationId?: string,
    userId?: string
  ): Promise<NextResponse | null> {
    if (!this.config.enabled) {
      return response;
    }

    const url = new URL(request.url);
    const pathname = url.pathname;

    // Check if this path should be monitored
    if (!this.shouldMonitorPath(pathname)) {
      return response;
    }

    const startTime = Date.now();
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';
    const method = request.method;

    try {
      // Rate limiting check
      const rateLimitResult = this.checkRateLimit(ipAddress);
      if (!rateLimitResult.allowed) {
        await SecurityMonitor.monitorEvent({
          type: 'RATE_LIMIT_VIOLATION',
          severity: 'MEDIUM',
          description: `Rate limit exceeded: ${rateLimitResult.count} requests in window`,
          source: 'security_middleware',
          organizationId: organizationId || 'unknown',
          userId,
          ipAddress,
          userAgent,
          metadata: {
            endpoint: pathname,
            method,
            rateLimitCount: rateLimitResult.count,
            rateLimitWindow: this.config.rateLimit.windowMs,
            maxRequests: this.config.rateLimit.maxRequests
          },
          timestamp: new Date()
        });

        return new NextResponse(JSON.stringify({
          error: 'Rate limit exceeded',
          retryAfter: Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)
        }), {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000).toString()
          }
        });
      }

      // If response is provided, monitor the completed request
      if (response) {
        const responseTime = Date.now() - startTime;
        const statusCode = response.status;

        await SecurityMonitor.monitorAPIAccess(
          pathname,
          method,
          organizationId || 'unknown',
          userId,
          ipAddress,
          userAgent,
          responseTime,
          statusCode
        );

        // Monitor for specific security patterns
        await this.monitorSecurityPatterns(
          request,
          response,
          organizationId,
          userId,
          ipAddress,
          userAgent,
          responseTime
        );
      }

      return response;

    } catch (error) {
      console.error('Security monitoring error:', error);
      // Don't fail the request due to monitoring issues
      return response;
    }
  }

  /**
   * Check if a path should be monitored
   */
  private shouldMonitorPath(pathname: string): boolean {
    // Check exclude patterns first
    for (const pattern of this.config.excludePatterns) {
      if (this.matchPattern(pathname, pattern)) {
        return false;
      }
    }

    // Check include patterns
    for (const pattern of this.config.monitorPatterns) {
      if (this.matchPattern(pathname, pattern)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Simple pattern matching (supports * wildcards)
   */
  private matchPattern(path: string, pattern: string): boolean {
    const regexPattern = pattern
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.');
    
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(path);
  }

  /**
   * Rate limiting implementation
   */
  private checkRateLimit(identifier: string): { allowed: boolean; count: number; resetTime: number } {
    const now = Date.now();
    const windowStart = now - this.config.rateLimit.windowMs;
    
    // Clean old entries
    for (const [key, data] of rateLimitStore.entries()) {
      if (data.resetTime < now) {
        rateLimitStore.delete(key);
      }
    }

    // Get or create rate limit data
    let rateLimitData = rateLimitStore.get(identifier);
    if (!rateLimitData || rateLimitData.resetTime < now) {
      rateLimitData = {
        count: 0,
        resetTime: now + this.config.rateLimit.windowMs
      };
    }

    rateLimitData.count++;
    rateLimitStore.set(identifier, rateLimitData);

    return {
      allowed: rateLimitData.count <= this.config.rateLimit.maxRequests,
      count: rateLimitData.count,
      resetTime: rateLimitData.resetTime
    };
  }

  /**
   * Monitor for specific security patterns
   */
  private async monitorSecurityPatterns(
    request: NextRequest,
    response: NextResponse,
    organizationId?: string,
    userId?: string,
    ipAddress?: string,
    userAgent?: string,
    responseTime?: number
  ): Promise<void> {
    const url = new URL(request.url);
    const pathname = url.pathname;
    const method = request.method;
    const statusCode = response.status;

    // Pattern 1: SQL Injection attempts
    const sqlInjectionPatterns = [
      /union\s+select/i,
      /drop\s+table/i,
      /delete\s+from/i,
      /insert\s+into/i,
      /update\s+set/i,
      /'\s*or\s*'1'\s*=\s*'1/i,
      /'\s*;\s*drop/i
    ];

    const queryString = url.search;
    const hasSqlInjection = sqlInjectionPatterns.some(pattern => 
      pattern.test(queryString) || pattern.test(pathname)
    );

    if (hasSqlInjection) {
      await SecurityMonitor.monitorEvent({
        type: 'SUSPICIOUS_ACTIVITY',
        severity: 'HIGH',
        description: 'Potential SQL injection attempt detected',
        source: 'security_middleware',
        organizationId: organizationId || 'unknown',
        userId,
        ipAddress,
        userAgent,
        metadata: {
          endpoint: pathname,
          method,
          queryString,
          statusCode,
          attackType: 'sql_injection'
        },
        timestamp: new Date()
      });
    }

    // Pattern 2: XSS attempts
    const xssPatterns = [
      /<script/i,
      /javascript:/i,
      /on\w+\s*=/i,
      /<iframe/i,
      /eval\s*\(/i,
      /alert\s*\(/i
    ];

    const hasXss = xssPatterns.some(pattern => 
      pattern.test(queryString) || pattern.test(pathname)
    );

    if (hasXss) {
      await SecurityMonitor.monitorEvent({
        type: 'SUSPICIOUS_ACTIVITY',
        severity: 'HIGH',
        description: 'Potential XSS attempt detected',
        source: 'security_middleware',
        organizationId: organizationId || 'unknown',
        userId,
        ipAddress,
        userAgent,
        metadata: {
          endpoint: pathname,
          method,
          queryString,
          statusCode,
          attackType: 'xss'
        },
        timestamp: new Date()
      });
    }

    // Pattern 3: Path traversal attempts
    const pathTraversalPatterns = [
      /\.\.\//,
      /\.\.\\/,
      /%2e%2e%2f/i,
      /%2e%2e%5c/i,
      /\.\.%2f/i,
      /\.\.%5c/i
    ];

    const hasPathTraversal = pathTraversalPatterns.some(pattern => 
      pattern.test(pathname) || pattern.test(queryString)
    );

    if (hasPathTraversal) {
      await SecurityMonitor.monitorEvent({
        type: 'SUSPICIOUS_ACTIVITY',
        severity: 'HIGH',
        description: 'Potential path traversal attempt detected',
        source: 'security_middleware',
        organizationId: organizationId || 'unknown',
        userId,
        ipAddress,
        userAgent,
        metadata: {
          endpoint: pathname,
          method,
          queryString,
          statusCode,
          attackType: 'path_traversal'
        },
        timestamp: new Date()
      });
    }

    // Pattern 4: Unusual user agents (potential bots/scanners)
    const suspiciousUserAgents = [
      /sqlmap/i,
      /nmap/i,
      /nikto/i,
      /burp/i,
      /scanner/i,
      /bot/i,
      /crawler/i,
      /spider/i
    ];

    const hasSuspiciousUserAgent = suspiciousUserAgents.some(pattern => 
      userAgent && pattern.test(userAgent)
    );

    if (hasSuspiciousUserAgent && statusCode >= 400) {
      await SecurityMonitor.monitorEvent({
        type: 'SUSPICIOUS_ACTIVITY',
        severity: 'MEDIUM',
        description: 'Suspicious user agent detected with error response',
        source: 'security_middleware',
        organizationId: organizationId || 'unknown',
        userId,
        ipAddress,
        userAgent,
        metadata: {
          endpoint: pathname,
          method,
          statusCode,
          responseTime,
          suspiciousUserAgent: userAgent
        },
        timestamp: new Date()
      });
    }
  }
}

// Export singleton instance
export const securityMonitoringMiddleware = new SecurityMonitoringMiddleware();

// Export utility function for easy integration
export async function monitorRequest(
  request: NextRequest,
  response?: NextResponse,
  organizationId?: string,
  userId?: string
): Promise<NextResponse | null> {
  return securityMonitoringMiddleware.processRequest(request, response, organizationId, userId);
}