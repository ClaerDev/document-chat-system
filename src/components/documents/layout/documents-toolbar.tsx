'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  Search, 
  X, 
  Grid3X3, 
  List,
  SlidersHorizontal,
  Filter
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { DocumentsBreadcrumbs } from './documents-breadcrumbs'

interface DocumentsToolbarProps {
  // Search
  searchQuery: string
  onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onClearSearch: () => void
  
  // View mode
  viewMode: 'grid' | 'list'
  onViewModeChange: (mode: 'grid' | 'list') => void
  
  // Breadcrumbs
  folderPath: any[]
  dragOverFolder: string | null
  navigateToFolder: (folderId: string | null) => void
  handleDragOver: (e: React.DragEvent, folderId: string) => void
  handleDragLeave: () => void
  handleDrop: (e: React.DragEvent, folderId: string) => void
  
  // Filters
  hasActiveFilters?: boolean
  onOpenFilters?: () => void
  
  // Bulk actions
  isBulkActionMode: boolean
  selectedItemsCount: number
  onExitBulkMode: () => void
}

export function DocumentsToolbar({
  searchQuery,
  onSearchChange,
  onClearSearch,
  viewMode,
  onViewModeChange,
  folderPath,
  dragOverFolder,
  navigateToFolder,
  handleDragOver,
  handleDragLeave,
  handleDrop,
  hasActiveFilters = false,
  onOpenFilters,
  isBulkActionMode,
  selectedItemsCount,
  onExitBulkMode
}: DocumentsToolbarProps) {
  return (
    <div className="flex items-center justify-between">
      {/* Left side - Breadcrumbs */}
      <div className="flex items-center gap-4">
        {!isBulkActionMode ? (
          <DocumentsBreadcrumbs
            folderPath={folderPath}
            dragOverFolder={dragOverFolder}
            navigateToFolder={navigateToFolder}
            handleDragOver={handleDragOver}
            handleDragLeave={handleDragLeave}
            handleDrop={handleDrop}
          />
        ) : (
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="px-3 py-1">
              {selectedItemsCount} selected
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={onExitBulkMode}
              className="text-xs"
            >
              <X size={14} className="mr-1" />
              Exit
            </Button>
          </div>
        )}
      </div>
      
      {/* Right side - Search and controls */}
      <div className="flex items-center gap-4">
        {/* Search */}
        <div className="relative">
          <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search documents..."
            value={searchQuery}
            onChange={onSearchChange}
            className="pl-10 pr-10 w-80"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearSearch}
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
            >
              <X size={14} />
            </Button>
          )}
        </div>

        {/* Filters */}
        {onOpenFilters && (
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenFilters}
            className={hasActiveFilters ? 'border-blue-500 text-blue-600' : ''}
          >
            <Filter size={16} className="mr-2" />
            Filters
            {hasActiveFilters && (
              <Badge variant="secondary" className="ml-2 text-xs">
                Active
              </Badge>
            )}
          </Button>
        )}

        {/* View Toggle */}
        <div className="flex items-center border rounded-lg p-1">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onViewModeChange('grid')}
            className="px-3 py-1"
          >
            <Grid3X3 size={16} />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onViewModeChange('list')}
            className="px-3 py-1"
          >
            <List size={16} />
          </Button>
        </div>
      </div>
    </div>
  )
}