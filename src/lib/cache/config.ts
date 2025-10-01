import { redis, cache, billing, app } from '@/lib/config/env';

export const cacheConfig = {
  // Redis connection settings
  redis: {
    host: redis.host,
    port: redis.port,
    password: redis.password,
    db: redis.db,
  },

  // Default TTL values (in seconds)
  ttl: cache.ttl,

  // Cache prefixes for different data types
  prefixes: {
    user: 'user:',
    org: 'org:',
    opportunity: 'opp:',
    match: 'match:',
    search: 'search:',
    profile: 'profile:',
    subscription: 'sub:',
    ai: 'ai:',
    api: 'api:',
  },

  // Billing configuration
  billing: {
    costPerApiCall: billing.costPerApiCall,
    costPerCacheHit: billing.costPerCacheHit,
    costPerAiCall: billing.costPerAiCall,
    costPerVectorQuery: 0.001, // $0.001 per vector query
  },

  // Cache invalidation settings
  invalidation: {
    // Auto-invalidate after this many cache misses
    maxMissesBeforeInvalidation: 10,
    
    // Patterns that should be invalidated together
    patterns: {
      userProfile: ['user:*:profile', 'user:*:preferences'],
      opportunities: ['opp:*', 'search:*:opportunities'],
      matches: ['match:*', 'user:*:matches'],
      organization: ['org:*', 'user:*:org'],
    },
  },

  // Performance settings
  performance: {
    connectionTimeout: redis.connectionTimeout,
    commandTimeout: redis.commandTimeout,
    maxRetries: redis.maxRetries,
    retryDelayMs: redis.retryDelay,
    keepAliveMs: redis.keepAlive,
  },

  // Monitoring settings
  monitoring: {
    logCacheHits: app.nodeEnv === 'development',
    logCacheMisses: app.nodeEnv === 'development',
    logErrors: true,
    enableMetrics: true,
  },
};

export const CACHE_TTL = {
  SHORT: cache.ttl.short,
  MEDIUM: cache.ttl.medium,
  LONG: cache.ttl.long,
  DAY: cache.ttl.day,
  WEEK: cache.ttl.week,
};

export type CacheConfig = typeof cacheConfig;
export default cacheConfig;