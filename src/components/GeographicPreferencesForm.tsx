'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { Search, MapPin, X, Plus, ChevronDown, ChevronRight, Home, Plane, Building, Filter, Settings } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Checkbox } from '@/components/ui/checkbox'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { searchLocations, getLocationTypeIcon, getLocationTypeColors, getAllRegions, getAllStates, getStateFlag, getCountryFlag, SearchResult, SearchOptions } from '@/lib/locations'
import { GeographicPreferences, GeographicPreference, TravelWillingness, getTravelWillingnessDisplay } from '@/types/profile'

interface GeographicPreferencesFormProps {
  value: GeographicPreferences
  onChange: (preferences: GeographicPreferences) => void
  className?: string
}

const LEVEL_FILTERS = [
  { value: 'any', label: 'Any Level' },
  { value: 'country', label: 'Country' },
  { value: 'state', label: 'State' },
  { value: 'county', label: 'County' },
  { value: 'city', label: 'City' },
  { value: 'zip', label: 'ZIP Code' }
]

export function GeographicPreferencesForm({ 
  value, 
  onChange, 
  className = '' 
}: GeographicPreferencesFormProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedLevel, setSelectedLevel] = useState('any')
  const [isSearchExpanded, setIsSearchExpanded] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  
  // Advanced search filters
  const [minPopulation, setMinPopulation] = useState(0)
  const [maxPopulation, setMaxPopulation] = useState(10000000)
  const [selectedStates, setSelectedStates] = useState<string[]>([])
  const [selectedRegions, setSelectedRegions] = useState<string[]>([])
  const [cityTypeFilter, setCityTypeFilter] = useState<string[]>([])
  const [incorporatedOnly, setIncorporatedOnly] = useState(false)
  const [maxResults, setMaxResults] = useState(20)

  // Get available states and regions
  const allStates = useMemo(() => getAllStates(), [])
  const allRegions = useMemo(() => getAllRegions(), [])
  const cityTypes = ['city', 'borough', 'town', 'village', 'cdp', 'township']

  // Search results with advanced parameters
  const searchResults = useMemo(() => {
    const searchOptions: Partial<SearchOptions> = {
      minPopulation: minPopulation > 0 ? minPopulation : 0,
      maxPopulation: maxPopulation < 10000000 ? maxPopulation : Infinity,
      stateFilter: selectedStates,
      regionFilter: selectedRegions,
      cityTypeFilter: cityTypeFilter,
      incorporatedOnly,
      maxResults
    }
    
    return searchLocations(searchQuery, selectedLevel, searchOptions)
  }, [searchQuery, selectedLevel, minPopulation, maxPopulation, selectedStates, selectedRegions, cityTypeFilter, incorporatedOnly, maxResults])

  // Add a new geographic preference
  const addPreference = (location: SearchResult) => {
    const locationType = location.type as keyof typeof value.preferences
    
    // Check for duplicates in the appropriate array
    const existsInPreferences = value.preferences[locationType].some(pref => 
      (pref.id === location.id) || 
      (pref.name === location.name && pref.fullPath === location.fullPath)
    )
    
    if (!existsInPreferences) {
      // Create unique ID by combining type, id, and name to handle data duplicates
      const uniqueId = `${location.type}-${location.id}-${location.name.replace(/\s+/g, '-')}`
      
      // Extract only essential metadata based on geographic level
      let cleanedData: any = {}
      
      switch (location.type) {
        case 'country':
          cleanedData = {
            id: location.data.id,
            name: location.data.name,
            abbreviation: location.data.abbreviation,
            fipsCode: location.data.fipsCode,
            relevance: location.data.relevance
          }
          break
          
        case 'state':
          cleanedData = {
            id: location.data.id,
            name: location.data.name,
            fipsCode: location.data.fipsCode,
            region: location.data.region,
            division: location.data.division,
            capital: location.data.capital,
            population: location.data.population,
            relevance: location.data.relevance
          }
          break
          
        case 'county':
          cleanedData = {
            id: location.data.id,
            name: location.data.name,
            fipsCode: location.data.fipsCode,
            population: location.data.population,
            relevance: location.data.relevance
          }
          break
          
        case 'city':
          cleanedData = {
            id: location.data.id,
            name: location.data.name,
            type: location.data.type,
            population: location.data.population,
            incorporated: location.data.incorporated,
            coordinates: location.data.coordinates,
            zipCodes: location.data.zipCodes,
            relevance: location.data.relevance
          }
          break
          
        case 'zip':
          cleanedData = {
            zipCode: location.data.zipCode,
            city: location.data.city ? {
              id: location.data.city.id,
              name: location.data.city.name,
              type: location.data.city.type,
              population: location.data.city.population,
              incorporated: location.data.city.incorporated
            } : undefined,
            relevance: location.data.relevance
          }
          break
          
        default:
          // Fallback: keep original data structure
          cleanedData = location.data
      }
      
      const newPreference: GeographicPreference = {
        id: uniqueId,
        type: location.type as any,
        name: location.name,
        fullPath: location.fullPath,
        data: cleanedData
      }
      
      // Add to the appropriate array based on location type
      const updatedPreferences = {
        ...value.preferences,
        [locationType]: [...value.preferences[locationType], newPreference]
      }
      
      onChange({
        ...value,
        preferences: updatedPreferences
      })
      
      setSearchQuery('')
      setIsSearchExpanded(false)
    }
  }

  // Remove a preference
  const removePreference = (preferenceId: string, locationType: string) => {
    const updatedPreferences = {
      ...value.preferences,
      [locationType]: value.preferences[locationType as keyof typeof value.preferences].filter(pref => pref.id !== preferenceId)
    }
    
    onChange({
      ...value,
      preferences: updatedPreferences
    })
  }

  // Group preferences by type (already grouped in our new structure)
  const groupedPreferences = value.preferences

  // Get total count
  const getTotalCount = () => {
    return Object.values(value.preferences).reduce((total, arr) => total + arr.length, 0)
  }

  // Get flag for a preference based on its type and location data
  const getPreferenceFlag = (preference: GeographicPreference): string => {
    switch (preference.type) {
      case 'country':
        return getCountryFlag()
      case 'state':
        return preference.data?.flag || getStateFlag(preference.data?.id || preference.name)
      case 'county':
      case 'city':
      case 'zip':
        // For county/city/zip, find the state flag from their full path
        const fullPath = preference.fullPath || ''
        // Extract state name from full path (e.g., "City, County, StateName" or "County, StateName")
        const pathParts = fullPath.split(', ')
        if (pathParts.length >= 2) {
          const stateName = pathParts[pathParts.length - 1] // Last part should be state
          return getStateFlag(stateName)
        }
        return ''
      default:
        return ''
    }
  }

  // Get flag for search result
  const getSearchResultFlag = (result: SearchResult): string => {
    switch (result.type) {
      case 'country':
        return getCountryFlag()
      case 'state':
        return result.data?.flag || getStateFlag(result.data?.id || result.name)
      case 'county':
      case 'city':
      case 'zip':
        // Get state flag from parent data or fullPath
        if (result.parentData?.state) {
          return result.parentData.state.flag || getStateFlag(result.parentData.state.id || result.parentData.state.name)
        }
        // Fallback: extract from fullPath
        const pathParts = result.fullPath.split(', ')
        if (pathParts.length >= 2) {
          const stateName = pathParts[pathParts.length - 1]
          return getStateFlag(stateName)
        }
        return ''
      default:
        return ''
    }
  }

  // Handle click outside to close search
  useEffect(() => {
    const handleClickOutside = () => {
      if (isSearchExpanded) {
        setIsSearchExpanded(false)
      }
    }
    
    if (isSearchExpanded) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [isSearchExpanded])

  return (
    <Card className={`overflow-visible ${className}`}>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Geographic Preferences
        </CardTitle>
        <CardDescription>
          Specify locations where you&apos;d like to work on government contracts and your travel preferences
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6 overflow-visible">
        {/* Location Search */}
        <div className="space-y-4">
          <div className="relative">
            <Label htmlFor="location-search" className="text-sm font-medium">
              Search Locations
            </Label>
            <div className="relative mt-2" onClick={(e) => e.stopPropagation()}>
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="location-search"
                type="text"
                placeholder="Search by country, state, city, county, or ZIP code..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setIsSearchExpanded(true)
                }}
                onFocus={() => setIsSearchExpanded(true)}
                className="pl-10"
              />
            </div>

            {/* Filter buttons */}
            <div className="flex flex-wrap gap-2 mt-3">
              {LEVEL_FILTERS.map(level => (
                <Button
                  key={level.value}
                  type="button"
                  size="sm"
                  variant={selectedLevel === level.value ? "default" : "outline"}
                  onClick={() => setSelectedLevel(level.value)}
                  className="text-xs"
                >
                  {level.label}
                </Button>
              ))}
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="text-xs"
              >
                <Filter className="h-3 w-3 mr-1" />
                Advanced
                {showAdvanced ? <ChevronDown className="h-3 w-3 ml-1" /> : <ChevronRight className="h-3 w-3 ml-1" />}
              </Button>
            </div>

            {/* Advanced Search Filters */}
            <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
              <CollapsibleContent className="mt-4">
                <div className="bg-muted/30 rounded-lg p-4 space-y-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Settings className="h-4 w-4" />
                    <Label className="text-sm font-medium">Advanced Search Filters</Label>
                  </div>
                  
                  <div className="grid gap-4 md:grid-cols-2">
                    {/* Population Range */}
                    <div className="space-y-3">
                      <Label className="text-xs font-medium text-muted-foreground">Population Range</Label>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Label className="text-xs w-8">Min:</Label>
                          <Input
                            type="number"
                            value={minPopulation || ''}
                            onChange={(e) => setMinPopulation(Number(e.target.value) || 0)}
                            placeholder="0"
                            className="h-8 text-xs"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <Label className="text-xs w-8">Max:</Label>
                          <Input
                            type="number"
                            value={maxPopulation === 10000000 ? '' : maxPopulation}
                            onChange={(e) => setMaxPopulation(Number(e.target.value) || 10000000)}
                            placeholder="No limit"
                            className="h-8 text-xs"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Max Results */}
                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-muted-foreground">Max Results: {maxResults}</Label>
                      <Slider
                        value={[maxResults]}
                        onValueChange={([value]) => setMaxResults(value)}
                        min={5}
                        max={50}
                        step={5}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>5</span>
                        <span>50</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    {/* Region Filter */}
                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-muted-foreground">Filter by Region</Label>
                      <div className="max-h-32 overflow-y-auto bg-background rounded border p-2 space-y-1">
                        {allRegions.map(region => (
                          <div key={region} className="flex items-center space-x-2">
                            <Checkbox
                              id={`region-${region}`}
                              checked={selectedRegions.includes(region)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedRegions([...selectedRegions, region])
                                } else {
                                  setSelectedRegions(selectedRegions.filter(r => r !== region))
                                }
                              }}
                            />
                            <Label htmlFor={`region-${region}`} className="text-xs cursor-pointer">
                              {region}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* State Filter */}
                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-muted-foreground">Filter by State</Label>
                      <div className="max-h-32 overflow-y-auto bg-background rounded border p-2 space-y-1">
                        {allStates.slice(0, 10).map(state => (
                          <div key={state.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`state-${state.id}`}
                              checked={selectedStates.includes(state.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedStates([...selectedStates, state.id])
                                } else {
                                  setSelectedStates(selectedStates.filter(s => s !== state.id))
                                }
                              }}
                            />
                            <Label htmlFor={`state-${state.id}`} className="text-xs cursor-pointer flex items-center space-x-2">
                              {state.flag && <span className="text-sm">{state.flag}</span>}
                              <span>{state.name} ({state.id})</span>
                            </Label>
                          </div>
                        ))}
                        {allStates.length > 10 && (
                          <div className="text-xs text-muted-foreground text-center pt-1">
                            + {allStates.length - 10} more states available
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* City Type and Incorporated Filter */}
                  {(selectedLevel === 'any' || selectedLevel === 'city') && (
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label className="text-xs font-medium text-muted-foreground">City Types</Label>
                        <div className="flex flex-wrap gap-2">
                          {cityTypes.map(type => (
                            <Button
                              key={type}
                              type="button"
                              size="sm"
                              variant={cityTypeFilter.includes(type) ? "default" : "outline"}
                              onClick={() => {
                                if (cityTypeFilter.includes(type)) {
                                  setCityTypeFilter(cityTypeFilter.filter(t => t !== type))
                                } else {
                                  setCityTypeFilter([...cityTypeFilter, type])
                                }
                              }}
                              className="text-xs h-7"
                            >
                              {type}
                            </Button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="incorporated-only"
                            checked={incorporatedOnly}
                            onCheckedChange={setIncorporatedOnly}
                          />
                          <Label htmlFor="incorporated-only" className="text-xs font-medium cursor-pointer">
                            Incorporated cities only
                          </Label>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Filter out unincorporated areas and CDPs
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Clear Filters */}
                  <div className="flex justify-end pt-2 border-t">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setMinPopulation(0)
                        setMaxPopulation(10000000)
                        setSelectedStates([])
                        setSelectedRegions([])
                        setCityTypeFilter([])
                        setIncorporatedOnly(false)
                        setMaxResults(20)
                      }}
                      className="text-xs"
                    >
                      Clear All Filters
                    </Button>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Search Results */}
            {isSearchExpanded && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 bg-background border border-border rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto mt-1">
                {searchResults
                  .filter(result => selectedLevel === 'any' || result.type === selectedLevel)
                  .map((result, index) => {
                    const resultFlag = getSearchResultFlag(result)
                    return (
                  <button
                    key={`${result.type}-${result.id}-${index}`}
                    type="button"
                    onClick={() => addPreference(result)}
                    className="w-full text-left p-3 hover:bg-muted border-b border-border last:border-b-0 flex items-center space-x-3 transition-colors"
                  >
                    <div className="flex items-center space-x-2">
                      <span className="text-lg">{getLocationTypeIcon(result.type)}</span>
                      {resultFlag && (
                        <span className="text-sm shrink-0">{resultFlag}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="font-medium text-foreground truncate">{result.name}</div>
                        {result.data?.population && result.data.population > 0 && (
                          <Badge variant="secondary" className="text-xs shrink-0">
                            {result.data.population.toLocaleString()}
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground truncate">{result.fullPath}</div>
                      {result.data?.type && result.type === 'city' && (
                        <div className="text-xs text-muted-foreground">
                          {result.data.type} • {result.data.incorporated ? 'Incorporated' : 'Unincorporated'}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <Badge variant="outline" className={`text-xs ${getLocationTypeColors(result.type)}`}>
                        {result.type}
                      </Badge>
                      {result.data?.relevance && (
                        <div className="text-xs text-muted-foreground">
                          {Math.round(result.data.relevance)}% match
                        </div>
                      )}
                    </div>
                  </button>
                    )
                  })}
              </div>
            )}
            
            {isSearchExpanded && searchQuery.length >= 2 && searchResults.length === 0 && (
              <div className="absolute top-full left-0 right-0 bg-background border border-border rounded-lg shadow-lg z-50 p-4 mt-1 text-center text-muted-foreground">
                No locations found matching &ldquo;{searchQuery}&rdquo;
              </div>
            )}
          </div>
        </div>

        {/* Selected Preferences */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">
              Selected Locations ({getTotalCount()})
            </Label>
            {getTotalCount() > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onChange({ 
                  ...value, 
                  preferences: {
                    country: [],
                    state: [],
                    county: [],
                    city: [],
                    zip: []
                  }
                })}
                className="text-destructive hover:text-destructive"
              >
                Clear All
              </Button>
            )}
          </div>

          {getTotalCount() === 0 ? (
            <div className="text-center py-8 text-muted-foreground bg-muted/30 rounded-lg">
              <MapPin className="h-8 w-8 mx-auto mb-2 text-muted-foreground/60" />
              <p className="text-sm">No geographic preferences added yet.</p>
              <p className="text-xs mt-1">Search and select locations above to get started.</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {Object.entries(groupedPreferences).map(([type, preferences]) => {
                if (preferences.length === 0) return null
                
                return (
                  <div key={type} className="bg-muted/30 border border-border rounded-lg">
                    <div className={`px-3 py-2 border-b border-border flex items-center justify-between ${getLocationTypeColors(type)} bg-opacity-20`}>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm">{getLocationTypeIcon(type)}</span>
                        <h3 className="font-medium text-sm capitalize">
                          {type}s ({preferences.length})
                        </h3>
                      </div>
                    </div>
                    
                    <div className="p-3 space-y-2 max-h-32 overflow-y-auto">
                      {preferences.map((preference, prefIndex) => {
                        const preferenceFlag = getPreferenceFlag(preference)
                        return (
                        <div
                          key={`${type}-${preference.id}-${prefIndex}`}
                          className="flex items-center justify-between p-2 bg-background rounded border hover:bg-muted/50 transition-colors group"
                        >
                          <div className="flex items-center space-x-2 flex-1 min-w-0 mr-2">
                            {preferenceFlag && (
                              <span className="text-sm shrink-0">{preferenceFlag}</span>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm text-foreground truncate">
                                {preference.name}
                              </div>
                              {preference.fullPath !== preference.name && (
                                <div className="text-xs text-muted-foreground truncate">
                                  {preference.fullPath}
                                </div>
                              )}
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removePreference(preference.id!, type)}
                            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Work & Travel Preferences */}
        <div className="space-y-4 pt-4 border-t border-border">
          <Label className="text-sm font-medium flex items-center gap-2">
            <Plane className="h-4 w-4" />
            Work & Travel Preferences
          </Label>
          
          {/* Work from Home */}
          <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
            <div className="flex items-center space-x-3">
              <Home className="h-4 w-4 text-muted-foreground" />
              <div>
                <Label htmlFor="work-from-home" className="text-sm font-medium">
                  Remote Work
                </Label>
                <p className="text-xs text-muted-foreground">
                  Can work from home or remotely
                </p>
              </div>
            </div>
            <Switch
              id="work-from-home"
              checked={value.workFromHome}
              onCheckedChange={(checked) => onChange({ ...value, workFromHome: checked })}
            />
          </div>

          {/* Travel Willingness */}
          <div className="space-y-3">
            <Label htmlFor="travel-willingness" className="text-sm font-medium">
              Travel Willingness
            </Label>
            <Select
              value={value.travelWillingness}
              onValueChange={(willingness: TravelWillingness) => 
                onChange({ ...value, travelWillingness: willingness })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select travel preference" />
              </SelectTrigger>
              <SelectContent>
                {Object.values(TravelWillingness).map(willingness => {
                  const display = getTravelWillingnessDisplay(willingness)
                  return (
                    <SelectItem key={willingness} value={willingness}>
                      <div className="flex items-center gap-2">
                        <span>{display.emoji}</span>
                        <span>{display.label}</span>
                      </div>
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Max Travel Percentage */}
          {value.travelWillingness !== TravelWillingness.NONE && (
            <div className="space-y-3">
              <Label htmlFor="travel-percentage" className="text-sm font-medium">
                Maximum Travel Time: {value.maxTravelPercentage || 0}%
              </Label>
              <Slider
                id="travel-percentage"
                min={0}
                max={100}
                step={5}
                value={[value.maxTravelPercentage || 25]}
                onValueChange={([percentage]) => 
                  onChange({ ...value, maxTravelPercentage: percentage })
                }
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>0% - No travel</span>
                <span>50% - Half time</span>
                <span>100% - Full time travel</span>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}