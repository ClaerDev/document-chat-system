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
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card'
import { Check, ChevronsUpDown, X, MapPin, Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import locationsData from '@/data/government/locations/locations.json'

export interface LocationValue {
  state?: string
  city?: string
  zipCode?: string
}

interface SeparateLocationSelectorProps {
  value: LocationValue
  onChange: (location: LocationValue) => void
  className?: string
  disabled?: boolean
  layout?: 'vertical' | 'horizontal'
  required?: {
    state?: boolean
    city?: boolean
    zipCode?: boolean
  }
}

interface LocationLabelWithInfoProps {
  htmlFor?: string
  children: React.ReactNode
  selectedValue?: LocationValue
}

interface State {
  id: string
  name: string
  fipsCode: string
  region: string
  division: string
  capital: string
  population: number
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

// Location Label with Info Icon Component
export function LocationLabelWithInfo({ htmlFor, children, selectedValue }: LocationLabelWithInfoProps) {
  const formattedLocation = useMemo(() => {
    if (!selectedValue?.state) return null
    
    const state = locationsData.states.find(s => s.id === selectedValue.state)
    if (!state) return null
    
    let display = ''
    if (selectedValue.city) {
      display += selectedValue.city + ', '
    }
    display += state.name
    if (selectedValue.zipCode) {
      display += ` ${selectedValue.zipCode}`
    }
    
    return display
  }, [selectedValue])

  return (
    <div className="flex items-center gap-2">
      <label htmlFor={htmlFor} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
        {children}
      </label>
      <HoverCard>
        <HoverCardTrigger asChild>
          <button type="button" className="inline-flex items-center justify-center">
            <Info className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
          </button>
        </HoverCardTrigger>
        <HoverCardContent className="w-96 bg-popover text-popover-foreground border shadow-sm" align="start">
          {selectedValue?.state && formattedLocation ? (
            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <div className="bg-blue-500/10 p-1.5 rounded">
                  <MapPin className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-medium leading-tight">{formattedLocation}</h4>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {selectedValue.state && (
                      <Badge variant="secondary" className="text-xs">
                        State: {selectedValue.state}
                      </Badge>
                    )}
                    {selectedValue.city && (
                      <Badge variant="secondary" className="text-xs">
                        City: {selectedValue.city}
                      </Badge>
                    )}
                    {selectedValue.zipCode && (
                      <Badge variant="secondary" className="text-xs">
                        ZIP: {selectedValue.zipCode}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold">Location</h4>
              <p className="text-sm text-muted-foreground">
                Select a location by choosing a state, city, and optionally a ZIP code. This helps identify the geographic scope of projects or operations.
              </p>
              <p className="text-xs text-muted-foreground font-medium">
                💡 Select a location first to see detailed information here.
              </p>
            </div>
          )}
        </HoverCardContent>
      </HoverCard>
    </div>
  )
}

// State Selector Component
export function StateSelector({ 
  value, 
  onChange, 
  className = '', 
  placeholder = 'Select state',
  disabled = false 
}: { 
  value?: string
  onChange: (state: string) => void
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

  const selectedState = useMemo(() => {
    return value ? states.find(state => state.id === value) : null
  }, [value, states])

  const handleSelect = (stateId: string) => {
    if (stateId === value) {
      onChange('')
    } else {
      onChange(stateId)
    }
    setOpen(false)
    setSearchQuery('')
  }

  const handleClear = () => {
    onChange('')
    setOpen(false)
    setSearchQuery('')
  }

  return (
    <div className={cn("relative", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between font-normal pr-8"
            disabled={disabled}
          >
            <div className="flex items-center gap-2 min-w-0 flex-1">
              {selectedState ? (
                <>
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <Badge variant="default" className="text-xs shrink-0 font-mono">
                    {selectedState.id}
                  </Badge>
                  <span className="truncate font-medium text-sm">{selectedState.name}</span>
                </>
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
                      <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <Badge variant={value === state.id ? "default" : "secondary"} className="text-xs shrink-0 font-mono">
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
                        value === state.id ? "opacity-100" : "opacity-0"
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
      {selectedState && (
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

// City Selector Component
export function CitySelector({ 
  stateId,
  value, 
  onChange, 
  className = '', 
  placeholder = 'Select city',
  disabled = false 
}: { 
  stateId?: string
  value?: string
  onChange: (city: string) => void
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

  // Get available cities for selected state
  const availableCities = useMemo(() => {
    if (!stateId) return []
    
    const selectedState = states.find((state) => state.id === stateId)
    if (!selectedState) return []

    // Flatten cities and deduplicate
    const allCitiesWithCounty = selectedState.counties.flatMap((county) =>
      county.cities.map((city) => ({
        ...city,
        countyId: county.id,
        countyName: county.name,
        uniqueId: `${city.id}-${county.id}`,
      }))
    )

    const uniqueCities = allCitiesWithCounty.reduce((acc, city) => {
      const existingCity = acc.find((c) => c.id === city.id)
      if (!existingCity) {
        acc.push(city)
      } else if (city.population > existingCity.population) {
        const index = acc.indexOf(existingCity)
        acc[index] = city
      }
      return acc
    }, [] as any[])

    return uniqueCities.sort((a, b) => a.name.localeCompare(b.name))
  }, [stateId, states])

  // Filter cities based on search
  const filteredCities = useMemo(() => {
    if (!searchQuery.trim()) return availableCities.slice(0, 100)
    
    const query = searchQuery.toLowerCase().trim()
    return availableCities.filter(city => 
      city.name.toLowerCase().includes(query)
    ).slice(0, 100)
  }, [availableCities, searchQuery])

  const selectedCity = useMemo(() => {
    return value ? availableCities.find(city => city.name.replace(/,.*$/, '').trim() === value) : null
  }, [value, availableCities])

  const handleSelect = (cityName: string) => {
    if (cityName === value) {
      onChange('')
    } else {
      onChange(cityName)
    }
    setOpen(false)
    setSearchQuery('')
  }

  const handleClear = () => {
    onChange('')
    setOpen(false)
    setSearchQuery('')
  }

  if (!stateId) {
    return (
      <div className={cn("relative", className)}>
        <Button
          variant="outline"
          className="w-full justify-between font-normal"
          disabled={true}
        >
          <span className="text-muted-foreground">Select state first</span>
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
            className="w-full justify-between font-normal pr-8"
            disabled={disabled}
          >
            <div className="flex items-center gap-2 min-w-0 flex-1">
              {selectedCity ? (
                <>
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="truncate font-medium text-sm">{selectedCity.name.replace(/,.*$/, '')}</span>
                </>
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
                  const uniqueKey = `city-${city.uniqueId || city.id}-${index}`
                  const cityName = city.name.replace(/,.*$/, '').trim()
                  
                  return (
                    <CommandItem
                      key={uniqueKey}
                      value={city.name}
                      onSelect={() => handleSelect(cityName)}
                      className="flex items-center justify-between gap-2 py-2"
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="truncate font-medium text-sm">{cityName}</span>
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
                          value === cityName ? "opacity-100" : "opacity-0"
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
      {selectedCity && (
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

// ZIP Code Selector Component
export function ZipCodeSelector({ 
  stateId,
  cityName,
  value, 
  onChange, 
  className = '', 
  placeholder = 'Select ZIP code',
  disabled = false 
}: { 
  stateId?: string
  cityName?: string
  value?: string
  onChange: (zipCode: string) => void
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
    if (!stateId || !cityName) return []
    
    const selectedState = states.find((state) => state.id === stateId)
    if (!selectedState) return []

    // Find the city and get its ZIP codes
    for (const county of selectedState.counties) {
      const city = county.cities.find(c => c.name.replace(/,.*$/, '').trim() === cityName)
      if (city && city.zipCodes) {
        return city.zipCodes.sort()
      }
    }
    
    return []
  }, [stateId, cityName, states])

  // Filter ZIP codes based on search
  const filteredZipCodes = useMemo(() => {
    if (!searchQuery.trim()) return availableZipCodes.slice(0, 50)
    
    return availableZipCodes.filter(zip => 
      zip.includes(searchQuery.trim())
    ).slice(0, 50)
  }, [availableZipCodes, searchQuery])

  const handleSelect = (zipCode: string) => {
    if (zipCode === value) {
      onChange('')
    } else {
      onChange(zipCode)
    }
    setOpen(false)
    setSearchQuery('')
  }

  const handleClear = () => {
    onChange('')
    setOpen(false)
    setSearchQuery('')
  }

  if (!stateId || !cityName) {
    return (
      <div className={cn("relative", className)}>
        <Button
          variant="outline"
          className="w-full justify-between font-normal"
          disabled={true}
        >
          <span className="text-muted-foreground">Select city first</span>
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
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Enter ZIP code"
          disabled={disabled}
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        />
        {value && (
          <button
            type="button"
            className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            onClick={handleClear}
            disabled={disabled}
          >
            <X className="h-3 w-3" />
          </button>
        )}
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
            className="w-full justify-between font-normal pr-8"
            disabled={disabled}
          >
            <div className="flex items-center gap-2 min-w-0 flex-1">
              {value ? (
                <>
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="truncate font-medium text-sm">{value}</span>
                </>
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
                        value === zipCode ? "opacity-100" : "opacity-0"
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
      {value && (
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

// Main Separate Location Selector Component
export function SeparateLocationSelector({
  value,
  onChange,
  className = '',
  disabled = false,
  layout = 'vertical',
  required = {}
}: SeparateLocationSelectorProps) {
  
  const handleStateChange = (stateId: string) => {
    onChange({
      state: stateId || undefined,
      city: undefined,
      zipCode: undefined
    })
  }

  const handleCityChange = (cityName: string) => {
    onChange({
      ...value,
      city: cityName || undefined,
      zipCode: undefined
    })
  }

  const handleZipChange = (zipCode: string) => {
    onChange({
      ...value,
      zipCode: zipCode || undefined
    })
  }

  return (
    <div className={cn(layout === 'horizontal' ? 'grid gap-4 md:grid-cols-3' : 'space-y-4', className)}>
      {/* State Selection */}
      <div className="space-y-2">
        <label className="text-sm font-medium">
          State{required.state && <span className="text-red-500 ml-1">*</span>}
        </label>
        <StateSelector
          value={value.state}
          onChange={handleStateChange}
          disabled={disabled}
        />
      </div>

      {/* City Selection - Always show in horizontal layout, conditionally in vertical */}
      {(layout === 'horizontal' || value.state) && (
        <div className="space-y-2">
          <label className="text-sm font-medium">
            City{required.city && <span className="text-red-500 ml-1">*</span>}
          </label>
          <CitySelector
            stateId={value.state}
            value={value.city}
            onChange={handleCityChange}
            disabled={disabled}
          />
        </div>
      )}

      {/* ZIP Code Selection - Always show in horizontal layout, conditionally in vertical */}
      {(layout === 'horizontal' || (value.state && value.city)) && (
        <div className="space-y-2">
          <label className="text-sm font-medium">
            ZIP Code{required.zipCode ? <span className="text-red-500 ml-1">*</span> : ' (Optional)'}
          </label>
          <ZipCodeSelector
            stateId={value.state}
            cityName={value.city}
            value={value.zipCode}
            onChange={handleZipChange}
            disabled={disabled}
          />
        </div>
      )}
    </div>
  )
}

// Export helper functions
export function formatLocationDisplay(location: LocationValue): string {
  if (!location.state) return ''

  const state = locationsData.states.find((state) => state.id === location.state)
  if (!state) return location.state

  let display = ''

  if (location.city) {
    display = location.city + ', '
  }

  display += state.name

  if (location.zipCode) {
    display += ` ${location.zipCode}`
  }

  return display
}

export { type LocationValue, type State, type City, type County }