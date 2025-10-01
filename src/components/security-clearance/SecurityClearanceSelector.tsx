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
import { Check, ChevronsUpDown, X, Shield, Lock, Key, Crown, Star, Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import { 
  SecurityClearanceLevel, 
  getSecurityClearanceOptions, 
  SECURITY_CLEARANCE_INFO,
  getSecurityClearanceRank 
} from '@/lib/security-clearance'

interface SecurityClearanceSelectorProps {
  value?: SecurityClearanceLevel | SecurityClearanceLevel[]
  onChange: (clearance: SecurityClearanceLevel | SecurityClearanceLevel[]) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  allowClear?: boolean
  multiple?: boolean
}

interface SecurityClearanceLabelWithInfoProps {
  htmlFor?: string
  children: React.ReactNode
  selectedValue?: SecurityClearanceLevel
}

// Security Clearance Label with Info Icon Component
export function SecurityClearanceLabelWithInfo({ htmlFor, children, selectedValue }: SecurityClearanceLabelWithInfoProps) {
  const selectedData = useMemo(() => {
    if (!selectedValue) return null
    return SECURITY_CLEARANCE_INFO[selectedValue] || null
  }, [selectedValue])

  const getClearanceIcon = (level: SecurityClearanceLevel) => {
    const rank = getSecurityClearanceRank(level)
    switch (rank) {
      case 0:
        return <Shield className="h-4 w-4" />
      case 1:
        return <Key className="h-4 w-4" />
      case 2:
      case 3:
        return <Lock className="h-4 w-4" />
      case 4:
      case 5:
        return <Crown className="h-4 w-4" />
      case 6:
        return <Star className="h-4 w-4" />
      default:
        return <Shield className="h-4 w-4" />
    }
  }

  const getClearanceColor = (level: SecurityClearanceLevel) => {
    const rank = getSecurityClearanceRank(level)
    switch (rank) {
      case 0:
        return 'bg-gray-500/10'
      case 1:
        return 'bg-blue-500/10'
      case 2:
      case 3:
        return 'bg-green-500/10'
      case 4:
      case 5:
        return 'bg-orange-500/10'
      case 6:
        return 'bg-red-500/10'
      default:
        return 'bg-gray-500/10'
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
                <div className={cn(getClearanceColor(selectedValue), "p-1.5 rounded")}>
                  {getClearanceIcon(selectedValue)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs shrink-0">
                      Level {getSecurityClearanceRank(selectedValue)}
                    </Badge>
                  </div>
                  <h4 className="text-sm font-medium leading-tight mt-1">{selectedData.level}</h4>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    {selectedData.description}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1 pt-1 border-t border-border/40">
                {selectedData.commonAgencies.slice(0, 2).map((agency, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {agency}
                  </Badge>
                ))}
                {selectedData.commonAgencies.length > 2 && (
                  <Badge variant="secondary" className="text-xs">
                    +{selectedData.commonAgencies.length - 2} more
                  </Badge>
                )}
              </div>
              {selectedData.requirements.length > 0 && (
                <div className="space-y-1 pt-1 border-t border-border/40">
                  <p className="text-xs font-medium text-muted-foreground">Key Requirements:</p>
                  <p className="text-xs text-muted-foreground">
                    {selectedData.requirements[0]}
                  </p>
                  {selectedData.requirements.length > 1 && (
                    <p className="text-xs text-muted-foreground">
                      +{selectedData.requirements.length - 1} more requirements
                    </p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold">Security Clearance</h4>
              <p className="text-sm text-muted-foreground">
                Security clearances are government authorizations that allow access to classified information and restricted facilities.
              </p>
              <p className="text-xs text-muted-foreground font-medium">
                🔒 Select a clearance level to see detailed requirements and common agencies.
              </p>
            </div>
          )}
        </HoverCardContent>
      </HoverCard>
    </div>
  )
}

export function SecurityClearanceSelector({
  value,
  onChange,
  placeholder = "Select security clearance",
  className = "",
  disabled = false,
  allowClear = true,
  multiple = false
}: SecurityClearanceSelectorProps) {
  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // Get all security clearance options sorted alphabetically
  const allClearances = useMemo(() => {
    return getSecurityClearanceOptions()
      .sort((a, b) => a.label.localeCompare(b.label))
  }, [])

  // Get selected clearances
  const selectedClearances = useMemo(() => {
    if (!value) return []
    const values = Array.isArray(value) ? value : [value]
    return values.map(val => allClearances.find(clearance => clearance.value === val)).filter(Boolean)
  }, [value, allClearances])

  const selectedValues = useMemo(() => {
    return Array.isArray(value) ? value : value ? [value] : []
  }, [value])

  // Filter clearances based on search query
  const filteredClearances = useMemo(() => {
    if (!searchQuery.trim()) return allClearances
    
    const query = searchQuery.toLowerCase().trim()
    return allClearances.filter(clearance => 
      clearance.label.toLowerCase().includes(query) ||
      clearance.description.toLowerCase().includes(query) ||
      SECURITY_CLEARANCE_INFO[clearance.value].commonAgencies.some(agency => 
        agency.toLowerCase().includes(query)
      ) ||
      SECURITY_CLEARANCE_INFO[clearance.value].requirements.some(req => 
        req.toLowerCase().includes(query)
      )
    )
  }, [allClearances, searchQuery])

  // Group clearances by security level
  const groupedClearances = useMemo(() => {
    const groups: Record<string, typeof allClearances> = {}
    
    filteredClearances.forEach(clearance => {
      const rank = getSecurityClearanceRank(clearance.value)
      let groupName: string
      
      if (rank === 0) {
        groupName = 'No Clearance Required'
      } else if (rank <= 2) {
        groupName = 'Basic Clearances'
      } else if (rank <= 4) {
        groupName = 'Standard Clearances'
      } else {
        groupName = 'Top Secret Clearances'
      }
      
      if (!groups[groupName]) {
        groups[groupName] = []
      }
      groups[groupName].push(clearance)
    })

    // Sort groups by security level
    const groupOrder = ['No Clearance Required', 'Basic Clearances', 'Standard Clearances', 'Top Secret Clearances']
    return groupOrder.reduce((acc, groupName) => {
      if (groups[groupName]) {
        acc[groupName] = groups[groupName]
      }
      return acc
    }, {} as Record<string, typeof allClearances>)
  }, [filteredClearances])

  const getClearanceIcon = (level: SecurityClearanceLevel) => {
    const rank = getSecurityClearanceRank(level)
    switch (rank) {
      case 0:
        return <Shield className="h-4 w-4" />
      case 1:
        return <Key className="h-4 w-4" />
      case 2:
      case 3:
        return <Lock className="h-4 w-4" />
      case 4:
      case 5:
        return <Crown className="h-4 w-4" />
      case 6:
        return <Star className="h-4 w-4" />
      default:
        return <Shield className="h-4 w-4" />
    }
  }

  const handleSelect = (clearanceLevel: SecurityClearanceLevel) => {
    if (multiple) {
      const currentValues = selectedValues
      const isSelected = currentValues.includes(clearanceLevel)
      
      if (isSelected) {
        // Remove from selection
        const newValues = currentValues.filter(val => val !== clearanceLevel)
        onChange(newValues)
      } else {
        // Add to selection
        const newValues = [...currentValues, clearanceLevel]
        onChange(newValues)
      }
      // Don't close dropdown in multi-select mode
      setSearchQuery('')
    } else {
      // Single select mode
      if (clearanceLevel === value) {
        onChange(SecurityClearanceLevel.NONE)
      } else {
        onChange(clearanceLevel)
      }
      setOpen(false)
      setSearchQuery('')
    }
  }

  const handleClear = () => {
    onChange(multiple ? [] : SecurityClearanceLevel.NONE)
    setOpen(false)
    setSearchQuery('')
  }

  const handleRemoveItem = (clearanceLevel: SecurityClearanceLevel) => {
    if (multiple) {
      const newValues = selectedValues.filter(val => val !== clearanceLevel)
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
              className={`w-full justify-between font-normal pr-8 ${selectedClearances.length > 0 && multiple ? 'min-h-9 h-auto py-2' : 'h-9'}`}
              disabled={disabled}
            >
              <div className={`flex gap-2 min-w-0 flex-1 ${selectedClearances.length > 0 && multiple ? 'items-start' : 'items-center'}`}>
                {selectedClearances.length > 0 ? (
                  multiple ? (
                    <div className="flex flex-wrap gap-1 min-w-0 flex-1">
                      {selectedClearances.map((clearance) => (
                        <div key={clearance.value} className="flex items-center gap-1 bg-secondary/50 rounded px-2 py-1">
                          <Badge variant="default" className="text-xs shrink-0">
                            Level {getSecurityClearanceRank(clearance.value)}
                          </Badge>
                          <span className="text-xs truncate max-w-24">{clearance.label}</span>
                          <span
                            onClick={(e) => {
                              e.stopPropagation()
                              handleRemoveItem(clearance.value)
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
                      {getClearanceIcon(selectedClearances[0].value)}
                      <Badge variant="default" className="text-xs shrink-0">
                        Level {getSecurityClearanceRank(selectedClearances[0].value)}
                      </Badge>
                      <span className="truncate">{selectedClearances[0].label}</span>
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
                placeholder="Search security clearances..." 
                value={searchQuery}
                onValueChange={setSearchQuery}
              />
              <CommandList className="max-h-96">
                <CommandEmpty>No security clearances found.</CommandEmpty>
                {Object.entries(groupedClearances).map(([groupName, clearances]) => (
                  <CommandGroup key={groupName} heading={groupName}>
                    {clearances.map((clearance) => (
                      <CommandItem
                        key={clearance.value}
                        value={`${clearance.label} ${clearance.description} ${SECURITY_CLEARANCE_INFO[clearance.value].commonAgencies.join(' ')}`}
                        onSelect={() => handleSelect(clearance.value)}
                        className="flex items-center justify-between gap-2 py-2"
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          {getClearanceIcon(clearance.value)}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <Badge variant={selectedValues.includes(clearance.value) ? "default" : "secondary"} className="text-xs shrink-0">
                                Level {getSecurityClearanceRank(clearance.value)}
                              </Badge>
                              <span className="truncate font-medium">{clearance.label}</span>
                            </div>
                            <div className="text-xs text-muted-foreground truncate mt-0.5">
                              {clearance.description}
                              {SECURITY_CLEARANCE_INFO[clearance.value].commonAgencies.length > 0 && (
                                <span className="ml-2">• Common at: {SECURITY_CLEARANCE_INFO[clearance.value].commonAgencies.slice(0, 2).join(', ')}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <Check
                          className={cn(
                            "h-4 w-4 shrink-0",
                            selectedValues.includes(clearance.value) ? "opacity-100" : "opacity-0"
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
        {selectedClearances.length > 0 && allowClear && (
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
export function getSecurityClearanceByLevel(level: SecurityClearanceLevel) {
  return SECURITY_CLEARANCE_INFO[level] || null
}

export function searchSecurityClearances(query: string) {
  if (!query.trim()) return getSecurityClearanceOptions()
  
  const searchTerm = query.toLowerCase().trim()
  return getSecurityClearanceOptions().filter(clearance => 
    clearance.label.toLowerCase().includes(searchTerm) ||
    clearance.description.toLowerCase().includes(searchTerm) ||
    SECURITY_CLEARANCE_INFO[clearance.value].commonAgencies.some(agency => 
      agency.toLowerCase().includes(searchTerm)
    ) ||
    SECURITY_CLEARANCE_INFO[clearance.value].requirements.some(req => 
      req.toLowerCase().includes(searchTerm)
    )
  ).sort((a, b) => a.label.localeCompare(b.label))
}

export function getSecurityClearancesByRank(minRank: number = 0, maxRank: number = 6) {
  return getSecurityClearanceOptions()
    .filter(clearance => {
      const rank = getSecurityClearanceRank(clearance.value)
      return rank >= minRank && rank <= maxRank
    })
    .sort((a, b) => getSecurityClearanceRank(a.value) - getSecurityClearanceRank(b.value))
}