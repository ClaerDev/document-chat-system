/**
 * Hybrid Search Service
 * 
 * Implements true hybrid search by combining vector similarity scores
 * with BM25-style keyword relevance scores for optimal search results.
 */

import { SearchFilters, SearchResult, SearchOptions } from './vector-search'
import { PineconeMetadata } from './embedding-service'

export interface HybridSearchOptions extends SearchOptions {
  vectorWeight?: number // Weight for vector similarity (0-1, default: 0.7)
  keywordWeight?: number // Weight for keyword relevance (0-1, default: 0.3)
  enableBM25?: boolean // Enable BM25 scoring (default: true)
  keywordBoost?: number // Boost factor for exact keyword matches (default: 1.5)
}

export interface KeywordSearchResult {
  documentId: string
  documentTitle: string
  chunkId: string
  chunkIndex: number
  chunkText: string
  keywordScore: number // BM25-style keyword relevance score
  matchedKeywords: string[]
  metadata: PineconeMetadata
}

export interface HybridSearchResult extends SearchResult {
  vectorScore: number // Original vector similarity score
  keywordScore: number // BM25-style keyword relevance score
  hybridScore: number // Combined hybrid score
  matchedKeywords: string[]
}

export class HybridSearchService {
  private readonly avgDocLength: number = 500 // Average document chunk length
  private readonly k1: number = 1.2 // BM25 k1 parameter
  private readonly b: number = 0.75 // BM25 b parameter

  /**
   * Perform true hybrid search combining vector and keyword scoring
   */
  async performHybridSearch(
    vectorResults: SearchResult[],
    query: string,
    keywords: string[],
    options: HybridSearchOptions = {}
  ): Promise<HybridSearchResult[]> {
    console.log('🔀 Starting true hybrid search with score fusion...')
    
    const {
      vectorWeight = 0.7,
      keywordWeight = 0.3,
      enableBM25 = true,
      keywordBoost = 1.5,
    } = options

    // Validate weights
    if (Math.abs(vectorWeight + keywordWeight - 1.0) > 0.01) {
      console.warn(`⚠️ Vector and keyword weights don't sum to 1.0: ${vectorWeight} + ${keywordWeight} = ${vectorWeight + keywordWeight}`)
    }

    console.log(`⚖️ Using weights: vector=${vectorWeight}, keyword=${keywordWeight}`)
    console.log(`🔍 Processing ${vectorResults.length} vector results and ${keywords.length} keywords`)

    // Extract all search terms (query words + explicit keywords)
    const queryTerms = this.extractSearchTerms(query, keywords)
    console.log(`📝 Search terms: ${queryTerms.join(', ')}`)

    // Calculate keyword scores for all results
    const hybridResults: HybridSearchResult[] = []

    for (const vectorResult of vectorResults) {
      // Calculate BM25-style keyword score
      const keywordAnalysis = enableBM25 
        ? this.calculateBM25Score(vectorResult.chunkText, queryTerms, keywordBoost)
        : this.calculateSimpleKeywordScore(vectorResult.chunkText, queryTerms, keywordBoost)

      // Normalize vector score (ensure it's 0-1)
      const normalizedVectorScore = Math.min(vectorResult.score, 1.0)

      // Calculate hybrid score using weighted combination
      const hybridScore = (normalizedVectorScore * vectorWeight) + (keywordAnalysis.score * keywordWeight)

      const hybridResult: HybridSearchResult = {
        ...vectorResult,
        vectorScore: normalizedVectorScore,
        keywordScore: keywordAnalysis.score,
        hybridScore: Math.min(hybridScore, 1.0), // Cap at 1.0
        matchedKeywords: keywordAnalysis.matchedTerms,
        score: hybridScore // Update the main score field
      }

      hybridResults.push(hybridResult)
    }

    // Sort by hybrid score (descending)
    const sortedResults = hybridResults.sort((a, b) => b.hybridScore - a.hybridScore)

    console.log(`✅ Hybrid search complete: ${sortedResults.length} results with fused scores`)
    console.log(`📊 Top result scores:`, sortedResults.slice(0, 3).map(r => ({
      vector: r.vectorScore.toFixed(3),
      keyword: r.keywordScore.toFixed(3),
      hybrid: r.hybridScore.toFixed(3),
      keywords: r.matchedKeywords
    })))

    return sortedResults
  }

  /**
   * Extract and normalize search terms from query and keywords
   */
  private extractSearchTerms(query: string, keywords: string[]): string[] {
    const queryWords = query.toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 2) // Filter out very short words
      .map(word => word.replace(/[^\w]/g, '')) // Remove punctuation
      .filter(word => word.length > 0)

    const normalizedKeywords = keywords.map(k => k.toLowerCase().trim())

    // Combine and deduplicate
    const allTerms = [...new Set([...queryWords, ...normalizedKeywords])]
    
    // Filter out common stop words
    const stopWords = new Set(['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'should', 'could', 'can', 'may', 'might', 'must', 'shall'])
    
    return allTerms.filter(term => !stopWords.has(term) && term.length > 2)
  }

  /**
   * Calculate BM25-style keyword relevance score
   */
  private calculateBM25Score(
    text: string, 
    searchTerms: string[], 
    exactMatchBoost: number = 1.5
  ): { score: number; matchedTerms: string[] } {
    const textLower = text.toLowerCase()
    const textLength = text.length
    const matchedTerms: string[] = []
    let totalScore = 0

    console.log(`🔍 Calculating BM25 score for ${searchTerms.length} terms in ${textLength} char text`)

    for (const term of searchTerms) {
      // Count term frequency (tf)
      const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const matches = textLower.match(new RegExp(`\\b${escapedTerm}\\b`, 'g')) || []
      const tf = matches.length

      if (tf > 0) {
        matchedTerms.push(term)

        // BM25 formula: tf * (k1 + 1) / (tf + k1 * (1 - b + b * (|d| / avgdl)))
        const denominator = tf + this.k1 * (1 - this.b + this.b * (textLength / this.avgDocLength))
        let termScore = (tf * (this.k1 + 1)) / denominator

        // Apply exact match boost
        if (textLower.includes(term)) {
          termScore *= exactMatchBoost
        }

        // Weight by term importance (longer terms get higher weight)
        const termWeight = Math.min(term.length / 10, 2.0) // Cap at 2x weight
        termScore *= termWeight

        totalScore += termScore

        console.log(`  📍 Term "${term}": tf=${tf}, score=${termScore.toFixed(3)}, weight=${termWeight.toFixed(2)}`)
      }
    }

    // Normalize score to 0-1 range
    const maxPossibleScore = searchTerms.length * exactMatchBoost * 2.0 * (this.k1 + 1)
    const normalizedScore = Math.min(totalScore / maxPossibleScore, 1.0)

    console.log(`📊 BM25 result: ${matchedTerms.length}/${searchTerms.length} terms matched, score=${normalizedScore.toFixed(3)}`)

    return {
      score: normalizedScore,
      matchedTerms
    }
  }

  /**
   * Calculate simple keyword relevance score (fallback)
   */
  private calculateSimpleKeywordScore(
    text: string, 
    searchTerms: string[], 
    exactMatchBoost: number = 1.5
  ): { score: number; matchedTerms: string[] } {
    const textLower = text.toLowerCase()
    const matchedTerms: string[] = []
    let totalScore = 0

    for (const term of searchTerms) {
      const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const matches = textLower.match(new RegExp(`\\b${escapedTerm}\\b`, 'g')) || []
      
      if (matches.length > 0) {
        matchedTerms.push(term)
        
        // Simple frequency-based scoring with diminishing returns
        let termScore = Math.min(matches.length / 3, 1.0) // Cap at 1.0 for 3+ matches
        
        // Apply exact match boost
        termScore *= exactMatchBoost
        
        // Weight by term length
        const termWeight = Math.min(term.length / 8, 1.5)
        termScore *= termWeight
        
        totalScore += termScore
      }
    }

    // Normalize to 0-1 range
    const maxPossibleScore = searchTerms.length * exactMatchBoost * 1.5
    const normalizedScore = Math.min(totalScore / maxPossibleScore, 1.0)

    return {
      score: normalizedScore,
      matchedTerms
    }
  }

  /**
   * Get search statistics for debugging
   */
  getSearchStats(results: HybridSearchResult[]): {
    totalResults: number
    avgVectorScore: number
    avgKeywordScore: number
    avgHybridScore: number
    keywordCoverage: number // Percentage of results with keyword matches
  } {
    if (results.length === 0) {
      return {
        totalResults: 0,
        avgVectorScore: 0,
        avgKeywordScore: 0,
        avgHybridScore: 0,
        keywordCoverage: 0
      }
    }

    const stats = {
      totalResults: results.length,
      avgVectorScore: results.reduce((sum, r) => sum + r.vectorScore, 0) / results.length,
      avgKeywordScore: results.reduce((sum, r) => sum + r.keywordScore, 0) / results.length,
      avgHybridScore: results.reduce((sum, r) => sum + r.hybridScore, 0) / results.length,
      keywordCoverage: (results.filter(r => r.matchedKeywords.length > 0).length / results.length) * 100
    }

    console.log('📈 Hybrid search stats:', {
      ...stats,
      avgVectorScore: stats.avgVectorScore.toFixed(3),
      avgKeywordScore: stats.avgKeywordScore.toFixed(3),
      avgHybridScore: stats.avgHybridScore.toFixed(3),
      keywordCoverage: `${stats.keywordCoverage.toFixed(1)}%`
    })

    return stats
  }

  /**
   * Explain scoring for a specific result (debugging)
   */
  explainScoring(result: HybridSearchResult, options: HybridSearchOptions = {}): {
    vectorComponent: number
    keywordComponent: number
    finalScore: number
    explanation: string[]
  } {
    const { vectorWeight = 0.7, keywordWeight = 0.3 } = options

    const vectorComponent = result.vectorScore * vectorWeight
    const keywordComponent = result.keywordScore * keywordWeight
    
    const explanation = [
      `Vector similarity: ${result.vectorScore.toFixed(3)} × ${vectorWeight} = ${vectorComponent.toFixed(3)}`,
      `Keyword relevance: ${result.keywordScore.toFixed(3)} × ${keywordWeight} = ${keywordComponent.toFixed(3)}`,
      `Matched keywords: [${result.matchedKeywords.join(', ')}]`,
      `Final hybrid score: ${vectorComponent.toFixed(3)} + ${keywordComponent.toFixed(3)} = ${result.hybridScore.toFixed(3)}`
    ]

    return {
      vectorComponent,
      keywordComponent,
      finalScore: result.hybridScore,
      explanation
    }
  }
}

// Default hybrid search service instance
export const defaultHybridSearchService = new HybridSearchService()