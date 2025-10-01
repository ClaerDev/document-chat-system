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
import { Check, ChevronsUpDown, X, FileText, Info, Tag } from 'lucide-react'
import { cn } from '@/lib/utils'
import { OpportunityType, OPPORTUNITY_TYPE_LABELS } from '@/types/opportunity-enums'

interface OpportunityTypeSelectorProps {
  value?: OpportunityType | OpportunityType[]
  onChange: (types: OpportunityType | OpportunityType[]) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  multiple?: boolean
}

interface OpportunityTypeLabelWithInfoProps {
  htmlFor?: string
  children: React.ReactNode
  selectedValue?: OpportunityType
}

// Opportunity type metadata with categories and provider info
const OPPORTUNITY_TYPE_METADATA = {
  // SAM.gov Notice Types
  [OpportunityType.SOLICITATION]: { category: 'SAM.gov Procurement', provider: 'SAM.gov', description: 'Active solicitation seeking proposals or bids from contractors', isActive: true },
  [OpportunityType.PRESOLICITATION]: { category: 'SAM.gov Procurement', provider: 'SAM.gov', description: 'Pre-solicitation notice for early market research and vendor outreach', isActive: false },
  [OpportunityType.AWARD_NOTICE]: { category: 'SAM.gov Procurement', provider: 'SAM.gov', description: 'Notice of contract award to winning bidder', isActive: false },
  [OpportunityType.SOURCES_SOUGHT]: { category: 'SAM.gov Procurement', provider: 'SAM.gov', description: 'Market research notice seeking potential sources', isActive: false },
  [OpportunityType.SPECIAL_NOTICE]: { category: 'SAM.gov Procurement', provider: 'SAM.gov', description: 'Administrative notices and special announcements', isActive: false },
  [OpportunityType.JUSTIFICATION]: { category: 'SAM.gov Procurement', provider: 'SAM.gov', description: 'Justification and approval for sole source or limited competition', isActive: false },
  [OpportunityType.SALE_OF_SURPLUS]: { category: 'SAM.gov Procurement', provider: 'SAM.gov', description: 'Government asset disposal and surplus property sales', isActive: true },
  [OpportunityType.COMBINED_SYNOPSIS]: { category: 'SAM.gov Procurement', provider: 'SAM.gov', description: 'Combined synopsis and solicitation in one notice', isActive: true },
  [OpportunityType.INTENT_TO_BUNDLE]: { category: 'SAM.gov Procurement', provider: 'SAM.gov', description: 'Notice of intent to bundle multiple requirements', isActive: false },

  // Request Types
  [OpportunityType.RFP]: { category: 'Request Types', provider: 'Multi-Provider', description: 'Request for Proposals for complex procurements requiring technical solutions', isActive: true },
  [OpportunityType.RFQ]: { category: 'Request Types', provider: 'Multi-Provider', description: 'Request for Quotations for price-based competition on well-defined requirements', isActive: true },
  [OpportunityType.RFI]: { category: 'Request Types', provider: 'Multi-Provider', description: 'Request for Information for market research and capability assessment', isActive: false },
  [OpportunityType.IFB]: { category: 'Request Types', provider: 'Multi-Provider', description: 'Invitation for Bids using sealed bidding process', isActive: true },

  // Amendment Types
  [OpportunityType.AMENDMENT]: { category: 'Amendments', provider: 'Multi-Provider', description: 'Amendment to existing opportunity with changes or clarifications', isActive: true },
  [OpportunityType.MODIFICATION]: { category: 'Amendments', provider: 'Multi-Provider', description: 'Contract modification changing terms or scope', isActive: false },
  [OpportunityType.NOTICE]: { category: 'Amendments', provider: 'Multi-Provider', description: 'General notice of intent or informational announcement', isActive: false },

  // Grants.gov Types
  [OpportunityType.GRANT_DISCRETIONARY]: { category: 'Grants.gov', provider: 'Grants.gov', description: 'Discretionary grant with competitive application process', isActive: true },
  [OpportunityType.GRANT_CONTINUATION]: { category: 'Grants.gov', provider: 'Grants.gov', description: 'Continuation of existing grant program funding', isActive: true },
  [OpportunityType.GRANT_MANDATORY]: { category: 'Grants.gov', provider: 'Grants.gov', description: 'Mandatory grant with predetermined eligible recipients', isActive: true },
  [OpportunityType.GRANT_EARMARK]: { category: 'Grants.gov', provider: 'Grants.gov', description: 'Congressional earmark or directed funding', isActive: true },
  [OpportunityType.GRANT_OTHER]: { category: 'Grants.gov', provider: 'Grants.gov', description: 'Other specialized grant types and programs', isActive: true },
  [OpportunityType.COOPERATIVE_AGREEMENT]: { category: 'Grants.gov', provider: 'Multi-Provider', description: 'Cooperative agreement with substantial government involvement', isActive: true },

  // Contract Award Types
  [OpportunityType.CONTRACT_AWARD]: { category: 'FPDS-NG Awards', provider: 'FPDS-NG', description: 'Contract award reported in FPDS-NG system', isActive: false },
  [OpportunityType.DELIVERY_ORDER]: { category: 'FPDS-NG Awards', provider: 'FPDS-NG', description: 'Delivery order against existing IDIQ contract', isActive: true },
  [OpportunityType.TASK_ORDER]: { category: 'FPDS-NG Awards', provider: 'FPDS-NG', description: 'Task order against existing IDIQ contract', isActive: true },
  [OpportunityType.BPA_CALL]: { category: 'FPDS-NG Awards', provider: 'FPDS-NG', description: 'Call order against Blanket Purchase Agreement', isActive: true },
  [OpportunityType.PURCHASE_ORDER]: { category: 'FPDS-NG Awards', provider: 'FPDS-NG', description: 'Simple purchase order for goods or services', isActive: true },

  // USASpending Types
  [OpportunityType.CONTRACT_NEW]: { category: 'USASpending', provider: 'USASpending.gov', description: 'New contract transaction reported in USASpending', isActive: false },
  [OpportunityType.CONTRACT_CONTINUE]: { category: 'USASpending', provider: 'USASpending.gov', description: 'Continuing contract transaction', isActive: false },
  [OpportunityType.CONTRACT_MODIFY]: { category: 'USASpending', provider: 'USASpending.gov', description: 'Contract modification transaction', isActive: false },
  [OpportunityType.ASSISTANCE_BLOCK_GRANT]: { category: 'USASpending Assistance', provider: 'USASpending.gov', description: 'Block grant assistance program', isActive: true },
  [OpportunityType.ASSISTANCE_FORMULA_GRANT]: { category: 'USASpending Assistance', provider: 'USASpending.gov', description: 'Formula-based grant assistance', isActive: true },
  [OpportunityType.ASSISTANCE_PROJECT_GRANT]: { category: 'USASpending Assistance', provider: 'USASpending.gov', description: 'Project-specific grant assistance', isActive: true },
  [OpportunityType.ASSISTANCE_COOP_AGREEMENT]: { category: 'USASpending Assistance', provider: 'USASpending.gov', description: 'Cooperative agreement assistance', isActive: true },

  // Special Procurement
  [OpportunityType.GSA_SCHEDULE]: { category: 'Special Procurement', provider: 'Multi-Provider', description: 'GSA Schedule contract vehicle opportunity', isActive: true },
  [OpportunityType.OASIS]: { category: 'Special Procurement', provider: 'Multi-Provider', description: 'OASIS contract vehicle opportunity', isActive: true },
  [OpportunityType.SEWP]: { category: 'Special Procurement', provider: 'Multi-Provider', description: 'SEWP contract vehicle opportunity', isActive: true },
  [OpportunityType.CIO_SP3]: { category: 'Special Procurement', provider: 'Multi-Provider', description: 'CIO-SP3 contract vehicle opportunity', isActive: true },
  [OpportunityType.MICRO_PURCHASE]: { category: 'Special Procurement', provider: 'Multi-Provider', description: 'Micro-purchase under $10,000 threshold', isActive: true },

  // Legacy
  [OpportunityType.GRANT]: { category: 'Legacy', provider: 'Multi-Provider', description: 'Generic grant opportunity (legacy compatibility)', isActive: true },
  [OpportunityType.OTHER]: { category: 'Legacy', provider: 'Multi-Provider', description: 'Other opportunity types not categorized', isActive: true },
} as const

// Opportunity Type Label with Info Icon Component  
export function OpportunityTypeLabelWithInfo({ htmlFor, children, selectedValue }: OpportunityTypeLabelWithInfoProps) {
  // Get opportunity type metadata for selected value
  const selectedData = useMemo(() => {
    if (!selectedValue) return null
    return {
      type: selectedValue,
      label: OPPORTUNITY_TYPE_LABELS[selectedValue],
      ...OPPORTUNITY_TYPE_METADATA[selectedValue]
    }
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
                  <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs font-mono shrink-0">
                      {selectedData.type}
                    </Badge>
                  </div>
                  <h4 className="text-sm font-medium leading-tight mt-1">{selectedData.label}</h4>
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
                  {selectedData.provider}
                </Badge>
                {selectedData.isActive && (
                  <Badge variant="secondary" className="text-xs text-green-700 dark:text-green-300">
                    <Tag className="w-3 h-3 mr-1" />
                    Biddable
                  </Badge>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <h4 className="text-sm font-semibold">Opportunity Types</h4>
              <p className="text-sm text-muted-foreground">
                Filter opportunities by their type classification from government data providers including SAM.gov, Grants.gov, FPDS-NG, and USASpending.gov.
              </p>
              <p className="text-xs text-muted-foreground font-medium">
                💡 Select an opportunity type first to see detailed information here.
              </p>
            </div>
          )}
        </HoverCardContent>
      </HoverCard>
    </div>
  )
}

export function OpportunityTypeSelector({
  value,
  onChange,
  placeholder = "Select opportunity types",
  className = "",
  disabled = false,
  multiple = false
}: OpportunityTypeSelectorProps) {
  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  // Get all available opportunity types
  const allOpportunityTypes = useMemo(() => {
    return Object.values(OpportunityType).map(type => ({
      type,
      label: OPPORTUNITY_TYPE_LABELS[type],
      ...OPPORTUNITY_TYPE_METADATA[type]
    }))
  }, [])

  // Get selected opportunity types
  const selectedOpportunityTypes = useMemo(() => {
    if (!value) return []
    const values = Array.isArray(value) ? value : [value]
    return values.map(val => ({
      type: val,
      label: OPPORTUNITY_TYPE_LABELS[val],
      ...OPPORTUNITY_TYPE_METADATA[val]
    }))
  }, [value])

  const selectedValues = useMemo(() => {
    return Array.isArray(value) ? value : value ? [value] : []
  }, [value])

  // Filter opportunity types based on search query
  const filteredOpportunityTypes = useMemo(() => {
    if (!searchQuery.trim()) {
      return allOpportunityTypes
    }
    
    const query = searchQuery.trim().toLowerCase()
    
    return allOpportunityTypes.filter(item =>
      item.type.toLowerCase().includes(query) ||
      item.label.toLowerCase().includes(query) ||
      item.description.toLowerCase().includes(query) ||
      item.category.toLowerCase().includes(query) ||
      item.provider.toLowerCase().includes(query)
    )
  }, [allOpportunityTypes, searchQuery])

  // Group opportunity types by category
  const groupedOpportunityTypes = useMemo(() => {
    const groups: Record<string, typeof allOpportunityTypes> = {}
    
    filteredOpportunityTypes.forEach(item => {
      if (!groups[item.category]) {
        groups[item.category] = []
      }
      groups[item.category].push(item)
    })

    // Sort groups by category priority and types within groups by label
    const sortedGroups: Record<string, typeof allOpportunityTypes> = {}
    const categoryOrder = [
      'SAM.gov Procurement', 
      'Request Types', 
      'Grants.gov', 
      'FPDS-NG Awards', 
      'Special Procurement',
      'USASpending',
      'USASpending Assistance',
      'Amendments', 
      'Legacy'
    ]
    
    categoryOrder.forEach(category => {
      if (groups[category]) {
        sortedGroups[category] = groups[category].sort((a, b) => a.label.localeCompare(b.label))
      }
    })
    
    return sortedGroups
  }, [filteredOpportunityTypes])

  const handleSelect = (opportunityType: OpportunityType) => {
    if (multiple) {
      const currentValues = selectedValues
      const isSelected = currentValues.includes(opportunityType)
      
      if (isSelected) {
        // Remove from selection
        const newValues = currentValues.filter(val => val !== opportunityType)
        onChange(newValues)
      } else {
        // Add to selection
        const newValues = [...currentValues, opportunityType]
        onChange(newValues)
      }
      // Don't close dropdown in multi-select mode
      setSearchQuery('')
    } else {
      // Single select mode
      if (opportunityType === value) {
        onChange('' as OpportunityType)
      } else {
        onChange(opportunityType)
      }
      setOpen(false)
      setSearchQuery('')
    }
  }

  const handleClear = () => {
    onChange(multiple ? [] : '' as OpportunityType)
    setOpen(false)
    setSearchQuery('')
  }

  const handleRemoveItem = (opportunityType: OpportunityType) => {
    if (multiple) {
      const newValues = selectedValues.filter(val => val !== opportunityType)
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
              className={`w-full justify-between font-normal pr-8 ${selectedOpportunityTypes.length > 0 && multiple ? 'min-h-9 h-auto py-2' : 'h-9'}`}
              disabled={disabled}
            >
              <div className={`flex gap-2 min-w-0 flex-1 ${selectedOpportunityTypes.length > 0 && multiple ? 'items-start' : 'items-center'}`}>
                {selectedOpportunityTypes.length > 0 ? (
                  multiple ? (
                    <div className="flex flex-wrap gap-1 min-w-0 flex-1">
                      {selectedOpportunityTypes.map((item) => (
                        <div key={item.type} className="flex items-center gap-1 bg-secondary/50 rounded px-2 py-1">
                          <Badge variant="default" className="text-xs shrink-0">
                            {item.label}
                          </Badge>
                          <div className="flex items-center gap-1">
                            {item.isActive && (
                              <Tag className="w-3 h-3 text-green-600 dark:text-green-400" title="Biddable opportunity" />
                            )}
                          </div>
                          <span
                            onClick={(e) => {
                              e.stopPropagation()
                              handleRemoveItem(item.type)
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
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <Badge variant="default" className="text-xs shrink-0">
                        {selectedOpportunityTypes[0].label}
                      </Badge>
                      <div className="flex items-center gap-1">
                        {selectedOpportunityTypes[0].isActive && (
                          <Tag className="w-3 h-3 text-green-600 dark:text-green-400" title="Biddable opportunity" />
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
                placeholder="Search opportunity types..." 
                value={searchQuery}
                onValueChange={setSearchQuery}
              />
              <CommandList className="max-h-96">
                <CommandEmpty>No opportunity types found.</CommandEmpty>
                {Object.entries(groupedOpportunityTypes).map(([categoryName, items]) => (
                  <CommandGroup key={categoryName} heading={categoryName}>
                    {items.map((item) => (
                      <CommandItem
                        key={item.type}
                        value={`${item.type} ${item.label} ${item.description}`}
                        onSelect={() => handleSelect(item.type)}
                        className="flex items-center justify-between gap-2 py-2"
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <Badge variant={selectedValues.includes(item.type) ? "default" : "secondary"} className="text-xs shrink-0">
                                {item.label}
                              </Badge>
                              <div className="flex items-center gap-1">
                                {item.isActive && (
                                  <Badge variant="outline" className="text-xs px-1 py-0 text-green-700 dark:text-green-400 border-green-300 dark:border-green-600">
                                    <Tag className="w-3 h-3" />
                                  </Badge>
                                )}
                                <Badge variant="outline" className="text-xs px-1 py-0">
                                  {item.provider}
                                </Badge>
                              </div>
                            </div>
                            <div className="text-xs text-muted-foreground truncate mt-0.5">
                              {item.description}
                            </div>
                          </div>
                        </div>
                        <Check
                          className={cn(
                            "h-4 w-4 shrink-0",
                            selectedValues.includes(item.type) ? "opacity-100" : "opacity-0"
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
        {selectedOpportunityTypes.length > 0 && (
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