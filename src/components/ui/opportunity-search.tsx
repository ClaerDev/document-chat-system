'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Command, CommandInput, CommandList, CommandItem, CommandEmpty, CommandGroup } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Check, ChevronDown, Search, Building, Calendar, DollarSign, FileText, ExternalLink } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { debounce } from 'lodash'

interface OpportunitySearchResult {
  id: string
  solicitationNumber: string
  title: string
  agency?: import('@/types').AgencyInfo | string
  description?: string
  estimatedValue?: number
  responseDeadline?: string | Date
  opportunityType?: string
  status?: string
  postedDate?: string | Date
  location?: string
  state?: string
  city?: string
  naicsCodes?: string[]
  setAsideType?: string
}

interface OpportunitySearchProps {
  value?: OpportunitySearchResult | null
  onSelect: (opportunity: OpportunitySearchResult | null) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  allowClear?: boolean
  showDetails?: boolean
  searchByTitle?: boolean
  label?: string
}

// Helper function to format currency
function formatCurrency(amount?: number): string {
  if (!amount) return 'N/A'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)
}

// Helper function to format agency name
function getAgencyDisplayName(agency?: import('@/types').AgencyInfo | string): string {
  if (!agency) return 'Unknown Agency'
  if (typeof agency === 'string') return agency
  return agency.abbreviation || agency.name || 'Unknown Agency'
}

export function OpportunitySearch({
  value,
  onSelect,
  placeholder = "Search by Solicitation ID or title...",
  disabled = false,
  className,
  allowClear = true,
  showDetails = true,
  searchByTitle = true,
  label
}: OpportunitySearchProps) {
  const [open, setOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [searchResults, setSearchResults] = useState<OpportunitySearchResult[]>([])
  const [error, setError] = useState<string | null>(null)

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce(async (query: string) => {
      if (!query || query.length < 2) {
        setSearchResults([])
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        // Search opportunities using the mock API
        const searchParams = new URLSearchParams({
          query,
          limit: '10',
          offset: '0'
        })

        const response = await fetch(`/api/v1/opportunities-mock?${searchParams}`)
        
        if (!response.ok) {
          throw new Error('Failed to search opportunities')
        }

        const data = await response.json()
        
        if (data.success && data.data?.items) {
          // Debug: Check status values
          console.log('🔍 Opportunity status values:', data.data.items.slice(0, 3).map((opp: any) => ({ 
            id: opp.id, 
            status: opp.status,
            title: opp.title?.substring(0, 30) 
          })))
          
          // Filter results to prioritize exact matches for solicitation numbers
          const results = data.data.items.map((opp: any) => ({
            id: opp.id,
            solicitationNumber: opp.solicitationNumber,
            title: opp.title,
            agency: opp.agency,
            description: opp.description,
            estimatedValue: opp.estimatedValue,
            responseDeadline: opp.responseDeadline,
            opportunityType: opp.opportunityType,
            status: opp.status,
            postedDate: opp.postedDate,
            location: opp.location,
            state: opp.state,
            city: opp.city,
            naicsCodes: opp.naicsCodes,
            setAsideType: opp.setAsideType
          }))

          // Sort results: exact solicitation number matches first, then relevance
          const sortedResults = results.sort((a, b) => {
            const aExactMatch = a.solicitationNumber?.toLowerCase() === query.toLowerCase()
            const bExactMatch = b.solicitationNumber?.toLowerCase() === query.toLowerCase()
            
            if (aExactMatch && !bExactMatch) return -1
            if (!aExactMatch && bExactMatch) return 1
            
            // Then by title match
            const aTitleMatch = a.title?.toLowerCase().includes(query.toLowerCase()) ? 1 : 0
            const bTitleMatch = b.title?.toLowerCase().includes(query.toLowerCase()) ? 1 : 0
            
            return bTitleMatch - aTitleMatch
          })

          setSearchResults(sortedResults)
        } else {
          setSearchResults([])
        }
      } catch (err) {
        console.error('Error searching opportunities:', err)
        setError('Failed to search opportunities')
        setSearchResults([])
      } finally {
        setIsLoading(false)
      }
    }, 300),
    []
  )

  // Trigger search when searchTerm changes
  useEffect(() => {
    debouncedSearch(searchTerm)
  }, [searchTerm, debouncedSearch])

  // Handle opportunity selection
  const handleSelect = (opportunity: OpportunitySearchResult) => {
    onSelect(opportunity)
    setOpen(false)
    setSearchTerm('')
  }

  // Handle clear selection
  const handleClear = () => {
    onSelect(null)
    setSearchTerm('')
  }

  // Get display text for selected value
  const getDisplayText = () => {
    if (!value) return ''
    if (searchByTitle) {
      return `${value.solicitationNumber} - ${value.title}`
    }
    return value.solicitationNumber
  }

  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <Label htmlFor="opportunity-search" className="text-sm font-medium">
          {label}
        </Label>
      )}
      
      <div className="space-y-2">
        <Popover open={open} onOpenChange={setOpen} modal={true}>
          <PopoverTrigger asChild>
            <Button
              id="opportunity-search"
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-full justify-between"
              disabled={disabled}
            >
              {value ? (
                <span className="truncate">{getDisplayText()}</span>
              ) : (
                <span className="text-muted-foreground">{placeholder}</span>
              )}
              <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          
          <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start" side="bottom" sideOffset={5}>
            <Command shouldFilter={false}>
              <div className="flex items-center border-b px-3">
                <CommandInput
                  placeholder={placeholder}
                  value={searchTerm}
                  onValueChange={setSearchTerm}
                  className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
              
              <CommandList className="max-h-[200px] overflow-y-auto">
                {isLoading && (
                  <div className="p-4 space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-3 w-3/4" />
                  </div>
                )}
                
                {error && (
                  <div className="p-4 text-sm text-red-600">
                    {error}
                  </div>
                )}
                
                {!isLoading && !error && searchResults.length === 0 && searchTerm.length >= 2 && (
                  <CommandEmpty>No opportunities found.</CommandEmpty>
                )}
                
                {!isLoading && !error && searchResults.length > 0 && (
                  <CommandGroup>
                    {searchResults.map((opportunity) => (
                      <CommandItem
                        key={opportunity.id}
                        value={opportunity.id}
                        onSelect={() => handleSelect(opportunity)}
                        className="cursor-pointer p-4"
                      >
                        <div className="flex items-center w-full">
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              value?.id === opportunity.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">
                                {opportunity.solicitationNumber}
                              </span>
                              {opportunity.status && (
                                <Badge variant="outline" className="text-xs">
                                  {opportunity.status}
                                </Badge>
                              )}
                            </div>
                            
                            <div className="text-sm text-foreground">
                              {opportunity.title}
                            </div>
                            
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              {opportunity.agency && (
                                <div className="flex items-center gap-1">
                                  <Building className="h-3 w-3" />
                                  {getAgencyDisplayName(opportunity.agency)}
                                </div>
                              )}
                              
                              {opportunity.estimatedValue && (
                                <div className="flex items-center gap-1">
                                  <DollarSign className="h-3 w-3" />
                                  {formatCurrency(opportunity.estimatedValue)}
                                </div>
                              )}
                              
                              {opportunity.responseDeadline && (
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {format(new Date(opportunity.responseDeadline), 'MMM d, yyyy')}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {/* Clear button */}
        {value && allowClear && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleClear}
            className="w-full"
          >
            Clear Selection
          </Button>
        )}

        {/* Selected opportunity details */}
        {value && showDetails && (
          <div className="p-3 bg-muted rounded-md space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Selected Opportunity</span>
              {value.id && (
                <Button variant="ghost" size="sm" asChild>
                  <a href={`/opportunities/${value.id}`} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-3 w-3 mr-1" />
                    View Details
                  </a>
                </Button>
              )}
            </div>
            
            <div className="space-y-1 text-sm">
              <div><span className="font-medium">Title:</span> {value.title}</div>
              
              {value.agency && (
                <div><span className="font-medium">Agency:</span> {getAgencyDisplayName(value.agency)}</div>
              )}
              
              {value.estimatedValue && (
                <div><span className="font-medium">Estimated Value:</span> {formatCurrency(value.estimatedValue)}</div>
              )}
              
              {value.responseDeadline && (
                <div><span className="font-medium">Deadline:</span> {format(new Date(value.responseDeadline), 'MMM d, yyyy')}</div>
              )}
              
              {value.location && (
                <div><span className="font-medium">Location:</span> {value.location}</div>
              )}
              
              {value.naicsCodes && value.naicsCodes.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  <span className="text-xs font-medium">NAICS:</span>
                  {value.naicsCodes.slice(0, 3).map((code) => (
                    <Badge key={code} variant="secondary" className="text-xs">
                      {code}
                    </Badge>
                  ))}
                  {value.naicsCodes.length > 3 && (
                    <Badge variant="secondary" className="text-xs">
                      +{value.naicsCodes.length - 3} more
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}