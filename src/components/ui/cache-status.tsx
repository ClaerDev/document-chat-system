'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useUsageStats } from '@/hooks/use-cached-data';

interface CacheStatusProps {
  cached?: boolean;
  className?: string;
}

export function CacheStatus({ cached, className }: CacheStatusProps) {
  if (cached === undefined) return null;

  return (
    <Badge 
      variant={cached ? 'secondary' : 'outline'} 
      className={className}
    >
      {cached ? '⚡ Cached' : '🔄 Fresh'}
    </Badge>
  );
}

export function UsageStatsCard() {
  const { data: stats, loading, error } = useUsageStats();

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Usage Statistics</CardTitle>
          <CardDescription>Loading cache and API usage data...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Usage Statistics</CardTitle>
          <CardDescription>Error loading usage data</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-red-500 text-sm">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!stats?.stats) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Usage Statistics</CardTitle>
          <CardDescription>No usage data available</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const { stats: usageStats } = stats;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Usage Statistics</CardTitle>
        <CardDescription>Your API usage and cache performance</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-medium">Cache Hit Rate</p>
            <p className="text-2xl font-bold text-green-600">
              {usageStats.cacheHitRate.toFixed(1)}%
            </p>
          </div>
          <div>
            <p className="text-sm font-medium">Total Cost</p>
            <p className="text-2xl font-bold">
              ${usageStats.totalCost.toFixed(4)}
            </p>
          </div>
        </div>
        
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <p className="font-medium">Cache Hits</p>
            <p className="text-green-600">{usageStats.totalCacheHits}</p>
          </div>
          <div>
            <p className="font-medium">Cache Misses</p>
            <p className="text-yellow-600">{usageStats.totalCacheMisses}</p>
          </div>
          <div>
            <p className="font-medium">API Calls</p>
            <p className="text-blue-600">{usageStats.totalApiCalls}</p>
          </div>
        </div>
        
        <div className="pt-2 border-t">
          <p className="text-sm font-medium text-green-600">
            Cache Savings: ${usageStats.cacheSavings.toFixed(4)}
          </p>
          <p className="text-xs text-gray-500">
            Amount saved by using cached responses
          </p>
        </div>
      </CardContent>
    </Card>
  );
}