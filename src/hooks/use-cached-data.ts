import { useState, useEffect } from 'react';

export interface CachedResponse<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  cached: boolean;
  refetch: () => Promise<void>;
}

export function useCachedData<T>(
  url: string,
  options: RequestInit = {}
): CachedResponse<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cached, setCached] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      setData(result.data || result);
      setCached(result.cached || false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const refetch = async () => {
    await fetchData();
  };

  useEffect(() => {
    fetchData();
  }, [url]);

  return {
    data,
    loading,
    error,
    cached,
    refetch,
  };
}

export function useCachedOpportunities(filters: any = {}) {
  const params = new URLSearchParams();
  
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.append(key, String(value));
    }
  });

  const url = `/api/v1/opportunities/cached?${params.toString()}`;
  
  return useCachedData(url);
}

export function useCachedMatches(filters: any = {}) {
  const params = new URLSearchParams();
  
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.append(key, String(value));
    }
  });

  const url = `/api/v1/matches/cached?${params.toString()}`;
  
  return useCachedData(url);
}

export function useUsageStats(startDate?: string, endDate?: string) {
  // For demo: Return mock data instead of making API call
  const [data] = useState({
    totalRequests: 1247,
    totalCost: 45.60,
    averageLatency: 250,
    cacheHitRate: 94.2,
    topEndpoints: [
      { path: '/api/opportunities', requests: 456, avgLatency: 120 },
      { path: '/api/match-scores', requests: 321, avgLatency: 380 },
      { path: '/api/enhanced-chat', requests: 234, avgLatency: 200 }
    ]
  });
  
  return {
    data,
    loading: false,
    error: null,
    cached: true,
    refetch: async () => {}
  };
}