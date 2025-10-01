/**
 * Configuration Management Index
 * 
 * Central configuration management that combines environment variables
 * with database-stored organization-specific configurations
 */

import { env, cache, rateLimit, billing, fileUpload, ai, app, auth, redis, security, contact, thirdParty, supabase, stripe, webhooks, testing, api, errorConfig } from './env';
import { getOrgConfig, DatabaseConfig } from './database-config';

// Re-export environment configuration for direct access
export {
  env,
  cache,
  rateLimit,
  billing,
  fileUpload,
  ai,
  app,
  auth,
  redis,
  security,
  contact,
  thirdParty,
  supabase,
  stripe,
  webhooks,
  testing,
  api,
  errorConfig
} from './env';

// Re-export database configuration utilities
export { dbConfig, getOrgConfig, updateOrgConfig, initializeOrgDefaults } from './database-config';
export type { DatabaseConfig } from './database-config';

/**
 * Configuration manager that combines environment and database configurations
 */
export class ConfigManager {
  private static instance: ConfigManager;
  private configCache: Map<string, { data: any; timestamp: number }> = new Map();
  private readonly cacheTtl = 2 * 60 * 1000; // 2 minutes

  static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  /**
   * Get configuration with organization-specific overrides
   * Falls back to environment variables if organization config not found
   */
  async getConfig<T>(
    category: keyof DatabaseConfig,
    organizationId?: string
  ): Promise<T> {
    // If no organization ID, return environment defaults
    if (!organizationId) {
      return this.getEnvConfig(category) as T;
    }

    const cacheKey = `${organizationId}:${category}`;
    const cached = this.configCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTtl) {
      return cached.data;
    }

    try {
      // Get organization-specific config with fallback to environment
      const orgConfig = await getOrgConfig<T>(organizationId, category);
      const envConfig = this.getEnvConfig(category);
      
      // Merge organization config with environment defaults
      const mergedConfig = { ...envConfig, ...orgConfig };

      // Cache the result
      this.configCache.set(cacheKey, {
        data: mergedConfig,
        timestamp: Date.now()
      });

      return mergedConfig;
    } catch (error) {
      console.error(`Error getting config for ${category}:`, error);
      return this.getEnvConfig(category) as T;
    }
  }

  /**
   * Get environment-based configuration
   */
  private getEnvConfig(category: keyof DatabaseConfig): any {
    switch (category) {
      case 'rateLimiting':
        return rateLimit;
      case 'caching':
        return cache;
      case 'billing':
        return billing;
      case 'fileUpload':
        return fileUpload;
      case 'ai':
        return ai;
      case 'features':
        return {
          enableAdvancedAnalytics: false,
          enableExperimentalFeatures: false,
          enableBetaFeatures: false,
          enableDocumentChat: true,
          enableContentGeneration: true
        };
      default:
        return {};
    }
  }

  /**
   * Clear configuration cache
   */
  clearCache(organizationId?: string, category?: keyof DatabaseConfig): void {
    if (organizationId && category) {
      const cacheKey = `${organizationId}:${category}`;
      this.configCache.delete(cacheKey);
    } else if (organizationId) {
      for (const key of this.configCache.keys()) {
        if (key.startsWith(`${organizationId}:`)) {
          this.configCache.delete(key);
        }
      }
    } else {
      this.configCache.clear();
    }
  }
}

// Export singleton instance
export const configManager = ConfigManager.getInstance();

/**
 * Helper functions for common configuration access patterns
 */

// Rate limiting configuration
export async function getRateLimitConfig(organizationId?: string) {
  return configManager.getConfig<DatabaseConfig['rateLimiting']>('rateLimiting', organizationId);
}

// Cache configuration
export async function getCacheConfig(organizationId?: string) {
  return configManager.getConfig<DatabaseConfig['caching']>('caching', organizationId);
}

// Billing configuration
export async function getBillingConfig(organizationId?: string) {
  return configManager.getConfig<DatabaseConfig['billing']>('billing', organizationId);
}

// File upload configuration
export async function getFileUploadConfig(organizationId?: string) {
  return configManager.getConfig<DatabaseConfig['fileUpload']>('fileUpload', organizationId);
}

// AI configuration
export async function getAIConfig(organizationId?: string) {
  return configManager.getConfig<DatabaseConfig['ai']>('ai', organizationId);
}

// Feature flags
export async function getFeatureFlags(organizationId?: string) {
  return configManager.getConfig<DatabaseConfig['features']>('features', organizationId);
}

/**
 * Type-safe configuration access with IntelliSense support
 */
export interface TypedConfigAccess {
  rateLimiting: DatabaseConfig['rateLimiting'];
  caching: DatabaseConfig['caching'];
  billing: DatabaseConfig['billing'];
  fileUpload: DatabaseConfig['fileUpload'];
  ai: DatabaseConfig['ai'];
  features: DatabaseConfig['features'];
}

/**
 * Get typed configuration
 */
export async function getTypedConfig<K extends keyof TypedConfigAccess>(
  category: K,
  organizationId?: string
): Promise<TypedConfigAccess[K]> {
  return configManager.getConfig<TypedConfigAccess[K]>(category, organizationId);
}

/**
 * Configuration validation utilities
 */
export function validateConfig(category: keyof DatabaseConfig, config: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  switch (category) {
    case 'rateLimiting':
      if (config.api?.max && config.api.max <= 0) {
        errors.push('API rate limit max must be greater than 0');
      }
      if (config.ai?.max && config.ai.max <= 0) {
        errors.push('AI rate limit max must be greater than 0');
      }
      break;

    case 'billing':
      if (config.costPerApiCall && config.costPerApiCall < 0) {
        errors.push('Cost per API call must be non-negative');
      }
      break;

    case 'fileUpload':
      if (config.maxSize && config.maxSize <= 0) {
        errors.push('Max file size must be greater than 0');
      }
      break;

    case 'ai':
      if (config.defaultTimeout && config.defaultTimeout <= 0) {
        errors.push('AI default timeout must be greater than 0');
      }
      break;
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Configuration change event handlers
 */
type ConfigChangeHandler = (category: keyof DatabaseConfig, organizationId: string, newConfig: any) => void;

class ConfigEventManager {
  private handlers: Map<string, ConfigChangeHandler[]> = new Map();

  subscribe(category: keyof DatabaseConfig, handler: ConfigChangeHandler): () => void {
    const handlers = this.handlers.get(category) || [];
    handlers.push(handler);
    this.handlers.set(category, handlers);

    // Return unsubscribe function
    return () => {
      const currentHandlers = this.handlers.get(category) || [];
      const index = currentHandlers.indexOf(handler);
      if (index > -1) {
        currentHandlers.splice(index, 1);
        this.handlers.set(category, currentHandlers);
      }
    };
  }

  emit(category: keyof DatabaseConfig, organizationId: string, newConfig: any): void {
    const handlers = this.handlers.get(category) || [];
    handlers.forEach(handler => {
      try {
        handler(category, organizationId, newConfig);
      } catch (error) {
        console.error('Error in config change handler:', error);
      }
    });
  }
}

export const configEvents = new ConfigEventManager();