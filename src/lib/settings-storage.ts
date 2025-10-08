/**
 * Settings Storage Utility
 *
 * Manages API keys and configuration stored in browser localStorage.
 * This approach keeps sensitive credentials on the user's device only.
 */

export interface ApiKeysSettings {
  openrouterApiKey?: string;
  openrouterAppName?: string;
  openrouterSiteUrl?: string;
  openaiApiKey?: string;
  imagerouterApiKey?: string;
}

export interface FileStorageSettings {
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  supabaseServiceRoleKey?: string;
}

export interface VectorSearchSettings {
  pineconeApiKey?: string;
  pineconeEnvironment?: string;
  pineconeIndexName?: string;
}

export interface CacheSettings {
  redisUrl?: string;
  redisToken?: string;
}

export interface BillingSettings {
  stripePublishableKey?: string;
  stripeSecretKey?: string;
  stripeWebhookSecret?: string;
}

/**
 * Get API keys from localStorage
 */
export function getApiKeys(): ApiKeysSettings {
  if (typeof window === 'undefined') return {};

  try {
    const stored = localStorage.getItem('settings_api_keys');
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.error('Failed to load API keys from localStorage:', error);
    return {};
  }
}

/**
 * Get file storage settings from localStorage
 */
export function getFileStorageSettings(): FileStorageSettings {
  if (typeof window === 'undefined') return {};

  try {
    const stored = localStorage.getItem('settings_file_storage');
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.error('Failed to load file storage settings from localStorage:', error);
    return {};
  }
}

/**
 * Get vector search settings from localStorage
 */
export function getVectorSearchSettings(): VectorSearchSettings {
  if (typeof window === 'undefined') return {};

  try {
    const stored = localStorage.getItem('settings_vector_search');
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.error('Failed to load vector search settings from localStorage:', error);
    return {};
  }
}

/**
 * Get cache settings from localStorage
 */
export function getCacheSettings(): CacheSettings {
  if (typeof window === 'undefined') return {};

  try {
    const stored = localStorage.getItem('settings_cache');
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.error('Failed to load cache settings from localStorage:', error);
    return {};
  }
}

/**
 * Get billing settings from localStorage
 */
export function getBillingSettings(): BillingSettings {
  if (typeof window === 'undefined') return {};

  try {
    const stored = localStorage.getItem('settings_billing');
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.error('Failed to load billing settings from localStorage:', error);
    return {};
  }
}

/**
 * Get the best available API key for AI chat
 * Priority: OpenRouter > OpenAI > ImageRouter
 */
export function getAiApiKey(): { provider: string; apiKey: string } | null {
  const apiKeys = getApiKeys();

  if (apiKeys.openrouterApiKey) {
    return { provider: 'openrouter', apiKey: apiKeys.openrouterApiKey };
  }

  if (apiKeys.openaiApiKey) {
    return { provider: 'openai', apiKey: apiKeys.openaiApiKey };
  }

  if (apiKeys.imagerouterApiKey) {
    return { provider: 'imagerouter', apiKey: apiKeys.imagerouterApiKey };
  }

  return null;
}

/**
 * Check if any AI API key is configured
 */
export function hasAiApiKey(): boolean {
  return getAiApiKey() !== null;
}

/**
 * Clear all settings from localStorage
 */
export function clearAllSettings(): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem('settings_api_keys');
    localStorage.removeItem('settings_file_storage');
    localStorage.removeItem('settings_vector_search');
    localStorage.removeItem('settings_cache');
    localStorage.removeItem('settings_billing');
  } catch (error) {
    console.error('Failed to clear settings from localStorage:', error);
  }
}

/**
 * Export all settings (for backup/transfer)
 */
export function exportSettings(): string {
  const settings = {
    apiKeys: getApiKeys(),
    fileStorage: getFileStorageSettings(),
    vectorSearch: getVectorSearchSettings(),
    cache: getCacheSettings(),
    billing: getBillingSettings(),
  };

  return JSON.stringify(settings, null, 2);
}

/**
 * Import settings (from backup/transfer)
 */
export function importSettings(jsonString: string): boolean {
  if (typeof window === 'undefined') return false;

  try {
    const settings = JSON.parse(jsonString);

    if (settings.apiKeys) {
      localStorage.setItem('settings_api_keys', JSON.stringify(settings.apiKeys));
    }
    if (settings.fileStorage) {
      localStorage.setItem('settings_file_storage', JSON.stringify(settings.fileStorage));
    }
    if (settings.vectorSearch) {
      localStorage.setItem('settings_vector_search', JSON.stringify(settings.vectorSearch));
    }
    if (settings.cache) {
      localStorage.setItem('settings_cache', JSON.stringify(settings.cache));
    }
    if (settings.billing) {
      localStorage.setItem('settings_billing', JSON.stringify(settings.billing));
    }

    return true;
  } catch (error) {
    console.error('Failed to import settings:', error);
    return false;
  }
}
