'use client'

import React from 'react'
import { ChevronRight } from 'lucide-react'
import { UI_CONSTANTS } from '@/lib/constants'

interface FolderPathItem {
  id: string
  name: string
}

interface DocumentsBreadcrumbsProps {
  folderPath: FolderPathItem[]
  dragOverFolder: string | null
  navigateToFolder: (folderId: string | null) => void
  handleDragOver: (e: React.DragEvent, folderId: string) => void
  handleDragLeave: () => void
  handleDrop: (e: React.DragEvent, folderId: string) => void
}

export function DocumentsBreadcrumbs({
  folderPath,
  dragOverFolder,
  navigateToFolder,
  handleDragOver,
  handleDragLeave,
  handleDrop
}: DocumentsBreadcrumbsProps) {
  const breadcrumbItems = []
  
  // Root "Documents" button
  breadcrumbItems.push(
    <button 
      key={UI_CONSTANTS.ROOT_FOLDER_ID}
      onClick={() => navigateToFolder(null)}
      onDragOver={(e) => handleDragOver(e, UI_CONSTANTS.ROOT_FOLDER_ID)}
      onDragLeave={handleDragLeave}
      onDrop={(e) => handleDrop(e, UI_CONSTANTS.ROOT_FOLDER_ID)}
      className={`text-sm px-2 py-1 rounded transition-colors ${
        folderPath.length === 0 
          ? 'text-foreground' 
          : 'text-blue-600 hover:text-blue-800 cursor-pointer hover:bg-blue-50'
      } ${
        dragOverFolder === UI_CONSTANTS.ROOT_FOLDER_ID ? 'bg-blue-100 text-blue-800' : ''
      }`}
    >
      Documents
    </button>
  )

  // Folder path items
  folderPath.forEach((pathItem, index) => {
    breadcrumbItems.push(
      <ChevronRight key={`arrow-${pathItem.id}`} size={16} className="text-muted-foreground" />
    )
    breadcrumbItems.push(
      <button
        key={`button-${pathItem.id}`}
        onClick={() => navigateToFolder(pathItem.id)}
        onDragOver={(e) => handleDragOver(e, pathItem.id)}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, pathItem.id)}
        className={`text-sm px-2 py-1 rounded transition-colors ${
          index === folderPath.length - 1 
            ? 'text-foreground' 
            : 'text-blue-600 hover:text-blue-800 cursor-pointer hover:bg-blue-50'
        } ${
          dragOverFolder === pathItem.id ? 'bg-blue-100 text-blue-800' : ''
        }`}
      >
        {pathItem.name}
      </button>
    )
  })

  return (
    <div className="flex items-center gap-2">
      {breadcrumbItems}
    </div>
  )
}