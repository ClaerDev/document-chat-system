/**
 * NAICS Codes utility functions
 * Parses the comprehensive NAICS database from JSON file
 */

import naicsData from '@/data/government/codes/codes.json'

export interface NAICSCode {
  code: string
  title: string
  sector?: string
  subsector?: string
  industryGroup?: string
  industry?: string
}

export interface NAICSSector {
  sector: number
  definition: string
  description: string
  subsectors: NAICSSubsector[]
}

export interface NAICSSubsector {
  code: string
  definition: string
  description: string
  industryGroups: NAICSIndustryGroup[]
}

export interface NAICSIndustryGroup {
  code: string
  definition: string
  description: string
  industries: NAICSIndustry[]
}

export interface NAICSIndustry {
  code: string
  definition: string
  description: string
  nationalIndustries: NAICSNationalIndustry[]
}

export interface NAICSNationalIndustry {
  code: string
  definition: string
  description: string
}

export interface NAICSHierarchy {
  sectors: NAICSSector[]
  codes: NAICSCode[]
}

/**
 * Parse NAICS data and create a flat list of all codes with hierarchical information
 */
export function parseNAICSData(): NAICSHierarchy {
  const sectors: NAICSSector[] = []
  const codes: NAICSCode[] = []

  // Get the 1997 NAICS data (most comprehensive)
  const naics1997 = (naicsData as any)['1997'] || []

  for (const sectorData of naics1997) {
    const sector: NAICSSector = {
      sector: sectorData.sector,
      definition: sectorData.definition,
      description: sectorData.description,
      subsectors: []
    }

    // Process subsectors
    for (const subsectorData of sectorData.subsectors || []) {
      const subsector: NAICSSubsector = {
        code: subsectorData.code,
        definition: subsectorData.definition,
        description: subsectorData.description,
        industryGroups: []
      }

      // Process industry groups
      for (const industryGroupData of subsectorData.industryGroups || []) {
        const industryGroup: NAICSIndustryGroup = {
          code: industryGroupData.code,
          definition: industryGroupData.definition,
          description: industryGroupData.description,
          industries: []
        }

        // Process industries
        for (const industryData of industryGroupData.industries || []) {
          const industry: NAICSIndustry = {
            code: industryData.code,
            definition: industryData.definition,
            description: industryData.description,
            nationalIndustries: []
          }

          // Process national industries (6-digit codes)
          for (const nationalIndustryData of industryData.nationalIndustries || []) {
            const nationalIndustry: NAICSNationalIndustry = {
              code: nationalIndustryData.code,
              definition: nationalIndustryData.definition,
              description: nationalIndustryData.description
            }

            industry.nationalIndustries.push(nationalIndustry)

            // Add to flat codes list
            codes.push({
              code: nationalIndustry.code,
              title: nationalIndustry.definition,
              sector: sector.definition,
              subsector: subsector.definition,
              industryGroup: industryGroup.definition,
              industry: industry.definition
            })
          }

          industryGroup.industries.push(industry)
        }

        subsector.industryGroups.push(industryGroup)
      }

      sector.subsectors.push(subsector)
    }

    sectors.push(sector)
  }

  return { sectors, codes }
}

/**
 * Get all NAICS codes as a flat list
 */
export function getAllNAICSCodes(): NAICSCode[] {
  const { codes } = parseNAICSData()
  return codes.sort((a, b) => a.code.localeCompare(b.code))
}

/**
 * Get NAICS codes grouped by sector
 */
export function getNAICSCodesBySector(): Record<string, NAICSCode[]> {
  const { codes } = parseNAICSData()
  const grouped: Record<string, NAICSCode[]> = {}

  for (const code of codes) {
    if (code.sector) {
      if (!grouped[code.sector]) {
        grouped[code.sector] = []
      }
      grouped[code.sector].push(code)
    }
  }

  // Sort codes within each sector
  Object.keys(grouped).forEach(sector => {
    grouped[sector].sort((a, b) => a.code.localeCompare(b.code))
  })

  return grouped
}

/**
 * Search NAICS codes by text
 */
export function searchNAICSCodes(query: string): NAICSCode[] {
  if (!query.trim()) return getAllNAICSCodes()

  const { codes } = parseNAICSData()
  const searchTerm = query.toLowerCase()

  return codes.filter(code => 
    code.code.includes(searchTerm) ||
    code.title.toLowerCase().includes(searchTerm) ||
    code.sector?.toLowerCase().includes(searchTerm) ||
    code.subsector?.toLowerCase().includes(searchTerm) ||
    code.industryGroup?.toLowerCase().includes(searchTerm) ||
    code.industry?.toLowerCase().includes(searchTerm)
  ).sort((a, b) => {
    // Prioritize exact code matches
    if (a.code.startsWith(searchTerm) && !b.code.startsWith(searchTerm)) return -1
    if (b.code.startsWith(searchTerm) && !a.code.startsWith(searchTerm)) return 1
    
    // Then prioritize title matches
    if (a.title.toLowerCase().startsWith(searchTerm) && !b.title.toLowerCase().startsWith(searchTerm)) return -1
    if (b.title.toLowerCase().startsWith(searchTerm) && !a.title.toLowerCase().startsWith(searchTerm)) return 1
    
    // Default to code order
    return a.code.localeCompare(b.code)
  })
}

/**
 * Get a specific NAICS code by its 6-digit code
 */
export function getNAICSCodeByCode(code: string): NAICSCode | undefined {
  const { codes } = parseNAICSData()
  return codes.find(naics => naics.code === code)
}

/**
 * Format NAICS code for display
 */
export function formatNAICSCode(code: NAICSCode): string {
  return `${code.code} - ${code.title}`
}

/**
 * Get the sector number from a NAICS code
 */
export function getSectorFromCode(code: string): number | null {
  if (code.length >= 2) {
    return parseInt(code.substring(0, 2))
  }
  return null
}