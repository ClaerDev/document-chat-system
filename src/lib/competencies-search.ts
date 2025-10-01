/**
 * Enhanced competencies search algorithm with intelligent matching and relevance scoring
 */

import type { CompetencyWithCategory } from '@/types/competencies';

export interface SearchResult extends CompetencyWithCategory {
  relevanceScore: number;
  matchedFields: string[];
  highlightedName: string;
  highlightedDescription: string;
}

export interface SearchOptions {
  query: string;
  categoryFilter?: string[];
  functionalAreaFilter?: string[];
  complexityLevelFilter?: string[];
  limit?: number;
  includePopular?: boolean;
}

export interface SearchStats {
  totalResults: number;
  categoryBreakdown: Record<string, number>;
  functionalAreaBreakdown: Record<string, number>;
  complexityBreakdown: Record<string, number>;
}

/**
 * Advanced search function with semantic matching and relevance scoring
 */
export function searchCompetencies(
  competencies: CompetencyWithCategory[], 
  options: SearchOptions
): { results: SearchResult[], stats: SearchStats } {
  const { query, categoryFilter, functionalAreaFilter, complexityLevelFilter, limit = 50 } = options;
  
  if (!query.trim()) {
    return {
      results: [],
      stats: {
        totalResults: 0,
        categoryBreakdown: {},
        functionalAreaBreakdown: {},
        complexityBreakdown: {}
      }
    };
  }

  const queryTerms = query.toLowerCase().split(/\s+/).filter(term => term.length > 0);
  const results: SearchResult[] = [];

  for (const competency of competencies) {
    // Apply filters first
    if (categoryFilter?.length && !categoryFilter.includes(competency.categoryId)) continue;
    if (functionalAreaFilter?.length && !(competency as any).functionalArea) continue;
    if (functionalAreaFilter?.length && !functionalAreaFilter.includes((competency as any).functionalArea)) continue;
    if (complexityLevelFilter?.length && !(competency as any).complexityLevel) continue;
    if (complexityLevelFilter?.length && !complexityLevelFilter.includes((competency as any).complexityLevel)) continue;

    const relevanceResult = calculateRelevance(competency, queryTerms);
    
    if (relevanceResult.score > 0) {
      const searchResult: SearchResult = {
        ...competency,
        relevanceScore: relevanceResult.score,
        matchedFields: relevanceResult.matchedFields,
        highlightedName: highlightText(competency.name, queryTerms),
        highlightedDescription: highlightText(competency.description, queryTerms, 150)
      };
      results.push(searchResult);
    }
  }

  // Sort by relevance score (descending)
  results.sort((a, b) => b.relevanceScore - a.relevanceScore);

  // Apply limit
  const limitedResults = results.slice(0, limit);

  // Generate stats
  const stats = generateSearchStats(results);

  return { results: limitedResults, stats };
}

/**
 * Calculate relevance score for a competency based on query terms
 */
function calculateRelevance(
  competency: CompetencyWithCategory, 
  queryTerms: string[]
): { score: number; matchedFields: string[] } {
  let score = 0;
  const matchedFields: string[] = [];
  
  const searchableData: any = competency as any;
  
  // Weight multipliers for different fields (higher = more important)
  const weights = {
    name: 10,
    primaryKeywords: 8,
    semanticTags: 7,
    pscCode: 6,
    keywords: 5,
    description: 3,
    searchable_text: 2,
    industryTerms: 4,
    skillRequirements: 3,
    categoryTags: 2
  };

  for (const term of queryTerms) {
    // Exact name match (highest priority)
    if (competency.name.toLowerCase().includes(term)) {
      score += weights.name * (term.length / competency.name.length) * 10;
      matchedFields.push('name');
    }

    // PSC Code match
    if (competency.pscCode.toLowerCase().includes(term)) {
      score += weights.pscCode * 10;
      matchedFields.push('pscCode');
    }

    // Primary keywords from searchFields
    if (searchableData.searchFields?.primaryKeywords) {
      const primaryKeywords = searchableData.searchFields.primaryKeywords.join(' ').toLowerCase();
      if (primaryKeywords.includes(term)) {
        score += weights.primaryKeywords * 8;
        matchedFields.push('primaryKeywords');
      }
    }

    // Semantic tags from searchFields
    if (searchableData.searchFields?.semanticTags) {
      const semanticTags = searchableData.searchFields.semanticTags.join(' ').toLowerCase();
      if (semanticTags.includes(term)) {
        score += weights.semanticTags * 7;
        matchedFields.push('semanticTags');
      }
    }

    // Industry terms from searchFields
    if (searchableData.searchFields?.industryTerms) {
      const industryTerms = searchableData.searchFields.industryTerms.join(' ').toLowerCase();
      if (industryTerms.includes(term)) {
        score += weights.industryTerms * 6;
        matchedFields.push('industryTerms');
      }
    }

    // Skill requirements from searchFields
    if (searchableData.searchFields?.skillRequirements) {
      const skillRequirements = searchableData.searchFields.skillRequirements.join(' ').toLowerCase();
      if (skillRequirements.includes(term)) {
        score += weights.skillRequirements * 4;
        matchedFields.push('skillRequirements');
      }
    }

    // Legacy keywords field
    if (competency.keywords) {
      const keywordsText = competency.keywords.join(' ').toLowerCase();
      if (keywordsText.includes(term)) {
        score += weights.keywords * 5;
        matchedFields.push('keywords');
      }
    }

    // Description match
    if (competency.description.toLowerCase().includes(term)) {
      score += weights.description * 3;
      matchedFields.push('description');
    }

    // Searchable text
    if (searchableData.searchable_text?.toLowerCase().includes(term)) {
      score += weights.searchable_text * 2;
      matchedFields.push('searchable_text');
    }

    // Category tags
    if (competency.categoryTags) {
      const categoryTags = competency.categoryTags.join(' ').toLowerCase();
      if (categoryTags.includes(term)) {
        score += weights.categoryTags * 2;
        matchedFields.push('categoryTags');
      }
    }

    // Functional area exact match bonus
    if (searchableData.functionalArea?.toLowerCase() === term) {
      score += 15;
      matchedFields.push('functionalArea');
    }

    // Category name match bonus
    if (competency.categoryName.toLowerCase().includes(term)) {
      score += 8;
      matchedFields.push('categoryName');
    }
  }

  // Boost score for multi-term matches
  if (queryTerms.length > 1 && matchedFields.length > 1) {
    score *= 1.5;
  }

  // Normalize score based on query length
  score = score / Math.sqrt(queryTerms.length);

  return {
    score: Math.round(score * 100) / 100,
    matchedFields: [...new Set(matchedFields)] // Remove duplicates
  };
}

/**
 * Highlight matching terms in text
 */
function highlightText(text: string, queryTerms: string[], maxLength?: number): string {
  let highlighted = text;
  
  // Truncate if needed
  if (maxLength && text.length > maxLength) {
    highlighted = text.substring(0, maxLength) + '...';
  }

  // Add highlights
  for (const term of queryTerms) {
    const regex = new RegExp(`(${escapeRegExp(term)})`, 'gi');
    highlighted = highlighted.replace(regex, '<mark class="bg-yellow-200 dark:bg-yellow-800">$1</mark>');
  }

  return highlighted;
}

/**
 * Escape special regex characters
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Generate search statistics
 */
function generateSearchStats(results: SearchResult[]): SearchStats {
  const stats: SearchStats = {
    totalResults: results.length,
    categoryBreakdown: {},
    functionalAreaBreakdown: {},
    complexityBreakdown: {}
  };

  for (const result of results) {
    // Category breakdown
    const category = result.categoryName;
    stats.categoryBreakdown[category] = (stats.categoryBreakdown[category] || 0) + 1;

    // Functional area breakdown
    const functionalArea = (result as any).functionalArea;
    if (functionalArea) {
      stats.functionalAreaBreakdown[functionalArea] = (stats.functionalAreaBreakdown[functionalArea] || 0) + 1;
    }

    // Complexity breakdown
    const complexity = (result as any).complexityLevel;
    if (complexity) {
      stats.complexityBreakdown[complexity] = (stats.complexityBreakdown[complexity] || 0) + 1;
    }
  }

  return stats;
}

/**
 * Get popular/frequently used competencies
 */
export function getPopularCompetencies(competencies: CompetencyWithCategory[]): CompetencyWithCategory[] {
  // For now, return first 20 competencies from each category
  // In a real implementation, this would be based on usage analytics
  const popularByCategory: Record<string, CompetencyWithCategory[]> = {};
  
  for (const competency of competencies) {
    const category = competency.categoryName;
    if (!popularByCategory[category]) {
      popularByCategory[category] = [];
    }
    if (popularByCategory[category].length < 5) {
      popularByCategory[category].push(competency);
    }
  }

  return Object.values(popularByCategory).flat();
}

/**
 * Get search suggestions based on partial query
 */
export function getSearchSuggestions(
  competencies: CompetencyWithCategory[], 
  partialQuery: string,
  limit: number = 5
): string[] {
  if (partialQuery.length < 2) return [];

  const query = partialQuery.toLowerCase();
  const suggestions = new Set<string>();

  for (const competency of competencies) {
    const searchableData: any = competency as any;
    
    // Check name
    if (competency.name.toLowerCase().includes(query)) {
      suggestions.add(competency.name);
    }

    // Check primary keywords
    if (searchableData.searchFields?.primaryKeywords) {
      for (const keyword of searchableData.searchFields.primaryKeywords) {
        if (keyword.toLowerCase().includes(query)) {
          suggestions.add(keyword);
        }
      }
    }

    // Check semantic tags
    if (searchableData.searchFields?.semanticTags) {
      for (const tag of searchableData.searchFields.semanticTags) {
        if (tag.toLowerCase().includes(query)) {
          suggestions.add(tag);
        }
      }
    }

    // Check functional area
    if (searchableData.functionalArea && searchableData.functionalArea.toLowerCase().includes(query)) {
      suggestions.add(searchableData.functionalArea);
    }

    if (suggestions.size >= limit) break;
  }

  return Array.from(suggestions).slice(0, limit);
}

/**
 * Fuzzy matching for typo tolerance
 */
export function fuzzyMatch(text: string, query: string, threshold: number = 0.8): boolean {
  if (text.toLowerCase().includes(query.toLowerCase())) return true;
  
  // Simple Levenshtein distance implementation
  const distance = levenshteinDistance(text.toLowerCase(), query.toLowerCase());
  const maxLength = Math.max(text.length, query.length);
  const similarity = 1 - (distance / maxLength);
  
  return similarity >= threshold;
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
}