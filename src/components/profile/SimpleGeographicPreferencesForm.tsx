'use client'

import React from 'react'
import { MapPin, Home, Plane } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { MultiSelectLocationSelector, MultiSelectLocationValue } from '@/components/location'
import { GeographicPreferences, TravelWillingness, getTravelWillingnessDisplay } from '@/types/profile'
import locationsData from '@/data/government/locations/locations.json'

interface SimpleGeographicPreferencesFormProps {
  value: GeographicPreferences
  onChange: (preferences: GeographicPreferences) => void
  className?: string
}

// Convert from complex GeographicPreferences to simple MultiSelectLocationValue
function toSimpleLocationValue(preferences: GeographicPreferences): MultiSelectLocationValue {
  return {
    states: preferences.preferences.state.map(pref => pref.data?.id || pref.name || '').filter(Boolean),
    cities: preferences.preferences.city.map(pref => pref.name || '').filter(Boolean),
    zipCodes: preferences.preferences.zip.map(pref => pref.data?.zipCode || pref.name || '').filter(Boolean)
  }
}

// Convert from simple MultiSelectLocationValue to complex GeographicPreferences
function fromSimpleLocationValue(
  locationValue: MultiSelectLocationValue, 
  currentPreferences: GeographicPreferences
): GeographicPreferences {
  // Get location data for proper transformation
  const states = locationsData.states

  // Create new preferences based on the selected values with full data structure
  const newPreferences = {
    country: currentPreferences.preferences.country, // Preserve existing country preferences
    state: (locationValue.states || []).map(stateId => {
      const stateData = states.find(s => s.id === stateId)
      const uniqueId = `state-${stateId}-${stateData?.name.replace(/\s+/g, '-') || stateId}`
      
      return {
        id: uniqueId,
        type: 'state' as const,
        name: stateData?.name || stateId,
        fullPath: stateData?.name || stateId,
        data: stateData ? {
          id: stateData.id,
          name: stateData.name,
          fipsCode: stateData.fipsCode,
          region: stateData.region,
          division: stateData.division,
          capital: stateData.capital,
          population: stateData.population,
          relevance: 100 // Set high relevance for manually selected items
        } : {
          id: stateId,
          name: stateId,
          relevance: 100
        }
      }
    }),
    county: currentPreferences.preferences.county, // Preserve existing county preferences
    city: (locationValue.cities || []).map(cityName => {
      // Try to find the city in the location data to get full information
      let cityData: any = null
      let stateName = ''
      
      for (const state of states) {
        for (const county of state.counties) {
          const city = county.cities.find(c => c.name.replace(/,.*$/, '').trim() === cityName)
          if (city) {
            cityData = city
            stateName = state.name
            break
          }
        }
        if (cityData) break
      }
      
      const uniqueId = `city-${cityName.replace(/\s+/g, '-')}`
      
      return {
        id: uniqueId,
        type: 'city' as const,
        name: cityName,
        fullPath: stateName ? `${cityName}, ${stateName}` : cityName,
        data: cityData ? {
          id: cityData.id,
          name: cityData.name,
          type: cityData.type,
          population: cityData.population,
          incorporated: cityData.incorporated,
          coordinates: cityData.coordinates,
          zipCodes: cityData.zipCodes,
          relevance: 100
        } : {
          name: cityName,
          relevance: 100
        }
      }
    }),
    zip: (locationValue.zipCodes || []).map(zipCode => {
      // Try to find the ZIP code in the location data to get city context
      let cityContext: any = null
      
      for (const state of states) {
        for (const county of state.counties) {
          for (const city of county.cities) {
            if (city.zipCodes && city.zipCodes.includes(zipCode)) {
              cityContext = {
                id: city.id,
                name: city.name,
                type: city.type,
                population: city.population,
                incorporated: city.incorporated
              }
              break
            }
          }
          if (cityContext) break
        }
        if (cityContext) break
      }
      
      const uniqueId = `zip-${zipCode}`
      
      return {
        id: uniqueId,
        type: 'zip' as const,
        name: zipCode,
        fullPath: cityContext ? `${zipCode} (${cityContext.name})` : zipCode,
        data: {
          zipCode,
          city: cityContext,
          relevance: 100
        }
      }
    })
  }

  return {
    ...currentPreferences,
    preferences: newPreferences
  }
}

export function SimpleGeographicPreferencesForm({ 
  value, 
  onChange, 
  className = '' 
}: SimpleGeographicPreferencesFormProps) {
  
  // Convert current value to simple format for the MultiSelectLocationSelector
  const currentLocationValue = toSimpleLocationValue(value)

  // Handle location changes
  const handleLocationChange = (locationValue: MultiSelectLocationValue) => {
    const newPreferences = fromSimpleLocationValue(locationValue, value)
    onChange(newPreferences)
  }

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
        {/* Location Selection */}
        <div className="space-y-4">
          <Label className="text-sm font-medium">
            Preferred Work Locations
          </Label>
          <p className="text-sm text-muted-foreground">
            Select states, cities, and ZIP codes where you&apos;d like to work on government contracts. 
            You can select multiple options at each level.
          </p>
          
          <MultiSelectLocationSelector
            value={currentLocationValue}
            onChange={handleLocationChange}
            layout="vertical"
            placeholder={{
              states: "Select states you want to work in",
              cities: "Select specific cities (optional)",
              zipCodes: "Select specific ZIP codes (optional)"
            }}
          />
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

        {/* Summary */}
        {(currentLocationValue.states?.length || 0) > 0 && (
          <div className="space-y-3 pt-4 border-t border-border">
            <Label className="text-sm font-medium">Selected Preferences Summary</Label>
            <div className="bg-muted/30 rounded-lg p-4 space-y-2">
              {currentLocationValue.states && currentLocationValue.states.length > 0 && (
                <div className="text-sm">
                  <span className="font-medium">States:</span> {currentLocationValue.states.join(', ')}
                </div>
              )}
              {currentLocationValue.cities && currentLocationValue.cities.length > 0 && (
                <div className="text-sm">
                  <span className="font-medium">Cities:</span> {currentLocationValue.cities.join(', ')}
                </div>
              )}
              {currentLocationValue.zipCodes && currentLocationValue.zipCodes.length > 0 && (
                <div className="text-sm">
                  <span className="font-medium">ZIP Codes:</span> {currentLocationValue.zipCodes.join(', ')}
                </div>
              )}
              <div className="text-sm">
                <span className="font-medium">Remote Work:</span> {value.workFromHome ? 'Yes' : 'No'}
              </div>
              <div className="text-sm">
                <span className="font-medium">Travel:</span> {getTravelWillingnessDisplay(value.travelWillingness).label}
                {value.travelWillingness !== TravelWillingness.NONE && value.maxTravelPercentage && 
                  ` (up to ${value.maxTravelPercentage}%)`
                }
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}