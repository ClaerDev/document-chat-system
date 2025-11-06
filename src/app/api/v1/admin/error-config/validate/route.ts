import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { validateEnvVar, configToEnvVars } from '@/lib/config/error-config-persistence'
import { validateConfig } from '@/lib/config/error-config'
import { isAdmin } from '@/lib/auth/admin-auth'

/**
 * @swagger
 * /api/v1/admin/error-config/validate:
 *   post:
 *     summary: Validate error configuration without applying changes
 *     description: Test configuration changes for validity without actually applying them to the system
 *     tags: [Admin - Error Configuration]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               updateType:
 *                 type: string
 *                 enum: [config, envVars]
 *                 description: Whether to validate config object or environment variables
 *               config:
 *                 type: object
 *                 description: Nested configuration object to validate (when updateType is 'config')
 *               envVars:
 *                 type: object
 *                 description: Environment variable overrides to validate (when updateType is 'envVars')
 *             example:
 *               updateType: envVars
 *               envVars:
 *                 ERROR_RETRY_MAX_ATTEMPTS: 5
 *                 ERROR_NOTIFICATIONS_MAX_PER_MINUTE: 15
 *                 ERROR_CIRCUIT_BREAKER_ERROR_RATE: 0.2
 *     responses:
 *       200:
 *         description: Validation results
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 valid:
 *                   type: boolean
 *                 errors:
 *                   type: array
 *                   items:
 *                     type: string
 *                 warnings:
 *                   type: array
 *                   items:
 *                     type: string
 *                 recommendations:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       key:
 *                         type: string
 *                       current:
 *                         type: string
 *                       recommended:
 *                         type: string
 *                       reason:
 *                         type: string
 *       400:
 *         description: Invalid request format
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
export async function POST(request: NextRequest) {
  try {
    // Verify admin access
    const isAdminUser = await isAdmin();
    if (!isAdminUser) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - Admin access required' },
        { status: 401 }
      );
    }

    const body = await request.json()
    const validationSchema = z.object({
      updateType: z.enum(['config', 'envVars']).default('envVars'),
      config: z.record(z.any()).optional(),
      envVars: z.record(z.union([z.string(), z.number(), z.boolean()])).optional(),
    })

    const { updateType, config, envVars } = validationSchema.parse(body)

    const errors: string[] = []
    const warnings: string[] = []
    const recommendations: Array<{
      key: string
      current: any
      recommended: any
      reason: string
    }> = []

    let envVarsToValidate: Record<string, any> = {}

    if (updateType === 'config') {
      if (!config) {
        return NextResponse.json(
          { success: false, error: 'Config object required when updateType is "config"' },
          { status: 400 }
        )
      }

      // Validate the config object structure
      const configValidation = validateConfig(config)
      if (!configValidation.valid && configValidation.errors) {
        errors.push(...configValidation.errors)
      }

      // Convert to environment variables for further validation
      envVarsToValidate = configToEnvVars(config)
    } else {
      if (!envVars) {
        return NextResponse.json(
          { success: false, error: 'envVars object required when updateType is "envVars"' },
          { status: 400 }
        )
      }
      
      envVarsToValidate = envVars
    }

    // Validate each environment variable
    Object.entries(envVarsToValidate).forEach(([key, value]) => {
      const validation = validateEnvVar(key, value)
      if (!validation.valid) {
        errors.push(`${key}: ${validation.error}`)
      }

      // Add specific recommendations based on the key and value
      const recommendation = getConfigRecommendation(key, value)
      if (recommendation) {
        recommendations.push({ key, current: value, ...recommendation })
      }

      // Add warnings for potentially problematic values
      const warning = getConfigWarning(key, value)
      if (warning) {
        warnings.push(`${key}: ${warning}`)
      }
    })

    // Cross-validation checks
    const crossValidation = performCrossValidation(envVarsToValidate)
    errors.push(...crossValidation.errors)
    warnings.push(...crossValidation.warnings)
    recommendations.push(...crossValidation.recommendations)

    const isValid = errors.length === 0

    return NextResponse.json({
      success: true,
      valid: isValid,
      errors,
      warnings,
      recommendations,
      summary: {
        totalChecked: Object.keys(envVarsToValidate).length,
        errorCount: errors.length,
        warningCount: warnings.length,
        recommendationCount: recommendations.length,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Failed to validate error configuration:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Invalid request format',
        validationErrors: error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
      }, { status: 400 })
    }

    return NextResponse.json(
      { success: false, error: 'Failed to validate configuration' },
      { status: 500 }
    )
  }
}

/**
 * Get configuration recommendations for specific values
 */
function getConfigRecommendation(key: string, value: any): { recommended: any; reason: string } | null {
  // Retry recommendations
  if (key === 'ERROR_RETRY_MAX_ATTEMPTS' && Number(value) > 5) {
    return {
      recommended: 3,
      reason: 'More than 5 retries can lead to cascading failures and poor user experience'
    }
  }

  if (key === 'ERROR_RETRY_BASE_DELAY' && Number(value) < 500) {
    return {
      recommended: 1000,
      reason: 'Very short delays may overwhelm failing services'
    }
  }

  // Circuit breaker recommendations
  if (key === 'ERROR_CIRCUIT_BREAKER_FAILURE_THRESHOLD' && Number(value) < 3) {
    return {
      recommended: 5,
      reason: 'Too sensitive - may trigger circuit breaker on temporary issues'
    }
  }

  if (key === 'ERROR_CIRCUIT_BREAKER_RECOVERY_TIMEOUT' && Number(value) < 10000) {
    return {
      recommended: 30000,
      reason: 'Short recovery timeout may not allow services to fully recover'
    }
  }

  // Notification recommendations
  if (key === 'ERROR_NOTIFICATIONS_MAX_PER_MINUTE' && Number(value) > 20) {
    return {
      recommended: 10,
      reason: 'Too many notifications can overwhelm users and reduce effectiveness'
    }
  }

  // Health monitoring recommendations
  if (key === 'ERROR_HEALTH_CRITICAL_THRESHOLD' && Number(value) > 20) {
    return {
      recommended: 10,
      reason: 'High threshold may delay critical issue detection'
    }
  }

  return null
}

/**
 * Get configuration warnings for potentially problematic values
 */
function getConfigWarning(key: string, value: any): string | null {
  // Performance warnings
  if (key === 'ERROR_HEALTH_CHECK_INTERVAL' && Number(value) < 5000) {
    return 'Very frequent health checks may impact performance'
  }

  if (key === 'ERROR_REPORTING_FLUSH_INTERVAL' && Number(value) < 10000) {
    return 'Frequent flushing may impact performance and rate limits'
  }

  // Cost warnings
  if (key === 'ERROR_AI_COST_WARNING' && Number(value) < 50) {
    return 'Low cost threshold may trigger frequent warnings'
  }

  // Recovery warnings
  if (key === 'ERROR_RECOVERY_TIMEOUT' && Number(value) > 300000) {
    return 'Long recovery timeout may delay issue resolution'
  }

  // Development warnings
  if (key === 'ERROR_DEV_VERBOSE' && value === true) {
    return 'Verbose logging in production may impact performance and expose sensitive data'
  }

  return null
}

/**
 * Perform cross-validation checks between related configuration values
 */
function performCrossValidation(envVars: Record<string, any>): {
  errors: string[]
  warnings: string[]
  recommendations: Array<{ key: string; current: any; recommended: any; reason: string }>
} {
  const errors: string[] = []
  const warnings: string[] = []
  const recommendations: Array<{ key: string; current: any; recommended: any; reason: string }> = []

  // Check retry configuration consistency
  const maxAttempts = Number(envVars.ERROR_RETRY_MAX_ATTEMPTS || 3)
  const baseDelay = Number(envVars.ERROR_RETRY_BASE_DELAY || 1000)
  const maxDelay = Number(envVars.ERROR_RETRY_MAX_DELAY || 30000)

  if (baseDelay >= maxDelay) {
    errors.push('ERROR_RETRY_BASE_DELAY must be less than ERROR_RETRY_MAX_DELAY')
  }

  if (maxAttempts > 1 && baseDelay * Math.pow(2, maxAttempts - 1) > maxDelay * 2) {
    warnings.push('Exponential backoff may reach max delay too quickly with current settings')
  }

  // Check circuit breaker configuration
  const failureThreshold = Number(envVars.ERROR_CIRCUIT_BREAKER_FAILURE_THRESHOLD || 5)
  const recoveryTimeout = Number(envVars.ERROR_CIRCUIT_BREAKER_RECOVERY_TIMEOUT || 30000)
  const monitoringWindow = Number(envVars.ERROR_CIRCUIT_BREAKER_MONITORING_WINDOW || 60000)

  if (recoveryTimeout >= monitoringWindow) {
    warnings.push('Circuit breaker recovery timeout should be less than monitoring window')
  }

  // Check health thresholds
  const criticalThreshold = Number(envVars.ERROR_HEALTH_CRITICAL_THRESHOLD || 10)
  const warningThreshold = Number(envVars.ERROR_HEALTH_WARNING_THRESHOLD || 5)

  if (warningThreshold >= criticalThreshold) {
    errors.push('ERROR_HEALTH_WARNING_THRESHOLD must be less than ERROR_HEALTH_CRITICAL_THRESHOLD')
  }

  // Check AI service configuration
  const costWarning = Number(envVars.ERROR_AI_COST_WARNING || 100)
  const costCritical = Number(envVars.ERROR_AI_COST_CRITICAL || 500)

  if (costWarning >= costCritical) {
    errors.push('ERROR_AI_COST_WARNING must be less than ERROR_AI_COST_CRITICAL')
  }

  // Check notification configuration
  const maxNotifications = Number(envVars.ERROR_NOTIFICATIONS_MAX_PER_MINUTE || 10)
  const cooldownPeriod = Number(envVars.ERROR_NOTIFICATIONS_COOLDOWN || 300000)

  if (maxNotifications > 1 && cooldownPeriod < 60000) {
    warnings.push('Short cooldown period with multiple notifications may still spam users')
  }

  return { errors, warnings, recommendations }
}