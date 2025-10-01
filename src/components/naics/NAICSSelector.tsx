'use client'

import { useState, useEffect, useMemo } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
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
  Search, 
  Plus, 
  X, 
  Building, 
  Code, 
  Star, 
  Info,
  Check,
  ChevronsUpDown,
  Loader2
} from 'lucide-react'
import { 
  searchNAICSCodes, 
  findNAICSByCode, 
  validateNAICSCode,
  formatNAICSCode
} from '@/lib/naics'
import type { 
  NAICSSearchResult
} from '@/types/naics'

interface NAICSSelectorProps {
  selectedCodes: string[]
  primaryCode?: string
  onCodesChange: (codes: string[], primary?: string) => void
  maxCodes?: number
  placeholder?: string
  allowCustomInput?: boolean
  className?: string
}


export function NAICSSelector({
  selectedCodes,
  primaryCode,
  onCodesChange,
  maxCodes = 10,
  placeholder = "Search NAICS codes...",
  allowCustomInput = true,
  className
}: NAICSSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<NAICSSearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [customInput, setCustomInput] = useState('')
  const [validationMessage, setValidationMessage] = useState('')
  const [open, setOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('search')

  // Debounced search effect - now also works with empty query
  useEffect(() => {
    setIsSearching(true)
    const timeoutId = setTimeout(() => {
      const results = searchNAICSCodes(searchQuery, {
        includeDescriptions: true,
        levels: ['nationalIndustry', 'industry', 'industryGroup'] // Focus on most useful levels
      })
      setSearchResults(results)
      setIsSearching(false)
    }, searchQuery.trim() ? 300 : 0) // No delay for empty search

    return () => clearTimeout(timeoutId)
  }, [searchQuery])

  // Load initial results when dropdown opens
  useEffect(() => {
    if (open && searchResults.length === 0 && !searchQuery.trim()) {
      const results = searchNAICSCodes('', {
        includeDescriptions: true,
        levels: ['nationalIndustry', 'industry', 'industryGroup']
      })
      setSearchResults(results)
    }
  }, [open])

  // Get details for selected codes
  const selectedCodesDetails = useMemo(() => {
    return selectedCodes.map(code => {
      const details = findNAICSByCode(code)
      return {
        code,
        title: details?.title || 'Unknown Code',
        description: details?.description || '',
        isPrimary: code === primaryCode
      }
    })
  }, [selectedCodes, primaryCode])

  const handleAddCode = (code: string) => {
    if (selectedCodes.includes(code)) return
    if (selectedCodes.length >= maxCodes) return

    const newCodes = [...selectedCodes, code]
    const newPrimary = selectedCodes.length === 0 ? code : primaryCode

    onCodesChange(newCodes, newPrimary)
    setSearchQuery('')
    setOpen(false)
  }

  const handleRemoveCode = (codeToRemove: string) => {
    const newCodes = selectedCodes.filter(code => code !== codeToRemove)
    let newPrimary = primaryCode

    // If removing primary code, set first remaining code as primary
    if (codeToRemove === primaryCode && newCodes.length > 0) {
      newPrimary = newCodes[0]
    } else if (codeToRemove === primaryCode) {
      newPrimary = undefined
    }

    onCodesChange(newCodes, newPrimary)
  }

  const handleSetPrimary = (code: string) => {
    if (!selectedCodes.includes(code)) {
      handleAddCode(code)
    }
    onCodesChange(selectedCodes, code)
  }

  const handleCustomInput = () => {
    const validation = validateNAICSCode(customInput)
    
    if (!validation.isValid) {
      setValidationMessage(validation.message || 'Invalid NAICS code')
      return
    }

    setValidationMessage('')
    handleAddCode(customInput.trim())
    setCustomInput('')
  }


  return (
    <div className={className}>
      {/* Selected Codes Display */}
      {selectedCodes.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-medium mb-2">Selected NAICS Codes</h4>
          <div className="flex flex-wrap gap-2">
            {selectedCodesDetails.map((item) => (
              <Badge
                key={item.code}
                variant={item.isPrimary ? "default" : "secondary"}
                className="flex items-center gap-2 px-3 py-1 text-sm"
              >
                <span className="font-mono">{item.code}</span>
                {item.isPrimary && <Star className="h-3 w-3" />}
                <button
                  onClick={() => handleRemoveCode(item.code)}
                  className="ml-1 hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
          {selectedCodes.length > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              {selectedCodes.length}/{maxCodes} codes selected
              {primaryCode && ` • ${primaryCode} is primary`}
            </p>
          )}
        </div>
      )}

      {/* Search Interface */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
            disabled={selectedCodes.length >= maxCodes}
          >
            {selectedCodes.length >= maxCodes 
              ? `Maximum ${maxCodes} codes selected`
              : placeholder
            }
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[500px] p-0" align="start">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="search">Search</TabsTrigger>
              {allowCustomInput && <TabsTrigger value="custom">Manual</TabsTrigger>}
            </TabsList>

            {/* Search Tab */}
            <TabsContent value="search" className="mt-0">
              <Command>
                <CommandInput 
                  placeholder="Search by code, title, or description..."
                  value={searchQuery}
                  onValueChange={setSearchQuery}
                />
                <CommandList className="max-h-96">
                  {isSearching && (
                    <div className="flex items-center justify-center py-6">
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      <span className="text-sm text-muted-foreground">Searching...</span>
                    </div>
                  )}
                  {!isSearching && searchResults.length === 0 && (
                    <CommandEmpty>
                      {searchQuery ? 'No NAICS codes found.' : 'Start typing to search or browse codes below...'}
                    </CommandEmpty>
                  )}
                  {!isSearching && searchResults.length > 0 && (
                    <CommandGroup heading={searchQuery ? `Search Results (${searchResults.length})` : `Available NAICS Codes (${searchResults.length})`}>
                      {searchResults.map((result) => (
                        <CommandItem
                          key={result.code}
                          onSelect={() => handleAddCode(result.code)}
                          disabled={selectedCodes.includes(result.code)}
                          className="flex items-start gap-3 py-3"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <code className="text-sm font-mono bg-muted px-1.5 py-0.5 rounded">
                                {result.code}
                              </code>
                              <Badge variant="outline" className="text-xs">
                                {result.level}
                              </Badge>
                              {selectedCodes.includes(result.code) && (
                                <Check className="h-4 w-4 text-green-600" />
                              )}
                            </div>
                            <h4 className="font-medium text-sm mt-1 line-clamp-1">
                              {result.title}
                            </h4>
                            <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                              {result.description}
                            </p>
                            {result.hierarchy.length > 1 && (
                              <p className="text-xs text-blue-600 mt-1">
                                {result.hierarchy.slice(0, -1).join(' → ')}
                              </p>
                            )}
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}
                </CommandList>
              </Command>
            </TabsContent>


            {/* Manual Input Tab */}
            {allowCustomInput && (
              <TabsContent value="custom" className="mt-0">
                <div className="p-4 space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Enter NAICS Code</label>
                    <div className="flex gap-2">
                      <Input
                        value={customInput}
                        onChange={(e) => {
                          setCustomInput(e.target.value)
                          setValidationMessage('')
                        }}
                        placeholder="e.g., 541511"
                        pattern="[0-9]*"
                        maxLength={6}
                      />
                      <Button
                        onClick={handleCustomInput}
                        disabled={!customInput.trim() || selectedCodes.length >= maxCodes}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    {validationMessage && (
                      <Alert variant="destructive">
                        <AlertDescription>{validationMessage}</AlertDescription>
                      </Alert>
                    )}
                  </div>

                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Available Data:</strong> Currently showing Agriculture (Sector 11) and Mining (Sector 21) codes from official government data.
                      Additional sectors will be available when complete data is provided.
                    </AlertDescription>
                  </Alert>
                </div>
              </TabsContent>
            )}
          </Tabs>
        </PopoverContent>
      </Popover>
    </div>
  )
}