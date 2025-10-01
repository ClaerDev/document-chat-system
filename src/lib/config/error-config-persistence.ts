import { z } from 'zod'
import { promises as fs } from 'fs'
import path from 'path'

/**
 * Error Configuration Persistence Layer
 * 
 * Handles saving/loading runtime configuration changes that override
 * environment variables. This allows admin APIs to update error handling
 * configuration without restarting the application.
 */

// Configuration override file path
const CONFIG_OVERRIDE_PATH = path.join(process.cwd(), '.error-config-overrides.json')

// Environment variable mapping to config paths
const ENV_VAR_MAPPING = {
  // Circuit Breaker
  'ERROR_CIRCUIT_BREAKER_FAILURE_THRESHOLD': 'circuitBreaker.failureThreshold',
  'ERROR_CIRCUIT_BREAKER_RECOVERY_TIMEOUT': 'circuitBreaker.recoveryTimeout',
  'ERROR_CIRCUIT_BREAKER_MONITORING_WINDOW': 'circuitBreaker.monitoringWindow',
  'ERROR_CIRCUIT_BREAKER_ERROR_RATE': 'circuitBreaker.expectedErrorRate',
  'ERROR_CIRCUIT_BREAKER_HALF_OPEN_CALLS': 'circuitBreaker.halfOpenMaxCalls',

  // Notifications
  'ERROR_NOTIFICATIONS_MAX_PER_MINUTE': 'notifications.maxPerMinute',
  'ERROR_NOTIFICATIONS_COOLDOWN': 'notifications.cooldownPeriod',
  'ERROR_NOTIFICATIONS_PERSISTENT_SEVERITIES': 'notifications.persistentSeverities',

  // Retry
  'ERROR_RETRY_MAX_ATTEMPTS': 'retry.maxAttempts',
  'ERROR_RETRY_BASE_DELAY': 'retry.baseDelay',
  'ERROR_RETRY_MAX_DELAY': 'retry.maxDelay',
  'ERROR_RETRY_JITTER_FACTOR': 'retry.jitterFactor',

  // Recovery
  'ERROR_RECOVERY_MAX_RETRIES': 'recovery.maxRetries',
  'ERROR_RECOVERY_TIMEOUT': 'recovery.recoveryTimeout',
  'ERROR_RECOVERY_HEALTH_CHECK_INTERVAL': 'recovery.healthCheckInterval',
  'ERROR_RECOVERY_ENABLE_AUTO': 'recovery.enableAutoRecovery',

  // Patterns
  'ERROR_PATTERNS_CORRELATION_WINDOW': 'patterns.correlationWindow',
  'ERROR_PATTERNS_BURST_THRESHOLD': 'patterns.burstThreshold',
  'ERROR_PATTERNS_CASCADE_TIMEOUT': 'patterns.cascadeTimeout',
  'ERROR_PATTERNS_TREND_WINDOW': 'patterns.trendAnalysisWindow',

  // Health
  'ERROR_HEALTH_CRITICAL_THRESHOLD': 'health.criticalThreshold',
  'ERROR_HEALTH_WARNING_THRESHOLD': 'health.warningThreshold',
  'ERROR_HEALTH_CHECK_INTERVAL': 'health.healthCheckInterval',
  'ERROR_HEALTH_HISTORY_RETENTION': 'health.historyRetention',

  // AI Services
  'ERROR_AI_TIMEOUT_MS': 'aiServices.timeoutMs',
  'ERROR_AI_RATE_LIMIT_WINDOW': 'aiServices.rateLimitWindow',
  'ERROR_AI_COST_WARNING': 'aiServices.costThresholdWarning',
  'ERROR_AI_COST_CRITICAL': 'aiServices.costThresholdCritical',
  'ERROR_AI_FALLBACK_DELAY': 'aiServices.fallbackDelay',

  // Reporting
  'ERROR_REPORTING_TRACKING': 'reporting.enableErrorTracking',
  'ERROR_REPORTING_METRICS': 'reporting.enableMetrics',
  'ERROR_REPORTING_ANALYTICS': 'reporting.enableAnalytics',
  'ERROR_REPORTING_BATCH_SIZE': 'reporting.batchSize',
  'ERROR_REPORTING_FLUSH_INTERVAL': 'reporting.flushInterval',

  // Development
  'ERROR_DEV_CONSOLE': 'development.enableConsoleLogging',
  'ERROR_DEV_DETAILED': 'development.enableDetailedErrors',
  'ERROR_DEV_MOCK_ERRORS': 'development.enableMockErrors',
  'ERROR_DEV_VERBOSE': 'development.verboseLogging',
} as const

// Schema for environment variable overrides
const envVarOverrideSchema = z.record(z.string(), z.union([z.string(), z.number(), z.boolean()]))

// Type for environment variable overrides
export type EnvVarOverrides = z.infer<typeof envVarOverrideSchema>

/**
 * Save environment variable overrides to disk
 */
export async function saveEnvVarOverrides(overrides: EnvVarOverrides): Promise<void> {
  try {
    const validated = envVarOverrideSchema.parse(overrides)
    await fs.writeFile(CONFIG_OVERRIDE_PATH, JSON.stringify(validated, null, 2), 'utf8')
    console.log('✅ Error configuration overrides saved successfully')
  } catch (error) {
    console.error('❌ Failed to save error configuration overrides:', error)
    throw new Error('Failed to save configuration overrides')
  }
}

/**
 * Load environment variable overrides from disk
 */
export async function loadEnvVarOverrides(): Promise<EnvVarOverrides> {
  try {
    const data = await fs.readFile(CONFIG_OVERRIDE_PATH, 'utf8')
    const parsed = JSON.parse(data)
    return envVarOverrideSchema.parse(parsed)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      // File doesn't exist - return empty overrides
      return {}
    }
    console.error('❌ Failed to load error configuration overrides:', error)
    return {}
  }
}

/**
 * Apply environment variable overrides to process.env
 */
export function applyEnvVarOverrides(overrides: EnvVarOverrides): void {
  Object.entries(overrides).forEach(([key, value]) => {
    process.env[key] = String(value)
  })
  console.log(`✅ Applied ${Object.keys(overrides).length} error configuration overrides`)
}

/**
 * Convert nested config object to environment variable format
 */
export function configToEnvVars(config: Record<string, any>, prefix = ''): EnvVarOverrides {
  const envVars: EnvVarOverrides = {}
  
  Object.entries(config).forEach(([key, value]) => {
    const envKey = prefix ? `${prefix}_${key.toUpperCase()}` : key.toUpperCase()
    
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      // Recursively handle nested objects
      Object.assign(envVars, configToEnvVars(value, envKey))
    } else {
      // Convert to environment variable name
      const fullEnvKey = `ERROR_${envKey}`
      
      // Only include if it's a known environment variable
      if (Object.prototype.hasOwnProperty.call(ENV_VAR_MAPPING, fullEnvKey)) {
        envVars[fullEnvKey] = value
      }
    }
  })
  
  return envVars
}

/**
 * Convert environment variables back to nested config object
 */
export function envVarsToConfig(envVars: EnvVarOverrides): Record<string, any> {
  const config: Record<string, any> = {}
  
  Object.entries(envVars).forEach(([envKey, value]) => {
    const configPath = ENV_VAR_MAPPING[envKey as keyof typeof ENV_VAR_MAPPING]
    if (configPath) {
      setNestedProperty(config, configPath, value)
    }
  })
  
  return config
}

/**
 * Set a nested property using dot notation
 */
function setNestedProperty(obj: Record<string, any>, path: string, value: any): void {
  const keys = path.split('.')
  let current = obj
  
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i]
    if (!(key in current) || typeof current[key] !== 'object') {
      current[key] = {}
    }
    current = current[key]
  }
  
  const finalKey = keys[keys.length - 1]
  current[finalKey] = value
}

/**
 * Get current environment variable overrides
 */
export async function getCurrentEnvVarOverrides(): Promise<EnvVarOverrides> {
  return loadEnvVarOverrides()
}

/**
 * Update specific environment variables
 */
export async function updateEnvVars(updates: EnvVarOverrides): Promise<void> {
  const current = await loadEnvVarOverrides()
  const merged = { ...current, ...updates }
  
  // Validate the merged configuration
  const validated = envVarOverrideSchema.parse(merged)
  
  // Save to disk
  await saveEnvVarOverrides(validated)
  
  // Apply to current process
  applyEnvVarOverrides(updates)
  
  // Clear the error config cache to force reload with new values
  const { resetErrorConfig } = await import('./error-config')
  resetErrorConfig()
}

/**
 * Remove environment variable overrides
 */
export async function removeEnvVarOverrides(keys: string[]): Promise<void> {
  const current = await loadEnvVarOverrides()
  
  keys.forEach(key => {
    delete current[key]
    delete process.env[key] // Also remove from current process
  })
  
  await saveEnvVarOverrides(current)
  
  // Clear the error config cache to force reload
  const { resetErrorConfig } = await import('./error-config')
  resetErrorConfig()
}

/**
 * Reset all overrides to environment defaults
 */
export async function resetToEnvDefaults(): Promise<void> {
  try {
    await fs.unlink(CONFIG_OVERRIDE_PATH)
    console.log('✅ Error configuration overrides reset to environment defaults')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      console.error('❌ Failed to reset error configuration overrides:', error)
      throw new Error('Failed to reset configuration overrides')
    }
  }
  
  // Clear the error config cache to force reload
  const { resetErrorConfig } = await import('./error-config')
  resetErrorConfig()
}

/**
 * Validate environment variable values
 */
export function validateEnvVar(key: string, value: any): { valid: boolean; error?: string } {
  const configPath = ENV_VAR_MAPPING[key as keyof typeof ENV_VAR_MAPPING]
  if (!configPath) {
    return { valid: false, error: `Unknown environment variable: ${key}` }
  }
  
  // Basic type validation based on the key
  if (key.includes('THRESHOLD') || key.includes('TIMEOUT') || key.includes('DELAY') || 
      key.includes('WINDOW') || key.includes('INTERVAL') || key.includes('SIZE') ||
      key.includes('ATTEMPTS') || key.includes('RETRIES') || key.includes('CALLS') ||
      key.includes('RETENTION')) {
    const num = Number(value)
    if (isNaN(num) || num < 0) {
      return { valid: false, error: `${key} must be a positive number` }
    }
  }
  
  if (key.includes('_RATE') || key.includes('FACTOR')) {
    const num = Number(value)
    if (isNaN(num) || num < 0 || num > 1) {
      return { valid: false, error: `${key} must be a number between 0 and 1` }
    }
  }
  
  if (key.includes('ENABLE') || key.includes('TRACKING') || key.includes('METRICS') || 
      key.includes('ANALYTICS') || key.includes('CONSOLE') || key.includes('DETAILED') ||
      key.includes('MOCK') || key.includes('VERBOSE')) {
    if (typeof value !== 'boolean' && value !== 'true' && value !== 'false') {
      return { valid: false, error: `${key} must be a boolean (true/false)` }
    }
  }
  
  return { valid: true }
}

/**
 * Get all available environment variables for error configuration
 */
export function getAvailableEnvVars(): Array<{
  key: string
  configPath: string
  description: string
  type: 'number' | 'boolean' | 'string' | 'array'
  defaultValue?: any
}> {
  return Object.entries(ENV_VAR_MAPPING).map(([key, configPath]) => {
    let type: 'number' | 'boolean' | 'string' | 'array' = 'string'
    let description = `Configuration for ${configPath.replace(/\./g, ' ')}`
    
    if (key.includes('THRESHOLD') || key.includes('TIMEOUT') || key.includes('DELAY') || 
        key.includes('WINDOW') || key.includes('INTERVAL') || key.includes('SIZE') ||
        key.includes('ATTEMPTS') || key.includes('RETRIES') || key.includes('CALLS') ||
        key.includes('RETENTION')) {
      type = 'number'
    } else if (key.includes('ENABLE') || key.includes('TRACKING') || key.includes('METRICS') || 
               key.includes('ANALYTICS') || key.includes('CONSOLE') || key.includes('DETAILED') ||
               key.includes('MOCK') || key.includes('VERBOSE')) {
      type = 'boolean'
    } else if (key.includes('SEVERITIES')) {
      type = 'array'
      description = 'Comma-separated list of error severities'
    }
    
    return {
      key,
      configPath,
      description,
      type
    }
  })
}

// Initialize overrides on import (server-side only)
if (typeof window === 'undefined') {
  loadEnvVarOverrides().then(overrides => {
    if (Object.keys(overrides).length > 0) {
      applyEnvVarOverrides(overrides)
      console.log('🔧 Error configuration overrides loaded from disk')
    }
  }).catch(error => {
    console.warn('⚠️ Could not load error configuration overrides:', error.message)
  })
}