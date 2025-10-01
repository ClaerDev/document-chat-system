/**
 * Vercel AI SDK Models Configuration
 * Provides model providers for use with Vercel AI SDK
 */

import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { google } from '@ai-sdk/google';

// Default provider for Vercel AI SDK integration
export const myProvider = {
  languageModel: (modelId: string) => {
    // Map common model IDs to specific providers
    switch (modelId) {
      case 'gpt-4':
      case 'gpt-4o':
      case 'gpt-4o-mini':
      case 'gpt-3.5-turbo':
      case 'chat-model':
        return openai('gpt-4o-mini'); // Use cost-effective model for demos
      
      case 'claude-3-sonnet':
      case 'claude-3-haiku':
      case 'claude-3-opus':
        return anthropic('claude-3-haiku-20240307'); // Use cost-effective model
      
      case 'gemini-1.5-pro':
      case 'gemini-1.5-flash':
        return google('gemini-1.5-flash'); // Use cost-effective model
      
      default:
        // Default to OpenAI GPT-4o-mini for unknown models
        return openai('gpt-4o-mini');
    }
  }
};

// Named exports for specific providers
export const openaiProvider = openai;
export const anthropicProvider = anthropic;
export const googleProvider = google;

// Model configuration with cost optimization
export const modelConfig = {
  // Development/Demo models (cost-optimized)
  demo: {
    chat: openai('gpt-4o-mini'),
    completion: openai('gpt-4o-mini'),
    embedding: openai('text-embedding-3-small')
  },
  
  // Production models (quality-optimized)
  production: {
    chat: openai('gpt-4o'),
    completion: openai('gpt-4o'),
    embedding: openai('text-embedding-3-large')
  },
  
  // Specialized models
  analysis: anthropic('claude-3-sonnet-20240229'),
  creative: openai('gpt-4o'),
  fast: google('gemini-1.5-flash')
};

// Environment-based model selection
export function getModel(type: 'chat' | 'completion' | 'embedding' = 'chat') {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const config = isDevelopment ? modelConfig.demo : modelConfig.production;
  return config[type];
}

// Cost-effective model selection for A/B testing
export function getCostOptimizedModel(provider: 'openai' | 'anthropic' | 'google' = 'openai') {
  switch (provider) {
    case 'openai':
      return openai('gpt-4o-mini');
    case 'anthropic':
      return anthropic('claude-3-haiku-20240307');
    case 'google':
      return google('gemini-1.5-flash');
    default:
      return openai('gpt-4o-mini');
  }
}