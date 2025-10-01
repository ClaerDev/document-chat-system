'use client'

import React, { useMemo, useState } from 'react'
import { Check, Info, Search, Shield } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { SetAsideCode, SET_ASIDE_DISPLAY_GROUPS } from '@/types/set-asides'
import {
  getAllSetAsides,
  getSetAsideByCode,
  getEligibleSetAsides,
  formatSetAsideDisplay,
} from '@/lib/set-asides'

interface SetAsideSelectorProps {
  value?: SetAsideCode | SetAsideCode[]
  onChange: (value: SetAsideCode | SetAsideCode[]) => void
  multiple?: boolean
  userCertifications?: string[]
  showEligibleOnly?: boolean
  showDescriptions?: boolean
  className?: string
  renderCard?: boolean // Control whether to render the card wrapper
}

export function SetAsideSelector({
  value,
  onChange,
  multiple = false,
  userCertifications = [],
  showEligibleOnly = false,
  showDescriptions = false,
  className,
  renderCard = true,
}: SetAsideSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('')
  
  const allSetAsides = useMemo(() => getAllSetAsides(), [])
  const eligibleSetAsides = useMemo(
    () => getEligibleSetAsides(userCertifications),
    [userCertifications]
  )

  const displaySetAsides = showEligibleOnly ? eligibleSetAsides : allSetAsides
  const eligibleCodes = new Set(eligibleSetAsides.map((sa) => sa.code))

  // Filter set-asides based on search query
  const filteredSetAsides = useMemo(() => {
    if (!searchQuery.trim()) return displaySetAsides
    
    const query = searchQuery.toLowerCase().trim()
    return displaySetAsides.filter((setAside) => 
      setAside.code.toLowerCase().includes(query) ||
      setAside.name.toLowerCase().includes(query) ||
      setAside.fullName.toLowerCase().includes(query) ||
      setAside.description.toLowerCase().includes(query)
    )
  }, [displaySetAsides, searchQuery])

  const selectedValues = Array.isArray(value) ? value : value ? [value] : []

  const handleSingleChange = (newValue: string) => {
    onChange(newValue as SetAsideCode)
  }

  const handleCardClick = (code: SetAsideCode) => {
    const isSelected = selectedValues.includes(code)
    const newValues = isSelected
      ? selectedValues.filter((v) => v !== code)
      : [...selectedValues, code]
    onChange(newValues)
  }

  if (multiple) {
    const content = (
      <div className="space-y-6">
          {/* Selected Set-Asides Section - Show at top with bigger badges */}
          {selectedValues.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-foreground">
                  Selected Set-Asides ({selectedValues.length})
                </h4>
                <Button variant="ghost" size="sm" onClick={() => onChange([])}>
                  Clear all
                </Button>
              </div>
              <div className="flex flex-wrap gap-3">
                {selectedValues.map((code) => {
                  const setAside = allSetAsides.find((sa) => sa.code === code)
                  if (!setAside) return null
                  
                  const isEligible = eligibleCodes.has(code)
                  
                  return (
                    <TooltipProvider key={code}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div
                            onClick={() => handleCardClick(code)}
                            className={cn(
                              'relative px-4 py-2 rounded-lg border cursor-pointer transition-all duration-200 hover:shadow-md',
                              'bg-primary/10 border-primary ring-2 ring-primary/20',
                              'flex items-center gap-2 min-w-fit'
                            )}
                          >
                            <div className="flex items-center gap-2">
                              <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                                <Check className="w-3 h-3 text-primary-foreground" />
                              </div>
                              <div className="text-sm font-medium">{setAside.code}</div>
                              {isEligible && (
                                <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                                  <Check className="w-2.5 h-2.5 text-white" />
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              {setAside.type === 'sole_source' && (
                                <Badge variant="secondary" className="text-[10px] px-1 py-0">
                                  SS
                                </Badge>
                              )}
                              {setAside.agencySpecific && (
                                <Badge variant="outline" className="text-[10px] px-1 py-0">
                                  {setAside.agencySpecific.slice(0, 3)}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-sm">
                          <div className="space-y-2">
                            <p className="font-medium">{setAside.fullName}</p>
                            <p className="text-sm">{setAside.description}</p>
                            {setAside.procurementThreshold.notes && (
                              <p className="text-sm">
                                <strong>Threshold:</strong>{' '}
                                {setAside.procurementThreshold.notes}
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground">
                              {setAside.farReference}
                            </p>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )
                })}
              </div>
            </div>
          )}

          {/* Available Set-Asides Grid */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-muted-foreground">
                {selectedValues.length > 0 ? 'Available Set-Asides' : 'Select Set-Asides'}
              </h4>
            </div>
            
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search set-asides by code, name, or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            
            {/* No Results Message */}
            {searchQuery.trim() && filteredSetAsides.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No set-asides found matching "{searchQuery}"</p>
                <p className="text-xs mt-1">Try searching with different keywords</p>
              </div>
            )}
            
            {Object.entries(SET_ASIDE_DISPLAY_GROUPS).map(
              ([groupName, codes]) => {
                const groupSetAsides = filteredSetAsides.filter((sa) =>
                  codes.includes(sa.code)
                )

                if (groupSetAsides.length === 0) return null

                return (
                  <div key={groupName} className="space-y-3">
                    <h5 className="text-sm font-semibold text-foreground pl-1">
                      {groupName}
                    </h5>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                      {groupSetAsides.map((setAside) => {
                        const isEligible = eligibleCodes.has(setAside.code)
                        const isSelected = selectedValues.includes(setAside.code)

                        return (
                          <TooltipProvider key={setAside.code}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div
                                  onClick={() => handleCardClick(setAside.code)}
                                  className={cn(
                                    'relative p-3 rounded-lg border cursor-pointer transition-all duration-200 hover:shadow-md group',
                                    isSelected
                                      ? 'bg-primary/10 border-primary ring-2 ring-primary/20'
                                      : isEligible
                                      ? 'bg-green-50 border-green-200 hover:bg-green-100'
                                      : 'bg-background hover:bg-muted/50',
                                    'min-h-[80px] flex flex-col justify-between'
                                  )}
                                >
                                  {/* Selection indicator */}
                                  {isSelected && (
                                    <div className="absolute top-2 right-2">
                                      <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                                        <Check className="w-3 h-3 text-primary-foreground" />
                                      </div>
                                    </div>
                                  )}

                                  {/* Eligibility indicator */}
                                  {isEligible && !isSelected && (
                                    <div className="absolute top-2 right-2">
                                      <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                                        <Check className="w-3 h-3 text-white" />
                                      </div>
                                    </div>
                                  )}

                                  <div className="flex-1">
                                    <div className="font-medium text-sm leading-tight mb-1">
                                      {setAside.code}
                                    </div>
                                    <div className="text-xs text-muted-foreground line-clamp-2">
                                      {setAside.name}
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-1 mt-2">
                                    {setAside.type === 'sole_source' && (
                                      <Badge variant="secondary" className="text-[10px] px-1 py-0">
                                        SS
                                      </Badge>
                                    )}
                                    {setAside.agencySpecific && (
                                      <Badge variant="outline" className="text-[10px] px-1 py-0">
                                        {setAside.agencySpecific.slice(0, 3)}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-sm">
                                <div className="space-y-2">
                                  <p className="font-medium">{setAside.fullName}</p>
                                  <p className="text-sm">{setAside.description}</p>
                                  {setAside.procurementThreshold.notes && (
                                    <p className="text-sm">
                                      <strong>Threshold:</strong>{' '}
                                      {setAside.procurementThreshold.notes}
                                    </p>
                                  )}
                                  <p className="text-xs text-muted-foreground">
                                    {setAside.farReference}
                                  </p>
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )
                      })}
                    </div>
                  </div>
                )
              }
            )}
          </div>
        </div>
    );

    if (renderCard) {
      return (
        <Card className={className}>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Set-Asides Program
            </CardTitle>
            <CardDescription>
              Click on cards to select the set-aside types you want to pursue
            </CardDescription>
          </CardHeader>
          <CardContent>
            {content}
          </CardContent>
        </Card>
      );
    }

    return <div className={className}>{content}</div>;
  }

  // Single select mode
  return (
    <Select value={value} onValueChange={handleSingleChange}>
      <SelectTrigger className={className}>
        <SelectValue placeholder="Select a set-aside type" />
      </SelectTrigger>
      <SelectContent>
        {!showEligibleOnly && eligibleSetAsides.length > 0 && (
          <SelectGroup>
            <SelectLabel className="flex items-center gap-2">
              <Check className="w-4 h-4 text-green-600" />
              Your Eligible Set-Asides
            </SelectLabel>
            {eligibleSetAsides.map((setAside) => (
              <SelectItem
                key={setAside.code}
                value={setAside.code}
                className="pl-6"
              >
                <div className="flex items-center gap-2">
                  <span>{formatSetAsideDisplay(setAside.code)}</span>
                  {setAside.type === 'sole_source' && (
                    <Badge variant="outline" className="text-xs">
                      Sole Source
                    </Badge>
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectGroup>
        )}

        {!showEligibleOnly && (
          <>
            {eligibleSetAsides.length > 0 && (
              <SelectLabel>All Set-Asides</SelectLabel>
            )}
            {Object.entries(SET_ASIDE_DISPLAY_GROUPS).map(
              ([groupName, codes]) => {
                const groupSetAsides = displaySetAsides.filter(
                  (sa) => codes.includes(sa.code) && !eligibleCodes.has(sa.code)
                )

                if (groupSetAsides.length === 0) return null

                return (
                  <SelectGroup key={groupName}>
                    <SelectLabel>{groupName}</SelectLabel>
                    {groupSetAsides.map((setAside) => (
                      <SelectItem
                        key={setAside.code}
                        value={setAside.code}
                        className="pl-6"
                      >
                        <div className="flex items-center gap-2">
                          <span>{formatSetAsideDisplay(setAside.code)}</span>
                          {setAside.type === 'sole_source' && (
                            <Badge variant="outline" className="text-xs">
                              Sole Source
                            </Badge>
                          )}
                          {setAside.agencySpecific && (
                            <Badge variant="secondary" className="text-xs">
                              {setAside.agencySpecific}
                            </Badge>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectGroup>
                )
              }
            )}
          </>
        )}
      </SelectContent>
    </Select>
  )
}

// Set-Aside Badge Component for displaying in lists
interface SetAsideBadgeProps {
  code: SetAsideCode
  showTooltip?: boolean
  className?: string
  onRemove?: () => void
}

export function SetAsideBadge({
  code,
  showTooltip = true,
  className,
  onRemove,
}: SetAsideBadgeProps) {
  const setAside = getSetAsideByCode(code)

  if (!setAside) {
    return (
      <Badge variant="outline" className={className}>
        {code}
      </Badge>
    )
  }

  const badge = (
    <Badge
      variant={setAside.type === 'sole_source' ? 'secondary' : 'default'}
      className={cn(
        'text-xs',
        setAside.agencySpecific && 'border-orange-500',
        onRemove && 'pr-1',
        className
      )}
    >
      {setAside.code}
      {setAside.type === 'sole_source' && (
        <span className="ml-1 text-[10px]">SS</span>
      )}
      {onRemove && (
        <button
          onClick={onRemove}
          className="ml-1 hover:bg-black/10 rounded-full p-0.5"
          type="button"
        >
          ×
        </button>
      )}
    </Badge>
  )

  if (!showTooltip) return badge

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{badge}</TooltipTrigger>
        <TooltipContent>
          <div className="space-y-1">
            <p className="font-medium">{setAside.name}</p>
            <p className="text-xs">{setAside.description}</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
