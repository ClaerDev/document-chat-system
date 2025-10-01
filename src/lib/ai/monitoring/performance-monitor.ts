import { AIServiceProvider } from '../interfaces';

export interface PerformanceMetrics {
  provider: AIServiceProvider;
  requestId: string;
  timestamp: Date;
  latency: number;
  success: boolean;
  cost: number;
  tokensProcessed: number;
  model: string;
  operation: string;
  organizationId: string;
  userId?: string;
  errorCode?: string;
  errorMessage?: string;
}

export interface AggregatedMetrics {
  provider: AIServiceProvider;
  timeWindow: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageLatency: number;
  p95Latency: number;
  p99Latency: number;
  totalCost: number;
  averageCost: number;
  totalTokens: number;
  tokensPerSecond: number;
  successRate: number;
  errorRate: number;
  uptime: number;
  lastUpdated: Date;
}

export interface AlertRule {
  id: string;
  name: string;
  metric: string;
  operator: 'gt' | 'lt' | 'gte' | 'lte' | 'eq';
  threshold: number;
  timeWindow: number; // minutes
  enabled: boolean;
  organizationId?: string; // null for global rules
  notificationChannels: string[];
}

export interface Alert {
  id: string;
  ruleId: string;
  ruleName: string;
  provider: AIServiceProvider;
  metric: string;
  currentValue: number;
  threshold: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
  resolved: boolean;
  resolvedAt?: Date;
  organizationId?: string;
}

export class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetrics[]> = new Map();
  private aggregatedMetrics: Map<string, AggregatedMetrics> = new Map();
  private alertRules: AlertRule[] = [];
  private activeAlerts: Map<string, Alert> = new Map();
  private listeners: Array<(metric: PerformanceMetrics) => void> = [];
  private alertListeners: Array<(alert: Alert) => void> = [];

  constructor() {
    this.initializeDefaultAlertRules();
    this.startAggregationTimer();
  }

  /**
   * Record a new performance metric
   */
  recordMetric(metric: PerformanceMetrics): void {
    const key = `${metric.provider}-${metric.organizationId}`;
    
    if (!this.metrics.has(key)) {
      this.metrics.set(key, []);
    }
    
    this.metrics.get(key)!.push(metric);
    
    // Keep only last 1000 metrics per provider-org combination
    const metrics = this.metrics.get(key)!;
    if (metrics.length > 1000) {
      metrics.splice(0, metrics.length - 1000);
    }
    
    // Notify listeners
    this.listeners.forEach(listener => {
      try {
        listener(metric);
      } catch (error) {
        console.error('Error in performance metric listener:', error);
      }
    });
    
    // Check alert rules immediately for critical metrics
    this.checkAlertRules(metric);
  }

  /**
   * Get aggregated metrics for a provider
   */
  getAggregatedMetrics(
    provider: AIServiceProvider,
    organizationId?: string,
    timeWindow: string = '1h'
  ): AggregatedMetrics | null {
    const key = organizationId ? `${provider}-${organizationId}-${timeWindow}` : `${provider}-global-${timeWindow}`;
    return this.aggregatedMetrics.get(key) || null;
  }

  /**
   * Get all aggregated metrics
   */
  getAllAggregatedMetrics(timeWindow: string = '1h'): AggregatedMetrics[] {
    return Array.from(this.aggregatedMetrics.values())
      .filter(metrics => metrics.timeWindow === timeWindow);
  }

  /**
   * Get raw metrics for a provider
   */
  getRawMetrics(
    provider: AIServiceProvider,
    organizationId?: string,
    limit: number = 100
  ): PerformanceMetrics[] {
    const key = organizationId ? `${provider}-${organizationId}` : '';
    
    if (organizationId && this.metrics.has(key)) {
      return this.metrics.get(key)!.slice(-limit);
    }
    
    // If no organization specified, get global metrics
    const allMetrics: PerformanceMetrics[] = [];
    for (const [metricKey, metrics] of this.metrics.entries()) {
      if (metricKey.startsWith(`${provider}-`)) {
        allMetrics.push(...metrics);
      }
    }
    
    return allMetrics
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Calculate real-time performance score
   */
  calculatePerformanceScore(provider: AIServiceProvider, organizationId?: string): number {
    const metrics = this.getRawMetrics(provider, organizationId, 50);
    
    if (metrics.length === 0) return 0.5; // Neutral score
    
    const recentMetrics = metrics.filter(m => 
      Date.now() - m.timestamp.getTime() < 15 * 60 * 1000 // Last 15 minutes
    );
    
    if (recentMetrics.length === 0) return 0.5;
    
    // Calculate weighted score based on multiple factors
    const successRate = recentMetrics.filter(m => m.success).length / recentMetrics.length;
    const averageLatency = recentMetrics.reduce((sum, m) => sum + m.latency, 0) / recentMetrics.length;
    const averageCost = recentMetrics.reduce((sum, m) => sum + m.cost, 0) / recentMetrics.length;
    
    // Normalize scores (0-1)
    const successScore = successRate;
    const latencyScore = Math.max(0, Math.min(1, (3000 - averageLatency) / 3000)); // 3s max acceptable
    const costScore = Math.max(0, Math.min(1, (0.01 - averageCost) / 0.01)); // $0.01 max acceptable
    
    // Weighted combination
    return (successScore * 0.5) + (latencyScore * 0.3) + (costScore * 0.2);
  }

  /**
   * Get provider rankings
   */
  getProviderRankings(organizationId?: string): Array<{
    provider: AIServiceProvider;
    score: number;
    rank: number;
    metrics: {
      successRate: number;
      averageLatency: number;
      averageCost: number;
      requestCount: number;
    };
  }> {
    const providers: AIServiceProvider[] = ['openai', 'anthropic', 'google', 'azure', 'vercel'];
    
    const rankings = providers.map(provider => {
      const score = this.calculatePerformanceScore(provider, organizationId);
      const metrics = this.getRawMetrics(provider, organizationId, 100);
      
      const successRate = metrics.length > 0 ? 
        metrics.filter(m => m.success).length / metrics.length : 0;
      const averageLatency = metrics.length > 0 ?
        metrics.reduce((sum, m) => sum + m.latency, 0) / metrics.length : 0;
      const averageCost = metrics.length > 0 ?
        metrics.reduce((sum, m) => sum + m.cost, 0) / metrics.length : 0;
      
      return {
        provider,
        score,
        rank: 0, // Will be set below
        metrics: {
          successRate,
          averageLatency,
          averageCost,
          requestCount: metrics.length
        }
      };
    });
    
    // Sort by score and assign ranks
    rankings.sort((a, b) => b.score - a.score);
    rankings.forEach((ranking, index) => {
      ranking.rank = index + 1;
    });
    
    return rankings;
  }

  /**
   * Add alert rule
   */
  addAlertRule(rule: AlertRule): void {
    this.alertRules.push(rule);
  }

  /**
   * Remove alert rule
   */
  removeAlertRule(ruleId: string): void {
    this.alertRules = this.alertRules.filter(rule => rule.id !== ruleId);
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(organizationId?: string): Alert[] {
    return Array.from(this.activeAlerts.values())
      .filter(alert => !organizationId || alert.organizationId === organizationId)
      .filter(alert => !alert.resolved);
  }

  /**
   * Resolve alert
   */
  resolveAlert(alertId: string): void {
    const alert = this.activeAlerts.get(alertId);
    if (alert) {
      alert.resolved = true;
      alert.resolvedAt = new Date();
    }
  }

  /**
   * Subscribe to performance metrics
   */
  onMetric(listener: (metric: PerformanceMetrics) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Subscribe to alerts
   */
  onAlert(listener: (alert: Alert) => void): () => void {
    this.alertListeners.push(listener);
    return () => {
      const index = this.alertListeners.indexOf(listener);
      if (index > -1) {
        this.alertListeners.splice(index, 1);
      }
    };
  }

  /**
   * Export metrics data
   */
  exportMetrics(
    timeRange?: { start: Date; end: Date },
    providers?: AIServiceProvider[],
    organizationId?: string
  ): {
    raw: PerformanceMetrics[];
    aggregated: AggregatedMetrics[];
    alerts: Alert[];
    exportedAt: Date;
  } {
    const rawMetrics: PerformanceMetrics[] = [];
    
    // Collect raw metrics
    for (const [key, metrics] of this.metrics.entries()) {
      if (organizationId && !key.includes(organizationId)) continue;
      
      let filteredMetrics = metrics;
      
      if (timeRange) {
        filteredMetrics = metrics.filter(m => 
          m.timestamp >= timeRange.start && m.timestamp <= timeRange.end
        );
      }
      
      if (providers) {
        filteredMetrics = filteredMetrics.filter(m => providers.includes(m.provider));
      }
      
      rawMetrics.push(...filteredMetrics);
    }
    
    // Get relevant aggregated metrics
    const aggregatedMetrics = Array.from(this.aggregatedMetrics.values());
    
    // Get relevant alerts
    const alerts = Array.from(this.activeAlerts.values())
      .filter(alert => !organizationId || alert.organizationId === organizationId);
    
    return {
      raw: rawMetrics,
      aggregated: aggregatedMetrics,
      alerts,
      exportedAt: new Date()
    };
  }

  /**
   * Get system health summary
   */
  getSystemHealth(organizationId?: string): {
    overall: 'healthy' | 'degraded' | 'critical';
    providers: Record<AIServiceProvider, 'healthy' | 'degraded' | 'critical'>;
    activeAlerts: number;
    criticalAlerts: number;
    averageLatency: number;
    successRate: number;
    totalRequests: number;
    lastUpdated: Date;
  } {
    const providers: AIServiceProvider[] = ['openai', 'anthropic', 'google', 'azure', 'vercel'];
    const providerHealth: Record<AIServiceProvider, 'healthy' | 'degraded' | 'critical'> = {} as any;
    
    let totalRequests = 0;
    let totalSuccessful = 0;
    let totalLatency = 0;
    let totalMetrics = 0;
    
    // Assess each provider
    providers.forEach(provider => {
      const score = this.calculatePerformanceScore(provider, organizationId);
      const metrics = this.getRawMetrics(provider, organizationId, 50);
      
      if (score >= 0.8) {
        providerHealth[provider] = 'healthy';
      } else if (score >= 0.6) {
        providerHealth[provider] = 'degraded';
      } else {
        providerHealth[provider] = 'critical';
      }
      
      // Accumulate stats
      totalRequests += metrics.length;
      totalSuccessful += metrics.filter(m => m.success).length;
      totalLatency += metrics.reduce((sum, m) => sum + m.latency, 0);
      totalMetrics += metrics.length;
    });
    
    // Calculate overall health
    const healthyProviders = Object.values(providerHealth).filter(h => h === 'healthy').length;
    const criticalProviders = Object.values(providerHealth).filter(h => h === 'critical').length;
    
    let overall: 'healthy' | 'degraded' | 'critical';
    if (criticalProviders > 0 || healthyProviders < 2) {
      overall = 'critical';
    } else if (healthyProviders < 3) {
      overall = 'degraded';
    } else {
      overall = 'healthy';
    }
    
    const alerts = this.getActiveAlerts(organizationId);
    const criticalAlerts = alerts.filter(a => a.severity === 'critical').length;
    
    return {
      overall,
      providers: providerHealth,
      activeAlerts: alerts.length,
      criticalAlerts,
      averageLatency: totalMetrics > 0 ? totalLatency / totalMetrics : 0,
      successRate: totalRequests > 0 ? totalSuccessful / totalRequests : 0,
      totalRequests,
      lastUpdated: new Date()
    };
  }

  /**
   * Private methods
   */
  private initializeDefaultAlertRules(): void {
    const defaultRules: AlertRule[] = [
      {
        id: 'high-latency',
        name: 'High Latency Alert',
        metric: 'averageLatency',
        operator: 'gt',
        threshold: 3000, // 3 seconds
        timeWindow: 5, // 5 minutes
        enabled: true,
        notificationChannels: ['email', 'slack']
      },
      {
        id: 'low-success-rate',
        name: 'Low Success Rate Alert',
        metric: 'successRate',
        operator: 'lt',
        threshold: 0.95, // 95%
        timeWindow: 10, // 10 minutes
        enabled: true,
        notificationChannels: ['email', 'slack']
      },
      {
        id: 'high-cost',
        name: 'High Cost Alert',
        metric: 'totalCost',
        operator: 'gt',
        threshold: 100, // $100 per hour
        timeWindow: 60, // 1 hour
        enabled: true,
        notificationChannels: ['email']
      },
      {
        id: 'circuit-breaker-open',
        name: 'Circuit Breaker Open',
        metric: 'circuitBreakerStatus',
        operator: 'eq',
        threshold: 1, // 1 = open
        timeWindow: 1, // 1 minute
        enabled: true,
        notificationChannels: ['email', 'slack', 'pagerduty']
      }
    ];
    
    this.alertRules = defaultRules;
  }

  private checkAlertRules(metric: PerformanceMetrics): void {
    const now = new Date();
    
    this.alertRules
      .filter(rule => rule.enabled)
      .forEach(rule => {
        // Get recent metrics for this rule's time window
        const windowStart = new Date(now.getTime() - rule.timeWindow * 60 * 1000);
        const recentMetrics = this.getRawMetrics(metric.provider, metric.organizationId)
          .filter(m => m.timestamp >= windowStart);
        
        if (recentMetrics.length === 0) return;
        
        // Calculate metric value based on rule
        let currentValue: number;
        switch (rule.metric) {
          case 'averageLatency':
            currentValue = recentMetrics.reduce((sum, m) => sum + m.latency, 0) / recentMetrics.length;
            break;
          case 'successRate':
            currentValue = recentMetrics.filter(m => m.success).length / recentMetrics.length;
            break;
          case 'totalCost':
            currentValue = recentMetrics.reduce((sum, m) => sum + m.cost, 0);
            break;
          default:
            return;
        }
        
        // Check if alert condition is met
        let conditionMet = false;
        switch (rule.operator) {
          case 'gt':
            conditionMet = currentValue > rule.threshold;
            break;
          case 'lt':
            conditionMet = currentValue < rule.threshold;
            break;
          case 'gte':
            conditionMet = currentValue >= rule.threshold;
            break;
          case 'lte':
            conditionMet = currentValue <= rule.threshold;
            break;
          case 'eq':
            conditionMet = currentValue === rule.threshold;
            break;
        }
        
        const alertKey = `${rule.id}-${metric.provider}-${metric.organizationId || 'global'}`;
        
        if (conditionMet) {
          // Create or update alert
          if (!this.activeAlerts.has(alertKey) || this.activeAlerts.get(alertKey)!.resolved) {
            const alert: Alert = {
              id: alertKey,
              ruleId: rule.id,
              ruleName: rule.name,
              provider: metric.provider,
              metric: rule.metric,
              currentValue,
              threshold: rule.threshold,
              severity: this.calculateAlertSeverity(rule.metric, currentValue, rule.threshold),
              timestamp: now,
              resolved: false,
              organizationId: metric.organizationId
            };
            
            this.activeAlerts.set(alertKey, alert);
            
            // Notify alert listeners
            this.alertListeners.forEach(listener => {
              try {
                listener(alert);
              } catch (error) {
                console.error('Error in alert listener:', error);
              }
            });
          }
        } else {
          // Resolve alert if it exists
          const existingAlert = this.activeAlerts.get(alertKey);
          if (existingAlert && !existingAlert.resolved) {
            existingAlert.resolved = true;
            existingAlert.resolvedAt = now;
          }
        }
      });
  }

  private calculateAlertSeverity(metric: string, currentValue: number, threshold: number): Alert['severity'] {
    let deviation: number;
    
    switch (metric) {
      case 'averageLatency':
        deviation = (currentValue - threshold) / threshold;
        break;
      case 'successRate':
        deviation = (threshold - currentValue) / threshold;
        break;
      case 'totalCost':
        deviation = (currentValue - threshold) / threshold;
        break;
      default:
        return 'medium';
    }
    
    if (deviation >= 0.5) return 'critical';
    if (deviation >= 0.25) return 'high';
    if (deviation >= 0.1) return 'medium';
    return 'low';
  }

  private startAggregationTimer(): void {
    // Run aggregation every minute
    setInterval(() => {
      this.aggregateMetrics();
    }, 60000);
    
    // Initial aggregation
    this.aggregateMetrics();
  }

  private aggregateMetrics(): void {
    const now = new Date();
    const timeWindows = ['5m', '15m', '1h', '6h', '24h'];
    const windowDurations = {
      '5m': 5 * 60 * 1000,
      '15m': 15 * 60 * 1000,
      '1h': 60 * 60 * 1000,
      '6h': 6 * 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000
    };
    
    const providers: AIServiceProvider[] = ['openai', 'anthropic', 'google', 'azure', 'vercel'];
    const organizationIds = new Set<string>();
    
    // Collect all organization IDs
    for (const [key] of this.metrics.entries()) {
      const parts = key.split('-');
      if (parts.length >= 2) {
        organizationIds.add(parts.slice(1).join('-'));
      }
    }
    
    // Aggregate for each provider, organization, and time window
    providers.forEach(provider => {
      ['global', ...Array.from(organizationIds)].forEach(orgId => {
        timeWindows.forEach(window => {
          const windowStart = new Date(now.getTime() - windowDurations[window]);
          const metrics = this.getRawMetrics(
            provider, 
            orgId === 'global' ? undefined : orgId
          ).filter(m => m.timestamp >= windowStart);
          
          if (metrics.length === 0) return;
          
          const successful = metrics.filter(m => m.success);
          const latencies = metrics.map(m => m.latency).sort((a, b) => a - b);
          
          const aggregated: AggregatedMetrics = {
            provider,
            timeWindow: window,
            totalRequests: metrics.length,
            successfulRequests: successful.length,
            failedRequests: metrics.length - successful.length,
            averageLatency: metrics.reduce((sum, m) => sum + m.latency, 0) / metrics.length,
            p95Latency: latencies[Math.floor(latencies.length * 0.95)] || 0,
            p99Latency: latencies[Math.floor(latencies.length * 0.99)] || 0,
            totalCost: metrics.reduce((sum, m) => sum + m.cost, 0),
            averageCost: metrics.reduce((sum, m) => sum + m.cost, 0) / metrics.length,
            totalTokens: metrics.reduce((sum, m) => sum + m.tokensProcessed, 0),
            tokensPerSecond: metrics.reduce((sum, m) => sum + m.tokensProcessed, 0) / (windowDurations[window] / 1000),
            successRate: successful.length / metrics.length,
            errorRate: (metrics.length - successful.length) / metrics.length,
            uptime: successful.length / metrics.length, // Simplified uptime calculation
            lastUpdated: now
          };
          
          const key = orgId === 'global' ? 
            `${provider}-global-${window}` : 
            `${provider}-${orgId}-${window}`;
          
          this.aggregatedMetrics.set(key, aggregated);
        });
      });
    });
    
    // Clean up old aggregated metrics (keep only last 1000)
    if (this.aggregatedMetrics.size > 1000) {
      const entries = Array.from(this.aggregatedMetrics.entries());
      entries.sort((a, b) => b[1].lastUpdated.getTime() - a[1].lastUpdated.getTime());
      
      this.aggregatedMetrics.clear();
      entries.slice(0, 1000).forEach(([key, value]) => {
        this.aggregatedMetrics.set(key, value);
      });
    }
  }
}

// Global instance
export const performanceMonitor = new PerformanceMonitor();