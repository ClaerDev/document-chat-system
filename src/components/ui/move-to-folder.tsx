'use client'

import React from 'react'
import { Move, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import { FolderHierarchyItem, useFolderHierarchy } from './folder-hierarchy-item'
import { Folder } from 'lucide-react'

interface FolderData {
  id: string
  name: string
  parentId: string | null
  color?: string
}

interface MoveToFolderProps {
  folders: FolderData[]
  onMoveToFolder: (folderId: string | null) => void
  disabled?: boolean
  buttonText?: string | null // null = icon only, string = custom text, undefined = default "Move to Folder"
  variant?: "outline" | "default" | "secondary" | "ghost" | "link" | "destructive"
  size?: "default" | "sm" | "lg" | "icon"
  className?: string
  includeRoot?: boolean
  rootLabel?: string
  asSubMenu?: boolean // When true, renders as DropdownMenuSub components instead of standalone button
}

export function MoveToFolder({
  folders,
  onMoveToFolder,
  disabled = false,
  buttonText = "Move to Folder", // default text
  variant = "outline",
  size = "default",
  className,
  includeRoot = true,
  rootLabel = "Root (No folder)",
  asSubMenu = false
}: MoveToFolderProps) {
  const hierarchicalFolders = useFolderHierarchy(folders)

  const handleMoveToFolder = (folderId: string | null) => {
    onMoveToFolder(folderId)
  }

  const renderFolderItems = () => (
    <>
      {includeRoot && (
        <DropdownMenuItem onClick={() => handleMoveToFolder(null)}>
          <div className="flex items-center">
            <Folder size={14} className="mr-2 text-muted-foreground" />
            {rootLabel}
          </div>
        </DropdownMenuItem>
      )}
      {hierarchicalFolders.map((folder) => (
        <DropdownMenuItem 
          key={folder.id} 
          onClick={() => handleMoveToFolder(folder.id)}
        >
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
        </DropdownMenuItem>
      ))}
    </>
  )

  // If used as a submenu (inside another dropdown)
  if (asSubMenu) {
    return (
      <DropdownMenuSub>
        <DropdownMenuSubTrigger disabled={disabled}>
          <Move size={16} className="mr-2" />
          {buttonText}
        </DropdownMenuSubTrigger>
        <DropdownMenuSubContent>
          {renderFolderItems()}
        </DropdownMenuSubContent>
      </DropdownMenuSub>
    )
  }

  // Standalone button with dropdown
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant={variant}
          size={size}
          disabled={disabled}
          className={className}
        >
          <Move size={16} className={buttonText === null ? "" : "mr-2"} />
          {buttonText}
          {buttonText !== null && <ChevronDown size={14} className="ml-auto" />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {renderFolderItems()}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}