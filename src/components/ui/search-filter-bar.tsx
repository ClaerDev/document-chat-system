'use client'

import React from 'react'
import { Search, Filter } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { FilterSelect, FilterOption } from '@/components/ui/filter-select'

export interface SearchFilterBarProps {
  searchTerm: string
  onSearchChange: (value: string) => void
  searchPlaceholder?: string
  filterValue: string
  onFilterChange: (value: string) => void
  filterOptions: FilterOption[]
  filterPlaceholder?: string
  className?: string
}

export function SearchFilterBar({
  searchTerm,
  onSearchChange,
  searchPlaceholder = "Search...",
  filterValue,
  onFilterChange,
  filterOptions,
  filterPlaceholder = "Filter by type",
  className
}: SearchFilterBarProps) {
  return (
    <Card className={className}>
      <CardContent className="pt-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder={searchPlaceholder}
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <FilterSelect
              value={filterValue}
              onChange={(value) => onFilterChange(value as string)}
              options={filterOptions}
              placeholder={filterPlaceholder}
              className="w-[180px]"
              searchable={false}
              multiple={false}
              showDescription={false}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}