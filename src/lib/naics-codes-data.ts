/**
 * NAICS Codes Data - Static Import
 * This file provides a stable import of the NAICS codes JSON data
 */

import type { NAICSData, NAICSCode } from '@/types/naics'

// Import the JSON data statically
import codesJSON from '@/data/government/codes/codes.json'

// Cast to the correct type
export const naicsRawData = codesJSON as NAICSData

/**
 * Pre-process and flatten the NAICS data for efficient searching
 */
export function preprocessNAICSData(): NAICSCode[] {
  const flattened: NAICSCode[] = []
  const data = naicsRawData['2022']
  
  if (!data || !Array.isArray(data)) {
    console.error('[NAICS Preprocessor] No 2022 data found in JSON')
    return flattened
  }

  console.log(`[NAICS Preprocessor] Processing ${data.length} sectors...`)

  data.forEach((sector) => {
    // Add sector
    flattened.push({
      code: sector.sector.toString(),
      title: sector.definition.replace(/T$/, ''),
      description: sector.description,
      level: 'sector',
      sectorNumber: sector.sector,
      hierarchy: {
        sector: sector.definition.replace(/T$/, '')
      }
    })

    // Process subsectors
    if (sector.subsectors && Array.isArray(sector.subsectors)) {
      sector.subsectors.forEach((subsector) => {
        flattened.push({
          code: subsector.code,
          title: subsector.definition.replace(/T$/, ''),
          description: subsector.description,
          level: 'subsector',
          parentCode: sector.sector.toString(),
          sectorNumber: sector.sector,
          hierarchy: {
            sector: sector.definition.replace(/T$/, ''),
            subsector: subsector.definition.replace(/T$/, '')
          }
        })

        // Process industry groups
        if (subsector.industryGroups && Array.isArray(subsector.industryGroups)) {
          subsector.industryGroups.forEach((industryGroup) => {
            flattened.push({
              code: industryGroup.code,
              title: industryGroup.definition.replace(/T$/, ''),
              description: industryGroup.description || '',
              level: 'industryGroup',
              parentCode: subsector.code,
              sectorNumber: sector.sector,
              hierarchy: {
                sector: sector.definition.replace(/T$/, ''),
                subsector: subsector.definition.replace(/T$/, ''),
                industryGroup: industryGroup.definition.replace(/T$/, '')
              }
            })

            // Process industries
            if (industryGroup.industries && Array.isArray(industryGroup.industries)) {
              industryGroup.industries.forEach((industry) => {
                flattened.push({
                  code: industry.code,
                  title: industry.definition.replace(/T$/, ''),
                  description: industry.description || '',
                  level: 'industry',
                  parentCode: industryGroup.code,
                  sectorNumber: sector.sector,
                  hierarchy: {
                    sector: sector.definition.replace(/T$/, ''),
                    subsector: subsector.definition.replace(/T$/, ''),
                    industryGroup: industryGroup.definition.replace(/T$/, ''),
                    industry: industry.definition.replace(/T$/, '')
                  }
                })

                // Process national industries (6-digit codes)
                if (industry.nationalIndustries && Array.isArray(industry.nationalIndustries)) {
                  industry.nationalIndustries.forEach((nationalIndustry) => {
                    flattened.push({
                      code: nationalIndustry.code,
                      title: nationalIndustry.definition,
                      description: nationalIndustry.description,
                      level: 'nationalIndustry',
                      parentCode: industry.code,
                      sectorNumber: sector.sector,
                      hierarchy: {
                        sector: sector.definition.replace(/T$/, ''),
                        subsector: subsector.definition.replace(/T$/, ''),
                        industryGroup: industryGroup.definition.replace(/T$/, ''),
                        industry: industry.definition.replace(/T$/, '')
                      }
                    })
                  })
                }
              })
            }
          })
        }
      })
    }
  })

  console.log(`[NAICS Preprocessor] ✅ Processed ${flattened.length} total codes`)
  
  // Log sample data for debugging
  const sample922190 = flattened.find(c => c.code === '922190')
  if (sample922190) {
    console.log('[NAICS Preprocessor] ✅ Found 922190:', sample922190.title)
  } else {
    console.log('[NAICS Preprocessor] ⚠️ Code 922190 not found in processed data')
  }
  
  return flattened
}

// Pre-process the data immediately
export const processedNAICSCodes = preprocessNAICSData()