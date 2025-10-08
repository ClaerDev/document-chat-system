/**
 * Server-side User API Key Extractor
 *
 * Extracts user-provided API keys from request headers
 * Falls back to server env vars only for non-production or development
 */

import { NextRequest } from 'next/server';

export interface ExtractedApiKeys {
  openrouterApiKey?: string;
  openaiApiKey?: string;
  anthropicApiKey?: string;
  pineconeApiKey?: string;
  pineconeEnvironment?: string;
  pineconeIndexName?: string;
}

/**
 * Extract user API keys from request headers
 *
 * Keys are sent from the client via custom headers
 * Never stored in database - only in client localStorage
 */
export function extractUserApiKeys(request: NextRequest | Request): ExtractedApiKeys {
  const headers = request.headers;

  const keys: ExtractedApiKeys = {
    openrouterApiKey: headers.get('x-openrouter-api-key') || undefined,
    openaiApiKey: headers.get('x-openai-api-key') || undefined,
    anthropicApiKey: headers.get('x-anthropic-api-key') || undefined,
    pineconeApiKey: headers.get('x-pinecone-api-key') || undefined,
    pineconeEnvironment: headers.get('x-pinecone-environment') || undefined,
    pineconeIndexName: headers.get('x-pinecone-index') || undefined,
  };

  return keys;
}

/**
 * Get AI service configuration with fallback
 *
 * Priority:
 * 1. User-provided keys from headers (localStorage)
 * 2. Server environment variables (only as fallback)
 */
export function getAIServiceConfig(userKeys: ExtractedApiKeys) {
  return {
    openrouter: {
      apiKey: userKeys.openrouterApiKey || process.env.OPENROUTER_API_KEY,
      appName: process.env.OPENROUTER_APP_NAME || 'Document-Chat-System',
      siteUrl: process.env.OPENROUTER_SITE_URL || '',
    },
    openai: {
      apiKey: userKeys.openaiApiKey || process.env.OPENAI_API_KEY,
    },
    anthropic: {
      apiKey: userKeys.anthropicApiKey || process.env.ANTHROPIC_API_KEY,
    },
  };
}

/**
 * Get Pinecone configuration with fallback
 */
export function getPineconeConfig(userKeys: ExtractedApiKeys) {
  return {
    apiKey: userKeys.pineconeApiKey || process.env.PINECONE_API_KEY,
    environment: userKeys.pineconeEnvironment || process.env.PINECONE_ENVIRONMENT || 'us-east-1',
    indexName: userKeys.pineconeIndexName || process.env.PINECONE_INDEX_NAME || 'document-chat-index',
  };
}

/**
 * Validate that required keys are present
 */
export function validateRequiredKeys(
  userKeys: ExtractedApiKeys,
  required: {
    aiService?: boolean;
    pinecone?: boolean;
  }
): { valid: boolean; missing: string[] } {
  const missing: string[] = [];

  if (required.aiService) {
    const config = getAIServiceConfig(userKeys);
    if (!config.openrouter.apiKey && !config.openai.apiKey && !config.anthropic.apiKey) {
      missing.push('AI Service API Key (OpenRouter, OpenAI, or Anthropic)');
    }
  }

  if (required.pinecone) {
    const config = getPineconeConfig(userKeys);
    if (!config.apiKey) {
      missing.push('Pinecone API Key');
    }
    if (!config.environment) {
      missing.push('Pinecone Environment');
    }
    if (!config.indexName) {
      missing.push('Pinecone Index Name');
    }
  }

  return {
    valid: missing.length === 0,
    missing,
  };
}

/**
 * Check if using user-provided keys vs server keys
 */
export function isUsingUserKeys(userKeys: ExtractedApiKeys): boolean {
  return !!(
    userKeys.openrouterApiKey ||
    userKeys.openaiApiKey ||
    userKeys.anthropicApiKey ||
    userKeys.pineconeApiKey
  );
}

/**
 * Log which keys are being used (for debugging)
 */
export function logKeyUsage(userKeys: ExtractedApiKeys, operation: string): void {
  const usingUserKeys = isUsingUserKeys(userKeys);

  console.log(`[${operation}] Key source:`, {
    usingUserKeys,
    hasOpenRouter: !!userKeys.openrouterApiKey,
    hasOpenAI: !!userKeys.openaiApiKey,
    hasAnthropic: !!userKeys.anthropicApiKey,
    hasPinecone: !!userKeys.pineconeApiKey,
  });
}
