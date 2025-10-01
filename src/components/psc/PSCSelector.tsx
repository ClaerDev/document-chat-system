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
import { Check, ChevronsUpDown, X, Info, Hash } from 'lucide-react'
import { cn } from '@/lib/utils'
import { 
  searchPSCCodes, 
  findPSCByCode, 
  getSearchablePSCCodes 
} from '@/lib/psc'
import type { PSCCode, PSCSearchResult } from '@/lib/psc-codes-data'

interface PSCOption extends PSCCode {
  // Extend PSCCode interface if needed
}

interface PSCSelectorProps {
  value?: string | string[]
  onChange: (pscCode: string | string[]) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  multiple?: boolean
}

interface PSCLabelWithInfoProps {
  htmlFor?: string
  children: React.ReactNode
}

// PSC codes are now loaded from the optimized data loader
// No need for local extraction function

// PSC Label with Info Icon Component  
export function PSCLabelWithInfo({ htmlFor, children, selectedValue }: PSCLabelWithInfoProps & { selectedValue?: string }) {
  // Get PSC data for selected value
  const selectedData = useMemo(() => {
    if (!selectedValue) return null
    
    return findPSCByCode(selectedValue) || null
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
                <div className="bg-blue-500/10 p-1.5 rounded">
                  <Hash className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs font-mono shrink-0">
                      {selectedData.pscCode}
                    </Badge>
                  </div>
                  <h4 className="text-sm font-medium leading-tight mt-1">{selectedData.name}</h4>
                  {selectedData.description && (
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      {selectedData.description.split('.')[0]}.
                    </p>
                  )}
                </div>
              </div>
              {(selectedData.category || selectedData.subcategory || selectedData.functionalArea) && (
                <div className="flex flex-wrap gap-1 pt-1 border-t border-border/40">
                  {selectedData.category && (
                    <Badge variant="secondary" className="text-xs">
                      {selectedData.category}
                    </Badge>
                  )}
                  {selectedData.subcategory && (
                    <Badge variant="secondary" className="text-xs">
                      {selectedData.subcategory}
                    </Badge>
                  )}
                  {selectedData.functionalArea && (
                    <Badge variant="secondary" className="text-xs">
                      {selectedData.functionalArea}
                    </Badge>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold">Product Service Code (PSC)</h4>
              <p className="text-sm text-muted-foreground">
                PSC codes categorize products and services procured by the federal government. 
                They help identify the type of work or supplies involved in a contract.
              </p>
              <p className="text-xs text-muted-foreground font-medium">
                💡 Select a PSC code first to see detailed information here.
              </p>
            </div>
          )}
        </HoverCardContent>
      </HoverCard>
    </div>
  )
}

export function PSCSelector({ 
  value, 
  onChange, 
  placeholder = "Select PSC code",
  className = "",
  disabled = false,
  multiple = false
}: PSCSelectorProps) {
  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // Get all available PSC codes using the optimized loader
  const allPSCCodes = useMemo(() => {
    // Get ALL PSC codes with an empty search - this returns everything
    const allResults = searchPSCCodes('', {
      includeDescriptions: true
    })
    
    console.log(`PSC codes loaded: ${allResults.length} codes`)
    
    return allResults.sort((a, b) => a.pscCode.localeCompare(b.pscCode))
  }, [])

  // Get the selected PSC options
  const selectedPSCs = useMemo(() => {
    if (!value) return []
    const values = Array.isArray(value) ? value : [value]
    return values.map(val => findPSCByCode(val)).filter(Boolean) as PSCCode[]
  }, [value])

  const selectedValues = useMemo(() => {
    return Array.isArray(value) ? value : value ? [value] : []
  }, [value])

  // Filter PSC codes based on search query
  const filteredPSCCodes = useMemo(() => {
    if (!searchQuery.trim()) {
      console.log('No search query, returning all PSC codes:', allPSCCodes.length)
      return allPSCCodes
    }
    
    const query = searchQuery.trim()
    const queryLower = query.toLowerCase()
    
    const filtered = allPSCCodes.filter(psc =>
      psc.pscCode.toLowerCase().includes(queryLower) ||
      psc.name.toLowerCase().includes(queryLower) ||
      psc.category.toLowerCase().includes(queryLower) ||
      (psc.description || '').toLowerCase().includes(queryLower) ||
      (psc.searchableText || '').toLowerCase().includes(queryLower) ||
      psc.keywords.some(keyword => keyword.toLowerCase().includes(queryLower))
    )
    
    console.log(`Search "${query}" found ${filtered.length} results from ${allPSCCodes.length} total`)
    return filtered
  }, [allPSCCodes, searchQuery])

  // Sort PSC codes by code alphabetically - NO LIMITS!
  const sortedPSCCodes = useMemo(() => {
    return filteredPSCCodes.sort((a, b) => a.pscCode.localeCompare(b.pscCode))
  }, [filteredPSCCodes])

  const handleSelect = (pscCode: string) => {
    if (multiple) {
      const currentValues = selectedValues
      const isSelected = currentValues.includes(pscCode)
      
      if (isSelected) {
        // Remove from selection
        const newValues = currentValues.filter(val => val !== pscCode)
        onChange(newValues)
      } else {
        // Add to selection
        const newValues = [...currentValues, pscCode]
        onChange(newValues)
      }
      // Don't close dropdown in multi-select mode
      setSearchQuery('')
    } else {
      // Single select mode
      if (pscCode === value) {
        onChange('')
      } else {
        onChange(pscCode)
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

  const handleRemoveItem = (pscCode: string) => {
    if (multiple) {
      const newValues = selectedValues.filter(val => val !== pscCode)
      onChange(newValues)
    }
  }

  return (
    <div className={cn("relative", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={`w-full justify-between font-normal pr-8 ${selectedPSCs.length > 0 && multiple ? 'min-h-9 h-auto py-2' : 'h-9'}`}
            disabled={disabled}
          >
            <div className={`flex gap-2 min-w-0 flex-1 ${selectedPSCs.length > 0 && multiple ? 'items-start' : 'items-center'}`}>
              {selectedPSCs.length > 0 ? (
                multiple ? (
                  <div className="flex flex-wrap gap-1 min-w-0 flex-1">
                    {selectedPSCs.map((psc) => (
                      <div key={psc.pscCode} className="flex items-center gap-1 bg-secondary/50 rounded px-2 py-1">
                        <Hash className="h-3 w-3 text-blue-600 dark:text-blue-400 shrink-0" />
                        <Badge variant="default" className="text-xs shrink-0">
                          {psc.pscCode}
                        </Badge>
                        <span className="text-xs truncate max-w-24">{psc.name}</span>
                        <div
                          onClick={(e) => {
                            e.stopPropagation()
                            handleRemoveItem(psc.pscCode)
                          }}
                          className="ml-1 hover:text-destructive cursor-pointer"
                        >
                          <X className="h-3 w-3" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <>
                    <Hash className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
                    <Badge variant="default" className="text-xs shrink-0">
                      {selectedPSCs[0].pscCode}
                    </Badge>
                    <span className="truncate">{selectedPSCs[0].name}</span>
                  </>
                )
              ) : (
                <span className="text-muted-foreground">
                  {placeholder}
                </span>
              )}
            </div>
            <ChevronsUpDown className={`h-4 w-4 shrink-0 opacity-50 ${selectedPSCs.length > 0 && multiple ? 'self-start mt-0.5' : ''}`} />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
          <Command>
            <CommandInput 
              placeholder="Search PSC codes..." 
              value={searchQuery}
              onValueChange={setSearchQuery}
            />
            <CommandList className="max-h-96">
              <CommandEmpty>No PSC codes found.</CommandEmpty>
              {sortedPSCCodes.map((psc) => (
                <CommandItem
                  key={psc.pscCode}
                  value={`${psc.pscCode} ${psc.name} ${psc.category}`}
                  onSelect={() => handleSelect(psc.pscCode)}
                  className="flex items-center justify-between gap-2 py-2"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <Hash className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant={selectedValues.includes(psc.pscCode) ? "default" : "secondary"} className="text-xs shrink-0 font-mono">
                          {psc.pscCode}
                        </Badge>
                        <span className="truncate font-medium text-sm">{psc.name}</span>
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {psc.category}
                        {psc.description && ` • ${psc.description.split('.')[0]}.`}
                      </div>
                    </div>
                  </div>
                  <Check
                    className={cn(
                      "h-4 w-4 shrink-0",
                      selectedValues.includes(psc.pscCode) ? "opacity-100" : "opacity-0"
                    )}
                  />
                </CommandItem>
              ))}
              {filteredPSCCodes.length > 500 && (
                <div className="p-2 text-xs text-muted-foreground text-center border-t">
                  Showing {sortedPSCCodes.length} results. Refine search for more specific results.
                </div>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      
      {/* Clear button positioned absolutely */}
      {selectedPSCs.length > 0 && (
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