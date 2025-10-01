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
import { Check, ChevronsUpDown, X, Shield, Users, Building2, Award, Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import setAsidesData from '@/data/government/set-asides/set-asides.json'

interface SetAside {
  code: string
  name: string
  description: string
  category: string
  eligibilityRequirements: string[]
  commonAcronyms: string[]
  applicationProcess?: string
  certifyingAgencies?: string[]
  isActive: boolean
}

interface SetAsideSelectorProps {
  value?: string | string[]
  onChange: (setAsideCode: string | string[]) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  allowClear?: boolean
  multiple?: boolean
}

interface SetAsideLabelWithInfoProps {
  htmlFor?: string
  children: React.ReactNode
}

// Set-Aside Label with Info Icon Component
export function SetAsideLabelWithInfo({ htmlFor, children, selectedValue }: SetAsideLabelWithInfoProps & { selectedValue?: string }) {
  // Get set-aside data for selected value
  const selectedData = useMemo(() => {
    if (!selectedValue) return null
    
    return getSetAsideByCode(selectedValue) || null
  }, [selectedValue])

  const getCategoryIcon = (category: string) => {
    const categoryLower = category?.toLowerCase() || ''
    switch (categoryLower) {
      case 'small business':
        return <Building2 className="h-4 w-4" />
      case 'socioeconomic':
        return <Users className="h-4 w-4" />
      case 'veteran':
        return <Shield className="h-4 w-4" />
      default:
        return <Award className="h-4 w-4" />
    }
  }

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
                <div className="bg-purple-500/10 p-1.5 rounded">
                  {getCategoryIcon(selectedData.category || '')}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs shrink-0">
                      {selectedData.code}
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
              <div className="flex flex-wrap gap-1 pt-1 border-t border-border/40">
                <Badge variant="secondary" className="text-xs">
                  {selectedData.category || 'Other'}
                </Badge>
                {(selectedData.commonAcronyms || []).length > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {selectedData.commonAcronyms[0]}
                  </Badge>
                )}
              </div>
              {(selectedData.eligibilityRequirements || []).length > 0 && (
                <div className="space-y-1 pt-1 border-t border-border/40">
                  <p className="text-xs font-medium text-muted-foreground">Key Requirements:</p>
                  <p className="text-xs text-muted-foreground">
                    {selectedData.eligibilityRequirements[0]}
                  </p>
                  {selectedData.eligibilityRequirements.length > 1 && (
                    <p className="text-xs text-muted-foreground">
                      +{selectedData.eligibilityRequirements.length - 1} more requirements
                    </p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold">Set-Aside Type</h4>
              <p className="text-sm text-muted-foreground">
                Set-aside contracts are reserved for specific types of businesses to promote diversity and small business participation in federal contracting.
              </p>
              <p className="text-xs text-muted-foreground font-medium">
                💡 Select a set-aside type first to see detailed information here.
              </p>
            </div>
          )}
        </HoverCardContent>
      </HoverCard>
    </div>
  )
}

export function SetAsideSelector({
  value,
  onChange,
  placeholder = "Select set-aside type",
  className = "",
  disabled = false,
  allowClear = true,
  multiple = false
}: SetAsideSelectorProps) {
  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // Get all set-asides
  const allSetAsides = useMemo(() => {
    return setAsidesData.setAsides
      .filter(setAside => setAside.isActive)
      .sort((a, b) => a.code.localeCompare(b.code))
  }, [])

  // Get selected set-asides
  const selectedSetAsides = useMemo(() => {
    if (!value) return []
    const values = Array.isArray(value) ? value : [value]
    return values.map(val => allSetAsides.find(setAside => setAside.code === val)).filter(Boolean) as SetAside[]
  }, [value, allSetAsides])

  const selectedValues = useMemo(() => {
    return Array.isArray(value) ? value : value ? [value] : []
  }, [value])

  // Filter set-asides based on search query
  const filteredSetAsides = useMemo(() => {
    if (!searchQuery.trim()) return allSetAsides
    
    const query = searchQuery.toLowerCase().trim()
    return allSetAsides.filter(setAside => 
      setAside.name.toLowerCase().includes(query) ||
      setAside.code.toLowerCase().includes(query) ||
      setAside.description.toLowerCase().includes(query) ||
      (setAside.category || '').toLowerCase().includes(query) ||
      (setAside.commonAcronyms || []).some(acronym => acronym.toLowerCase().includes(query)) ||
      (setAside.eligibilityRequirements || []).some(req => req.toLowerCase().includes(query))
    )
  }, [allSetAsides, searchQuery])

  // Group set-asides by category
  const groupedSetAsides = useMemo(() => {
    const groups: Record<string, SetAside[]> = {}
    
    filteredSetAsides.forEach(setAside => {
      const category = setAside.category || 'Other'
      if (!groups[category]) {
        groups[category] = []
      }
      groups[category].push(setAside)
    })

    // Sort categories
    return Object.keys(groups)
      .sort()
      .reduce((acc, category) => {
        acc[category] = groups[category].slice(0, 15) // Limit per category
        return acc
      }, {} as Record<string, SetAside[]>)
  }, [filteredSetAsides])

  const getCategoryIcon = (category: string) => {
    const categoryLower = category?.toLowerCase() || ''
    switch (categoryLower) {
      case 'small business':
        return <Building2 className="h-4 w-4" />
      case 'socioeconomic':
        return <Users className="h-4 w-4" />
      case 'veteran':
        return <Shield className="h-4 w-4" />
      default:
        return <Award className="h-4 w-4" />
    }
  }

  const handleSelect = (setAsideCode: string) => {
    if (multiple) {
      const currentValues = selectedValues
      const isSelected = currentValues.includes(setAsideCode)
      
      if (isSelected) {
        // Remove from selection
        const newValues = currentValues.filter(val => val !== setAsideCode)
        onChange(newValues)
      } else {
        // Add to selection
        const newValues = [...currentValues, setAsideCode]
        onChange(newValues)
      }
      // Don't close dropdown in multi-select mode
      setSearchQuery('')
    } else {
      // Single select mode
      if (setAsideCode === value) {
        onChange('')
      } else {
        onChange(setAsideCode)
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

  const handleRemoveItem = (setAsideCode: string) => {
    if (multiple) {
      const newValues = selectedValues.filter(val => val !== setAsideCode)
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
              className={`w-full justify-between font-normal pr-8 ${selectedSetAsides.length > 0 && multiple ? 'min-h-9 h-auto py-2' : 'h-9'}`}
              disabled={disabled}
            >
              <div className={`flex gap-2 min-w-0 flex-1 ${selectedSetAsides.length > 0 && multiple ? 'items-start' : 'items-center'}`}>
                {selectedSetAsides.length > 0 ? (
                  multiple ? (
                    <div className="flex flex-wrap gap-1 min-w-0 flex-1">
                      {selectedSetAsides.map((setAside) => (
                        <div key={setAside.code} className="flex items-center gap-1 bg-secondary/50 rounded px-2 py-1">
                          <Badge variant="default" className="text-xs shrink-0">
                            {setAside.code}
                          </Badge>
                          <span className="text-xs truncate max-w-24">{setAside.name}</span>
                          <span
                            onClick={(e) => {
                              e.stopPropagation()
                              handleRemoveItem(setAside.code)
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
                      {getCategoryIcon(selectedSetAsides[0].category || '')}
                      <Badge variant="default" className="text-xs shrink-0">
                        {selectedSetAsides[0].code}
                      </Badge>
                      <span className="truncate">{selectedSetAsides[0].name}</span>
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
                placeholder="Search set-aside types..." 
                value={searchQuery}
                onValueChange={setSearchQuery}
              />
              <CommandList className="max-h-96">
                <CommandEmpty>No set-aside types found.</CommandEmpty>
                {Object.entries(groupedSetAsides).map(([category, setAsides]) => (
                  <CommandGroup key={category} heading={category}>
                    {setAsides.map((setAside) => (
                      <CommandItem
                        key={setAside.code}
                        value={`${setAside.code} ${setAside.name} ${setAside.description} ${(setAside.commonAcronyms || []).join(' ')}`}
                        onSelect={() => handleSelect(setAside.code)}
                        className="flex items-center justify-between gap-2 py-2"
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          {getCategoryIcon(setAside.category || '')}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <Badge variant={selectedValues.includes(setAside.code) ? "default" : "secondary"} className="text-xs shrink-0">
                                {setAside.code}
                              </Badge>
                              <span className="truncate font-medium">{setAside.name}</span>
                            </div>
                            <div className="text-xs text-muted-foreground truncate mt-0.5">
                              {setAside.description && setAside.description.split('.')[0] + '.'}
                              {(setAside.commonAcronyms || []).length > 0 && (
                                <span className="ml-2">• Also known as: {(setAside.commonAcronyms || []).join(', ')}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <Check
                          className={cn(
                            "h-4 w-4 shrink-0",
                            selectedValues.includes(setAside.code) ? "opacity-100" : "opacity-0"
                          )}
                        />
                      </CommandItem>
                    ))}
                  </CommandGroup>
                ))}
                {filteredSetAsides.length > 100 && (
                  <div className="p-2 text-xs text-muted-foreground text-center border-t">
                    Showing first 100+ results. Refine search for more specific results.
                  </div>
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        
        {/* Clear button positioned absolutely */}
        {selectedSetAsides.length > 0 && allowClear && (
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

// Export helper functions
export function getSetAsideByCode(code: string): SetAside | null {
  return setAsidesData.setAsides.find(setAside => setAside.code === code) || null
}

export function searchSetAsides(query: string): SetAside[] {
  if (!query.trim()) return setAsidesData.setAsides.filter(sa => sa.isActive)
  
  const searchTerm = query.toLowerCase().trim()
  return setAsidesData.setAsides
    .filter(setAside => 
      setAside.isActive && (
        setAside.name.toLowerCase().includes(searchTerm) ||
        setAside.code.toLowerCase().includes(searchTerm) ||
        setAside.description.toLowerCase().includes(searchTerm) ||
        (setAside.category || '').toLowerCase().includes(searchTerm) ||
        (setAside.commonAcronyms || []).some(acronym => acronym.toLowerCase().includes(searchTerm))
      )
    )
    .sort((a, b) => a.code.localeCompare(b.code))
}

export function getSetAsidesByCategory(category: string): SetAside[] {
  return setAsidesData.setAsides
    .filter(setAside => 
      setAside.isActive && 
      (setAside.category || '').toLowerCase() === category.toLowerCase()
    )
    .sort((a, b) => a.code.localeCompare(b.code))
}

export { type SetAside }