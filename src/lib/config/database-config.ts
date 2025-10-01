/**
 * Database Configuration Management
 * 
 * Handles dynamic configuration stored in the database that can be updated
 * through admin interfaces or programmatically
 */

import { prisma } from '@/lib/db';
import { cache, rateLimit, billing } from '@/lib/config/env';

export interface DatabaseConfig {
  // Rate Limiting Configuration
  rateLimiting: {
    matchScores: { window: number; max: number };
    search: { window: number; max: number };
    ai: { window: number; max: number };
    api: { window: number; max: number };
    upload: { window: number; max: number };
  };
  
  // Cache Configuration
  caching: {
    ttl: {
      short: number;
      medium: number;
      long: number;
      day: number;
      week: number;
    };
    pricingTtl: number;
  };
  
  // Billing Configuration
  billing: {
    costPerApiCall: number;
    costPerCacheHit: number;
    costPerAiCall: number;
  };
  
  // File Upload Configuration
  fileUpload: {
    maxSize: number;
    defaultPageSize: number;
    maxPageSize: number;
  };
  
  // AI Configuration
  ai: {
    maxConcurrentRequests: number;
    defaultTimeout: number;
    dailyCostLimit: number;
    monthlyCostLimit: number;
    perRequestCostLimit: number;
    retryAttempts: number;
    retryDelay: number;
    circuitBreakerThreshold: number;
    circuitBreakerTimeout: number;
  };
  
  // Feature Flags
  features: {
    enableAdvancedAnalytics: boolean;
    enableExperimentalFeatures: boolean;
    enableBetaFeatures: boolean;
    enableDocumentChat: boolean;
    enableContentGeneration: boolean;
  };
}

class DatabaseConfigManager {
  private static instance: DatabaseConfigManager;
  private configCache: Map<string, { data: any; timestamp: number }> = new Map();
  private readonly cacheTtl = 5 * 60 * 1000; // 5 minutes

  static getInstance(): DatabaseConfigManager {
    if (!DatabaseConfigManager.instance) {
      DatabaseConfigManager.instance = new DatabaseConfigManager();
    }
    return DatabaseConfigManager.instance;
  }

  /**
   * Get configuration for an organization with fallback to defaults
   */
  async getConfig(organizationId: string, category: keyof DatabaseConfig): Promise<any> {
    const cacheKey = `${organizationId}:${category}`;
    const cached = this.configCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTtl) {
      return cached.data;
    }

    try {
      const orgSettings = await prisma.organizationSettings.findUnique({
        where: {
          organizationId_category: {
            organizationId,
            category: category.toUpperCase()
          }
        }
      });

      let config;
      if (orgSettings) {
        config = orgSettings.settings;
      } else {
        config = this.getDefaultConfig(category);
      }

      // Cache the result
      this.configCache.set(cacheKey, {
        data: config,
        timestamp: Date.now()
      });

      return config;
    } catch (error) {
      console.error(`Error fetching config for ${category}:`, error);
      return this.getDefaultConfig(category);
    }
  }

  /**
   * Update configuration for an organization
   */
  async updateConfig(
    organizationId: string,
    category: keyof DatabaseConfig,
    settings: any,
    updatedBy?: string
  ): Promise<void> {
    try {
      await prisma.organizationSettings.upsert({
        where: {
          organizationId_category: {
            organizationId,
            category: category.toUpperCase()
          }
        },
        update: {
          settings,
          updatedBy,
          updatedAt: new Date()
        },
        create: {
          organizationId,
          category: category.toUpperCase(),
          settings,
          createdBy: updatedBy,
          updatedBy
        }
      });

      // Invalidate cache
      const cacheKey = `${organizationId}:${category}`;
      this.configCache.delete(cacheKey);
    } catch (error) {
      console.error(`Error updating config for ${category}:`, error);
      throw error;
    }
  }

  /**
   * Get default configuration values (fallback to environment variables)
   */
  private getDefaultConfig(category: keyof DatabaseConfig): any {
    switch (category) {
      case 'rateLimiting':
        return {
          matchScores: rateLimit.matchScores,
          search: rateLimit.search,
          ai: rateLimit.ai,
          api: rateLimit.api,
          upload: rateLimit.upload
        };

      case 'caching':
        return {
          ttl: cache.ttl,
          pricingTtl: cache.pricingTtl
        };

      case 'billing':
        return {
          costPerApiCall: billing.costPerApiCall,
          costPerCacheHit: billing.costPerCacheHit,
          costPerAiCall: billing.costPerAiCall
        };

      case 'fileUpload':
        return {
          maxSize: 10 * 1024 * 1024, // 10MB default
          defaultPageSize: 25,
          maxPageSize: 100
        };

      case 'ai':
        return {
          maxConcurrentRequests: 100,
          defaultTimeout: 30000,
          dailyCostLimit: 100.0,
          monthlyCostLimit: 1000.0,
          perRequestCostLimit: 5.0,
          retryAttempts: 3,
          retryDelay: 1000,
          circuitBreakerThreshold: 5,
          circuitBreakerTimeout: 60000
        };

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
   * Initialize default configurations for a new organization
   */
  async initializeOrgDefaults(organizationId: string, createdBy?: string): Promise<void> {
    const categories: (keyof DatabaseConfig)[] = [
      'rateLimiting',
      'caching', 
      'billing',
      'fileUpload',
      'ai',
      'features'
    ];

    for (const category of categories) {
      try {
        const defaultConfig = this.getDefaultConfig(category);
        await this.updateConfig(organizationId, category, defaultConfig, createdBy);
      } catch (error) {
        console.error(`Error initializing ${category} config for org ${organizationId}:`, error);
      }
    }
  }

  /**
   * Clear cache for a specific organization or category
   */
  clearCache(organizationId?: string, category?: keyof DatabaseConfig): void {
    if (organizationId && category) {
      const cacheKey = `${organizationId}:${category}`;
      this.configCache.delete(cacheKey);
    } else if (organizationId) {
      // Clear all cache entries for this organization
      for (const key of this.configCache.keys()) {
        if (key.startsWith(`${organizationId}:`)) {
          this.configCache.delete(key);
        }
      }
    } else {
      // Clear all cache
      this.configCache.clear();
    }
  }

  /**
   * Get all configurations for an organization
   */
  async getAllConfigs(organizationId: string): Promise<DatabaseConfig> {
    const [rateLimiting, caching, billing, fileUpload, ai, features] = await Promise.all([
      this.getConfig(organizationId, 'rateLimiting'),
      this.getConfig(organizationId, 'caching'),
      this.getConfig(organizationId, 'billing'),
      this.getConfig(organizationId, 'fileUpload'),
      this.getConfig(organizationId, 'ai'),
      this.getConfig(organizationId, 'features')
    ]);

    return {
      rateLimiting,
      caching,
      billing,
      fileUpload,
      ai,
      features
    };
  }

  /**
   * Validate configuration values
   */
  validateConfig(category: keyof DatabaseConfig, config: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    switch (category) {
      case 'rateLimiting':
        if (config.matchScores?.max && config.matchScores.max <= 0) {
          errors.push('Match scores rate limit max must be greater than 0');
        }
        if (config.ai?.max && config.ai.max <= 0) {
          errors.push('AI rate limit max must be greater than 0');
        }
        break;

      case 'billing':
        if (config.costPerApiCall && config.costPerApiCall < 0) {
          errors.push('Cost per API call must be non-negative');
        }
        if (config.costPerAiCall && config.costPerAiCall < 0) {
          errors.push('Cost per AI call must be non-negative');
        }
        break;

      case 'fileUpload':
        if (config.maxSize && config.maxSize <= 0) {
          errors.push('Max file size must be greater than 0');
        }
        if (config.maxPageSize && config.maxPageSize <= 0) {
          errors.push('Max page size must be greater than 0');
        }
        break;

      case 'ai':
        if (config.defaultTimeout && config.defaultTimeout <= 0) {
          errors.push('AI default timeout must be greater than 0');
        }
        if (config.dailyCostLimit && config.dailyCostLimit < 0) {
          errors.push('Daily cost limit must be non-negative');
        }
        break;
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

// Export singleton instance
export const dbConfig = DatabaseConfigManager.getInstance();

// Helper functions for common operations
export async function getOrgConfig<T>(
  organizationId: string, 
  category: keyof DatabaseConfig
): Promise<T> {
  return dbConfig.getConfig(organizationId, category);
}

export async function updateOrgConfig(
  organizationId: string,
  category: keyof DatabaseConfig,
  settings: any,
  updatedBy?: string
): Promise<void> {
  const validation = dbConfig.validateConfig(category, settings);
  if (!validation.isValid) {
    throw new Error(`Invalid configuration: ${validation.errors.join(', ')}`);
  }
  
  return dbConfig.updateConfig(organizationId, category, settings, updatedBy);
}

export async function initializeOrgDefaults(
  organizationId: string,
  createdBy?: string
): Promise<void> {
  return dbConfig.initializeOrgDefaults(organizationId, createdBy);
}