/**
 * Provider Management System
 * 
 * Scalable system for managing AI provider configurations, priorities, and fallback strategies.
 * This system allows admin users to dynamically configure providers without code changes.
 */

export interface ProviderPriority {
  providerId: string;
  priority: number;
  enabled: boolean;
  maxConcurrentRequests?: number;
  healthCheckInterval?: number;
  circuitBreakerThreshold?: number;
  metadata?: Record<string, any>;
}

export interface FallbackStrategy {
  id: string;
  name: string;
  description: string;
  primaryProvider: string;
  fallbackChain: string[];
  taskTypeOverrides?: Record<string, string[]>;
  conditions?: {
    maxLatency?: number;
    maxCost?: number;
    minQuality?: number;
  };
}

export interface ProviderConfiguration {
  id: string;
  name: string;
  displayName: string;
  enabled: boolean;
  priority: number;
  defaultModel: string;
  availableModels: string[];
  features: string[];
  costTier: 'low' | 'medium' | 'high';
  rateLimits: {
    requestsPerMinute: number;
    tokensPerMinute: number;
  };
  healthCheck: {
    enabled: boolean;
    interval: number;
    timeout: number;
  };
  metadata: Record<string, any>;
}

export interface OrganizationProviderSettings {
  organizationId: string;
  defaultProvider: string;
  fallbackStrategy: string;
  providerPriorities: ProviderPriority[];
  customFallbackChain?: string[];
  costLimits: {
    dailyLimit: number;
    monthlyLimit: number;
    perRequestLimit: number;
  };
  allowedProviders: string[];
  restrictedModels?: string[];
  metadata?: Record<string, any>;
  updatedAt: Date;
  updatedBy: string;
}

export class ProviderManager {
  private static instance: ProviderManager;
  private configurations: Map<string, ProviderConfiguration> = new Map();
  private fallbackStrategies: Map<string, FallbackStrategy> = new Map();
  private organizationSettings: Map<string, OrganizationProviderSettings> = new Map();

  private constructor() {
    this.initializeDefaultConfigurations();
    this.initializeDefaultFallbackStrategies();
  }

  static getInstance(): ProviderManager {
    if (!ProviderManager.instance) {
      ProviderManager.instance = new ProviderManager();
    }
    return ProviderManager.instance;
  }

  private initializeDefaultConfigurations(): void {
    // Default OpenRouter configuration
    this.configurations.set('openrouter', {
      id: 'openrouter',
      name: 'openrouter',
      displayName: 'OpenRouter',
      enabled: true,
      priority: 10,
      defaultModel: 'openai/gpt-4o-mini',
      availableModels: [
        'openai/gpt-4o-mini',
        'openai/gpt-4o',
        'anthropic/claude-3-5-sonnet',
        'meta-llama/llama-3.1-8b-instruct',
        'google/gemini-pro',
        'mistral/mistral-7b-instruct'
      ],
      features: ['chat', 'completion', 'multi-provider', 'cost-optimization', 'smart-routing'],
      costTier: 'low',
      rateLimits: {
        requestsPerMinute: 500,
        tokensPerMinute: 200000
      },
      healthCheck: {
        enabled: true,
        interval: 120000,
        timeout: 10000
      },
      metadata: {
        description: 'Access to 200+ AI models with transparent pricing',
        benefits: ['Cost optimization', 'Model diversity', 'Smart routing', 'Transparent pricing'],
        website: 'https://openrouter.ai'
      }
    });

    // Default OpenAI configuration
    this.configurations.set('openai', {
      id: 'openai',
      name: 'openai',
      displayName: 'OpenAI',
      enabled: true,
      priority: 9,
      defaultModel: 'gpt-4o-mini',
      availableModels: ['gpt-4o-mini', 'gpt-4o', 'gpt-3.5-turbo'],
      features: ['chat', 'completion', 'vision', 'function-calling'],
      costTier: 'medium',
      rateLimits: {
        requestsPerMinute: 500,
        tokensPerMinute: 150000
      },
      healthCheck: {
        enabled: true,
        interval: 60000,
        timeout: 10000
      },
      metadata: {
        description: 'OpenAI GPT models - Direct access',
        benefits: ['High quality', 'Fast responses', 'Vision support', 'Function calling'],
        website: 'https://openai.com'
      }
    });

    // Default Anthropic configuration (backend only)
    this.configurations.set('anthropic', {
      id: 'anthropic',
      name: 'anthropic',
      displayName: 'Anthropic',
      enabled: true,
      priority: 8,
      defaultModel: 'claude-3-5-sonnet-20241022',
      availableModels: ['claude-3-5-sonnet-20241022', 'claude-3-opus-20240229', 'claude-3-haiku-20240307'],
      features: ['chat', 'completion', 'vision', 'long-context'],
      costTier: 'medium',
      rateLimits: {
        requestsPerMinute: 200,
        tokensPerMinute: 100000
      },
      healthCheck: {
        enabled: true,
        interval: 300000,
        timeout: 10000
      },
      metadata: {
        description: 'Anthropic Claude models - Backend fallback',
        benefits: ['Long context', 'High quality', 'Safety focused', 'Reasoning'],
        website: 'https://anthropic.com',
        uiVisible: false // Hide from UI
      }
    });

    // ImageRouter configuration
    this.configurations.set('imagerouter', {
      id: 'imagerouter',
      name: 'imagerouter',
      displayName: 'ImageRouter',
      enabled: true,
      priority: 7,
      defaultModel: 'test/test',
      availableModels: ['test/test', 'ir/test-video'],
      features: ['image-generation', 'video-generation', 'media', 'multi-provider'],
      costTier: 'medium',
      rateLimits: {
        requestsPerMinute: 30,
        tokensPerMinute: 50000
      },
      healthCheck: {
        enabled: true,
        interval: 180000,
        timeout: 10000
      },
      metadata: {
        description: 'AI-powered image and video generation via ImageRouter',
        benefits: ['Multiple image models', 'Video generation', 'Cost optimization', 'Fast generation'],
        website: 'https://imagerouter.io'
      }
    });

    // Demo provider configuration (always available as final fallback)
    this.configurations.set('demo', {
      id: 'demo',
      name: 'demo',
      displayName: 'Demo Mode',
      enabled: true,
      priority: 0,
      defaultModel: 'demo-gpt-4o-mini',
      availableModels: ['demo-gpt-4o-mini', 'demo-gpt-4o', 'demo-claude-3-5-sonnet'],
      features: ['chat', 'completion', 'demo', 'fallback', 'always-available'],
      costTier: 'low',
      rateLimits: {
        requestsPerMinute: 1000,
        tokensPerMinute: 500000
      },
      healthCheck: {
        enabled: false, // Always healthy
        interval: 0,
        timeout: 0
      },
      metadata: {
        description: 'Demo provider - Always available as final fallback',
        benefits: ['Always available', 'No cost', 'Fast responses', 'Government contracting focused'],
        website: 'https://document-chat-system.vercel.app',
        isDemo: true,
        uiVisible: false // Hide from main UI selection but show in status
      }
    });
  }

  private initializeDefaultFallbackStrategies(): void {
    // OpenRouter-first strategy
    this.fallbackStrategies.set('openrouter-first', {
      id: 'openrouter-first',
      name: 'OpenRouter First',
      description: 'Use OpenRouter by default, fallback to OpenAI, then Anthropic, and finally Demo',
      primaryProvider: 'openrouter',
      fallbackChain: ['openrouter', 'openai', 'anthropic', 'demo'],
      taskTypeOverrides: {
        'document_analysis': ['openrouter', 'anthropic', 'openai', 'demo'],
        'embedding': ['openai', 'openrouter', 'demo']
      },
      conditions: {
        maxLatency: 10000,
        maxCost: 5.0,
        minQuality: 0.8
      }
    });

    // Balanced strategy
    this.fallbackStrategies.set('balanced', {
      id: 'balanced',
      name: 'Balanced',
      description: 'Balance between OpenRouter and OpenAI based on task type, with Demo fallback',
      primaryProvider: 'openrouter',
      fallbackChain: ['openrouter', 'openai', 'anthropic', 'demo'],
      taskTypeOverrides: {
        'simple_qa': ['openrouter', 'openai', 'demo'],
        'complex_analysis': ['openrouter', 'anthropic', 'openai', 'demo'],
        'content_generation': ['openrouter', 'openai', 'anthropic', 'demo']
      }
    });

    // Cost-optimized strategy
    this.fallbackStrategies.set('cost-optimized', {
      id: 'cost-optimized',
      name: 'Cost Optimized',
      description: 'Prioritize cost-effective providers, with Demo as free fallback',
      primaryProvider: 'openrouter',
      fallbackChain: ['openrouter', 'openai', 'demo'], // Skip Anthropic for cost optimization
      conditions: {
        maxCost: 1.0,
        minQuality: 0.75
      }
    });

    // High-quality strategy
    this.fallbackStrategies.set('high-quality', {
      id: 'high-quality',
      name: 'High Quality',
      description: 'Prioritize highest quality responses, with Demo as final fallback',
      primaryProvider: 'openrouter',
      fallbackChain: ['openrouter', 'openai', 'anthropic', 'demo'],
      conditions: {
        minQuality: 0.9,
        maxLatency: 15000
      }
    });
  }

  // Configuration Management
  getProviderConfiguration(providerId: string): ProviderConfiguration | undefined {
    return this.configurations.get(providerId);
  }

  getAllProviderConfigurations(): ProviderConfiguration[] {
    return Array.from(this.configurations.values());
  }

  getUIVisibleProviders(): ProviderConfiguration[] {
    return Array.from(this.configurations.values()).filter(config => 
      config.enabled && config.metadata?.uiVisible !== false
    );
  }

  updateProviderConfiguration(providerId: string, updates: Partial<ProviderConfiguration>): void {
    const existing = this.configurations.get(providerId);
    if (!existing) {
      throw new Error(`Provider ${providerId} not found`);
    }

    const updated = { ...existing, ...updates };
    this.configurations.set(providerId, updated);
  }

  // Fallback Strategy Management
  getFallbackStrategy(strategyId: string): FallbackStrategy | undefined {
    return this.fallbackStrategies.get(strategyId);
  }

  getAllFallbackStrategies(): FallbackStrategy[] {
    return Array.from(this.fallbackStrategies.values());
  }

  createFallbackStrategy(strategy: FallbackStrategy): void {
    this.fallbackStrategies.set(strategy.id, strategy);
  }

  // Organization Settings Management
  getOrganizationSettings(organizationId: string): OrganizationProviderSettings | undefined {
    return this.organizationSettings.get(organizationId);
  }

  setOrganizationSettings(organizationId: string, settings: Partial<OrganizationProviderSettings>, updatedBy: string): void {
    const existing = this.organizationSettings.get(organizationId);
    const updated: OrganizationProviderSettings = {
      organizationId,
      defaultProvider: 'openrouter',
      fallbackStrategy: 'openrouter-first',
      providerPriorities: [],
      costLimits: {
        dailyLimit: 100,
        monthlyLimit: 1000,
        perRequestLimit: 10
      },
      allowedProviders: ['openrouter', 'openai', 'demo'],
      ...existing,
      ...settings,
      updatedAt: new Date(),
      updatedBy
    };

    this.organizationSettings.set(organizationId, updated);
  }

  // Dynamic Provider Resolution
  resolveProviderForTask(
    organizationId: string,
    taskType: string,
    options?: { respectPriority?: boolean; costLimit?: number }
  ): string {
    const orgSettings = this.getOrganizationSettings(organizationId);
    
    if (!orgSettings) {
      // Use default: OpenRouter first, then OpenAI
      return 'openrouter';
    }

    // Check if we should use custom fallback chain
    if (orgSettings.customFallbackChain && orgSettings.customFallbackChain.length > 0) {
      return orgSettings.customFallbackChain[0];
    }

    // Use fallback strategy
    const strategy = this.getFallbackStrategy(orgSettings.fallbackStrategy);
    if (!strategy) {
      return orgSettings.defaultProvider;
    }

    // Check for task-specific overrides
    if (strategy.taskTypeOverrides && strategy.taskTypeOverrides[taskType]) {
      return strategy.taskTypeOverrides[taskType][0];
    }

    return strategy.primaryProvider;
  }

  // Get fallback chain for a task
  getFallbackChainForTask(organizationId: string, taskType: string): string[] {
    const orgSettings = this.getOrganizationSettings(organizationId);
    
    if (!orgSettings) {
      return ['openrouter', 'openai', 'anthropic', 'demo'];
    }

    if (orgSettings.customFallbackChain) {
      return orgSettings.customFallbackChain;
    }

    const strategy = this.getFallbackStrategy(orgSettings.fallbackStrategy);
    if (!strategy) {
      return ['openrouter', 'openai', 'anthropic', 'demo'];
    }

    // Check for task-specific overrides
    if (strategy.taskTypeOverrides && strategy.taskTypeOverrides[taskType]) {
      return strategy.taskTypeOverrides[taskType];
    }

    return strategy.fallbackChain;
  }

  // Admin Functions
  async updateSystemDefaults(defaults: {
    defaultProvider?: string;
    defaultFallbackStrategy?: string;
    globalCostLimits?: {
      dailyLimit: number;
      monthlyLimit: number;
    };
  }): Promise<void> {
    // This would typically persist to database
    // For now, we'll update in-memory defaults
    console.log('System defaults updated:', defaults);
  }

  // Health and Monitoring
  getProviderHealthStatus(): Record<string, { healthy: boolean; lastCheck: Date; error?: string }> {
    // This would typically check actual provider health
    // For now, return mock data
    const status: Record<string, { healthy: boolean; lastCheck: Date; error?: string }> = {};
    
    for (const [providerId, config] of this.configurations) {
      if (config.enabled) {
        status[providerId] = {
          healthy: true,
          lastCheck: new Date()
        };
      }
    }
    
    return status;
  }

  // Configuration Export/Import (for admin UI)
  exportConfiguration(): {
    providers: ProviderConfiguration[];
    fallbackStrategies: FallbackStrategy[];
    organizationSettings: OrganizationProviderSettings[];
  } {
    return {
      providers: this.getAllProviderConfigurations(),
      fallbackStrategies: this.getAllFallbackStrategies(),
      organizationSettings: Array.from(this.organizationSettings.values())
    };
  }

  importConfiguration(config: {
    providers?: ProviderConfiguration[];
    fallbackStrategies?: FallbackStrategy[];
    organizationSettings?: OrganizationProviderSettings[];
  }): void {
    if (config.providers) {
      config.providers.forEach(provider => {
        this.configurations.set(provider.id, provider);
      });
    }

    if (config.fallbackStrategies) {
      config.fallbackStrategies.forEach(strategy => {
        this.fallbackStrategies.set(strategy.id, strategy);
      });
    }

    if (config.organizationSettings) {
      config.organizationSettings.forEach(settings => {
        this.organizationSettings.set(settings.organizationId, settings);
      });
    }
  }
}

// Export singleton instance
export const providerManager = ProviderManager.getInstance();

// Helper functions for common operations
export function getDefaultProvider(organizationId?: string): string {
  if (!organizationId) {
    return 'openrouter';
  }
  
  const settings = providerManager.getOrganizationSettings(organizationId);
  return settings?.defaultProvider || 'openrouter';
}

export function getFallbackChain(organizationId?: string, taskType?: string): string[] {
  if (!organizationId || !taskType) {
    return ['openrouter', 'openai', 'anthropic', 'demo'];
  }
  
  return providerManager.getFallbackChainForTask(organizationId, taskType);
}

export function getUIProviders(): ProviderConfiguration[] {
  return providerManager.getUIVisibleProviders();
}

// Types for API responses
export interface ProviderStatusResponse {
  providers: Array<{
    id: string;
    name: string;
    enabled: boolean;
    priority: number;
    healthy: boolean;
    models: string[];
    features: string[];
  }>;
  defaultProvider: string;
  fallbackStrategy: string;
}

export interface OrganizationProviderResponse {
  organizationId: string;
  settings: OrganizationProviderSettings;
  availableStrategies: FallbackStrategy[];
  providerStatus: Record<string, boolean>;
}