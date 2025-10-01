'use client'

import { useState, useEffect, useMemo } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Check, ChevronsUpDown, X, MapPin } from 'lucide-react'
import { cn } from '@/lib/utils'
import locationsData from '@/data/government/locations/locations.json'

export interface MultiSelectLocationValue {
  states?: string[]
  cities?: string[]
  zipCodes?: string[]
}

interface MultiSelectLocationSelectorProps {
  value: MultiSelectLocationValue
  onChange: (location: MultiSelectLocationValue) => void
  className?: string
  disabled?: boolean
  layout?: 'vertical' | 'horizontal'
  placeholder?: {
    states?: string
    cities?: string
    zipCodes?: string
  }
}

interface State {
  id: string
  name: string
  fipsCode: string
  region: string
  division: string
  capital: string
  population: number
  flag?: string
  counties: County[]
}

interface County {
  id: string
  name: string
  fipsCode: string
  population: number
  cities: City[]
}

interface City {
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

// Multi-Select State Selector Component
export function MultiSelectStateSelector({ 
  value = [], 
  onChange, 
  className = '', 
  placeholder = 'Select states',
  disabled = false 
}: { 
  value?: string[]
  onChange: (states: string[]) => void
  className?: string
  placeholder?: string
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // Sort states alphabetically
  const states: State[] = useMemo(
    () => [...locationsData.states].sort((a, b) => a.name.localeCompare(b.name)),
    []
  )

  // Filter states based on search
  const filteredStates = useMemo(() => {
    if (!searchQuery.trim()) return states
    
    const query = searchQuery.toLowerCase().trim()
    return states.filter(state => 
      state.name.toLowerCase().includes(query) ||
      state.id.toLowerCase().includes(query)
    )
  }, [states, searchQuery])

  const selectedStates = useMemo(() => {
    return value.map(stateId => states.find(state => state.id === stateId)).filter(Boolean) as State[]
  }, [value, states])

  const handleSelect = (stateId: string) => {
    if (value.includes(stateId)) {
      onChange(value.filter(id => id !== stateId))
    } else {
      onChange([...value, stateId])
    }
  }

  const handleRemove = (stateId: string) => {
    onChange(value.filter(id => id !== stateId))
  }

  const handleClear = () => {
    onChange([])
  }

  return (
    <div className={cn("relative", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={`w-full justify-between font-normal pr-8 ${selectedStates.length > 0 ? 'min-h-9 h-auto py-2' : 'h-9'}`}
            disabled={disabled}
          >
            <div className={`flex gap-2 min-w-0 flex-1 ${selectedStates.length > 0 ? 'items-start' : 'items-center'}`}>
              {selectedStates.length > 0 ? (
                <div className="flex flex-wrap gap-1 min-w-0 flex-1">
                  {selectedStates.map((state) => (
                    <div key={state.id} className="flex items-center gap-1 bg-secondary/50 rounded px-2 py-1">
                      {state.flag && (
                        <img 
                          src={state.flag} 
                          alt={`${state.name} flag`}
                          className="w-4 h-3 object-cover rounded-sm shrink-0"
                        />
                      )}
                      <Badge variant="default" className="text-xs shrink-0 font-mono">
                        {state.id}
                      </Badge>
                      <span className="text-xs truncate max-w-24">{state.name}</span>
                      <span
                        onClick={(e) => {
                          e.stopPropagation()
                          handleRemove(state.id)
                        }}
                        className="ml-1 hover:text-destructive cursor-pointer"
                      >
                        <X className="h-3 w-3" />
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <span className="text-muted-foreground">{placeholder}</span>
              )}
            </div>
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
          <Command>
            <CommandInput 
              placeholder="Search states..."
              value={searchQuery}
              onValueChange={setSearchQuery}
            />
            <CommandList className="max-h-96">
              <CommandEmpty>No states found.</CommandEmpty>
              <CommandGroup>
                {filteredStates.map((state) => (
                  <CommandItem
                    key={state.id}
                    value={`${state.name} ${state.id}`}
                    onSelect={() => handleSelect(state.id)}
                    className="flex items-center justify-between gap-2 py-2"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                        {state.flag && (
                          <img 
                            src={state.flag} 
                            alt={`${state.name} flag`}
                            className="w-5 h-4 object-cover rounded-sm shrink-0"
                          />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <Badge variant={value.includes(state.id) ? "default" : "secondary"} className="text-xs shrink-0 font-mono">
                            {state.id}
                          </Badge>
                          <span className="truncate font-medium text-sm">{state.name}</span>
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {state.region} • {state.division}
                        </div>
                      </div>
                    </div>
                    <Check
                      className={cn(
                        "h-4 w-4 shrink-0",
                        value.includes(state.id) ? "opacity-100" : "opacity-0"
                      )}
                    />
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      
      {/* Clear button */}
      {selectedStates.length > 0 && (
        <button
          type="button"
          className="absolute right-8 top-1/2 -translate-y-1/2 h-4 w-4 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          onClick={handleClear}
          disabled={disabled}
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  )
}

// Multi-Select City Selector Component
export function MultiSelectCitySelector({ 
  selectedStates = [],
  value = [], 
  onChange, 
  className = '', 
  placeholder = 'Select cities',
  disabled = false 
}: { 
  selectedStates?: string[]
  value?: string[]
  onChange: (cities: string[]) => void
  className?: string
  placeholder?: string
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const states: State[] = useMemo(
    () => [...locationsData.states].sort((a, b) => a.name.localeCompare(b.name)),
    []
  )

  // Get available cities for selected states
  const availableCities = useMemo(() => {
    if (selectedStates.length === 0) return []
    
    const cities: Array<{id: string, name: string, state: string, population: number, countyName: string}> = []
    
    selectedStates.forEach(stateId => {
      const selectedState = states.find((state) => state.id === stateId)
      if (selectedState) {
        selectedState.counties.forEach((county) => {
          county.cities.forEach((city) => {
            cities.push({
              id: city.id,
              name: city.name.replace(/,.*$/, '').trim(),
              state: stateId,
              population: city.population,
              countyName: county.name
            })
          })
        })
      }
    })

    // Remove duplicates and sort by name
    const uniqueCities = cities.reduce((acc, city) => {
      const key = `${city.name}-${city.state}`
      if (!acc.find(c => `${c.name}-${c.state}` === key)) {
        acc.push(city)
      }
      return acc
    }, [] as typeof cities)

    return uniqueCities.sort((a, b) => a.name.localeCompare(b.name))
  }, [selectedStates, states])

  // Filter cities based on search
  const filteredCities = useMemo(() => {
    if (!searchQuery.trim()) return availableCities.slice(0, 100)
    
    const query = searchQuery.toLowerCase().trim()
    return availableCities.filter(city => 
      city.name.toLowerCase().includes(query)
    ).slice(0, 100)
  }, [availableCities, searchQuery])

  const selectedCities = useMemo(() => {
    return value.map(cityName => availableCities.find(city => city.name === cityName)).filter(Boolean)
  }, [value, availableCities])

  const handleSelect = (cityName: string) => {
    if (value.includes(cityName)) {
      onChange(value.filter(name => name !== cityName))
    } else {
      onChange([...value, cityName])
    }
  }

  const handleRemove = (cityName: string) => {
    onChange(value.filter(name => name !== cityName))
  }

  const handleClear = () => {
    onChange([])
  }

  if (selectedStates.length === 0) {
    return (
      <div className={cn("relative", className)}>
        <Button
          variant="outline"
          className="w-full justify-between font-normal"
          disabled={true}
        >
          <span className="text-muted-foreground">Select states first</span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </div>
    )
  }

  return (
    <div className={cn("relative", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={`w-full justify-between font-normal pr-8 ${selectedCities.length > 0 ? 'min-h-9 h-auto py-2' : 'h-9'}`}
            disabled={disabled}
          >
            <div className={`flex gap-2 min-w-0 flex-1 ${selectedCities.length > 0 ? 'items-start' : 'items-center'}`}>
              {selectedCities.length > 0 ? (
                <div className="flex flex-wrap gap-1 min-w-0 flex-1">
                  {selectedCities.map((city) => (
                    <div key={`${city.name}-${city.state}`} className="flex items-center gap-1 bg-secondary/50 rounded px-2 py-1">
                      <span className="text-xs truncate max-w-32">{city.name}</span>
                      <Badge variant="secondary" className="text-xs shrink-0 font-mono">
                        {city.state}
                      </Badge>
                      <span
                        onClick={(e) => {
                          e.stopPropagation()
                          handleRemove(city.name)
                        }}
                        className="ml-1 hover:text-destructive cursor-pointer"
                      >
                        <X className="h-3 w-3" />
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <span className="text-muted-foreground">{placeholder}</span>
              )}
            </div>
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
          <Command>
            <CommandInput 
              placeholder="Search cities..."
              value={searchQuery}
              onValueChange={setSearchQuery}
            />
            <CommandList className="max-h-96">
              <CommandEmpty>No cities found.</CommandEmpty>
              <CommandGroup>
                {filteredCities.map((city, index) => {
                  const uniqueKey = `city-${city.id}-${city.state}-${index}`
                  
                  return (
                    <CommandItem
                      key={uniqueKey}
                      value={city.name}
                      onSelect={() => handleSelect(city.name)}
                      className="flex items-center justify-between gap-2 py-2"
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="truncate font-medium text-sm">{city.name}</span>
                            <Badge variant="secondary" className="text-xs shrink-0 font-mono">
                              {city.state}
                            </Badge>
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {city.population > 0 && `Population: ${city.population.toLocaleString()}`}
                            {city.countyName && ` • ${city.countyName.replace(' County', '')}`}
                          </div>
                        </div>
                      </div>
                      <Check
                        className={cn(
                          "h-4 w-4 shrink-0",
                          value.includes(city.name) ? "opacity-100" : "opacity-0"
                        )}
                      />
                    </CommandItem>
                  )
                })}
              </CommandGroup>
              {availableCities.length > 100 && (
                <div className="p-2 text-xs text-muted-foreground text-center border-t">
                  Showing first 100 cities alphabetically. Use search for more specific results.
                </div>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      
      {/* Clear button */}
      {selectedCities.length > 0 && (
        <button
          type="button"
          className="absolute right-8 top-1/2 -translate-y-1/2 h-4 w-4 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          onClick={handleClear}
          disabled={disabled}
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  )
}

// Multi-Select ZIP Code Selector Component
export function MultiSelectZipCodeSelector({ 
  selectedStates = [],
  selectedCities = [],
  value = [], 
  onChange, 
  className = '', 
  placeholder = 'Select ZIP codes',
  disabled = false 
}: { 
  selectedStates?: string[]
  selectedCities?: string[]
  value?: string[]
  onChange: (zipCodes: string[]) => void
  className?: string
  placeholder?: string
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const states: State[] = useMemo(
    () => [...locationsData.states].sort((a, b) => a.name.localeCompare(b.name)),
    []
  )

  // Get available ZIP codes
  const availableZipCodes = useMemo(() => {
    if (selectedStates.length === 0) return []
    
    const zipCodes: string[] = []
    
    selectedStates.forEach(stateId => {
      const selectedState = states.find((state) => state.id === stateId)
      if (selectedState) {
        selectedState.counties.forEach((county) => {
          county.cities.forEach((city) => {
            const cityName = city.name.replace(/,.*$/, '').trim()
            
            // If cities are selected, only include ZIP codes from those cities
            if (selectedCities.length === 0 || selectedCities.includes(cityName)) {
              if (city.zipCodes) {
                zipCodes.push(...city.zipCodes)
              }
            }
          })
        })
      }
    })
    
    // Remove duplicates and sort
    return [...new Set(zipCodes)].sort()
  }, [selectedStates, selectedCities, states])

  // Filter ZIP codes based on search
  const filteredZipCodes = useMemo(() => {
    if (!searchQuery.trim()) return availableZipCodes.slice(0, 50)
    
    return availableZipCodes.filter(zip => 
      zip.includes(searchQuery.trim())
    ).slice(0, 50)
  }, [availableZipCodes, searchQuery])

  const handleSelect = (zipCode: string) => {
    if (value.includes(zipCode)) {
      onChange(value.filter(zip => zip !== zipCode))
    } else {
      onChange([...value, zipCode])
    }
  }

  const handleRemove = (zipCode: string) => {
    onChange(value.filter(zip => zip !== zipCode))
  }

  const handleClear = () => {
    onChange([])
  }

  if (selectedStates.length === 0) {
    return (
      <div className={cn("relative", className)}>
        <Button
          variant="outline"
          className="w-full justify-between font-normal"
          disabled={true}
        >
          <span className="text-muted-foreground">Select states first</span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </div>
    )
  }

  if (availableZipCodes.length === 0) {
    return (
      <div className={cn("relative", className)}>
        <input
          type="text"
          placeholder="Enter ZIP codes (comma-separated)"
          disabled={disabled}
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          onChange={(e) => {
            const zips = e.target.value.split(',').map(zip => zip.trim()).filter(Boolean)
            onChange(zips)
          }}
        />
      </div>
    )
  }

  return (
    <div className={cn("relative", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={`w-full justify-between font-normal pr-8 ${value.length > 0 ? 'min-h-9 h-auto py-2' : 'h-9'}`}
            disabled={disabled}
          >
            <div className={`flex gap-2 min-w-0 flex-1 ${value.length > 0 ? 'items-start' : 'items-center'}`}>
              {value.length > 0 ? (
                <div className="flex flex-wrap gap-1 min-w-0 flex-1">
                  {value.map((zipCode) => (
                    <div key={zipCode} className="flex items-center gap-1 bg-secondary/50 rounded px-2 py-1">
                      <span className="text-xs truncate">{zipCode}</span>
                      <span
                        onClick={(e) => {
                          e.stopPropagation()
                          handleRemove(zipCode)
                        }}
                        className="ml-1 hover:text-destructive cursor-pointer"
                      >
                        <X className="h-3 w-3" />
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <span className="text-muted-foreground">{placeholder}</span>
              )}
            </div>
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
          <Command>
            <CommandInput 
              placeholder="Search ZIP codes..."
              value={searchQuery}
              onValueChange={setSearchQuery}
            />
            <CommandList className="max-h-96">
              <CommandEmpty>No ZIP codes found.</CommandEmpty>
              <CommandGroup>
                {filteredZipCodes.map((zipCode) => (
                  <CommandItem
                    key={zipCode}
                    value={zipCode}
                    onSelect={() => handleSelect(zipCode)}
                    className="flex items-center justify-between gap-2 py-2"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="truncate font-medium text-sm">{zipCode}</span>
                    </div>
                    <Check
                      className={cn(
                        "h-4 w-4 shrink-0",
                        value.includes(zipCode) ? "opacity-100" : "opacity-0"
                      )}
                    />
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      
      {/* Clear button */}
      {value.length > 0 && (
        <button
          type="button"
          className="absolute right-8 top-1/2 -translate-y-1/2 h-4 w-4 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          onClick={handleClear}
          disabled={disabled}
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  )
}

// Main Multi-Select Location Selector Component
export function MultiSelectLocationSelector({
  value,
  onChange,
  className = '',
  disabled = false,
  layout = 'vertical',
  placeholder = {}
}: MultiSelectLocationSelectorProps) {
  
  const handleStatesChange = (states: string[]) => {
    // When states change, clear cities and ZIP codes that are no longer valid
    const validCities = value.cities?.filter(city => {
      // Check if this city exists in any of the selected states
      return states.some(stateId => {
        const state = locationsData.states.find(s => s.id === stateId)
        if (!state) return false
        return state.counties.some(county =>
          county.cities.some(c => c.name.replace(/,.*$/, '').trim() === city)
        )
      })
    }) || []

    const validZipCodes = value.zipCodes?.filter(zipCode => {
      // Check if this ZIP code exists in any of the selected states and cities
      return states.some(stateId => {
        const state = locationsData.states.find(s => s.id === stateId)
        if (!state) return false
        return state.counties.some(county =>
          county.cities.some(city => {
            const cityName = city.name.replace(/,.*$/, '').trim()
            return (validCities.length === 0 || validCities.includes(cityName)) && 
                   city.zipCodes?.includes(zipCode)
          })
        )
      })
    }) || []

    onChange({
      states,
      cities: validCities,
      zipCodes: validZipCodes
    })
  }

  const handleCitiesChange = (cities: string[]) => {
    // When cities change, clear ZIP codes that are no longer valid
    const validZipCodes = value.zipCodes?.filter(zipCode => {
      // Check if this ZIP code exists in any of the selected cities
      return (value.states || []).some(stateId => {
        const state = locationsData.states.find(s => s.id === stateId)
        if (!state) return false
        return state.counties.some(county =>
          county.cities.some(city => {
            const cityName = city.name.replace(/,.*$/, '').trim()
            return cities.includes(cityName) && city.zipCodes?.includes(zipCode)
          })
        )
      })
    }) || []

    onChange({
      ...value,
      cities,
      zipCodes: validZipCodes
    })
  }

  const handleZipCodesChange = (zipCodes: string[]) => {
    onChange({
      ...value,
      zipCodes
    })
  }

  return (
    <div className={cn(layout === 'horizontal' ? 'grid gap-4 md:grid-cols-3' : 'space-y-4', className)}>
      {/* States Selection */}
      <div className="space-y-2">
        <label className="text-sm font-medium">States</label>
        <MultiSelectStateSelector
          value={value.states || []}
          onChange={handleStatesChange}
          disabled={disabled}
          placeholder={placeholder.states || "Select states"}
        />
      </div>

      {/* Cities Selection - Always show in horizontal layout, conditionally in vertical */}
      {(layout === 'horizontal' || (value.states && value.states.length > 0)) && (
        <div className="space-y-2">
          <label className="text-sm font-medium">Cities (Optional)</label>
          <MultiSelectCitySelector
            selectedStates={value.states || []}
            value={value.cities || []}
            onChange={handleCitiesChange}
            disabled={disabled}
            placeholder={placeholder.cities || "Select cities"}
          />
        </div>
      )}

      {/* ZIP Codes Selection - Always show in horizontal layout, conditionally in vertical */}
      {(layout === 'horizontal' || (value.states && value.states.length > 0)) && (
        <div className="space-y-2">
          <label className="text-sm font-medium">ZIP Codes (Optional)</label>
          <MultiSelectZipCodeSelector
            selectedStates={value.states || []}
            selectedCities={value.cities || []}
            value={value.zipCodes || []}
            onChange={handleZipCodesChange}
            disabled={disabled}
            placeholder={placeholder.zipCodes || "Select ZIP codes"}
          />
        </div>
      )}
    </div>
  )
}

export { type MultiSelectLocationValue }