'use client'

import React from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { FolderHierarchyItem, useFolderHierarchy } from './folder-hierarchy-item'
import { Folder } from 'lucide-react'

interface FolderData {
  id: string
  name: string
  parentId: string | null
  color?: string
}

interface FolderSelectorProps {
  folders: FolderData[]
  selectedFolderId: string | null
  onFolderSelect: (folderId: string | null) => void
  placeholder?: string
  includeRoot?: boolean
  rootLabel?: string
  disabled?: boolean
  className?: string
}

export function FolderSelector({
  folders,
  selectedFolderId,
  onFolderSelect,
  placeholder = "Select folder",
  includeRoot = true,
  rootLabel = "📁 Root (No folder)",
  disabled = false,
  className
}: FolderSelectorProps) {
  const hierarchicalFolders = useFolderHierarchy(folders)

  const handleValueChange = (value: string) => {
    if (value === 'root') {
      onFolderSelect(null)
    } else {
      onFolderSelect(value)
    }
  }

  const getDisplayValue = () => {
    if (!selectedFolderId) {
      return includeRoot ? rootLabel : placeholder
    }
    
    const folder = folders.find(f => f.id === selectedFolderId)
    return folder ? `📁 ${folder.name}` : placeholder
  }

  return (
    <Select 
      value={selectedFolderId || (includeRoot ? 'root' : '')} 
      onValueChange={handleValueChange}
      disabled={disabled}
    >
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder}>
          {getDisplayValue()}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {includeRoot && (
          <SelectItem value="root">
            <div className="flex items-center">
              <Folder size={14} className="mr-2 text-muted-foreground" />
              {rootLabel.replace('📁 ', '')}
            </div>
          </SelectItem>
        )}
        {hierarchicalFolders.map((folder) => (
          <SelectItem key={folder.id} value={folder.id}>
            <div 
              className="flex items-center w-full"
              style={{ paddingLeft: `${(folder.level || 0) * 16}px` }}
            >
              {/* Hierarchy Connector */}
              {(folder.level || 0) > 0 && (
                <div className="flex items-center mr-1">
                  <div 
                    className="w-3 h-3 border-l-2 border-b-2 border-muted-foreground/30 mr-1"
                    style={{ 
                      borderBottomLeftRadius: '3px',
                      marginTop: '-6px',
                      marginBottom: '6px'
                    }}
                  />
                </div>
              )}
              <Folder 
                size={14} 
                className="mr-2 flex-shrink-0" 
                style={{ color: folder.color || '#6b7280' }}
              />
              <span className="truncate">{folder.name}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}