/**
 * NAICS Code Utilities
 * Utilities for working with NAICS codes and government contracting data
 */

import type {
  NAICSData,
  NAICSCode,
  NAICSSearchFilters,
  NAICSSearchResult,
  NAICSValidationResult
} from '@/types/naics'

// Import the pre-processed NAICS data
import { processedNAICSCodes } from './naics-codes-data'

/**
 * Gets searchable NAICS codes from government data only
 */
export function getSearchableNAICSCodes(): NAICSCode[] {
  // Always use the pre-processed data
  if (processedNAICSCodes && processedNAICSCodes.length > 0) {
    console.log('[NAICS] ✅ Using pre-processed data:', processedNAICSCodes.length, 'codes')
    return processedNAICSCodes
  }
  
  // This should never happen, but log if it does
  console.error('[NAICS] ❌ No processed NAICS data available!')
  return []
}


/**
 * Search NAICS codes with various filters and options
 */
export function searchNAICSCodes(
  query: string,
  filters: NAICSSearchFilters = {}
): NAICSSearchResult[] {
  // Use cached data for better performance
  const flatData = getSearchableNAICSCodes()
  const searchTerm = query.trim()
  const searchTermLower = query.toLowerCase().trim()
  
  // Debug logging
  if (typeof window !== 'undefined') {
    console.log('[NAICS Search] Starting search:', {
      query,
      searchTerm,
      dataAvailable: flatData.length,
      filters,
      sampleData: flatData.slice(0, 2).map(d => ({ code: d.code, title: d.title, level: d.level }))
    })
  }
  
  if (!searchTerm) {
    // When no search term, return codes based on level filter or all popular codes
    console.log('[NAICS Search] No search term, returning codes based on filters')
    
    let codesForBrowsing = flatData
    
    // Apply level filter if specified
    if (filters.levels && filters.levels.length > 0) {
      codesForBrowsing = codesForBrowsing.filter(naics => 
        filters.levels!.includes(naics.level)
      )
      console.log(`[NAICS Search] Filtered by levels: ${filters.levels.join(', ')}, found ${codesForBrowsing.length} codes`)
    } else {
      // Default to showing popular levels
      codesForBrowsing = codesForBrowsing.filter(naics => 
        ['nationalIndustry', 'industry'].includes(naics.level)
      )
      // Only limit when no specific level filter is applied
      codesForBrowsing = codesForBrowsing.slice(0, 100)
    }
    
    return codesForBrowsing.map(naics => ({
      code: naics.code,
      title: naics.title,
      description: naics.description,
      level: naics.level,
      sectorNumber: naics.sectorNumber || 0,
      hierarchy: Object.values(naics.hierarchy).filter(Boolean),
      matchType: 'title' as const,
      relevanceScore: 50 // Neutral score for browsing
    }))
  }
  if (flatData.length === 0) {
    console.error('[NAICS Search] No data available!')
    return []
  }

  const results: NAICSSearchResult[] = []

  flatData.forEach((naics) => {
    // Apply level filter
    if (filters.levels && !filters.levels.includes(naics.level)) {
      return
    }

    // Apply sector filter
    if (filters.sectorNumbers && !filters.sectorNumbers.includes(naics.sectorNumber || 0)) {
      return
    }

    let relevanceScore = 0
    let matchType: 'code' | 'title' | 'description' = 'code'

    // Check for exact code match (codes are numeric, case-sensitive)
    if (naics.code === searchTerm) {
      relevanceScore = 100
      matchType = 'code'
    }
    // Check for partial code match (codes are numeric)
    else if (naics.code.includes(searchTerm)) {
      relevanceScore = 90 - (naics.code.length - searchTerm.length) * 5
      matchType = 'code'
    }
    // Check for title match (case-insensitive)
    else if (naics.title.toLowerCase().includes(searchTermLower)) {
      relevanceScore = 80
      matchType = 'title'
      
      // Boost score for exact title matches
      if (naics.title.toLowerCase() === searchTermLower) {
        relevanceScore = 85
      }
    }
    // Check for description match (if enabled, case-insensitive)
    else if (filters.includeDescriptions && naics.description.toLowerCase().includes(searchTermLower)) {
      relevanceScore = 60
      matchType = 'description'
      
      // Count occurrences for better relevance
      const occurrences = (naics.description.toLowerCase().match(new RegExp(searchTermLower, 'g')) || []).length
      relevanceScore += Math.min(occurrences * 5, 20)
    }

    if (relevanceScore > 0) {
      results.push({
        code: naics.code,
        title: naics.title,
        description: naics.description,
        level: naics.level,
        sectorNumber: naics.sectorNumber || 0,
        hierarchy: Object.values(naics.hierarchy).filter(Boolean),
        matchType,
        relevanceScore
      })
    }
  })

  // Sort by relevance score (highest first), then by specificity (longer codes first)
  results.sort((a, b) => {
    if (a.relevanceScore !== b.relevanceScore) {
      return b.relevanceScore - a.relevanceScore
    }
    return b.code.length - a.code.length
  })

  const finalResults = results.slice(0, 50) // Limit results
  
  if (typeof window !== 'undefined') {
    console.log('[NAICS Search] Results:', {
      totalFound: results.length,
      returning: finalResults.length,
      topResults: finalResults.slice(0, 3).map(r => ({ 
        code: r.code, 
        title: r.title, 
        matchType: r.matchType,
        score: r.relevanceScore 
      }))
    })
  }
  
  return finalResults
}

/**
 * Find a specific NAICS code by its code value
 */
export function findNAICSByCode(code: string): NAICSCode | null {
  const flatData = getSearchableNAICSCodes()
  return flatData.find(naics => naics.code === code) || null
}

/**
 * Validate a NAICS code
 */
export function validateNAICSCode(code: string): NAICSValidationResult {
  if (!code || typeof code !== 'string') {
    return {
      isValid: false,
      exists: false,
      message: 'NAICS code is required'
    }
  }

  const trimmedCode = code.trim()
  
  // Check format (should be numeric)
  if (!/^\d+$/.test(trimmedCode)) {
    return {
      isValid: false,
      exists: false,
      message: 'NAICS code must contain only numbers'
    }
  }

  // Check length (2-6 digits)
  if (trimmedCode.length < 2 || trimmedCode.length > 6) {
    return {
      isValid: false,
      exists: false,
      message: 'NAICS code must be 2-6 digits long'
    }
  }

  const found = findNAICSByCode(trimmedCode)
  
  if (!found) {
    // Try to find similar codes
    const suggestions = searchNAICSCodes(trimmedCode, {})
      .slice(0, 3)
      .map(result => ({
        code: result.code,
        title: result.title,
        description: result.description,
        level: result.level,
        sectorNumber: result.sectorNumber,
        hierarchy: {}
      }))

    return {
      isValid: false,
      exists: false,
      message: `NAICS code ${trimmedCode} not found`,
      suggestions
    }
  }

  return {
    isValid: true,
    exists: true,
    level: found.level,
    message: `Valid ${found.level} level NAICS code`
  }
}


/**
 * Get hierarchical path for a NAICS code
 */
export function getNAICSHierarchy(code: string): string[] {
  const naics = findNAICSByCode(code)
  if (!naics) return []
  
  return Object.values(naics.hierarchy).filter(Boolean)
}

/**
 * Format NAICS code for display with proper spacing and hierarchy
 */
export function formatNAICSCode(code: string, includeHierarchy: boolean = false): string {
  const naics = findNAICSByCode(code)
  if (!naics) return code
  
  let formatted = `${code} - ${naics.title}`
  
  if (includeHierarchy) {
    const hierarchy = getNAICSHierarchy(code)
    if (hierarchy.length > 1) {
      formatted += ` (${hierarchy.slice(0, -1).join(' > ')})`
    }
  }
  
  return formatted
}