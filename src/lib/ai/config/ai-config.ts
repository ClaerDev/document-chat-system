import { TaskType, Complexity } from '../interfaces/types';
import { ai } from '@/lib/config/env';

export interface AIServiceConfiguration {
  enabled: boolean;
  maxConcurrentRequests: number;
  defaultTimeout: number;
  retryAttempts: number;
  circuitBreakerConfig: {
    failureThreshold: number;
    recoveryTimeout: number;
    monitoringWindow: number;
  };
  fallbackConfig: {
    maxAttempts: number;
    backoffMultiplier: number;
    initialBackoffMs: number;
  };
  costLimits: {
    dailyLimit: number;
    monthlyLimit: number;
    perRequestLimit: number;
  };
  qualityThresholds: {
    minimumScore: number;
    preferredScore: number;
  };
  vercel: {
    enabled: boolean;
    useFor: ('streaming' | 'chat' | 'prototyping' | 'structured-output')[];
    fallbackToOurSystem: boolean;
    costLimits: {
      maxPerRequest: number;
      maxDaily: number;
    };
    enableFunctionCalling: boolean;
    enableVision: boolean;
  };
}

export interface ProviderConfiguration {
  openai: {
    apiKey: string;
    organizationId?: string;
    maxRetries: number;
    timeout: number;
    rateLimits: {
      requestsPerMinute: number;
      tokensPerMinute: number;
    };
  };
  anthropic: {
    apiKey: string;
    maxRetries: number;
    timeout: number;
    rateLimits: {
      requestsPerMinute: number;
      tokensPerMinute: number;
    };
  };
  google: {
    apiKey: string;
    projectId?: string;
    location?: string;
    maxRetries: number;
    timeout: number;
    rateLimits: {
      requestsPerMinute: number;
      tokensPerMinute: number;
    };
  };
  azure: {
    apiKey: string;
    endpoint: string;
    apiVersion: string;
    deploymentName: string;
    maxRetries: number;
    timeout: number;
    rateLimits: {
      requestsPerMinute: number;
      tokensPerMinute: number;
    };
  };
  openrouter: {
    apiKey: string;
    appName: string;
    siteUrl: string;
    enableSmartRouting: boolean;
    costOptimization: 'aggressive' | 'balanced' | 'conservative';
    fallbackStrategy: 'internal' | 'openrouter' | 'hybrid';
    maxRetries: number;
    timeout: number;
    rateLimits: {
      requestsPerMinute: number;
      tokensPerMinute: number;
    };
  };
}

export interface TaskRoutingConfiguration {
  [taskType: string]: {
    preferredProviders: string[];
    fallbackProviders: string[];
    qualityRequirement: 'standard' | 'high' | 'premium';
    maxLatency: number;
    maxCost: number;
  };
}

export const DEFAULT_AI_CONFIG: AIServiceConfiguration = {
  enabled: true,
  maxConcurrentRequests: ai.maxConcurrentRequests,
  defaultTimeout: ai.defaultTimeout,
  retryAttempts: ai.retryAttempts,
  circuitBreakerConfig: {
    failureThreshold: ai.circuitBreakerThreshold,
    recoveryTimeout: ai.circuitBreakerTimeout,
    monitoringWindow: 300000
  },
  fallbackConfig: {
    maxAttempts: ai.retryAttempts,
    backoffMultiplier: 2,
    initialBackoffMs: ai.retryDelay
  },
  costLimits: {
    dailyLimit: ai.dailyCostLimit,
    monthlyLimit: ai.monthlyCostLimit,
    perRequestLimit: ai.perRequestCostLimit
  },
  qualityThresholds: {
    minimumScore: 0.7,
    preferredScore: 0.85
  },
  vercel: {
    enabled: false, // Disabled by default for safety
    useFor: ['streaming', 'chat', 'prototyping'],
    fallbackToOurSystem: true,
    costLimits: {
      maxPerRequest: 2.0,
      maxDaily: 50.0
    },
    enableFunctionCalling: true,
    enableVision: false
  }
};

export const DEFAULT_TASK_ROUTING: TaskRoutingConfiguration = {
  'document_analysis': {
    preferredProviders: ['openrouter', 'openai'],
    fallbackProviders: ['anthropic', 'google', 'azure'],
    qualityRequirement: 'premium',
    maxLatency: 5000,
    maxCost: 2.0
  },
  'opportunity_matching': {
    preferredProviders: ['openrouter', 'openai'],
    fallbackProviders: ['anthropic', 'google', 'azure'],
    qualityRequirement: 'high',
    maxLatency: 3000,
    maxCost: 1.0
  },
  'content_generation': {
    preferredProviders: ['openrouter', 'openai'],
    fallbackProviders: ['anthropic', 'google', 'azure'],
    qualityRequirement: 'high',
    maxLatency: 10000,
    maxCost: 3.0
  },
  'summarization': {
    preferredProviders: ['openrouter', 'openai'],
    fallbackProviders: ['anthropic', 'google', 'azure'],
    qualityRequirement: 'high',
    maxLatency: 8000,
    maxCost: 1.5
  },
  'classification': {
    preferredProviders: ['openrouter', 'openai'],
    fallbackProviders: ['anthropic', 'google', 'azure'],
    qualityRequirement: 'standard',
    maxLatency: 2000,
    maxCost: 0.5
  },
  'embedding': {
    preferredProviders: ['openai', 'google'],
    fallbackProviders: ['azure'],
    qualityRequirement: 'standard',
    maxLatency: 3000,
    maxCost: 0.1
  },
  'simple_qa': {
    preferredProviders: ['openrouter', 'openai'],
    fallbackProviders: ['anthropic', 'google', 'azure'],
    qualityRequirement: 'standard',
    maxLatency: 3000,
    maxCost: 0.8
  },
  'complex_analysis': {
    preferredProviders: ['openrouter', 'openai'],
    fallbackProviders: ['anthropic', 'google', 'azure'],
    qualityRequirement: 'premium',
    maxLatency: 15000,
    maxCost: 5.0
  }
};

export class AIConfiguration {
  private static instance: AIConfiguration;
  private config: AIServiceConfiguration;
  private providerConfig: Partial<ProviderConfiguration>;
  private taskRouting: TaskRoutingConfiguration;

  private constructor() {
    this.config = { ...DEFAULT_AI_CONFIG };
    this.providerConfig = {};
    this.taskRouting = { ...DEFAULT_TASK_ROUTING };
    this.loadFromEnvironment();
  }

  static getInstance(): AIConfiguration {
    if (!AIConfiguration.instance) {
      AIConfiguration.instance = new AIConfiguration();
    }
    return AIConfiguration.instance;
  }

  private loadFromEnvironment(): void {
    // Load from environment variables using centralized config
    this.config.maxConcurrentRequests = ai.maxConcurrentRequests;
    this.config.defaultTimeout = ai.defaultTimeout;
    this.config.retryAttempts = ai.retryAttempts;
    this.config.costLimits.dailyLimit = ai.dailyCostLimit;
    this.config.costLimits.monthlyLimit = ai.monthlyCostLimit;
    this.config.costLimits.perRequestLimit = ai.perRequestCostLimit;
    this.config.circuitBreakerConfig.failureThreshold = ai.circuitBreakerThreshold;
    this.config.circuitBreakerConfig.recoveryTimeout = ai.circuitBreakerTimeout;
    this.config.fallbackConfig.maxAttempts = ai.retryAttempts;
    this.config.fallbackConfig.initialBackoffMs = ai.retryDelay;

    // Load provider configurations
    this.loadProviderConfig();
  }

  private loadProviderConfig(): void {
    // OpenAI Configuration
    if (ai.openaiApiKey) {
      this.providerConfig.openai = {
        apiKey: ai.openaiApiKey,
        organizationId: process.env.OPENAI_ORGANIZATION_ID,
        maxRetries: ai.retryAttempts,
        timeout: ai.defaultTimeout,
        rateLimits: {
          requestsPerMinute: parseInt(process.env.OPENAI_REQUESTS_PER_MINUTE || '500'),
          tokensPerMinute: parseInt(process.env.OPENAI_TOKENS_PER_MINUTE || '150000')
        }
      };
    }

    // Anthropic Configuration
    if (ai.anthropicApiKey) {
      this.providerConfig.anthropic = {
        apiKey: ai.anthropicApiKey,
        maxRetries: ai.retryAttempts,
        timeout: ai.defaultTimeout,
        rateLimits: {
          requestsPerMinute: parseInt(process.env.ANTHROPIC_REQUESTS_PER_MINUTE || '200'),
          tokensPerMinute: parseInt(process.env.ANTHROPIC_TOKENS_PER_MINUTE || '100000')
        }
      };
    }

    // Google AI Configuration
    if (ai.googleAiApiKey) {
      this.providerConfig.google = {
        apiKey: ai.googleAiApiKey,
        projectId: process.env.GOOGLE_AI_PROJECT_ID,
        location: process.env.GOOGLE_AI_LOCATION || 'us-central1',
        maxRetries: ai.retryAttempts,
        timeout: ai.defaultTimeout,
        rateLimits: {
          requestsPerMinute: parseInt(process.env.GOOGLE_AI_REQUESTS_PER_MINUTE || '300'),
          tokensPerMinute: parseInt(process.env.GOOGLE_AI_TOKENS_PER_MINUTE || '120000')
        }
      };
    }

    // Azure OpenAI Configuration
    if (ai.azureOpenaiApiKey) {
      this.providerConfig.azure = {
        apiKey: ai.azureOpenaiApiKey,
        endpoint: ai.azureOpenaiEndpoint || '',
        apiVersion: process.env.AZURE_OPENAI_API_VERSION || '2024-02-01',
        deploymentName: process.env.AZURE_OPENAI_DEPLOYMENT_NAME || '',
        maxRetries: ai.retryAttempts,
        timeout: ai.defaultTimeout,
        rateLimits: {
          requestsPerMinute: parseInt(process.env.AZURE_OPENAI_REQUESTS_PER_MINUTE || '300'),
          tokensPerMinute: parseInt(process.env.AZURE_OPENAI_TOKENS_PER_MINUTE || '120000')
        }
      };
    }

    // OpenRouter Configuration
    if (ai.openrouterApiKey) {
      this.providerConfig.openrouter = {
        apiKey: ai.openrouterApiKey,
        appName: ai.openrouterAppName,
        siteUrl: ai.openrouterSiteUrl,
        enableSmartRouting: process.env.OPENROUTER_SMART_ROUTING === 'true',
        costOptimization: (process.env.OPENROUTER_COST_OPTIMIZATION as 'aggressive' | 'balanced' | 'conservative') || 'balanced',
        fallbackStrategy: (process.env.OPENROUTER_FALLBACK_STRATEGY as 'internal' | 'openrouter' | 'hybrid') || 'hybrid',
        maxRetries: ai.retryAttempts,
        timeout: ai.defaultTimeout,
        rateLimits: {
          requestsPerMinute: parseInt(process.env.OPENROUTER_REQUESTS_PER_MINUTE || '500'),
          tokensPerMinute: parseInt(process.env.OPENROUTER_TOKENS_PER_MINUTE || '200000')
        }
      };
    }
  }

  getServiceConfig(): AIServiceConfiguration {
    return { ...this.config };
  }

  getProviderConfig(provider: string): any {
    return this.providerConfig[provider as keyof ProviderConfiguration];
  }

  getTaskRouting(taskType: TaskType): any {
    return this.taskRouting[taskType];
  }

  updateServiceConfig(updates: Partial<AIServiceConfiguration>): void {
    this.config = { ...this.config, ...updates };
  }

  updateTaskRouting(taskType: TaskType, config: any): void {
    this.taskRouting[taskType] = { ...this.taskRouting[taskType], ...config };
  }

  isProviderConfigured(provider: string): boolean {
    return !!this.providerConfig[provider as keyof ProviderConfiguration];
  }

  getConfiguredProviders(): string[] {
    return Object.keys(this.providerConfig);
  }

  getCostLimits(): typeof this.config.costLimits {
    return { ...this.config.costLimits };
  }

  getCircuitBreakerConfig(): typeof this.config.circuitBreakerConfig {
    return { ...this.config.circuitBreakerConfig };
  }

  getFallbackConfig(): any {
    return {
      ...this.config.fallbackConfig,
      enableRetries: true,
      retryableErrors: ['RateLimitError', 'NetworkError', 'TimeoutError'],
      fallbackPreferences: {
        'document_analysis': ['openrouter', 'openai', 'anthropic', 'mock-demo'],
        'opportunity_matching': ['openrouter', 'openai', 'anthropic', 'mock-demo'],
        'content_generation': ['openrouter', 'openai', 'anthropic', 'mock-demo'],
        'summarization': ['openrouter', 'openai', 'anthropic', 'mock-demo'],
        'classification': ['openrouter', 'openai', 'anthropic', 'mock-demo'],
        'embedding': ['openai', 'mock-demo'],
        'simple_qa': ['openrouter', 'openai', 'anthropic', 'mock-demo'],
        'complex_analysis': ['openrouter', 'openai', 'anthropic', 'mock-demo']
      },
      degradedModeThreshold: 0.5
    };
  }

  validateConfiguration(): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check if at least one provider is configured
    const configuredProviders = this.getConfiguredProviders();
    if (configuredProviders.length === 0) {
      errors.push('No AI providers are configured. At least one provider is required.');
    }

    // Validate cost limits
    if (this.config.costLimits.dailyLimit <= 0) {
      warnings.push('Daily cost limit is set to 0 or negative value.');
    }

    if (this.config.costLimits.monthlyLimit <= 0) {
      warnings.push('Monthly cost limit is set to 0 or negative value.');
    }

    // Validate circuit breaker settings
    if (this.config.circuitBreakerConfig.failureThreshold <= 0) {
      errors.push('Circuit breaker failure threshold must be greater than 0.');
    }

    // Validate timeout settings
    if (this.config.defaultTimeout <= 0) {
      errors.push('Default timeout must be greater than 0.');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  reload(): void {
    this.loadFromEnvironment();
  }

  getVercelConfig(): typeof this.config.vercel {
    return { ...this.config.vercel };
  }

  updateVercelConfig(updates: Partial<typeof this.config.vercel>): void {
    this.config.vercel = { ...this.config.vercel, ...updates };
  }

  isVercelEnabled(): boolean {
    return this.config.vercel.enabled;
  }

  shouldUseVercelFor(operation: string): boolean {
    return this.config.vercel.enabled && 
           this.config.vercel.useFor.includes(operation as any);
  }
}