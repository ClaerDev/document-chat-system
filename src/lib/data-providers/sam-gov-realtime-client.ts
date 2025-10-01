/**
 * SAM.gov Real-time API Client
 * 
 * Provides real-time access to SAM.gov opportunities for the opportunities page.
 * Only caches results temporarily - does not store bulk data in database.
 */

import { z } from 'zod'
import crypto from 'crypto'
import { OpportunityType, SourceSystem } from '@prisma/client'
import { redis } from '@/lib/redis'

// SAM.gov API configuration
const SAM_GOV_CONFIG = {
  opportunitiesApiUrl: process.env.SAM_GOV_OPPORTUNITIES_API_URL || 'https://api.sam.gov/opportunities/v2/search',
  apiKey: process.env.SAM_API_KEY!,
  userAgent: 'GovMatch-AI/1.0',
  requestTimeout: 30000,
  maxRetries: 3,
  retryDelay: 1000
}

// Cache configuration aligned with existing policy
const CACHE_CONFIG = {
  searchResults: 30 * 60, // 30 minutes (aligns with CACHE_TTL.MEDIUM)
  opportunityDetails: 60 * 60, // 1 hour (aligns with CACHE_TTL.LONG)
  keyPrefix: 'sam_gov'
}

// Rate limiting for organization-level control
const RATE_LIMIT_CONFIG = {
  requestsPerHour: 200, // Organization limit (safe buffer from SAM.gov's 1000/hour)
  window: 60 * 60 * 1000 // 1 hour
}

// Search parameters interface
export interface SamGovSearchParams {
  query?: string
  agencies?: string[]
  naicsCodes?: string[]
  setAsideTypes?: string[]
  minValue?: number
  maxValue?: number
  deadlineFrom?: Date
  deadlineTo?: Date
  postedFrom?: Date
  postedTo?: Date
  state?: string
  city?: string
  active?: boolean
  limit?: number
  offset?: number
}

// Standardized opportunity interface for real-time use
export interface RealTimeOpportunity {
  sourceId: string
  sourceSystem: SourceSystem
  sourceUrl?: string
  title: string
  description: string
  solicitation?: string
  agency: string
  subAgency?: string
  type: OpportunityType
  setAside?: string[]
  naicsCodes: string[]
  pscCodes?: string[]
  estimatedValue?: {
    min?: number
    max?: number
    currency: string
  }
  publishDate: Date
  responseDeadline?: Date
  lastModifiedDate: Date
  placeOfPerformance?: {
    city?: string
    state?: string
    country: string
    zipCode?: string
  }
  contacts?: Array<{
    name: string
    email?: string
    phone?: string
    role?: string
  }>
  attachments?: Array<{
    name: string
    url: string
    type: string
  }>
  // For caching and scoring
  dataHash: string
  lastFetched: Date
}

// Search results interface
export interface SamGovSearchResults {
  opportunities: RealTimeOpportunity[]
  totalCount: number
  currentPage: number
  pageSize: number
  hasMore: boolean
  searchParams: SamGovSearchParams
  executedAt: Date
  fromCache: boolean
}

// SAM.gov raw opportunity schema (comprehensive for v2 API)
const SamGovOpportunitySchema = z.object({
  // Core identification
  noticeId: z.string(),
  title: z.string(),
  solicitationNumber: z.string().optional(),
  
  // Agency information - multiple possible fields
  department: z.string().optional(),
  subTier: z.string().optional(),
  office: z.string().optional(),
  fullParentPathName: z.string().optional(), // Full agency hierarchy
  fullParentPathCode: z.string().optional(), // Full agency hierarchy codes
  departmentFullName: z.string().optional(),
  subtierFullName: z.string().optional(),
  officeFullName: z.string().optional(),
  
  // Dates
  postedDate: z.string(),
  responseDeadLine: z.string().optional(),
  archiveDate: z.string().optional(),
  
  // Opportunity details
  type: z.string(),
  active: z.enum(['Yes', 'No']),
  description: z.string(),
  
  // Contract information
  baseAndAllOptionsValue: z.string().optional(),
  awardNumber: z.string().optional(),
  awardDate: z.string().optional(),
  
  // Classification codes
  naicsCode: z.string().optional(),
  naicsCodes: z.array(z.string()).optional(), // Multiple NAICS codes
  classificationCode: z.string().optional(),
  pscCodes: z.array(z.string()).optional(),
  
  // Set-aside information
  typeOfSetAsideDescription: z.string().optional(),
  typeOfSetAside: z.string().optional(),
  
  // Contact information
  pointOfContact: z.array(z.object({
    fax: z.string().optional(),
    type: z.string(),
    email: z.string().optional(),
    phone: z.string().optional(),
    title: z.string().optional(),
    fullName: z.string().optional()
  })).optional(),
  
  // Place of performance - enhanced
  placeOfPerformance: z.object({
    city: z.object({
      code: z.string().optional(),
      name: z.string().optional()
    }).optional(),
    state: z.object({
      code: z.string().optional(),
      name: z.string().optional()
    }).optional(),
    country: z.object({
      code: z.string().optional(),
      name: z.string().optional()
    }).optional(),
    zip: z.string().optional(),
    streetAddress: z.string().optional(),
    streetAddress2: z.string().optional()
  }).optional(),
  
  // Links and resources
  uiLink: z.string().optional(),
  resourceLinks: z.array(z.string()).optional(),
  additionalInfoLink: z.string().optional(),
  
  // Additional fields that might be present
  organizationType: z.string().optional(),
  cgac: z.string().optional(),
  popCountryCode: z.string().optional(),
  popZip: z.string().optional(),
  popCity: z.string().optional(),
  popState: z.string().optional()
})

export class SamGovRealtimeClient {
  
  /**
   * Search opportunities with caching for current page only
   */
  async searchOpportunities(
    searchParams: SamGovSearchParams,
    organizationId: string
  ): Promise<SamGovSearchResults> {
    // Check rate limit for organization
    await this.checkRateLimit(organizationId)
    
    // Generate cache key for this specific search
    const cacheKey = this.generateSearchCacheKey(searchParams)
    
    // Try to get from cache first
    const cachedResults = await this.getCachedSearchResults(cacheKey)
    if (cachedResults) {
      console.log('🎯 SAM.gov search cache hit:', cacheKey)
      return { ...cachedResults, fromCache: true }
    }
    
    console.log('🔍 Fetching fresh SAM.gov opportunities:', searchParams)
    
    // Build SAM.gov API URL
    const apiUrl = this.buildSearchUrl(searchParams)
    console.log('📡 SAM.gov API URL:', apiUrl.toString())
    
    try {
      // Make API request with retries
      const response = await this.makeRequestWithRetries(apiUrl)
      const data = await response.json()
      
      console.log('📊 SAM.gov API Response:', {
        status: response.status,
        dataKeys: Object.keys(data),
        totalRecords: data.totalRecords,
        opportunitiesCount: data.opportunitiesData?.length
      })
      
      // Transform and validate opportunities
      console.log('🔍 SAM.gov Raw Data Sample:', JSON.stringify(data.opportunitiesData?.[0], null, 2))
      const opportunities = this.transformOpportunities(data.opportunitiesData || [])
      
      // Create search results
      const results: SamGovSearchResults = {
        opportunities,
        totalCount: data.totalRecords || opportunities.length,
        currentPage: Math.floor((searchParams.offset || 0) / (searchParams.limit || 30)) + 1,
        pageSize: searchParams.limit || 30,
        hasMore: opportunities.length === (searchParams.limit || 30),
        searchParams,
        executedAt: new Date(),
        fromCache: false
      }
      
      // Cache the results
      await this.cacheSearchResults(cacheKey, results)
      
      console.log(`✅ Fetched ${opportunities.length} opportunities from SAM.gov`)
      return results
      
    } catch (error) {
      console.error('❌ SAM.gov API error:', error)
      
      // Don't return dummy data in production - throw the error so user sees proper error message
      throw new Error(`SAM.gov API unavailable: ${error.message}`)
    }
  }
  
  /**
   * Get single opportunity with details caching
   */
  async getOpportunityById(
    sourceId: string,
    organizationId: string
  ): Promise<RealTimeOpportunity | null> {
    // Check rate limit
    await this.checkRateLimit(organizationId)
    
    // Try cache first
    const cacheKey = `${CACHE_CONFIG.keyPrefix}:opp:${sourceId}`
    const cached = await redis.get(cacheKey)
    
    if (cached) {
      console.log('🎯 SAM.gov opportunity cache hit:', sourceId)
      return JSON.parse(cached)
    }
    
    console.log('🔍 Fetching SAM.gov opportunity:', sourceId)
    
    try {
      const url = `${SAM_GOV_CONFIG.opportunitiesApiUrl}/opportunities/${sourceId}?api_key=${SAM_GOV_CONFIG.apiKey}`
      
      const response = await this.makeRequestWithRetries(url)
      if (!response.ok) {
        if (response.status === 404) return null
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const data = await response.json()
      const opportunity = this.transformOpportunity(data)
      
      // Cache the opportunity details for 1 hour
      await redis.setex(cacheKey, CACHE_CONFIG.opportunityDetails, JSON.stringify(opportunity))
      
      return opportunity
      
    } catch (error) {
      console.error(`❌ Failed to fetch SAM.gov opportunity ${sourceId}:`, error)
      return null
    }
  }
  
  /**
   * Clear cache for specific search or all SAM.gov cache
   */
  async clearCache(searchParams?: SamGovSearchParams): Promise<void> {
    if (searchParams) {
      const cacheKey = this.generateSearchCacheKey(searchParams)
      await redis.del(cacheKey)
    } else {
      // Clear all SAM.gov cache
      const keys = await redis.keys(`${CACHE_CONFIG.keyPrefix}:*`)
      if (keys.length > 0) {
        await redis.del(...keys)
      }
    }
  }
  
  // Private helper methods
  
  private async checkRateLimit(organizationId: string): Promise<void> {
    const rateLimitKey = `rate_limit:sam_gov:org:${organizationId}`
    const current = await redis.get(rateLimitKey)
    
    if (current && parseInt(current) >= RATE_LIMIT_CONFIG.requestsPerHour) {
      throw new Error('Organization rate limit exceeded for SAM.gov API (200 requests/hour)')
    }
    
    // Increment counter
    if (current) {
      await redis.incr(rateLimitKey)
    } else {
      await redis.setex(rateLimitKey, RATE_LIMIT_CONFIG.window / 1000, '1')
    }
  }
  
  private generateSearchCacheKey(searchParams: SamGovSearchParams): string {
    // Create deterministic hash of search parameters
    const paramsString = JSON.stringify(searchParams, Object.keys(searchParams).sort())
    const hash = crypto.createHash('md5').update(paramsString).digest('hex')
    return `${CACHE_CONFIG.keyPrefix}:search:${hash}`
  }
  
  private async getCachedSearchResults(cacheKey: string): Promise<SamGovSearchResults | null> {
    const cached = await redis.get(cacheKey)
    if (!cached) return null
    
    try {
      const parsed = JSON.parse(cached)
      // Convert date strings back to Date objects
      return {
        ...parsed,
        executedAt: new Date(parsed.executedAt),
        opportunities: parsed.opportunities.map((opp: any) => ({
          ...opp,
          publishDate: new Date(opp.publishDate),
          responseDeadline: opp.responseDeadline ? new Date(opp.responseDeadline) : undefined,
          lastModifiedDate: new Date(opp.lastModifiedDate),
          lastFetched: new Date(opp.lastFetched)
        }))
      }
    } catch (error) {
      console.error('Error parsing cached search results:', error)
      return null
    }
  }
  
  private async cacheSearchResults(cacheKey: string, results: SamGovSearchResults): Promise<void> {
    try {
      await redis.setex(cacheKey, CACHE_CONFIG.searchResults, JSON.stringify(results))
    } catch (error) {
      console.error('Error caching search results:', error)
      // Don't throw - caching is optional
    }
  }
  
  private buildSearchUrl(params: SamGovSearchParams): string {
    const url = new URL(SAM_GOV_CONFIG.opportunitiesApiUrl)
    
    // Add API key
    url.searchParams.set('api_key', SAM_GOV_CONFIG.apiKey)
    
    // Add pagination
    url.searchParams.set('limit', (params.limit || 30).toString())
    url.searchParams.set('offset', (params.offset || 0).toString())
    
    // REQUIRED: Add date range in mm/dd/yyyy format (SAM.gov v2 requirement)
    const formatDate = (date: Date): string => {
      const month = (date.getMonth() + 1).toString().padStart(2, '0')
      const day = date.getDate().toString().padStart(2, '0')
      const year = date.getFullYear()
      return `${month}/${day}/${year}`
    }
    
    // Use provided dates or default to current year range
    const postedFrom = params.postedFrom || new Date('2025-01-01')
    const postedTo = params.postedTo || new Date('2025-12-31')
    
    url.searchParams.set('postedFrom', formatDate(postedFrom))
    url.searchParams.set('postedTo', formatDate(postedTo))
    
    // Required for v2 API
    url.searchParams.set('active', params.active !== false ? 'Yes' : 'No')
    url.searchParams.set('status', 'Active')
    url.searchParams.set('ptype', 'p,r,o,k') // All opportunity types
    
    // Optional filters
    if (params.query) {
      url.searchParams.set('keyword', params.query)
    }
    
    if (params.agencies && params.agencies.length > 0) {
      url.searchParams.set('deptname', params.agencies.join(','))
    }
    
    if (params.naicsCodes && params.naicsCodes.length > 0) {
      url.searchParams.set('ncode', params.naicsCodes.join(','))
    }
    
    if (params.state) {
      url.searchParams.set('state', params.state)
    }
    
    return url.toString()
  }
  
  private async makeRequestWithRetries(url: string): Promise<Response> {
    let lastError: Error | null = null
    
    for (let attempt = 1; attempt <= SAM_GOV_CONFIG.maxRetries; attempt++) {
      try {
        const response = await fetch(url, {
          headers: {
            'Accept': 'application/json',
            'User-Agent': SAM_GOV_CONFIG.userAgent
          },
          signal: AbortSignal.timeout(SAM_GOV_CONFIG.requestTimeout)
        })
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }
        
        return response
        
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error')
        
        if (attempt < SAM_GOV_CONFIG.maxRetries) {
          const delay = SAM_GOV_CONFIG.retryDelay * Math.pow(2, attempt - 1)
          console.warn(`SAM.gov API attempt ${attempt} failed, retrying in ${delay}ms:`, lastError.message)
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      }
    }
    
    throw lastError
  }
  
  private transformOpportunities(rawOpportunities: any[]): RealTimeOpportunity[] {
    return rawOpportunities.map(raw => this.transformOpportunity(raw)).filter(Boolean)
  }
  
  private transformOpportunity(rawData: any): RealTimeOpportunity {
    const now = new Date()
    
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
    
    // Parse dates safely with better handling
    const parseDate = (dateStr?: string): Date => {
      if (!dateStr) return now
      try {
        // Handle various SAM.gov date formats
        const date = new Date(dateStr)
        return isNaN(date.getTime()) ? now : date
      } catch {
        return now
      }
    }
    
    // Extract agency information with priority hierarchy and create structured AgencyInfo
    const getAgencyInfo = () => {
      let agencyName = 'Unknown Agency'
      
      if (rawData.fullParentPathName) {
        // Split on first dot and take the first element
        agencyName = rawData.fullParentPathName.split('.')[0]
      } else {
        agencyName = rawData.departmentFullName || 
                    rawData.department || 
                    rawData.subtierFullName || 
                    rawData.subTier ||
                    rawData.officeFullName ||
                    rawData.office ||
                    'Unknown Agency'
      }
      
      // Extract agency code with same dot-splitting logic
      let agencyCode = ''
      if (rawData.fullParentPathCode) {
        // Split on first dot and take the first element
        agencyCode = rawData.fullParentPathCode.split('.')[0]
      } else {
        agencyCode = rawData.cgac || rawData.department || ''
      }
      
      // Create structured agency object that matches Opportunity interface
      return {
        code: agencyCode,
        name: agencyName,
        abbreviation: rawData.department || undefined,
        type: 'federal',
        isActive: true,
        contractingAuthority: true
      }
    }
    
    // Extract sub-agency information
    const getSubAgency = (): string | undefined => {
      return rawData.subtierFullName || 
             rawData.subTier || 
             rawData.officeFullName || 
             rawData.office || 
             undefined
    }
    
    
    // Extract NAICS codes with multiple sources
    const naicsCodes: string[] = []
    if (rawData.naicsCode) {
      naicsCodes.push(rawData.naicsCode)
    }
    if (rawData.naicsCodes && Array.isArray(rawData.naicsCodes)) {
      naicsCodes.push(...rawData.naicsCodes.filter(code => !naicsCodes.includes(code)))
    }
    
    // Extract PSC codes
    const pscCodes: string[] = []
    if (rawData.classificationCode) {
      pscCodes.push(rawData.classificationCode)
    }
    if (rawData.pscCodes && Array.isArray(rawData.pscCodes)) {
      pscCodes.push(...rawData.pscCodes.filter(code => !pscCodes.includes(code)))
    }
    
    // Transform contacts with better data extraction and validation
    const contacts = (rawData.pointOfContact || []).map(contact => {
      // Extract name with validation to prevent phone numbers being used as names
      let contactName = contact.fullName || contact.name || ''
      
      // If name looks like a phone number or is "Telephone:" pattern, try to extract from email
      if (contactName.includes('Telephone:') || contactName.match(/^\d{10}$/) || contactName.match(/^\d{3}-\d{3}-\d{4}$/)) {
        console.warn('🔧 Detected phone number as name, attempting to extract from email:', contactName)
        
        // Try to extract name from email
        if (contact.email) {
          try {
            const emailParts = contact.email.split('@')[0].split('.')
            if (emailParts.length >= 2) {
              // Format: firstname.lastname@domain.gov -> "Firstname Lastname"
              contactName = emailParts.map(part => 
                part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
              ).join(' ')
              console.log('✅ Extracted name from email:', contactName)
            } else {
              // Single part email, use title or fallback
              contactName = contact.title || 'Government Contact'
            }
          } catch (error) {
            console.warn('Failed to extract name from email:', error)
            contactName = contact.title || 'Government Contact'
          }
        } else {
          // No email available, use title or fallback
          contactName = contact.title || 'Government Contact'
        }
      }
      
      // If still no valid name, use title as fallback
      if (!contactName || contactName.trim() === '') {
        contactName = contact.title || contact.type || 'Government Contact'
      }
      
      return {
        name: contactName.trim(),
        email: contact.email,
        phone: contact.phone,
        role: contact.title || contact.type
      }
    }).filter(contact => contact.name && contact.name !== 'Government Contact')
    
    // Extract estimated value from multiple possible fields
    const getEstimatedValue = () => {
      if (rawData.baseAndAllOptionsValue) {
        try {
          // Parse value like "$1,000,000" or "1000000"
          const cleanValue = rawData.baseAndAllOptionsValue.replace(/[$,]/g, '')
          const numValue = parseFloat(cleanValue)
          if (!isNaN(numValue) && numValue > 0) {
            return {
              min: numValue,
              max: numValue,
              currency: 'USD'
            }
          }
        } catch (error) {
          console.warn('Error parsing contract value:', rawData.baseAndAllOptionsValue)
        }
      }
      return undefined
    }
    
    // Enhanced place of performance with correct SAM.gov field mapping
    const getPlaceOfPerformance = () => {
      const pop = rawData.placeOfPerformance
      if (pop || rawData.popCity || rawData.popState) {
        // Use state.code and city.name as specified
        const cityName = pop?.city?.name || rawData.popCity
        const stateCode = pop?.state?.code || rawData.popState // Prefer state.code
        const stateName = pop?.state?.name 
        
        return {
          city: cityName,
          state: stateCode, // Use state code as primary
          stateName: stateName, // Keep state name for reference
          country: pop?.country?.code || pop?.country?.name || rawData.popCountryCode || 'USA',
          zipCode: pop?.zip || rawData.popZip,
          // Add formatted location string for backward compatibility
          formatted: [cityName, stateCode].filter(Boolean).join(', ')
        }
      }
      return undefined
    }
    
    // Create standardized opportunity with proper field mapping for UI
    const agencyInfo = getAgencyInfo()
    const placeOfPerformance = getPlaceOfPerformance()
    const estimatedValue = getEstimatedValue()
    
    const opportunity: RealTimeOpportunity = {
      sourceId: rawData.noticeId,
      sourceSystem: SourceSystem.SAM_GOV,
      sourceUrl: rawData.uiLink,
      title: rawData.title,
      description: rawData.description || 'No description available',
      solicitation: rawData.solicitationNumber,
      agency: agencyInfo.name, // Keep as string for RealTimeOpportunity interface
      subAgency: getSubAgency(),
      type: getStandardType(rawData.type),
      setAside: rawData.typeOfSetAside ? [rawData.typeOfSetAside] : undefined, // Direct mapping from typeOfSetAside
      naicsCodes,
      pscCodes: pscCodes.length > 0 ? pscCodes : undefined,
      estimatedValue,
      publishDate: parseDate(rawData.postedDate),
      responseDeadline: rawData.responseDeadLine ? parseDate(rawData.responseDeadLine) : undefined,
      lastModifiedDate: parseDate(rawData.postedDate),
      placeOfPerformance,
      contacts: contacts.length > 0 ? contacts : undefined,
      attachments: rawData.resourceLinks ? rawData.resourceLinks.map((link, index) => ({
        name: rawData.additionalInfoLink && index === 0 ? 'Additional Information' : `Attachment ${index + 1}`,
        url: link,
        type: 'unknown'
      })) : undefined,
      dataHash: this.generateDataHash(rawData),
      lastFetched: now
    }
    
    return opportunity
  }
  
  private generateDataHash(data: any): string {
    const jsonString = JSON.stringify(data, Object.keys(data).sort())
    return crypto.createHash('sha256').update(jsonString).digest('hex')
  }
}

// Export singleton instance
export const samGovClient = new SamGovRealtimeClient()