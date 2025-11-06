import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getErrorConfig, type ErrorConfig } from '@/lib/config/error-config'
import {
  getCurrentEnvVarOverrides,
  updateEnvVars,
  removeEnvVarOverrides,
  resetToEnvDefaults,
  validateEnvVar,
  getAvailableEnvVars,
  configToEnvVars,
  envVarsToConfig,
  type EnvVarOverrides
} from '@/lib/config/error-config-persistence'
import { isAdmin } from '@/lib/auth/admin-auth'

/**
 * @swagger
 * /api/v1/admin/error-config:
 *   get:
 *     summary: Get current error handling configuration
 *     description: Returns the current error handling configuration including both environment defaults and runtime overrides
 *     tags: [Admin - Error Configuration]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Current error configuration
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 config:
 *                   type: object
 *                   description: Current error handling configuration
 *                 envVarOverrides:
 *                   type: object
 *                   description: Current environment variable overrides
 *                 availableVars:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       key:
 *                         type: string
 *                       configPath:
 *                         type: string
 *                       description:
 *                         type: string
 *                       type:
 *                         type: string
 *                         enum: [number, boolean, string, array]
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
export async function GET(request: NextRequest) {
  try {
    // Verify admin access
    const isAdminUser = await isAdmin();
    if (!isAdminUser) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - Admin access required' },
        { status: 401 }
      );
    }

    const config = getErrorConfig()
    const envVarOverrides = await getCurrentEnvVarOverrides()
    const availableVars = getAvailableEnvVars()

    return NextResponse.json({
      success: true,
      config,
      envVarOverrides,
      availableVars,
      metadata: {
        totalOverrides: Object.keys(envVarOverrides).length,
        configSections: Object.keys(config),
        lastUpdated: new Date().toISOString(),
      }
    })
  } catch (error) {
    console.error('Failed to get error configuration:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to get configuration' },
      { status: 500 }
    )
  }
}

/**
 * @swagger
 * /api/v1/admin/error-config:
 *   put:
 *     summary: Update error handling configuration
 *     description: Update error handling configuration using either nested config object or environment variables
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
 *                 description: Whether to update using config object or environment variables
 *               config:
 *                 type: object
 *                 description: Nested configuration object (when updateType is 'config')
 *               envVars:
 *                 type: object
 *                 description: Environment variable overrides (when updateType is 'envVars')
 *               validate:
 *                 type: boolean
 *                 default: true
 *                 description: Whether to validate the configuration before applying
 *             example:
 *               updateType: envVars
 *               envVars:
 *                 ERROR_RETRY_MAX_ATTEMPTS: 5
 *                 ERROR_NOTIFICATIONS_MAX_PER_MINUTE: 15
 *               validate: true
 *     responses:
 *       200:
 *         description: Configuration updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 updatedConfig:
 *                   type: object
 *                 appliedOverrides:
 *                   type: object
 *       400:
 *         description: Invalid configuration
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
export async function PUT(request: NextRequest) {
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
    const updateSchema = z.object({
      updateType: z.enum(['config', 'envVars']).default('envVars'),
      config: z.record(z.any()).optional(),
      envVars: z.record(z.union([z.string(), z.number(), z.boolean()])).optional(),
      validate: z.boolean().default(true),
    })

    const { updateType, config, envVars, validate } = updateSchema.parse(body)

    let envVarUpdates: EnvVarOverrides = {}

    if (updateType === 'config') {
      if (!config) {
        return NextResponse.json(
          { success: false, error: 'Config object required when updateType is "config"' },
          { status: 400 }
        )
      }
      
      // Convert nested config to environment variables
      envVarUpdates = configToEnvVars(config)
    } else {
      if (!envVars) {
        return NextResponse.json(
          { success: false, error: 'envVars object required when updateType is "envVars"' },
          { status: 400 }
        )
      }
      
      envVarUpdates = envVars
    }

    // Validate each environment variable if requested
    if (validate) {
      const validationErrors: string[] = []
      
      Object.entries(envVarUpdates).forEach(([key, value]) => {
        const validation = validateEnvVar(key, value)
        if (!validation.valid) {
          validationErrors.push(`${key}: ${validation.error}`)
        }
      })

      if (validationErrors.length > 0) {
        return NextResponse.json({
          success: false,
          error: 'Configuration validation failed',
          validationErrors
        }, { status: 400 })
      }
    }

    // Apply the updates
    await updateEnvVars(envVarUpdates)

    // Get the updated configuration
    const updatedConfig = getErrorConfig()
    const currentOverrides = await getCurrentEnvVarOverrides()

    return NextResponse.json({
      success: true,
      message: `Updated ${Object.keys(envVarUpdates).length} configuration settings`,
      updatedConfig,
      appliedOverrides: envVarUpdates,
      totalOverrides: Object.keys(currentOverrides).length,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Failed to update error configuration:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Invalid request format',
        validationErrors: error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
      }, { status: 400 })
    }

    return NextResponse.json(
      { success: false, error: 'Failed to update configuration' },
      { status: 500 }
    )
  }
}

/**
 * @swagger
 * /api/v1/admin/error-config:
 *   delete:
 *     summary: Reset error configuration to environment defaults
 *     description: Remove all runtime configuration overrides and reset to environment variable defaults
 *     tags: [Admin - Error Configuration]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: keys
 *         schema:
 *           type: string
 *         description: Comma-separated list of specific environment variable keys to remove (optional)
 *         example: ERROR_RETRY_MAX_ATTEMPTS,ERROR_NOTIFICATIONS_MAX_PER_MINUTE
 *     responses:
 *       200:
 *         description: Configuration reset successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 resetConfig:
 *                   type: object
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
export async function DELETE(request: NextRequest) {
  try {
    // Verify admin access
    const isAdminUser = await isAdmin();
    if (!isAdminUser) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - Admin access required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url)
    const keysParam = searchParams.get('keys')

    if (keysParam) {
      // Remove specific keys
      const keys = keysParam.split(',').map(k => k.trim()).filter(Boolean)
      
      if (keys.length === 0) {
        return NextResponse.json(
          { success: false, error: 'No valid keys provided' },
          { status: 400 }
        )
      }

      await removeEnvVarOverrides(keys)
      
      const updatedConfig = getErrorConfig()
      
      return NextResponse.json({
        success: true,
        message: `Removed ${keys.length} configuration overrides`,
        removedKeys: keys,
        resetConfig: updatedConfig,
        timestamp: new Date().toISOString(),
      })
    } else {
      // Reset all overrides
      await resetToEnvDefaults()
      
      const resetConfig = getErrorConfig()
      
      return NextResponse.json({
        success: true,
        message: 'All configuration overrides reset to environment defaults',
        resetConfig,
        timestamp: new Date().toISOString(),
      })
    }
  } catch (error) {
    console.error('Failed to reset error configuration:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to reset configuration' },
      { status: 500 }
    )
  }
}