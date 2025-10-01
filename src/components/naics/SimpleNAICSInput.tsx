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
import { Check, ChevronsUpDown, X, Hash, Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import { 
  searchNAICSCodes, 
  findNAICSByCode, 
  validateNAICSCode 
} from '@/lib/naics'
import type { NAICSSearchResult } from '@/types/naics'

interface SimpleNAICSInputProps {
  value?: string | string[]
  onChange: (code: string | string[]) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  multiple?: boolean
}

interface NAICSLabelWithInfoProps {
  htmlFor?: string
  children: React.ReactNode
}

// Helper function - defined before component to avoid hoisting issues
const getSectorName = (sectorCode: string) => {
  const sectorNames: Record<string, string> = {
    '11': 'Agriculture, Forestry, Fishing and Hunting',
    '21': 'Mining, Quarrying, and Oil and Gas Extraction',
    '22': 'Utilities',
    '23': 'Construction',
    '31': 'Manufacturing',
    '32': 'Manufacturing',
    '33': 'Manufacturing',
    '42': 'Wholesale Trade',
    '44': 'Retail Trade',
    '45': 'Retail Trade',
    '48': 'Transportation and Warehousing',
    '49': 'Transportation and Warehousing',
    '51': 'Information',
    '52': 'Finance and Insurance',
    '53': 'Real Estate and Rental and Leasing',
    '54': 'Professional, Scientific, and Technical Services',
    '55': 'Management of Companies and Enterprises',
    '56': 'Administrative and Support and Waste Management',
    '61': 'Educational Services',
    '62': 'Health Care and Social Assistance',
    '71': 'Arts, Entertainment, and Recreation',
    '72': 'Accommodation and Food Services',
    '81': 'Other Services (except Public Administration)',
    '92': 'Public Administration'
  }
  
  return sectorNames[sectorCode] || `Sector ${sectorCode}`
}

// NAICS Label with Info Icon Component  
export function NAICSLabelWithInfo({ htmlFor, children, selectedValue }: NAICSLabelWithInfoProps & { selectedValue?: string }) {
  // Get NAICS data for selected value
  const selectedData = useMemo(() => {
    if (!selectedValue) return null
    
    return findNAICSByCode(selectedValue) || null
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
                <div className="bg-green-500/10 p-1.5 rounded">
                  <Hash className="h-4 w-4 text-green-600 dark:text-green-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs font-mono shrink-0">
                      {selectedData.code}
                    </Badge>
                  </div>
                  <h4 className="text-sm font-medium leading-tight mt-1">{selectedData.title}</h4>
                  {selectedData.description && (
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      {selectedData.description.split('.')[0]}.
                    </p>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-1 pt-1 border-t border-border/40">
                <Badge variant="secondary" className="text-xs">
                  {selectedData.level}
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  Sector {selectedData.code.substring(0, 2)} - {getSectorName(selectedData.code.substring(0, 2))}
                </Badge>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold">NAICS Code</h4>
              <p className="text-sm text-muted-foreground">
                North American Industry Classification System codes categorize business establishments by their primary type of economic activity.
              </p>
              <p className="text-xs text-muted-foreground font-medium">
                💡 Select a NAICS code first to see detailed information here.
              </p>
            </div>
          )}
        </HoverCardContent>
      </HoverCard>
    </div>
  )
}

export function SimpleNAICSInput({
  value,
  onChange,
  placeholder = "Select NAICS code",
  className = "",
  disabled = false,
  multiple = false
}: SimpleNAICSInputProps) {
  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // Get selected NAICS codes
  const selectedNAICSCodes = useMemo(() => {
    if (!value) return []
    const values = Array.isArray(value) ? value : [value]
    return values.map(val => findNAICSByCode(val)).filter(Boolean) as NAICSSearchResult[]
  }, [value])

  const selectedValues = useMemo(() => {
    return Array.isArray(value) ? value : value ? [value] : []
  }, [value])

  // Get all available NAICS codes - only return 6-digit codes
  const allNAICS = useMemo(() => {
    // Get ALL NAICS codes with an empty search - this returns everything
    const allResults = searchNAICSCodes('', {
      includeDescriptions: true,
      levels: ['nationalIndustry'] // Only get 6-digit codes
    })
    
    // Filter to ensure only 6-digit codes (double-check)
    const sixDigitCodes = allResults.filter(result => 
      result.code && result.code.length === 6
    )
    
    console.log(`NAICS codes loaded: ${sixDigitCodes.length} six-digit codes (from ${allResults.length} nationalIndustry level)`)
    
    // Check if 922190 is in the results
    const has922190 = sixDigitCodes.some(code => code.code === '922190')
    if (has922190) {
      console.log('✅ Code 922190 is available in the dataset')
    } else {
      console.warn('⚠️ Code 922190 is NOT in the loaded dataset')
    }
    
    return sixDigitCodes.sort((a, b) => a.code.localeCompare(b.code))
  }, [])

  // Filter NAICS codes based on search query
  const filteredNAICS = useMemo(() => {
    if (!searchQuery.trim()) {
      console.log('No search query, returning all NAICS:', allNAICS.length)
      return allNAICS
    }
    
    const query = searchQuery.trim()
    const queryLower = query.toLowerCase()
    
    const filtered = allNAICS.filter(naics =>
      naics.code.includes(query) ||
      naics.title.toLowerCase().includes(queryLower) ||
      (naics.description || '').toLowerCase().includes(queryLower)
    )
    
    console.log(`Search "${query}" found ${filtered.length} results from ${allNAICS.length} total`)
    return filtered
  }, [allNAICS, searchQuery])

  // Group NAICS codes by sector for better organization - SORTED BY CODE
  const groupedNAICS = useMemo(() => {
    const groups: Record<string, NAICSSearchResult[]> = {}
    
    filteredNAICS.forEach(naics => {
      // Extract sector (first 2 digits) for grouping
      const sectorCode = naics.code.substring(0, 2)
      const sectorName = getSectorName(sectorCode)
      
      if (!groups[sectorName]) {
        groups[sectorName] = []
      }
      groups[sectorName].push(naics)
    })

    // Sort sectors by their sector code (numeric), not alphabetically by name
    const result = Object.keys(groups)
      .sort((a, b) => {
        // Get the sector codes from the first NAICS code in each group
        const aCode = groups[a][0]?.code.substring(0, 2) || '99'
        const bCode = groups[b][0]?.code.substring(0, 2) || '99'
        return aCode.localeCompare(bCode)
      })
      .reduce((acc, sectorName) => {
        // Sort NAICS codes within each sector by code
        acc[sectorName] = groups[sectorName].sort((a, b) => a.code.localeCompare(b.code))
        return acc
      }, {} as Record<string, NAICSSearchResult[]>)
    
    console.log('Grouped NAICS by sector:', Object.keys(result).length, 'sectors')
    return result
  }, [filteredNAICS])


  const handleSelect = (naicsCode: string) => {
    if (multiple) {
      const currentValues = selectedValues
      const isSelected = currentValues.includes(naicsCode)
      
      if (isSelected) {
        // Remove from selection
        const newValues = currentValues.filter(val => val !== naicsCode)
        onChange(newValues)
      } else {
        // Add to selection
        const newValues = [...currentValues, naicsCode]
        onChange(newValues)
      }
      // Don't close dropdown in multi-select mode
      setSearchQuery('')
    } else {
      // Single select mode
      if (naicsCode === value) {
        onChange('')
      } else {
        onChange(naicsCode)
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

  const handleRemoveItem = (naicsCode: string) => {
    if (multiple) {
      const newValues = selectedValues.filter(val => val !== naicsCode)
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
              className={`w-full justify-between font-normal pr-8 ${selectedNAICSCodes.length > 0 && multiple ? 'min-h-9 h-auto py-2' : 'h-9'}`}
              disabled={disabled}
            >
              <div className={`flex gap-2 min-w-0 flex-1 ${selectedNAICSCodes.length > 0 && multiple ? 'items-start' : 'items-center'}`}>
                {selectedNAICSCodes.length > 0 ? (
                  multiple ? (
                    <div className="flex flex-wrap gap-1 min-w-0 flex-1">
                      {selectedNAICSCodes.map((naics) => (
                        <div key={naics.code} className="flex items-center gap-1 bg-secondary/50 rounded px-2 py-1">
                          <Badge variant="default" className="text-xs shrink-0 font-mono">
                            {naics.code}
                          </Badge>
                          <span className="text-xs truncate max-w-24">{naics.title}</span>
                          <span
                            onClick={(e) => {
                              e.stopPropagation()
                              handleRemoveItem(naics.code)
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
                      <Hash className="h-4 w-4 text-muted-foreground" />
                      <Badge variant="default" className="text-xs shrink-0 font-mono">
                        {selectedNAICSCodes[0].code}
                      </Badge>
                      <span className="truncate">{selectedNAICSCodes[0].title}</span>
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
                placeholder="Search NAICS codes..." 
                value={searchQuery}
                onValueChange={setSearchQuery}
              />
              <CommandList className="max-h-96">
                <CommandEmpty>No NAICS codes found.</CommandEmpty>
                {Object.entries(groupedNAICS).map(([sectorName, naicsCodes]) => (
                  <CommandGroup key={sectorName} heading={sectorName}>
                    {naicsCodes.map((naics) => (
                      <CommandItem
                        key={naics.code}
                        value={`${naics.code} ${naics.title} ${naics.description || ''}`}
                        onSelect={() => handleSelect(naics.code)}
                        className="flex items-center justify-between gap-2 py-2"
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <Hash className="h-4 w-4 text-muted-foreground shrink-0" />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <Badge variant={selectedValues.includes(naics.code) ? "default" : "secondary"} className="text-xs shrink-0 font-mono">
                                {naics.code}
                              </Badge>
                              <span className="truncate font-medium">{naics.title}</span>
                            </div>
                            {naics.description && (
                              <div className="text-xs text-muted-foreground truncate mt-0.5">
                                {naics.description}
                              </div>
                            )}
                          </div>
                        </div>
                        <Check
                          className={cn(
                            "h-4 w-4 shrink-0",
                            selectedValues.includes(naics.code) ? "opacity-100" : "opacity-0"
                          )}
                        />
                      </CommandItem>
                    ))}
                  </CommandGroup>
                ))}
                {filteredNAICS.length >= 100 && (
                  <div className="p-2 text-xs text-muted-foreground text-center border-t">
                    Showing first 100+ results. Refine search for more specific results.
                  </div>
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        
        {/* Clear button positioned absolutely */}
        {selectedNAICSCodes.length > 0 && (
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