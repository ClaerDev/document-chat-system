/**
 * NAICS Data Validation Schemas
 * Zod schemas for validating NAICS data structures
 */

import { z } from 'zod'

// Enum for NAICS levels
export const NAICSLevelSchema = z.enum([
  'sector',
  'subsector',
  'industryGroup',
  'industry',
  'nationalIndustry'
])

// Schema for NAICS hierarchy
export const NAICSHierarchySchema = z.object({
  sector: z.string().optional().describe('Sector name (2-digit level)'),
  subsector: z.string().optional().describe('Subsector name (3-digit level)'),
  industryGroup: z.string().optional().describe('Industry group name (4-digit level)'),
  industry: z.string().optional().describe('Industry name (5-digit level)')
})

// Schema for a flattened NAICS code
export const NAICSCodeSchema = z.object({
  code: z.string().regex(/^\d{2,6}$/).describe('NAICS code (2-6 digits)'),
  title: z.string().min(1).describe('Official NAICS title'),
  description: z.string().describe('Detailed description of the industry'),
  level: NAICSLevelSchema.describe('Hierarchical level of the code'),
  parentCode: z.string().optional().describe('Parent code in the hierarchy'),
  sectorNumber: z.number().optional().describe('2-digit sector number'),
  hierarchy: NAICSHierarchySchema.describe('Full hierarchical path')
})

// Schema for search filters
export const NAICSSearchFiltersSchema = z.object({
  query: z.string().optional().describe('Search query string'),
  sectorNumbers: z.array(z.number()).optional().describe('Filter by sector numbers'),
  levels: z.array(NAICSLevelSchema).optional().describe('Filter by hierarchy levels'),
  includeDescriptions: z.boolean().optional().describe('Include description in search')
})

// Schema for search results
export const NAICSSearchResultSchema = z.object({
  code: z.string().describe('NAICS code'),
  title: z.string().describe('NAICS title'),
  description: z.string().describe('NAICS description'),
  level: z.string().describe('Hierarchy level'),
  sectorNumber: z.number().describe('Sector number'),
  hierarchy: z.array(z.string()).describe('Hierarchical path as array'),
  matchType: z.enum(['code', 'title', 'description']).describe('Where the match was found'),
  relevanceScore: z.number().describe('Search relevance score')
})

// Schema for validation result
export const NAICSValidationResultSchema = z.object({
  isValid: z.boolean().describe('Whether the code is valid'),
  exists: z.boolean().describe('Whether the code exists in the database'),
  level: z.string().optional().describe('Level of the code if valid'),
  message: z.string().optional().describe('Validation message'),
  suggestions: z.array(NAICSCodeSchema).optional().describe('Suggested alternatives')
})

// Raw NAICS data structure from JSON
export const NAICSNationalIndustrySchema = z.object({
  code: z.string(),
  definition: z.string(),
  description: z.string()
})

export const NAICSIndustrySchema = z.object({
  code: z.string(),
  definition: z.string(),
  description: z.string().optional(),
  nationalIndustries: z.array(NAICSNationalIndustrySchema)
})

export const NAICSIndustryGroupSchema = z.object({
  code: z.string(),
  definition: z.string(),
  description: z.string().optional(),
  industries: z.array(NAICSIndustrySchema)
})

export const NAICSSubsectorSchema = z.object({
  code: z.string(),
  definition: z.string(),
  description: z.string(),
  industryGroups: z.array(NAICSIndustryGroupSchema)
})

export const NAICSSectorSchema = z.object({
  sector: z.number(),
  definition: z.string(),
  description: z.string(),
  subsectors: z.array(NAICSSubsectorSchema)
})

export const NAICSDataSchema = z.object({
  '2022': z.array(NAICSSectorSchema),
  '2017': z.array(NAICSSectorSchema),
  '2012': z.array(NAICSSectorSchema),
  '2007': z.array(NAICSSectorSchema),
  '2002': z.array(NAICSSectorSchema),
  '1997': z.array(NAICSSectorSchema)
})

// Validate an array of NAICS codes
export function validateNAICSCodes(codes: unknown): z.infer<typeof NAICSCodeSchema>[] {
  const arraySchema = z.array(NAICSCodeSchema)
  
  try {
    return arraySchema.parse(codes)
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('[NAICS Validation] Invalid data structure:', error.errors)
      error.errors.forEach(err => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`)
      })
    }
    throw error
  }
}

// Validate a single NAICS code
export function validateNAICSCode(code: unknown): z.infer<typeof NAICSCodeSchema> {
  try {
    return NAICSCodeSchema.parse(code)
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('[NAICS Validation] Invalid code structure:', error.errors)
    }
    throw error
  }
}

// Type exports
export type NAICSCode = z.infer<typeof NAICSCodeSchema>
export type NAICSSearchFilters = z.infer<typeof NAICSSearchFiltersSchema>
export type NAICSSearchResult = z.infer<typeof NAICSSearchResultSchema>
export type NAICSValidationResult = z.infer<typeof NAICSValidationResultSchema>
export type NAICSData = z.infer<typeof NAICSDataSchema>