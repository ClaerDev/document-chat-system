/**
 * PSC Code Utilities
 * Utilities for working with PSC codes and government contracting data
 */

import type { PSCCode } from './psc-codes-data'

// Import the pre-processed PSC data
import { processedPSCCodes } from './psc-codes-data'

export interface PSCSearchFilters {
  categories?: string[]
  subcategories?: string[]
  functionalAreas?: string[]
  includeDescriptions?: boolean
}

export interface PSCSearchResult extends PSCCode {
  matchType: 'code' | 'name' | 'category' | 'description' | 'keyword'
  relevanceScore: number
}

/**
 * Gets searchable PSC codes from government data only
 */
export function getSearchablePSCCodes(): PSCCode[] {
  // Always use the pre-processed data
  if (processedPSCCodes && processedPSCCodes.length > 0) {
    console.log('[PSC] ✅ Using pre-processed data:', processedPSCCodes.length, 'codes')
    return processedPSCCodes
  }
  
  // This should never happen, but log if it does
  console.error('[PSC] ❌ No processed PSC data available!')
  return []
}

/**
 * Search PSC codes with various filters and options
 */
export function searchPSCCodes(
  query: string,
  filters: PSCSearchFilters = {}
): PSCSearchResult[] {
  // Use cached data for better performance
  const flatData = getSearchablePSCCodes()
  const searchTerm = query.trim()
  const searchTermLower = query.toLowerCase().trim()
  
  // Debug logging
  if (typeof window !== 'undefined') {
    console.log('[PSC Search] Starting search:', {
      query,
      searchTerm,
      dataAvailable: flatData.length,
      filters,
      sampleData: flatData.slice(0, 2).map(d => ({ code: d.pscCode, name: d.name, category: d.category }))
    })
  }
  
  if (!searchTerm) {
    // When no search term, return codes based on filters or all codes
    console.log('[PSC Search] No search term, returning codes based on filters')
    
    let codesForBrowsing = flatData
    
    // Apply category filter if specified
    if (filters.categories && filters.categories.length > 0) {
      codesForBrowsing = codesForBrowsing.filter(psc => 
        filters.categories!.includes(psc.category)
      )
      console.log(`[PSC Search] Filtered by categories: ${filters.categories.join(', ')}, found ${codesForBrowsing.length} codes`)
    }
    
    // Apply subcategory filter if specified
    if (filters.subcategories && filters.subcategories.length > 0) {
      codesForBrowsing = codesForBrowsing.filter(psc => 
        filters.subcategories!.includes(psc.subcategory)
      )
      console.log(`[PSC Search] Filtered by subcategories: ${filters.subcategories.join(', ')}, found ${codesForBrowsing.length} codes`)
    }
    
    // Apply functional area filter if specified
    if (filters.functionalAreas && filters.functionalAreas.length > 0) {
      codesForBrowsing = codesForBrowsing.filter(psc => 
        filters.functionalAreas!.includes(psc.functionalArea)
      )
      console.log(`[PSC Search] Filtered by functional areas: ${filters.functionalAreas.join(', ')}, found ${codesForBrowsing.length} codes`)
    }
    
    // If no specific filters applied, show all codes (no limit)
    console.log(`[PSC Search] Returning ${codesForBrowsing.length} PSC codes for browsing`)
    
    return codesForBrowsing.map(psc => ({
      ...psc,
      matchType: 'name' as const,
      relevanceScore: 50 // Neutral score for browsing
    }))
  }

  if (flatData.length === 0) {
    console.error('[PSC Search] No data available!')
    return []
  }

  const results: PSCSearchResult[] = []

  flatData.forEach((psc) => {
    // Apply filters
    if (filters.categories && !filters.categories.includes(psc.category)) {
      return
    }
    if (filters.subcategories && !filters.subcategories.includes(psc.subcategory)) {
      return
    }
    if (filters.functionalAreas && !filters.functionalAreas.includes(psc.functionalArea)) {
      return
    }

    let relevanceScore = 0
    let matchType: 'code' | 'name' | 'category' | 'description' | 'keyword' = 'code'

    // Check for exact code match (case-insensitive)
    if (psc.pscCode.toLowerCase() === searchTermLower) {
      relevanceScore = 100
      matchType = 'code'
    }
    // Check for partial code match
    else if (psc.pscCode.toLowerCase().includes(searchTermLower)) {
      relevanceScore = 90 - (psc.pscCode.length - searchTerm.length) * 5
      matchType = 'code'
    }
    // Check for name match (case-insensitive)
    else if (psc.name.toLowerCase().includes(searchTermLower)) {
      relevanceScore = 80
      matchType = 'name'
      
      // Boost score for exact name matches
      if (psc.name.toLowerCase() === searchTermLower) {
        relevanceScore = 85
      }
    }
    // Check for category match
    else if (psc.category.toLowerCase().includes(searchTermLower)) {
      relevanceScore = 70
      matchType = 'category'
    }
    // Check for description match (if enabled, case-insensitive)
    else if (filters.includeDescriptions && psc.description.toLowerCase().includes(searchTermLower)) {
      relevanceScore = 60
      matchType = 'description'
      
      // Count occurrences for better relevance
      const occurrences = (psc.description.toLowerCase().match(new RegExp(searchTermLower, 'g')) || []).length
      relevanceScore += Math.min(occurrences * 5, 20)
    }
    // Check for keyword match
    else if (psc.keywords.some(keyword => keyword.toLowerCase().includes(searchTermLower))) {
      relevanceScore = 65
      matchType = 'keyword'
    }
    // Check for searchable text match
    else if (psc.searchableText.toLowerCase().includes(searchTermLower)) {
      relevanceScore = 55
      matchType = 'description'
    }

    if (relevanceScore > 0) {
      results.push({
        ...psc,
        matchType,
        relevanceScore
      })
    }
  })

  // Sort by relevance score (highest first), then by code
  results.sort((a, b) => {
    if (a.relevanceScore !== b.relevanceScore) {
      return b.relevanceScore - a.relevanceScore
    }
    return a.pscCode.localeCompare(b.pscCode)
  })

  // Return all results without arbitrary limits
  const finalResults = results
  
  if (typeof window !== 'undefined') {
    console.log('[PSC Search] Results:', {
      totalFound: results.length,
      returning: finalResults.length,
      topResults: finalResults.slice(0, 3).map(r => ({ 
        code: r.pscCode, 
        name: r.name, 
        matchType: r.matchType,
        score: r.relevanceScore 
      }))
    })
  }
  
  return finalResults
}

/**
 * Find a specific PSC code by its code value
 */
export function findPSCByCode(code: string): PSCCode | null {
  const flatData = getSearchablePSCCodes()
  return flatData.find(psc => psc.pscCode === code) || null
}

/**
 * Format PSC code for display
 */
export function formatPSCCode(code: string, includeCategoryInfo: boolean = false): string {
  const psc = findPSCByCode(code)
  if (!psc) return code
  
  let formatted = `${code} - ${psc.name}`
  
  if (includeCategoryInfo && psc.category) {
    formatted += ` (${psc.category})`
  }
  
  return formatted
}