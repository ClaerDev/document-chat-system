/**
 * Client-side API Key Manager
 *
 * Manages user API keys stored in localStorage
 * Keys are NEVER sent to the database - only stored locally
 */

export interface UserApiKeys {
  // AI Services
  openrouterApiKey?: string;
  openrouterAppName?: string;
  openrouterSiteUrl?: string;
  openaiApiKey?: string;
  anthropicApiKey?: string;

  // Vector Database
  pineconeApiKey?: string;
  pineconeEnvironment?: string;
  pineconeIndexName?: string;

  // File Storage (optional - uses server keys if not provided)
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  supabaseServiceRoleKey?: string;
}

const STORAGE_KEY = 'user_api_keys';

/**
 * Get all user API keys from localStorage
 */
export function getUserApiKeys(): UserApiKeys {
  if (typeof window === 'undefined') {
    return {};
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return {};

    return JSON.parse(stored);
  } catch (error) {
    console.error('Failed to retrieve API keys from localStorage:', error);
    return {};
  }
}

/**
 * Save user API keys to localStorage
 */
export function saveUserApiKeys(keys: UserApiKeys): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(keys));
  } catch (error) {
    console.error('Failed to save API keys to localStorage:', error);
    throw new Error('Failed to save API keys');
  }
}

/**
 * Clear all user API keys from localStorage
 */
export function clearUserApiKeys(): void {
  if (typeof window === 'undefined') {
    return;
  }

  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Check if required keys are present for document operations
 */
export function hasRequiredKeysForAnalysis(): boolean {
  const keys = getUserApiKeys();

  // Need at least one AI service key
  const hasAIKey = !!(keys.openrouterApiKey || keys.openaiApiKey || keys.anthropicApiKey);

  return hasAIKey;
}

/**
 * Check if required keys are present for vectorization
 */
export function hasRequiredKeysForVectorization(): boolean {
  const keys = getUserApiKeys();

  // Need AI key for embeddings and Pinecone for storage
  const hasAIKey = !!(keys.openrouterApiKey || keys.openaiApiKey);
  const hasPinecone = !!(keys.pineconeApiKey && keys.pineconeEnvironment && keys.pineconeIndexName);

  return hasAIKey && hasPinecone;
}

/**
 * Get specific API key
 */
export function getApiKey(keyName: keyof UserApiKeys): string | undefined {
  const keys = getUserApiKeys();
  return keys[keyName];
}

/**
 * Check which services are configured
 */
export function getConfiguredServices(): {
  hasOpenRouter: boolean;
  hasOpenAI: boolean;
  hasAnthropic: boolean;
  hasPinecone: boolean;
  hasSupabase: boolean;
} {
  const keys = getUserApiKeys();

  return {
    hasOpenRouter: !!keys.openrouterApiKey,
    hasOpenAI: !!keys.openaiApiKey,
    hasAnthropic: !!keys.anthropicApiKey,
    hasPinecone: !!(keys.pineconeApiKey && keys.pineconeEnvironment && keys.pineconeIndexName),
    hasSupabase: !!(keys.supabaseUrl && keys.supabaseAnonKey)
  };
}

/**
 * Get missing required services for a specific operation
 */
export function getMissingKeys(operation: 'analysis' | 'vectorization'): string[] {
  const keys = getUserApiKeys();
  const missing: string[] = [];

  if (operation === 'analysis') {
    if (!keys.openrouterApiKey && !keys.openaiApiKey && !keys.anthropicApiKey) {
      missing.push('AI Service (OpenRouter, OpenAI, or Anthropic)');
    }
  }

  if (operation === 'vectorization') {
    if (!keys.openrouterApiKey && !keys.openaiApiKey) {
      missing.push('AI Service for Embeddings (OpenRouter or OpenAI)');
    }
    if (!keys.pineconeApiKey) {
      missing.push('Pinecone API Key');
    }
    if (!keys.pineconeEnvironment) {
      missing.push('Pinecone Environment');
    }
    if (!keys.pineconeIndexName) {
      missing.push('Pinecone Index Name');
    }
  }

  return missing;
}

/**
 * Create headers object with API keys for server requests
 */
export function createApiKeyHeaders(): Record<string, string> {
  const keys = getUserApiKeys();
  const headers: Record<string, string> = {};

  if (keys.openrouterApiKey) {
    headers['x-openrouter-api-key'] = keys.openrouterApiKey;
  }
  if (keys.openaiApiKey) {
    headers['x-openai-api-key'] = keys.openaiApiKey;
  }
  if (keys.anthropicApiKey) {
    headers['x-anthropic-api-key'] = keys.anthropicApiKey;
  }
  if (keys.pineconeApiKey) {
    headers['x-pinecone-api-key'] = keys.pineconeApiKey;
  }
  if (keys.pineconeEnvironment) {
    headers['x-pinecone-environment'] = keys.pineconeEnvironment;
  }
  if (keys.pineconeIndexName) {
    headers['x-pinecone-index'] = keys.pineconeIndexName;
  }

  return headers;
}
