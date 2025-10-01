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

interface EnhancedLocationSelectorProps {
  value: LocationValue
  onChange: (location: LocationValue) => void
  className?: string
  placeholder?: string
  disabled?: boolean
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

export function EnhancedLocationSelector({
  value,
  onChange,
  className = '',
  placeholder = "Select location",
  disabled = false
}: EnhancedLocationSelectorProps) {
  const [currentStep, setCurrentStep] = useState<'state' | 'city' | 'zip'>('state')
  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // Sort states alphabetically
  const states: State[] = useMemo(
    () => [...locationsData.states].sort((a, b) => a.name.localeCompare(b.name)),
    []
  )

  // Get available cities for selected state
  const availableCities = useMemo(() => {
    if (!value.state) return []
    
    const selectedState = states.find((state) => state.id === value.state)
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
  }, [value.state, states])

  // Get available zip codes for selected city
  const availableZipCodes = useMemo(() => {
    if (!value.city || !availableCities.length) return []
    
    const selectedCity = availableCities.find(
      (city) => city.name.replace(/,.*$/, '').trim() === value.city
    )
    
    return selectedCity?.zipCodes?.sort() || []
  }, [value.city, availableCities])

  // Determine what to show based on current selection and step
  const displayData = useMemo(() => {
    switch (currentStep) {
      case 'state':
        return states
          .filter(state => 
            !searchQuery.trim() || 
            state.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            state.id.toLowerCase().includes(searchQuery.toLowerCase())
          )
          .slice(0, 50)
      
      case 'city':
        return availableCities
          .filter(city => 
            !searchQuery.trim() || 
            city.name.toLowerCase().includes(searchQuery.toLowerCase())
          )
          .slice(0, 100)
      
      case 'zip':
        return availableZipCodes
          .filter(zip => 
            !searchQuery.trim() || 
            zip.includes(searchQuery)
          )
          .slice(0, 50)
          .map(zip => ({ id: zip, name: zip }))
      
      default:
        return []
    }
  }, [currentStep, searchQuery, states, availableCities, availableZipCodes])

  // Auto-advance to next step when selection is made
  useEffect(() => {
    if (currentStep === 'state' && value.state && !value.city) {
      setCurrentStep('city')
    } else if (currentStep === 'city' && value.city && !value.zipCode && availableZipCodes.length > 0) {
      setCurrentStep('zip')
    }
  }, [currentStep, value, availableZipCodes.length])

  const handleSelect = (selectedValue: string) => {
    switch (currentStep) {
      case 'state':
        onChange({
          state: selectedValue,
          city: undefined,
          zipCode: undefined
        })
        setCurrentStep('city')
        break
      
      case 'city':
        onChange({
          ...value,
          city: selectedValue,
          zipCode: undefined
        })
        if (availableZipCodes.length > 0) {
          setCurrentStep('zip')
        } else {
          setOpen(false)
        }
        break
      
      case 'zip':
        onChange({
          ...value,
          zipCode: selectedValue
        })
        setOpen(false)
        break
    }
    setSearchQuery('')
  }

  const handleClear = () => {
    onChange({
      state: undefined,
      city: undefined,
      zipCode: undefined
    })
    setCurrentStep('state')
    setOpen(false)
    setSearchQuery('')
  }

  const handleStepBack = () => {
    switch (currentStep) {
      case 'city':
        setCurrentStep('state')
        break
      case 'zip':
        setCurrentStep('city')
        break
    }
    setSearchQuery('')
  }

  const getDisplayValue = () => {
    if (!value.state) return null
    
    const state = states.find(s => s.id === value.state)
    let display = ''
    
    if (value.city) {
      display += value.city + ', '
    }
    display += state?.name || value.state
    if (value.zipCode) {
      display += ` ${value.zipCode}`
    }
    
    return display
  }

  const getStepTitle = () => {
    switch (currentStep) {
      case 'state':
        return 'Select State'
      case 'city':
        return `Select City in ${states.find(s => s.id === value.state)?.name || value.state}`
      case 'zip':
        return `Select ZIP Code in ${value.city}`
      default:
        return 'Select Location'
    }
  }

  const displayValue = getDisplayValue()

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
              {displayValue ? (
                <>
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="truncate">{displayValue}</span>
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
            <div className="flex items-center justify-between p-2 border-b">
              <span className="text-sm font-medium">{getStepTitle()}</span>
              {currentStep !== 'state' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleStepBack}
                  className="h-6 px-2 text-xs"
                >
                  Back
                </Button>
              )}
            </div>
            <CommandInput 
              placeholder={`Search ${currentStep}s...`}
              value={searchQuery}
              onValueChange={setSearchQuery}
            />
            <CommandList className="max-h-96">
              <CommandEmpty>No {currentStep}s found.</CommandEmpty>
              <CommandGroup>
                {displayData.map((item: any) => (
                  <CommandItem
                    key={item.id}
                    value={currentStep === 'state' ? `${item.name} ${item.id}` : item.name}
                    onSelect={() => handleSelect(currentStep === 'state' ? item.id : item.name || item.id)}
                    className="flex items-center justify-between gap-2 py-2"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          {currentStep === 'state' && (
                            <Badge variant="secondary" className="text-xs shrink-0 font-mono">
                              {item.id}
                            </Badge>
                          )}
                          <span className="truncate font-medium text-sm">{item.name}</span>
                        </div>
                        {currentStep === 'city' && item.population > 0 && (
                          <div className="text-xs text-muted-foreground truncate">
                            Population: {item.population.toLocaleString()}
                            {item.countyName && ` • ${item.countyName.replace(' County', '')}`}
                          </div>
                        )}
                        {currentStep === 'state' && (
                          <div className="text-xs text-muted-foreground truncate">
                            {item.region} • {item.division}
                          </div>
                        )}
                      </div>
                    </div>
                    <Check
                      className={cn(
                        "h-4 w-4 shrink-0",
                        (currentStep === 'state' && value.state === item.id) ||
                        (currentStep === 'city' && value.city === item.name) ||
                        (currentStep === 'zip' && value.zipCode === item.id)
                          ? "opacity-100" : "opacity-0"
                      )}
                    />
                  </CommandItem>
                ))}
              </CommandGroup>
              {displayData.length >= 50 && (
                <div className="p-2 text-xs text-muted-foreground text-center border-t">
                  Showing first 50+ results. Refine search for more specific results.
                </div>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      
      {/* Clear button positioned absolutely */}
      {displayValue && (
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

// Export helper functions for working with location data
export function getStateByCode(stateCode: string): State | undefined {
  return locationsData.states.find((state) => state.id === stateCode)
}

export function formatLocationDisplay(location: LocationValue): string {
  if (!location.state) return ''

  const state = getStateByCode(location.state)
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