import { TaskType, Complexity } from '../interfaces/types';

export interface ModelConfiguration {
  id: string;
  provider: string;
  name: string;
  displayName: string;
  maxTokens: number;
  costPer1KTokens: {
    prompt: number;
    completion: number;
  };
  capabilities: {
    streaming: boolean;
    functionCalling: boolean;
    jsonMode: boolean;
    vision: boolean;
    maxRequestsPerMinute: number;
  };
  qualityScore: number;
  averageLatency: number;
  suitableFor: TaskType[];
  optimalComplexity: Complexity[];
  isActive: boolean;
  description?: string;
}

export const MODEL_CONFIGURATIONS: Record<string, ModelConfiguration> = {
  // OpenAI Models
  'openai-gpt-4': {
    id: 'openai-gpt-4',
    provider: 'openai',
    name: 'gpt-4',
    displayName: 'GPT-4',
    maxTokens: 4000, // GPT-4 Turbo max output tokens
    costPer1KTokens: { prompt: 0.03, completion: 0.06 },
    capabilities: {
      streaming: true,
      functionCalling: true,
      jsonMode: true,
      vision: false,
      maxRequestsPerMinute: 500
    },
    qualityScore: 0.95,
    averageLatency: 3000,
    suitableFor: ['complex_analysis', 'document_analysis', 'content_generation'],
    optimalComplexity: ['high', 'medium'],
    isActive: true,
    description: 'Most capable GPT-4 model for complex reasoning and analysis'
  },
  'openai-gpt-4o': {
    id: 'openai-gpt-4o',
    provider: 'openai',
    name: 'gpt-4o',
    displayName: 'GPT-4o',
    maxTokens: 4000, // GPT-4 Turbo max output tokens
    costPer1KTokens: { prompt: 0.01, completion: 0.03 },
    capabilities: {
      streaming: true,
      functionCalling: true,
      jsonMode: true,
      vision: true,
      maxRequestsPerMinute: 500
    },
    qualityScore: 0.95,
    averageLatency: 2000,
    suitableFor: ['complex_analysis', 'document_analysis', 'content_generation'],
    optimalComplexity: ['high', 'medium'],
    isActive: true,
    description: 'Most capable OpenAI model for complex reasoning and analysis'
  },
  'openai-gpt-3.5-turbo': {
    id: 'openai-gpt-3.5-turbo',
    provider: 'openai',
    name: 'gpt-3.5-turbo',
    displayName: 'GPT-3.5 Turbo',
    maxTokens: 4000, // GPT-3.5 Turbo max output tokens
    costPer1KTokens: { prompt: 0.0015, completion: 0.002 },
    capabilities: {
      streaming: true,
      functionCalling: true,
      jsonMode: false,
      vision: false,
      maxRequestsPerMinute: 3500
    },
    qualityScore: 0.85,
    averageLatency: 1500,
    suitableFor: ['simple_qa', 'classification', 'summarization'],
    optimalComplexity: ['low', 'medium'],
    isActive: true,
    description: 'Fast and cost-effective for simpler tasks'
  },
  'openai-text-embedding-3-small': {
    id: 'openai-text-embedding-3-small',
    provider: 'openai',
    name: 'text-embedding-3-small',
    displayName: 'Text Embedding 3 Small',
    maxTokens: 8192,
    costPer1KTokens: { prompt: 0.00002, completion: 0 },
    capabilities: {
      streaming: false,
      functionCalling: false,
      jsonMode: false,
      vision: false,
      maxRequestsPerMinute: 3000
    },
    qualityScore: 0.88,
    averageLatency: 800,
    suitableFor: ['embedding'],
    optimalComplexity: ['low'],
    isActive: true,
    description: 'Efficient embeddings for semantic search'
  },
  'openai-text-embedding-3-large': {
    id: 'openai-text-embedding-3-large',
    provider: 'openai',
    name: 'text-embedding-3-large',
    displayName: 'Text Embedding 3 Large',
    maxTokens: 8192,
    costPer1KTokens: { prompt: 0.00013, completion: 0 },
    capabilities: {
      streaming: false,
      functionCalling: false,
      jsonMode: false,
      vision: false,
      maxRequestsPerMinute: 3000
    },
    qualityScore: 0.95,
    averageLatency: 1200,
    suitableFor: ['embedding'],
    optimalComplexity: ['medium', 'high'],
    isActive: true,
    description: 'High-quality embeddings for complex semantic tasks'
  },

  // Anthropic Models (placeholder configurations)
  'anthropic-claude-3-opus': {
    id: 'anthropic-claude-3-opus',
    provider: 'anthropic',
    name: 'claude-3-opus-20240229',
    displayName: 'Claude 3 Opus',
    maxTokens: 200000,
    costPer1KTokens: { prompt: 0.015, completion: 0.075 },
    capabilities: {
      streaming: true,
      functionCalling: false,
      jsonMode: false,
      vision: true,
      maxRequestsPerMinute: 100
    },
    qualityScore: 0.98,
    averageLatency: 3000,
    suitableFor: ['complex_analysis', 'document_analysis', 'content_generation'],
    optimalComplexity: ['high'],
    isActive: true,
    description: 'Most powerful Claude model for complex reasoning'
  },
  'anthropic-claude-3-sonnet': {
    id: 'anthropic-claude-3-sonnet',
    provider: 'anthropic',
    name: 'claude-3-sonnet-20240229',
    displayName: 'Claude 3 Sonnet',
    maxTokens: 200000,
    costPer1KTokens: { prompt: 0.003, completion: 0.015 },
    capabilities: {
      streaming: true,
      functionCalling: false,
      jsonMode: false,
      vision: true,
      maxRequestsPerMinute: 200
    },
    qualityScore: 0.92,
    averageLatency: 2500,
    suitableFor: ['document_analysis', 'summarization', 'content_generation'],
    optimalComplexity: ['medium', 'high'],
    isActive: true,
    description: 'Balanced performance and cost for most tasks'
  },
  'anthropic-claude-3-haiku': {
    id: 'anthropic-claude-3-haiku',
    provider: 'anthropic',
    name: 'claude-3-haiku-20240307',
    displayName: 'Claude 3 Haiku',
    maxTokens: 200000,
    costPer1KTokens: { prompt: 0.00025, completion: 0.00125 },
    capabilities: {
      streaming: true,
      functionCalling: false,
      jsonMode: false,
      vision: false,
      maxRequestsPerMinute: 400
    },
    qualityScore: 0.85,
    averageLatency: 1800,
    suitableFor: ['simple_qa', 'classification', 'summarization'],
    optimalComplexity: ['low', 'medium'],
    isActive: true,
    description: 'Fast and efficient for simpler tasks'
  },

  // Google AI Models (placeholder configurations)
  'google-gemini-1.5-pro': {
    id: 'google-gemini-1.5-pro',
    provider: 'google',
    name: 'gemini-1.5-pro',
    displayName: 'Gemini 1.5 Pro',
    maxTokens: 1000000,
    costPer1KTokens: { prompt: 0.007, completion: 0.021 },
    capabilities: {
      streaming: true,
      functionCalling: true,
      jsonMode: false,
      vision: true,
      maxRequestsPerMinute: 300
    },
    qualityScore: 0.90,
    averageLatency: 2200,
    suitableFor: ['document_analysis', 'complex_analysis', 'content_generation'],
    optimalComplexity: ['medium', 'high'],
    isActive: true,
    description: 'Advanced Google model with large context window'
  },
  'google-gemini-1.5-flash': {
    id: 'google-gemini-1.5-flash',
    provider: 'google',
    name: 'gemini-1.5-flash',
    displayName: 'Gemini 1.5 Flash',
    maxTokens: 1000000,
    costPer1KTokens: { prompt: 0.00035, completion: 0.0014 },
    capabilities: {
      streaming: true,
      functionCalling: true,
      jsonMode: false,
      vision: true,
      maxRequestsPerMinute: 1000
    },
    qualityScore: 0.82,
    averageLatency: 1000,
    suitableFor: ['simple_qa', 'classification', 'summarization'],
    optimalComplexity: ['low', 'medium'],
    isActive: true,
    description: 'Fast and cost-effective Google model'
  },

  // Azure OpenAI Models (placeholder configurations)
  'azure-gpt-4': {
    id: 'azure-gpt-4',
    provider: 'azure',
    name: 'gpt-4',
    displayName: 'Azure GPT-4',
    maxTokens: 8192,
    costPer1KTokens: { prompt: 0.03, completion: 0.06 },
    capabilities: {
      streaming: true,
      functionCalling: true,
      jsonMode: false,
      vision: false,
      maxRequestsPerMinute: 300
    },
    qualityScore: 0.93,
    averageLatency: 2500,
    suitableFor: ['complex_analysis', 'document_analysis', 'content_generation'],
    optimalComplexity: ['high'],
    isActive: true,
    description: 'Enterprise Azure deployment of GPT-4'
  },
  'azure-gpt-35-turbo': {
    id: 'azure-gpt-35-turbo',
    provider: 'azure',
    name: 'gpt-35-turbo',
    displayName: 'Azure GPT-3.5 Turbo',
    maxTokens: 4096,
    costPer1KTokens: { prompt: 0.0015, completion: 0.002 },
    capabilities: {
      streaming: true,
      functionCalling: true,
      jsonMode: false,
      vision: false,
      maxRequestsPerMinute: 2400
    },
    qualityScore: 0.85,
    averageLatency: 1800,
    suitableFor: ['simple_qa', 'classification', 'summarization'],
    optimalComplexity: ['low', 'medium'],
    isActive: true,
    description: 'Enterprise Azure deployment of GPT-3.5'
  },

};

export const UNIFIED_MODEL_MAPPINGS = {
  fast: {
    openai: 'openai-gpt-3.5-turbo',
    anthropic: 'anthropic-claude-3-haiku',
    google: 'google-gemini-1.5-flash',
    azure: 'azure-gpt-35-turbo'
  },
  balanced: {
    openai: 'openai-gpt-4',
    anthropic: 'anthropic-claude-3-sonnet',
    google: 'google-gemini-1.5-pro',
    azure: 'azure-gpt-4'
  },
  powerful: {
    openai: 'openai-gpt-4',
    anthropic: 'anthropic-claude-3-opus',
    google: 'google-gemini-1.5-pro',
    azure: 'azure-gpt-4'
  },
  'embedding-small': {
    openai: 'openai-text-embedding-3-small'
  },
  'embedding-large': {
    openai: 'openai-text-embedding-3-large'
  }
};

export class ModelRegistry {
  private static instance: ModelRegistry;
  private models: Map<string, ModelConfiguration>;

  private constructor() {
    this.models = new Map(Object.entries(MODEL_CONFIGURATIONS));
  }

  static getInstance(): ModelRegistry {
    if (!ModelRegistry.instance) {
      ModelRegistry.instance = new ModelRegistry();
    }
    return ModelRegistry.instance;
  }

  getModel(modelId: string): ModelConfiguration | null {
    return this.models.get(modelId) || null;
  }

  getModelsByProvider(provider: string): ModelConfiguration[] {
    return Array.from(this.models.values()).filter(model => model.provider === provider);
  }

  getModelsByTask(taskType: TaskType): ModelConfiguration[] {
    return Array.from(this.models.values()).filter(model => 
      model.suitableFor.includes(taskType) && model.isActive
    );
  }

  getModelsByComplexity(complexity: Complexity): ModelConfiguration[] {
    return Array.from(this.models.values()).filter(model => 
      model.optimalComplexity.includes(complexity) && model.isActive
    );
  }

  getUnifiedModelId(tier: string, provider: string): string | null {
    const mapping = UNIFIED_MODEL_MAPPINGS[tier as keyof typeof UNIFIED_MODEL_MAPPINGS];
    return mapping?.[provider as keyof typeof mapping] || null;
  }

  getAllModels(): ModelConfiguration[] {
    return Array.from(this.models.values());
  }

  getActiveModels(): ModelConfiguration[] {
    return Array.from(this.models.values()).filter(model => model.isActive);
  }

  updateModelStatus(modelId: string, isActive: boolean): boolean {
    const model = this.models.get(modelId);
    if (model) {
      model.isActive = isActive;
      return true;
    }
    return false;
  }

  addCustomModel(model: ModelConfiguration): void {
    this.models.set(model.id, model);
  }

  removeModel(modelId: string): boolean {
    return this.models.delete(modelId);
  }
}