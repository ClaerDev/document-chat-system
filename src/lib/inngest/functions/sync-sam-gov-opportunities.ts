/**
 * SAM.gov Opportunities Synchronization Job
 * 
 * Background job that syncs real opportunities from SAM.gov using the SamGovProvider
 * and stores them in the database for real-time matching and scoring
 */

import { inngest } from '@/lib/inngest/client'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import { SamGovProvider } from '@/lib/data-providers/sam-gov-provider'
import { DataProviderFactory } from '@/lib/data-providers/base-provider'
import type { StandardOpportunity } from '@/lib/data-providers/base-provider'

// Environment configuration
const SAM_GOV_CONFIG = {
  opportunitiesApiUrl: process.env.SAM_GOV_OPPORTUNITIES_API_URL || 'https://api.sam.gov/opportunities/v3',
  entityApiUrl: process.env.SAM_GOV_ENTITY_API_URL || 'https://api.sam.gov/entity-information/v4',
  apiKey: process.env.SAM_API_KEY!,
  userAgent: 'GovMatch-AI/1.0',
  requestTimeout: 30000,
  maxRetries: 3,
  retryDelay: 1000
}

const BASE_PROVIDER_CONFIG = {
  id: 'sam-gov',
  name: 'SAM.gov',
  baseUrl: 'https://api.sam.gov',
  rateLimit: {
    requestsPerMinute: 16, // Conservative: 1000/hour = ~16/minute
    requestsPerHour: 1000,
    requestsPerDay: 24000
  },
  reliability: {
    score: 95,
    uptime: 99.5,
    avgResponseTime: 500
  },
  features: {
    opportunities: true,
    profiles: true,
    awards: true,
    realTime: true,
    bulkDownload: false,
    webhooks: false
  },
  isActive: true
}

// Job event schemas
const SyncJobEventSchema = z.object({
  data: z.object({
    fullSync: z.boolean().default(false).describe('Whether to perform full sync or incremental'),
    organizationId: z.string().optional().describe('Specific organization to sync for (optional)'),
    filters: z.record(z.any()).optional().describe('Additional filters for sync'),
    priority: z.enum(['low', 'normal', 'high']).default('normal').describe('Job priority level')
  }).describe('Sync job configuration')
})

export const syncSamGovOpportunities = inngest.createFunction(
  {
    id: 'sync-sam-gov-opportunities',
    name: 'Sync SAM.gov Opportunities',
    retries: 3,
    concurrency: {
      limit: 1, // Only one sync job at a time to respect rate limits
      key: 'event.data.organizationId'
    },
    cancelOn: [
      {
        event: 'sync/sam-gov-opportunities.cancelled',
        match: 'data.organizationId'
      }
    ]
  },
  {
    event: 'sync/sam-gov-opportunities'
  },
  async ({ event, step, logger }) => {
    const { data } = SyncJobEventSchema.parse(event)
    const { fullSync = false, organizationId, filters = {}, priority } = data

    logger.info('Starting SAM.gov opportunities sync', {
      fullSync,
      organizationId,
      priority,
      filters
    })

    // Initialize SAM.gov provider
    const samGovProvider = new SamGovProvider(BASE_PROVIDER_CONFIG, SAM_GOV_CONFIG)
    DataProviderFactory.register(samGovProvider)

    // Step 1: Health check
    const isHealthy = await step.run('health-check', async () => {
      const healthy = await samGovProvider.healthCheck()
      if (!healthy) {
        throw new Error('SAM.gov API is not responding')
      }
      return healthy
    })

    // Step 2: Determine sync timestamp
    const syncSince = await step.run('determine-sync-timestamp', async () => {
      if (fullSync) {
        logger.info('Performing full sync - no timestamp filter')
        return undefined
      }

      // Get last successful sync timestamp
      const lastSync = await prisma.syncLog.findFirst({
        where: {
          provider: 'SAM_GOV',
          status: 'SUCCESS'
        },
        orderBy: { completedAt: 'desc' }
      })

      const since = lastSync?.completedAt || new Date(Date.now() - 24 * 60 * 60 * 1000) // Default: 24h ago
      logger.info('Incremental sync since', { since: since.toISOString() })
      return since
    })

    // Step 3: Create sync log entry
    const syncLog = await step.run('create-sync-log', async () => {
      return await prisma.syncLog.create({
        data: {
          provider: 'SAM_GOV',
          status: 'IN_PROGRESS',
          fullSync,
          startedAt: new Date(),
          metadata: {
            organizationId,
            filters,
            priority,
            syncSince: syncSince?.toISOString()
          }
        }
      })
    })

    // Step 4: Sync opportunities
    const syncResult = await step.run('sync-opportunities', async () => {
      try {
        const result = await samGovProvider.syncOpportunities({
          fullSync,
          since: syncSince
        })

        logger.info('SAM.gov sync completed', {
          success: result.success,
          processed: result.processed,
          created: result.created,
          updated: result.updated,
          errors: result.errors,
          duration: result.duration
        })

        return result
      } catch (error) {
        logger.error('SAM.gov sync failed', { error: error.message })
        throw error
      }
    })

    // Step 5: Process and store opportunities
    const storageResult = await step.run('store-opportunities', async () => {
      let stored = 0
      let updated = 0
      let errors = 0

      // Fetch the opportunities that were just synced
      // Note: In a real implementation, the syncOpportunities method would return the actual opportunities
      // For now, we'll fetch a fresh batch to demonstrate the storage logic
      const opportunities = await samGovProvider.fetchOpportunities({
        since: syncSince,
        limit: 100,
        filters: { active: true }
      })

      for (const opportunity of opportunities) {
        try {
          // Check if opportunity already exists
          const existing = await prisma.opportunity.findUnique({
            where: {
              sourceId_sourceSystem: {
                sourceId: opportunity.sourceId,
                sourceSystem: opportunity.sourceSystem
              }
            }
          })

          if (existing) {
            // Update if data has changed
            if (existing.dataHash !== opportunity.dataHash) {
              await prisma.opportunity.update({
                where: { id: existing.id },
                data: {
                  title: opportunity.title,
                  description: opportunity.description,
                  solicitation: opportunity.solicitation,
                  agency: opportunity.agency,
                  subAgency: opportunity.subAgency,
                  type: opportunity.type,
                  setAside: opportunity.setAside || [],
                  naicsCodes: opportunity.naicsCodes,
                  pscCodes: opportunity.pscCodes || [],
                  estimatedValue: opportunity.estimatedValue ? {
                    min: opportunity.estimatedValue.min,
                    max: opportunity.estimatedValue.max,
                    currency: opportunity.estimatedValue.currency
                  } : null,
                  publishDate: opportunity.publishDate,
                  responseDeadline: opportunity.responseDeadline,
                  lastModifiedDate: opportunity.lastModifiedDate,
                  placeOfPerformance: opportunity.placeOfPerformance ? {
                    city: opportunity.placeOfPerformance.city,
                    state: opportunity.placeOfPerformance.state,
                    country: opportunity.placeOfPerformance.country,
                    zipCode: opportunity.placeOfPerformance.zipCode
                  } : null,
                  contacts: opportunity.contacts || [],
                  attachments: opportunity.attachments || [],
                  dataHash: opportunity.dataHash,
                  lastSyncedAt: opportunity.lastSyncedAt,
                  syncStatus: opportunity.syncStatus,
                  sourceUrl: opportunity.sourceUrl,
                  updatedAt: new Date()
                }
              })
              updated++
            }
          } else {
            // Create new opportunity
            await prisma.opportunity.create({
              data: {
                sourceId: opportunity.sourceId,
                sourceSystem: opportunity.sourceSystem,
                sourceUrl: opportunity.sourceUrl,
                title: opportunity.title,
                description: opportunity.description,
                solicitation: opportunity.solicitation,
                agency: opportunity.agency,
                subAgency: opportunity.subAgency,
                type: opportunity.type,
                setAside: opportunity.setAside || [],
                naicsCodes: opportunity.naicsCodes,
                pscCodes: opportunity.pscCodes || [],
                estimatedValue: opportunity.estimatedValue ? {
                  min: opportunity.estimatedValue.min,
                  max: opportunity.estimatedValue.max,
                  currency: opportunity.estimatedValue.currency
                } : null,
                publishDate: opportunity.publishDate,
                responseDeadline: opportunity.responseDeadline,
                lastModifiedDate: opportunity.lastModifiedDate,
                placeOfPerformance: opportunity.placeOfPerformance ? {
                  city: opportunity.placeOfPerformance.city,
                  state: opportunity.placeOfPerformance.state,
                  country: opportunity.placeOfPerformance.country,
                  zipCode: opportunity.placeOfPerformance.zipCode
                } : null,
                contacts: opportunity.contacts || [],
                attachments: opportunity.attachments || [],
                dataHash: opportunity.dataHash,
                lastSyncedAt: opportunity.lastSyncedAt,
                syncStatus: opportunity.syncStatus
              }
            })
            stored++
          }
        } catch (error) {
          logger.error('Failed to store opportunity', {
            sourceId: opportunity.sourceId,
            error: error.message
          })
          errors++
        }
      }

      return { stored, updated, errors, total: opportunities.length }
    })

    // Step 6: Update sync log
    await step.run('complete-sync-log', async () => {
      const status = syncResult.success && storageResult.errors < storageResult.total * 0.1 ? 'SUCCESS' : 'ERROR'
      
      await prisma.syncLog.update({
        where: { id: syncLog.id },
        data: {
          status,
          completedAt: new Date(),
          processed: syncResult.processed,
          created: storageResult.stored,
          updated: storageResult.updated,
          errors: syncResult.errors + storageResult.errors,
          duration: syncResult.duration,
          errorDetails: syncResult.errorDetails ? {
            syncErrors: syncResult.errorDetails,
            storageErrors: storageResult.errors
          } : undefined
        }
      })

      logger.info('Sync log updated', {
        status,
        processed: syncResult.processed,
        stored: storageResult.stored,
        updated: storageResult.updated,
        totalErrors: syncResult.errors + storageResult.errors
      })
    })

    // Step 7: Schedule next incremental sync (if this was successful)
    if (syncResult.success && !fullSync) {
      await step.sendEvent('schedule-next-sync', {
        name: 'sync/sam-gov-opportunities',
        data: {
          fullSync: false,
          organizationId,
          priority: 'normal'
        },
        timestamp: new Date(Date.now() + 4 * 60 * 60 * 1000) // 4 hours from now
      })
    }

    return {
      success: syncResult.success,
      processed: syncResult.processed,
      stored: storageResult.stored,
      updated: storageResult.updated,
      errors: syncResult.errors + storageResult.errors,
      duration: syncResult.duration
    }
  }
)

// Helper function to trigger manual sync
export const triggerSamGovSync = inngest.createFunction(
  {
    id: 'trigger-sam-gov-sync',
    name: 'Trigger SAM.gov Sync'
  },
  {
    event: 'sync/trigger-sam-gov'
  },
  async ({ event, step }) => {
    const { fullSync = false, organizationId, priority = 'normal' } = event.data

    await step.sendEvent('trigger-sync', {
      name: 'sync/sam-gov-opportunities',
      data: {
        fullSync,
        organizationId,
        priority
      }
    })

    return { triggered: true, fullSync, organizationId, priority }
  }
)

// Scheduled function for regular sync
export const scheduledSamGovSync = inngest.createFunction(
  {
    id: 'scheduled-sam-gov-sync',
    name: 'Scheduled SAM.gov Sync'
  },
  {
    cron: '0 */4 * * *' // Every 4 hours
  },
  async ({ event, step }) => {
    await step.sendEvent('schedule-sync', {
      name: 'sync/sam-gov-opportunities',
      data: {
        fullSync: false,
        priority: 'normal'
      }
    })

    return { scheduled: true, timestamp: new Date() }
  }
)