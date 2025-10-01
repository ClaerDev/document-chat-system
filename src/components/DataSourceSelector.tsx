'use client'

import { useMemo, useState } from 'react'
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
import { Check, ChevronsUpDown, X, Database, Info, Zap, Globe, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { DATA_SOURCE, DataSourceId, getDataSourcesByCategory } from '@/types/global-enums'

interface DataSourceSelectorProps {
  value?: DataSourceId | DataSourceId[]
  onChange: (sources: DataSourceId | DataSourceId[]) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  multiple?: boolean
}

interface DataSourceLabelWithInfoProps {
  htmlFor?: string
  children: React.ReactNode
  selectedValue?: DataSourceId
}

// Data Source Label with Info Icon Component  
export function DataSourceLabelWithInfo({ htmlFor, children, selectedValue }: DataSourceLabelWithInfoProps) {
  // Get data source info for selected value
  const selectedData = useMemo(() => {
    if (!selectedValue) return null
    return DATA_SOURCE[selectedValue] || null
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
          {selectedValue && selectedData ? (
            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <div className="bg-orange-500/10 p-1.5 rounded">
                  <Database className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs font-mono shrink-0">
                      {selectedData.id}
                    </Badge>
                  </div>
                  <h4 className="text-sm font-medium leading-tight mt-1">{selectedData.name}</h4>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    {selectedData.description}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1 pt-1 border-t border-border/40">
                <Badge variant="secondary" className="text-xs capitalize">
                  {selectedData.category}
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  {selectedData.reliability}% reliable
                </Badge>
                {selectedData.isRealTime && (
                  <Badge variant="secondary" className="text-xs text-green-700 dark:text-green-300">
                    <Zap className="w-3 h-3 mr-1" />
                    Real-time
                  </Badge>
                )}
                {selectedData.isExternal && (
                  <Badge variant="secondary" className="text-xs text-blue-700 dark:text-blue-300">
                    <Globe className="w-3 h-3 mr-1" />
                    External
                  </Badge>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold">Data Sources</h4>
              <p className="text-sm text-muted-foreground">
                Select data providers to filter opportunities by their source systems including government databases, commercial services, and internal data.
              </p>
              <p className="text-xs text-muted-foreground font-medium">
                💡 Select a data source first to see detailed information here.
              </p>
            </div>
          )}
        </HoverCardContent>
      </HoverCard>
    </div>
  )
}

export function DataSourceSelector({
  value,
  onChange,
  placeholder = "Select data sources",
  className = "",
  disabled = false,
  multiple = false
}: DataSourceSelectorProps) {
  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // Get all available data sources
  const allDataSources = useMemo(() => {
    return Object.values(DATA_SOURCE)
  }, [])

  // Get selected data sources
  const selectedDataSources = useMemo(() => {
    if (!value) return []
    const values = Array.isArray(value) ? value : [value]
    return values.map(val => DATA_SOURCE[val]).filter(Boolean)
  }, [value])

  const selectedValues = useMemo(() => {
    return Array.isArray(value) ? value : value ? [value] : []
  }, [value])

  // Filter data sources based on search query and exclude internal sources for now
  const filteredDataSources = useMemo(() => {
    // First filter out internal sources (temporarily disabled)
    const enabledSources = allDataSources.filter(source => source.category !== 'internal')
    
    if (!searchQuery.trim()) {
      return enabledSources
    }
    
    const query = searchQuery.trim().toLowerCase()
    
    return enabledSources.filter(source =>
      source.id.toLowerCase().includes(query) ||
      source.name.toLowerCase().includes(query) ||
      source.description.toLowerCase().includes(query) ||
      source.category.toLowerCase().includes(query)
    )
  }, [allDataSources, searchQuery])

  // Group data sources by category
  const groupedDataSources = useMemo(() => {
    const groups: Record<string, typeof allDataSources> = {}
    
    filteredDataSources.forEach(source => {
      const categoryName = source.category === 'government' ? 'Government Sources' :
                          source.category === 'commercial' ? 'Commercial Providers' :
                          'Internal Sources'
      
      if (!groups[categoryName]) {
        groups[categoryName] = []
      }
      groups[categoryName].push(source)
    })

    // Sort groups by category priority and sources within groups by name
    const sortedGroups: Record<string, typeof allDataSources> = {}
    const categoryOrder = ['Government Sources', 'Commercial Providers', 'Internal Sources']
    
    categoryOrder.forEach(category => {
      if (groups[category]) {
        sortedGroups[category] = groups[category].sort((a, b) => a.name.localeCompare(b.name))
      }
    })
    
    return sortedGroups
  }, [filteredDataSources])

  const handleSelect = (sourceId: DataSourceId) => {
    if (multiple) {
      const currentValues = selectedValues
      const isSelected = currentValues.includes(sourceId)
      
      if (isSelected) {
        // Remove from selection
        const newValues = currentValues.filter(val => val !== sourceId)
        onChange(newValues)
      } else {
        // Add to selection
        const newValues = [...currentValues, sourceId]
        onChange(newValues)
      }
      // Don't close dropdown in multi-select mode
      setSearchQuery('')
    } else {
      // Single select mode
      if (sourceId === value) {
        onChange('')
      } else {
        onChange(sourceId)
      }
      setOpen(false)
      setSearchQuery('')
    }
  }

  const handleClear = () => {
    onChange(multiple ? [] : '')
    setOpen(false)
    setSearchQuery('')
  }

  const handleRemoveItem = (sourceId: DataSourceId) => {
    if (multiple) {
      const newValues = selectedValues.filter(val => val !== sourceId)
      onChange(newValues)
    }
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="relative">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className={`w-full justify-between font-normal pr-8 ${selectedDataSources.length > 0 && multiple ? 'min-h-9 h-auto py-2' : 'h-9'}`}
              disabled={disabled}
            >
              <div className={`flex gap-2 min-w-0 flex-1 ${selectedDataSources.length > 0 && multiple ? 'items-start' : 'items-center'}`}>
                {selectedDataSources.length > 0 ? (
                  multiple ? (
                    <div className="flex flex-wrap gap-1 min-w-0 flex-1">
                      {selectedDataSources.map((source) => (
                        <div key={source.id} className="flex items-center gap-1 bg-secondary/50 rounded px-2 py-1">
                          <Badge variant="default" className="text-xs shrink-0">
                            {source.name}
                          </Badge>
                          <div className="flex items-center gap-1">
                            {source.isRealTime && (
                              <Zap className="w-3 h-3 text-green-600 dark:text-green-400" title="Real-time updates" />
                            )}
                            {source.isExternal && (
                              <Globe className="w-3 h-3 text-blue-600 dark:text-blue-400" title="External source" />
                            )}
                          </div>
                          <span
                            onClick={(e) => {
                              e.stopPropagation()
                              handleRemoveItem(source.id as DataSourceId)
                            }}
                            className="ml-1 hover:text-destructive cursor-pointer"
                          >
                            <X className="h-3 w-3" />
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <>
                      <Database className="h-4 w-4 text-muted-foreground" />
                      <Badge variant="default" className="text-xs shrink-0">
                        {selectedDataSources[0].name}
                      </Badge>
                      <div className="flex items-center gap-1">
                        {selectedDataSources[0].isRealTime && (
                          <Zap className="w-3 h-3 text-green-600 dark:text-green-400" title="Real-time updates" />
                        )}
                        {selectedDataSources[0].isExternal && (
                          <Globe className="w-3 h-3 text-blue-600 dark:text-blue-400" title="External source" />
                        )}
                      </div>
                    </>
                  )
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
                placeholder="Search data sources..." 
                value={searchQuery}
                onValueChange={setSearchQuery}
              />
              <CommandList className="max-h-96">
                <CommandEmpty>No data sources found.</CommandEmpty>
                {Object.entries(groupedDataSources).map(([categoryName, sources]) => (
                  <CommandGroup key={categoryName} heading={categoryName}>
                    {sources.map((source) => (
                      <CommandItem
                        key={source.id}
                        value={`${source.id} ${source.name} ${source.description}`}
                        onSelect={() => handleSelect(source.id as DataSourceId)}
                        className="flex items-center justify-between gap-2 py-2"
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <Database className="h-4 w-4 text-muted-foreground shrink-0" />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <Badge variant={selectedValues.includes(source.id as DataSourceId) ? "default" : "secondary"} className="text-xs shrink-0">
                                {source.name}
                              </Badge>
                              <div className="flex items-center gap-1">
                                {source.isRealTime && (
                                  <Badge variant="outline" className="text-xs px-1 py-0 text-green-700 dark:text-green-400 border-green-300 dark:border-green-600">
                                    <Zap className="w-3 h-3" />
                                  </Badge>
                                )}
                                {source.isExternal && (
                                  <Badge variant="outline" className="text-xs px-1 py-0 text-blue-700 dark:text-blue-400 border-blue-300 dark:border-blue-600">
                                    <Globe className="w-3 h-3" />
                                  </Badge>
                                )}
                                <Badge variant="outline" className="text-xs px-1 py-0">
                                  {source.reliability}%
                                </Badge>
                              </div>
                            </div>
                            <div className="text-xs text-muted-foreground truncate mt-0.5">
                              {source.description}
                            </div>
                          </div>
                        </div>
                        <Check
                          className={cn(
                            "h-4 w-4 shrink-0",
                            selectedValues.includes(source.id as DataSourceId) ? "opacity-100" : "opacity-0"
                          )}
                        />
                      </CommandItem>
                    ))}
                  </CommandGroup>
                ))}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        
        {/* Clear button positioned absolutely */}
        {selectedDataSources.length > 0 && (
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
    </div>
  )
}