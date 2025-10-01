'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { 
  CheckCircle, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown, 
  Target,
  Zap,
  Clock,
  FileText,
  Search,
  Brain
} from 'lucide-react'

interface QualityMetrics {
  chunking: {
    averageChunkSize: number
    chunkSizeConsistency: number
    semanticBoundaryPreservation: number
    processingSpeed: number // chunks per second
    errorRate: number
  }
  embeddings: {
    generationSuccess: number
    averageProcessingTime: number // ms per chunk
    batchEfficiency: number
    tokenUtilization: number
    modelAccuracy: number
  }
  search: {
    relevanceScore: number
    responseTime: number // ms average
    cacheHitRate: number
    resultCompleteness: number
    userSatisfaction: number
  }
  overall: {
    systemHealth: number
    uptime: number
    throughput: number // operations per minute
    qualityScore: number
  }
}

interface QualityAlert {
  id: string
  type: 'warning' | 'error' | 'info'
  metric: string
  message: string
  threshold: number
  currentValue: number
  timestamp: string
}

// Mock data - in a real implementation, this would come from your monitoring systems
const mockQualityMetrics: QualityMetrics = {
  chunking: {
    averageChunkSize: 1450, // tokens
    chunkSizeConsistency: 92, // %
    semanticBoundaryPreservation: 88, // %
    processingSpeed: 125, // chunks per second
    errorRate: 0.5 // %
  },
  embeddings: {
    generationSuccess: 99.2, // %
    averageProcessingTime: 85, // ms per chunk
    batchEfficiency: 94, // %
    tokenUtilization: 96, // %
    modelAccuracy: 91 // %
  },
  search: {
    relevanceScore: 87, // %
    responseTime: 245, // ms
    cacheHitRate: 78, // %
    resultCompleteness: 93, // %
    userSatisfaction: 4.2 // out of 5
  },
  overall: {
    systemHealth: 94, // %
    uptime: 99.8, // %
    throughput: 1250, // operations per minute
    qualityScore: 89 // %
  }
}

const mockAlerts: QualityAlert[] = [
  {
    id: '1',
    type: 'warning',
    metric: 'Cache Hit Rate',
    message: 'Cache hit rate below target threshold',
    threshold: 80,
    currentValue: 78,
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
  },
  {
    id: '2',
    type: 'info',
    metric: 'Search Response Time',
    message: 'Search response time increased by 15% from yesterday',
    threshold: 200,
    currentValue: 245,
    timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()
  }
]

export function QualityMetricsDashboard() {
  const [metrics, setMetrics] = useState<QualityMetrics>(mockQualityMetrics)
  const [alerts, setAlerts] = useState<QualityAlert[]>(mockAlerts)
  const [loading, setLoading] = useState(false)

  const getScoreColor = (score: number, thresholds = { good: 90, warning: 70 }) => {
    if (score >= thresholds.good) return 'text-green-600'
    if (score >= thresholds.warning) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getScoreBadge = (score: number, thresholds = { good: 90, warning: 70 }) => {
    if (score >= thresholds.good) return 'default'
    if (score >= thresholds.warning) return 'secondary'
    return 'destructive'
  }

  const formatTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(1)}s`
  }

  const formatNumber = (num: number) => num.toLocaleString()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Quality Metrics Dashboard</h2>
          <p className="text-muted-foreground">
            Monitor AI system performance and quality indicators
          </p>
        </div>
        <Badge variant={getScoreBadge(metrics.overall.qualityScore)} className="text-lg px-3 py-1">
          Quality Score: {metrics.overall.qualityScore}%
        </Badge>
      </div>

      {/* System Health Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Health</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getScoreColor(metrics.overall.systemHealth)}`}>
              {metrics.overall.systemHealth}%
            </div>
            <Progress value={metrics.overall.systemHealth} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Uptime</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getScoreColor(metrics.overall.uptime, { good: 99, warning: 95 })}`}>
              {metrics.overall.uptime}%
            </div>
            <p className="text-xs text-muted-foreground">Last 30 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Throughput</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatNumber(metrics.overall.throughput)}
            </div>
            <p className="text-xs text-muted-foreground">operations/min</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Quality Score</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getScoreColor(metrics.overall.qualityScore)}`}>
              {metrics.overall.qualityScore}%
            </div>
            <Progress value={metrics.overall.qualityScore} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Active Alerts */}
      {alerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Active Alerts
              <Badge variant="secondary">{alerts.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {alerts.map((alert) => (
                <Alert key={alert.id} variant={alert.type === 'error' ? 'destructive' : 'default'}>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle className="flex items-center justify-between">
                    <span>{alert.metric}</span>
                    <span className="text-sm font-normal">
                      {new Date(alert.timestamp).toLocaleTimeString()}
                    </span>
                  </AlertTitle>
                  <AlertDescription>
                    {alert.message}
                    <div className="mt-2 text-xs">
                      Current: {alert.currentValue} | Threshold: {alert.threshold}
                    </div>
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detailed Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chunking Metrics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Document Chunking
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm">Average Chunk Size</span>
                <span className="font-mono text-sm">{metrics.chunking.averageChunkSize} tokens</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm">Size Consistency</span>
                <div className="flex items-center gap-2">
                  <span className={`font-bold ${getScoreColor(metrics.chunking.chunkSizeConsistency)}`}>
                    {metrics.chunking.chunkSizeConsistency}%
                  </span>
                  <Progress value={metrics.chunking.chunkSizeConsistency} className="w-16" />
                </div>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm">Semantic Boundaries</span>
                <div className="flex items-center gap-2">
                  <span className={`font-bold ${getScoreColor(metrics.chunking.semanticBoundaryPreservation)}`}>
                    {metrics.chunking.semanticBoundaryPreservation}%
                  </span>
                  <Progress value={metrics.chunking.semanticBoundaryPreservation} className="w-16" />
                </div>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm">Processing Speed</span>
                <span className="font-mono text-sm">{metrics.chunking.processingSpeed} chunks/s</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm">Error Rate</span>
                <span className={`font-bold ${metrics.chunking.errorRate > 1 ? 'text-red-600' : 'text-green-600'}`}>
                  {metrics.chunking.errorRate}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Embeddings Metrics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              Embeddings Generation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm">Success Rate</span>
                <div className="flex items-center gap-2">
                  <span className={`font-bold ${getScoreColor(metrics.embeddings.generationSuccess, { good: 99, warning: 95 })}`}>
                    {metrics.embeddings.generationSuccess}%
                  </span>
                  <Progress value={metrics.embeddings.generationSuccess} className="w-16" />
                </div>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm">Avg Processing Time</span>
                <span className="font-mono text-sm">{formatTime(metrics.embeddings.averageProcessingTime)}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm">Batch Efficiency</span>
                <div className="flex items-center gap-2">
                  <span className={`font-bold ${getScoreColor(metrics.embeddings.batchEfficiency)}`}>
                    {metrics.embeddings.batchEfficiency}%
                  </span>
                  <Progress value={metrics.embeddings.batchEfficiency} className="w-16" />
                </div>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm">Token Utilization</span>
                <div className="flex items-center gap-2">
                  <span className={`font-bold ${getScoreColor(metrics.embeddings.tokenUtilization)}`}>
                    {metrics.embeddings.tokenUtilization}%
                  </span>
                  <Progress value={metrics.embeddings.tokenUtilization} className="w-16" />
                </div>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm">Model Accuracy</span>
                <div className="flex items-center gap-2">
                  <span className={`font-bold ${getScoreColor(metrics.embeddings.modelAccuracy)}`}>
                    {metrics.embeddings.modelAccuracy}%
                  </span>
                  <Progress value={metrics.embeddings.modelAccuracy} className="w-16" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Search Metrics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Vector Search
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm">Relevance Score</span>
                <div className="flex items-center gap-2">
                  <span className={`font-bold ${getScoreColor(metrics.search.relevanceScore)}`}>
                    {metrics.search.relevanceScore}%
                  </span>
                  <Progress value={metrics.search.relevanceScore} className="w-16" />
                </div>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm">Response Time</span>
                <span className={`font-mono text-sm ${metrics.search.responseTime > 500 ? 'text-yellow-600' : 'text-green-600'}`}>
                  {formatTime(metrics.search.responseTime)}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm">Cache Hit Rate</span>
                <div className="flex items-center gap-2">
                  <span className={`font-bold ${getScoreColor(metrics.search.cacheHitRate)}`}>
                    {metrics.search.cacheHitRate}%
                  </span>
                  <Progress value={metrics.search.cacheHitRate} className="w-16" />
                </div>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm">Result Completeness</span>
                <div className="flex items-center gap-2">
                  <span className={`font-bold ${getScoreColor(metrics.search.resultCompleteness)}`}>
                    {metrics.search.resultCompleteness}%
                  </span>
                  <Progress value={metrics.search.resultCompleteness} className="w-16" />
                </div>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm">User Satisfaction</span>
                <span className="font-bold">
                  {metrics.search.userSatisfaction}/5 ⭐
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Targets */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Targets</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-sm text-muted-foreground mb-1">Chunking Accuracy</div>
              <div className="text-2xl font-bold">Target: 90%</div>
              <div className={`text-sm ${getScoreColor(metrics.chunking.semanticBoundaryPreservation)}`}>
                Current: {metrics.chunking.semanticBoundaryPreservation}%
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-sm text-muted-foreground mb-1">Embedding Success</div>
              <div className="text-2xl font-bold">Target: 99%</div>
              <div className={`text-sm ${getScoreColor(metrics.embeddings.generationSuccess, { good: 99, warning: 95 })}`}>
                Current: {metrics.embeddings.generationSuccess}%
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-sm text-muted-foreground mb-1">Search Response</div>
              <div className="text-2xl font-bold">Target: &lt;200ms</div>
              <div className={`text-sm ${metrics.search.responseTime <= 200 ? 'text-green-600' : metrics.search.responseTime <= 500 ? 'text-yellow-600' : 'text-red-600'}`}>
                Current: {formatTime(metrics.search.responseTime)}
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-sm text-muted-foreground mb-1">Cache Hit Rate</div>
              <div className="text-2xl font-bold">Target: 80%</div>
              <div className={`text-sm ${getScoreColor(metrics.search.cacheHitRate)}`}>
                Current: {metrics.search.cacheHitRate}%
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}