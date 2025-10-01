/**
 * PSC Codes Data - Static Import
 * This file provides a stable import of the PSC codes from competencies JSON data
 */

import competenciesData from '@/data/government/competencies/competencies.json'

export interface PSCCode {
  pscCode: string
  name: string
  category: string
  subcategory: string
  functionalArea: string
  description: string
  keywords: string[]
  searchableText: string
}

/**
 * Pre-process and extract PSC codes from competencies data for efficient searching
 */
export function preprocessPSCData(): PSCCode[] {
  const pscCodes: PSCCode[] = []

  console.log('[PSC Preprocessor] Starting PSC data preprocessing...')

  // Iterate through all categories in the services catalog
  const servicesCatalog = competenciesData.services_catalog
  
  Object.keys(servicesCatalog).forEach(categoryKey => {
    const categoryData = servicesCatalog[categoryKey as keyof typeof servicesCatalog]
    
    if (categoryData && 'competencies' in categoryData && Array.isArray(categoryData.competencies)) {
      categoryData.competencies.forEach((competency: any) => {
        if (competency.pscCode && competency.name) {
          pscCodes.push({
            pscCode: competency.pscCode,
            name: competency.name,
            category: competency.category || categoryData.category || '',
            subcategory: competency.subcategory || '',
            functionalArea: competency.functionalArea || '',
            description: competency.description || '',
            keywords: competency.keywords || [],
            searchableText: competency.searchable_text || ''
          })
        }
      })
    }
  })

  // Sort by PSC code
  const sortedCodes = pscCodes.sort((a, b) => a.pscCode.localeCompare(b.pscCode))
  
  console.log(`[PSC Preprocessor] ✅ Processed ${sortedCodes.length} total PSC codes`)
  
  // Log sample data for debugging
  const sampleCode = sortedCodes[0]
  if (sampleCode) {
    console.log(`[PSC Preprocessor] ✅ Sample PSC code: ${sampleCode.pscCode} - ${sampleCode.name}`)
  }
  
  return sortedCodes
}

// Pre-process the data immediately
export const processedPSCCodes = preprocessPSCData()