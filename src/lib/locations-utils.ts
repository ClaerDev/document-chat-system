/**
 * Locations utility functions
 * Parses the comprehensive locations database from JSON file
 */

import locationsData from '@/data/government/locations/locations.json'

export interface City {
  id: string
  name: string
  type: string
  population: number
  incorporated: boolean
  coordinates: {
    latitude: number
    longitude: number
  }
  zipCodes: string[]
}

export interface County {
  id: string
  name: string
  fipsCode: string
  population: number
  cities: City[]
}

export interface State {
  id: string
  name: string
  fipsCode: string
  region: string
  division: string
  capital: string
  population: number
  counties: County[]
}

export interface Country {
  id: string
  name: string
  abbreviation: string
  fipsCode: string
}

export interface LocationsData {
  country: Country
  states: State[]
}

/**
 * Parse locations data
 */
export function parseLocationsData(): LocationsData {
  return locationsData as LocationsData
}

/**
 * Get all states as a simple list for dropdowns
 */
export function getAllStates(): Array<{ code: string; name: string; region?: string }> {
  const { states } = parseLocationsData()
  return states.map(state => ({
    code: state.id,
    name: state.name,
    region: state.region
  })).sort((a, b) => a.name.localeCompare(b.name))
}

/**
 * Get states grouped by region
 */
export function getStatesByRegion(): Record<string, Array<{ code: string; name: string }>> {
  const { states } = parseLocationsData()
  const grouped: Record<string, Array<{ code: string; name: string }>> = {}

  for (const state of states) {
    if (!grouped[state.region]) {
      grouped[state.region] = []
    }
    grouped[state.region].push({
      code: state.id,
      name: state.name
    })
  }

  // Sort states within each region
  Object.keys(grouped).forEach(region => {
    grouped[region].sort((a, b) => a.name.localeCompare(b.name))
  })

  return grouped
}

/**
 * Get all cities for a specific state
 */
export function getCitiesForState(stateCode: string): Array<{ id: string; name: string; population: number }> {
  const { states } = parseLocationsData()
  const state = states.find(s => s.id === stateCode)
  
  if (!state) return []

  const cities: Array<{ id: string; name: string; population: number }> = []
  
  for (const county of state.counties) {
    for (const city of county.cities) {
      cities.push({
        id: city.id,
        name: city.name,
        population: city.population
      })
    }
  }

  return cities.sort((a, b) => b.population - a.population) // Sort by population descending
}

/**
 * Get major cities (population > 50,000) across all states
 */
export function getMajorCities(): Array<{ 
  id: string; 
  name: string; 
  state: string; 
  population: number 
}> {
  const { states } = parseLocationsData()
  const majorCities: Array<{ 
    id: string; 
    name: string; 
    state: string; 
    population: number 
  }> = []

  for (const state of states) {
    for (const county of state.counties) {
      for (const city of county.cities) {
        if (city.population > 50000) {
          majorCities.push({
            id: city.id,
            name: city.name,
            state: state.name,
            population: city.population
          })
        }
      }
    }
  }

  return majorCities.sort((a, b) => b.population - a.population)
}

/**
 * Search locations by text
 */
export function searchLocations(query: string): Array<{
  type: 'state' | 'city' | 'county'
  id: string
  name: string
  state?: string
  population?: number
}> {
  if (!query.trim()) return []

  const { states } = parseLocationsData()
  const searchTerm = query.toLowerCase()
  const results: Array<{
    type: 'state' | 'city' | 'county'
    id: string
    name: string
    state?: string
    population?: number
  }> = []

  // Search states
  for (const state of states) {
    if (state.name.toLowerCase().includes(searchTerm) || 
        state.id.toLowerCase().includes(searchTerm)) {
      results.push({
        type: 'state',
        id: state.id,
        name: state.name,
        population: state.population
      })
    }

    // Search counties
    for (const county of state.counties) {
      if (county.name.toLowerCase().includes(searchTerm)) {
        results.push({
          type: 'county',
          id: county.id,
          name: county.name,
          state: state.name,
          population: county.population
        })
      }

      // Search cities
      for (const city of county.cities) {
        if (city.name.toLowerCase().includes(searchTerm)) {
          results.push({
            type: 'city',
            id: city.id,
            name: city.name,
            state: state.name,
            population: city.population
          })
        }
      }
    }
  }

  return results.sort((a, b) => {
    // Prioritize exact matches
    if (a.name.toLowerCase().startsWith(searchTerm) && !b.name.toLowerCase().startsWith(searchTerm)) return -1
    if (b.name.toLowerCase().startsWith(searchTerm) && !a.name.toLowerCase().startsWith(searchTerm)) return 1
    
    // Then by type (states first, then cities, then counties)
    const typeOrder = { state: 0, city: 1, county: 2 }
    if (typeOrder[a.type] !== typeOrder[b.type]) {
      return typeOrder[a.type] - typeOrder[b.type]
    }
    
    // Finally by population
    return (b.population || 0) - (a.population || 0)
  }).slice(0, 50) // Limit results
}

/**
 * Get state information by code
 */
export function getStateByCode(code: string): State | undefined {
  const { states } = parseLocationsData()
  return states.find(state => state.id === code)
}

/**
 * Format location for display
 */
export function formatLocation(location: {
  type: 'state' | 'city' | 'county'
  name: string
  state?: string
}): string {
  switch (location.type) {
    case 'state':
      return location.name
    case 'city':
    case 'county':
      return `${location.name}, ${location.state}`
    default:
      return location.name
  }
}