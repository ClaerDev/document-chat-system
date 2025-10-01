'use client'

import React from 'react'
import { 
  ChevronDown, 
  ChevronRight,
  Building2,
  Leaf,
  Factory,
  Truck,
  Search,
  X,
  Check,
  Filter,
  RotateCcw
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { getSearchableNAICSCodes } from '@/lib/naics'
import { naicsRawData } from '@/lib/naics-data'
import type { NAICSCode } from '@/types/naics'

interface AdvancedNAICSSelectorProps {
  selectedCodes: string[]
  onCodesChange: (codes: string[]) => void
  maxCodes?: number
  className?: string
}

interface FlattenedNAICS {
  code: string | number
  definition: string
  description: string
  level: string
  levelNum: number
  path: string
  examples: string[]
}

export function AdvancedNAICSSelector({
  selectedCodes,
  onCodesChange,
  maxCodes = 1000,
  className = ''
}: AdvancedNAICSSelectorProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const [openSubmenus, setOpenSubmenus] = React.useState<Record<string, boolean>>({})
  const [searchTerm, setSearchTerm] = React.useState('')
  const [searchMode, setSearchMode] = React.useState('all') // 'all', 'code', 'definition', 'description', 'examples'
  const dropdownRef = React.useRef<HTMLDivElement>(null)
  const searchInputRef = React.useRef<HTMLInputElement>(null)

  // Flatten all NAICS codes for search
  const flattenNAICSData = React.useCallback((): FlattenedNAICS[] => {
    const flattened: FlattenedNAICS[] = []
    
    if (!naicsRawData || !naicsRawData["2022"]) {
      console.warn('[Advanced NAICS] No data available')
      return flattened
    }

    naicsRawData["2022"].forEach(sector => {
      flattened.push({
        code: sector.sector,
        definition: sector.definition.replace(/T$/, ''),
        description: sector.description,
        level: 'Sector',
        levelNum: 1,
        path: `sector-${sector.sector}`,
        examples: []
      })

      sector.subsectors?.forEach(subsector => {
        flattened.push({
          code: subsector.code,
          definition: subsector.definition.replace(/T$/, ''),
          description: subsector.description,
          level: 'Subsector',
          levelNum: 2,
          path: `sector-${sector.sector}/subsector-${subsector.code}`,
          examples: []
        })

        subsector.industryGroups?.forEach(group => {
          flattened.push({
            code: group.code,
            definition: group.definition.replace(/T$/, ''),
            description: group.description || '',
            level: 'Industry Group',
            levelNum: 3,
            path: `sector-${sector.sector}/subsector-${subsector.code}/group-${group.code}`,
            examples: []
          })

          group.industries?.forEach(industry => {
            flattened.push({
              code: industry.code,
              definition: industry.definition.replace(/T$/, ''),
              description: industry.description || '',
              level: 'Industry',
              levelNum: 4,
              path: `sector-${sector.sector}/subsector-${subsector.code}/group-${group.code}/industry-${industry.code}`,
              examples: []
            })

            industry.nationalIndustries?.forEach(national => {
              flattened.push({
                code: national.code,
                definition: national.definition,
                description: national.description,
                level: 'National Industry',
                levelNum: 5,
                path: `sector-${sector.sector}/subsector-${subsector.code}/group-${group.code}/industry-${industry.code}/national-${national.code}`,
                examples: [] // JSON doesn't have examples, but structure is ready
              })
            })
          })
        })
      })
    })

    return flattened
  }, [])

  const allCodes = React.useMemo(() => flattenNAICSData(), [flattenNAICSData])

  // Advanced search function - only return National Industries (6-digit codes)
  const searchCodes = React.useMemo(() => {
    if (!searchTerm.trim()) return []

    const searchLower = searchTerm.toLowerCase()
    const terms = searchLower.split(' ').filter(t => t.length > 0)

    // Only search National Industries (6-digit codes)
    const filteredCodes = allCodes.filter(item => {
      // First filter: only National Industries
      if (item.level !== 'National Industry') return false

      // Search mode filter
      const searchFields: string[] = []
      
      switch (searchMode) {
        case 'code':
          searchFields.push(item.code.toString())
          break
        case 'definition':
          searchFields.push(item.definition)
          break
        case 'description':
          searchFields.push(item.description)
          break
        case 'examples':
          searchFields.push(...item.examples)
          break
        default: // 'all'
          searchFields.push(
            item.code.toString(),
            item.definition,
            item.description,
            ...item.examples
          )
      }

      const searchText = searchFields.join(' ').toLowerCase()

      // Check if all terms are found (AND logic)
      return terms.every(term => searchText.includes(term))
    })

    return filteredCodes.slice(0, 50) // Limit results for performance
  }, [searchTerm, searchMode, allCodes])

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setOpenSubmenus({})
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Focus search input when dropdown opens
  React.useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 100)
    }
  }, [isOpen])

  const toggleSubmenu = (path: string) => {
    setOpenSubmenus(prev => ({
      ...prev,
      [path]: !prev[path]
    }))
  }

  const handleSelect = (code: string | number, definition: string, level: string) => {
    // Only allow selection of National Industries (6-digit codes)
    if (level !== 'National Industry') return
    
    const codeStr = code.toString()
    
    if (selectedCodes.includes(codeStr)) {
      // Remove if already selected
      onCodesChange(selectedCodes.filter(c => c !== codeStr))
    } else if (selectedCodes.length < maxCodes) {
      // Add if under limit
      onCodesChange([...selectedCodes, codeStr])
    }
  }

  const removeSelected = (codeToRemove: string) => {
    onCodesChange(selectedCodes.filter(code => code !== codeToRemove))
  }

  const clearAll = () => {
    onCodesChange([])
  }

  const clearSearch = () => {
    setSearchTerm('')
  }

  const isSelected = (code: string | number) => {
    return selectedCodes.includes(code.toString())
  }

  const isSelectable = (level: string) => {
    return level === 'National Industry'
  }

  const getSectorIcon = (sectorCode: number) => {
    switch (sectorCode) {
      case 11:
        return <Leaf className="w-4 h-4 text-green-600" />
      case 21:
        return <Factory className="w-4 h-4 text-orange-600" />
      case 22:
        return <Building2 className="w-4 h-4 text-blue-600" />
      case 48:
        return <Truck className="w-4 h-4 text-purple-600" />
      default:
        return <Building2 className="w-4 h-4 text-gray-600 dark:text-gray-400" />
    }
  }

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'Sector': return 'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30'
      case 'Subsector': return 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/30'
      case 'Industry Group': return 'text-orange-600 bg-orange-100 dark:text-orange-400 dark:bg-orange-900/30'
      case 'Industry': return 'text-purple-600 bg-purple-100 dark:text-purple-400 dark:bg-purple-900/30'
      case 'National Industry': return 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/30'
      default: return 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-800'
    }
  }

  const highlightMatch = (text: string, searchTerm: string) => {
    if (!searchTerm) return text
    
    const terms = searchTerm.toLowerCase().split(' ').filter(t => t.length > 0)
    let highlightedText = text
    
    terms.forEach(term => {
      const regex = new RegExp(`(${term})`, 'gi')
      highlightedText = highlightedText.replace(regex, '<mark class="bg-yellow-200 dark:bg-yellow-800 px-1 rounded">$1</mark>')
    })
    
    return highlightedText
  }

  // Get details for selected codes
  const selectedCodesDetails = React.useMemo(() => {
    return selectedCodes.map(code => {
      const details = allCodes.find(c => c.code.toString() === code)
      return {
        code,
        definition: details?.definition || 'Unknown Code',
        level: details?.level || 'Unknown'
      }
    })
  }, [selectedCodes, allCodes])

  return (
    <div className={`${className}`}>
      {/* Selected Codes Display */}
      {selectedCodes.length > 0 && (
        <div className="mb-6 p-4 bg-card border border-border rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-card-foreground">
              Selected NAICS Codes ({selectedCodes.length})
            </h4>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                clearAll()
              }}
              className="text-destructive hover:text-destructive"
            >
              <X className="w-3 h-3 mr-1" />
              Clear All
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {selectedCodesDetails.map((item) => (
              <div
                key={item.code}
                className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg px-3 py-2"
              >
                <span className="font-mono text-blue-800 dark:text-blue-400 font-medium">{item.code}</span>
                <span className="text-sm text-muted-foreground max-w-xs truncate">{item.definition}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    removeSelected(item.code)
                  }}
                  className="h-auto p-0 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* NAICS Dropdown */}
      <div className="relative w-full max-w-4xl" ref={dropdownRef}>
        <Button
          type="button"
          variant="outline"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            setIsOpen(!isOpen)
          }}
          className="w-full justify-between h-12"
          disabled={selectedCodes.length >= maxCodes}
        >
          <span className="flex items-center">
            <Building2 className="w-4 h-4 mr-2" />
            {selectedCodes.length > 0 
              ? `${selectedCodes.length} codes selected` 
              : 'Search and select NAICS codes'}
          </span>
          <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </Button>

        {isOpen && (
          <div className="absolute left-0 z-50 mt-2 w-full rounded-md border border-border bg-popover shadow-lg">
            {/* Search Header */}
            <div className="p-4 border-b border-border bg-muted/50">
              <div className="relative mb-3">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                <Input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search NAICS codes, definitions, descriptions, or examples..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-10"
                />
                {searchTerm && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      clearSearch()
                    }}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 h-auto p-0 text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>

              {/* Search Filters */}
              <div className="flex gap-2 text-sm items-center">
                <div className="flex items-center gap-1">
                  <Filter className="w-3 h-3 text-muted-foreground" />
                  <span className="text-muted-foreground">Search in:</span>
                </div>
                <select
                  value={searchMode}
                  onChange={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setSearchMode(e.target.value)
                  }}
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                  }}
                  className="text-xs border border-input rounded px-2 py-1 bg-background"
                >
                  <option value="all">All Fields</option>
                  <option value="code">Codes Only</option>
                  <option value="definition">Definitions</option>
                  <option value="description">Descriptions</option>
                  <option value="examples">Examples</option>
                </select>

                {(searchTerm || searchMode !== 'all') && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      setSearchTerm('')
                      setSearchMode('all')
                    }}
                    className="h-auto py-1 px-2 text-xs text-primary hover:text-primary/80"
                  >
                    <RotateCcw className="w-3 h-3 mr-1" />
                    Reset
                  </Button>
                )}
              </div>
            </div>

            {/* Results */}
            <div className="max-h-96 overflow-y-auto">
              {searchTerm ? (
                // Search Results
                <div className="py-2">
                  {searchCodes.length > 0 ? (
                    <>
                      <div className="px-4 py-2 text-xs text-muted-foreground bg-muted/30 border-b border-border">
                        {searchCodes.length} National Industr{searchCodes.length !== 1 ? 'ies' : 'y'} found
                        {searchCodes.length === 50 ? ' (limited to 50)' : ''}
                      </div>
                      {searchCodes.map((item) => (
                        <SearchResultItem
                          key={item.code}
                          item={item}
                          searchTerm={searchTerm}
                          isSelected={isSelected(item.code)}
                          onSelect={() => handleSelect(item.code, item.definition, item.level)}
                          highlightMatch={highlightMatch}
                          getLevelColor={getLevelColor}
                          isSelectable={isSelectable}
                        />
                      ))}
                    </>
                  ) : (
                    <div className="p-8 text-center text-muted-foreground">
                      <Search className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
                      <p>No National Industries found</p>
                      <p className="text-xs mt-1">Try different search terms or search mode</p>
                    </div>
                  )}
                </div>
              ) : (
                // Hierarchical Browse
                <div className="py-1">
                  {naicsRawData && naicsRawData["2022"] && naicsRawData["2022"].map((sector) => (
                    <SectorItem
                      key={sector.sector}
                      sector={sector}
                      isOpen={openSubmenus[`sector-${sector.sector}`]}
                      onToggle={() => toggleSubmenu(`sector-${sector.sector}`)}
                      onSelect={handleSelect}
                      openSubmenus={openSubmenus}
                      toggleSubmenu={toggleSubmenu}
                      getSectorIcon={getSectorIcon}
                      isSelected={isSelected}
                      isSelectable={isSelectable}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Search Result Item Component
const SearchResultItem = ({ 
  item, 
  searchTerm, 
  isSelected, 
  onSelect, 
  highlightMatch, 
  getLevelColor,
  isSelectable
}: {
  item: FlattenedNAICS
  searchTerm: string
  isSelected: boolean
  onSelect: () => void
  highlightMatch: (text: string, searchTerm: string) => string
  getLevelColor: (level: string) => string
  isSelectable: (level: string) => boolean
}) => {
  const canSelect = isSelectable(item.level)
  
  return (
    <button
      type="button"
      className={`flex items-start w-full px-4 py-3 text-left hover:bg-muted/50 border-b border-border/50 transition-colors ${
        isSelected && canSelect ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' : ''
      } ${!canSelect ? 'cursor-default' : ''}`}
      onClick={canSelect ? (e) => {
        e.preventDefault()
        e.stopPropagation()
        onSelect()
      } : undefined}
    >
      <div className="flex-shrink-0 mt-1">
        {canSelect ? (
          isSelected ? (
            <Check className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          ) : (
            <div className="w-4 h-4 border border-input rounded hover:border-primary"></div>
          )
        ) : (
          <div className="w-4 h-4 border border-muted rounded bg-muted/50"></div>
        )}
      </div>
      
      <div className="ml-3 flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className={`font-mono text-sm font-medium px-2 py-1 rounded ${getLevelColor(item.level)}`}>
            {item.code}
          </span>
          <span className="text-xs text-muted-foreground">{item.level}</span>
          {!canSelect && (
            <Badge variant="secondary" className="text-xs">Browse only</Badge>
          )}
        </div>
        
        <h4 
          className="text-sm font-medium text-foreground mb-1"
          dangerouslySetInnerHTML={{ __html: highlightMatch(item.definition, searchTerm) }}
        />
        
        <p 
          className="text-xs text-muted-foreground line-clamp-2"
          dangerouslySetInnerHTML={{ __html: highlightMatch(item.description, searchTerm) }}
        />
        
        {item.examples.length > 0 && (
          <div className="mt-2 text-xs text-muted-foreground">
            <span className="font-medium">Examples: </span>
            <span 
              dangerouslySetInnerHTML={{ 
                __html: highlightMatch(item.examples.slice(0, 3).join(', '), searchTerm) 
              }}
            />
            {item.examples.length > 3 && (
              <span className="text-muted-foreground/70"> +{item.examples.length - 3} more</span>
            )}
          </div>
        )}
      </div>
    </button>
  )
}

// Sector Component
const SectorItem = ({ 
  sector, 
  isOpen, 
  onToggle, 
  onSelect, 
  openSubmenus, 
  toggleSubmenu,
  getSectorIcon,
  isSelected,
  isSelectable
}: {
  sector: any
  isOpen: boolean
  onToggle: () => void
  onSelect: (code: string | number, definition: string, level: string) => void
  openSubmenus: Record<string, boolean>
  toggleSubmenu: (path: string) => void
  getSectorIcon: (sectorCode: number) => JSX.Element
  isSelected: (code: string | number) => boolean
  isSelectable: (level: string) => boolean
}) => {
  return (
    <div>
      <div className="border-b border-border/50">
        <div className="flex items-center">
          <button
            type="button"
            className="flex items-center flex-1 px-4 py-3 text-sm font-medium text-foreground hover:bg-muted/50 transition-colors"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onToggle()
            }}
          >
            {getSectorIcon(sector.sector)}
            <span className="ml-3 flex-1 text-left">
              <span className="font-mono text-blue-600 dark:text-blue-400 mr-2">{sector.sector}</span>
              {sector.definition.replace(/T$/, '')}
            </span>
            <ChevronRight 
              className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-90' : ''}`} 
            />
          </button>
          
          <div className="mr-2 p-1">
            <div className="w-4 h-4 border border-muted rounded bg-muted/50"></div>
          </div>
        </div>
      </div>

      {isOpen && sector.subsectors && (
        <div className="bg-muted/30">
          {sector.subsectors.map((subsector: any) => (
            <SubsectorItem
              key={subsector.code}
              subsector={subsector}
              sectorCode={sector.sector}
              isOpen={openSubmenus[`subsector-${subsector.code}`]}
              onToggle={() => toggleSubmenu(`subsector-${subsector.code}`)}
              onSelect={onSelect}
              openSubmenus={openSubmenus}
              toggleSubmenu={toggleSubmenu}
              isSelected={isSelected}
              isSelectable={isSelectable}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// Subsector Item Component
const SubsectorItem = ({ 
  subsector, 
  sectorCode, 
  isOpen, 
  onToggle, 
  onSelect, 
  openSubmenus, 
  toggleSubmenu,
  isSelected,
  isSelectable
}: {
  subsector: any
  sectorCode: number
  isOpen: boolean
  onToggle: () => void
  onSelect: (code: string | number, definition: string, level: string) => void
  openSubmenus: Record<string, boolean>
  toggleSubmenu: (path: string) => void
  isSelected: (code: string | number) => boolean
  isSelectable: (level: string) => boolean
}) => {
  return (
    <div>
      <div className="flex items-center">
        <button
          type="button"
          className="flex items-center flex-1 px-8 py-2 text-sm text-muted-foreground hover:bg-muted/50 transition-colors"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onToggle()
          }}
        >
          <span className="flex-1 text-left">
            <span className="font-mono text-green-600 dark:text-green-400 mr-2">{subsector.code}</span>
            {subsector.definition.replace(/T$/, '')}
          </span>
          <ChevronRight 
            className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-90' : ''}`} 
          />
        </button>
        
        <div className="mr-2 p-1">
          <div className="w-4 h-4 border border-muted rounded bg-muted/50"></div>
        </div>
      </div>

      {isOpen && subsector.industryGroups && (
        <div className="bg-card">
          {subsector.industryGroups.map((group: any) => (
            <IndustryGroupItem
              key={group.code}
              group={group}
              isOpen={openSubmenus[`group-${group.code}`]}
              onToggle={() => toggleSubmenu(`group-${group.code}`)}
              onSelect={onSelect}
              openSubmenus={openSubmenus}
              toggleSubmenu={toggleSubmenu}
              isSelected={isSelected}
              isSelectable={isSelectable}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// Industry Group Item Component
const IndustryGroupItem = ({ 
  group, 
  isOpen, 
  onToggle, 
  onSelect, 
  openSubmenus, 
  toggleSubmenu,
  isSelected,
  isSelectable
}: {
  group: any
  isOpen: boolean
  onToggle: () => void
  onSelect: (code: string | number, definition: string, level: string) => void
  openSubmenus: Record<string, boolean>
  toggleSubmenu: (path: string) => void
  isSelected: (code: string | number) => boolean
  isSelectable: (level: string) => boolean
}) => {
  return (
    <div>
      <div className="flex items-center">
        <button
          type="button"
          className="flex items-center flex-1 px-12 py-2 text-sm text-muted-foreground hover:bg-muted/50 transition-colors"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onToggle()
          }}
        >
          <span className="flex-1 text-left">
            <span className="font-mono text-orange-600 dark:text-orange-400 mr-2">{group.code}</span>
            {group.definition.replace(/T$/, '')}
          </span>
          <ChevronRight 
            className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-90' : ''}`} 
          />
        </button>
        
        <div className="mr-2 p-1">
          <div className="w-4 h-4 border border-muted rounded bg-muted/50"></div>
        </div>
      </div>

      {isOpen && group.industries && (
        <div className="bg-muted/30">
          {group.industries.map((industry: any) => (
            <IndustryItem
              key={industry.code}
              industry={industry}
              isOpen={openSubmenus[`industry-${industry.code}`]}
              onToggle={() => toggleSubmenu(`industry-${industry.code}`)}
              onSelect={onSelect}
              openSubmenus={openSubmenus}
              toggleSubmenu={toggleSubmenu}
              isSelected={isSelected}
              isSelectable={isSelectable}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// Industry Item Component
const IndustryItem = ({ 
  industry, 
  isOpen, 
  onToggle, 
  onSelect, 
  openSubmenus, 
  toggleSubmenu,
  isSelected,
  isSelectable
}: {
  industry: any
  isOpen: boolean
  onToggle: () => void
  onSelect: (code: string | number, definition: string, level: string) => void
  openSubmenus: Record<string, boolean>
  toggleSubmenu: (path: string) => void
  isSelected: (code: string | number) => boolean
  isSelectable: (level: string) => boolean
}) => {
  return (
    <div>
      <div className="flex items-center">
        <button
          type="button"
          className="flex items-center flex-1 px-16 py-2 text-sm text-muted-foreground hover:bg-muted/50 transition-colors"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onToggle()
          }}
        >
          <span className="flex-1 text-left">
            <span className="font-mono text-purple-600 dark:text-purple-400 mr-2">{industry.code}</span>
            {industry.definition.replace(/T$/, '')}
          </span>
          <ChevronRight 
            className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-90' : ''}`} 
          />
        </button>
        
        <div className="mr-2 p-1">
          <div className="w-4 h-4 border border-muted rounded bg-muted/50"></div>
        </div>
      </div>

      {isOpen && industry.nationalIndustries && (
        <div className="bg-card">
          {industry.nationalIndustries.map((national: any) => (
            <div key={national.code}>
              <div className="flex items-center">
                <button
                  type="button"
                  className="flex items-center flex-1 px-20 py-2 text-sm text-muted-foreground hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    onSelect(national.code, national.definition, 'National Industry')
                  }}
                >
                  <span className="flex-1 text-left">
                    <span className="font-mono text-red-600 dark:text-red-400 mr-2">{national.code}</span>
                    {national.definition}
                  </span>
                </button>
                
                <button
                  type="button"
                  className={`mr-2 p-1 rounded hover:bg-muted/50 ${
                    isSelected(national.code) ? 'text-blue-600 dark:text-blue-400' : 'text-muted-foreground'
                  }`}
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    onSelect(national.code, national.definition, 'National Industry')
                  }}
                >
                  {isSelected(national.code) ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <div className="w-4 h-4 border border-input rounded hover:border-primary"></div>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}