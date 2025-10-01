import locationsData from '@/data/government/locations/locations.json'

export interface LocationData {
  country: {
    id: string
    name: string
    abbreviation: string
    fipsCode: string
    flag?: string
  }
  states: Array<{
    id: string
    name: string
    fipsCode: string
    region: string
    division: string
    capital: string
    population: number
    flag?: string
    counties: Array<{
      id: string
      name: string
      fipsCode: string
      population: number
      cities: Array<{
        id: string
        name: string
        type: string
        population: number
        incorporated: boolean
        coordinates: {
          latitude: number | null
          longitude: number | null
        }
        zipCodes: string[]
      }>
      congressionalDistricts: any[]
    }>
  }>
}

export interface SearchResult {
  type: 'country' | 'state' | 'county' | 'city' | 'zip'
  id: string
  name: string
  fullPath: string
  data: any
  parentData?: any
}

// Cast the imported data to our interface
const locations = locationsData as LocationData

export interface SearchOptions {
  query: string
  selectedLevel?: string
  includeRegions?: boolean
  includePopulation?: boolean
  minPopulation?: number
  maxPopulation?: number
  stateFilter?: string[]
  regionFilter?: string[]
  cityTypeFilter?: string[]
  incorporatedOnly?: boolean
  maxResults?: number
}

export function searchLocations(
  searchQuery: string, 
  selectedLevel: string = 'any',
  options: Partial<SearchOptions> = {}
): SearchResult[] {
  const opts: SearchOptions = {
    query: searchQuery,
    selectedLevel,
    includeRegions: true,
    includePopulation: true,
    minPopulation: 0,
    maxPopulation: Infinity,
    stateFilter: [],
    regionFilter: [],
    cityTypeFilter: [],
    incorporatedOnly: false,
    maxResults: 20,
    ...options
  }

  if (!opts.query || opts.query.length < 1) return []
  
  const results: SearchResult[] = []
  const query = opts.query.toLowerCase().trim()
  
  // Helper function to check if text matches query with various patterns
  const matchesQuery = (text: string, secondaryText?: string): { matches: boolean; relevance: number } => {
    const lowerText = text.toLowerCase()
    const lowerSecondary = secondaryText?.toLowerCase() || ''
    
    // Exact match (highest relevance)
    if (lowerText === query) return { matches: true, relevance: 100 }
    
    // Starts with query
    if (lowerText.startsWith(query)) return { matches: true, relevance: 90 }
    
    // Word boundary match (whole word)
    const wordBoundaryRegex = new RegExp(`\\b${query}\\b`)
    if (wordBoundaryRegex.test(lowerText)) return { matches: true, relevance: 80 }
    
    // Contains query
    if (lowerText.includes(query)) return { matches: true, relevance: 70 }
    
    // Secondary text matches (for things like abbreviations, alternate names)
    if (lowerSecondary && lowerSecondary.includes(query)) return { matches: true, relevance: 60 }
    
    // Fuzzy matching for typos (simple version)
    const distance = levenshteinDistance(query, lowerText)
    if (distance <= Math.min(2, Math.floor(query.length / 3))) {
      return { matches: true, relevance: 50 - distance * 5 }
    }
    
    // Acronym matching (first letters)
    const acronym = text.split(' ').map(word => word[0]).join('').toLowerCase()
    if (acronym.includes(query) && query.length >= 2) {
      return { matches: true, relevance: 40 }
    }
    
    return { matches: false, relevance: 0 }
  }

  // Search country
  if ((opts.selectedLevel === 'any' || opts.selectedLevel === 'country')) {
    const countryMatch = matchesQuery(
      locations.country.name, 
      `${locations.country.abbreviation} ${locations.country.id}`
    )
    if (countryMatch.matches) {
      results.push({
        type: 'country',
        id: locations.country.id,
        name: locations.country.name,
        fullPath: locations.country.name,
        data: { ...locations.country, relevance: countryMatch.relevance }
      })
    }
  }
  
  // Search states with enhanced matching
  if (opts.selectedLevel === 'any' || opts.selectedLevel === 'state') {
    locations.states.forEach(state => {
      // Apply region filter
      if (opts.regionFilter!.length > 0 && !opts.regionFilter!.includes(state.region)) {
        return
      }

      // Apply population filter
      if (state.population < opts.minPopulation! || state.population > opts.maxPopulation!) {
        return
      }

      const stateMatch = matchesQuery(
        state.name,
        `${state.id} ${state.region} ${state.division} ${state.capital}`
      )
      
      if (stateMatch.matches) {
        results.push({
          type: 'state',
          id: state.id,
          name: state.name,
          fullPath: `${state.name}, ${locations.country.name}`,
          data: { ...state, relevance: stateMatch.relevance },
          parentData: locations.country
        })
      }
    })
  }
  
  // Search counties with population and state filters
  if (opts.selectedLevel === 'any' || opts.selectedLevel === 'county') {
    locations.states.forEach(state => {
      // Apply state filter
      if (opts.stateFilter!.length > 0 && !opts.stateFilter!.includes(state.id)) {
        return
      }

      // Apply region filter
      if (opts.regionFilter!.length > 0 && !opts.regionFilter!.includes(state.region)) {
        return
      }

      state.counties.forEach(county => {
        // Apply population filter
        if (county.population < opts.minPopulation! || county.population > opts.maxPopulation!) {
          return
        }

        const countyMatch = matchesQuery(
          county.name,
          `${county.fipsCode} ${state.name}`
        )
        
        if (countyMatch.matches) {
          results.push({
            type: 'county',
            id: county.id,
            name: county.name,
            fullPath: `${county.name}, ${state.name}`,
            data: { ...county, relevance: countyMatch.relevance },
            parentData: state
          })
        }
      })
    })
  }
  
  // Search cities with enhanced filters
  if (opts.selectedLevel === 'any' || opts.selectedLevel === 'city') {
    locations.states.forEach(state => {
      // Apply state filter
      if (opts.stateFilter!.length > 0 && !opts.stateFilter!.includes(state.id)) {
        return
      }

      // Apply region filter  
      if (opts.regionFilter!.length > 0 && !opts.regionFilter!.includes(state.region)) {
        return
      }

      state.counties.forEach(county => {
        county.cities.forEach(city => {
          // Apply population filter
          if (city.population < opts.minPopulation! || city.population > opts.maxPopulation!) {
            return
          }

          // Apply city type filter
          if (opts.cityTypeFilter!.length > 0 && !opts.cityTypeFilter!.includes(city.type)) {
            return
          }

          // Apply incorporated filter
          if (opts.incorporatedOnly && !city.incorporated) {
            return
          }

          const cityMatch = matchesQuery(
            city.name,
            `${city.type} ${county.name} ${state.name}`
          )
          
          if (cityMatch.matches) {
            results.push({
              type: 'city',
              id: city.id,
              name: city.name,
              fullPath: `${city.name}, ${county.name}, ${state.name}`,
              data: { ...city, relevance: cityMatch.relevance },
              parentData: { county, state }
            })
          }
        })
      })
    })
  }
  
  // Search zip codes with city/state filters
  if (opts.selectedLevel === 'any' || opts.selectedLevel === 'zip') {
    locations.states.forEach(state => {
      // Apply state filter
      if (opts.stateFilter!.length > 0 && !opts.stateFilter!.includes(state.id)) {
        return
      }

      state.counties.forEach(county => {
        county.cities.forEach(city => {
          // Apply incorporated filter
          if (opts.incorporatedOnly && !city.incorporated) {
            return
          }

          city.zipCodes.forEach(zipCode => {
            const zipMatch = matchesQuery(zipCode, `${city.name} ${county.name} ${state.name}`)
            
            if (zipMatch.matches) {
              results.push({
                type: 'zip',
                id: `${city.id}-${zipCode}`,
                name: zipCode,
                fullPath: `${zipCode}, ${city.name}, ${county.name}, ${state.name}`,
                data: { zipCode, city, relevance: zipMatch.relevance },
                parentData: { county, state }
              })
            }
          })
        })
      })
    })
  }
  
  // Sort results by relevance, then by name
  return results
    .sort((a, b) => {
      const relevanceA = (a.data as any)?.relevance || 0
      const relevanceB = (b.data as any)?.relevance || 0
      
      if (relevanceA !== relevanceB) {
        return relevanceB - relevanceA // Higher relevance first
      }
      
      // Secondary sort by population (larger first) for same relevance
      const popA = (a.data as any)?.population || 0
      const popB = (b.data as any)?.population || 0
      if (popA !== popB) {
        return popB - popA
      }
      
      // Tertiary sort by name
      return a.name.localeCompare(b.name)
    })
    .slice(0, opts.maxResults!)
}

// Simple Levenshtein distance calculation for fuzzy matching
function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = []
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i]
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        )
      }
    }
  }
  
  return matrix[str2.length][str1.length]
}

export function getLocationTypeIcon(type: string): string {
  switch(type) {
    case 'country': return '🌍'
    case 'state': return '🏛️'
    case 'county': return '🏘️'
    case 'city': return '🏙️'
    case 'zip': return '📮'
    default: return '📍'
  }
}

export function getLocationTypeColors(type: string): string {
  switch(type) {
    case 'country': return 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900 dark:text-purple-200 dark:border-purple-700'
    case 'state': return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900 dark:text-blue-200 dark:border-blue-700'  
    case 'county': return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900 dark:text-green-200 dark:border-green-700'
    case 'city': return 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900 dark:text-orange-200 dark:border-orange-700'
    case 'zip': return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600'
    default: return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600'
  }
}

// Get all states for quick access
export function getAllStates() {
  return locations.states.map(state => ({
    id: state.id,
    name: state.name,
    region: state.region,
    division: state.division,
    flag: state.flag
  }))
}

// Get state flag by state ID or name
export function getStateFlag(stateIdOrName: string): string {
  const state = locations.states.find(s => 
    s.id === stateIdOrName || 
    s.name.toLowerCase() === stateIdOrName.toLowerCase()
  )
  return state?.flag || ''
}

// Get country flag
export function getCountryFlag(): string {
  return locations.country.flag || '🇺🇸'
}

// Get all regions
export function getAllRegions() {
  const regions = [...new Set(locations.states.map(state => state.region))]
  return regions.sort()
}