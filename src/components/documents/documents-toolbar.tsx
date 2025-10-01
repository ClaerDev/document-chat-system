'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Search,
  Upload,
  Grid3X3,
  List,
  ChevronDown,
  FolderPlus,
  Filter,
  SlidersHorizontal
} from 'lucide-react'

type ViewMode = 'grid' | 'list'
type SortBy = 'name' | 'date' | 'size' | 'type'

interface DocumentsToolbarProps {
  searchQuery: string
  onSearchChange: (query: string) => void
  viewMode: ViewMode
  onViewModeChange: (mode: ViewMode) => void
  sortBy: SortBy
  onSortByChange: (sortBy: SortBy) => void
  showRecursive: boolean
  onRecursiveToggle: () => void
  onUpload: () => void
  onCreateFolder: () => void
  className?: string
}

export const DocumentsToolbar: React.FC<DocumentsToolbarProps> = ({
  searchQuery,
  onSearchChange,
  viewMode,
  onViewModeChange,
  sortBy,
  onSortByChange,
  showRecursive,
  onRecursiveToggle,
  onUpload,
  onCreateFolder,
  className = ''
}) => {
  return (
    <div className={`flex items-center justify-between gap-4 ${className}`}>
      <div className="flex items-center gap-3 flex-1">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search documents and folders..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>
        
        {/* Filter Options */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Filter size={16} />
              Sort by: {sortBy}
              <ChevronDown size={16} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onSortByChange('name')}>
              Name
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onSortByChange('date')}>
              Date modified
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onSortByChange('size')}>
              Size
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onSortByChange('type')}>
              Type
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        
        {/* Recursive View Toggle */}
        <Button
          variant={showRecursive ? 'default' : 'outline'}
          size="sm"
          onClick={onRecursiveToggle}
          className="gap-2"
        >
          <SlidersHorizontal size={16} />
          All subfolders
        </Button>
      </div>
      
      <div className="flex items-center gap-2">
        {/* View Mode Toggle */}
        <div className="flex items-center border rounded-lg p-1">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onViewModeChange('grid')}
            className="h-8 w-8 p-0"
          >
            <Grid3X3 size={16} />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onViewModeChange('list')}
            className="h-8 w-8 p-0"
          >
            <List size={16} />
          </Button>
        </div>
        
        {/* Action Buttons */}
        <Button
          variant="outline"
          size="sm"
          onClick={onCreateFolder}
          className="gap-2"
        >
          <FolderPlus size={16} />
          New folder
        </Button>
        
        <Button
          size="sm"
          onClick={onUpload}
          className="gap-2"
        >
          <Upload size={16} />
          Upload
        </Button>
      </div>
    </div>
  )
}
