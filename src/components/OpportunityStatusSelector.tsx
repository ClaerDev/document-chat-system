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
import { Check, ChevronsUpDown, X, Info, Activity } from 'lucide-react'
import { cn } from '@/lib/utils'
import { OpportunityStatus } from '@/types/opportunity-enums'

interface OpportunityStatusOption {
  value: OpportunityStatus
  label: string
  description: string
  category: 'active' | 'inactive' | 'completed'
  color: string
}

interface OpportunityStatusSelectorProps {
  value?: OpportunityStatus | OpportunityStatus[]
  onChange: (status: OpportunityStatus | OpportunityStatus[]) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  multiple?: boolean
}

interface OpportunityStatusLabelWithInfoProps {
  htmlFor?: string
  children: React.ReactNode
  selectedValue?: OpportunityStatus
}

// Define all opportunity status options with metadata
const OPPORTUNITY_STATUS_OPTIONS: OpportunityStatusOption[] = [
  {
    value: OpportunityStatus.ACTIVE,
    label: 'Active',
    description: 'Opportunity is currently open for submissions and responses',
    category: 'active',
    color: 'text-green-600 dark:text-green-400'
  },
  {
    value: OpportunityStatus.PENDING,
    label: 'Pending',
    description: 'Opportunity is in review or evaluation phase',
    category: 'active',
    color: 'text-yellow-600 dark:text-yellow-400'
  },
  {
    value: OpportunityStatus.DRAFT,
    label: 'Draft',
    description: 'Opportunity is being prepared and not yet published',
    category: 'inactive',
    color: 'text-gray-600 dark:text-gray-400'
  },
  {
    value: OpportunityStatus.INACTIVE,
    label: 'Inactive',
    description: 'Opportunity is temporarily suspended or on hold',
    category: 'inactive',
    color: 'text-orange-600 dark:text-orange-400'
  },
  {
    value: OpportunityStatus.SUSPENDED,
    label: 'Suspended',
    description: 'Opportunity has been temporarily halted',
    category: 'inactive',
    color: 'text-orange-600 dark:text-orange-400'
  },
  {
    value: OpportunityStatus.CLOSED,
    label: 'Closed',
    description: 'Opportunity has closed for new submissions',
    category: 'completed',
    color: 'text-blue-600 dark:text-blue-400'
  },
  {
    value: OpportunityStatus.AWARDED,
    label: 'Awarded',
    description: 'Contract has been successfully awarded to a vendor',
    category: 'completed',
    color: 'text-green-600 dark:text-green-400'
  },
  {
    value: OpportunityStatus.COMPLETED,
    label: 'Completed',
    description: 'Contract work has been completed successfully',
    category: 'completed',
    color: 'text-green-600 dark:text-green-400'
  },
  {
    value: OpportunityStatus.CANCELLED,
    label: 'Cancelled',
    description: 'Opportunity was cancelled and will not proceed',
    category: 'completed',
    color: 'text-red-600 dark:text-red-400'
  },
  {
    value: OpportunityStatus.TERMINATED,
    label: 'Terminated',
    description: 'Contract was terminated before completion',
    category: 'completed',
    color: 'text-red-600 dark:text-red-400'
  },
  {
    value: OpportunityStatus.ARCHIVED,
    label: 'Archived',
    description: 'Opportunity has been archived for historical purposes',
    category: 'completed',
    color: 'text-gray-600 dark:text-gray-400'
  },
  {
    value: OpportunityStatus.DELETED,
    label: 'Deleted',
    description: 'Opportunity has been marked for deletion',
    category: 'completed',
    color: 'text-gray-600 dark:text-gray-400'
  }
]

// Status Label with Info Icon Component  
export function OpportunityStatusLabelWithInfo({ htmlFor, children, selectedValue }: OpportunityStatusLabelWithInfoProps) {
  // Get status data for selected value
  const selectedData = useMemo(() => {
    if (!selectedValue) return null
    return OPPORTUNITY_STATUS_OPTIONS.find(status => status.value === selectedValue) || null
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
                  <Activity className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={`text-xs font-medium shrink-0 ${selectedData.color}`}>
                      {selectedData.label}
                    </Badge>
                  </div>
                  <h4 className="text-sm font-medium leading-tight mt-1">{selectedData.label} Status</h4>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    {selectedData.description}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1 pt-1 border-t border-border/40">
                <Badge variant="secondary" className="text-xs capitalize">
                  {selectedData.category}
                </Badge>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold">Opportunity Status</h4>
              <p className="text-sm text-muted-foreground">
                Filter opportunities by their current status in the procurement lifecycle. 
                This helps you focus on opportunities that match your business priorities.
              </p>
              <div className="space-y-1 text-xs text-muted-foreground">
                <p><span className="font-medium text-green-600">Active:</span> Open for submissions</p>
                <p><span className="font-medium text-yellow-600">Pending:</span> Under evaluation</p>
                <p><span className="font-medium text-blue-600">Closed:</span> No longer accepting submissions</p>
                <p><span className="font-medium text-green-600">Awarded:</span> Contract has been awarded</p>
              </div>
            </div>
          )}
        </HoverCardContent>
      </HoverCard>
    </div>
  )
}

export function OpportunityStatusSelector({ 
  value, 
  onChange, 
  placeholder = "Select status",
  className = "",
  disabled = false,
  multiple = false
}: OpportunityStatusSelectorProps) {
  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // Get the selected status options
  const selectedStatuses = useMemo(() => {
    if (!value) return []
    const values = Array.isArray(value) ? value : [value]
    return values.map(val => OPPORTUNITY_STATUS_OPTIONS.find(status => status.value === val)).filter(Boolean) as OpportunityStatusOption[]
  }, [value])

  const selectedValues = useMemo(() => {
    return Array.isArray(value) ? value : value ? [value] : []
  }, [value])

  // Filter status options based on search query
  const filteredStatuses = useMemo(() => {
    if (!searchQuery.trim()) return OPPORTUNITY_STATUS_OPTIONS
    
    const query = searchQuery.toLowerCase().trim()
    return OPPORTUNITY_STATUS_OPTIONS.filter(status => 
      status.label.toLowerCase().includes(query) ||
      status.description.toLowerCase().includes(query) ||
      status.category.toLowerCase().includes(query)
    )
  }, [searchQuery])

  // Group statuses by category
  const groupedStatuses = useMemo(() => {
    const groups: Record<string, OpportunityStatusOption[]> = {
      active: [],
      inactive: [],
      completed: []
    }
    
    filteredStatuses.forEach(status => {
      groups[status.category].push(status)
    })
    
    return groups
  }, [filteredStatuses])

  const handleSelect = (statusValue: OpportunityStatus) => {
    if (multiple) {
      const currentValues = selectedValues
      const isSelected = currentValues.includes(statusValue)
      
      if (isSelected) {
        // Remove from selection
        const newValues = currentValues.filter(val => val !== statusValue)
        onChange(newValues)
      } else {
        // Add to selection
        const newValues = [...currentValues, statusValue]
        onChange(newValues)
      }
      // Don't close dropdown in multi-select mode
      setSearchQuery('')
    } else {
      // Single select mode
      if (statusValue === value) {
        onChange('' as OpportunityStatus)
      } else {
        onChange(statusValue)
      }
      setOpen(false)
      setSearchQuery('')
    }
  }

  const handleClear = () => {
    onChange(multiple ? [] : '' as OpportunityStatus)
    setOpen(false)
    setSearchQuery('')
  }

  const handleRemoveItem = (statusValue: OpportunityStatus) => {
    if (multiple) {
      const newValues = selectedValues.filter(val => val !== statusValue)
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
            className={`w-full justify-between font-normal pr-8 ${selectedStatuses.length > 0 && multiple ? 'min-h-9 h-auto py-2' : 'h-9'}`}
            disabled={disabled}
          >
            <div className={`flex gap-2 min-w-0 flex-1 ${selectedStatuses.length > 0 && multiple ? 'items-start' : 'items-center'}`}>
              {selectedStatuses.length > 0 ? (
                multiple ? (
                  <div className="flex flex-wrap gap-1 min-w-0 flex-1">
                    {selectedStatuses.map((status) => (
                      <div key={status.value} className="flex items-center gap-1 bg-secondary/50 rounded px-2 py-1">
                        <Activity className="h-3 w-3 text-blue-600 dark:text-blue-400 shrink-0" />
                        <Badge variant="default" className={`text-xs shrink-0 ${status.color}`}>
                          {status.label}
                        </Badge>
                        <div
                          onClick={(e) => {
                            e.stopPropagation()
                            handleRemoveItem(status.value)
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
                    <Activity className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
                    <Badge variant="default" className={`text-xs shrink-0 ${selectedStatuses[0].color}`}>
                      {selectedStatuses[0].label}
                    </Badge>
                    <span className="truncate">{selectedStatuses[0].label}</span>
                  </>
                )
              ) : (
                <span className="text-muted-foreground">
                  {placeholder}
                </span>
              )}
            </div>
            <ChevronsUpDown className={`h-4 w-4 shrink-0 opacity-50 ${selectedStatuses.length > 0 && multiple ? 'self-start mt-0.5' : ''}`} />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
          <Command>
            <CommandInput 
              placeholder="Search statuses..." 
              value={searchQuery}
              onValueChange={setSearchQuery}
            />
            <CommandList className="max-h-96">
              <CommandEmpty>No statuses found.</CommandEmpty>
              
              {/* Active Status Group */}
              {groupedStatuses.active.length > 0 && (
                <CommandGroup heading="Active">
                  {groupedStatuses.active.map((status) => (
                    <CommandItem
                      key={status.value}
                      value={`${status.label} ${status.description} ${status.category}`}
                      onSelect={() => handleSelect(status.value)}
                      className="flex items-center justify-between gap-2 py-2"
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <Activity className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <Badge 
                              variant={selectedValues.includes(status.value) ? "default" : "secondary"} 
                              className={`text-xs shrink-0 font-medium ${status.color}`}
                            >
                              {status.label}
                            </Badge>
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {status.description}
                          </div>
                        </div>
                      </div>
                      <Check
                        className={cn(
                          "h-4 w-4 shrink-0",
                          selectedValues.includes(status.value) ? "opacity-100" : "opacity-0"
                        )}
                      />
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              {/* Inactive Status Group */}
              {groupedStatuses.inactive.length > 0 && (
                <CommandGroup heading="Inactive">
                  {groupedStatuses.inactive.map((status) => (
                    <CommandItem
                      key={status.value}
                      value={`${status.label} ${status.description} ${status.category}`}
                      onSelect={() => handleSelect(status.value)}
                      className="flex items-center justify-between gap-2 py-2"
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <Activity className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <Badge 
                              variant={selectedValues.includes(status.value) ? "default" : "secondary"} 
                              className={`text-xs shrink-0 font-medium ${status.color}`}
                            >
                              {status.label}
                            </Badge>
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {status.description}
                          </div>
                        </div>
                      </div>
                      <Check
                        className={cn(
                          "h-4 w-4 shrink-0",
                          selectedValues.includes(status.value) ? "opacity-100" : "opacity-0"
                        )}
                      />
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              {/* Completed Status Group */}
              {groupedStatuses.completed.length > 0 && (
                <CommandGroup heading="Completed">
                  {groupedStatuses.completed.map((status) => (
                    <CommandItem
                      key={status.value}
                      value={`${status.label} ${status.description} ${status.category}`}
                      onSelect={() => handleSelect(status.value)}
                      className="flex items-center justify-between gap-2 py-2"
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <Activity className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <Badge 
                              variant={selectedValues.includes(status.value) ? "default" : "secondary"} 
                              className={`text-xs shrink-0 font-medium ${status.color}`}
                            >
                              {status.label}
                            </Badge>
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {status.description}
                          </div>
                        </div>
                      </div>
                      <Check
                        className={cn(
                          "h-4 w-4 shrink-0",
                          selectedValues.includes(status.value) ? "opacity-100" : "opacity-0"
                        )}
                      />
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      
      {/* Clear button positioned absolutely */}
      {selectedStatuses.length > 0 && (
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