/**
 * Competencies utility functions
 * Parses the comprehensive competencies database from JSON file
 */

import competenciesData from '@/data/government/competencies/competencies.json'

export interface Competency {
  pscCode: string
  name: string
  keywords: string[]
  description: string
  searchable_text: string
  category: string
}

export interface CompetencyCategory {
  category: string
  icon: string
  search_tags: string[]
  competencies: Competency[]
}

export interface CompetenciesHierarchy {
  categories: CompetencyCategory[]
  competencies: Competency[]
}

/**
 * Parse competencies data and create structured hierarchy
 */
export function parseCompetenciesData(): CompetenciesHierarchy {
  const categories: CompetencyCategory[] = []
  const competencies: Competency[] = []

  const servicesData = (competenciesData as any).services_catalog || {}

  for (const [categoryKey, categoryData] of Object.entries(servicesData)) {
    const category: CompetencyCategory = {
      category: (categoryData as any).category,
      icon: (categoryData as any).icon,
      search_tags: (categoryData as any).search_tags || [],
      competencies: []
    }

    // Process competencies within this category
    const competenciesArray = (categoryData as any).competencies || []
    for (const competencyData of competenciesArray) {
      const competency: Competency = {
        pscCode: competencyData.pscCode,
        name: competencyData.name,
        keywords: competencyData.keywords || [],
        description: competencyData.description || '',
        searchable_text: competencyData.searchable_text || '',
        category: category.category
      }

      category.competencies.push(competency)
      competencies.push(competency)
    }

    categories.push(category)
  }

  return { categories, competencies }
}

/**
 * Get all competencies as a flat list
 */
export function getAllCompetencies(): Competency[] {
  const { competencies } = parseCompetenciesData()
  return competencies.sort((a, b) => a.name.localeCompare(b.name))
}

/**
 * Get competencies grouped by category
 */
export function getCompetenciesByCategory(): Record<string, Competency[]> {
  const { categories } = parseCompetenciesData()
  const grouped: Record<string, Competency[]> = {}

  for (const category of categories) {
    grouped[category.category] = category.competencies.sort((a, b) => a.name.localeCompare(b.name))
  }

  return grouped
}

/**
 * Get all competency categories
 */
export function getCompetencyCategories(): CompetencyCategory[] {
  const { categories } = parseCompetenciesData()
  return categories.sort((a, b) => a.category.localeCompare(b.category))
}

/**
 * Search competencies by text
 */
export function searchCompetencies(query: string): Competency[] {
  if (!query.trim()) return getAllCompetencies()

  const { competencies } = parseCompetenciesData()
  const searchTerm = query.toLowerCase()

  return competencies.filter(competency => 
    competency.name.toLowerCase().includes(searchTerm) ||
    competency.description.toLowerCase().includes(searchTerm) ||
    competency.searchable_text.toLowerCase().includes(searchTerm) ||
    competency.keywords.some(keyword => keyword.toLowerCase().includes(searchTerm)) ||
    competency.category.toLowerCase().includes(searchTerm)
  ).sort((a, b) => {
    // Prioritize name matches
    if (a.name.toLowerCase().startsWith(searchTerm) && !b.name.toLowerCase().startsWith(searchTerm)) return -1
    if (b.name.toLowerCase().startsWith(searchTerm) && !a.name.toLowerCase().startsWith(searchTerm)) return 1
    
    // Then prioritize keyword matches
    const aKeywordMatch = a.keywords.some(keyword => keyword.toLowerCase().startsWith(searchTerm))
    const bKeywordMatch = b.keywords.some(keyword => keyword.toLowerCase().startsWith(searchTerm))
    if (aKeywordMatch && !bKeywordMatch) return -1
    if (bKeywordMatch && !aKeywordMatch) return 1
    
    // Default to name order
    return a.name.localeCompare(b.name)
  })
}

/**
 * Get a specific competency by its ID
 */
export function getCompetencyByPscCode(pscCode: string): Competency | undefined {
  const { competencies } = parseCompetenciesData()
  return competencies.find(competency => competency.pscCode === pscCode)
}

/**
 * Format competency for display
 */
export function formatCompetency(competency: Competency): string {
  return competency.name
}

/**
 * Get competencies for a specific category
 */
export function getCompetenciesForCategory(categoryName: string): Competency[] {
  const { categories } = parseCompetenciesData()
  const category = categories.find(cat => cat.category === categoryName)
  return category ? category.competencies : []
}