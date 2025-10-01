/**
 * NAICS (North American Industry Classification System) Types
 * Based on 2022 NAICS codes data structure
 */

// Core NAICS data interfaces matching the JSON structure
export interface NAICSNationalIndustry {
  code: string
  definition: string
  description: string
}

export interface NAICSIndustry {
  code: string
  definition: string
  description?: string
  nationalIndustries: NAICSNationalIndustry[]
}

export interface NAICSIndustryGroup {
  code: string
  definition: string
  description?: string
  industries: NAICSIndustry[]
}

export interface NAICSSubsector {
  code: string
  definition: string
  description: string
  industryGroups: NAICSIndustryGroup[]
}

export interface NAICSSector {
  sector: number
  definition: string
  description: string
  subsectors: NAICSSubsector[]
}

export interface NAICSData {
  "2022": NAICSSector[]
  "2017": NAICSSector[]
  "2012": NAICSSector[]
  "2007": NAICSSector[]
  "2002": NAICSSector[]
  "1997": NAICSSector[]
}

// Flattened structure for easier searching and display
export interface NAICSCode {
  code: string
  title: string
  description: string
  level: 'sector' | 'subsector' | 'industryGroup' | 'industry' | 'nationalIndustry'
  parentCode?: string
  sectorNumber?: number
  hierarchy: {
    sector?: string
    subsector?: string
    industryGroup?: string
    industry?: string
  }
}

// Selected NAICS codes for profile
export interface SelectedNAICSCode {
  code: string
  title: string
  description: string
  isPrimary: boolean
  addedAt: Date
}

// Search and filter options
export interface NAICSSearchFilters {
  query?: string
  sectorNumbers?: number[]
  levels?: ('sector' | 'subsector' | 'industryGroup' | 'industry' | 'nationalIndustry')[]
  includeDescriptions?: boolean
}

export interface NAICSSearchResult {
  code: string
  title: string
  description: string
  level: string
  sectorNumber: number
  hierarchy: string[]
  matchType: 'code' | 'title' | 'description'
  relevanceScore: number
}


// Validation helpers
export interface NAICSValidationResult {
  isValid: boolean
  exists: boolean
  level?: string
  message?: string
  suggestions?: NAICSCode[]
}