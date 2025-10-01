/**
 * USAspending.gov Data Provider Implementation
 * 
 * Implements the BaseDataProvider for USAspending.gov federal spending and contract award data
 * This provider focuses on historical contract awards and spending data rather than active opportunities
 */

import { z } from 'zod'
import crypto from 'crypto'
import { OpportunityType } from '@prisma/client'
import { SourceSystem } from '@/types/opportunity-enums'
import { BusinessType } from '@/types/global-enums'
import { BaseDataProvider, BaseProviderConfig, StandardOpportunity, SyncResult } from './base-provider'
import type { SimilarContract } from '@/types'

// USAspending.gov specific configuration
const USAspendingConfigSchema = z.object({
  apiUrl: z.string().url().describe('USAspending.gov API v2 endpoint'),
  userAgent: z.string().default('GovContracting-Platform/1.0').describe('User agent for API requests'),
  requestTimeout: z.number().default(30000).describe('Request timeout in milliseconds'),
  maxRetries: z.number().default(3).describe('Maximum retry attempts'),
  retryDelay: z.number().default(1000).describe('Delay between retries in milliseconds')
})

export type USAspendingConfig = z.infer<typeof USAspendingConfigSchema>

// USAspending.gov raw contract award response schema (based on actual API v2 response)
const USAspendingAwardSchema = z.object({
  // Core identifiers
  internal_id: z.number().optional().describe('Internal USAspending.gov record ID'),
  'Award ID': z.string().describe('Unique award identifier'),
  generated_internal_id: z.string().optional().describe('Generated internal identifier'),
  prime_award_recipient_id: z.string().nullable().optional().describe('Prime award recipient ID'),
  recipient_id: z.string().optional().describe('Recipient unique identifier'),
  
  // Recipient information
  'Recipient Name': z.string().describe('Contractor/recipient name'),
  'Recipient DUNS Number': z.string().nullable().optional().describe('DUNS number (legacy)'),
  'Recipient UEI': z.string().optional().describe('Unique Entity Identifier'),
  'Recipient Location': z.object({
    location_country_code: z.string().optional().describe('Country code'),
    country_name: z.string().optional().describe('Country name'),
    state_code: z.string().optional().describe('State code'),
    state_name: z.string().optional().describe('State name'),
    city_name: z.string().optional().describe('City name'),
    county_code: z.string().optional().describe('County code'),
    county_name: z.string().optional().describe('County name'),
    address_line1: z.string().optional().describe('Address line 1'),
    address_line2: z.string().nullable().optional().describe('Address line 2'),
    address_line3: z.string().nullable().optional().describe('Address line 3'),
    congressional_code: z.string().optional().describe('Congressional district'),
    zip4: z.string().optional().describe('ZIP+4 code'),
    zip5: z.string().optional().describe('ZIP5 code'),
    foreign_postal_code: z.string().nullable().optional().describe('Foreign postal code'),
    foreign_province: z.string().nullable().optional().describe('Foreign province')
  }).optional().describe('Recipient location details'),
  
  // Award details
  'Award Amount': z.union([z.string(), z.number()]).optional().describe('Total award amount'),
  'Award Description': z.string().optional().describe('Description of the award/contract'),
  'Award Type': z.string().optional().describe('Type of award (contract, grant, etc.)'),
  Description: z.string().optional().describe('Award description'),
  'Contract Award Type': z.string().optional().describe('Specific contract type'),
  'Set Aside Type': z.string().optional().describe('Set-aside designation'),
  'Solicitation Identifier': z.string().optional().describe('Original solicitation number if available'),
  
  // Agency information - Awarding
  'Awarding Agency': z.string().describe('Agency that awarded the contract'),
  'Awarding Agency Code': z.string().optional().describe('Awarding agency code'),
  'Awarding Sub Agency': z.string().optional().describe('Sub-agency that awarded the contract'),
  'Awarding Sub Agency Code': z.string().optional().describe('Awarding sub-agency code'),
  awarding_agency_id: z.number().optional().describe('Awarding agency internal ID'),
  agency_slug: z.string().optional().describe('Agency URL slug'),
  
  // Agency information - Funding
  'Funding Agency': z.string().optional().describe('Agency providing funding'),
  'Funding Agency Code': z.string().optional().describe('Funding agency code'),
  'Funding Sub Agency': z.string().optional().describe('Funding sub-agency'),
  'Funding Sub Agency Code': z.string().optional().describe('Funding sub-agency code'),
  
  // Classification codes
  'NAICS Code': z.string().optional().describe('Primary NAICS code'),
  NAICS: z.object({
    code: z.string().optional().describe('NAICS code'),
    description: z.string().optional().describe('NAICS description')
  }).optional().describe('NAICS code object'),
  'NAICS Description': z.string().optional().describe('NAICS code description'),
  'PSC Code': z.string().optional().describe('Product Service Code'),
  PSC: z.object({
    code: z.string().optional().describe('PSC code'),
    description: z.string().optional().describe('PSC description')
  }).optional().describe('PSC code object'),
  'PSC Description': z.string().optional().describe('PSC description'),
  def_codes: z.array(z.string()).nullable().optional().describe('Defense codes'),
  
  // Geographic information - Place of Performance
  'Place of Performance State Code': z.string().optional().describe('State where work is performed'),
  'Place of Performance City Name': z.string().optional().describe('City where work is performed'),
  'Place of Performance City Code': z.string().nullable().optional().describe('City code'),
  'Place of Performance Country Code': z.string().optional().describe('Country code for performance'),
  'Place of Performance Zip5': z.string().optional().describe('ZIP5 for place of performance'),
  'Primary Place of Performance': z.object({
    location_country_code: z.string().optional().describe('Country code'),
    country_name: z.string().optional().describe('Country name'),
    state_code: z.string().optional().describe('State code'),
    state_name: z.string().optional().describe('State name'),
    city_name: z.string().optional().describe('City name'),
    county_code: z.string().optional().describe('County code'),
    county_name: z.string().optional().describe('County name'),
    congressional_code: z.string().optional().describe('Congressional district'),
    zip4: z.string().optional().describe('ZIP+4 code'),
    zip5: z.string().optional().describe('ZIP5 code')
  }).optional().describe('Primary place of performance details'),
  
  // Timeline and dates
  'Action Date': z.string().optional().describe('Date of the award action'),
  'Period of Performance Start Date': z.string().optional().describe('Contract start date'),
  'Period of Performance Current End Date': z.string().optional().describe('Contract end date'),
  'Last Modified Date': z.string().optional().describe('Last modification date'),
  'Base Obligation Date': z.string().optional().describe('Base obligation date'),
  'Last Date to Order': z.string().optional().describe('Last date to place orders'),
  'Issued Date': z.string().optional().describe('Date the award was issued'),
  
  // Special funding categories
  'COVID-19 Obligations': z.union([z.string(), z.number()]).nullable().optional().describe('COVID-19 related obligations'),
  'COVID-19 Outlays': z.union([z.string(), z.number()]).nullable().optional().describe('COVID-19 related outlays'),
  'Infrastructure Obligations': z.union([z.string(), z.number()]).nullable().optional().describe('Infrastructure obligations'),
  'Infrastructure Outlays': z.union([z.string(), z.number()]).nullable().optional().describe('Infrastructure outlays'),
  
  // Loan and assistance fields
  'Loan Value': z.union([z.string(), z.number()]).nullable().optional().describe('Value of loan awards'),
  'SAI Number': z.string().nullable().optional().describe('System for Award Management Identification number'),
  'CFDA Number': z.string().nullable().optional().describe('Catalog of Federal Domestic Assistance number'),
  'Assistance Listings': z.string().nullable().optional().describe('Federal assistance listings information'),
  primary_assistance_listing: z.object({
    cfda_number: z.string().nullable().optional().describe('CFDA number'),
    cfda_program_title: z.string().nullable().optional().describe('CFDA program title')
  }).nullable().optional().describe('Primary assistance listing object'),
  
  // Internal fields
  awarding_agency_id: z.number().optional().describe('Internal awarding agency ID'),
  agency_slug: z.string().optional().describe('Agency URL slug')
})

export type USAspendingAward = z.infer<typeof USAspendingAwardSchema>

// Search criteria for similar contracts
export interface SimilarContractSearchCriteria {
  naicsCodes?: string[]
  pscCodes?: string[]
  state?: string
  estimatedValue?: number
  limit: number
  dateFrom?: Date
  dateTo?: Date
}

export class USAspendingProvider extends BaseDataProvider {
  private usaspendingConfig: USAspendingConfig
  
  constructor(baseConfig: BaseProviderConfig, usaspendingConfig: USAspendingConfig) {
    super(baseConfig)
    this.usaspendingConfig = usaspendingConfig
  }
  
  get id(): string {
    return 'usaspending-gov'
  }
  
  get name(): string {
    return 'USAspending.gov'
  }
  
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.usaspendingConfig.apiUrl}/api/v2/awards/count/`, {
        method: 'HEAD',
        headers: {
          'User-Agent': this.usaspendingConfig.userAgent
        },
        signal: AbortSignal.timeout(this.usaspendingConfig.requestTimeout)
      })
      
      return response.ok
    } catch (error) {
      console.error('USAspending.gov health check failed:', error)
      return false
    }
  }
  
  async getStatus(): Promise<{ isOnline: boolean; responseTime: number; lastError?: string }> {
    const startTime = Date.now()
    
    try {
      const response = await fetch(`${this.usaspendingConfig.apiUrl}/api/v2/awards/count/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': this.usaspendingConfig.userAgent
        },
        body: JSON.stringify({
          filters: {
            award_type_codes: ['A', 'B', 'C', 'D'],
            time_period: [{
              start_date: '2024-01-01',
              end_date: '2024-12-31'
            }]
          }
        }),
        signal: AbortSignal.timeout(this.usaspendingConfig.requestTimeout)
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
    // USAspending.gov doesn't provide opportunities - it provides historical awards
    // This method is not applicable for this provider
    console.warn('USAspending.gov provider does not support opportunity fetching - use fetchSimilarContracts instead')
    return []
  }
  
  async fetchOpportunityById(sourceId: string): Promise<StandardOpportunity | null> {
    // USAspending.gov doesn't provide opportunities - it provides historical awards
    console.warn('USAspending.gov provider does not support individual opportunity fetching')
    return null
  }
  
  async syncOpportunities(options: { fullSync?: boolean; since?: Date }): Promise<SyncResult> {
    // USAspending.gov doesn't provide opportunities to sync
    console.warn('USAspending.gov provider does not support opportunity syncing')
    return {
      success: true,
      processed: 0,
      created: 0,
      updated: 0,
      errors: 0,
      duration: 0
    }
  }
  
  /**
   * Fetch similar contracts based on search criteria
   * This is the primary method for this provider
   */
  async fetchSimilarContracts(criteria: SimilarContractSearchCriteria): Promise<SimilarContract[]> {
    try {
      const filters = this.buildSearchFilters(criteria)
      
      console.log('🌐 [USAspending API] Calling with filters:', JSON.stringify(filters, null, 2))
      
      const response = await this.withRateLimit(async () => {
        const resp = await fetch(`${this.usaspendingConfig.apiUrl}/api/v2/search/spending_by_award`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': this.usaspendingConfig.userAgent
          },
          body: JSON.stringify({
            fields: [
              'Award ID',
              'Recipient Name',
              'Recipient DUNS Number',
              'recipient_id',
              'Awarding Agency',
              'Awarding Agency Code',
              'Awarding Sub Agency',
              'Awarding Sub Agency Code',
              'Funding Agency',
              'Funding Agency Code',
              'Funding Sub Agency',
              'Funding Sub Agency Code',
              'Place of Performance City Code',
              'Place of Performance State Code',
              'Place of Performance Country Code',
              'Place of Performance Zip5',
              'Description',
              'Last Modified Date',
              'Base Obligation Date',
              'prime_award_recipient_id',
              'generated_internal_id',
              'def_codes',
              'COVID-19 Obligations',
              'COVID-19 Outlays',
              'Infrastructure Obligations',
              'Infrastructure Outlays',
              'Recipient UEI',
              'Recipient Location',
              'Primary Place of Performance',
              'Business Type',
              'Business Categories',
              'Minority Owned Business',
              'Women Owned Small Business',
              'Veteran Owned Business',
              'Service Disabled Veteran Owned Business',
              'Small Business',
              'Small Disadvantaged Business',
              'Woman Owned Business',
              'NAICS',
              'PSC',
              'Award Amount',
              'Contract Award Type',
              'Last Date to Order',
              'Issued Date',
              'Loan Value',
              'SAI Number',
              'CFDA Number',
              'Assistance Listings',
              'primary_assistance_listing'
            ],
            filters,
            subawards: false,
            limit: Math.min(criteria.limit * 3, 100),
            page: 1
          }),
          signal: AbortSignal.timeout(this.usaspendingConfig.requestTimeout)
        })
        
        if (!resp.ok) {
          throw new Error(`USAspending.gov API error: ${resp.status} ${resp.statusText}`)
        }
        
        return resp
      })
      
      const data = await response.json()
      console.log(`✅ [USAspending API] Retrieved ${data.results?.length || 0} contracts`)
      
      if (!data.results || data.results.length === 0) {
        console.log('📊 [USAspending API] No results found')
        return []
      }
      
      // Transform USAspending data to SimilarContract format
      const similarContracts = this.transformToSimilarContracts(data.results, criteria)
      
      console.log(`🎯 [USAspending API] Processed ${similarContracts.length} contracts`)
      return similarContracts.slice(0, criteria.limit)
      
    } catch (error) {
      console.error('❌ [USAspending API] Error fetching contracts:', error)
      throw this.handleApiError(error, 'fetchSimilarContracts')
    }
  }
  
  /**
   * Fetch total value for a specific recipient using USAspending API
   * Uses the spending_by_category/recipient endpoint for accurate totals
   */
  async fetchRecipientTotalValue(recipientId: string, recipientName?: string, recipientUei?: string, naicsCodes?: string[], pscCodes?: string[]): Promise<{
    totalValue: number
    totalContracts: number
    averageValue: number
  }> {
    try {
      // Create filters for individual awards endpoint
      const baseTimeFilter = [{
        start_date: '2020-01-01', // Look back 4 years for comprehensive data
        end_date: new Date().toISOString().split('T')[0]
      }]
      
      const filters: any = {
        award_type_codes: ['A', 'B', 'C', 'D'], // Contract types
        time_period: baseTimeFilter
      }
      
      // Add recipient search - prioritize UEI for precision, fallback to name, then ID
      if (recipientUei) {
        // UEI is the most precise identifier
        filters.recipient_search_text = [recipientUei]
        console.log(`🎯 Using UEI for search: ${recipientUei}`)
      } else if (recipientName) {
        // Split the name into words for better matching
        const nameWords = recipientName.split(/\s+/).filter(word => word.length > 2) // Filter out short words
        filters.recipient_search_text = nameWords
        console.log(`📝 Using name words for search: ${nameWords.join(', ')}`)
      } else {
        // Last resort: try to use recipient ID
        filters.recipient_id = recipientId
        console.log(`🆔 Using recipient ID for search: ${recipientId}`)
      }
      
      // Add NAICS filtering if provided
      if (naicsCodes && naicsCodes.length > 0) {
        filters.naics_codes = naicsCodes
      }
      
      // Add PSC filtering if provided  
      if (pscCodes && pscCodes.length > 0) {
        filters.psc_codes = pscCodes
      }
      
      console.log(`🔍 [USAspending API] Fetching individual awards for recipient: ${recipientId} (${recipientName || 'no name'}) UEI: ${recipientUei || 'none'}`, {
        naicsCodes,
        pscCodes,
        filters
      })
      
      // Single API call to get individual awards for proper calculation
      const response = await this.withRateLimit(async () => {
        return await fetch(`${this.usaspendingConfig.apiUrl}/api/v2/search/spending_by_award`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            filters, // Use the name-based filters for better matching
            fields: [
              'Award ID',
              'Award Amount',
              'Recipient Name',
              'Recipient UEI',
              'Action Date'
            ],
            limit: 100, // Get up to 100 recent awards for calculation
            sort: 'Award Amount',
            order: 'desc'
          }),
          signal: AbortSignal.timeout(this.usaspendingConfig.requestTimeout)
        })
      })
      
      if (!response.ok) {
        throw new Error(`USAspending API error: ${response.status} ${response.statusText}`)
      }
      
      const data = await response.json()
      console.log(`📊 [USAspending API] Awards response for ${recipientId} (${recipientName || 'no name'}):`, JSON.stringify(data, null, 2))
      
      const awards = data.results || []
      
      if (awards.length === 0) {
        console.warn(`No awards found for recipient: ${recipientId} (${recipientName || 'no name'})`)
        return { totalValue: 0, totalContracts: 0, averageValue: 0 }
      }
      
      // Calculate totals from individual awards
      const validAwards = awards.filter(award => award['Award Amount'] && award['Award Amount'] > 0)
      const totalValue = validAwards.reduce((sum, award) => sum + (award['Award Amount'] || 0), 0)
      const totalContracts = validAwards.length
      const averageValue = totalContracts > 0 ? totalValue / totalContracts : 0
      
      console.log(`📊 [USAspending API] Calculated from individual awards:`)
      console.log(`   - Total awards found: ${awards.length}`)
      console.log(`   - Valid awards (with amounts): ${validAwards.length}`)
      console.log(`   - Individual award amounts:`, validAwards.slice(0, 5).map(a => `$${(a['Award Amount'] || 0).toLocaleString()}`))
      console.log(`   - Total value: $${totalValue.toLocaleString()}`)
      console.log(`   - Total contracts: ${totalContracts}`)
      console.log(`✅ [USAspending API] Recipient ${recipientId}: $${totalValue.toLocaleString()} total, ${totalContracts} contracts, $${averageValue.toLocaleString()} avg`)
      
      return { totalValue, totalContracts, averageValue }
      
    } catch (error) {
      console.error(`❌ [USAspending API] Error fetching recipient total value for ${recipientId}:`, error)
      return { totalValue: 0, totalContracts: 0, averageValue: 0 }
    }
  }
  
  /**
   * Find related contracts using solicitation numbers
   * This helps establish the relationship between SAM.gov opportunities and USAspending awards
   */
  async findRelatedContracts(solicitationNumber: string): Promise<SimilarContract[]> {
    try {
      // Search for contracts that reference the solicitation number
      const filters = {
        award_type_codes: ['A', 'B', 'C', 'D'], // Contract types
        time_period: [{
          start_date: '2020-01-01', // Look back 4 years for awards
          end_date: new Date().toISOString().split('T')[0]
        }],
        keyword: solicitationNumber // Search in description and other text fields
      }
      
      console.log(`🔍 [USAspending API] Searching for contracts related to solicitation: ${solicitationNumber}`)
      
      const response = await this.withRateLimit(async () => {
        const resp = await fetch(`${this.usaspendingConfig.apiUrl}/api/v2/search/spending_by_award`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': this.usaspendingConfig.userAgent
          },
          body: JSON.stringify({
            filters,
            fields: [
              'Award ID',
              'Recipient Name', 
              'Award Amount',
              'Award Description',
              'Awarding Agency',
              'Action Date',
              'Issued Date',
              'Base Obligation Date',
              'Period of Performance Start Date',
              'Solicitation Identifier'
            ],
            limit: 10,
            page: 1
          }),
          signal: AbortSignal.timeout(this.usaspendingConfig.requestTimeout)
        })
        
        if (!resp.ok) {
          throw new Error(`USAspending.gov API error: ${resp.status} ${resp.statusText}`)
        }
        
        return resp
      })
      
      const data = await response.json()
      
      if (!data.results || data.results.length === 0) {
        console.log(`📊 [USAspending API] No related contracts found for solicitation: ${solicitationNumber}`)
        return []
      }
      
      const relatedContracts = this.transformToSimilarContracts(data.results, { limit: 10 })
      console.log(`🎯 [USAspending API] Found ${relatedContracts.length} related contracts for solicitation: ${solicitationNumber}`)
      
      return relatedContracts
      
    } catch (error) {
      console.error(`❌ [USAspending API] Error finding related contracts for ${solicitationNumber}:`, error)
      return []
    }
  }
  
  private buildSearchFilters(criteria: SimilarContractSearchCriteria): any {
    const filters: any = {
      award_type_codes: ['A', 'B', 'C'], // Contract types (A=Definitive Contract, B=Purchase Order, C=Delivery Order)
      time_period: [{
        start_date: criteria.dateFrom?.toISOString().split('T')[0] || '2022-01-01',
        end_date: criteria.dateTo?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0]
      }]
    }
    
    // Add NAICS code filter if provided
    if (criteria.naicsCodes && criteria.naicsCodes.length > 0) {
      filters.naics_codes = criteria.naicsCodes
    }
    
    // Add PSC code filter if provided
    if (criteria.pscCodes && criteria.pscCodes.length > 0) {
      filters.psc_codes = criteria.pscCodes
    }
    
    // Add place of performance state filter - REQUIRED for state matching
    if (criteria.state) {
      filters.place_of_performance_scope = 'domestic'
      filters.place_of_performance_locations = [{ 
        country: 'USA', 
        state: criteria.state 
      }]
    } else {
      // If no state provided, use domestic US filtering only
      filters.place_of_performance_scope = 'domestic'
      filters.place_of_performance_locations = [{ 
        country: 'USA'
      }]
    }
    
    // Add contract value range filter (±50% of estimated value)
    if (criteria.estimatedValue) {
      const minValue = Math.round(criteria.estimatedValue * 0.3)
      const maxValue = Math.round(criteria.estimatedValue * 2.0)
      filters.award_amounts = [{ 
        lower_bound: minValue, 
        upper_bound: maxValue 
      }]
    }
    
    return filters
  }
  
  private transformToSimilarContracts(
    results: USAspendingAward[], 
    criteria: SimilarContractSearchCriteria
  ): SimilarContract[] {
    return results.map((result, index) => {
      // Parse award amount from multiple possible fields
      const rawAwardAmount = result['Award Amount']
      let awardAmount = 0
      
      if (rawAwardAmount !== undefined && rawAwardAmount !== null) {
        const cleanAmount = rawAwardAmount.toString().replace(/[^0-9.-]/g, '')
        awardAmount = parseFloat(cleanAmount) || 0
      }
      
      // Parse dates safely with multiple format support
      const parseDate = (dateStr?: string): Date | undefined => {
        if (!dateStr || dateStr.trim() === '') return undefined
        
        try {
          // Handle various date formats from USAspending API
          const cleanedDate = dateStr.trim()
          
          // Try parsing as-is first
          let parsedDate = new Date(cleanedDate)
          if (!isNaN(parsedDate.getTime())) {
            return parsedDate
          }
          
          // Try with different separators if needed
          const dateVariations = [
            cleanedDate.replace(/\//g, '-'),
            cleanedDate.replace(/-/g, '/'),
            cleanedDate + 'T00:00:00Z' // Add time if missing
          ]
          
          for (const variation of dateVariations) {
            parsedDate = new Date(variation)
            if (!isNaN(parsedDate.getTime())) {
              return parsedDate
            }
          }
          
          return undefined
        } catch {
          return undefined
        }
      }
      
      // Generate match reasons based on criteria
      const matchReasons: string[] = []
      const naicsCode = result['NAICS Code'] || result.NAICS?.code
      const pscCode = result['PSC Code'] || result.PSC?.code
      
      if (criteria.naicsCodes && naicsCode && criteria.naicsCodes.includes(naicsCode)) {
        matchReasons.push(`NAICS ${naicsCode}`)
      }
      if (criteria.pscCodes && pscCode && criteria.pscCodes.includes(pscCode)) {
        matchReasons.push(`PSC ${pscCode}`)
      }
      if (criteria.state && result['Place of Performance State Code'] === criteria.state) {
        const stateName = result['Primary Place of Performance']?.state_name || result['Place of Performance State Code']
        matchReasons.push(`${stateName || criteria.state}`)
      }
      if (criteria.estimatedValue && awardAmount > 0) {
        const valueRatio = Math.abs(awardAmount - criteria.estimatedValue) / criteria.estimatedValue
        if (valueRatio < 0.5) {
          matchReasons.push('Similar Value')
        }
      }
      
      // Agency-specific matching (more specific than just "Defense")
      const awardingAgency = result['Awarding Agency']
      if (awardingAgency) {
        if (awardingAgency.includes('Defense')) {
          matchReasons.push('Defense Contract')
        } else if (awardingAgency.includes('Health')) {
          matchReasons.push('Health & Human Services')
        } else if (awardingAgency.includes('Homeland Security')) {
          matchReasons.push('DHS Contract')
        } else if (awardingAgency.includes('General Services')) {
          matchReasons.push('GSA Contract')
        }
        // Only add generic agency match if it's a specific agency match
      }
      
      // Enhanced agency information
      const agencyInfo = {
        name: result['Awarding Agency'] || 'Federal Agency',
        code: result['Awarding Agency Code'] || 
              result['Awarding Agency']?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 4) || 'FED',
        subTier: result['Awarding Sub Agency'] || undefined,
        subTierCode: result['Awarding Sub Agency Code'] || undefined,
        fundingAgency: result['Funding Agency'] || undefined,
        fundingAgencyCode: result['Funding Agency Code'] || undefined
      }
      
      // Enhanced place of performance with comprehensive location data
      const placeOfPerformance = {
        state: result['Place of Performance State Code'] || 
               result['Primary Place of Performance']?.state_code || 
               criteria.state || 'Unknown',
        city: result['Place of Performance City Name'] || 
              result['Primary Place of Performance']?.city_name || undefined,
        country: result['Place of Performance Country Code'] || 
                result['Primary Place of Performance']?.country_name || 'USA',
        zipCode: result['Place of Performance Zip5'] || 
                result['Primary Place of Performance']?.zip5 || undefined,
        countyCode: result['Primary Place of Performance']?.county_code || undefined,
        countyName: result['Primary Place of Performance']?.county_name || undefined,
        congressionalDistrict: result['Primary Place of Performance']?.congressional_code || undefined
      }
      
      // Enhanced vendor information with comprehensive recipient data using existing enums
      const businessTypes: string[] = []
      
      // Collect business type information from USAspending API fields
      if (result['Business Type']) businessTypes.push(result['Business Type'])
      if (result['Set Aside Type']) businessTypes.push(result['Set Aside Type'])
      
      // Map USAspending boolean fields to standardized business type categories
      // These match common government contracting categories used throughout the platform
      const businessTypeMapping = {
        'Small Business': result['Small Business'],
        'Women-Owned Small Business': result['Women Owned Small Business'] || result['Woman Owned Business'], 
        'Service-Disabled Veteran-Owned': result['Service Disabled Veteran Owned Business'],
        '8(a) Small Disadvantaged Business': result['8(a) Business'] || result['Small Disadvantaged Business'],
        'HUBZone': result['HUBZone'],
        'Veteran-Owned Business': result['Veteran Owned Business'],
        'Minority-Owned Business': result['Minority Owned Business'],
      }
      
      // Add only the business types that are marked as 'Yes' or true
      Object.entries(businessTypeMapping).forEach(([type, value]) => {
        if (value === 'Yes' || value === true) {
          businessTypes.push(type)
        }
      })
      
      const vendor = {
        name: result['Recipient Name'] || 'Federal Contractor',
        businessType: businessTypes.length > 0 ? businessTypes.join(', ') : BusinessType.CORPORATION,
        businessSize: result['Small Business'] === 'Yes' || result['Small Business'] === true ? 'Small Business' : 'Large Business',
        cageCode: undefined, // Not in basic fields
        dunsNumber: result['Recipient DUNS Number'] || undefined,
        uei: result['Recipient UEI'] || undefined,
        recipientId: result.recipient_id || undefined,
        location: result['Recipient Location'] ? {
          city: result['Recipient Location'].city_name,
          state: result['Recipient Location'].state_code,
          zipCode: result['Recipient Location'].zip5,
          address: result['Recipient Location'].address_line1,
          congressionalDistrict: result['Recipient Location'].congressional_code
        } : undefined
      }
      
      // Build comprehensive contract object
      const contract: SimilarContract = {
        id: `usa_${result['Award ID']?.replace(/[^a-zA-Z0-9]/g, '_') || `contract_${index}`}`,
        internalId: result.internal_id?.toString() || undefined,
        solicitationNumber: result['Solicitation Identifier'] || result['Award ID'] || `USA-${Date.now()}-${index}`,
        awardNumber: result['Award ID'] || undefined,
        generatedInternalId: result.generated_internal_id || undefined,
        
        // Enhanced title and description using multiple fields
        title: result['Award Description'] || result.Description || `Contract ${result['Award ID'] || index + 1}`,
        description: result['Award Description'] !== result.Description ? 
          (result.Description || result['Award Description'] || 'Federal government contract award') : 
          undefined, // Don't duplicate if same as title
        
        // Comprehensive date information - use fallback chain for awarded date
        awardedDate: parseDate(result['Action Date']) || 
                     parseDate(result['Issued Date']) || 
                     parseDate(result['Base Obligation Date']) ||
                     parseDate(result['Period of Performance Start Date']),
        performanceStartDate: parseDate(result['Period of Performance Start Date']),
        performanceEndDate: parseDate(result['Period of Performance Current End Date']),
        lastModifiedDate: parseDate(result['Last Modified Date']),
        baseObligationDate: parseDate(result['Base Obligation Date']),
        
        // Financial information
        awardedValue: rawAwardAmount !== undefined && rawAwardAmount !== null ? awardAmount : undefined,
        obligatedAmount: rawAwardAmount !== undefined && rawAwardAmount !== null ? awardAmount : undefined,
        
        // Enhanced agency information
        agency: agencyInfo,
        awardingAgency: result['Awarding Agency'] || undefined,
        fundingAgency: result['Funding Agency'] || undefined,
        agencySlug: result.agency_slug || undefined,
        
        // Enhanced classification with PSC codes
        naicsCodes: result['NAICS Code'] || result.NAICS?.code ? [result['NAICS Code'] || result.NAICS?.code] : undefined,
        naicsDescription: result['NAICS Description'] || result.NAICS?.description || undefined,
        pscCodes: result['PSC Code'] || result.PSC?.code ? [result['PSC Code'] || result.PSC?.code] : criteria.pscCodes || undefined,
        pscDescription: result['PSC Description'] || result.PSC?.description || undefined,
        contractType: result['Contract Award Type'] || result['Award Type'] || 'Professional Services',
        setAsideType: result['Set Aside Type'] || undefined,
        competitionType: 'Federal Competition',
        defCodes: result.def_codes || undefined,
        
        // Enhanced location information
        placeOfPerformance,
        
        // Enhanced vendor information
        vendor,
        
        // Direct recipient fields for easy access in UI
        recipientName: result['Recipient Name'] || undefined,
        recipientUei: result['Recipient UEI'] || undefined,
        recipientId: result.recipient_id || undefined,
        
        // Special funding categories
        covidObligations: result['COVID-19 Obligations'] ? 
          parseFloat(result['COVID-19 Obligations'].toString().replace(/[^0-9.-]/g, '')) : undefined,
        covidOutlays: result['COVID-19 Outlays'] ? 
          parseFloat(result['COVID-19 Outlays'].toString().replace(/[^0-9.-]/g, '')) : undefined,
        infrastructureObligations: result['Infrastructure Obligations'] ? 
          parseFloat(result['Infrastructure Obligations'].toString().replace(/[^0-9.-]/g, '')) : undefined,
        infrastructureOutlays: result['Infrastructure Outlays'] ? 
          parseFloat(result['Infrastructure Outlays'].toString().replace(/[^0-9.-]/g, '')) : undefined,
        
        // Match information
        matchReasons: matchReasons.length > 0 ? matchReasons : undefined,
        
        // Enhanced metadata
        sourceSystem: SourceSystem.USA_SPENDING,
        sourceUrl: result.generated_internal_id ? 
          `https://www.usaspending.gov/award/${result.generated_internal_id}` : 
          (result['Award ID'] ? `https://www.usaspending.gov/award/${result['Award ID']}` : undefined),
        fetchedAt: new Date(),
        createdAt: new Date(),
        lastSyncedAt: new Date()
      }
      
      return contract
    }).filter(contract => contract !== null)
  }
  
  protected transformToStandard(rawData: any): StandardOpportunity {
    // USAspending.gov doesn't provide opportunities, so this method is not applicable
    // But we need to implement it for the abstract base class
    throw new Error('USAspending.gov provider does not support StandardOpportunity transformation')
  }
  
  protected generateDataHash(data: any): string {
    const jsonString = JSON.stringify(data, Object.keys(data).sort())
    return crypto.createHash('sha256').update(jsonString).digest('hex')
  }
  
  protected async withRateLimit<T>(operation: () => Promise<T>): Promise<T> {
    // USAspending.gov has generous rate limits (no authentication required)
    // But we still implement basic rate limiting for good citizenship
    const delay = Math.max(0, 60000 / this.config.rateLimit.requestsPerMinute)
    
    if (delay > 0) {
      await new Promise(resolve => setTimeout(resolve, delay))
    }
    
    let lastError: Error | null = null
    
    for (let attempt = 1; attempt <= this.usaspendingConfig.maxRetries; attempt++) {
      try {
        return await operation()
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error')
        
        if (attempt < this.usaspendingConfig.maxRetries) {
          const retryDelay = this.usaspendingConfig.retryDelay * Math.pow(2, attempt - 1) // Exponential backoff
          console.warn(`USAspending.gov API attempt ${attempt} failed, retrying in ${retryDelay}ms:`, lastError.message)
          await new Promise(resolve => setTimeout(resolve, retryDelay))
        }
      }
    }
    
    throw lastError
  }
}

// Factory function to create a configured USAspending.gov provider
export function createUSAspendingProvider(): USAspendingProvider {
  const baseConfig: BaseProviderConfig = {
    id: 'usaspending-gov',
    name: 'USAspending.gov',
    baseUrl: 'https://api.usaspending.gov',
    rateLimit: {
      requestsPerMinute: 60, // Conservative limit (no auth required)
      requestsPerHour: 3600,
      requestsPerDay: 86400
    },
    reliability: {
      score: 95, // High reliability for government API
      uptime: 99.5,
      avgResponseTime: 2000
    },
    features: {
      opportunities: false, // USAspending doesn't provide opportunities
      profiles: false,
      awards: true, // This is what USAspending specializes in
      realTime: false, // Historical data only
      bulkDownload: true,
      webhooks: false
    },
    isActive: true
  }
  
  const usaspendingConfig: USAspendingConfig = {
    apiUrl: 'https://api.usaspending.gov',
    userAgent: 'GovContracting-Platform/1.0',
    requestTimeout: 30000,
    maxRetries: 3,
    retryDelay: 1000
  }
  
  return new USAspendingProvider(baseConfig, usaspendingConfig)
}