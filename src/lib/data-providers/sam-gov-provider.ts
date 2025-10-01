/**
 * SAM.gov Data Provider Implementation
 * 
 * Implements the BaseDataProvider for SAM.gov opportunities and entity data
 */

import { z } from 'zod'
import crypto from 'crypto'
import { OpportunityType, SourceSystem } from '@prisma/client'
import { BaseDataProvider, BaseProviderConfig, StandardOpportunity, SyncResult } from './base-provider'

// SAM.gov specific configuration
const SamGovConfigSchema = z.object({
  opportunitiesApiUrl: z.string().url().describe('SAM.gov Opportunities API v3 endpoint'),
  entityApiUrl: z.string().url().describe('SAM.gov Entity Management API v4 endpoint'),
  apiKey: z.string().describe('SAM.gov API key'),
  userAgent: z.string().default('GovMatch-AI/1.0').describe('User agent for API requests'),
  requestTimeout: z.number().default(30000).describe('Request timeout in milliseconds'),
  maxRetries: z.number().default(3).describe('Maximum retry attempts'),
  retryDelay: z.number().default(1000).describe('Delay between retries in milliseconds')
})

export type SamGovConfig = z.infer<typeof SamGovConfigSchema>

// SAM.gov raw opportunity response schema (based on actual API v3)
const SamGovOpportunitySchema = z.object({
  noticeId: z.string().describe('SAM.gov notice identifier'),
  title: z.string().describe('Opportunity title'),
  solicitationNumber: z.string().optional().describe('Solicitation number'),
  department: z.string().optional().describe('Department/agency'),
  subTier: z.string().optional().describe('Sub-tier agency'),
  office: z.string().optional().describe('Contracting office'),
  postedDate: z.string().describe('Posted date (ISO string)'),
  type: z.string().describe('Notice type'),
  baseType: z.string().describe('Base notice type'),
  archiveType: z.string().describe('Archive type'),
  archiveDate: z.string().optional().describe('Archive date'),
  typeOfSetAsideDescription: z.string().optional().describe('Set aside description'),
  typeOfSetAside: z.string().optional().describe('Set aside code'),
  responseDeadLine: z.string().optional().describe('Response deadline'),
  naicsCode: z.string().optional().describe('Primary NAICS code'),
  classificationCode: z.string().optional().describe('Classification code'),
  active: z.enum(['Yes', 'No']).describe('Whether opportunity is active'),
  award: z.object({
    date: z.string().optional().describe('Award date'),
    number: z.string().optional().describe('Award number'),
    amount: z.string().optional().describe('Award amount')
  }).optional().describe('Award information if applicable'),
  pointOfContact: z.array(z.object({
    fax: z.string().optional().describe('Fax number'),
    type: z.string().describe('Contact type'),
    email: z.string().optional().describe('Email address'),
    phone: z.string().optional().describe('Phone number'),
    title: z.string().optional().describe('Contact title'),
    fullName: z.string().optional().describe('Full name')
  })).optional().describe('Points of contact'),
  description: z.string().describe('Opportunity description'),
  organizationType: z.string().optional().describe('Organization type'),
  officeAddress: z.object({
    zipcode: z.string().optional().describe('ZIP code'),
    city: z.string().optional().describe('City'),
    countryCode: z.string().optional().describe('Country code'),
    state: z.string().optional().describe('State')
  }).optional().describe('Office address'),
  placeOfPerformance: z.object({
    city: z.object({
      code: z.string().optional().describe('City code'),
      name: z.string().optional().describe('City name')
    }).optional().describe('City information'),
    state: z.object({
      code: z.string().optional().describe('State code'),
      name: z.string().optional().describe('State name')
    }).optional().describe('State information'),
    country: z.object({
      code: z.string().optional().describe('Country code'),
      name: z.string().optional().describe('Country name')
    }).optional().describe('Country information'),
    zip: z.string().optional().describe('ZIP code')
  }).optional().describe('Place of performance'),
  additionalInfoLink: z.string().optional().describe('Additional information link'),
  uiLink: z.string().optional().describe('SAM.gov UI link'),
  links: z.array(z.object({
    rel: z.string().describe('Link relationship'),
    href: z.string().describe('Link URL')
  })).optional().describe('Related links'),
  resourceLinks: z.array(z.string()).optional().describe('Resource links'),
  // Additional attachment-related fields from SAM.gov API
  attachments: z.array(z.object({
    filename: z.string().optional().describe('Attachment filename'),
    link: z.string().optional().describe('Attachment download link'),
    type: z.string().optional().describe('Attachment type'),
    size: z.number().optional().describe('File size in bytes'),
    description: z.string().optional().describe('Attachment description')
  })).optional().describe('Official attachments from SAM.gov')
})

export type SamGovOpportunity = z.infer<typeof SamGovOpportunitySchema>

export class SamGovProvider extends BaseDataProvider {
  private samGovConfig: SamGovConfig
  
  constructor(baseConfig: BaseProviderConfig, samGovConfig: SamGovConfig) {
    super(baseConfig)
    this.samGovConfig = samGovConfig
  }
  
  get id(): string {
    return 'sam-gov'
  }
  
  get name(): string {
    return 'SAM.gov'
  }
  
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.samGovConfig.opportunitiesApiUrl}/opportunities`, {
        method: 'HEAD',
        headers: {
          'X-API-Key': this.samGovConfig.apiKey,
          'User-Agent': this.samGovConfig.userAgent
        },
        signal: AbortSignal.timeout(this.samGovConfig.requestTimeout)
      })
      
      return response.ok
    } catch (error) {
      console.error('SAM.gov health check failed:', error)
      return false
    }
  }
  
  async getStatus(): Promise<{ isOnline: boolean; responseTime: number; lastError?: string }> {
    const startTime = Date.now()
    
    try {
      const response = await fetch(`${this.samGovConfig.opportunitiesApiUrl}/opportunities?limit=1`, {
        headers: {
          'X-API-Key': this.samGovConfig.apiKey,
          'User-Agent': this.samGovConfig.userAgent,
          'Accept': 'application/json'
        },
        signal: AbortSignal.timeout(this.samGovConfig.requestTimeout)
      })
      
      const responseTime = Date.now() - startTime
      
      if (response.ok) {
        return { isOnline: true, responseTime }
      } else {
        return {
          isOnline: false,
          responseTime,
          lastError: `HTTP ${response.status}: ${response.statusText}`
        }
      }
    } catch (error) {
      return {
        isOnline: false,
        responseTime: Date.now() - startTime,
        lastError: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
  
  async fetchOpportunities(options: {
    since?: Date
    limit?: number
    offset?: number
    filters?: Record<string, any>
  }): Promise<StandardOpportunity[]> {
    const { since, limit = 100, offset = 0, filters = {} } = options
    
    try {
      const url = new URL(`${this.samGovConfig.opportunitiesApiUrl}/opportunities`)
      
      // Add query parameters
      url.searchParams.set('limit', limit.toString())
      url.searchParams.set('offset', offset.toString())
      url.searchParams.set('api_key', this.samGovConfig.apiKey)
      
      // Add date filtering
      if (since) {
        url.searchParams.set('postedFrom', since.toISOString().split('T')[0])
      }
      
      // Add additional filters
      if (filters.agency) {
        url.searchParams.set('deptname', filters.agency)
      }
      if (filters.naicsCode) {
        url.searchParams.set('ncode', filters.naicsCode)
      }
      if (filters.active !== undefined) {
        url.searchParams.set('active', filters.active ? 'Yes' : 'No')
      }
      
      console.log(`Fetching SAM.gov opportunities: ${url.toString().replace(this.samGovConfig.apiKey, '***')}`)
      
      const response = await this.withRateLimit(async () => {
        const resp = await fetch(url.toString(), {
          headers: {
            'Accept': 'application/json',
            'User-Agent': this.samGovConfig.userAgent
          },
          signal: AbortSignal.timeout(this.samGovConfig.requestTimeout)
        })
        
        if (!resp.ok) {
          throw new Error(`SAM.gov API error: ${resp.status} ${resp.statusText}`)
        }
        
        return resp
      })
      
      const data = await response.json()
      
      // Transform SAM.gov opportunities to standard format
      const opportunities = (data.opportunitiesData || []).map((rawOpportunity: any) => {
        try {
          return this.transformToStandard(rawOpportunity)
        } catch (error) {
          console.error('Failed to transform SAM.gov opportunity:', error, rawOpportunity)
          return null
        }
      }).filter(Boolean)
      
      console.log(`Successfully fetched ${opportunities.length} opportunities from SAM.gov`)
      return opportunities
      
    } catch (error) {
      throw this.handleApiError(error, 'fetchOpportunities')
    }
  }
  
  async fetchOpportunityById(sourceId: string): Promise<StandardOpportunity | null> {
    try {
      const url = `${this.samGovConfig.opportunitiesApiUrl}/opportunities/${sourceId}?api_key=${this.samGovConfig.apiKey}`
      
      const response = await this.withRateLimit(async () => {
        const resp = await fetch(url, {
          headers: {
            'Accept': 'application/json',
            'User-Agent': this.samGovConfig.userAgent
          },
          signal: AbortSignal.timeout(this.samGovConfig.requestTimeout)
        })
        
        if (!resp.ok) {
          if (resp.status === 404) return null
          throw new Error(`SAM.gov API error: ${resp.status} ${resp.statusText}`)
        }
        
        return resp
      })
      
      if (!response) return null
      
      const data = await response.json()
      return this.transformToStandard(data)
      
    } catch (error) {
      console.error(`Failed to fetch SAM.gov opportunity ${sourceId}:`, error)
      return null
    }
  }
  
  async syncOpportunities(options: { fullSync?: boolean; since?: Date }): Promise<SyncResult> {
    const startTime = Date.now()
    let processed = 0
    let created = 0
    let updated = 0
    let errors = 0
    const errorDetails: Array<{ sourceId: string; error: string }> = []
    
    try {
      const since = options.fullSync ? undefined : (options.since || new Date(Date.now() - 24 * 60 * 60 * 1000)) // Default to 24h ago
      
      console.log(`Starting SAM.gov sync - ${options.fullSync ? 'Full sync' : `Since ${since?.toISOString()}`}`)
      
      let offset = 0
      const limit = 100
      let hasMore = true
      
      while (hasMore) {
        try {
          const opportunities = await this.fetchOpportunities({
            since,
            limit,
            offset,
            filters: { active: true } // Only sync active opportunities
          })
          
          if (opportunities.length === 0) {
            hasMore = false
            break
          }
          
          // Process opportunities (this would normally save to database)
          for (const opportunity of opportunities) {
            try {
              processed++
              // Here you would implement database save logic
              // For now, we'll just count as created
              created++
              
              console.log(`Processed opportunity: ${opportunity.sourceId} - ${opportunity.title}`)
            } catch (error) {
              errors++
              errorDetails.push({
                sourceId: opportunity.sourceId,
                error: error instanceof Error ? error.message : 'Unknown error'
              })
            }
          }
          
          offset += limit
          
          // Check if we got fewer results than requested (indicates last page)
          if (opportunities.length < limit) {
            hasMore = false
          }
          
          // Add delay between batches to respect rate limits
          await new Promise(resolve => setTimeout(resolve, 1000))
          
        } catch (error) {
          console.error(`Error in sync batch (offset ${offset}):`, error)
          errors++
          break
        }
      }
      
      const duration = Date.now() - startTime
      
      console.log(`SAM.gov sync completed: ${processed} processed, ${created} created, ${updated} updated, ${errors} errors in ${duration}ms`)
      
      return {
        success: errors < processed * 0.1, // Success if less than 10% errors
        processed,
        created,
        updated,
        errors,
        errorDetails: errorDetails.length > 0 ? errorDetails : undefined,
        duration
      }
      
    } catch (error) {
      const duration = Date.now() - startTime
      console.error('SAM.gov sync failed:', error)
      
      return {
        success: false,
        processed,
        created,
        updated,
        errors: errors + 1,
        errorDetails: [{ sourceId: 'SYNC_JOB', error: error instanceof Error ? error.message : 'Unknown error' }],
        duration
      }
    }
  }
  
  protected transformToStandard(rawData: SamGovOpportunity): StandardOpportunity {
    const now = new Date()
    
    // Parse dates safely
    const parseDate = (dateStr?: string): Date => {
      if (!dateStr) return now
      try {
        return new Date(dateStr)
      } catch {
        return now
      }
    }
    
    // Transform SAM.gov notice type to standard type
    const getStandardType = (type: string): OpportunityType => {
      const typeMap: Record<string, OpportunityType> = {
        'Solicitation': OpportunityType.SOLICITATION,
        'Award Notice': OpportunityType.AWARD_NOTICE,
        'Sources Sought': OpportunityType.SOURCES_SOUGHT,
        'Special Notice': OpportunityType.SPECIAL_NOTICE,
        'Presolicitation': OpportunityType.PRESOLICITATION
      }
      return typeMap[type] || OpportunityType.SOLICITATION
    }
    
    // Extract set-aside information
    const setAsides: string[] = []
    if (rawData.typeOfSetAsideDescription) {
      setAsides.push(rawData.typeOfSetAsideDescription)
    }
    
    // Extract NAICS codes
    const naicsCodes: string[] = []
    if (rawData.naicsCode) {
      naicsCodes.push(rawData.naicsCode)
    }
    
    // Transform contacts
    const contacts = (rawData.pointOfContact || []).map(contact => ({
      name: contact.fullName || 'Unknown',
      email: contact.email,
      phone: contact.phone,
      role: contact.title
    })).filter(contact => contact.name !== 'Unknown')
    
    // Create the standardized opportunity
    const standardOpportunity: StandardOpportunity = {
      sourceId: rawData.noticeId,
      sourceSystem: SourceSystem.SAM_GOV,
      sourceUrl: rawData.uiLink,
      title: rawData.title,
      description: rawData.description,
      solicitation: rawData.solicitationNumber,
      agency: rawData.department || 'Unknown Agency',
      subAgency: rawData.subTier,
      type: getStandardType(rawData.type),
      setAside: setAsides.length > 0 ? setAsides : undefined,
      naicsCodes,
      pscCodes: rawData.classificationCode ? [rawData.classificationCode] : undefined,
      estimatedValue: rawData.award?.amount ? {
        min: parseFloat(rawData.award.amount.replace(/[^0-9.-]/g, '')) || undefined,
        max: undefined,
        currency: 'USD'
      } : undefined,
      publishDate: parseDate(rawData.postedDate),
      responseDeadline: rawData.responseDeadLine ? parseDate(rawData.responseDeadLine) : undefined,
      lastModifiedDate: parseDate(rawData.postedDate),
      placeOfPerformance: rawData.placeOfPerformance ? {
        city: rawData.placeOfPerformance.city?.name,
        state: rawData.placeOfPerformance.state?.code,
        country: rawData.placeOfPerformance.country?.code || 'USA',
        zipCode: rawData.placeOfPerformance.zip
      } : undefined,
      contacts: contacts.length > 0 ? contacts : undefined,
      attachments: this.transformAttachments(rawData),
      dataHash: this.generateDataHash(rawData),
      lastSyncedAt: now,
      syncStatus: 'SUCCESS'
    }
    
    return standardOpportunity
  }
  
  private transformAttachments(rawData: SamGovOpportunity): any[] | undefined {
    const attachments: any[] = []
    
    // Process official attachments if available
    if (rawData.attachments && rawData.attachments.length > 0) {
      rawData.attachments.forEach((attachment, index) => {
        if (attachment.link || attachment.filename) {
          // Determine file category based on filename or description
          let category = 'attachment'
          const filename = attachment.filename || ''
          const description = attachment.description || ''
          
          if (filename.toLowerCase().includes('solicitation') || filename.toLowerCase().includes('rfp')) {
            category = 'solicitation'
          } else if (filename.toLowerCase().includes('amendment') || filename.toLowerCase().includes('modify')) {
            category = 'amendment'
          } else if (filename.toLowerCase().includes('reference') || filename.toLowerCase().includes('spec')) {
            category = 'reference'
          }
          
          // Format file size
          let formattedSize = 'Unknown'
          if (attachment.size) {
            const sizeInBytes = attachment.size
            if (sizeInBytes < 1024) {
              formattedSize = `${sizeInBytes} B`
            } else if (sizeInBytes < 1024 * 1024) {
              formattedSize = `${(sizeInBytes / 1024).toFixed(1)} KB`
            } else if (sizeInBytes < 1024 * 1024 * 1024) {
              formattedSize = `${(sizeInBytes / (1024 * 1024)).toFixed(1)} MB`
            } else {
              formattedSize = `${(sizeInBytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
            }
          }
          
          attachments.push({
            name: attachment.filename || `Attachment ${index + 1}`,
            type: attachment.type || this.getFileTypeFromName(attachment.filename),
            size: formattedSize,
            category,
            url: attachment.link || '#',
            description: attachment.description || '',
            lastModified: new Date().toISOString()
          })
        }
      })
    }
    
    // Process resource links as additional attachments
    if (rawData.resourceLinks && rawData.resourceLinks.length > 0) {
      rawData.resourceLinks.forEach((link, index) => {
        if (link && link.trim()) {
          attachments.push({
            name: `Resource Document ${index + 1}`,
            type: this.getFileTypeFromUrl(link),
            size: 'Unknown',
            category: 'reference',
            url: link,
            description: 'Additional resource document',
            lastModified: new Date().toISOString()
          })
        }
      })
    }
    
    // Process additional info link as an attachment
    if (rawData.additionalInfoLink) {
      attachments.push({
        name: 'Additional Information',
        type: this.getFileTypeFromUrl(rawData.additionalInfoLink),
        size: 'Unknown',
        category: 'reference',
        url: rawData.additionalInfoLink,
        description: 'Additional information document',
        lastModified: new Date().toISOString()
      })
    }
    
    return attachments.length > 0 ? attachments : undefined
  }
  
  private getFileTypeFromName(filename?: string): string {
    if (!filename) return 'PDF'
    
    const extension = filename.split('.').pop()?.toLowerCase()
    switch (extension) {
      case 'pdf': return 'PDF'
      case 'doc':
      case 'docx': return 'DOC'
      case 'xls':
      case 'xlsx': return 'XLS'
      case 'ppt':
      case 'pptx': return 'PPT'
      case 'txt': return 'TXT'
      case 'zip': return 'ZIP'
      default: return 'PDF'
    }
  }
  
  private getFileTypeFromUrl(url: string): string {
    const urlLower = url.toLowerCase()
    if (urlLower.includes('.pdf')) return 'PDF'
    if (urlLower.includes('.doc')) return 'DOC'
    if (urlLower.includes('.xls')) return 'XLS'
    if (urlLower.includes('.txt')) return 'TXT'
    if (urlLower.includes('.zip')) return 'ZIP'
    return 'PDF' // Default assumption for government documents
  }
  
  protected generateDataHash(data: any): string {
    const jsonString = JSON.stringify(data, Object.keys(data).sort())
    return crypto.createHash('sha256').update(jsonString).digest('hex')
  }
  
  protected async withRateLimit<T>(operation: () => Promise<T>): Promise<T> {
    // Simple rate limiting - in production this would be more sophisticated
    // using a rate limiter library or Redis-based solution
    const delay = Math.max(0, 60000 / this.config.rateLimit.requestsPerMinute)
    
    if (delay > 0) {
      await new Promise(resolve => setTimeout(resolve, delay))
    }
    
    let lastError: Error | null = null
    
    for (let attempt = 1; attempt <= this.samGovConfig.maxRetries; attempt++) {
      try {
        return await operation()
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error')
        
        if (attempt < this.samGovConfig.maxRetries) {
          const retryDelay = this.samGovConfig.retryDelay * Math.pow(2, attempt - 1) // Exponential backoff
          console.warn(`SAM.gov API attempt ${attempt} failed, retrying in ${retryDelay}ms:`, lastError.message)
          await new Promise(resolve => setTimeout(resolve, retryDelay))
        }
      }
    }
    
    throw lastError
  }
}