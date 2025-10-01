// AI Provider Adapters
// This directory contains adapters for different AI providers
// Each adapter implements the common AIProviderAdapter interface

export { OpenAIAdapter } from './openai-adapter';
export { AnthropicAdapter } from './anthropic-adapter';
export { VercelAIAdapter } from './vercel-ai-adapter';
export { SmartOpenRouterAdapter } from './smart-openrouter-adapter';

// Note: Additional provider adapters will be implemented as needed
// Examples: Google AI, Azure OpenAI adapters