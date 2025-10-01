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
import { Check, ChevronsUpDown, X, Building, Building2, Briefcase, Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import agenciesData from '@/data/government/agencies/agencies.json'

interface Agency {
  code: string
  name: string
  abbreviation: string
  type: 'department' | 'independent' | 'sub_agency' | 'office'
  parentCode?: string
  isActive: boolean
  contractingAuthority: boolean
  website?: string
  businessAreas: string[]
  commonNaics: string[]
  alternateNames: string[]
  
  // Enhanced fields from enriched data
  mission?: string
  congressionalJustification?: string
  iconFilename?: string
  frecCode?: string
  frecDescription?: string
  frecAbbreviation?: string
  isFrec?: boolean
  isTopTier?: boolean
  description?: string
  comments?: string
  
  // Hierarchical structure
  subtiers?: Array<{
    code: string
    name: string
    abbreviation?: string
  }>
  
  // Administrative organization
  adminOrg?: {
    name: string
    code: string
  }
  
  // Metadata
  metadata?: {
    source: string
    userSelectable?: boolean
    frecAssociation?: boolean
    lastUpdated?: string
  }
}

interface AgencySelectorProps {
  value?: string | string[]
  onChange: (agencyCode: string | string[]) => void
  placeholder?: string
  className?: string
  showBusinessAreas?: boolean
  onlyContractingAgencies?: boolean
  disabled?: boolean
  multiple?: boolean
}

interface AgencyLabelWithInfoProps {
  htmlFor?: string
  children: React.ReactNode
}

// Helper functions - defined before component to avoid hoisting issues
const getAgencyTypeIcon = (type: string) => {
  switch (type) {
    case 'department':
      return <Building className="h-4 w-4" />
    case 'independent':
      return <Building2 className="h-4 w-4" />
    default:
      return <Briefcase className="h-4 w-4" />
  }
}

const getAgencyTypeLabel = (type: string) => {
  switch (type) {
    case 'department':
      return 'Department'
    case 'independent':
      return 'Independent Agency'
    case 'sub_agency':
      return 'Sub-Agency'
    case 'office':
      return 'Office'
    default:
      return type
  }
}

// Agency Label with Info Icon Component
export function AgencyLabelWithInfo({ htmlFor, children, selectedValue }: AgencyLabelWithInfoProps & { selectedValue?: string }) {
  // Get agency data for selected value
  const selectedData = useMemo(() => {
    if (!selectedValue) return null
    
    return getAgencyByCode(selectedValue) || null
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
                  {getAgencyTypeIcon(selectedData.type)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs shrink-0">
                      {selectedData.abbreviation}
                    </Badge>
                  </div>
                  <h4 className="text-sm font-medium leading-tight mt-1">{selectedData.name}</h4>
                </div>
              </div>
              <div className="flex flex-wrap gap-1 pt-1 border-t border-border/40">
                <Badge variant="secondary" className="text-xs">
                  {getAgencyTypeLabel(selectedData.type)}
                </Badge>
                {selectedData.contractingAuthority && (
                  <Badge variant="secondary" className="text-xs text-green-700 bg-green-50 dark:text-green-400 dark:bg-green-950">
                    Contracting Authority
                  </Badge>
                )}
              </div>
              {selectedData.businessAreas && selectedData.businessAreas.length > 0 && (
                <div className="space-y-1 pt-1 border-t border-border/40">
                  <p className="text-xs font-medium text-muted-foreground">Business Areas:</p>
                  <div className="flex flex-wrap gap-1">
                    {selectedData.businessAreas.slice(0, 3).map((area, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {area}
                      </Badge>
                    ))}
                    {selectedData.businessAreas.length > 3 && (
                      <span className="text-xs text-muted-foreground">+{selectedData.businessAreas.length - 3} more</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold">Government Agency</h4>
              <p className="text-sm text-muted-foreground">
                Federal agencies are government departments and organizations that handle contracting opportunities. Each agency has specific business areas and contracting authorities.
              </p>
              <p className="text-xs text-muted-foreground font-medium">
                💡 Select an agency first to see detailed information here.
              </p>
            </div>
          )}
        </HoverCardContent>
      </HoverCard>
    </div>
  )
}

export function AgencySelector({
  value,
  onChange,
  placeholder = "Select government agency",
  className = "",
  showBusinessAreas = false,
  onlyContractingAgencies = true,
  disabled = false,
  multiple = false
}: AgencySelectorProps) {
  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // Flatten all agencies into a searchable array
  const allAgencies = useMemo(() => {
    const agencies: Agency[] = []
    
    // Add all agency types
    agenciesData.agencies.departments.forEach(dept => agencies.push(dept))
    agenciesData.agencies.independentAgencies.forEach(agency => agencies.push(agency))
    agenciesData.agencies.subAgencies.forEach(subAgency => agencies.push(subAgency))
    agenciesData.agencies.offices.forEach(office => agencies.push(office))
    
    return agencies
      .filter(agency => agency.isActive)
      .filter(agency => !onlyContractingAgencies || agency.contractingAuthority)
      .sort((a, b) => {
        // Sort by abbreviation
        return a.abbreviation.localeCompare(b.abbreviation)
      })
  }, [onlyContractingAgencies])

  // Get selected agencies
  const selectedAgencies = useMemo(() => {
    if (!value) return []
    const values = Array.isArray(value) ? value : [value]
    return values.map(val => allAgencies.find(agency => agency.code === val)).filter(Boolean) as Agency[]
  }, [value, allAgencies])

  const selectedValues = useMemo(() => {
    return Array.isArray(value) ? value : value ? [value] : []
  }, [value])

  // Filter agencies based on search query
  const filteredAgencies = useMemo(() => {
    if (!searchQuery.trim()) return allAgencies
    
    const query = searchQuery.toLowerCase().trim()
    return allAgencies.filter(agency => 
      agency.name.toLowerCase().includes(query) ||
      agency.abbreviation.toLowerCase().includes(query) ||
      agency.alternateNames.some(name => name.toLowerCase().includes(query)) ||
      agency.businessAreas.some(area => area.toLowerCase().includes(query))
    )
  }, [allAgencies, searchQuery])

  // Sort agencies by abbreviation alphabetically (no grouping)
  const sortedAgencies = useMemo(() => {
    return filteredAgencies
      .sort((a, b) => a.abbreviation.localeCompare(b.abbreviation))
      .slice(0, 100) // Limit total results for performance
  }, [filteredAgencies])

  const handleSelect = (agencyCode: string) => {
    if (multiple) {
      const currentValues = selectedValues
      const isSelected = currentValues.includes(agencyCode)
      
      if (isSelected) {
        // Remove from selection
        const newValues = currentValues.filter(val => val !== agencyCode)
        onChange(newValues)
      } else {
        // Add to selection
        const newValues = [...currentValues, agencyCode]
        onChange(newValues)
      }
      // Don't close dropdown in multi-select mode
      setSearchQuery('')
    } else {
      // Single select mode
      if (agencyCode === value) {
        onChange('')
      } else {
        onChange(agencyCode)
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

  const handleRemoveItem = (agencyCode: string) => {
    if (multiple) {
      const newValues = selectedValues.filter(val => val !== agencyCode)
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
              className="w-full justify-between font-normal pr-8"
              disabled={disabled}
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                {selectedAgencies.length > 0 ? (
                  multiple ? (
                    <div className="flex flex-wrap gap-1 min-w-0 flex-1">
                      {selectedAgencies.slice(0, 2).map((agency) => (
                        <div key={agency.code} className="flex items-center gap-1 bg-secondary/50 rounded px-2 py-1">
                          <Badge variant="default" className="text-xs shrink-0">
                            {agency.abbreviation}
                          </Badge>
                          <span className="text-xs truncate max-w-24">{agency.name}</span>
                          <span
                            onClick={(e) => {
                              e.stopPropagation()
                              handleRemoveItem(agency.code)
                            }}
                            className="ml-1 hover:text-destructive cursor-pointer"
                          >
                            <X className="h-3 w-3" />
                          </span>
                        </div>
                      ))}
                      {selectedAgencies.length > 2 && (
                        <Badge variant="outline" className="text-xs">
                          +{selectedAgencies.length - 2} more
                        </Badge>
                      )}
                    </div>
                  ) : (
                    <>
                      {getAgencyTypeIcon(selectedAgencies[0].type)}
                      <Badge variant="default" className="text-xs shrink-0">
                        {selectedAgencies[0].abbreviation}
                      </Badge>
                      <span className="truncate">{selectedAgencies[0].name}</span>
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
                placeholder="Search agencies..." 
                value={searchQuery}
                onValueChange={setSearchQuery}
              />
              <CommandList className="max-h-96">
                <CommandEmpty>No agencies found.</CommandEmpty>
                {sortedAgencies.map((agency) => {
                  const parentAgency = agency.parentCode ? 
                    allAgencies.find(a => a.code === agency.parentCode) : null
                  
                  return (
                    <CommandItem
                      key={agency.code}
                      value={`${agency.code} ${agency.name} ${agency.abbreviation} ${agency.alternateNames.join(' ')}`}
                      onSelect={() => handleSelect(agency.code)}
                      className="flex items-center justify-between gap-2 py-2"
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        {getAgencyTypeIcon(agency.type)}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <Badge variant={selectedValues.includes(agency.code) ? "default" : "secondary"} className="text-xs shrink-0 font-mono">
                              {agency.abbreviation}
                            </Badge>
                            <span className="truncate font-medium text-sm">{agency.name}</span>
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {agency.code}
                            {parentAgency && ` • Part of ${parentAgency.abbreviation}`}
                          </div>
                        </div>
                      </div>
                      <Check
                        className={cn(
                          "h-4 w-4 shrink-0",
                          selectedValues.includes(agency.code) ? "opacity-100" : "opacity-0"
                        )}
                      />
                    </CommandItem>
                  )
                })}
                {filteredAgencies.length > 100 && (
                  <div className="p-2 text-xs text-muted-foreground text-center border-t">
                    Showing first 100+ results. Refine search for more specific results.
                  </div>
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        
        {/* Clear button positioned absolutely */}
        {selectedAgencies.length > 0 && (
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

// Export helper functions for working with agency data
export function getAgencyByCode(code: string): Agency | null {
  const allAgencies = [
    ...agenciesData.agencies.departments,
    ...agenciesData.agencies.independentAgencies,
    ...agenciesData.agencies.subAgencies,
    ...agenciesData.agencies.offices
  ]
  
  return allAgencies.find(agency => agency.code === code) || null
}

export function getAgenciesByBusinessArea(businessArea: string): Agency[] {
  const allAgencies = [
    ...agenciesData.agencies.departments,
    ...agenciesData.agencies.independentAgencies,
    ...agenciesData.agencies.subAgencies,
    ...agenciesData.agencies.offices
  ]
  
  return allAgencies
    .filter(agency => 
      agency.isActive && 
      agency.businessAreas.some(area => 
        area.toLowerCase().includes(businessArea.toLowerCase())
      )
    )
    .sort((a, b) => a.name.localeCompare(b.name))
}

export function searchAgencies(query: string, options: {
  onlyContractingAgencies?: boolean
  types?: Array<'department' | 'independent' | 'sub_agency' | 'office'>
} = {}): Agency[] {
  const { onlyContractingAgencies = false, types } = options
  
  let allAgencies = [
    ...agenciesData.agencies.departments,
    ...agenciesData.agencies.independentAgencies,
    ...agenciesData.agencies.subAgencies,
    ...agenciesData.agencies.offices
  ]
  
  // Filter by criteria
  allAgencies = allAgencies.filter(agency => {
    if (!agency.isActive) return false
    if (onlyContractingAgencies && !agency.contractingAuthority) return false
    if (types && !types.includes(agency.type)) return false
    return true
  })
  
  // Search by query
  if (query.trim()) {
    const searchTerm = query.toLowerCase().trim()
    allAgencies = allAgencies.filter(agency => 
      agency.name.toLowerCase().includes(searchTerm) ||
      agency.abbreviation.toLowerCase().includes(searchTerm) ||
      agency.alternateNames.some(name => name.toLowerCase().includes(searchTerm)) ||
      agency.businessAreas.some(area => area.toLowerCase().includes(searchTerm))
    )
  }
  
  return allAgencies.sort((a, b) => a.name.localeCompare(b.name))
}

export { type Agency }