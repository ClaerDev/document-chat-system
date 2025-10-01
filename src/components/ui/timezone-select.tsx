'use client'

import React, { useState, useMemo } from 'react'
import { Check, ChevronsUpDown, Clock, Globe, MapPin } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Badge } from '@/components/ui/badge'
import { 
  getAllTimezones, 
  getTimezonesByRegion, 
  getUSTimezones, 
  getCommonGovTimezones,
  findTimezone,
  getCurrentOffset,
  type Timezone 
} from '@/lib/utils/timezones'

interface TimezoneSelectProps {
  value?: string
  onChange: (timezone: string) => void
  placeholder?: string
  disabled?: boolean
  error?: boolean
  className?: string
  showCurrentTime?: boolean
  filterType?: 'all' | 'us' | 'government' | 'common'
  size?: 'sm' | 'md' | 'lg'
}

export function TimezoneSelect({
  value,
  onChange,
  placeholder = 'Select timezone...',
  disabled = false,
  error = false,
  className,
  showCurrentTime = false,
  filterType = 'all',
  size = 'md'
}: TimezoneSelectProps) {
  const [open, setOpen] = useState(false)
  const [searchValue, setSearchValue] = useState('')

  // Get timezones based on filter type
  const availableTimezones = useMemo(() => {
    switch (filterType) {
      case 'us':
        return getUSTimezones()
      case 'government':
        return getCommonGovTimezones()
      case 'common':
        return getAllTimezones().slice(0, 10) // First 10 most common
      default:
        return getAllTimezones()
    }
  }, [filterType])

  // Group timezones by region for better organization
  const groupedTimezones = useMemo(() => {
    if (filterType === 'us' || filterType === 'government' || filterType === 'common') {
      return [{
        region: filterType === 'us' ? 'United States' : 
                filterType === 'government' ? 'Common Government' : 
                'Most Common',
        timezones: availableTimezones
      }]
    }
    return getTimezonesByRegion()
  }, [filterType, availableTimezones])

  // Filter timezones based on search
  const filteredGroups = useMemo(() => {
    if (!searchValue) return groupedTimezones
    
    const searchTerm = searchValue.toLowerCase()
    return groupedTimezones.map(group => ({
      ...group,
      timezones: group.timezones.filter(tz =>
        tz.label.toLowerCase().includes(searchTerm) ||
        tz.abbreviation.toLowerCase().includes(searchTerm) ||
        tz.cities.some(city => city.toLowerCase().includes(searchTerm)) ||
        tz.value.toLowerCase().includes(searchTerm)
      )
    })).filter(group => group.timezones.length > 0)
  }, [groupedTimezones, searchValue])

  const selectedTimezone = findTimezone(value || '')

  const handleSelect = (timezoneValue: string) => {
    onChange(timezoneValue)
    setOpen(false)
  }

  // Get current time for selected timezone
  const getCurrentTime = (timezone: string) => {
    try {
      const now = new Date()
      return new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      }).format(now)
    } catch {
      return null
    }
  }

  const sizeClasses = {
    sm: 'h-8 text-sm',
    md: 'h-9 text-sm',
    lg: 'h-10 text-base'
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            'justify-between font-normal w-full',
            sizeClasses[size],
            !value && 'text-muted-foreground',
            error && 'border-red-500 focus:border-red-500',
            className
          )}
          disabled={disabled}
        >
          <div className="flex items-center gap-2 flex-1 min-w-0 overflow-hidden">
            <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            {selectedTimezone ? (
              <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
                <span className="truncate text-left flex-1">
                  {selectedTimezone.label}
                </span>
                <div className="hidden sm:flex items-center gap-1 flex-shrink-0">
                  <Badge variant="outline" className="text-xs px-1.5 py-0.5">
                    UTC{getCurrentOffset(selectedTimezone.value)}
                  </Badge>
                  {showCurrentTime && (
                    <span className="text-xs text-muted-foreground tabular-nums whitespace-nowrap">
                      {getCurrentTime(selectedTimezone.value)}
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <span className="truncate text-left flex-1">{placeholder}</span>
            )}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      
      <PopoverContent className="w-[min(400px,90vw)] p-0" align="start" sideOffset={4}>
        <Command shouldFilter={false} className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground">
          <CommandInput 
            placeholder="Search timezones..." 
            value={searchValue}
            onValueChange={setSearchValue}
            className="border-none focus:ring-0"
          />
          <CommandEmpty>No timezone found.</CommandEmpty>
          
          <div className="max-h-[min(300px,60vh)] overflow-y-auto overflow-x-hidden">
            {filteredGroups.length > 0 ? filteredGroups.map((group) => (
              <CommandGroup 
                key={group.region} 
                heading={group.region}
                className="[&_[cmdk-group-heading]]:flex [&_[cmdk-group-heading]]:items-center [&_[cmdk-group-heading]]:gap-2"
              >
                {group.timezones.map((timezone) => {
                  const currentTime = showCurrentTime ? getCurrentTime(timezone.value) : null
                  
                  return (
                    <CommandItem
                      key={timezone.value}
                      value={timezone.value}
                      onSelect={() => handleSelect(timezone.value)}
                      className="flex items-start gap-2 p-2 cursor-pointer aria-selected:bg-accent"
                    >
                      <Check
                        className={cn(
                          'h-4 w-4 flex-shrink-0 mt-0.5',
                          value === timezone.value ? 'opacity-100' : 'opacity-0'
                        )}
                      />
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="font-medium text-sm leading-none truncate">
                            {timezone.label}
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <Badge variant="outline" className="text-xs px-1.5 py-0.5 hidden sm:inline-flex">
                              {timezone.abbreviation}
                            </Badge>
                            {currentTime && (
                              <span className="text-xs text-muted-foreground tabular-nums whitespace-nowrap hidden md:inline">
                                {currentTime}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <span className="whitespace-nowrap">UTC{getCurrentOffset(timezone.value)}</span>
                          <span className="hidden sm:inline">•</span>
                          <span className="truncate hidden sm:inline">
                            {timezone.cities.slice(0, 2).join(', ')}
                            {timezone.cities.length > 2 && ` +${timezone.cities.length - 2}`}
                          </span>
                        </div>
                      </div>
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            )) : null}
          </div>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

// Lightweight timezone display component
export function TimezoneDisplay({ 
  timezone, 
  showTime = false, 
  className 
}: { 
  timezone: string
  showTime?: boolean
  className?: string 
}) {
  const tz = findTimezone(timezone)
  if (!tz) return <span className={className}>Unknown timezone</span>

  const currentTime = showTime ? (() => {
    try {
      const now = new Date()
      return new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      }).format(now)
    } catch {
      return null
    }
  })() : null

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <MapPin className="h-3 w-3 text-muted-foreground" />
      <span className="text-sm">
        {tz.label} (UTC{getCurrentOffset(timezone)})
      </span>
      {currentTime && (
        <Badge variant="outline" className="text-xs tabular-nums">
          {currentTime}
        </Badge>
      )}
    </div>
  )
}