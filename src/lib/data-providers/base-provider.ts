/**
 * Base Data Provider Interface
 * 
 * This provides a standardized interface for all government data providers
 * including SAM.gov, FPDS-NG, USASpending.gov, etc.
 */

import { z } from 'zod'
import { SourceSystem, OpportunityType } from '@prisma/client'

// Base configuration for all data providers
export const BaseProviderConfigSchema = z.object({
  id: z.string().describe('Unique provider identifier'),
  name: z.string().describe('Human-readable provider name'),
  baseUrl: z.string().url().describe('Base API URL for the provider'),
  apiKey: z.string().optional().describe('API key for authentication'),
  rateLimit: z.object({
    requestsPerMinute: z.number().describe('Maximum requests per minute'),
    requestsPerHour: z.number().describe('Maximum requests per hour'),
    requestsPerDay: z.number().describe('Maximum requests per day')
  }).describe('Rate limiting configuration'),
  reliability: z.object({
    score: z.number().min(0).max(100).describe('Reliability score 0-100'),
    uptime: z.number().min(0).max(100).describe('Expected uptime percentage'),
    avgResponseTime: z.number().describe('Average response time in milliseconds')
  }).describe('Provider reliability metrics'),
  features: z.object({
    opportunities: z.boolean().describe('Supports opportunity data'),
    profiles: z.boolean().describe('Supports company profile data'),
    awards: z.boolean().describe('Supports award/contract data'),
    realTime: z.boolean().describe('Supports real-time updates'),
    bulkDownload: z.boolean().describe('Supports bulk data downloads'),
    webhooks: z.boolean().describe('Supports webhook notifications')
  }).describe('Supported features'),
  lastHealthCheck: z.date().optional().describe('Last successful health check'),
  isActive: z.boolean().default(true).describe('Whether provider is currently active')
})

export type BaseProviderConfig = z.infer<typeof BaseProviderConfigSchema>

// Standardized opportunity data structure
export const StandardOpportunitySchema = z.object({
  // Unique identifiers
  sourceId: z.string().describe('Unique ID from source system'),
  sourceSystem: z.nativeEnum(SourceSystem).describe('Source system identifier'),
  sourceUrl: z.string().url().optional().describe('Original URL to opportunity'),
  
  // Basic information
  title: z.string().describe('Opportunity title'),
  description: z.string().describe('Opportunity description'),
  solicitation: z.string().optional().describe('Solicitation number'),
  agency: z.string().describe('Issuing agency'),
  subAgency: z.string().optional().describe('Sub-agency if applicable'),
  
  // Opportunity details
  type: z.nativeEnum(OpportunityType).describe('Opportunity type'),
  setAside: z.array(z.string()).optional().describe('Set-aside classifications'),
  naicsCodes: z.array(z.string()).describe('Applicable NAICS codes'),
  pscCodes: z.array(z.string()).optional().describe('Product/Service codes'),
  
  // Financial information
  estimatedValue: z.object({
    min: z.number().optional().describe('Minimum contract value'),
    max: z.number().optional().describe('Maximum contract value'),
    currency: z.string().default('USD').describe('Currency code')
  }).optional().describe('Estimated contract value'),
  
  // Dates
  publishDate: z.date().describe('Date opportunity was published'),
  responseDeadline: z.date().optional().describe('Response/proposal deadline'),
  lastModifiedDate: z.date().describe('Last modification date'),
  
  // Location information
  placeOfPerformance: z.object({
    city: z.string().optional().describe('City'),
    state: z.string().optional().describe('State code'),
    country: z.string().default('USA').describe('Country code'),
    zipCode: z.string().optional().describe('ZIP code')
  }).optional().describe('Place of performance'),
  
  // Contacts
  contacts: z.array(z.object({
    name: z.string().describe('Contact name'),
    email: z.string().email().optional().describe('Contact email'),
    phone: z.string().optional().describe('Contact phone'),
    role: z.string().optional().describe('Contact role/title')
  })).optional().describe('Contact information'),
  
  // Documents and attachments
  attachments: z.array(z.object({
    name: z.string().describe('Document name'),
    url: z.string().url().describe('Document URL'),
    type: z.string().describe('Document type/format'),
    size: z.number().optional().describe('File size in bytes'),
    lastModified: z.date().optional().describe('Document last modified date')
  })).optional().describe('Attached documents'),
  
  // Sync metadata
  dataHash: z.string().describe('Hash of data for change detection'),
  lastSyncedAt: z.date().describe('Last synchronization timestamp'),
  syncStatus: z.enum(['SUCCESS', 'ERROR', 'PENDING']).describe('Last sync status')
})

export type StandardOpportunity = z.infer<typeof StandardOpportunitySchema>

// Sync result interface
export interface SyncResult {
  success: boolean
  processed: number
  created: number
  updated: number
  errors: number
  errorDetails?: Array<{
    sourceId: string
    error: string
  }>
  duration: number // milliseconds
}

// Base provider interface that all providers must implement
export abstract class BaseDataProvider {
  protected config: BaseProviderConfig
  
  constructor(config: BaseProviderConfig) {
    this.config = config
  }
  
  // Provider identification
  abstract get id(): string
  abstract get name(): string
  
  // Health and status
  abstract healthCheck(): Promise<boolean>
  abstract getStatus(): Promise<{
    isOnline: boolean
    responseTime: number
    lastError?: string
  }>
  
  // Opportunity data methods
  abstract fetchOpportunities(options: {
    since?: Date
    limit?: number
    offset?: number
    filters?: Record<string, any>
  }): Promise<StandardOpportunity[]>
  
  abstract fetchOpportunityById(sourceId: string): Promise<StandardOpportunity | null>
  
  // Sync methods
  abstract syncOpportunities(options: {
    fullSync?: boolean
    since?: Date
  }): Promise<SyncResult>
  
  // Rate limiting and error handling
  protected async withRateLimit<T>(operation: () => Promise<T>): Promise<T> {
    // Implementation will be provider-specific
    return operation()
  }
  
  protected handleApiError(error: any, context: string): Error {
    console.error(`${this.name} API Error in ${context}:`, error)
    return new Error(`${this.name}: ${error.message || 'Unknown error'}`)
  }
  
  // Data transformation utilities
  protected abstract transformToStandard(rawData: any): StandardOpportunity
  protected abstract generateDataHash(data: any): string
}

// Factory for creating provider instances
export class DataProviderFactory {
  private static providers: Map<string, BaseDataProvider> = new Map()
  
  static register(provider: BaseDataProvider): void {
    this.providers.set(provider.id, provider)
  }
  
  static get(providerId: string): BaseDataProvider | undefined {
    return this.providers.get(providerId)
  }
  
  static getAll(): BaseDataProvider[] {
    return Array.from(this.providers.values())
  }
  
  static getActive(): BaseDataProvider[] {
    return this.getAll().filter(provider => provider.config.isActive)
  }
}

// Provider health monitoring utilities
export class ProviderHealthMonitor {
  static async checkAllProviders(): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {}
    const providers = DataProviderFactory.getActive()
    
    await Promise.all(
      providers.map(async (provider) => {
        try {
          results[provider.id] = await provider.healthCheck()
        } catch (error) {
          console.error(`Health check failed for ${provider.name}:`, error)
          results[provider.id] = false
        }
      })
    )
    
    return results
  }
  
  static async getProviderStatuses(): Promise<Record<string, any>> {
    const statuses: Record<string, any> = {}
    const providers = DataProviderFactory.getActive()
    
    await Promise.all(
      providers.map(async (provider) => {
        try {
          statuses[provider.id] = await provider.getStatus()
        } catch (error) {
          statuses[provider.id] = {
            isOnline: false,
            responseTime: -1,
            lastError: error.message
          }
        }
      })
    )
    
    return statuses
  }
}