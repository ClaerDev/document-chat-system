/**
 * AI Provider Factory
 * Creates and configures AI provider instances based on provider type
 */

import { OpenAIAdapter } from './openai-adapter';
import { AnthropicAdapter } from './anthropic-adapter';
import { VercelAIAdapter } from './vercel-ai-adapter';
import { SmartOpenRouterAdapter } from './smart-openrouter-adapter';

export enum AI_PROVIDERS {
  OPENAI = 'openai',
  ANTHROPIC = 'anthropic',
  VERCEL_AI = 'vercel_ai',
  OPENROUTER = 'openrouter'
}

export interface AIProviderConfig {
  apiKey: string;
  model?: string;
  [key: string]: any;
}

export function createAIProvider(providerType: AI_PROVIDERS, config: AIProviderConfig) {
  switch (providerType) {
    case AI_PROVIDERS.OPENAI:
      return new OpenAIAdapter({
        apiKey: config.apiKey,
        ...config
      });
      
    case AI_PROVIDERS.ANTHROPIC:
      return new AnthropicAdapter({
        apiKey: config.apiKey,
        ...config
      });
      
    case AI_PROVIDERS.VERCEL_AI:
      return new VercelAIAdapter({
        apiKey: config.apiKey,
        ...config
      });
      
    case AI_PROVIDERS.OPENROUTER:
      return new SmartOpenRouterAdapter({
        apiKey: config.apiKey,
        ...config
      });
      
    default:
      throw new Error(`Unsupported AI provider: ${providerType}`);
  }
}